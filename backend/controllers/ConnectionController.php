<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ConnectionController {

    /**
     * GET /api/connections
     */
    public static function list(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        // 1. Get accepted connections
        $stmtConnected = $db->prepare('
            SELECT c.id AS connection_id, u.id AS user_id, u.display_name, u.username, u.avatar_url, u.bio, p.status AS presence_status, p.last_seen_at
            FROM connections c
            JOIN users u ON (CASE WHEN c.requester_id = :u1 THEN c.receiver_id ELSE c.requester_id END) = u.id
            LEFT JOIN user_presence p ON u.id = p.user_id
            WHERE (c.requester_id = :u2 OR c.receiver_id = :u3) AND c.status = "accepted"
            ORDER BY u.display_name ASC
        ');
        $stmtConnected->execute([
            'u1' => $currentUser['id'],
            'u2' => $currentUser['id'],
            'u3' => $currentUser['id']
        ]);
        $connected = $stmtConnected->fetchAll();

        // 2. Get incoming pending requests
        $stmtPendingIn = $db->prepare('
            SELECT c.id AS connection_id, u.id AS user_id, u.display_name, u.username, u.avatar_url, c.created_at
            FROM connections c
            JOIN users u ON c.requester_id = u.id
            WHERE c.receiver_id = :uid AND c.status = "pending"
            ORDER BY c.created_at DESC
        ');
        $stmtPendingIn->execute(['uid' => $currentUser['id']]);
        $pendingIncoming = $stmtPendingIn->fetchAll();

        // 3. Get outgoing pending requests
        $stmtPendingOut = $db->prepare('
            SELECT c.id AS connection_id, u.id AS user_id, u.display_name, u.username, u.avatar_url, c.created_at
            FROM connections c
            JOIN users u ON c.receiver_id = u.id
            WHERE c.requester_id = :uid AND c.status = "pending"
            ORDER BY c.created_at DESC
        ');
        $stmtPendingOut->execute(['uid' => $currentUser['id']]);
        $pendingOutgoing = $stmtPendingOut->fetchAll();

        jsonResponse([
            'success' => true,
            'connected' => array_map(function($u) {
                return [
                    'connection_id' => (int)$u['connection_id'],
                    'user_id' => (int)$u['user_id'],
                    'display_name' => decodeOutput($u['display_name']),
                    'username' => $u['username'],
                    'avatar_url' => $u['avatar_url'],
                    'bio' => decodeOutput($u['bio']),
                    'presence' => $u['presence_status'] ?: 'offline',
                    'last_seen_at' => $u['last_seen_at']
                ];
            }, $connected),
            'pending_incoming' => array_map(function($u) {
                return [
                    'connection_id' => (int)$u['connection_id'],
                    'user_id' => (int)$u['user_id'],
                    'display_name' => decodeOutput($u['display_name']),
                    'username' => $u['username'],
                    'avatar_url' => $u['avatar_url'],
                    'created_at' => $u['created_at']
                ];
            }, $pendingIncoming),
            'pending_outgoing' => array_map(function($u) {
                return [
                    'connection_id' => (int)$u['connection_id'],
                    'user_id' => (int)$u['user_id'],
                    'display_name' => decodeOutput($u['display_name']),
                    'username' => $u['username'],
                    'avatar_url' => $u['avatar_url'],
                    'created_at' => $u['created_at']
                ];
            }, $pendingOutgoing)
        ]);
    }

    /**
     * POST /api/connections/request
     */
    public static function sendRequest(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $targetUserId = (int)($body['target_user_id'] ?? ($body['user_id'] ?? ($body['receiver_id'] ?? ($body['id'] ?? 0))));

        if ($targetUserId <= 0 || $targetUserId === (int)$currentUser['id']) {
            jsonError('Invalid target user for connection request.', 400);
        }

        $db = Database::getConnection();

        // Check existing connection
        $checkStmt = $db->prepare('
            SELECT id, status, requester_id
            FROM connections
            WHERE (requester_id = :u1 AND receiver_id = :t1) OR (requester_id = :t2 AND receiver_id = :u2)
            LIMIT 1
        ');
        $checkStmt->execute([
            'u1' => $currentUser['id'],
            't1' => $targetUserId,
            't2' => $targetUserId,
            'u2' => $currentUser['id']
        ]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            if ($existing['status'] === 'accepted') {
                jsonError('Already connected with this user.', 400);
            }
            if ($existing['status'] === 'pending') {
                if ((int)$existing['requester_id'] === (int)$currentUser['id']) {
                    jsonError('Connection request already sent.', 400);
                } else {
                    jsonError('This user has already sent you a connection request.', 400);
                }
            }
        }

        $stmt = $db->prepare('
            INSERT INTO connections (requester_id, receiver_id, status)
            VALUES (:uid, :tid, "pending")
        ');
        $stmt->execute(['uid' => $currentUser['id'], 'tid' => $targetUserId]);
        $connectionId = (int)$db->lastInsertId();

        // Create Notification for receiver
        $notifStmt = $db->prepare('
            INSERT INTO notifications (user_id, actor_id, type, reference_id, content)
            VALUES (:user_id, :actor_id, "connection_request", :ref_id, :content)
        ');
        $notifStmt->execute([
            'user_id' => $targetUserId,
            'actor_id' => $currentUser['id'],
            'ref_id' => $connectionId,
            'content' => decodeOutput($currentUser['display_name']) . ' sent you a connection request.'
        ]);

        jsonResponse([
            'success' => true,
            'message' => 'Connection request sent successfully',
            'connection_id' => $connectionId
        ]);
    }

    /**
     * POST /api/connections/accept
     */
    public static function acceptRequest(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $connectionId = (int)($body['connection_id'] ?? ($body['id'] ?? ($body['request_id'] ?? 0)));

        if ($connectionId <= 0) {
            jsonError('Invalid connection ID.', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM connections WHERE id = :id AND receiver_id = :uid LIMIT 1');
        $stmt->execute(['id' => $connectionId, 'uid' => $currentUser['id']]);
        $conn = $stmt->fetch();

        if (!$conn) {
            jsonError('Connection request not found or unauthorized.', 404);
        }

        $updateStmt = $db->prepare('UPDATE connections SET status = "accepted" WHERE id = :id');
        $updateStmt->execute(['id' => $connectionId]);

        // Send notification to the requester that request was accepted
        $notifStmt = $db->prepare('
            INSERT INTO notifications (user_id, actor_id, type, reference_id, content)
            VALUES (:user_id, :actor_id, "connection_accepted", :ref_id, :content)
        ');
        $notifStmt->execute([
            'user_id' => $conn['requester_id'],
            'actor_id' => $currentUser['id'],
            'ref_id' => $connectionId,
            'content' => decodeOutput($currentUser['display_name']) . ' accepted your connection request.'
        ]);

        jsonResponse([
            'success' => true,
            'message' => 'Connection accepted.'
        ]);
    }

    /**
     * POST /api/connections/reject
     */
    public static function rejectRequest(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $connectionId = (int)($body['connection_id'] ?? ($body['id'] ?? ($body['request_id'] ?? 0)));

        if ($connectionId <= 0) {
            jsonError('Invalid connection ID.', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM connections WHERE id = :id AND (receiver_id = :u1 OR requester_id = :u2)');
        $stmt->execute(['id' => $connectionId, 'u1' => $currentUser['id'], 'u2' => $currentUser['id']]);

        jsonResponse([
            'success' => true,
            'message' => 'Connection request removed.'
        ]);
    }

    /**
     * DELETE /api/connections/{id}
     */
    public static function remove(int $connectionId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('DELETE FROM connections WHERE id = :id AND (requester_id = :u1 OR receiver_id = :u2)');
        $stmt->execute(['id' => $connectionId, 'u1' => $currentUser['id'], 'u2' => $currentUser['id']]);

        jsonResponse([
            'success' => true,
            'message' => 'Connection removed.'
        ]);
    }
}
