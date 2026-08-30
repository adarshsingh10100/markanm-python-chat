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

            $hostsToTry = array_unique([$host, 'localhost', '127.0.0.1']);
            $lastException = null;

            foreach ($hostsToTry as $h) {
                try {
                    $dsn = "mysql:host={$h};port={$port};dbname={$dbname};charset={$charset}";
                    self::$instance = new PDO($dsn, $user, $pass, $options);
                    break;
                } catch (PDOException $e) {
                    $lastException = $e;
                }
            }

            if (self::$instance === null && $lastException) {
                jsonError('Database connection error: ' . $lastException->getMessage(), 500);
            }
        }
        return self::$instance;
    }
}
