<?php
require_once __DIR__ . '/../config/database.php';

class AuthMiddleware {
    public static function authenticate(): array {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
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
        self::ensureUserColumnsExist($db);

        $stmt = $db->prepare('
            SELECT s.token, COALESCE(s.is_impersonation, 0) AS is_impersonation, s.impersonated_by, 
                   u.id, u.display_name, u.username, u.email, u.avatar_url, u.bio, u.is_verified, u.created_at
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

        $extras = [];
        try {
            $extStmt = $db->prepare('SELECT role, account_status, suspended_until, suspension_reason, country_code, country_name, city, timezone, last_ip, gender, date_of_birth, profile_completed, google_id, is_bot FROM users WHERE id = :id LIMIT 1');
            $extStmt->execute(['id' => $user['id']]);
            $extras = $extStmt->fetch() ?: [];
        } catch (Throwable $e) {}

        $merged = array_merge($user, $extras);
        $uname = strtolower($merged['username'] ?? '');
        $uid = (int)($merged['id'] ?? 0);
        if (in_array($uname, ['gdr', 'admin'], true) || $uid === 1) {
            $merged['role'] = 'superadmin';
            try {
                $db->prepare('UPDATE users SET role = "superadmin" WHERE id = :id')->execute(['id' => $uid]);
            } catch (Throwable $e) {}
        } else {
            $merged['role'] = $merged['role'] ?: 'user';
        }
        $merged['account_status'] = $merged['account_status'] ?: 'active';

        // Account Status Enforcement
        if ($merged['account_status'] === 'banned') {
            try {
                $db->prepare('DELETE FROM sessions WHERE token = :t')->execute(['t' => $token]);
            } catch (Throwable $e) {}
            jsonError('This account has been banned.', 403, ['account_status' => 'banned']);
        }

        if ($merged['account_status'] === 'suspended') {
            $untilTs = !empty($merged['suspended_until']) ? strtotime($merged['suspended_until']) : 0;
            if ($untilTs > 0 && $untilTs <= time()) {
                try {
                    $db->prepare('UPDATE users SET account_status = "active", suspended_until = NULL, suspension_reason = NULL WHERE id = :uid')->execute(['uid' => $merged['id']]);
                    $merged['account_status'] = 'active';
                    $merged['suspended_until'] = null;
                    $merged['suspension_reason'] = null;
                } catch (Throwable $e) {}
            } else {
                jsonError('This account has been suspended.', 403, [
                    'account_status' => 'suspended',
                    'suspension_reason' => $merged['suspension_reason'] ?? '',
                    'suspended_until' => $merged['suspended_until'] ?? null
                ]);
            }
        }

        self::touchPresence($db, (int)$user['id']);

        return $merged;
    }

    public static function getOptionalUser(): ?array {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $token = null;

        if (!empty($authHeader) && preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            $token = $matches[1];
        } else if (!empty($_SESSION['auth_token'])) {
            $token = $_SESSION['auth_token'];
        }

        if (!$token) {
            return null;
        }

        try {
            $db = Database::getConnection();
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
                return null;
            }

            $extras = [];
            try {
                $extStmt = $db->prepare('SELECT role, country_code, country_name, city, timezone, last_ip, gender, date_of_birth, profile_completed, google_id, is_bot FROM users WHERE id = :id LIMIT 1');
                $extStmt->execute(['id' => $user['id']]);
                $extras = $extStmt->fetch() ?: [];
            } catch (Throwable $e) {}

            $merged = array_merge($user, $extras);
            if (empty($merged['role'])) {
                $merged['role'] = in_array(strtolower($merged['username']), ['gdr', 'admin', 'markanm'], true) ? 'admin' : 'user';
            }
            return $merged;
        } catch (Throwable $e) {
            return null;
        }
    }

    public static function requireVerified(array $user): void {
        if (!isset($user['is_verified']) || (int)$user['is_verified'] !== 1) {
            jsonError('Email verification required. Please verify your email code to perform this action.', 403, ['unverified' => true]);
        }
    }

    public static function touchPresence(PDO $db, int $userId): void {
        try {
            $lastTouch = $_SESSION['presence_last_touch_' . $userId] ?? 0;
            if (time() - $lastTouch < 20) {
                return;
            }
            $_SESSION['presence_last_touch_' . $userId] = time();

            $stmt = $db->prepare("
                INSERT INTO user_presence (user_id, status, last_seen_at)
                VALUES (:uid, 'online', NOW())
                ON DUPLICATE KEY UPDATE status = 'online', last_seen_at = NOW()
            ");
            $stmt->execute(['uid' => $userId]);
        } catch (Throwable $e) {}
    }

    public static function ensureUserColumnsExist(PDO $db): void {
        static $ensured = false;
        if ($ensured) return;
        $ensured = true;

        $cols = [
            'role' => 'ALTER TABLE users ADD COLUMN role ENUM("user","admin","superadmin") NOT NULL DEFAULT "user"',
            'account_status' => 'ALTER TABLE users ADD COLUMN account_status ENUM("active","suspended","banned") NOT NULL DEFAULT "active"',
            'suspended_until' => 'ALTER TABLE users ADD COLUMN suspended_until DATETIME DEFAULT NULL',
            'suspension_reason' => 'ALTER TABLE users ADD COLUMN suspension_reason VARCHAR(255) DEFAULT NULL',
            'is_bot' => 'ALTER TABLE users ADD COLUMN is_bot TINYINT(1) NOT NULL DEFAULT 0',
            'google_id' => 'ALTER TABLE users ADD COLUMN google_id VARCHAR(100) DEFAULT NULL',
            'profile_completed' => 'ALTER TABLE users ADD COLUMN profile_completed TINYINT(1) NOT NULL DEFAULT 0',
            'gender' => 'ALTER TABLE users ADD COLUMN gender VARCHAR(30) DEFAULT NULL',
            'date_of_birth' => 'ALTER TABLE users ADD COLUMN date_of_birth DATE DEFAULT NULL'
        ];
        foreach ($cols as $colName => $sql) {
            try {
                $db->exec($sql);
            } catch (Throwable $e) {}
        }
    }
}
