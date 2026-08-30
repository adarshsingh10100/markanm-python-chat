<?php
require_once __DIR__ . '/../middleware/AdminMiddleware.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/CryptoHelper.php';
require_once __DIR__ . '/../helpers/GroqProvider.php';
require_once __DIR__ . '/../helpers/SarvamProvider.php';

class AdminController {

    /**
     * GET /admin/api/stats [admin]
     */
    public static function getStats(): void {
        $admin = AdminMiddleware::requireAdmin();
        $db = Database::getConnection();

        // 1. Total Users
        $totalUsers = (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn();

        // 2. Estimated DAU (last 24h) & MAU (last 30d)
        $dau = (int)$db->query('SELECT COUNT(DISTINCT user_id) FROM user_presence WHERE last_seen_at >= NOW() - INTERVAL 24 HOUR')->fetchColumn();
        $mau = (int)$db->query('SELECT COUNT(DISTINCT user_id) FROM user_presence WHERE last_seen_at >= NOW() - INTERVAL 30 DAY')->fetchColumn();

        // 3. Messages sent today
        $msgsToday = 0;
        try {
            $msgsToday = (int)$db->query('SELECT COUNT(*) FROM messages WHERE DATE(created_at) = CURDATE()')->fetchColumn();
        } catch (Throwable $e) {}

        // 4. AI replies today
        $aiRepliesToday = 0;
        try {
            $aiRepliesToday = (int)$db->query('SELECT COUNT(*) FROM messages WHERE sender_type = "ai" AND DATE(created_at) = CURDATE()')->fetchColumn();
        } catch (Throwable $e) {}

        // 5. Early warning signal: Provider fallback rate in last 24h
        $fallbackRate = 0.0;
        $totalAi24h = 0;
        $fallbacks24h = 0;
        try {
            $totalAi24h = (int)$db->query('SELECT COUNT(*) FROM ai_chat_usage_logs WHERE created_at >= NOW() - INTERVAL 24 HOUR')->fetchColumn();
            $fallbacks24h = (int)$db->query('SELECT COUNT(*) FROM ai_chat_usage_logs WHERE created_at >= NOW() - INTERVAL 24 HOUR AND is_fallback = 1')->fetchColumn();
            if ($totalAi24h > 0) {
                $fallbackRate = round(($fallbacks24h / $totalAi24h) * 100, 2);
            }
        } catch (Throwable $e) {}

        jsonResponse([
            'success' => true,
            'stats' => [
                'total_users' => $totalUsers,
                'dau' => max($dau, 1),
                'mau' => max($mau, 1),
                'messages_today' => $msgsToday,
                'ai_replies_today' => $aiRepliesToday,
                'provider_fallback_rate_pct' => $fallbackRate,
                'total_ai_logs_24h' => $totalAi24h,
                'fallbacks_24h' => $fallbacks24h
            ]
        ]);
    }

    /**
     * GET /admin/api/users [admin]
     */
    public static function getUsers(): void {
        $admin = AdminMiddleware::requireAdmin();
        $db = Database::getConnection();

        $search = trim($_GET['search'] ?? $_GET['q'] ?? '');
        $status = strtolower(trim($_GET['status'] ?? ''));
        $role = strtolower(trim($_GET['role'] ?? ''));
        $accountType = strtolower(trim($_GET['type'] ?? $_GET['account_type'] ?? 'all'));
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $where = ['1=1'];
        $params = [];

        if (!empty($search)) {
            $where[] = '(display_name LIKE :q1 OR username LIKE :q2 OR email LIKE :q3 OR last_ip LIKE :q4)';
            $sTerm = '%' . $search . '%';
            $params['q1'] = $sTerm;
            $params['q2'] = $sTerm;
            $params['q3'] = $sTerm;
            $params['q4'] = $sTerm;
        }

        if (in_array($status, ['active', 'suspended', 'banned'], true)) {
            $where[] = 'account_status = :status';
            $params['status'] = $status;
        }

        if (in_array($role, ['user', 'admin', 'superadmin'], true)) {
            $where[] = 'role = :role';
            $params['role'] = $role;
        }

        if ($accountType === 'human') {
            $where[] = '(is_bot = 0 AND is_ai = 0 AND email NOT LIKE "%@ai.markanm.com")';
        } else if ($accountType === 'bot') {
            $where[] = '(is_bot = 1 OR is_ai = 1 OR email LIKE "%@ai.markanm.com")';
        }

        $whereSql = implode(' AND ', $where);

        $sql = "
            SELECT id, display_name, username, email, role, account_status, suspended_until, suspension_reason,
                   avatar_url, is_verified, is_bot, is_ai, last_ip, country_code, country_name, city, created_at
            FROM users
            WHERE {$whereSql}
            ORDER BY id DESC
            LIMIT {$limit} OFFSET {$offset}
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll();

        $countSql = "SELECT COUNT(*) FROM users WHERE {$whereSql}";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        jsonResponse([
            'success' => true,
            'users' => $users,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit)
            ]
        ]);
    }

    /**
     * GET /admin/api/users/{id} [admin]
     */
    public static function getUserDetail(int $id): void {
        $admin = AdminMiddleware::requireAdmin();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT id, display_name, username, email, bio, role, account_status, suspended_until, suspension_reason,
                   avatar_url, is_verified, is_bot, last_ip, country_code, country_name, city, timezone, created_at
            FROM users
            WHERE id = :id LIMIT 1
        ');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonError('User not found', 404);
        }

        // Active sessions count
        $activeSessions = (int)$db->prepare('SELECT COUNT(*) FROM sessions WHERE user_id = :uid AND expires_at > NOW()')
                                   ->execute(['uid' => $id]) ? (int)$db->prepare('SELECT COUNT(*) FROM sessions WHERE user_id = :uid AND expires_at > NOW()')->fetchColumn() : 0;

        // Characters created
        $charCount = (int)$db->prepare('SELECT COUNT(*) FROM ai_characters WHERE created_by = :uid AND status != "disabled"')
                            ->execute(['uid' => $id]) ? (int)$db->prepare('SELECT COUNT(*) FROM ai_characters WHERE created_by = :uid AND status != "disabled"')->fetchColumn() : 0;

        // Recent activity logs
        $activityLogs = [];
        try {
            $actStmt = $db->prepare('SELECT action, ip_address, created_at FROM user_activity_logs WHERE user_id = :uid ORDER BY id DESC LIMIT 15');
            $actStmt->execute(['uid' => $id]);
            $activityLogs = $actStmt->fetchAll();
        } catch (Throwable $e) {}

        jsonResponse([
            'success' => true,
            'user' => array_merge($user, [
                'active_sessions_count' => $activeSessions,
                'characters_created_count' => $charCount,
                'recent_activity' => $activityLogs
            ])
        ]);
    }

    /**
     * POST /admin/api/users/{id}/suspend [admin]
     */
    public static function suspendUser(int $id): void {
        $admin = AdminMiddleware::requireAdmin();
        $db = Database::getConnection();

        $body = getRequestBody();
        $reason = trim($body['reason'] ?? 'Suspended by system administrator.');
        $untilInput = trim($body['until'] ?? '');

        $until = null;
        if (!empty($untilInput)) {
            $until = date('Y-m-d H:i:s', strtotime($untilInput));
        }

        $stmt = $db->prepare('SELECT id, role, display_name FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $target = $stmt->fetch();

        if (!$target) {
            jsonError('Target user not found', 404);
        }

        if ($target['role'] === 'superadmin') {
            jsonError('Superadmin accounts cannot be suspended.', 403);
        }

        $db->prepare('
            UPDATE users SET account_status = "suspended", suspended_until = :until, suspension_reason = :reason WHERE id = :id
        ')->execute(['until' => $until, 'reason' => $reason, 'id' => $id]);

        // Revoke active sessions
        $db->prepare('DELETE FROM sessions WHERE user_id = :uid')->execute(['uid' => $id]);

        AdminMiddleware::logAudit((int)$admin['id'], 'suspend_user', $id, ['reason' => $reason, 'until' => $until]);

        jsonResponse([
            'success' => true,
            'message' => "User '{$target['display_name']}' suspended successfully and active sessions revoked."
        ]);
    }

    /**
     * POST /admin/api/users/{id}/ban [admin]
     */
    public static function banUser(int $id): void {
        $admin = AdminMiddleware::requireAdmin();
        $db = Database::getConnection();

        $body = getRequestBody();
        $reason = trim($body['reason'] ?? 'Banned for terms of service violation.');

        $stmt = $db->prepare('SELECT id, role, display_name FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $target = $stmt->fetch();

        if (!$target) {
            jsonError('Target user not found', 404);
        }

        if ($target['role'] === 'superadmin') {
            jsonError('Superadmin accounts cannot be banned.', 403);
        }

        $db->prepare('
            UPDATE users SET account_status = "banned", suspended_until = NULL, suspension_reason = :reason WHERE id = :id
        ')->execute(['reason' => $reason, 'id' => $id]);

        // Revoke active sessions
        $db->prepare('DELETE FROM sessions WHERE user_id = :uid')->execute(['uid' => $id]);

        AdminMiddleware::logAudit((int)$admin['id'], 'ban_user', $id, ['reason' => $reason]);

        jsonResponse([
            'success' => true,
            'message' => "User '{$target['display_name']}' banned permanently."
        ]);
    }

    /**
     * POST /admin/api/users/{id}/restore [admin]
     */
    public static function restoreUser(int $id): void {
        $admin = AdminMiddleware::requireAdmin();
        $db = Database::getConnection();

        $db->prepare('
            UPDATE users SET account_status = "active", suspended_until = NULL, suspension_reason = NULL WHERE id = :id
        ')->execute(['id' => $id]);

        AdminMiddleware::logAudit((int)$admin['id'], 'restore_user', $id);

        jsonResponse([
            'success' => true,
            'message' => 'User account restored to active status.'
        ]);
    }

    /**
     * POST /admin/api/users/{id}/impersonate [superadmin only]
     */
    public static function impersonateUser(int $id): void {
        $admin = AdminMiddleware::requireSuperAdmin();
        $db = Database::getConnection();

        $body = getRequestBody();
        $adminPassword = $body['admin_password'] ?? '';
        $reason = trim($body['reason'] ?? 'Admin troubleshooting session');

        if (empty($adminPassword)) {
            jsonError('Password re-verification required for impersonation step-up auth.', 401);
        }

        // Verify admin password
        $admStmt = $db->prepare('SELECT password_hash FROM users WHERE id = :uid LIMIT 1');
        $admStmt->execute(['uid' => $admin['id']]);
        $hash = $admStmt->fetchColumn();

        if (!password_verify($adminPassword, $hash)) {
            jsonError('Invalid admin password verification.', 401);
        }

        // Verify target user
        $tgtStmt = $db->prepare('SELECT id, display_name, username, role FROM users WHERE id = :id LIMIT 1');
        $tgtStmt->execute(['id' => $id]);
        $target = $tgtStmt->fetch();

        if (!$target) {
            jsonError('Target user not found', 404);
        }

        if (in_array(strtolower($target['role']), ['admin', 'superadmin'], true)) {
            jsonError('Admins cannot impersonate other admin or superadmin accounts.', 403);
        }

        // Create short-lived 30-min impersonation session for target user
        $impersonationToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + (30 * 60));

        $insStmt = $db->prepare('
            INSERT INTO sessions (user_id, token, is_impersonation, impersonated_by, expires_at)
            VALUES (:uid, :token, 1, :admin_id, :exp)
        ');

        $insStmt->execute([
            'uid' => $target['id'],
            'token' => $impersonationToken,
            'admin_id' => $admin['id'],
            'exp' => $expiresAt
        ]);

        AdminMiddleware::logAudit((int)$admin['id'], 'impersonate_start', (int)$target['id'], ['reason' => $reason]);

        jsonResponse([
            'success' => true,
            'token' => $impersonationToken,
            'message' => "Impersonating {$target['display_name']} (@{$target['username']})",
            'user' => [
                'id' => $target['id'],
                'display_name' => $target['display_name'],
                'username' => $target['username'],
                'is_impersonation' => 1,
                'impersonated_by' => $admin['id']
            ]
        ]);
    }

    /**
     * POST /admin/api/impersonate/end [any authenticated impersonation session]
     */
    public static function endImpersonation(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $token = $user['token'];
        $impersonatedBy = (int)($user['impersonated_by'] ?? 0);

        if (empty($user['is_impersonation']) && $impersonatedBy === 0) {
            jsonError('Current session is not an impersonation session.', 400);
        }

        $db->prepare('DELETE FROM sessions WHERE token = :t')->execute(['t' => $token]);

        if ($impersonatedBy > 0) {
            AdminMiddleware::logAudit($impersonatedBy, 'impersonate_end', (int)$user['id']);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Impersonation ended successfully.'
        ]);
    }

    /**
     * GET /admin/api/logs/activity [admin]
     */
    public static function getActivityLogs(): void {
        $admin = AdminMiddleware::requireAdmin();
        $db = Database::getConnection();

        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 25)));
        $offset = ($page - 1) * $limit;

        $sql = "
            SELECT l.*, u.display_name, u.username
            FROM user_activity_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.id DESC
            LIMIT {$limit} OFFSET {$offset}
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute();
        $logs = $stmt->fetchAll();

        $total = (int)$db->query('SELECT COUNT(*) FROM user_activity_logs')->fetchColumn();

        jsonResponse([
            'success' => true,
            'logs' => $logs,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit)
            ]
        ]);
    }

    /**
     * GET /admin/api/logs/security [admin]
     */
    public static function getSecurityLogs(): void {
        $admin = AdminMiddleware::requireAdmin();
        $db = Database::getConnection();

        // 1. Last 50 admin_audit_log entries
        $auditLogs = [];
        try {
            $stmt = $db->query('
                SELECT a.*, u.display_name AS admin_name, u.username AS admin_username, t.display_name AS target_name
                FROM admin_audit_log a
                LEFT JOIN users u ON a.admin_user_id = u.id
                LEFT JOIN users t ON a.target_user_id = t.id
                ORDER BY a.id DESC LIMIT 50
            ');
            $auditLogs = $stmt->fetchAll();
        } catch (Throwable $e) {}

        // 2. Active impersonations right now
        $activeImpersonations = [];
        try {
            $stmt = $db->query('
                SELECT s.token, s.created_at, s.expires_at, u.display_name AS target_name, a.display_name AS admin_name
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                JOIN users a ON s.impersonated_by = a.id
                WHERE s.is_impersonation = 1 AND s.expires_at > NOW()
            ');
            $activeImpersonations = $stmt->fetchAll();
        } catch (Throwable $e) {}

        jsonResponse([
            'success' => true,
            'audit_logs' => $auditLogs,
            'active_impersonations' => $activeImpersonations
        ]);
    }

    /**
     * GET /admin/api/database/tables [superadmin only]
     */
    public static function getDatabaseTables(): void {
        $admin = AdminMiddleware::requireSuperAdmin();

        $allowlist = [
            'users',
            'ai_characters',
            'conversations',
            'messages',
            'experiences',
            'user_presence',
            'user_activity_logs',
            'app_settings',
            'admin_audit_log'
        ];

        jsonResponse([
            'success' => true,
            'tables' => $allowlist
        ]);
    }

    /**
     * GET /admin/api/database/tables/{table} [superadmin only]
     */
    public static function getDatabaseTableRows(string $table): void {
        $admin = AdminMiddleware::requireSuperAdmin();
        $db = Database::getConnection();

        $allowlist = [
            'users',
            'ai_characters',
            'conversations',
            'messages',
            'experiences',
            'user_presence',
            'user_activity_logs',
            'app_settings',
            'admin_audit_log'
        ];

        if (!in_array($table, $allowlist, true)) {
            jsonError('Table access not permitted.', 403);
        }

        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(50, max(1, (int)($_GET['limit'] ?? 15)));
        $offset = ($page - 1) * $limit;

        $stmt = $db->prepare("SELECT * FROM {$table} ORDER BY 1 DESC LIMIT {$limit} OFFSET {$offset}");
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $total = (int)$db->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();

        // BLANKET SERVER-SIDE REDACTION PASS
        // Match regex: /token|password|secret|api_key|otp|hash/i
        foreach ($rows as &$row) {
            foreach ($row as $colName => $colVal) {
                if ($colVal !== null && preg_match('/token|password|secret|api_key|otp|hash/i', $colName)) {
                    $row[$colName] = '***REDACTED***';
                }
            }
        }

        AdminMiddleware::logAudit((int)$admin['id'], 'browse_database_table', null, ['table' => $table, 'page' => $page]);

        jsonResponse([
            'success' => true,
            'table' => $table,
            'rows' => $rows,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit)
            ]
        ]);
    }

    /**
     * PUT /admin/api/settings/ai-keys [superadmin only]
     */
    public static function rotateAiKey(): void {
        $admin = AdminMiddleware::requireSuperAdmin();
        $db = Database::getConnection();

        $body = getRequestBody();
        $provider = strtolower(trim($body['provider'] ?? ''));
        $apiKey = trim($body['api_key'] ?? '');

        if (!in_array($provider, ['groq', 'sarvam'], true)) {
            jsonError('Invalid provider. Allowed values: groq, sarvam.', 400);
        }

        if (empty($apiKey)) {
            jsonError('API key cannot be empty.', 400);
        }

        // Test-call provider verification
        $testMessages = [['role' => 'user', 'content' => 'hi']];
        $testOptions = ['api_key_override' => $apiKey, 'max_tokens' => 5];

        try {
            if ($provider === 'groq') {
                $groq = new GroqProvider();
                $groq->generateResponse($testMessages, $testOptions);
            } else {
                $sarvam = new SarvamProvider();
                $sarvam->generateResponse($testMessages, $testOptions);
            }
        } catch (Throwable $t) {
            jsonError("API key verification test failed: " . $t->getMessage(), 400);
        }

        // Encrypt & Upsert into app_settings
        $settingKey = $provider === 'groq' ? 'platform_groq_key' : 'platform_sarvam_key';
        $encrypted = CryptoHelper::encrypt($apiKey);

        $stmt = $db->prepare('
            INSERT INTO app_settings (`key`, value_encrypted, updated_by, updated_at)
            VALUES (:k, :v, :uid, NOW())
            ON DUPLICATE KEY UPDATE value_encrypted = :v2, updated_by = :uid2, updated_at = NOW()
        ');

        $stmt->execute([
            'k' => $settingKey,
            'v' => $encrypted,
            'uid' => $admin['id'],
            'v2' => $encrypted,
            'uid2' => $admin['id']
        ]);

        AdminMiddleware::logAudit((int)$admin['id'], 'rotate_platform_api_key', null, ['provider' => $provider]);

        jsonResponse([
            'success' => true,
            'message' => "Platform " . ucfirst($provider) . " API key verified and updated securely!"
        ]);
    }

    /**
     * POST /admin/api/characters/{id}/disable and /enable [admin]
     */
    public static function toggleCharacterStatus(int $id, string $status): void {
        $admin = AdminMiddleware::requireAdmin();
        $db = Database::getConnection();

        $status = strtolower($status) === 'enable' ? 'active' : 'disabled';

        $db->prepare('UPDATE ai_characters SET status = :status WHERE id = :id')->execute(['status' => $status, 'id' => $id]);

        AdminMiddleware::logAudit((int)$admin['id'], "{$status}_character", null, ['character_id' => $id]);

        jsonResponse([
            'success' => true,
            'message' => "Character status set to '{$status}'."
        ]);
    }
}
