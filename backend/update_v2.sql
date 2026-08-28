-- MarkanM Chat - Update 2 Database Schema Migration Script
-- Discover + Live Rooms + Categories + Moderation + User Blocks + Interests + Moods

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROOM CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS `room_categories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `slug` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default categories if empty
INSERT IGNORE INTO `room_categories` (`id`, `name`, `slug`, `description`) VALUES
(1, 'Gaming', 'gaming', 'Video games, esports, and theories'),
(2, 'Technology', 'technology', 'Tech news, gadgets, and software'),
(3, 'Programming', 'programming', 'Coding, web dev, and software engineering'),
(4, 'AI', 'ai', 'Artificial Intelligence, LLMs, and future tech'),
(5, 'Movies', 'movies', 'Cinema, series, and reviews'),
(6, 'Music', 'music', 'Songs, artists, and live jams'),
(7, 'Sports', 'sports', 'Matches, teams, and live events'),
(8, 'Entertainment', 'entertainment', 'Pop culture and viral trends'),
(9, 'Social', 'social', 'Casual chats and meetups'),
(10, 'Debate', 'debate', 'Constructive discussions and debates'),
(11, 'Creative', 'creative', 'Art, design, and photography'),
(12, 'Lifestyle', 'lifestyle', 'Fitness, fashion, and daily life'),
(13, 'Humor', 'humor', 'Memes, jokes, and funny stories'),
(14, 'Relationships', 'relationships', 'Advice and deep conversations'),
(15, 'News', 'news', 'World news and current affairs'),
(16, 'Random', 'random', 'Anything and everything');

-- 2. LIVE ROOMS TABLE
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(32) NOT NULL UNIQUE,
  `title` VARCHAR(150) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `category_id` INT UNSIGNED DEFAULT 16,
  `type` ENUM('public', 'unlisted', 'private') NOT NULL DEFAULT 'public',
  `creator_id` INT UNSIGNED NOT NULL,
  `conversation_id` INT UNSIGNED NOT NULL,
  `max_participants` INT UNSIGNED DEFAULT NULL,
  `status` ENUM('live', 'ended', 'archived') NOT NULL DEFAULT 'live',
  `expires_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `room_categories` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  INDEX `idx_room_code` (`code`),
  INDEX `idx_room_status` (`status`),
  INDEX `idx_room_type` (`type`),
  INDEX `idx_room_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ROOM TAGS TABLE
CREATE TABLE IF NOT EXISTS `room_tags` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT UNSIGNED NOT NULL,
  `tag` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  INDEX `idx_room_tag` (`room_id`, `tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ROOM MEMBERS & ACTIVE PRESENCE HEARTBEAT TABLE
CREATE TABLE IF NOT EXISTS `room_members` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
  `last_active_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_muted` TINYINT(1) NOT NULL DEFAULT 0,
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_room_member` (`room_id`, `user_id`),
  INDEX `idx_room_active` (`room_id`, `last_active_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ROOM FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS `room_follows` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `room_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_room_follow` (`user_id`, `room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ROOM BANS TABLE
CREATE TABLE IF NOT EXISTS `room_bans` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `banned_by` INT UNSIGNED NOT NULL,
  `reason` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`banned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_room_ban` (`room_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. REPORTS TABLE
CREATE TABLE IF NOT EXISTS `reports` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `reporter_id` INT UNSIGNED NOT NULL,
  `target_type` ENUM('user', 'message', 'room') NOT NULL,
  `target_id` INT UNSIGNED NOT NULL,
  `reason` ENUM('spam', 'harassment', 'hate', 'sexual_content', 'violence', 'scam', 'illegal', 'other') NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'reviewed', 'dismissed', 'action_taken') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_report_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. USER BLOCKS TABLE
CREATE TABLE IF NOT EXISTS `user_blocks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `blocker_id` INT UNSIGNED NOT NULL,
  `blocked_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`blocker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`blocked_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_block` (`blocker_id`, `blocked_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. USER INTERESTS TABLE
CREATE TABLE IF NOT EXISTS `user_interests` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `interest` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_interest` (`user_id`, `interest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. USER MOODS TABLE (Temporary discovery preference)
CREATE TABLE IF NOT EXISTS `user_moods` (
  `user_id` INT UNSIGNED PRIMARY KEY,
  `mood` VARCHAR(50) NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
