<?php
require_once __DIR__ . '/../config/database.php';

class AuthMiddleware {
    public static function authenticate(): array {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        $token = null;

        if (!empty($authHeader) && preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            $token = $matches[1];
        } else if (!empty($_SESSION['auth_token'])) {
            $token = $_SESSION['auth_token'];
        }

        if (!$token) {
            jsonError('Unauthorized. Please log in.', 401);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT s.token, u.id, u.display_name, u.username, u.email, u.avatar_url, u.bio, u.is_verified,
                   u.country_code, u.country_name, u.city, u.timezone, u.last_ip, u.created_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = :token AND s.expires_at > NOW()
            LIMIT 1
        ');
        $stmt->execute(['token' => $token]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonError('Session expired or invalid token.', 401);
        }

        return $user;
    }
}
