-- MarkanM Chat - IP Activity Logging & Country Timezone Migration
-- Run this on Hostinger MySQL to activate IP logging + geo features

-- 1. Add IP/Geo columns to users table
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `last_ip` VARCHAR(45) DEFAULT NULL AFTER `updated_at`,
  ADD COLUMN IF NOT EXISTS `country_code` CHAR(2) DEFAULT NULL AFTER `last_ip`,
  ADD COLUMN IF NOT EXISTS `country_name` VARCHAR(80) DEFAULT NULL AFTER `country_code`,
  ADD COLUMN IF NOT EXISTS `city` VARCHAR(80) DEFAULT NULL AFTER `country_name`,
  ADD COLUMN IF NOT EXISTS `timezone` VARCHAR(60) DEFAULT 'Asia/Kolkata' AFTER `city`,
  ADD COLUMN IF NOT EXISTS `last_seen_at` TIMESTAMP NULL DEFAULT NULL AFTER `timezone`,
  ADD COLUMN IF NOT EXISTS `last_geo_updated_at` TIMESTAMP NULL DEFAULT NULL AFTER `last_seen_at`;

-- 2. Create enhanced user activity logs table
CREATE TABLE IF NOT EXISTS `user_activity_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `action` VARCHAR(80) NOT NULL COMMENT 'login, register, logout, send_message, open_chat, send_invite, start_game',
  `ip_address` VARCHAR(45) NOT NULL,
  `country_code` CHAR(2) DEFAULT NULL,
  `country_name` VARCHAR(80) DEFAULT NULL,
  `city` VARCHAR(80) DEFAULT NULL,
  `timezone` VARCHAR(60) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `metadata` JSON DEFAULT NULL COMMENT 'e.g. {\"conversation_id\": 5, \"message_length\": 42}',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_activity_user` (`user_id`),
  INDEX `idx_activity_ip` (`ip_address`),
  INDEX `idx_activity_action` (`action`),
  INDEX `idx_activity_created` (`created_at`),
  INDEX `idx_activity_country` (`country_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'user_activity_logs table ready' AS status;
SELECT COUNT(*) AS existing_logs FROM user_activity_logs;
