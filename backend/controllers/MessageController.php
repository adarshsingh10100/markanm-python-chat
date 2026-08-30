<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Mailer.php';
require_once __DIR__ . '/../helpers/HashUtils.php';
require_once __DIR__ . '/CharacterController.php';
require_once __DIR__ . '/ConversationController.php';

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
        $memStmt = $db->prepare('SELECT id, last_read_message_id, cleared_at FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $memStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        $membership = $memStmt->fetch();

        if (!$membership) {
            jsonError('Access denied.', 403);
        }

        $aroundId = isset($_GET['around_id']) ? (int)$_GET['around_id'] : 0;
        $sinceId = isset($_GET['since_id']) ? (int)$_GET['since_id'] : 0;
        $beforeId = isset($_GET['before_id']) ? (int)$_GET['before_id'] : 0;
        $isTop = isset($_GET['top']) && $_GET['top'] == '1';
        $targetDate = isset($_GET['date']) ? trim($_GET['date']) : '';
        $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 500) : 300;

        $params = ['cid' => $convId];
        $clearedFilter = '';
        if (!empty($membership['cleared_at'])) {
            $clearedFilter = ' AND m.created_at > :cleared_at';
            $params['cleared_at'] = $membership['cleared_at'];
        }

        $sql = "
            SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.content, m.metadata, m.reply_to_id,
                   m.is_edited, m.is_deleted, m.created_at,
                   u.display_name AS sender_name, u.username AS sender_username, u.avatar_url AS sender_avatar,
                   rm.content AS reply_content, ru.display_name AS reply_sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN messages rm ON m.reply_to_id = rm.id
            LEFT JOIN users ru ON rm.sender_id = ru.id
            WHERE m.conversation_id = :cid {$clearedFilter}
        ";

        if ($aroundId > 0) {
            $minId = max(1, $aroundId - 150);
            $maxId = $aroundId + 150;
            $sql .= " AND m.id >= {$minId} AND m.id <= {$maxId} ORDER BY m.id ASC LIMIT {$limit}";
        } else if ($isTop) {
            $sql .= " ORDER BY m.id ASC LIMIT {$limit}";
        } else if (!empty($targetDate)) {
            $sql .= " AND DATE(m.created_at) >= :target_date ORDER BY m.id ASC LIMIT {$limit}";
            $params['target_date'] = $targetDate;
        } else if ($sinceId > 0) {
            $sql .= " AND m.id > {$sinceId} ORDER BY m.id ASC LIMIT {$limit}";
        } else if ($beforeId > 0) {
            $sql .= " AND m.id < {$beforeId} ORDER BY m.id DESC LIMIT {$limit}";
        } else {
            $sql .= " ORDER BY m.id DESC LIMIT {$limit}";
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rawMessages = $stmt->fetchAll();

        if ($sinceId == 0 && !$isTop && empty($targetDate) && $aroundId == 0) {
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
        AuthMiddleware::requireVerified($currentUser);
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

        // Log user activity (non-blocking, fire-and-forget)
        try {
            TrackingController::logActivity('send_message', (int)$currentUser['id'], [
                'conversation_id' => $convId,
                'message_type'    => $msgType,
                'content_length'  => mb_strlen($content),
            ]);
        } catch (Throwable $e) {}

        // AI & Group Bot Auto-Reply Trigger
        if ($convId && !empty($content)) {
            $lowerContent = strtolower($content);
            $botReply = null;

            if (strpos($lowerContent, '@assistant') !== false || strpos($lowerContent, 'hey bot') !== false || strpos($lowerContent, 'ai help') !== false) {
                $botReply = "🤖 **AI Assistant**: Hello! I am active in this chat group. How can I help you today?";
            } else if (strpos($lowerContent, '@translator') !== false || strpos($lowerContent, '/translate') !== false) {
                $cleanText = str_replace(['@translator', '/translate'], '', $content);
                $botReply = "🌐 **Translator Bot**: Translated text: \"" . trim($cleanText) . "\"";
            } else if (strpos($lowerContent, '@codebot') !== false || strpos($lowerContent, '/code') !== false) {
                $botReply = "💻 **Dev Helper Bot**: Quick Code Snippet:\n```javascript\nconsole.log('Hello MarkanM Chat Group!');\n```";
            } else if (strpos($lowerContent, '@pollbot') !== false || strpos($lowerContent, '/poll') !== false) {
                $botReply = "📊 **Poll Bot**: Click the **+** menu button at the bottom to launch interactive live group polls!";
            }

            if ($botReply) {
                try {
                    $botUserStmt = $db->prepare('SELECT id FROM users WHERE username = "assistant_bot" LIMIT 1');
                    $botUserStmt->execute();
                    $botUid = (int)$botUserStmt->fetchColumn();

                    if (!$botUid) {
                        $insBot = $db->prepare('INSERT INTO users (display_name, username, email, password_hash, avatar_url) VALUES ("AI Bot Assistant", "assistant_bot", "bot@markanm.com", "NO_PASS", "https://api.dicebear.com/7.x/bottts/svg?seed=assistant")');
                        $insBot->execute();
                        $botUid = (int)$db->lastInsertId();
                    }

                    $botIns = $db->prepare('
                        INSERT INTO messages (conversation_id, sender_id, message_type, content, created_at)
                        VALUES (:cid, :sid, "text", :content, NOW())
                    ');
                    $botIns->execute([
                        'cid'     => $convId,
                        'sid'     => $botUid,
                        'content' => $botReply
                    ]);
                } catch (Throwable $botErr) {}
            }
        }

        // Trigger server-side background AI reply if conversation contains an AI character
        // Guarantees AI character replies even if user closes the browser tab!
        try {
            $convIdInt = (int)$convId;
            $userIdInt = (int)$currentUser['id'];
            register_shutdown_function(function() use ($convIdInt, $userIdInt) {
                try {
                    require_once __DIR__ . '/CharacterController.php';
                    CharacterController::triggerBackgroundReply($convIdInt, $userIdInt);
                } catch (Throwable $e) {}
            });
        } catch (Throwable $e) {}

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

        $stmt = $db->prepare('SELECT * FROM messages WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $messageId]);
        $msg = $stmt->fetch();

        if (!$msg) {
            jsonError('Message not found.', 404);
        }

        if ($msg['is_deleted']) {
            jsonError('Cannot edit a deleted message.', 400);
        }

        $body = getRequestBody();
        $newContent = trim($body['content'] ?? '');

        if (empty($newContent)) {
            jsonError('Content cannot be empty.', 422);
        }

        $isGameUpdate = !empty($body['is_game_update']) || str_starts_with(trim($msg['content']), '{"game_type"') || str_starts_with($newContent, '{"game_type"');

        if (!$isGameUpdate && (int)$msg['sender_id'] !== (int)$currentUser['id']) {
            jsonError('Unauthorized to edit this message.', 403);
        }

        if ($isGameUpdate) {
            $memCheck = $db->prepare('SELECT 1 FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
            $memCheck->execute(['cid' => $msg['conversation_id'], 'uid' => $currentUser['id']]);
            if (!$memCheck->fetch()) {
                jsonError('Unauthorized conversation member.', 403);
            }
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

        $update = $db->prepare('UPDATE messages SET is_deleted = 1, content = "🚫 This message was deleted" WHERE id = :id');
        $update->execute(['id' => $messageId]);

        jsonResponse(['success' => true, 'message' => 'Message deleted for everyone']);
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

        // Privacy check: If user turned off typing indicator, do not update typing status
        $userStmt = $db->prepare('SELECT privacy_settings FROM users WHERE id = :uid LIMIT 1');
        $userStmt->execute(['uid' => $currentUser['id']]);
        $uRow = $userStmt->fetch();
        if ($uRow && !empty($uRow['privacy_settings'])) {
            $privacy = json_decode($uRow['privacy_settings'], true);
            if (($privacy['typing_status'] ?? 'everyone') === 'nobody') {
                $isTyping = false;
            }
        }

        $targetConv = $isTyping ? $convId : null;

        $stmt = $db->prepare('
            INSERT INTO user_presence (user_id, status, typing_conversation_id, typing_updated_at)
            VALUES (:uid, "online", :cid, NOW())
            ON DUPLICATE KEY UPDATE typing_conversation_id = :cid, typing_updated_at = NOW()
        ');
        $stmt->execute(['uid' => $currentUser['id'], 'cid' => $targetConv]);

        jsonResponse(['success' => true]);
    }

    /**
     * POST /api/conversations/{id}/import-messages
     * Bulk import messages (e.g. from WhatsApp export)
     */
    public static function importMessages(string $identifier): void {
        $convId = self::resolveConvId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        // Verify membership
        $memStmt = $db->prepare('SELECT role FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $memStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        if (!$memStmt->fetch()) {
            jsonError('Access denied.', 403);
        }

        $body = getRequestBody();
        $messages = $body['messages'] ?? [];

        if (empty($messages) || !is_array($messages)) {
            jsonError('No messages provided.', 422);
        }

        // Limit to 20000 messages per import to support long chat histories
        if (count($messages) > 20000) {
            jsonError('Too many messages. Maximum 20000 per import.', 422);
        }

        // Verify all sender_ids are members of this conversation
        $memberStmt = $db->prepare('SELECT user_id FROM conversation_members WHERE conversation_id = :cid');
        $memberStmt->execute(['cid' => $convId]);
        $memberIds = array_column($memberStmt->fetchAll(), 'user_id');

        $importedCount = 0;
        $lastMsgId = null;
        $lastMsgTime = null;

        $db->beginTransaction();
        try {
            $dupCheckStmt = $db->prepare('
                SELECT id FROM messages 
                WHERE conversation_id = :cid 
                  AND sender_id = :sid 
                  AND content = :content 
                  AND created_at = :cat 
                LIMIT 1
            ');

            $insertStmt = $db->prepare('
                INSERT INTO messages (conversation_id, sender_id, message_type, content, created_at)
                VALUES (:cid, :sid, :mtype, :content, :cat)
            ');

            $skippedCount = 0;

            foreach ($messages as $msg) {
                $senderId = (int)($msg['sender_id'] ?? 0);
                $content  = sanitizeInput($msg['content'] ?? '');
                $msgType  = sanitizeInput($msg['message_type'] ?? 'text');
                $rawDate  = $msg['created_at'] ?? date('Y-m-d H:i:s');

                // Validate sender is a member of the conversation
                if (!in_array((string)$senderId, $memberIds) && !in_array($senderId, $memberIds)) {
                    continue; // Skip messages from unknown senders
                }

                if (empty($content)) continue;

                // Validate message_type
                $validTypes = ['text', 'image', 'video', 'audio', 'file', 'system', 'gif', 'sticker'];
                if (!in_array($msgType, $validTypes)) {
                    $msgType = 'text';
                }

                // Safely normalize date
                try {
                    $dt = new DateTime($rawDate);
                    $createdAt = $dt->format('Y-m-d H:i:s');
                } catch (Throwable $e) {
                    $createdAt = date('Y-m-d H:i:s');
                }

                // Skip duplicate messages already imported (same conv, sender, content, timestamp)
                $dupCheckStmt->execute([
                    'cid'     => $convId,
                    'sid'     => $senderId,
                    'content' => $content,
                    'cat'     => $createdAt
                ]);
                if ($dupCheckStmt->fetch()) {
                    $skippedCount++;
                    continue;
                }

                try {
                    $insertStmt->execute([
                        'cid'     => $convId,
                        'sid'     => $senderId,
                        'mtype'   => $msgType,
                        'content' => $content,
                        'cat'     => $createdAt
                    ]);

                    $lastMsgId = (int)$db->lastInsertId();
                    $lastMsgTime = $createdAt;
                    $importedCount++;
                } catch (Throwable $lineErr) {
                    // Skip single line if SQL fails (e.g. emoji truncation)
                    continue;
                }
            }

            // Update conversation's last message pointer ONLY if imported message is newer than existing conversation timestamp
            if ($lastMsgId) {
                $db->prepare('
                    UPDATE conversations 
                    SET last_message_id = :mid, last_message_at = :mat 
                    WHERE id = :cid AND (last_message_at IS NULL OR :mat2 >= last_message_at)
                ')->execute(['mid' => $lastMsgId, 'mat' => $lastMsgTime, 'mat2' => $lastMsgTime, 'cid' => $convId]);

                // Update sender's read marker
                $db->prepare('UPDATE conversation_members SET last_read_message_id = :mid WHERE conversation_id = :cid AND user_id = :uid AND (last_read_message_id IS NULL OR :mid2 > last_read_message_id)')
                   ->execute(['mid' => $lastMsgId, 'cid' => $convId, 'uid' => $currentUser['id'], 'mid2' => $lastMsgId]);
            }

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Import failed: ' . $e->getMessage(), 500);
        }

        // Log activity
        try {
            TrackingController::logActivity('import_whatsapp', (int)$currentUser['id'], [
                'conversation_id' => $convId,
                'imported_count'  => $importedCount,
                'skipped_count'   => $skippedCount,
            ]);
        } catch (Throwable $e) {}

        jsonResponse([
            'success'        => true,
            'imported_count' => $importedCount,
            'skipped_count'  => $skippedCount,
        ]);
    }

    /**
     * GET /api/conversations/{id}/search-messages?q=keyword
     */
    public static function searchMessages(string $identifier): void {
        $convId = self::resolveConvId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $query = isset($_GET['q']) ? trim($_GET['q']) : '';

        if (empty($query)) {
            jsonResponse(['success' => true, 'results' => []]);
        }

        $db = Database::getConnection();
        $memStmt = $db->prepare('SELECT id FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $memStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        if (!$memStmt->fetch()) {
            jsonError('Access denied.', 403);
        }

        $stmt = $db->prepare('
            SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.content, m.created_at,
                   u.display_name AS sender_name, u.avatar_url AS sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = :cid AND m.is_deleted = 0 AND m.content LIKE :q
            ORDER BY m.id DESC
            LIMIT 50
        ');
        $stmt->execute(['cid' => $convId, 'q' => '%' . $query . '%']);
        $rows = $stmt->fetchAll();

        $results = array_map(function($m) {
            return [
                'id' => (int)$m['id'],
                'sender_name' => decodeOutput($m['sender_name']),
                'sender_avatar' => $m['sender_avatar'],
                'content' => decodeOutput($m['content']),
                'created_at' => $m['created_at']
            ];
        }, $rows);

        jsonResponse(['success' => true, 'results' => $results]);
    }

    /**
     * POST /api/conversations/{id}/attachments
     */
    public static function uploadAttachment(string $identifier): void {
        $convId = self::resolveConvId($identifier);
        $currentUser = AuthMiddleware::authenticate();

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            jsonError('No file uploaded or upload failed.', 400);
        }

        $file = $_FILES['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'avif', 'heic', 'pdf', 'mp4', 'mov'];

        if (!in_array($ext, $allowedExts)) {
            jsonError('File extension not allowed.', 400);
        }

        $uploadDir = __DIR__ . '/../uploads/attachments/';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }

        $filename = 'att_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $targetPath = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            jsonError('Failed to save uploaded file to server directory.', 500);
        }

        $fileUrl = '/backend/uploads/attachments/' . $filename;
        jsonResponse(['success' => true, 'url' => $fileUrl]);
    }
}
