<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class BotController {

    /**
     * POST /api/bots/commands/execute
     */
    public static function executeCommand(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $botUsername = sanitizeInput($body['bot_username'] ?? '');
        $command = sanitizeInput($body['command'] ?? '');
        $convId = !empty($body['conversation_id']) ? (int)$body['conversation_id'] : null;

        if (empty($botUsername) || empty($command)) {
            jsonError('bot_username and command are required.', 422);
        }

        $db = Database::getConnection();

        // 1. Fetch bot details
        $botStmt = $db->prepare('SELECT id, display_name, avatar_url FROM bots WHERE bot_username = :bname LIMIT 1');
        $botStmt->execute(['bname' => ltrim($botUsername, '@')]);
        $bot = $botStmt->fetch();

        // Standard Bot Response Generators
        $replyContent = "🤖 @" . ltrim($botUsername, '@') . ": Processing command {$command}...";

        if (strpos($command, '/start') === 0 || strpos($command, '/help') === 0) {
            $replyContent = "🤖 @" . ltrim($botUsername, '@') . " Bot Active! Commands available: /start, /players, /rules, /play";
        } else if (strpos($command, '/players') === 0) {
            $replyContent = "👥 Active players in conversation: " . decodeOutput($currentUser['display_name']) . " (@" . $currentUser['username'] . ")";
        } else if (strpos($command, '/rules') === 0) {
            $replyContent = "📜 Game Rules: 1. Join game. 2. Vote or select options in real time. 3. Highest score wins!";
        }

        jsonResponse([
            'success' => true,
            'bot_username' => $botUsername,
            'command' => $command,
            'reply' => $replyContent
        ]);
    }
}
