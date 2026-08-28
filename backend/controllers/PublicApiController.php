<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/HashUtils.php';

class PublicApiController {

    /**
     * Authenticate OAuth Bearer Access Token & Enforce Rate Limits
     */
    private static function authenticateOAuthToken(string $requiredScope = ''): array {
        // Set CORS & JSON Content Type Headers for all Public API calls
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        $rawToken = null;

        // 1. Check all header variations
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '')));

        if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $rawToken = trim($matches[1]);
        }

        // 2. Fallback to GET/POST query parameter
        if (empty($rawToken)) {
            $rawToken = trim($_GET['access_token'] ?? ($_POST['access_token'] ?? ''));
        }

        if (empty($rawToken)) {
            self::jsonApiError(
                'missing_token',
                'Missing or malformed Authorization header. Pass "Authorization: Bearer mkm_tok_..." or "?access_token=mkm_tok_..."',
                401
            );
        }

        // 3. Provide intelligent error hints if user passed wrong token type
        if (strpos($rawToken, 'mkm_sec_') === 0) {
            self::jsonApiError(
                'invalid_token_type',
                'You provided a Client Secret ("mkm_sec_..."). Client Secrets are used to authenticate your backend server during token exchange at /api/oauth/token. To call /api/v1/me, use an Access Token ("mkm_tok_...").',
                401
            );
        }

        if (strpos($rawToken, 'mkm_code_') === 0) {
            self::jsonApiError(
                'invalid_token_type',
                'You provided an Authorization Code ("mkm_code_..."). Authorization codes are single-use codes that must first be exchanged for an Access Token by making a POST request to /api/oauth/token.',
                401
            );
        }

        $tokenHash = HashUtils::hashSecret($rawToken);

        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT t.id, t.app_id, t.user_id, t.scopes, t.expires_at, t.is_revoked,
                   a.status AS app_status, a.name AS app_name
            FROM oauth_access_tokens t
            JOIN developer_apps a ON t.app_id = a.id
            WHERE t.token_hash = :thash
            LIMIT 1
        ');
        $stmt->execute(['thash' => $tokenHash]);
        $token = $stmt->fetch();

        if (!$token || $token['is_revoked'] == 1) {
            self::jsonApiError(
                'invalid_token',
                'The access token provided is invalid or has been revoked. Perform token exchange at /api/oauth/token to get a valid mkm_tok_... token.',
                401
            );
        }

        if (strtotime($token['expires_at']) < time()) {
            self::jsonApiError(
                'token_expired',
                'The access token provided has expired. Please perform token exchange to obtain a new token.',
                401
            );
        }

        if ($token['app_status'] === 'disabled' || $token['app_status'] === 'revoked') {
            self::jsonApiError(
                'app_disabled',
                'The developer application associated with this token is currently disabled.',
                403
            );
        }

        // Scope check
        if (!empty($requiredScope)) {
            $grantedScopes = array_filter(explode(' ', $token['scopes']));
            if (!in_array($requiredScope, $grantedScopes)) {
                self::jsonApiError(
                    'insufficient_scope',
                    "The access token provided does not grant the required scope: {$requiredScope}",
                    403
                );
            }
        }

        // Enforce Per-App Rate Limit (60 requests/minute)
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $endpoint = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        $rateStmt = $db->prepare('
            SELECT COUNT(*)
            FROM api_usage_logs
            WHERE app_id = :aid AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
        ');
        $rateStmt->execute(['aid' => $token['app_id']]);
        $reqCount = (int)$rateStmt->fetchColumn();

        // Record usage log
        $logStmt = $db->prepare('
            INSERT INTO api_usage_logs (app_id, endpoint, status_code, ip_address)
            VALUES (:aid, :ep, :sc, :ip)
        ');
        $logStmt->execute([
            'aid' => $token['app_id'],
            'ep' => substr($endpoint, 0, 120),
            'sc' => ($reqCount >= 60) ? 429 : 200,
            'ip' => $clientIp
        ]);

        if ($reqCount >= 60) {
            self::jsonApiError(
                'rate_limit_exceeded',
                'API rate limit exceeded. Maximum 60 requests per minute allowed per client application.',
                429
            );
        }

        return $token;
    }

    /**
     * Standard Public API Error Response Format
     */
    private static function jsonApiError(string $code, string $message, int $statusCode = 400): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        echo json_encode([
            'error' => [
                'code' => $code,
                'message' => $message
            ]
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit();
    }

    /**
     * GET /api/v1/me
     */
    public static function getMe(): void {
        $token = self::authenticateOAuthToken();
        $db = Database::getConnection();

        $userStmt = $db->prepare('SELECT id, display_name, username, email, avatar_url, banner_url, bio, is_verified, created_at FROM users WHERE id = :uid LIMIT 1');
        $userStmt->execute(['uid' => $token['user_id']]);
        $user = $userStmt->fetch();

        if (!$user) {
            self::jsonApiError('user_not_found', 'User identity associated with token was not found.', 404);
        }

        $grantedScopes = array_filter(explode(' ', $token['scopes']));
        $response = ['id' => (int)$user['id']];

        if (in_array('username.read', $grantedScopes)) {
            $response['username'] = $user['username'];
        }

        if (in_array('profile.read', $grantedScopes)) {
            $response['display_name'] = decodeOutput($user['display_name']);
            $response['bio'] = decodeOutput($user['bio']);
            $response['is_verified'] = (bool)$user['is_verified'];
            $response['created_at'] = $user['created_at'];
        }

        if (in_array('avatar.read', $grantedScopes)) {
            $response['avatar_url'] = $user['avatar_url'];
            $response['banner_url'] = $user['banner_url'];
        }

        jsonResponse($response);
    }

    /**
     * GET /api/v1/users/{username}
     */
    public static function getUserByUsername(string $username): void {
        $token = self::authenticateOAuthToken('profile.read');
        $cleanUsername = strtolower(trim(ltrim($username, '@')));

        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT u.id, u.display_name, u.username, u.avatar_url, u.banner_url, u.bio, u.is_verified, u.created_at
            FROM users u
            WHERE u.username = :uname
            LIMIT 1
        ');
        $stmt->execute(['uname' => $cleanUsername]);
        $user = $userStmt->fetch();

        if (!$user) {
            self::jsonApiError('user_not_found', 'Requested user profile not found.', 404);
        }

        jsonResponse([
            'id' => (int)$user['id'],
            'display_name' => decodeOutput($user['display_name']),
            'username' => $user['username'],
            'avatar_url' => $user['avatar_url'],
            'banner_url' => $user['banner_url'],
            'bio' => decodeOutput($user['bio']),
            'is_verified' => (bool)$user['is_verified'],
            'created_at' => $user['created_at']
        ]);
    }
}
