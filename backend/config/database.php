<?php
// Database Singleton Connection Manager using PDO
require_once __DIR__ . '/config.php';

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $host = defined('DB_HOST') ? DB_HOST : (getenv('DB_HOST') ?: $_ENV['DB_HOST'] ?: '127.0.0.1');
            $port = defined('DB_PORT') ? DB_PORT : (getenv('DB_PORT') ?: $_ENV['DB_PORT'] ?: '3306');
            $dbname = defined('DB_NAME') ? DB_NAME : (getenv('DB_NAME') ?: $_ENV['DB_NAME'] ?: 'markanm_chat');
            $user = defined('DB_USER') ? DB_USER : (getenv('DB_USER') ?: $_ENV['DB_USER'] ?: 'root');
            $pass = defined('DB_PASS') ? DB_PASS : (getenv('DB_PASS') ?: $_ENV['DB_PASS'] ?: '');
            $charset = 'utf8mb4';

            $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                // Enable emulate prepares to allow reusing named parameters in complex queries
                PDO::ATTR_EMULATE_PREPARES   => true,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
                // Ensure content column is LONGTEXT to support high-res Base64 images without truncation
                @self::$instance->exec('ALTER TABLE messages MODIFY COLUMN content LONGTEXT');
            } catch (PDOException $e) {
                jsonError('Database connection error: ' . $e->getMessage(), 500);
            }
        }
        return self::$instance;
    }
}
