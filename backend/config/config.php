<?php
// MarkanM Chat Backend Configuration
// Tailored for Hostinger Shared Hosting & Standard Environments

// Ensure session starts safely
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Lax');
    session_start();
}

// Automatically load .env file if available
$possibleEnvPaths = [
    __DIR__ . '/../.env',
    __DIR__ . '/../../.env',
    __DIR__ . '/.env'
];

foreach ($possibleEnvPaths as $envPath) {
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value, " \t\n\r\0\x0B\"'");
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
        break;
    }
}

// Database Credentials Constants (overridable via .env or server environment)
if (!defined('DB_HOST')) define('DB_HOST', getenv('DB_HOST') ?: $_ENV['DB_HOST'] ?: $_SERVER['DB_HOST'] ?: '127.0.0.1');
if (!defined('DB_PORT')) define('DB_PORT', getenv('DB_PORT') ?: $_ENV['DB_PORT'] ?: $_SERVER['DB_PORT'] ?: '3306');
if (!defined('DB_NAME')) define('DB_NAME', getenv('DB_NAME') ?: $_ENV['DB_NAME'] ?: $_SERVER['DB_NAME'] ?: 'markanm_chat');
if (!defined('DB_USER')) define('DB_USER', getenv('DB_USER') ?: $_ENV['DB_USER'] ?: $_SERVER['DB_USER'] ?: 'root');
if (!defined('DB_PASS')) define('DB_PASS', getenv('DB_PASS') ?: $_ENV['DB_PASS'] ?: $_SERVER['DB_PASS'] ?: '');

// App Settings
if (!defined('APP_NAME')) define('APP_NAME', 'MarkanM Chat');
if (!defined('APP_URL')) define('APP_URL', getenv('APP_URL') ?: $_ENV['APP_URL'] ?: 'https://chat.markanm.com');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('UPLOAD_URL_PREFIX', '/backend/uploads/');
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5MB limit
define('ALLOWED_AVATAR_MIMES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Session / Token Expiry
define('TOKEN_EXPIRY_DAYS', 30);

/**
 * Standard JSON response helper
 */
function jsonResponse($data = [], int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

/**
 * Standard error JSON response helper
 */
function jsonError(string $message, int $statusCode = 400, array $errors = []): void {
    jsonResponse([
        'success' => false,
        'error' => $message,
        'details' => $errors
    ], $statusCode);
}

/**
 * Sanitize string inputs without HTML encoding quotes
 */
function sanitizeInput(?string $input): string {
    if ($input === null) return '';
    return trim(strip_tags($input));
}

/**
 * Decode HTML entities for JSON API outputs
 */
function decodeOutput(?string $input): string {
    if ($input === null) return '';
    return html_entity_decode($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/**
 * Parse JSON Request Body
 */
function getRequestBody(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return $_POST ?: [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
