-- MarkanM Chat - Update 3 Database Schema Migration Script
-- Experience + Polls + Saved Messages + Stickers + Privacy Settings

SET FOREIGN_KEY_CHECKS = 0;

-- 1. EXTEND MESSAGES TABLE ENUM FOR MESSAGE TYPES (using correct message_type column name)
ALTER TABLE `messages`
  MODIFY COLUMN `message_type` ENUM('text', 'image', 'video', 'audio', 'file', 'system', 'gif', 'sticker', 'poll') NOT NULL DEFAULT 'text';

-- 2. SAVED MESSAGES TABLE
CREATE TABLE IF NOT EXISTS `saved_messages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `message_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_saved_message` (`user_id`, `message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. POLLS TABLE
CREATE TABLE IF NOT EXISTS `polls` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` INT UNSIGNED NOT NULL,
  `creator_id` INT UNSIGNED NOT NULL,
  `question` VARCHAR(255) NOT NULL,
  `is_multiple_choice` TINYINT(1) NOT NULL DEFAULT 0,
  `expires_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. POLL OPTIONS TABLE
CREATE TABLE IF NOT EXISTS `poll_options` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `poll_id` INT UNSIGNED NOT NULL,
  `option_text` VARCHAR(255) NOT NULL,
  FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. POLL VOTES TABLE
CREATE TABLE IF NOT EXISTS `poll_votes` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `poll_id` INT UNSIGNED NOT NULL,
  `option_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`option_id`) REFERENCES `poll_options` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_poll_vote` (`poll_id`, `option_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. STICKER PACKS TABLE
CREATE TABLE IF NOT EXISTS `sticker_packs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `slug` VARCHAR(50) NOT NULL UNIQUE,
  `icon` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default sticker packs
INSERT IGNORE INTO `sticker_packs` (`id`, `name`, `slug`, `icon`) VALUES
(1, 'Reactions', 'reactions', '😊'),
(2, 'Funny', 'funny', '😂'),
(3, 'Love', 'love', '❤️'),
(4, 'Hype', 'hype', '🔥'),
(5, 'Cool', 'cool', '😎'),
(6, 'Emotional', 'emotional', '😭'),
(7, 'Celebration', 'celebration', '🎉');

-- 7. STICKERS TABLE
CREATE TABLE IF NOT EXISTS `stickers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `pack_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  FOREIGN KEY (`pack_id`) REFERENCES `sticker_packs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. USER PRIVACY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS `user_privacy_settings` (
  `user_id` INT UNSIGNED PRIMARY KEY,
  `connection_requests` ENUM('everyone', 'shared_interests', 'nobody') NOT NULL DEFAULT 'everyone',
  `messaging` ENUM('everyone', 'connections', 'nobody') NOT NULL DEFAULT 'everyone',
  `show_online_status` TINYINT(1) NOT NULL DEFAULT 1,
  `show_last_seen` TINYINT(1) NOT NULL DEFAULT 1,
  `interests_visibility` ENUM('public', 'connections', 'private') NOT NULL DEFAULT 'public',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
