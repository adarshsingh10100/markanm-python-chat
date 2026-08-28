<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class BlockController {

    /**
     * POST /api/users/block
     */
    public static function blockUser(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $targetUserId = (int)($body['target_user_id'] ?? 0);

        if ($targetUserId <= 0 || $targetUserId === (int)$currentUser['id']) {
            jsonError('Invalid target user for blocking.', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT INTO user_blocks (blocker_id, blocked_id)
            VALUES (:blocker, :blocked)
            ON DUPLICATE KEY UPDATE created_at = NOW()
        ');
        $stmt->execute(['blocker' => $currentUser['id'], 'blocked' => $targetUserId]);

        // Remove any connection between them
        $delConn = $db->prepare('
            DELETE FROM connections
            WHERE (requester_id = :u1 AND receiver_id = :t1) OR (requester_id = :t2 AND receiver_id = :u2)
        ');
        $delConn->execute([
            'u1' => $currentUser['id'],
            't1' => $targetUserId,
            't2' => $targetUserId,
            'u2' => $currentUser['id']
        ]);

        jsonResponse(['success' => true, 'message' => 'User blocked successfully']);
    }

    /**
     * POST /api/users/unblock
     */
    public static function unblockUser(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $targetUserId = (int)($body['target_user_id'] ?? 0);

        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM user_blocks WHERE blocker_id = :blocker AND blocked_id = :blocked');
        $stmt->execute(['blocker' => $currentUser['id'], 'blocked' => $targetUserId]);

        jsonResponse(['success' => true, 'message' => 'User unblocked successfully']);
    }
}
