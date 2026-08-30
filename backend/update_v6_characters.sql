-- MarkanM Chat Update v6: Character AI Platform Migration
-- Creates database tables for AI Characters, Persona Metadata, Memories, Relationships, Provider Logs & Imports

CREATE TABLE IF NOT EXISTS ai_characters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    anime_name VARCHAR(150) DEFAULT NULL,
    source ENUM('anilist', 'jikan', 'original', 'community', 'custom') DEFAULT 'custom',
    source_id VARCHAR(100) DEFAULT NULL,
    source_url VARCHAR(255) DEFAULT NULL,
    description TEXT,
    personality_summary TEXT,
    greeting TEXT DEFAULT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    banner_url VARCHAR(255) DEFAULT NULL,
    gender VARCHAR(50) DEFAULT NULL,
    age VARCHAR(50) DEFAULT NULL,
    category VARCHAR(50) DEFAULT 'Anime',
    tags_json LONGTEXT DEFAULT NULL,
    persona_json LONGTEXT DEFAULT NULL,
    appearance_json LONGTEXT DEFAULT NULL,
    ai_provider VARCHAR(50) DEFAULT 'auto',
    ai_model VARCHAR(100) DEFAULT 'default',
    temperature DECIMAL(3,2) DEFAULT 0.80,
    typing_speed ENUM('fast', 'normal', 'slow') DEFAULT 'normal',
    visibility ENUM('private', 'unlisted', 'public') DEFAULT 'public',
    status ENUM('active', 'flagged', 'disabled') DEFAULT 'active',
    is_official TINYINT(1) DEFAULT 0,
    created_by INT DEFAULT NULL,
    parent_character_id INT DEFAULT NULL,
    conversations_count INT DEFAULT 0,
    messages_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    user_id INT DEFAULT NULL, -- Linked shadow user record for chat messaging
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_category (category),
    INDEX idx_visibility_status (visibility, status),
    INDEX idx_source (source, source_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_character_memories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    character_id INT NOT NULL,
    user_id INT NOT NULL,
    conversation_id INT DEFAULT NULL,
    memory_type ENUM('short_term', 'long_term', 'fact') DEFAULT 'long_term',
    fact_key VARCHAR(100) NOT NULL,
    fact_value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_char_user (character_id, user_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_character_relationships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    character_id INT NOT NULL,
    user_id INT NOT NULL,
    relationship_type VARCHAR(50) DEFAULT 'Friend',
    trust_score DECIMAL(3,2) DEFAULT 0.50,
    notes TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_char_user (character_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_character_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    character_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_char (user_id, character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_character_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    character_id INT NOT NULL,
    reported_by INT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT DEFAULT NULL,
    status ENUM('pending', 'reviewed', 'dismissed', 'actioned') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    character_id INT DEFAULT NULL,
    conversation_id INT DEFAULT NULL,
    user_id INT DEFAULT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    latency_ms INT DEFAULT 0,
    tokens_used INT DEFAULT 0,
    status ENUM('success', 'error', 'fallback') DEFAULT 'success',
    error_message TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_provider (provider),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_provider_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_name VARCHAR(50) NOT NULL UNIQUE,
    is_enabled TINYINT(1) DEFAULT 1,
    is_default TINYINT(1) DEFAULT 0,
    config_json LONGTEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extend users table if missing ai columns
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "is_ai";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN is_ai TINYINT(1) DEFAULT 0, ADD COLUMN ai_character_id INT DEFAULT NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
