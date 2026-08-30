<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/HashUtils.php';

class ConversationController {

    /**
     * GET /api/conversations
     */
    public static function list(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT c.id, c.type, c.name, c.description, c.avatar_url, c.creator_id, c.last_message_at, c.created_at,
                   cm.role, cm.last_read_message_id,
                   (
                       SELECT COUNT(*)
                       FROM messages m
                       WHERE m.conversation_id = c.id
                         AND m.id > cm.last_read_message_id
                         AND m.sender_id != :u1
                         AND m.is_deleted = 0
                   ) AS unread_count,
                   lm.id AS lm_id, lm.content AS lm_content, lm.message_type AS lm_type, lm.created_at AS lm_created_at,
                   su.display_name AS lm_sender_name, su.username AS lm_sender_username
            FROM conversations c
            JOIN conversation_members cm ON c.id = cm.conversation_id AND cm.user_id = :u2
            LEFT JOIN messages lm ON c.last_message_id = lm.id
            LEFT JOIN users su ON lm.sender_id = su.id
            ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
        ');
        $stmt->execute([
            'u1' => $currentUser['id'],
            'u2' => $currentUser['id']
        ]);
        $conversations = $stmt->fetchAll();

        $result = [];
        foreach ($conversations as $conv) {
            $displayName = decodeOutput($conv['name']);
            $avatarUrl = $conv['avatar_url'];
            $counterpart = null;
            $hashId = HashUtils::encodeId((int)$conv['id']);
            $slug = $hashId;

            if ($conv['type'] === 'direct') {
                $cpStmt = $db->prepare('
                    SELECT u.id, u.display_name, u.username, u.avatar_url, u.bio, u.is_ai, u.ai_character_id, p.status AS presence_status, p.last_seen_at, p.typing_conversation_id, p.typing_updated_at
                    FROM conversation_members cm
                    JOIN users u ON cm.user_id = u.id
                    LEFT JOIN user_presence p ON u.id = p.user_id
                    WHERE cm.conversation_id = :cid AND cm.user_id != :uid
                    LIMIT 1
                ');
                $cpStmt->execute(['cid' => $conv['id'], 'uid' => $currentUser['id']]);
                $cp = $cpStmt->fetch();

                if ($cp) {
                    $displayName = decodeOutput($cp['display_name']);
                    $avatarUrl = $cp['avatar_url'];
                    $slug = '@' . $cp['username'];
                    $isTyping = ($cp['typing_conversation_id'] == $conv['id'] && (time() - strtotime($cp['typing_updated_at'] ?? '1970-01-01')) < 6);
                    $isOnline = ($cp['presence_status'] === 'online') || ((time() - strtotime($cp['last_seen_at'] ?? '1970-01-01')) < 120);

                    $counterpart = [
                        'id' => (int)$cp['id'],
                        'display_name' => decodeOutput($cp['display_name']),
                        'username' => $cp['username'],
                        'avatar_url' => $cp['avatar_url'],
                        'bio' => decodeOutput($cp['bio']),
                        'is_ai' => !empty($cp['is_ai']) && $cp['is_ai'] != 0,
                        'ai_character_id' => (int)($cp['ai_character_id'] ?? 0),
                        'presence' => $cp['presence_status'] ?: 'offline',
                        'is_online' => $isOnline,
                        'last_seen_at' => $cp['last_seen_at'],
                        'is_typing' => $isTyping
                    ];
                }
            }

            $lastMsgPreview = null;
            if (!empty($conv['lm_id'])) {
                $contentPreview = decodeOutput($conv['lm_content']);
                if ($conv['lm_type'] === 'poll' || strpos($conv['lm_content'], '{"poll_id"') === 0) {
                    $pollData = json_decode($conv['lm_content'], true);
                    $contentPreview = '📊 Poll: ' . decodeOutput($pollData['question'] ?? 'Live Poll');
                } else if ($conv['lm_type'] === 'gif') {
                    $contentPreview = '🎞 GIF';
                } else if ($conv['lm_type'] === 'sticker') {
                    $contentPreview = '🎨 Sticker';
                } else if ($conv['lm_type'] === 'image') {
                    $contentPreview = '📷 Photo';
                }

                $lastMsgPreview = [
                    'id' => (int)$conv['lm_id'],
                    'content' => $contentPreview,
                    'type' => $conv['lm_type'],
                    'message_type' => $conv['lm_type'],
                    'created_at' => $conv['lm_created_at'],
                    'sender_name' => decodeOutput($conv['lm_sender_name'])
                ];
            }

            $result[] = [
                'id' => (int)$conv['id'],
                'hash_id' => $hashId,
                'slug' => $slug,
                'type' => $conv['type'],
                'name' => $displayName,
                'description' => decodeOutput($conv['description']),
                'avatar_url' => $avatarUrl,
                'creator_id' => $conv['creator_id'] ? (int)$conv['creator_id'] : null,
                'role' => $conv['role'],
                'unread_count' => (int)$conv['unread_count'],
                'last_message' => $lastMsgPreview,
                'last_message_at' => $conv['last_message_at'],
                'created_at' => $conv['created_at'],
                'counterpart' => $counterpart
            ];
        }

        jsonResponse(['success' => true, 'conversations' => $result]);
    }

    /**
     * Resolve raw identifier (numeric ID, hash string, or @username) to integer conversation ID
     */
    private static function resolveId(string $identifier): int {
        if (is_numeric($identifier)) {
            return (int)$identifier;
        }

        $clean = trim($identifier);
        // If starting with @username, find direct conversation
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

        // Decode encrypted hash ID (e.g., 'c8f2a9d1')
        return HashUtils::decodeId($clean);
    }

    /**
     * GET /api/conversations/{id}
     */
    public static function get(string $identifier): void {
        $currentUser = AuthMiddleware::authenticate();
        $id = self::resolveId($identifier);

        if ($id <= 0) {
            jsonError('Conversation not found', 404);
        }

        $db = Database::getConnection();
        $memStmt = $db->prepare('SELECT role, last_read_message_id FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $memStmt->execute(['cid' => $id, 'uid' => $currentUser['id']]);
        $memberInfo = $memStmt->fetch();

        if (!$memberInfo) {
            jsonError('Access denied. You are not a member of this conversation.', 403);
        }

        $stmt = $db->prepare('SELECT * FROM conversations WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $conv = $stmt->fetch();

        if (!$conv) {
            jsonError('Conversation not found', 404);
        }

        $membersStmt = $db->prepare('
            SELECT cm.id, cm.role, cm.joined_at, u.id AS user_id, u.display_name, u.username, u.avatar_url, u.bio, u.is_ai, u.ai_character_id, p.status AS presence_status, p.last_seen_at
            FROM conversation_members cm
            JOIN users u ON cm.user_id = u.id
            LEFT JOIN user_presence p ON u.id = p.user_id
            WHERE cm.conversation_id = :cid
            ORDER BY cm.role DESC, u.display_name ASC
        ');
        $membersStmt->execute(['cid' => $id]);
        $members = $membersStmt->fetchAll();

        $displayName = decodeOutput($conv['name']);
        $avatarUrl = $conv['avatar_url'];
        $counterpart = null;
        $hashId = HashUtils::encodeId((int)$conv['id']);
        $slug = $hashId;

        if ($conv['type'] === 'direct') {
            foreach ($members as $m) {
                if ((int)$m['user_id'] !== (int)$currentUser['id']) {
                    $displayName = decodeOutput($m['display_name']);
                    $avatarUrl = $m['avatar_url'];
                    $slug = '@' . $m['username'];
                    $counterpart = [
                        'id' => (int)$m['user_id'],
                        'display_name' => decodeOutput($m['display_name']),
                        'username' => $m['username'],
                        'avatar_url' => $m['avatar_url'],
                        'bio' => decodeOutput($m['bio']),
                        'is_ai' => !empty($m['is_ai']) && $m['is_ai'] != 0,
                        'ai_character_id' => (int)($m['ai_character_id'] ?? 0),
                        'presence' => $m['presence_status'] ?: 'offline',
                        'last_seen_at' => $m['last_seen_at']
                    ];
                    break;
                }
            }
        }

        jsonResponse([
            'success' => true,
            'conversation' => [
                'id' => (int)$conv['id'],
                'hash_id' => $hashId,
                'slug' => $slug,
                'type' => $conv['type'],
                'name' => $displayName,
                'description' => decodeOutput($conv['description']),
                'avatar_url' => $avatarUrl,
                'creator_id' => $conv['creator_id'] ? (int)$conv['creator_id'] : null,
                'my_role' => $memberInfo['role'],
                'members' => array_map(function($m) {
                    return [
                        'user_id' => (int)$m['user_id'],
                        'display_name' => decodeOutput($m['display_name']),
                        'username' => $m['username'],
                        'avatar_url' => $m['avatar_url'],
                        'bio' => decodeOutput($m['bio']),
                        'role' => $m['role'],
                        'presence' => $m['presence_status'] ?: 'offline',
                        'joined_at' => $m['joined_at']
                    ];
                }, $members),
                'counterpart' => $counterpart,
                'created_at' => $conv['created_at']
            ]
        ]);
    }

    /**
     * GET /api/conversations/{id}/counterpart-status
     */
    public static function getCounterpartStatus(string $identifier): void {
        $convId = self::resolveConvId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT cm.user_id, u.display_name, u.username, u.is_ai,
                   p.status AS presence_status, p.last_seen_at, p.typing_conversation_id, p.typing_updated_at
            FROM conversation_members cm
            JOIN users u ON cm.user_id = u.id
            LEFT JOIN user_presence p ON u.id = p.user_id
            WHERE cm.conversation_id = :cid AND cm.user_id != :uid
            LIMIT 1
        ');
        $stmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        $cp = $stmt->fetch();

        if (!$cp) {
            jsonResponse([
                'success' => true,
                'status' => null
            ]);
            return;
        }

        $lastSeenTs = strtotime($cp['last_seen_at'] ?? '1970-01-01');
        $isOnline = ($cp['presence_status'] === 'online') || ((time() - $lastSeenTs) < 120);

        $typingUpdatedTs = strtotime($cp['typing_updated_at'] ?? '1970-01-01');
        $isTyping = ((int)$cp['typing_conversation_id'] === (int)$convId) && ((time() - $typingUpdatedTs) < 6);

        jsonResponse([
            'success' => true,
            'status' => [
                'user_id' => (int)$cp['user_id'],
                'is_online' => $isOnline,
                'presence' => $isOnline ? 'online' : 'offline',
                'is_typing' => $isTyping,
                'last_seen_at' => $cp['last_seen_at']
            ]
        ]);
    }

    /**
     * GET /api/conversations/{id}/media
     */
    public static function getMedia(string $identifier): void {
        $id = self::resolveId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT id, message_type, content, created_at
            FROM messages
            WHERE conversation_id = :cid AND message_type IN ("image", "video", "gif", "file") AND is_deleted = 0
            ORDER BY created_at DESC
            LIMIT 50
        ');
        $stmt->execute(['cid' => $id]);
        $items = $stmt->fetchAll();

        jsonResponse([
            'success' => true,
            'media' => array_map(function($i) {
                return [
                    'id' => (int)$i['id'],
                    'type' => $i['message_type'],
                    'message_type' => $i['message_type'],
                    'content' => decodeOutput($i['content']),
                    'media_url' => $i['content'],
                    'created_at' => $i['created_at']
                ];
            }, $items)
        ]);
    }

    /**
     * GET /api/conversations/{id}/search?q=...
     */
    public static function searchMessages(string $identifier): void {
        $id = self::resolveId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $query = trim($_GET['q'] ?? '');
        $db = Database::getConnection();

        if (strlen($query) < 1) {
            jsonResponse(['success' => true, 'messages' => []]);
        }

        $stmt = $db->prepare('
            SELECT m.id, m.content, m.message_type, m.created_at, u.display_name AS sender_name, u.username AS sender_username
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = :cid AND m.content LIKE :q AND m.is_deleted = 0
            ORDER BY m.created_at DESC
            LIMIT 30
        ');
        $stmt->execute(['cid' => $id, 'q' => '%' . $query . '%']);

        jsonResponse([
            'success' => true,
            'messages' => array_map(function($m) {
                return [
                    'id' => (int)$m['id'],
                    'content' => decodeOutput($m['content']),
                    'type' => $m['message_type'],
                    'message_type' => $m['message_type'],
                    'created_at' => $m['created_at'],
                    'sender_name' => decodeOutput($m['sender_name']),
                    'sender_username' => $m['sender_username']
                ];
            }, $stmt->fetchAll())
        ]);
    }

    /**
     * POST /api/conversations/direct
     */
    public static function createDirect(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $targetUserId = (int)($body['target_user_id'] ?? ($body['user_id'] ?? 0));

        if ($targetUserId <= 0 || $targetUserId === (int)$currentUser['id']) {
            jsonError('Invalid target user for direct message.', 400);
        }

        $db = Database::getConnection();

        // Check if direct conversation already exists
        $existingStmt = $db->prepare('
            SELECT c.id
            FROM conversations c
            JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = :uid
            JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = :tid
            WHERE c.type = "direct"
            LIMIT 1
        ');
        $existingStmt->execute(['uid' => $currentUser['id'], 'tid' => $targetUserId]);
        $existing = $existingStmt->fetch();

        if ($existing) {
            $convId = (int)$existing['id'];
            $hashId = HashUtils::encodeId($convId);
            jsonResponse([
                'success' => true,
                'conversation_id' => $convId,
                'hash_id' => $hashId,
                'is_new' => false
            ]);
        }

        // Create new direct conversation
        $db->beginTransaction();

        try {
            $convStmt = $db->prepare('INSERT INTO conversations (type, creator_id) VALUES ("direct", :creator_id)');
            $convStmt->execute(['creator_id' => $currentUser['id']]);
            $convId = (int)$db->lastInsertId();

            $memStmt = $db->prepare('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (:cid, :uid, "member")');
            $memStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
            $memStmt->execute(['cid' => $convId, 'uid' => $targetUserId]);

            $db->commit();
            $hashId = HashUtils::encodeId($convId);

            jsonResponse([
                'success' => true,
                'conversation_id' => $convId,
                'hash_id' => $hashId,
                'is_new' => true
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to create direct conversation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/conversations/group
     */
    public static function createGroup(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $name = sanitizeInput($body['name'] ?? ($body['title'] ?? ''));
        $description = sanitizeInput($body['description'] ?? '');
        $avatarUrl = sanitizeInput($body['avatar_url'] ?? '');
        $memberIds = $body['member_ids'] ?? [];

        if (empty($name)) {
            jsonError('Group name is required.', 422);
        }

        if (empty($avatarUrl)) {
            $avatarUrl = "https://api.dicebear.com/7.x/identicon/svg?seed=" . urlencode($name);
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $convStmt = $db->prepare('
                INSERT INTO conversations (type, name, description, avatar_url, creator_id)
                VALUES ("group", :name, :description, :avatar_url, :creator_id)
            ');
            $convStmt->execute([
                'name' => $name,
                'description' => $description,
                'avatar_url' => $avatarUrl,
                'creator_id' => $currentUser['id']
            ]);
            $convId = (int)$db->lastInsertId();

            // Insert owner
            $memStmt = $db->prepare('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (:cid, :uid, :role)');
            $memStmt->execute(['cid' => $convId, 'uid' => $currentUser['id'], 'role' => 'owner']);

            // Insert initial members
            if (is_array($memberIds)) {
                foreach ($memberIds as $mid) {
                    $mid = (int)$mid;
                    if ($mid > 0 && $mid !== (int)$currentUser['id']) {
                        $memStmt->execute(['cid' => $convId, 'uid' => $mid, 'role' => 'member']);

                        $notif = $db->prepare('
                            INSERT INTO notifications (user_id, actor_id, type, reference_id, content)
                            VALUES (:user_id, :actor_id, "group_invite", :ref_id, :content)
                        ');
                        $notif->execute([
                            'user_id' => $mid,
                            'actor_id' => $currentUser['id'],
                            'ref_id' => $convId,
                            'content' => decodeOutput($currentUser['display_name']) . ' added you to the group "' . $name . '".'
                        ]);
                    }
                }
            }

            $db->commit();
            $hashId = HashUtils::encodeId($convId);

            jsonResponse([
                'success' => true,
                'conversation_id' => $convId,
                'hash_id' => $hashId,
                'message' => 'Group created successfully'
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to create group: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PATCH /api/conversations/{id}
     */
    public static function updateGroup(string $identifier): void {
        $convId = self::resolveId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $roleStmt = $db->prepare('SELECT role FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $roleStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        $member = $roleStmt->fetch();

        if (!$member || !in_array($member['role'], ['owner', 'admin'])) {
            jsonError('Only group owners or admins can modify group details.', 403);
        }

        $body = getRequestBody();
        $name = sanitizeInput($body['name'] ?? '');
        $description = sanitizeInput($body['description'] ?? '');
        $avatarUrl = sanitizeInput($body['avatar_url'] ?? '');

        if (empty($name)) {
            jsonError('Group name cannot be empty', 422);
        }

        $stmt = $db->prepare('
            UPDATE conversations
            SET name = :name, description = :desc, avatar_url = COALESCE(NULLIF(:avatar, ""), avatar_url)
            WHERE id = :cid AND type = "group"
        ');
        $stmt->execute([
            'name' => $name,
            'desc' => $description,
            'avatar' => $avatarUrl,
            'cid' => $convId
        ]);

        jsonResponse(['success' => true, 'message' => 'Group details updated successfully']);
    }

    /**
     * POST /api/conversations/{id}/members
     */
    public static function addMember(string $identifier): void {
        $convId = self::resolveId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $roleStmt = $db->prepare('SELECT role FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $roleStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        $member = $roleStmt->fetch();

        if (!$member || !in_array($member['role'], ['owner', 'admin'])) {
            jsonError('Only owners or admins can add new members.', 403);
        }

        $body = getRequestBody();
        $targetUserId = (int)($body['target_user_id'] ?? ($body['user_id'] ?? 0));

        if ($targetUserId <= 0) {
            jsonError('Invalid user ID', 400);
        }

        $stmt = $db->prepare('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (:cid, :uid, "member") ON DUPLICATE KEY UPDATE role=role');
        $stmt->execute(['cid' => $convId, 'uid' => $targetUserId]);

        jsonResponse(['success' => true, 'message' => 'Member added to group']);
    }

    /**
     * DELETE /api/conversations/{id}/members/{user_id}
     */
    public static function removeMember(string $identifier, int $targetUserId): void {
        $convId = self::resolveId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $roleStmt = $db->prepare('SELECT role FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $roleStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        $member = $roleStmt->fetch();

        if (!$member || !in_array($member['role'], ['owner', 'admin'])) {
            jsonError('Only owners or admins can remove members.', 403);
        }

        $stmt = $db->prepare('DELETE FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid AND role != "owner"');
        $stmt->execute(['cid' => $convId, 'uid' => $targetUserId]);

        jsonResponse(['success' => true, 'message' => 'Member removed from group']);
    }

    /**
     * POST /api/conversations/{id}/leave
     */
    public static function leaveGroup(string $identifier): void {
        $convId = self::resolveId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('DELETE FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid');
        $stmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);

        jsonResponse(['success' => true, 'message' => 'You left the group']);
    }

    /**
     * POST /api/conversations/{id}/clear
     * Delete/Clear chat history for current user only
     */
    public static function clearForUser(string $identifier): void {
        $convId = self::resolveId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        try {
            $db->exec('ALTER TABLE conversation_members ADD COLUMN cleared_at DATETIME DEFAULT NULL');
        } catch (Throwable $e) {}

        $stmt = $db->prepare('UPDATE conversation_members SET cleared_at = NOW() WHERE conversation_id = :cid AND user_id = :uid');
        $stmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);

        jsonResponse(['success' => true, 'message' => 'Chat cleared for you successfully.']);
    }

    /**
     * POST /api/conversations/{id}/delete-everyone
     * Delete chat messages for everyone
     */
    public static function deleteForEveryone(string $identifier): void {
        $convId = self::resolveId($identifier);
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $roleStmt = $db->prepare('SELECT role FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $roleStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        $member = $roleStmt->fetch();

        if (!$member) {
            jsonError('Access denied.', 403);
        }

        $stmt = $db->prepare('UPDATE messages SET is_deleted = 1 WHERE conversation_id = :cid');
        $stmt->execute(['cid' => $convId]);

        jsonResponse(['success' => true, 'message' => 'Chat deleted for everyone successfully.']);
    }
}
