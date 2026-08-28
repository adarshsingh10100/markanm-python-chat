<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Mailer.php';
require_once __DIR__ . '/../helpers/HashUtils.php';

class MessageController {

    private static function resolveConvId(string $identifier): int {
        if (is_numeric($identifier)) {
            return (int)$identifier;
        }

        $clean = trim($identifier);
        if (strpos($clean, '@') === 0) {
            $currentUser = AuthMiddleware::authenticate();
            $username = ltrim($clean, '@');
            $db = Database::getConnection();
            $stmt = $db->prepare('
                SELECT c.id
                FROM conversations c
                JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = :uid
                JOIN conversation_members cm2 ON c.id = cm2.conversation_id
                JOIN users u ON cm2.user_id = u.id AND u.username = :target_username
                WHERE c.type = "direct"
                LIMIT 1
            ');
            $stmt->execute(['uid' => $currentUser['id'], 'target_username' => $username]);
            $convId = (int)$stmt->fetchColumn();
            if ($convId > 0) return $convId;
        }

        return HashUtils::decodeId($clean);
    }

    /**
     * GET /api/conversations/{id}/messages
     */
    public static function getMessages(string $identifier): void {
        $convId = self::resolveConvId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        // 1. Authorization check
        $memStmt = $db->prepare('SELECT id, last_read_message_id FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $memStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        $membership = $memStmt->fetch();

        if (!$membership) {
            jsonError('Access denied.', 403);
        }

        $sinceId = isset($_GET['since_id']) ? (int)$_GET['since_id'] : 0;
        $beforeId = isset($_GET['before_id']) ? (int)$_GET['before_id'] : 0;
        $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 50) : 30;

        $params = ['cid' => $convId];
        $sql = '
            SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.content, m.metadata, m.reply_to_id,
                   m.is_edited, m.is_deleted, m.created_at,
                   u.display_name AS sender_name, u.username AS sender_username, u.avatar_url AS sender_avatar,
                   rm.content AS reply_content, ru.display_name AS reply_sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN messages rm ON m.reply_to_id = rm.id
            LEFT JOIN users ru ON rm.sender_id = ru.id
            WHERE m.conversation_id = :cid
        ';

        if ($sinceId > 0) {
            $sql .= ' AND m.id > :since_id ORDER BY m.id ASC';
            $params['since_id'] = $sinceId;
        } else if ($beforeId > 0) {
            $sql .= ' AND m.id < :before_id ORDER BY m.id DESC LIMIT ' . $limit;
            $params['before_id'] = $beforeId;
        } else {
            $sql .= ' ORDER BY m.id DESC LIMIT ' . $limit;
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rawMessages = $stmt->fetchAll();

        if ($sinceId == 0) {
            $rawMessages = array_reverse($rawMessages);
        }

        $messageIds = array_column($rawMessages, 'id');
        $reactionsMap = [];

        if (!empty($messageIds)) {
            $inClause = implode(',', array_map('intval', $messageIds));

            $rxStmt = $db->query("
                SELECT mr.message_id, mr.emoji, mr.user_id, u.display_name
                FROM message_reactions mr
                JOIN users u ON mr.user_id = u.id
                WHERE mr.message_id IN ({$inClause})
            ");
            foreach ($rxStmt->fetchAll() as $rx) {
                $mid = (int)$rx['message_id'];
                if (!isset($reactionsMap[$mid])) {
                    $reactionsMap[$mid] = [];
                }
                $reactionsMap[$mid][] = [
                    'emoji' => $rx['emoji'],
                    'user_id' => (int)$rx['user_id'],
                    'display_name' => decodeOutput($rx['display_name'])
                ];
            }
        }

        if (!empty($rawMessages)) {
            $latestId = max(array_column($rawMessages, 'id'));
            if ($latestId > (int)$membership['last_read_message_id']) {
                $readStmt = $db->prepare('UPDATE conversation_members SET last_read_message_id = :lid WHERE conversation_id = :cid AND user_id = :uid');
                $readStmt->execute(['lid' => $latestId, 'cid' => $convId, 'uid' => $currentUser['id']]);
            }
        }

        $formatted = array_map(function($m) use ($reactionsMap, $currentUser) {
            $mid = (int)$m['id'];
            return [
                'id' => $mid,
                'conversation_id' => (int)$m['conversation_id'],
                'sender_id' => (int)$m['sender_id'],
                'sender_name' => decodeOutput($m['sender_name']),
                'sender_username' => $m['sender_username'],
                'sender_avatar' => $m['sender_avatar'],
                'type' => $m['message_type'],
                'message_type' => $m['message_type'],
                'content' => $m['is_deleted'] ? 'This message was deleted' : decodeOutput($m['content']),
                'metadata' => $m['metadata'] ? json_decode($m['metadata'], true) : null,
                'reply_to' => $m['reply_to_id'] ? [
                    'id' => (int)$m['reply_to_id'],
                    'content' => decodeOutput($m['reply_content']),
                    'sender_name' => decodeOutput($m['reply_sender_name'])
                ] : null,
                'is_edited' => (bool)$m['is_edited'],
                'is_deleted' => (bool)$m['is_deleted'],
                'is_mine' => ((int)$m['sender_id'] === (int)$currentUser['id']),
                'created_at' => $m['created_at'],
                'reactions' => $reactionsMap[$mid] ?? []
            ];
        }, $rawMessages);

        jsonResponse([
            'success' => true,
            'messages' => $formatted
        ]);
    }

    /**
     * POST /api/conversations/{id}/messages
     */
    public static function sendMessage(string $identifier): void {
        $convId = self::resolveConvId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        // Check conversation membership
        $memStmt = $db->prepare('SELECT role FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $memStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        if (!$memStmt->fetch()) {
            jsonError('Access denied.', 403);
        }

        $body = getRequestBody();
        $content = sanitizeInput($body['content'] ?? '');
        $replyToId = !empty($body['reply_to_id']) ? (int)$body['reply_to_id'] : null;
        $msgType = !empty($body['message_type']) ? sanitizeInput($body['message_type']) : (!empty($body['type']) ? sanitizeInput($body['type']) : 'text');
        $metadata = !empty($body['metadata']) ? json_encode($body['metadata']) : null;

        // Verify reply_to_id exists in messages table
        if ($replyToId) {
            $checkReply = $db->prepare('SELECT id FROM messages WHERE id = :rid LIMIT 1');
            $checkReply->execute(['rid' => $replyToId]);
            if (!$checkReply->fetch()) {
                $replyToId = null;
            }
        }

        if (empty($content) && $msgType === 'text') {
            jsonError('Message content cannot be empty.', 422);
        }

        $db->beginTransaction();

        try {
            $stmt = $db->prepare('
                INSERT INTO messages (conversation_id, sender_id, message_type, content, metadata, reply_to_id)
                VALUES (:cid, :sid, :mtype, :content, :meta, :reply)
            ');
            $stmt->execute([
                'cid' => $convId,
                'sid' => $currentUser['id'],
                'mtype' => $msgType,
                'content' => $content,
                'meta' => $metadata,
                'reply' => $replyToId
            ]);
            $messageId = (int)$db->lastInsertId();

            // Update conversation last message marker
            $updConv = $db->prepare('UPDATE conversations SET last_message_id = :mid, last_message_at = NOW() WHERE id = :cid');
            $updConv->execute(['mid' => $messageId, 'cid' => $convId]);

            // Update sender's read marker
            $updRead = $db->prepare('UPDATE conversation_members SET last_read_message_id = :mid WHERE conversation_id = :cid AND user_id = :uid');
            $updRead->execute(['mid' => $messageId, 'cid' => $convId, 'uid' => $currentUser['id']]);

            // Clear typing status
            $clearTyping = $db->prepare('UPDATE user_presence SET typing_conversation_id = NULL WHERE user_id = :uid');
            $clearTyping->execute(['uid' => $currentUser['id']]);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to send message: ' . $e->getMessage(), 500);
        }

        // LinkedIn-style New Message Email Notification with Anti-Spam Cooldown
        try {
            $recipientsStmt = $db->prepare('
                SELECT cm.user_id, cm.last_email_notified_at, u.display_name, u.email, p.status AS presence
                FROM conversation_members cm
                JOIN users u ON cm.user_id = u.id
                LEFT JOIN user_presence p ON u.id = p.user_id
                WHERE cm.conversation_id = :cid AND cm.user_id != :sender_id
            ');
            $recipientsStmt->execute(['cid' => $convId, 'sender_id' => $currentUser['id']]);
            $recipients = $recipientsStmt->fetchAll();

            foreach ($recipients as $r) {
                $lastNotified = $r['last_email_notified_at'] ? strtotime($r['last_email_notified_at']) : 0;
                $cooldownWindow = 1800; // 30 minutes anti-spam cooldown per sender/conversation

                if ((time() - $lastNotified) > $cooldownWindow) {
                    $sent = Mailer::sendNewMessageNotification(
                        $r['email'],
                        $r['display_name'],
                        $currentUser['display_name'],
                        $content
                    );

                    if ($sent) {
                        $updNotified = $db->prepare('UPDATE conversation_members SET last_email_notified_at = NOW() WHERE conversation_id = :cid AND user_id = :uid');
                        $updNotified->execute(['cid' => $convId, 'uid' => $r['user_id']]);
                    }
                }
            }
        } catch (Throwable $e) {
            // Do not block message response if email delivery is delayed
        }

        jsonResponse([
            'success' => true,
            'message' => [
                'id' => $messageId,
                'conversation_id' => $convId,
                'sender_id' => (int)$currentUser['id'],
                'sender_name' => decodeOutput($currentUser['display_name']),
                'sender_username' => $currentUser['username'],
                'sender_avatar' => $currentUser['avatar_url'],
                'type' => $msgType,
                'message_type' => $msgType,
                'content' => decodeOutput($content),
                'metadata' => $body['metadata'] ?? null,
                'reply_to_id' => $replyToId,
                'is_edited' => false,
                'is_deleted' => false,
                'is_mine' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'reactions' => []
            ]
        ], 201);
    }

    /**
     * PATCH /api/messages/{id}
     */
    public static function editMessage(int $messageId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM messages WHERE id = :id AND sender_id = :uid LIMIT 1');
        $stmt->execute(['id' => $messageId, 'uid' => $currentUser['id']]);
        $msg = $stmt->fetch();

        if (!$msg) {
            jsonError('Message not found or unauthorized to edit.', 403);
        }

        if ($msg['is_deleted']) {
            jsonError('Cannot edit a deleted message.', 400);
        }

        $body = getRequestBody();
        $newContent = sanitizeInput($body['content'] ?? '');

        if (empty($newContent)) {
            jsonError('Content cannot be empty.', 422);
        }

        $update = $db->prepare('UPDATE messages SET content = :content, is_edited = 1 WHERE id = :id');
        $update->execute(['content' => $newContent, 'id' => $messageId]);

        jsonResponse(['success' => true, 'message' => 'Message updated successfully']);
    }

    /**
     * DELETE /api/messages/{id}
     */
    public static function deleteMessage(int $messageId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM messages WHERE id = :id AND sender_id = :uid LIMIT 1');
        $stmt->execute(['id' => $messageId, 'uid' => $currentUser['id']]);
        $msg = $stmt->fetch();

        if (!$msg) {
            jsonError('Message not found or unauthorized to delete.', 403);
        }

        $update = $db->prepare('UPDATE messages SET is_deleted = 1, content = "" WHERE id = :id');
        $update->execute(['id' => $messageId]);

        jsonResponse(['success' => true, 'message' => 'Message deleted']);
    }

    /**
     * POST /api/messages/{id}/reactions
     */
    public static function toggleReaction(int $messageId): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $emoji = trim($body['emoji'] ?? '');

        if (empty($emoji)) {
            jsonError('Emoji is required.', 422);
        }

        $db = Database::getConnection();

        $check = $db->prepare('SELECT id FROM message_reactions WHERE message_id = :mid AND user_id = :uid AND emoji = :emoji LIMIT 1');
        $check->execute(['mid' => $messageId, 'uid' => $currentUser['id'], 'emoji' => $emoji]);
        $rx = $check->fetch();

        if ($rx) {
            $del = $db->prepare('DELETE FROM message_reactions WHERE id = :id');
            $del->execute(['id' => $rx['id']]);
            $action = 'removed';
        } else {
            $ins = $db->prepare('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (:mid, :uid, :emoji)');
            $ins->execute(['mid' => $messageId, 'uid' => $currentUser['id'], 'emoji' => $emoji]);
            $action = 'added';
        }

        jsonResponse(['success' => true, 'action' => $action]);
    }

    /**
     * POST /api/conversations/{id}/typing
     */
    public static function updateTypingStatus(string $identifier): void {
        $convId = self::resolveConvId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $isTyping = !empty($body['is_typing']);

        $db = Database::getConnection();
        $targetConv = $isTyping ? $convId : null;

        $stmt = $db->prepare('
            INSERT INTO user_presence (user_id, status, typing_conversation_id, typing_updated_at)
            VALUES (:uid, "online", :cid, NOW())
            ON DUPLICATE KEY UPDATE typing_conversation_id = :cid, typing_updated_at = NOW()
        ');
        $stmt->execute(['uid' => $currentUser['id'], 'cid' => $targetConv]);

        jsonResponse(['success' => true]);
    }
}
