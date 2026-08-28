<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class NotificationController {

    /**
     * GET /api/notifications
     */
    public static function list(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT n.id, n.type, n.reference_id, n.content, n.is_read, n.created_at,
                   u.id AS actor_id, u.display_name AS actor_name, u.username AS actor_username, u.avatar_url AS actor_avatar
            FROM notifications n
            JOIN users u ON n.actor_id = u.id
            WHERE n.user_id = :uid
            ORDER BY n.created_at DESC
            LIMIT 50
        ');
        $stmt->execute(['uid' => $currentUser['id']]);
        $notifications = $stmt->fetchAll();

        $unreadCountStmt = $db->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :uid AND is_read = 0');
        $unreadCountStmt->execute(['uid' => $currentUser['id']]);
        $unreadCount = (int)$unreadCountStmt->fetchColumn();

        jsonResponse([
            'success' => true,
            'unread_count' => $unreadCount,
            'notifications' => array_map(function($n) {
                return [
                    'id' => (int)$n['id'],
                    'type' => $n['type'],
                    'reference_id' => $n['reference_id'] ? (int)$n['reference_id'] : null,
                    'content' => $n['content'],
                    'is_read' => (bool)$n['is_read'],
                    'created_at' => $n['created_at'],
                    'actor' => [
                        'id' => (int)$n['actor_id'],
                        'display_name' => $n['actor_name'],
                        'username' => $n['actor_username'],
                        'avatar_url' => $n['actor_avatar']
                    ]
                ];
            }, $notifications)
        ]);
    }

    /**
     * POST /api/notifications/read
     */
    public static function markRead(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $notificationId = (int)($body['notification_id'] ?? 0);

        if ($notificationId <= 0) {
            jsonError('Invalid notification ID', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :uid');
        $stmt->execute(['id' => $notificationId, 'uid' => $currentUser['id']]);

        jsonResponse(['success' => true]);
    }

    /**
     * POST /api/notifications/read-all
     */
    public static function markAllRead(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = :uid');
        $stmt->execute(['uid' => $currentUser['id']]);

        jsonResponse(['success' => true, 'message' => 'All notifications marked as read']);
    }
}
