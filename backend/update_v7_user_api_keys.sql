-- Fail-safe Migration: BYOK User AI Keys Table for phpMyAdmin / Hostinger MySQL

CREATE TABLE IF NOT EXISTS `user_ai_keys` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `provider` ENUM('groq', 'sarvam') NOT NULL,
  `api_key_encrypted` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_user_provider` (`user_id`, `provider`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
