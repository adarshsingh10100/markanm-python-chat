<?php
// One-time setup & migration script
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/config.php';

echo "Running MarkanM Chat database setup and schema migrations...\n";

try {
    $db = Database::getConnection();

    // 1. Ensure users table has role column
    try {
        $db->exec("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'");
        echo "Added 'role' column to users table.\n";
    } catch (Throwable $e) {}

    // 2. Set admin role for initial admin users
    try {
        $db->exec("UPDATE users SET role = 'admin' WHERE LOWER(username) IN ('gdr', 'admin', 'markanm')");
        echo "Updated admin roles.\n";
    } catch (Throwable $e) {}

    // 3. Ensure ai_characters tables exist
    $db->exec('
        CREATE TABLE IF NOT EXISTS ai_characters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            slug VARCHAR(120) NOT NULL UNIQUE,
            display_name VARCHAR(120) NOT NULL,
            anime_name VARCHAR(150) DEFAULT NULL,
            source VARCHAR(50) DEFAULT "custom",
            source_id VARCHAR(100) DEFAULT NULL,
            source_url VARCHAR(255) DEFAULT NULL,
            description TEXT,
            personality_summary TEXT,
            greeting TEXT DEFAULT NULL,
            avatar_url VARCHAR(255) DEFAULT NULL,
            banner_url VARCHAR(255) DEFAULT NULL,
            gender VARCHAR(50) DEFAULT NULL,
            age VARCHAR(50) DEFAULT NULL,
            speaking_style VARCHAR(255) DEFAULT NULL,
            category VARCHAR(50) DEFAULT "Anime",
            status VARCHAR(20) DEFAULT "active",
            created_by INT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ');

    // 4. Ensure conversation_members cleared_at column exists
    try {
        $db->exec('ALTER TABLE conversation_members ADD COLUMN cleared_at DATETIME DEFAULT NULL');
        echo "Added 'cleared_at' to conversation_members table.\n";
    } catch (Throwable $e) {}

    echo "Setup completed successfully!\n";
} catch (Throwable $t) {
    echo "Setup Error: " . $t->getMessage() . "\n";
    exit(1);
}
