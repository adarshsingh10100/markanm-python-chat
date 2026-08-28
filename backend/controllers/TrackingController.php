<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class TrackingController {

    /**
     * Helper to log an event to database
     */
    public static function recordEvent(
        string $eventType,
        ?int $userId = null,
        ?int $inviterId = null,
        ?string $inviteCode = null,
        ?string $landingUrl = null,
        ?string $referrerUrl = null
    ): void {
        try {
            $db = Database::getConnection();
            $ip = $_SERVER['REMOTE_ADDR'] ?? null;
            $ua = mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

            $stmt = $db->prepare('
                INSERT INTO user_tracking_logs (user_id, event_type, inviter_id, invite_code, landing_url, referrer_url, ip_address, user_agent)
                VALUES (:uid, :etype, :inviter_id, :code, :landing, :referrer, :ip, :ua)
            ');
            $stmt->execute([
                'uid' => $userId,
                'etype' => $eventType,
                'inviter_id' => $inviterId,
                'code' => $inviteCode ? mb_substr($inviteCode, 0, 64) : null,
                'landing' => $landingUrl ? mb_substr($landingUrl, 0, 255) : null,
                'referrer' => $referrerUrl ? mb_substr($referrerUrl, 0, 255) : null,
                'ip' => $ip,
                'ua' => $ua
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
        $eventType = sanitizeInput($body['event_type'] ?? 'invite_clicked');
        $inviterId = !empty($body['inviter_id']) ? (int)$body['inviter_id'] : null;
        $inviteCode = sanitizeInput($body['invite_code'] ?? '');
        $landingUrl = sanitizeInput($body['landing_url'] ?? '');
        $referrerUrl = sanitizeInput($body['referrer_url'] ?? '');

        // Try getting logged-in user if token present
        $userId = null;
        try {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            if (!empty($authHeader) || !empty($_SESSION['auth_token'])) {
                $user = AuthMiddleware::authenticate();
                $userId = (int)$user['id'];
            }
        } catch (Throwable $e) {
            // Unauthenticated guest user
        }

        self::recordEvent($eventType, $userId, $inviterId, $inviteCode, $landingUrl, $referrerUrl);

        jsonResponse(['success' => true, 'message' => 'Event tracked successfully']);
    }

    /**
     * GET /api/tracking/stats
     */
    public static function getStats(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        // 1. Inviter info (Who invited current user)
        $inviterInfo = null;
        if (!empty($currentUser['referred_by_user_id'])) {
            $invStmt = $db->prepare('SELECT id, display_name, username, avatar_url FROM users WHERE id = :id LIMIT 1');
            $invStmt->execute(['id' => $currentUser['referred_by_user_id']]);
            $inviter = $invStmt->fetch();
            if ($inviter) {
                $inviterInfo = [
                    'id' => (int)$inviter['id'],
                    'display_name' => $inviter['display_name'],
                    'username' => $inviter['username'],
                    'avatar_url' => $inviter['avatar_url']
                ];
            }
        }

        // 2. Count of users who signed up through current user's invites/referrals
        $refCountStmt = $db->prepare('SELECT COUNT(*) FROM users WHERE referred_by_user_id = :uid');
        $refCountStmt->execute(['uid' => $currentUser['id']]);
        $referralCount = (int)$refCountStmt->fetchColumn();

        // 3. List of users invited by current user
        $referredUsersStmt = $db->prepare('
            SELECT id, display_name, username, avatar_url, signup_source_link, created_at
            FROM users
            WHERE referred_by_user_id = :uid
            ORDER BY created_at DESC
        ');
        $referredUsersStmt->execute(['uid' => $currentUser['id']]);
        $referredUsers = $referredUsersStmt->fetchAll();

        // 4. Email invites sent by current user
        $emailInvitesStmt = $db->prepare('SELECT recipient_email, sent_at FROM email_invites WHERE inviter_id = :uid ORDER BY sent_at DESC');
        $emailInvitesStmt->execute(['uid' => $currentUser['id']]);
        $emailInvites = $emailInvitesStmt->fetchAll();

        // 5. Recent tracking events for this user
        $logsStmt = $db->prepare('
            SELECT event_type, landing_url, referrer_url, created_at
            FROM user_tracking_logs
            WHERE user_id = :uid OR inviter_id = :uid
            ORDER BY created_at DESC
            LIMIT 20
        ');
        $logsStmt->execute(['uid' => $currentUser['id']]);
        $recentLogs = $logsStmt->fetchAll();

        jsonResponse([
            'success' => true,
            'stats' => [
                'signup_source_link' => $currentUser['signup_source_link'],
                'invited_by' => $inviterInfo,
                'referrals_count' => $referralCount,
                'referred_users' => array_map(function($u) {
                    return [
                        'id' => (int)$u['id'],
                        'display_name' => $u['display_name'],
                        'username' => $u['username'],
                        'avatar_url' => $u['avatar_url'],
                        'joined_from_link' => $u['signup_source_link'],
                        'joined_at' => $u['created_at']
                    ];
                }, $referredUsers),
                'email_invites_sent' => $emailInvites,
                'recent_activity_logs' => $recentLogs
            ]
        ]);
    }
}
