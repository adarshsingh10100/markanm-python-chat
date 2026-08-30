<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class TrackingController {

    /**
     * Get the real IP address of the request (handles Cloudflare / reverse proxy)
     */
    public static function getRealIp(): string {
        $headers = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_REAL_IP',
            'HTTP_X_FORWARDED_FOR',
            'REMOTE_ADDR'
        ];
        foreach ($headers as $header) {
            $val = $_SERVER[$header] ?? '';
            if (!empty($val)) {
                $ip = trim(explode(',', $val)[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * Fetch geo info for an IP from ip-api.com (free, no key, 45 req/min)
     * Returns array: country_code, country_name, city, timezone
     */
    public static function geoLookup(string $ip): array {
        $default = ['country_code' => null, 'country_name' => null, 'city' => null, 'timezone' => 'Asia/Kolkata'];

        // Skip private / loopback IPs
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return array_merge($default, ['country_code' => 'IN', 'country_name' => 'India', 'city' => 'Local']);
        }

        try {
            $url = "http://ip-api.com/json/{$ip}?fields=status,country,countryCode,city,timezone";
            $ctx = stream_context_create(['http' => ['timeout' => 3, 'ignore_errors' => true]]);
            $raw = @file_get_contents($url, false, $ctx);
            if ($raw) {
                $data = json_decode($raw, true);
                if ($data && ($data['status'] ?? '') === 'success') {
                    return [
                        'country_code' => $data['countryCode'] ?? null,
                        'country_name' => $data['country'] ?? null,
                        'city'         => $data['city'] ?? null,
                        'timezone'     => $data['timezone'] ?? 'Asia/Kolkata',
                    ];
                }
            }
        } catch (Throwable $e) {
            error_log("Geo lookup error: " . $e->getMessage());
        }

        return $default;
    }

    /**
     * Log a user action to user_activity_logs and refresh user geo/IP info
     * Throttled: re-geolocates only if IP changed or >1hr since last geo update
     */
    public static function logActivity(string $action, ?int $userId = null, array $metadata = []): void {
        try {
            $db = Database::getConnection();
            $ip = self::getRealIp();
            $ua = mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
            $geo = ['country_code' => null, 'country_name' => null, 'city' => null, 'timezone' => 'Asia/Kolkata'];

            if ($userId) {
                $geoStmt = $db->prepare('SELECT last_ip, country_code, country_name, city, timezone, last_geo_updated_at FROM users WHERE id = :uid LIMIT 1');
                $geoStmt->execute(['uid' => $userId]);
                $userRow = $geoStmt->fetch();

                if ($userRow) {
                    $geo = [
                        'country_code' => $userRow['country_code'],
                        'country_name' => $userRow['country_name'],
                        'city'         => $userRow['city'],
                        'timezone'     => $userRow['timezone'] ?: 'Asia/Kolkata',
                    ];

                    $needsGeoUpdate = ($userRow['last_ip'] !== $ip)
                        || empty($userRow['last_geo_updated_at'])
                        || (strtotime($userRow['last_geo_updated_at']) < time() - 3600);

                    if ($needsGeoUpdate) {
                        $geo = self::geoLookup($ip);
                        $updStmt = $db->prepare('
                            UPDATE users SET last_ip = :ip, country_code = :cc, country_name = :cn,
                                city = :city, timezone = :tz, last_seen_at = NOW(), last_geo_updated_at = NOW()
                            WHERE id = :uid
                        ');
                        $updStmt->execute(['ip' => $ip, 'cc' => $geo['country_code'], 'cn' => $geo['country_name'],
                            'city' => $geo['city'], 'tz' => $geo['timezone'], 'uid' => $userId]);
                    } else {
                        $db->prepare('UPDATE users SET last_seen_at = NOW() WHERE id = :uid')->execute(['uid' => $userId]);
                    }
                }
            } else {
                $geo = self::geoLookup($ip);
            }

            $metaJson = !empty($metadata) ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null;
            $stmt = $db->prepare('
                INSERT INTO user_activity_logs (user_id, action, ip_address, country_code, country_name, city, timezone, user_agent, metadata)
                VALUES (:uid, :action, :ip, :cc, :cn, :city, :tz, :ua, :meta)
            ');
            $stmt->execute([
                'uid' => $userId, 'action' => mb_substr($action, 0, 80), 'ip' => $ip,
                'cc' => $geo['country_code'], 'cn' => $geo['country_name'], 'city' => $geo['city'],
                'tz' => $geo['timezone'], 'ua' => $ua, 'meta' => $metaJson,
            ]);
        } catch (Throwable $e) {
            error_log("Activity log error [{$action}]: " . $e->getMessage());
        }
    }

    /**
     * Helper to log an event to legacy user_tracking_logs table (backwards compat)
     */
    public static function recordEvent(
        string $eventType, ?int $userId = null, ?int $inviterId = null,
        ?string $inviteCode = null, ?string $landingUrl = null, ?string $referrerUrl = null
    ): void {
        try {
            $db = Database::getConnection();
            $ip = self::getRealIp();
            $ua = mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
            $stmt = $db->prepare('
                INSERT INTO user_tracking_logs (user_id, event_type, inviter_id, invite_code, landing_url, referrer_url, ip_address, user_agent)
                VALUES (:uid, :etype, :inviter_id, :code, :landing, :referrer, :ip, :ua)
            ');
            $stmt->execute([
                'uid' => $userId, 'etype' => $eventType, 'inviter_id' => $inviterId,
                'code' => $inviteCode ? mb_substr($inviteCode, 0, 64) : null,
                'landing' => $landingUrl ? mb_substr($landingUrl, 0, 255) : null,
                'referrer' => $referrerUrl ? mb_substr($referrerUrl, 0, 255) : null,
                'ip' => $ip, 'ua' => $ua,
            ]);
        } catch (Throwable $e) {
            error_log("Tracking record error: " . $e->getMessage());
        }
    }

    /**
     * POST /api/tracking/log
     */
    public static function logEvent(): void {
        $body = getRequestBody();
        $eventType   = sanitizeInput($body['event_type'] ?? 'invite_clicked');
        $inviterId   = !empty($body['inviter_id']) ? (int)$body['inviter_id'] : null;
        $inviteCode  = sanitizeInput($body['invite_code'] ?? '');
        $landingUrl  = sanitizeInput($body['landing_url'] ?? '');
        $referrerUrl = sanitizeInput($body['referrer_url'] ?? '');

        $userId = null;
        try {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            if (!empty($authHeader) || !empty($_SESSION['auth_token'])) {
                $user = AuthMiddleware::authenticate();
                $userId = (int)$user['id'];
            }
        } catch (Throwable $e) {}

        self::recordEvent($eventType, $userId, $inviterId, $inviteCode, $landingUrl, $referrerUrl);
        self::logActivity($eventType, $userId);
        jsonResponse(['success' => true, 'message' => 'Event tracked successfully']);
    }

    /**
     * GET /api/tracking/stats
     */
    public static function getStats(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $inviterInfo = null;
        if (!empty($currentUser['referred_by_user_id'])) {
            $invStmt = $db->prepare('SELECT id, display_name, username, avatar_url FROM users WHERE id = :id LIMIT 1');
            $invStmt->execute(['id' => $currentUser['referred_by_user_id']]);
            $inviter = $invStmt->fetch();
            if ($inviter) {
                $inviterInfo = ['id' => (int)$inviter['id'], 'display_name' => $inviter['display_name'],
                    'username' => $inviter['username'], 'avatar_url' => $inviter['avatar_url']];
            }
        }

        $refCountStmt = $db->prepare('SELECT COUNT(*) FROM users WHERE referred_by_user_id = :uid');
        $refCountStmt->execute(['uid' => $currentUser['id']]);
        $referralCount = (int)$refCountStmt->fetchColumn();

        $referredUsersStmt = $db->prepare('SELECT id, display_name, username, avatar_url, created_at FROM users WHERE referred_by_user_id = :uid ORDER BY created_at DESC LIMIT 20');
        $referredUsersStmt->execute(['uid' => $currentUser['id']]);
        $referredUsers = $referredUsersStmt->fetchAll();

        $actStmt = $db->prepare('SELECT action, ip_address, country_code, country_name, city, timezone, created_at FROM user_activity_logs WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20');
        $actStmt->execute(['uid' => $currentUser['id']]);
        $activityLog = $actStmt->fetchAll();

        jsonResponse([
            'success'        => true,
            'inviter'        => $inviterInfo,
            'referral_count' => $referralCount,
            'referred_users' => array_map(fn($u) => ['id' => (int)$u['id'], 'display_name' => $u['display_name'],
                'username' => $u['username'], 'avatar_url' => $u['avatar_url'], 'joined_at' => $u['created_at']], $referredUsers),
            'activity_log'   => array_map(fn($a) => [
                'action' => $a['action'], 'ip_address' => $a['ip_address'],
                'country_code' => $a['country_code'], 'country_name' => $a['country_name'],
                'city' => $a['city'], 'timezone' => $a['timezone'], 'created_at' => $a['created_at'],
            ], $activityLog),
        ]);
    }

    /**
     * GET /api/admin/activity-logs  (admin only)
     */
    public static function getActivityLogs(): void {
        $currentUser = AuthMiddleware::authenticate();
        if (($currentUser['role'] ?? '') !== 'admin') {
            jsonError('Access denied.', 403);
        }

        $db     = Database::getConnection();
        $limit  = min((int)($_GET['limit'] ?? 50), 200);
        $offset = (int)($_GET['offset'] ?? 0);
        $action = sanitizeInput($_GET['action'] ?? '');
        $userId = !empty($_GET['user_id']) ? (int)$_GET['user_id'] : null;
        $ip     = sanitizeInput($_GET['ip'] ?? '');
        $cc     = sanitizeInput($_GET['country'] ?? '');

        $where  = 'WHERE 1=1';
        $params = [];

        if ($action) { $where .= ' AND l.action = :action'; $params['action'] = $action; }
        if ($userId) { $where .= ' AND l.user_id = :uid';   $params['uid']    = $userId; }
        if ($ip)     { $where .= ' AND l.ip_address LIKE :ip'; $params['ip']  = $ip . '%'; }
        if ($cc)     { $where .= ' AND l.country_code = :cc';  $params['cc']  = strtoupper($cc); }

        $stmt = $db->prepare("SELECT l.*, u.display_name, u.username, u.avatar_url FROM user_activity_logs l LEFT JOIN users u ON l.user_id = u.id {$where} ORDER BY l.created_at DESC LIMIT :lim OFFSET :off");
        foreach ($params as $k => $v) { $stmt->bindValue($k, $v); }
        $stmt->bindValue('lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue('off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $logs = $stmt->fetchAll();

        $totStmt = $db->prepare("SELECT COUNT(*) FROM user_activity_logs l {$where}");
        $totStmt->execute($params);
        $total = (int)$totStmt->fetchColumn();

        jsonResponse([
            'success' => true,
            'total'   => $total,
            'logs'    => array_map(fn($l) => [
                'id'           => (int)$l['id'],
                'user_id'      => $l['user_id'] ? (int)$l['user_id'] : null,
                'display_name' => $l['display_name'] ?? 'Guest',
                'username'     => $l['username'] ?? null,
                'avatar_url'   => $l['avatar_url'] ?? null,
                'action'       => $l['action'],
                'ip_address'   => $l['ip_address'],
                'country_code' => $l['country_code'],
                'country_name' => $l['country_name'],
                'city'         => $l['city'],
                'timezone'     => $l['timezone'],
                'metadata'     => $l['metadata'] ? json_decode($l['metadata'], true) : null,
                'created_at'   => $l['created_at'],
            ], $logs),
        ]);
    }
}
