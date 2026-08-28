<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/HashUtils.php';

class BotPlatformController {

    /**
     * Authenticate Bot Token (Authorization: Bearer mkbot_...)
     */
    private static function authenticateBot(): array {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');

        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? ''));

        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            jsonError('Missing or malformed Authorization header. Expected: "Authorization: Bearer mkbot_..."', 401);
        }

        $rawToken = trim($matches[1]);
        if (strpos($rawToken, 'mkbot_') !== 0) {
            jsonError('Invalid token type. Expected Bot Token starting with "mkbot_..."', 401);
        }

        $tokenHash = HashUtils::hashSecret($rawToken);
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT b.*, a.name AS app_name, a.status AS app_status
            FROM developer_bots b
            JOIN developer_apps a ON b.app_id = a.id
            WHERE b.bot_token_hash = :thash AND b.status = "active"
            LIMIT 1
        ');
        $stmt->execute(['thash' => $tokenHash]);
        $bot = $stmt->fetch();

        if (!$bot) {
            jsonError('Invalid or revoked Bot Token.', 401);
        }

        // Increment request count
        $upd = $db->prepare('UPDATE developer_bots SET total_requests = total_requests + 1 WHERE id = :id');
        $upd->execute(['id' => $bot['id']]);

        return $bot;
    }

    /**
     * POST /api/developer/bots
     * Create Bot under Developer App
     */
    public static function createBot(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $appId = (int)($body['app_id'] ?? 0);
        $username = strtolower(trim(ltrim($body['bot_username'] ?? '', '@')));
        $displayName = sanitizeInput($body['display_name'] ?? '');
        $bio = sanitizeInput($body['bio'] ?? '');
        $category = sanitizeInput($body['category'] ?? 'Utility');
        $webhookUrl = sanitizeInput($body['webhook_url'] ?? '');

        if ($appId <= 0 || empty($username) || empty($displayName)) {
            jsonError('app_id, bot_username, and display_name are required.', 422);
        }

        $db = Database::getConnection();

        // Verify app ownership
        $appCheck = $db->prepare('SELECT id FROM developer_apps WHERE id = :aid AND developer_id = :did LIMIT 1');
        $appCheck->execute(['aid' => $appId, 'did' => $currentUser['id']]);
        if (!$appCheck->fetch()) {
            jsonError('Developer application not found or unauthorized.', 403);
        }

        // Check unique username
        $unameCheck = $db->prepare('SELECT id FROM developer_bots WHERE bot_username = :uname LIMIT 1');
        $unameCheck->execute(['uname' => $username]);
        if ($unameCheck->fetch()) {
            jsonError("Bot username @{$username} is already taken.", 409);
        }

        // Generate bot token (mkbot_...) and webhook secret
        $rawBotToken = 'mkbot_' . bin2hex(random_bytes(24));
        $tokenHash = HashUtils::hashSecret($rawBotToken);
        $webhookSecret = 'whsec_' . bin2hex(random_bytes(16));
        $avatarUrl = "https://api.dicebear.com/7.x/bottts/svg?seed=" . urlencode($username);

        $stmt = $db->prepare('
            INSERT INTO developer_bots (app_id, developer_id, bot_username, display_name, avatar_url, bio, category, bot_token_hash, webhook_url, webhook_secret, status)
            VALUES (:aid, :did, :uname, :dname, :avatar, :bio, :cat, :thash, :wh, :whsec, "active")
        ');
        $stmt->execute([
            'aid' => $appId,
            'did' => $currentUser['id'],
            'uname' => $username,
            'dname' => $displayName,
            'avatar' => $avatarUrl,
            'bio' => $bio,
            'cat' => $category,
            'thash' => $tokenHash,
            'wh' => $webhookUrl,
            'whsec' => $webhookSecret
        ]);
        $botId = (int)$db->lastInsertId();

        jsonResponse([
            'success' => true,
            'message' => 'Bot created successfully!',
            'bot' => [
                'id' => $botId,
                'bot_username' => $username,
                'display_name' => $displayName,
                'bot_token' => $rawBotToken, // Revealed ONLY ONCE
                'webhook_secret' => $webhookSecret
            ]
        ], 201);
    }

    /**
     * POST /api/developer/bots/{id}/rotate-token
     */
    public static function rotateToken(int $botId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $botStmt = $db->prepare('SELECT id FROM developer_bots WHERE id = :bid AND developer_id = :did LIMIT 1');
        $botStmt->execute(['bid' => $botId, 'did' => $currentUser['id']]);
        if (!$botStmt->fetch()) {
            jsonError('Bot not found or unauthorized.', 403);
        }

        $rawToken = 'mkbot_' . bin2hex(random_bytes(24));
        $tokenHash = HashUtils::hashSecret($rawToken);

        $upd = $db->prepare('UPDATE developer_bots SET bot_token_hash = :thash WHERE id = :bid');
        $upd->execute(['thash' => $tokenHash, 'bid' => $botId]);

        jsonResponse([
            'success' => true,
            'message' => 'Bot token regenerated! Old token is immediately invalid.',
            'new_bot_token' => $rawToken
        ]);
    }

    /**
     * POST /api/developer/bots/{id}/webhooks
     */
    public static function saveWebhook(int $botId): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $url = sanitizeInput($body['webhook_url'] ?? '');
        $privacyMode = isset($body['privacy_mode']) ? ((bool)$body['privacy_mode'] ? 1 : 0) : 1;

        $db = Database::getConnection();

        $botStmt = $db->prepare('SELECT id FROM developer_bots WHERE id = :bid AND developer_id = :did LIMIT 1');
        $botStmt->execute(['bid' => $botId, 'did' => $currentUser['id']]);
        if (!$botStmt->fetch()) {
            jsonError('Bot not found or unauthorized.', 403);
        }

        $upd = $db->prepare('UPDATE developer_bots SET webhook_url = :wh, privacy_mode = :pm WHERE id = :bid');
        $upd->execute(['wh' => $url, 'pm' => $privacyMode, 'bid' => $botId]);

        jsonResponse(['success' => true, 'message' => 'Webhook settings saved successfully!']);
    }

    /**
     * POST /api/developer/bots/{id}/webhooks/test
     */
    public static function testWebhookPing(int $botId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $botStmt = $db->prepare('SELECT * FROM developer_bots WHERE id = :bid AND developer_id = :did LIMIT 1');
        $botStmt->execute(['bid' => $botId, 'did' => $currentUser['id']]);
        $bot = $botStmt->fetch();

        if (!$bot || empty($bot['webhook_url'])) {
            jsonError('Bot or Webhook URL not configured.', 404);
        }

        $eventId = 'evt_test_' . bin2hex(random_bytes(8));
        $timestamp = time();
        $payload = [
            'event' => 'ping.test',
            'event_id' => $eventId,
            'timestamp' => $timestamp,
            'bot' => [
                'id' => (int)$bot['id'],
                'bot_username' => $bot['bot_username']
            ],
            'message' => 'Test ping event from MarkanM Bot Platform'
        ];

        $payloadJson = json_encode($payload);
        $signature = hash_hmac('sha256', $timestamp . '.' . $payloadJson, $bot['webhook_secret']);

        $startTime = microtime(true);
        $ch = curl_init($bot['webhook_url']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payloadJson);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-MarkanM-Signature: t=' . $timestamp . ',v1=' . $signature,
            'X-MarkanM-Event: ping.test',
            'X-MarkanM-Event-ID: ' . $eventId
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);

        $responseBody = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $durationMs = (int)((microtime(true) - $startTime) * 1000);
        curl_close($ch);

        // Record log
        $logStmt = $db->prepare('
            INSERT INTO bot_webhook_events (bot_id, event_id, event_type, payload_json, status, attempts, http_code, response_ms)
            VALUES (:bid, :eid, "ping.test", :p, :st, 1, :hc, :ms)
        ');
        $logStmt->execute([
            'bid' => $botId,
            'eid' => $eventId,
            'p' => $payloadJson,
            'st' => ($httpCode >= 200 && $httpCode < 300) ? 'delivered' : 'failed',
            'hc' => $httpCode,
            'ms' => $durationMs
        ]);

        jsonResponse([
            'success' => true,
            'response_code' => $httpCode,
            'duration_ms' => $durationMs,
            'response_body' => substr((string)$responseBody, 0, 500)
        ]);
    }

    /**
     * GET /api/developer/bots/{id}/logs
     */
    public static function getLogs(int $botId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $botStmt = $db->prepare('SELECT id FROM developer_bots WHERE id = :bid AND developer_id = :did LIMIT 1');
        $botStmt->execute(['bid' => $botId, 'did' => $currentUser['id']]);
        if (!$botStmt->fetch()) {
            jsonError('Bot not found or unauthorized.', 403);
        }

        $stmt = $db->prepare('SELECT * FROM bot_webhook_events WHERE bot_id = :bid ORDER BY created_at DESC LIMIT 20');
        $stmt->execute(['bid' => $botId]);
        $logs = $stmt->fetchAll();

        jsonResponse(['success' => true, 'logs' => $logs]);
    }

    /**
     * GET /api/bot/v1/me
     */
    public static function getMe(): void {
        $bot = self::authenticateBot();
        jsonResponse([
            'id' => (int)$bot['id'],
            'bot_username' => $bot['bot_username'],
            'display_name' => decodeOutput($bot['display_name']),
            'avatar_url' => $bot['avatar_url'],
            'bio' => decodeOutput($bot['bio']),
            'category' => $bot['category'],
            'privacy_mode' => (bool)$bot['privacy_mode'],
            'status' => $bot['status']
        ]);
    }

    /**
     * POST /api/bot/v1/rooms/{roomId}/messages
     */
    public static function sendRoomMessage(string $roomId): void {
        $bot = self::authenticateBot();
        $body = getRequestBody();

        $text = sanitizeInput($body['text'] ?? ($body['content'] ?? ''));
        $type = sanitizeInput($body['type'] ?? 'text');
        $card = !empty($body['card']) ? $body['card'] : null;

        if (empty($text) && empty($card)) {
            jsonError('text or card content is required.', 422);
        }

        $db = Database::getConnection();
        $convId = (int)$roomId;

        $msgText = $text;
        if ($type === 'card' && $card) {
            $title = sanitizeInput($card['title'] ?? 'Interactive Card');
            $buttonsStr = isset($card['buttons']) ? implode(', ', array_column($card['buttons'], 'label')) : '';
            $msgText = "🤖 [CARD] {$title}: " . ($card['description'] ?? '') . ($buttonsStr ? " | Buttons: [ {$buttonsStr} ]" : '');
        }

        $stmt = $db->prepare('
            INSERT INTO messages (conversation_id, sender_id, content, type, created_at)
            VALUES (:cid, :sid, :content, :type, NOW())
        ');
        $stmt->execute([
            'cid' => $convId,
            'sid' => $bot['developer_id'], // Sent on behalf of bot's developer application
            'content' => "🤖 @" . $bot['bot_username'] . ": " . $msgText,
            'type' => 'text'
        ]);
        $msgId = (int)$db->lastInsertId();

        jsonResponse([
            'success' => true,
            'message_id' => $msgId,
            'recipient_room_id' => $convId,
            'bot_username' => $bot['bot_username']
        ], 201);
    }

    /**
     * POST /api/bot/v1/polling
     * Local Development Polling Endpoint for fetching events
     */
    public static function polling(): void {
        $bot = self::authenticateBot();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT * FROM bot_webhook_events
            WHERE bot_id = :bid AND status = "pending"
            ORDER BY created_at ASC
            LIMIT 10
        ');
        $stmt->execute(['bid' => $bot['id']]);
        $events = $stmt->fetchAll();

        // Mark fetched events as delivered
        if ($events) {
            $ids = array_column($events, 'id');
            $inClause = implode(',', array_map('intval', $ids));
            $db->exec("UPDATE bot_webhook_events SET status = 'delivered' WHERE id IN ({$inClause})");
        }

        jsonResponse([
            'success' => true,
            'events' => array_map(function($e) {
                return [
                    'event_id' => $e['event_id'],
                    'event_type' => $e['event_type'],
                    'payload' => json_decode($e['payload_json'], true),
                    'created_at' => $e['created_at']
                ];
            }, $events)
        ]);
    }
}
