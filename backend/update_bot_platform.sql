-- MarkanM Chat - Bot Platform & Multi-Language SDK Database Migration Script

SET FOREIGN_KEY_CHECKS = 0;

-- 1. DEVELOPER BOTS TABLE
CREATE TABLE IF NOT EXISTS `developer_bots` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `app_id` INT UNSIGNED NOT NULL,
  `developer_id` INT UNSIGNED NOT NULL,
  `bot_username` VARCHAR(50) NOT NULL UNIQUE,
  `display_name` VARCHAR(100) NOT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `category` ENUM('Game', 'AI', 'Moderation', 'Utility', 'Productivity', 'Social', 'Entertainment') NOT NULL DEFAULT 'Utility',
  `bot_token_hash` VARCHAR(64) NOT NULL UNIQUE,
  `webhook_url` VARCHAR(255) DEFAULT NULL,
  `webhook_secret` VARCHAR(64) NOT NULL,
  `privacy_mode` TINYINT(1) NOT NULL DEFAULT 1, -- 1 = ON (Only commands/mentions), 0 = OFF (All room messages)
  `status` ENUM('active', 'disabled', 'suspended') NOT NULL DEFAULT 'active',
  `total_requests` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`app_id`) REFERENCES `developer_apps` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`developer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_bot_username` (`bot_username`),
  INDEX `idx_bot_token_hash` (`bot_token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BOT INSTALLATIONS TABLE
CREATE TABLE IF NOT EXISTS `bot_installations` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `bot_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `conversation_id` INT UNSIGNED DEFAULT NULL,
  `granted_scopes` VARCHAR(255) NOT NULL,
  `installed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bot_id`) REFERENCES `developer_bots` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_bot_user_conv` (`bot_id`, `user_id`, `conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BOT WEBHOOK DELIVERY LOGS & QUEUE TABLE
CREATE TABLE IF NOT EXISTS `bot_webhook_events` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `bot_id` INT UNSIGNED NOT NULL,
  `event_id` VARCHAR(64) NOT NULL UNIQUE,
  `event_type` VARCHAR(50) NOT NULL,
  `payload_json` JSON NOT NULL,
  `status` ENUM('pending', 'delivered', 'failed') NOT NULL DEFAULT 'pending',
  `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `http_code` SMALLINT UNSIGNED DEFAULT NULL,
  `response_ms` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bot_id`) REFERENCES `developer_bots` (`id`) ON DELETE CASCADE,
  INDEX `idx_event_bot_status` (`bot_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BOT REGISTERED COMMANDS TABLE
CREATE TABLE IF NOT EXISTS `bot_registered_commands` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `bot_id` INT UNSIGNED NOT NULL,
  `command` VARCHAR(32) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `usage_example` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bot_id`) REFERENCES `developer_bots` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_bot_cmd` (`bot_id`, `command`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SEED OFFICIAL FIRST-PARTY DEMO BOTS
INSERT IGNORE INTO `developer_bots` (`id`, `app_id`, `developer_id`, `bot_username`, `display_name`, `avatar_url`, `bio`, `category`, `bot_token_hash`, `webhook_secret`, `privacy_mode`, `status`) VALUES
(1, 1, 1, 'GameMaster', 'Game Master Bot', 'https://api.dicebear.com/7.x/bottts/svg?seed=GameMaster', 'Official MarkanM party game master & trivia host bot.', 'Game', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'whsec_gamemaster_12345', 1, 'active'),
(2, 1, 1, 'AIHelper', 'MarkanM AI Assistant', 'https://api.dicebear.com/7.x/bottts/svg?seed=AIHelper', 'Official AI Assistant bot powered by developer AI APIs.', 'AI', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b856', 'whsec_aihelper_12345', 1, 'active');

INSERT IGNORE INTO `bot_registered_commands` (`bot_id`, `command`, `description`, `usage_example`) VALUES
(1, 'start', 'Start a party game or trivia match', '/start'),
(1, 'help', 'Show help and game rules', '/help'),
(1, 'players', 'List current active players', '/players'),
(2, 'ask', 'Ask the AI Assistant a question', '/ask What is TCP/IP?');

SET FOREIGN_KEY_CHECKS = 1;
