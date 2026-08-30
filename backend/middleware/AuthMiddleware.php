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

        // Only select columns guaranteed to exist in the base schema
        // Geo columns (country_code, city, etc.) are optional extras added via migration
        $stmt = $db->prepare('
            SELECT s.token, u.id, u.display_name, u.username, u.email, u.avatar_url, u.bio, u.is_verified, u.created_at
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

        // Optionally fetch extra profile fields that may not exist on all deployments
        $extras = [];
        try {
            $extStmt = $db->prepare('SELECT country_code, country_name, city, timezone, last_ip, gender, date_of_birth, profile_completed, google_id, is_bot FROM users WHERE id = :id LIMIT 1');
            $extStmt->execute(['id' => $user['id']]);
            $extras = $extStmt->fetch() ?: [];
        } catch (Throwable $e) {}

        return array_merge($user, $extras);
    }
}
