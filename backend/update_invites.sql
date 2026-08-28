-- MarkanM Chat - Email Invites Migration Script
-- Creates email_invites table to track email invitation quotas (Max 2 lifetime, Max 1 per 24 hours)

CREATE TABLE IF NOT EXISTS `email_invites` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `inviter_id` INT UNSIGNED NOT NULL,
  `recipient_email` VARCHAR(150) NOT NULL,
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_recipient_email` (`recipient_email`),
  INDEX `idx_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
