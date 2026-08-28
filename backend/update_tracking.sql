-- MarkanM Chat - Tracking & Attribution Migration Script
-- Creates user_tracking_logs table and adds referral tracking columns to users table

-- 1. Add referral tracking columns to users table if they don't exist
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `referred_by_user_id` INT UNSIGNED DEFAULT NULL AFTER `is_verified`,
  ADD COLUMN IF NOT EXISTS `signup_source_link` VARCHAR(255) DEFAULT NULL AFTER `referred_by_user_id`;

-- 2. Create User Tracking Logs Table for complete attribution auditing
CREATE TABLE IF NOT EXISTS `user_tracking_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `event_type` ENUM('invite_sent', 'invite_clicked', 'signup_via_invite', 'signup_direct', 'login', 'group_join_via_invite') NOT NULL,
  `inviter_id` INT UNSIGNED DEFAULT NULL,
  `invite_code` VARCHAR(64) DEFAULT NULL,
  `landing_url` VARCHAR(255) DEFAULT NULL,
  `referrer_url` VARCHAR(255) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_tracking_user` (`user_id`),
  INDEX `idx_tracking_inviter` (`inviter_id`),
  INDEX `idx_tracking_event` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
