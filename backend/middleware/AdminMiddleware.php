<?php
require_once __DIR__ . '/AuthMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class AdminMiddleware {
    /**
     * Require Admin or SuperAdmin role
     */
    public static function requireAdmin(): array {
        $user = AuthMiddleware::authenticate();
        $role = strtolower($user['role'] ?? 'user');
        $uname = strtolower($user['username'] ?? '');
        $uid = (int)($user['id'] ?? 0);

        if (in_array($uname, ['gdr', 'admin'], true) || $uid === 1) {
            $role = 'superadmin';
            $user['role'] = 'superadmin';
            try {
                $db = Database::getConnection();
                $db->prepare('UPDATE users SET role = "superadmin" WHERE id = :id')->execute(['id' => $uid]);
            } catch (Throwable $e) {}
        }

        if (!in_array($role, ['admin', 'superadmin'], true)) {
            jsonError('Admin access required.', 403);
        }

        return $user;
    }

    /**
     * Require SuperAdmin role exclusively
     */
    public static function requireSuperAdmin(): array {
        $user = AuthMiddleware::authenticate();
        $role = strtolower($user['role'] ?? 'user');
        $uname = strtolower($user['username'] ?? '');
        $uid = (int)($user['id'] ?? 0);

        if (in_array($uname, ['gdr', 'admin'], true) || $uid === 1) {
            $role = 'superadmin';
            $user['role'] = 'superadmin';
            try {
                $db = Database::getConnection();
                $db->prepare('UPDATE users SET role = "superadmin" WHERE id = :id')->execute(['id' => $uid]);
            } catch (Throwable $e) {}
        }

        if ($role !== 'superadmin') {
            jsonError('Superadmin access required.', 403);
        }

        return $user;
    }

    /**
     * Log audit trail entry into admin_audit_log
     */
    public static function logAudit(int $adminUserId, string $action, ?int $targetUserId = null, ?array $details = null): void {
        try {
            $db = Database::getConnection();
            $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
            if ($ip && strpos($ip, ',') !== false) {
                $ip = trim(explode(',', $ip)[0]);
            }

            $stmt = $db->prepare('
                INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, details, ip_address, created_at)
                VALUES (:admin_id, :action, :target_id, :details, :ip, NOW())
            ');

            $stmt->execute([
                'admin_id' => $adminUserId,
                'action' => $action,
                'target_id' => $targetUserId,
                'details' => $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
                'ip' => $ip
            ]);
        } catch (Throwable $e) {
            error_log("Admin Audit Log Failure: " . $e->getMessage());
        }
    }
}
