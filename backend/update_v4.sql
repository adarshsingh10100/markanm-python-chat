-- MarkanM Chat - Update 4 Database Schema Migration Script
-- MarkanM Connect: Developer Platform + OAuth 2.0 + Webhooks + API v1

SET FOREIGN_KEY_CHECKS = 0;

-- 1. DEVELOPER PROFILES TABLE
CREATE TABLE IF NOT EXISTS `developer_profiles` (
  `user_id` INT UNSIGNED PRIMARY KEY,
  `status` ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  `company_name` VARCHAR(120) DEFAULT NULL,
  `website_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. DEVELOPER APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS `developer_apps` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `developer_id` INT UNSIGNED NOT NULL,
  `client_id` VARCHAR(64) NOT NULL UNIQUE,
  `client_secret_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `icon_url` VARCHAR(255) DEFAULT NULL,
  `website_url` VARCHAR(255) NOT NULL,
  `contact_email` VARCHAR(150) NOT NULL,
  `category` ENUM('Game', 'Social', 'Productivity', 'AI', 'Community', 'Entertainment', 'Utility', 'Other') NOT NULL DEFAULT 'Utility',
  `status` ENUM('development', 'active', 'disabled', 'revoked') NOT NULL DEFAULT 'development',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`developer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_client_id` (`client_id`),
  INDEX `idx_developer_id` (`developer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. OAUTH REDIRECT URIS TABLE
CREATE TABLE IF NOT EXISTS `oauth_redirect_uris` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `app_id` INT UNSIGNED NOT NULL,
  `redirect_uri` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`app_id`) REFERENCES `developer_apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. OAUTH AUTHORIZATION CODES TABLE
CREATE TABLE IF NOT EXISTS `oauth_authorization_codes` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `app_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `code_hash` VARCHAR(128) NOT NULL UNIQUE,
  `redirect_uri` VARCHAR(500) NOT NULL,
  `scopes` VARCHAR(255) NOT NULL,
  `code_challenge` VARCHAR(128) DEFAULT NULL,
  `code_challenge_method` VARCHAR(10) DEFAULT 'S256',
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`app_id`) REFERENCES `developer_apps` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_code_hash` (`code_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. OAUTH ACCESS TOKENS TABLE
CREATE TABLE IF NOT EXISTS `oauth_access_tokens` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `app_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `token_hash` VARCHAR(128) NOT NULL UNIQUE,
  `scopes` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`app_id`) REFERENCES `developer_apps` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_token_hash` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. OAUTH USER CONSENTS TABLE
CREATE TABLE IF NOT EXISTS `oauth_consents` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `app_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `scopes` VARCHAR(255) NOT NULL,
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`app_id`) REFERENCES `developer_apps` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_app_user_consent` (`app_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. DEVELOPER WEBHOOKS TABLE
CREATE TABLE IF NOT EXISTS `developer_webhooks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `app_id` INT UNSIGNED NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `secret` VARCHAR(128) NOT NULL,
  `events` JSON NOT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`app_id`) REFERENCES `developer_apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. WEBHOOK DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS `webhook_deliveries` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `webhook_id` INT UNSIGNED NOT NULL,
  `event_type` VARCHAR(64) NOT NULL,
  `payload` JSON NOT NULL,
  `response_code` INT DEFAULT NULL,
  `response_body` TEXT DEFAULT NULL,
  `duration_ms` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`webhook_id`) REFERENCES `developer_webhooks` (`id`) ON DELETE CASCADE,
  INDEX `idx_webhook_deliveries` (`webhook_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. API USAGE LOGS TABLE
CREATE TABLE IF NOT EXISTS `api_usage_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `app_id` INT UNSIGNED NOT NULL,
  `endpoint` VARCHAR(120) NOT NULL,
  `status_code` INT NOT NULL DEFAULT 200,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`app_id`) REFERENCES `developer_apps` (`id`) ON DELETE CASCADE,
  INDEX `idx_app_usage` (`app_id`, `created_at`),
  INDEX `idx_usage_rate_limit` (`app_id`, `created_at`, `status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
