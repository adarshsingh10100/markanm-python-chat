-- MarkanM Chat - Update 5 Database Schema Migration Script
-- MarkanM Platform: Experiences, Mini Apps, Sessions, Bots, & SDK Ecosystem

SET FOREIGN_KEY_CHECKS = 0;

-- 1. EXPERIENCES TABLE (MINI APPS & GAMES REGISTRY)
CREATE TABLE IF NOT EXISTS `experiences` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `app_id` INT UNSIGNED NOT NULL,
  `slug` VARCHAR(80) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `tagline` VARCHAR(150) DEFAULT NULL,
  `icon_url` VARCHAR(255) DEFAULT NULL,
  `banner_url` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `category` ENUM('Game', 'Social', 'Productivity', 'AI', 'Community', 'Entertainment', 'Utility', 'Creative') NOT NULL DEFAULT 'Game',
  `website_url` VARCHAR(255) NOT NULL,
  `embed_url` VARCHAR(255) NOT NULL,
  `privacy_policy_url` VARCHAR(255) DEFAULT NULL,
  `developer_id` INT UNSIGNED NOT NULL,
  `status` ENUM('draft', 'submitted', 'published', 'disabled', 'rejected') NOT NULL DEFAULT 'published',
  `total_users` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_sessions` INT UNSIGNED NOT NULL DEFAULT 0,
  `rating_avg` DECIMAL(3,2) NOT NULL DEFAULT 4.80,
  `rating_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `is_first_party` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`app_id`) REFERENCES `developer_apps` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`developer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_exp_slug` (`slug`),
  INDEX `idx_exp_cat_status` (`category`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. EXPERIENCE VERSIONS TABLE
CREATE TABLE IF NOT EXISTS `experience_versions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `experience_id` INT UNSIGNED NOT NULL,
  `version` VARCHAR(20) NOT NULL,
  `release_notes` TEXT DEFAULT NULL,
  `status` ENUM('draft', 'submitted', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`experience_id`) REFERENCES `experiences` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. EXPERIENCE INSTALLATIONS TABLE
CREATE TABLE IF NOT EXISTS `experience_installations` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `experience_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `conversation_id` INT UNSIGNED DEFAULT NULL,
  `granted_scopes` VARCHAR(255) NOT NULL,
  `installed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`experience_id`) REFERENCES `experiences` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_exp_user_conv` (`experience_id`, `user_id`, `conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. EXPERIENCE SESSIONS TABLE (LIVE IN-CHAT SESSIONS)
CREATE TABLE IF NOT EXISTS `experience_sessions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `session_code` VARCHAR(32) NOT NULL UNIQUE,
  `experience_id` INT UNSIGNED NOT NULL,
  `conversation_id` INT UNSIGNED DEFAULT NULL,
  `creator_id` INT UNSIGNED NOT NULL,
  `state_json` JSON DEFAULT NULL,
  `status` ENUM('waiting', 'active', 'ended', 'expired') NOT NULL DEFAULT 'waiting',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  FOREIGN KEY (`experience_id`) REFERENCES `experiences` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_session_code` (`session_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. EXPERIENCE SESSION MEMBERS TABLE
CREATE TABLE IF NOT EXISTS `experience_session_members` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `score` INT NOT NULL DEFAULT 0,
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `experience_sessions` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_session_user` (`session_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BOTS REGISTRY TABLE
CREATE TABLE IF NOT EXISTS `bots` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `app_id` INT UNSIGNED NOT NULL,
  `bot_username` VARCHAR(50) NOT NULL UNIQUE,
  `display_name` VARCHAR(100) NOT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `bio` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`app_id`) REFERENCES `developer_apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BOT COMMANDS TABLE
CREATE TABLE IF NOT EXISTS `bot_commands` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `bot_id` INT UNSIGNED NOT NULL,
  `command` VARCHAR(32) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bot_id`) REFERENCES `bots` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_bot_command` (`bot_id`, `command`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. EXPERIENCE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS `experience_reviews` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `experience_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`experience_id`) REFERENCES `experiences` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_exp_review` (`experience_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. SEED FIRST-PARTY BUILT-IN EXPERIENCES
INSERT IGNORE INTO `developer_apps` (`id`, `developer_id`, `client_id`, `client_secret_hash`, `name`, `description`, `website_url`, `contact_email`, `category`, `status`)
VALUES (1, 1, 'mkm_app_markanm_official', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'MarkanM Official Experiences', 'Built-in first-party social experiences and party games.', 'https://chat.markanm.com', 'admin@markanm.com', 'Game', 'active');

INSERT IGNORE INTO `experiences` (`id`, `app_id`, `slug`, `name`, `tagline`, `icon_url`, `banner_url`, `description`, `category`, `website_url`, `embed_url`, `developer_id`, `status`, `total_users`, `total_sessions`, `rating_avg`, `is_featured`, `is_first_party`) VALUES
(1, 1, 'would-you-rather', 'Would You Rather', 'Classic party icebreaker decision game!', 'https://api.dicebear.com/7.x/identicon/svg?seed=WouldYouRather', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800', 'Pick between two hilarious or thought-provoking scenarios with your friends in real time!', 'Game', 'https://chat.markanm.com', 'https://chat.markanm.com/experiences/embed/would-you-rather', 1, 'published', 1420, 310, 4.90, 1, 1),
(2, 1, 'quick-quiz', 'Quick Quiz', 'Multiplayer live trivia challenge!', 'https://api.dicebear.com/7.x/identicon/svg?seed=QuickQuiz', 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800', 'Test your knowledge across pop culture, tech, and history against room members!', 'Game', 'https://chat.markanm.com', 'https://chat.markanm.com/experiences/embed/quick-quiz', 1, 'published', 980, 240, 4.85, 1, 1),
(3, 1, 'prediction-poll', 'Prediction Poll', 'Predict future events & vote on outcomes!', 'https://api.dicebear.com/7.x/identicon/svg?seed=PredictionPoll', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800', 'Create live prediction challenges and track leaderboards with your group.', 'Social', 'https://chat.markanm.com', 'https://chat.markanm.com/experiences/embed/prediction-poll', 1, 'published', 1850, 410, 4.95, 1, 1),
(4, 1, 'party-game', 'Party Game Night', 'Social party games for groups & rooms', 'https://api.dicebear.com/7.x/identicon/svg?seed=PartyGame', 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800', 'Collection of mini party games, truth or dare, and group icebreakers.', 'Game', 'https://chat.markanm.com', 'https://chat.markanm.com/experiences/embed/party-game', 1, 'published', 2100, 520, 4.92, 1, 1);

SET FOREIGN_KEY_CHECKS = 1;
