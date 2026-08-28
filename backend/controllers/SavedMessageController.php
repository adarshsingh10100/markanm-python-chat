<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class SavedMessageController {

    /**
     * POST /api/messages/{id}/save
     */
    public static function toggleSave(int $messageId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $check = $db->prepare('SELECT id FROM saved_messages WHERE user_id = :uid AND message_id = :mid LIMIT 1');
        $check->execute(['uid' => $currentUser['id'], 'mid' => $messageId]);
        $existing = $check->fetch();

        if ($existing) {
            $del = $db->prepare('DELETE FROM saved_messages WHERE id = :id');
            $del->execute(['id' => $existing['id']]);
            jsonResponse(['success' => true, 'is_saved' => false, 'message' => 'Message unsaved']);
        } else {
            $ins = $db->prepare('INSERT INTO saved_messages (user_id, message_id) VALUES (:uid, :mid)');
            $ins->execute(['uid' => $currentUser['id'], 'mid' => $messageId]);
            jsonResponse(['success' => true, 'is_saved' => true, 'message' => 'Message saved']);
        }
    }

    /**
     * GET /api/saved-messages
     */
    public static function listSaved(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT sm.id AS saved_id, sm.created_at AS saved_at,
                   m.id AS message_id, m.content, m.message_type, m.created_at AS sent_at,
                   u.display_name AS sender_name, u.username AS sender_username, u.avatar_url AS sender_avatar
            FROM saved_messages sm
            JOIN messages m ON sm.message_id = m.id
            JOIN users u ON m.sender_id = u.id
            WHERE sm.user_id = :uid
            ORDER BY sm.created_at DESC
        ');
        $stmt->execute(['uid' => $currentUser['id']]);
        $saved = $stmt->fetchAll();

        jsonResponse([
            'success' => true,
            'messages' => array_map(function($s) {
                return [
                    'saved_id' => (int)$s['saved_id'],
                    'message_id' => (int)$s['message_id'],
                    'content' => decodeOutput($s['content']),
                    'type' => $s['message_type'],
                    'message_type' => $s['message_type'],
                    'sent_at' => $s['sent_at'],
                    'saved_at' => $s['saved_at'],
                    'sender' => [
                        'display_name' => decodeOutput($s['sender_name']),
                        'username' => $s['sender_username'],
                        'avatar_url' => $s['sender_avatar']
                    ]
                ];
            }, $saved)
        ]);
    }
}
