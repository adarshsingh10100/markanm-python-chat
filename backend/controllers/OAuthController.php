<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/HashUtils.php';

class OAuthController {

    private static array $scopeDefinitions = [
        'profile.read' => [
            'name' => 'Public Profile Information',
            'description' => 'View your public MarkanM profile information, display name, and bio.'
        ],
        'username.read' => [
            'name' => 'Username & Identity',
            'description' => 'View your unique @username handle.'
        ],
        'avatar.read' => [
            'name' => 'Profile Avatar',
            'description' => 'View your profile avatar picture.'
        ]
    ];

    /**
     * GET /api/oauth/authorize-info?client_id=...&redirect_uri=...&scope=...&state=...
     */
    public static function getAuthorizeInfo(): void {
        $currentUser = AuthMiddleware::authenticate();
        $clientId = trim($_GET['client_id'] ?? '');
        $redirectUri = trim($_GET['redirect_uri'] ?? '');
        $scopeStr = trim($_GET['scope'] ?? 'profile.read username.read avatar.read');
        $state = trim($_GET['state'] ?? '');

        if (empty($clientId)) {
            jsonError('Missing required parameter: client_id', 400);
        }

        $db = Database::getConnection();

        // 1. Verify Application exists and is active/development
        $appStmt = $db->prepare('
            SELECT a.id, a.client_id, a.name, a.description, a.icon_url, a.website_url, a.status,
                   u.display_name AS developer_name, u.username AS developer_username
            FROM developer_apps a
            JOIN users u ON a.developer_id = u.id
            WHERE a.client_id = :cid AND a.status IN ("development", "active")
            LIMIT 1
        ');
        $appStmt->execute(['cid' => $clientId]);
        $app = $appStmt->fetch();

        if (!$app) {
            jsonError('Invalid client_id or application is disabled.', 404);
        }

        // 2. Validate Redirect URI
        $uriStmt = $db->prepare('SELECT redirect_uri FROM oauth_redirect_uris WHERE app_id = :aid');
        $uriStmt->execute(['aid' => $app['id']]);
        $validUris = array_column($uriStmt->fetchAll(), 'redirect_uri');

        $isValidRedirect = false;
        if (!empty($redirectUri)) {
            foreach ($validUris as $registeredUri) {
                if (strcasecmp($registeredUri, $redirectUri) === 0 || strcasecmp(rtrim($registeredUri, '/'), rtrim($redirectUri, '/')) === 0) {
                    $isValidRedirect = true;
                    break;
                }
            }
        } else if (count($validUris) > 0) {
            $redirectUri = $validUris[0];
            $isValidRedirect = true;
        }

        if (!$isValidRedirect && count($validUris) > 0) {
            jsonError('Redirect URI mismatch. The redirect_uri provided does not match registered URIs for this app.', 400);
        }

        // 3. Format requested scopes
        $requestedScopes = array_filter(explode(' ', $scopeStr));
        if (empty($requestedScopes)) {
            $requestedScopes = ['profile.read', 'username.read', 'avatar.read'];
        }

        $scopeMetadata = [];
        foreach ($requestedScopes as $sc) {
            if (isset(self::$scopeDefinitions[$sc])) {
                $scopeMetadata[] = array_merge(['scope' => $sc], self::$scopeDefinitions[$sc]);
            }
        }

        jsonResponse([
            'success' => true,
            'app' => [
                'id' => (int)$app['id'],
                'client_id' => $app['client_id'],
                'name' => decodeOutput($app['name']),
                'description' => decodeOutput($app['description']),
                'icon_url' => $app['icon_url'],
                'website_url' => $app['website_url'],
                'developer_name' => decodeOutput($app['developer_name']),
                'developer_username' => $app['developer_username']
            ],
            'redirect_uri' => $redirectUri,
            'scopes' => $scopeMetadata,
            'state' => $state,
            'user' => [
                'id' => (int)$currentUser['id'],
                'display_name' => decodeOutput($currentUser['display_name']),
                'username' => $currentUser['username'],
                'avatar_url' => $currentUser['avatar_url']
            ]
        ]);
    }

    /**
     * POST /api/oauth/authorize
     * Process User Consent -> Generate Short-lived Auth Code
     */
    public static function processAuthorize(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $clientId = trim($body['client_id'] ?? '');
        $redirectUri = trim($body['redirect_uri'] ?? '');
        $scopeStr = trim($body['scope'] ?? 'profile.read username.read avatar.read');
        $state = trim($body['state'] ?? '');
        $codeChallenge = trim($body['code_challenge'] ?? '');
        $codeChallengeMethod = trim($body['code_challenge_method'] ?? 'S256');

        if (empty($clientId) || empty($redirectUri)) {
            jsonError('Missing required parameters.', 400);
        }

        $db = Database::getConnection();

        $appStmt = $db->prepare('SELECT id FROM developer_apps WHERE client_id = :cid AND status IN ("development", "active") LIMIT 1');
        $appStmt->execute(['cid' => $clientId]);
        $app = $appStmt->fetch();

        if (!$app) {
            jsonError('Invalid client_id or application is disabled.', 404);
        }

        // Generate short-lived auth code (5 min expiration)
        $rawCode = HashUtils::generateAuthCode();
        $codeHash = HashUtils::hashSecret($rawCode);
        $expiresAt = date('Y-m-d H:i:s', time() + 300);

        $db->beginTransaction();

        try {
            $codeStmt = $db->prepare('
                INSERT INTO oauth_authorization_codes (app_id, user_id, code_hash, redirect_uri, scopes, code_challenge, code_challenge_method, expires_at)
                VALUES (:aid, :uid, :chash, :ruri, :sc, :cchallenge, :cmethod, :exp)
            ');
            $codeStmt->execute([
                'aid' => $app['id'],
                'uid' => $currentUser['id'],
                'chash' => $codeHash,
                'ruri' => $redirectUri,
                'sc' => $scopeStr,
                'cchallenge' => $codeChallenge,
                'cmethod' => $codeChallengeMethod,
                'exp' => $expiresAt
            ]);

            // Save user consent record
            $consentStmt = $db->prepare('
                INSERT INTO oauth_consents (app_id, user_id, scopes)
                VALUES (:aid, :uid, :sc)
                ON DUPLICATE KEY UPDATE scopes = :sc, updated_at = NOW()
            ');
            $consentStmt->execute(['aid' => $app['id'], 'uid' => $currentUser['id'], 'sc' => $scopeStr]);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to generate authorization code.', 500);
        }

        // Build callback URL
        $delimiter = (strpos($redirectUri, '?') !== false) ? '&' : '?';
        $callbackUrl = $redirectUri . $delimiter . 'code=' . urlencode($rawCode);
        if (!empty($state)) {
            $callbackUrl .= '&state=' . urlencode($state);
        }

        jsonResponse([
            'success' => true,
            'code' => $rawCode,
            'redirect_url' => $callbackUrl
        ]);
    }

    /**
     * POST /api/oauth/token
     * Token Exchange (grant_type=authorization_code) + PKCE Verification
     */
    public static function exchangeToken(): void {
        $body = getRequestBody();

        $grantType = trim($body['grant_type'] ?? '');
        $clientId = trim($body['client_id'] ?? '');
        $clientSecret = trim($body['client_secret'] ?? '');
        $code = trim($body['code'] ?? '');
        $redirectUri = trim($body['redirect_uri'] ?? '');
        $codeVerifier = trim($body['code_verifier'] ?? '');

        if ($grantType !== 'authorization_code') {
            jsonError('Unsupported grant_type. Must be authorization_code.', 400);
        }

        if (empty($clientId) || empty($code)) {
            jsonError('Missing required parameters: client_id and code', 400);
        }

        $db = Database::getConnection();

        // 1. Verify Application
        $appStmt = $db->prepare('SELECT id, client_secret_hash, status FROM developer_apps WHERE client_id = :cid LIMIT 1');
        $appStmt->execute(['cid' => $clientId]);
        $app = $appStmt->fetch();

        if (!$app || !in_array($app['status'], ['development', 'active'])) {
            jsonError('Invalid client_id or application is disabled.', 401);
        }

        // 2. Validate Client Secret or PKCE Code Verifier
        $secretHash = HashUtils::hashSecret($clientSecret);
        $isSecretValid = hash_equals($app['client_secret_hash'], $secretHash);

        // 3. Verify Authorization Code
        $codeHash = HashUtils::hashSecret($code);
        $codeStmt = $db->prepare('SELECT * FROM oauth_authorization_codes WHERE code_hash = :chash AND app_id = :aid LIMIT 1');
        $codeStmt->execute(['chash' => $codeHash, 'aid' => $app['id']]);
        $authCode = $codeStmt->fetch();

        if (!$authCode) {
            jsonError('Invalid or expired authorization code.', 400);
        }

        if ($authCode['is_used'] == 1) {
            jsonError('Authorization code has already been used.', 400);
        }

        if (strtotime($authCode['expires_at']) < time()) {
            jsonError('Authorization code has expired.', 400);
        }

        // 4. PKCE Verification if code_challenge was supplied
        if (!empty($authCode['code_challenge'])) {
            if (empty($codeVerifier)) {
                jsonError('Missing code_verifier required for PKCE authorization.', 400);
            }
            $calculatedChallenge = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');
            if (!hash_equals($authCode['code_challenge'], $calculatedChallenge)) {
                jsonError('Invalid code_verifier for PKCE challenge.', 400);
            }
        } else if (!$isSecretValid) {
            jsonError('Invalid client_secret.', 401);
        }

        // Mark code as used immediately
        $useStmt = $db->prepare('UPDATE oauth_authorization_codes SET is_used = 1 WHERE id = :id');
        $useStmt->execute(['id' => $authCode['id']]);

        // 5. Generate Access Token (30 days expiration)
        $rawAccessToken = HashUtils::generateAccessToken();
        $tokenHash = HashUtils::hashSecret($rawAccessToken);
        $expiresAt = date('Y-m-d H:i:s', time() + (86400 * 30));

        $tokenStmt = $db->prepare('
            INSERT INTO oauth_access_tokens (app_id, user_id, token_hash, scopes, expires_at)
            VALUES (:aid, :uid, :thash, :sc, :exp)
        ');
        $tokenStmt->execute([
            'aid' => $app['id'],
            'uid' => $authCode['user_id'],
            'thash' => $tokenHash,
            'sc' => $authCode['scopes'],
            'exp' => $expiresAt
        ]);

        jsonResponse([
            'access_token' => $rawAccessToken,
            'token_type' => 'Bearer',
            'expires_in' => 86400 * 30,
            'scope' => $authCode['scopes']
        ]);
    }

    /**
     * GET /api/user/connected-apps
     */
    public static function listConnectedApps(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT c.granted_at, c.scopes, a.id AS app_id, a.name, a.description, a.icon_url, a.website_url,
                   u.display_name AS developer_name
            FROM oauth_consents c
            JOIN developer_apps a ON c.app_id = a.id
            JOIN users u ON a.developer_id = u.id
            WHERE c.user_id = :uid
            ORDER BY c.granted_at DESC
        ');
        $stmt->execute(['uid' => $currentUser['id']]);
        $apps = $stmt->fetchAll();

        jsonResponse([
            'success' => true,
            'connected_apps' => array_map(function($a) {
                return [
                    'app_id' => (int)$a['app_id'],
                    'name' => decodeOutput($a['name']),
                    'description' => decodeOutput($a['description']),
                    'icon_url' => $a['icon_url'],
                    'website_url' => $a['website_url'],
                    'developer_name' => decodeOutput($a['developer_name']),
                    'scopes' => array_filter(explode(' ', $a['scopes'])),
                    'granted_at' => $a['granted_at']
                ];
            }, $apps)
        ]);
    }

    /**
     * POST /api/user/connected-apps/{app_id}/revoke
     */
    public static function revokeAppAccess(int $appId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $db->beginTransaction();

        try {
            // Delete consent
            $delConsent = $db->prepare('DELETE FROM oauth_consents WHERE app_id = :aid AND user_id = :uid');
            $delConsent->execute(['aid' => $appId, 'uid' => $currentUser['id']]);

            // Revoke all access tokens
            $delTokens = $db->prepare('UPDATE oauth_access_tokens SET is_revoked = 1 WHERE app_id = :aid AND user_id = :uid');
            $delTokens->execute(['aid' => $appId, 'uid' => $currentUser['id']]);

            $db->commit();

            jsonResponse(['success' => true, 'message' => 'Application access revoked successfully.']);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to revoke application access.', 500);
        }
    }
}
