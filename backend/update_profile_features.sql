-- MarkanM Chat - Profile Features & Enhancements Migration Script
-- Adds banner_url and social_links columns to users table

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `banner_url` VARCHAR(255) DEFAULT NULL AFTER `avatar_url`,
  ADD COLUMN IF NOT EXISTS `social_links` JSON DEFAULT NULL AFTER `bio`;
