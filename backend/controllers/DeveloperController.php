<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/HashUtils.php';

class DeveloperController {

    /**
     * POST /api/developer/toggle-status
     * Enable or Disable Developer Status
     */
    public static function toggleStatus(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $body = getRequestBody();
        $enable = !empty($body['enabled']);
        $company = sanitizeInput($body['company_name'] ?? '');
        $website = sanitizeInput($body['website_url'] ?? '');

        if (!$enable) {
            // Check if user has active developer applications
            $appCheck = $db->prepare('SELECT COUNT(*) FROM developer_apps WHERE developer_id = :uid');
            $appCheck->execute(['uid' => $currentUser['id']]);
            $appCount = (int)$appCheck->fetchColumn();

            if ($appCount > 0) {
                jsonError("Cannot disable Developer Mode while you have {$appCount} active application(s). Delete your applications first.", 400);
            }

            $stmt = $db->prepare('UPDATE developer_profiles SET status = "suspended" WHERE user_id = :uid');
            $stmt->execute(['uid' => $currentUser['id']]);

            jsonResponse(['success' => true, 'is_developer' => false, 'message' => 'Developer Mode disabled.']);
        } else {
            $stmt = $db->prepare('
                INSERT INTO developer_profiles (user_id, status, company_name, website_url)
                VALUES (:uid, "active", :comp, :web)
                ON DUPLICATE KEY UPDATE status = "active", company_name = COALESCE(NULLIF(:comp, ""), company_name), website_url = COALESCE(NULLIF(:web, ""), website_url)
            ');
            $stmt->execute([
                'uid' => $currentUser['id'],
                'comp' => $company,
                'web' => $website
            ]);

            jsonResponse(['success' => true, 'is_developer' => true, 'message' => 'Developer Mode enabled!']);
        }
    }

    /**
     * POST /api/developer/activate
     */
    public static function activateDeveloper(): void {
        self::toggleStatus();
    }

    /**
     * GET /api/developer/apps
     */
    public static function listApps(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        // Fetch developer status
        $devStmt = $db->prepare('SELECT * FROM developer_profiles WHERE user_id = :uid LIMIT 1');
        $devStmt->execute(['uid' => $currentUser['id']]);
        $devProfile = $devStmt->fetch();

        $isDeveloper = ($devProfile && $devProfile['status'] === 'active');

        $appsStmt = $db->prepare('
            SELECT a.*,
                   (SELECT COUNT(*) FROM oauth_consents c WHERE c.app_id = a.id) AS total_users,
                   (SELECT COUNT(*) FROM api_usage_logs u WHERE u.app_id = a.id AND u.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS requests_today
            FROM developer_apps a
            WHERE a.developer_id = :uid
            ORDER BY a.created_at DESC
        ');
        $appsStmt->execute(['uid' => $currentUser['id']]);
        $apps = $appsStmt->fetchAll();

        jsonResponse([
            'success' => true,
            'is_developer' => $isDeveloper,
            'developer_profile' => $devProfile ? [
                'status' => $devProfile['status'],
                'company_name' => decodeOutput($devProfile['company_name']),
                'website_url' => $devProfile['website_url'],
                'created_at' => $devProfile['created_at']
            ] : null,
            'apps' => array_map(function($a) {
                return [
                    'id' => (int)$a['id'],
                    'client_id' => $a['client_id'],
                    'name' => decodeOutput($a['name']),
                    'description' => decodeOutput($a['description']),
                    'icon_url' => $a['icon_url'],
                    'website_url' => $a['website_url'],
                    'contact_email' => $a['contact_email'],
                    'category' => $a['category'],
                    'status' => $a['status'],
                    'total_users' => (int)$a['total_users'],
                    'requests_today' => (int)$a['requests_today'],
                    'created_at' => $a['created_at']
                ];
            }, $apps)
        ]);
    }

    /**
     * POST /api/developer/apps
     */
    public static function createApp(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $body = getRequestBody();
        $name = sanitizeInput($body['name'] ?? '');
        $description = sanitizeInput($body['description'] ?? '');
        $iconUrl = sanitizeInput($body['icon_url'] ?? '');
        $websiteUrl = sanitizeInput($body['website_url'] ?? '');
        $contactEmail = strtolower(trim($body['contact_email'] ?? $currentUser['email']));
        $category = sanitizeInput($body['category'] ?? 'Utility');
        $redirectUris = is_array($body['redirect_uris'] ?? null) ? $body['redirect_uris'] : [];

        if (empty($name)) {
            jsonError('Application name is required.', 422);
        }

        if (empty($websiteUrl) || !filter_var($websiteUrl, FILTER_VALIDATE_URL)) {
            jsonError('Valid website URL is required.', 422);
        }

        $clientId = HashUtils::generateClientId();
        $rawClientSecret = HashUtils::generateClientSecret();
        $secretHash = HashUtils::hashSecret($rawClientSecret);

        $db->beginTransaction();

        try {
            // Auto-activate developer profile if not present or inactive
            $devStmt = $db->prepare('
                INSERT INTO developer_profiles (user_id, status)
                VALUES (:uid, "active")
                ON DUPLICATE KEY UPDATE status = "active"
            ');
            $devStmt->execute(['uid' => $currentUser['id']]);

            $appStmt = $db->prepare('
                INSERT INTO developer_apps (developer_id, client_id, client_secret_hash, name, description, icon_url, website_url, contact_email, category, status)
                VALUES (:did, :cid, :shash, :name, :desc, :icon, :web, :email, :cat, "development")
            ');
            $appStmt->execute([
                'did' => $currentUser['id'],
                'cid' => $clientId,
                'shash' => $secretHash,
                'name' => $name,
                'desc' => $description,
                'icon' => $iconUrl,
                'web' => $websiteUrl,
                'email' => $contactEmail,
                'cat' => $category
            ]);
            $appId = (int)$db->lastInsertId();

            // Insert redirect URIs
            $uriStmt = $db->prepare('INSERT INTO oauth_redirect_uris (app_id, redirect_uri) VALUES (:appid, :uri)');
            if (empty($redirectUris)) {
                $redirectUris = [$websiteUrl];
            }
            foreach ($redirectUris as $uri) {
                $cleanUri = trim($uri);
                if (!empty($cleanUri)) {
                    $uriStmt->execute(['appid' => $appId, 'uri' => $cleanUri]);
                }
            }

            $db->commit();

            jsonResponse([
                'success' => true,
                'message' => 'Application created successfully!',
                'app' => [
                    'id' => $appId,
                    'client_id' => $clientId,
                    'client_secret' => $rawClientSecret, // Returned ONCE upon creation
                    'name' => decodeOutput($name),
                    'website_url' => $websiteUrl,
                    'status' => 'development'
                ]
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to create application: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/developer/apps/{id}
     */
    public static function getAppDetails(int $appId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM developer_apps WHERE id = :id AND developer_id = :did LIMIT 1');
        $stmt->execute(['id' => $appId, 'did' => $currentUser['id']]);
        $app = $stmt->fetch();

        if (!$app) {
            jsonError('Application not found or unauthorized.', 404);
        }

        // Fetch Redirect URIs
        $uriStmt = $db->prepare('SELECT id, redirect_uri FROM oauth_redirect_uris WHERE app_id = :aid');
        $uriStmt->execute(['aid' => $appId]);
        $redirectUris = $uriStmt->fetchAll();

        // Fetch Webhooks
        $whStmt = $db->prepare('SELECT * FROM developer_webhooks WHERE app_id = :aid LIMIT 1');
        $whStmt->execute(['aid' => $appId]);
        $webhook = $whStmt->fetch();

        jsonResponse([
            'success' => true,
            'app' => [
                'id' => (int)$app['id'],
                'client_id' => $app['client_id'],
                'name' => decodeOutput($app['name']),
                'description' => decodeOutput($app['description']),
                'icon_url' => $app['icon_url'],
                'website_url' => $app['website_url'],
                'contact_email' => $app['contact_email'],
                'category' => $app['category'],
                'status' => $app['status'],
                'redirect_uris' => array_column($redirectUris, 'redirect_uri'),
                'webhook' => $webhook ? [
                    'id' => (int)$webhook['id'],
                    'url' => $webhook['url'],
                    'secret' => $webhook['secret'],
                    'events' => json_decode($webhook['events'], true) ?: [],
                    'status' => $webhook['status']
                ] : null,
                'created_at' => $app['created_at']
            ]
        ]);
    }

    /**
     * PATCH /api/developer/apps/{id}
     */
    public static function updateApp(int $appId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM developer_apps WHERE id = :id AND developer_id = :did LIMIT 1');
        $stmt->execute(['id' => $appId, 'did' => $currentUser['id']]);
        if (!$stmt->fetch()) {
            jsonError('Application not found or unauthorized.', 404);
        }

        $body = getRequestBody();
        $name = sanitizeInput($body['name'] ?? '');
        $description = sanitizeInput($body['description'] ?? '');
        $iconUrl = sanitizeInput($body['icon_url'] ?? '');
        $websiteUrl = sanitizeInput($body['website_url'] ?? '');
        $contactEmail = strtolower(trim($body['contact_email'] ?? ''));
        $category = sanitizeInput($body['category'] ?? 'Utility');
        $redirectUris = is_array($body['redirect_uris'] ?? null) ? $body['redirect_uris'] : [];

        if (empty($name)) {
            jsonError('Application name cannot be empty.', 422);
        }

        $db->beginTransaction();

        try {
            $upd = $db->prepare('
                UPDATE developer_apps
                SET name = :name, description = :desc, icon_url = :icon, website_url = :web, contact_email = :email, category = :cat
                WHERE id = :id
            ');
            $upd->execute([
                'name' => $name,
                'desc' => $description,
                'icon' => $iconUrl,
                'web' => $websiteUrl,
                'email' => $contactEmail,
                'cat' => $category,
                'id' => $appId
            ]);

            // Replace redirect URIs
            $delUris = $db->prepare('DELETE FROM oauth_redirect_uris WHERE app_id = :aid');
            $delUris->execute(['aid' => $appId]);

            $insUri = $db->prepare('INSERT INTO oauth_redirect_uris (app_id, redirect_uri) VALUES (:aid, :uri)');
            foreach ($redirectUris as $uri) {
                $cleanUri = trim($uri);
                if (!empty($cleanUri)) {
                    $insUri->execute(['aid' => $appId, 'uri' => $cleanUri]);
                }
            }

            $db->commit();

            jsonResponse(['success' => true, 'message' => 'Application updated successfully!']);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to update application: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/developer/apps/{id}/rotate-secret
     */
    public static function rotateSecret(int $appId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM developer_apps WHERE id = :id AND developer_id = :did LIMIT 1');
        $stmt->execute(['id' => $appId, 'did' => $currentUser['id']]);
        if (!$stmt->fetch()) {
            jsonError('Application not found or unauthorized.', 404);
        }

        $newSecret = HashUtils::generateClientSecret();
        $newHash = HashUtils::hashSecret($newSecret);

        $upd = $db->prepare('UPDATE developer_apps SET client_secret_hash = :shash WHERE id = :id');
        $upd->execute(['shash' => $newHash, 'id' => $appId]);

        jsonResponse([
            'success' => true,
            'message' => 'Client Secret regenerated! Old credentials are now invalid.',
            'new_client_secret' => $newSecret
        ]);
    }

    /**
     * DELETE /api/developer/apps/{id}
     */
    public static function deleteApp(int $appId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $del = $db->prepare('DELETE FROM developer_apps WHERE id = :id AND developer_id = :did');
        $del->execute(['id' => $appId, 'did' => $currentUser['id']]);

        if ($del->rowCount() === 0) {
            jsonError('Application not found or unauthorized.', 404);
        }

        jsonResponse(['success' => true, 'message' => 'Application deleted successfully.']);
    }

    /**
     * GET /api/developer/apps/{id}/usage
     */
    public static function getUsageStats(int $appId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM developer_apps WHERE id = :id AND developer_id = :did LIMIT 1');
        $stmt->execute(['id' => $appId, 'did' => $currentUser['id']]);
        if (!$stmt->fetch()) {
            jsonError('Application not found or unauthorized.', 404);
        }

        // Requests today
        $todayStmt = $db->prepare('
            SELECT
                COUNT(*) AS total_requests,
                SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) AS successful,
                SUM(CASE WHEN status_code >= 400 AND status_code < 429 THEN 1 ELSE 0 END) AS client_errors,
                SUM(CASE WHEN status_code = 429 THEN 1 ELSE 0 END) AS rate_limited
            FROM api_usage_logs
            WHERE app_id = :aid AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ');
        $todayStmt->execute(['aid' => $appId]);
        $stats = $todayStmt->fetch();

        jsonResponse([
            'success' => true,
            'usage' => [
                'total_requests' => (int)($stats['total_requests'] ?? 0),
                'successful' => (int)($stats['successful'] ?? 0),
                'client_errors' => (int)($stats['client_errors'] ?? 0),
                'rate_limited' => (int)($stats['rate_limited'] ?? 0)
            ]
        ]);
    }

    /**
     * POST /api/developer/apps/{id}/webhooks
     */
    public static function saveWebhook(int $appId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM developer_apps WHERE id = :id AND developer_id = :did LIMIT 1');
        $stmt->execute(['id' => $appId, 'did' => $currentUser['id']]);
        if (!$stmt->fetch()) {
            jsonError('Application not found or unauthorized.', 404);
        }

        $body = getRequestBody();
        $url = sanitizeInput($body['url'] ?? '');
        $events = is_array($body['events'] ?? null) ? $body['events'] : ['user.authorized'];

        if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
            jsonError('Valid webhook HTTPS URL is required.', 422);
        }

        $secret = HashUtils::generateWebhookSecret();
        $eventsJson = json_encode($events);

        $upd = $db->prepare('
            INSERT INTO developer_webhooks (app_id, url, secret, events, status)
            VALUES (:aid, :url, :sec, :ev, "active")
            ON DUPLICATE KEY UPDATE url = :url, events = :ev, status = "active"
        ');
        $upd->execute(['aid' => $appId, 'url' => $url, 'sec' => $secret, 'ev' => $eventsJson]);

        jsonResponse([
            'success' => true,
            'message' => 'Webhook configuration saved!',
            'secret' => $secret
        ]);
    }

    /**
     * POST /api/developer/webhooks/{id}/test
     */
    public static function testWebhook(int $webhookId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT w.*, a.name AS app_name
            FROM developer_webhooks w
            JOIN developer_apps a ON w.app_id = a.id
            WHERE w.id = :wid AND a.developer_id = :did
            LIMIT 1
        ');
        $stmt->execute(['wid' => $webhookId, 'did' => $currentUser['id']]);
        $wh = $stmt->fetch();

        if (!$wh) {
            jsonError('Webhook not found or unauthorized.', 404);
        }

        $testPayload = [
            'event' => 'ping.test',
            'timestamp' => time(),
            'data' => [
                'app_name' => decodeOutput($wh['app_name']),
                'message' => 'This is a test webhook event from MarkanM Connect.'
            ]
        ];

        $payloadJson = json_encode($testPayload);
        $signature = hash_hmac('sha256', $payloadJson, $wh['secret']);

        $startTime = microtime(true);
        $responseCode = 200;
        $responseBody = '{"received": true}';

        try {
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => [
                        'Content-Type: application/json',
                        'X-Markanm-Signature: ' . $signature,
                        'User-Agent: MarkanM-Connect-Webhook/1.0'
                    ],
                    'content' => $payloadJson,
                    'timeout' => 5
                ]
            ]);
            $res = @file_get_contents($wh['url'], false, $context);
            if ($res !== false) {
                $responseBody = substr($res, 0, 500);
            }
        } catch (Throwable $e) {
            $responseCode = 500;
            $responseBody = $e->getMessage();
        }

        $durationMs = (int)round((microtime(true) - $startTime) * 1000);

        // Record Delivery Log
        $logStmt = $db->prepare('
            INSERT INTO webhook_deliveries (webhook_id, event_type, payload, response_code, response_body, duration_ms)
            VALUES (:wid, "ping.test", :pl, :rcode, :rbody, :dur)
        ');
        $logStmt->execute([
            'wid' => $webhookId,
            'pl' => $payloadJson,
            'rcode' => $responseCode,
            'rbody' => $responseBody,
            'dur' => $durationMs
        ]);

        jsonResponse([
            'success' => true,
            'response_code' => $responseCode,
            'duration_ms' => $durationMs,
            'response_body' => $responseBody
        ]);
    }
}
