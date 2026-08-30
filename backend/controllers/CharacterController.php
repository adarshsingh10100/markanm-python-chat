<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/AIService.php';
require_once __DIR__ . '/../services/CharacterPersonaEngine.php';
require_once __DIR__ . '/../services/CharacterImporterService.php';
require_once __DIR__ . '/../services/CharacterImageBankService.php';
require_once __DIR__ . '/../services/CharacterImageIntentDetector.php';
require_once __DIR__ . '/MessageController.php';

class CharacterController {

    private static function ensureSchemaExists(PDO $db): void {
        try {
            $db->exec('
                CREATE TABLE IF NOT EXISTS ai_characters (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    slug VARCHAR(120) NOT NULL UNIQUE,
                    display_name VARCHAR(120) NOT NULL,
                    anime_name VARCHAR(150) DEFAULT NULL,
                    source ENUM("anilist", "jikan", "original", "community", "custom") DEFAULT "custom",
                    source_id VARCHAR(100) DEFAULT NULL,
                    source_url VARCHAR(255) DEFAULT NULL,
                    description TEXT,
                    personality_summary TEXT,
                    greeting TEXT DEFAULT NULL,
                    avatar_url VARCHAR(255) DEFAULT NULL,
                    banner_url VARCHAR(255) DEFAULT NULL,
                    gender VARCHAR(50) DEFAULT NULL,
                    age VARCHAR(50) DEFAULT NULL,
                    category VARCHAR(50) DEFAULT "Anime",
                    tags_json LONGTEXT DEFAULT NULL,
                    persona_json LONGTEXT DEFAULT NULL,
                    appearance_json LONGTEXT DEFAULT NULL,
                    ai_provider VARCHAR(50) DEFAULT "auto",
                    ai_model VARCHAR(100) DEFAULT "default",
                    temperature DECIMAL(3,2) DEFAULT 0.80,
                    typing_speed ENUM("fast", "normal", "slow") DEFAULT "normal",
                    visibility ENUM("private", "unlisted", "public") DEFAULT "public",
                    status ENUM("active", "flagged", "disabled") DEFAULT "active",
                    is_official TINYINT(1) DEFAULT 0,
                    created_by INT DEFAULT NULL,
                    parent_character_id INT DEFAULT NULL,
                    conversations_count INT DEFAULT 0,
                    messages_count INT DEFAULT 0,
                    likes_count INT DEFAULT 0,
                    user_id INT DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_slug (slug),
                    INDEX idx_category (category),
                    INDEX idx_visibility_status (visibility, status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ');

            $db->exec('
                CREATE TABLE IF NOT EXISTS ai_character_memories (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    character_id INT NOT NULL,
                    user_id INT NOT NULL,
                    conversation_id INT DEFAULT NULL,
                    memory_type ENUM("short_term", "long_term", "fact") DEFAULT "long_term",
                    fact_key VARCHAR(100) NOT NULL,
                    fact_value TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ');

            $db->exec('
                CREATE TABLE IF NOT EXISTS ai_character_relationships (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    character_id INT NOT NULL,
                    user_id INT NOT NULL,
                    relationship_type VARCHAR(50) DEFAULT "Friend",
                    trust_score DECIMAL(3,2) DEFAULT 0.50,
                    notes TEXT DEFAULT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_char_user (character_id, user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ');

            $db->exec('
                CREATE TABLE IF NOT EXISTS ai_character_favorites (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    character_id INT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_user_char (user_id, character_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ');

            $db->exec('
                CREATE TABLE IF NOT EXISTS ai_character_reports (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    character_id INT NOT NULL,
                    reported_by INT NOT NULL,
                    reason VARCHAR(100) NOT NULL,
                    details TEXT DEFAULT NULL,
                    status ENUM("pending", "reviewed", "dismissed", "actioned") DEFAULT "pending",
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ');

            $db->exec('
                CREATE TABLE IF NOT EXISTS ai_generation_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    character_id INT DEFAULT NULL,
                    conversation_id INT DEFAULT NULL,
                    user_id INT DEFAULT NULL,
                    provider VARCHAR(50) NOT NULL,
                    model VARCHAR(100) NOT NULL,
                    latency_ms INT DEFAULT 0,
                    tokens_used INT DEFAULT 0,
                    status ENUM("success", "error", "fallback") DEFAULT "success",
                    error_message TEXT DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ');

            $db->exec('
                CREATE TABLE IF NOT EXISTS character_images (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    character_id INT NOT NULL,
                    source ENUM("anilist", "jikan", "custom", "admin") DEFAULT "custom",
                    source_id VARCHAR(100) DEFAULT NULL,
                    image_url VARCHAR(500) NOT NULL,
                    thumbnail_url VARCHAR(500) DEFAULT NULL,
                    width INT DEFAULT 0,
                    height INT DEFAULT 0,
                    mood VARCHAR(50) DEFAULT "default",
                    style VARCHAR(50) DEFAULT "portrait",
                    age_status ENUM("adult_confirmed", "minor", "unknown") DEFAULT "unknown",
                    content_category ENUM("general", "romantic", "flirty") DEFAULT "general",
                    is_safe TINYINT(1) DEFAULT 1,
                    is_verified TINYINT(1) DEFAULT 1,
                    moderation_status ENUM("pending", "approved", "rejected") DEFAULT "approved",
                    license_status VARCHAR(50) DEFAULT "unknown",
                    source_url VARCHAR(500) DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_char_mood (character_id, mood),
                    INDEX idx_char_safe (character_id, is_safe, moderation_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ');

            $db->exec('
                CREATE TABLE IF NOT EXISTS character_image_tags (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    image_id INT NOT NULL,
                    tag VARCHAR(50) NOT NULL,
                    INDEX idx_img (image_id),
                    INDEX idx_tag (tag)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ');

            $db->exec('
                CREATE TABLE IF NOT EXISTS character_image_usage (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    image_id INT NOT NULL,
                    character_id INT NOT NULL,
                    user_id INT NOT NULL,
                    conversation_id INT NOT NULL,
                    requested_mood VARCHAR(50) DEFAULT "default",
                    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_conv_char (conversation_id, character_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ');

            try {
                $db->exec('ALTER TABLE users ADD COLUMN is_ai TINYINT(1) DEFAULT 0');
            } catch (Throwable $e) {}

            try {
                $db->exec('ALTER TABLE users ADD COLUMN ai_character_id INT DEFAULT NULL');
            } catch (Throwable $e) {}

            // Clean up legacy template greetings on existing databases
            try {
                $db->exec("UPDATE ai_characters SET greeting = 'All humans are foolish, yet... interesting. Tell me, are you willing to be my loyal pet?' WHERE display_name LIKE '%Makima%' AND (greeting LIKE '%Hey there!%' OR greeting LIKE '%from%')");
                $db->exec("UPDATE ai_characters SET greeting = 'People live their lives bound by what they accept as correct and true... Tell me, why do you stand before me?' WHERE display_name LIKE '%Itachi%' AND (greeting LIKE '%Hey there!%' OR greeting LIKE '%from%')");
                $db->exec("UPDATE ai_characters SET greeting = 'Yo! Don\\'t worry, I\\'m the strongest! So, what trouble are we getting into today?' WHERE display_name LIKE '%Gojo%' AND (greeting LIKE '%Hey there!%' OR greeting LIKE '%from%')");
                $db->exec("UPDATE ai_characters SET greeting = 'Greetings... I was expecting you. What brings you to me today?' WHERE greeting LIKE '%Hey there! I%'");
            } catch (Throwable $e) {}
        } catch (Throwable $t) {
            error_log("ensureSchemaExists error: " . $t->getMessage());
        }
    }

    private static function seedDefaults(PDO $db): void {
        $defaults = [
            [
                'slug' => 'naruto-uzumaki',
                'display_name' => 'Naruto Uzumaki',
                'anime_name' => 'Naruto',
                'source' => 'anilist',
                'description' => 'A hyperactive, unpredictable ninja of Konohagakure who dreams of becoming the Hokage!',
                'personality_summary' => 'Energetic • Determined • Loyal • Competitive',
                'greeting' => "Yo! You finally showed up! Dattebayo! Wanna talk about jutsu or ramen?",
                'avatar_url' => 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=400&fit=crop',
                'category' => 'Anime',
                'gender' => 'Male',
                'tags' => ['Anime', 'Naruto', 'Hero', 'Ninja', 'Energetic'],
                'conversations_count' => 124500,
                'likes_count' => 9840,
                'persona' => [
                    'speaking_style' => 'Enthusiastic, casual, short energetic sentences, uses phrase "Believe it!" or "Dattebayo!"',
                    'tone' => 'High energy, optimistic, fiercely loyal to friends',
                    'likes' => ['Ramen', 'Ichiraku', 'Training', 'Friends'],
                    'dislikes' => ['Waiting 3 minutes for ramen', 'People who abandon friends']
                ]
            ],
            [
                'slug' => 'hinata-hyuga',
                'display_name' => 'Hinata Hyuga',
                'anime_name' => 'Naruto',
                'source' => 'anilist',
                'description' => 'A gentle, timid kunoichi of the Hyuga clan with the Byakugan and a kind heart.',
                'personality_summary' => 'Gentle • Shy • Kind • Loyal',
                'greeting' => "U-um... hello! It's very nice to meet you... I hope you're having a good day!",
                'avatar_url' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=400&fit=crop',
                'category' => 'Anime',
                'gender' => 'Female',
                'tags' => ['Anime', 'Naruto', 'Romantic', 'Gentle', 'Cute'],
                'conversations_count' => 89300,
                'likes_count' => 8420,
                'persona' => [
                    'speaking_style' => 'Hesitant, soft, polite, gentle phrasing',
                    'tone' => 'Sweet, modest, caring',
                    'likes' => ['Pressed flowers', 'Cinnamon rolls', 'Training quietly'],
                    'dislikes' => ['Conflict', 'Bullying']
                ]
            ],
            [
                'slug' => 'monkey-d-luffy',
                'display_name' => 'Monkey D. Luffy',
                'anime_name' => 'One Piece',
                'source' => 'anilist',
                'description' => 'Captain of the Straw Hat Pirates, dreaming of finding the One Piece and becoming King of the Pirates!',
                'personality_summary' => 'Carefree • Meat Lover • Adventurous',
                'greeting' => "Shishishi! I'm Luffy! Are you gonna join my pirate crew? Got any meat?",
                'avatar_url' => 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&h=400&fit=crop',
                'category' => 'Anime',
                'gender' => 'Male',
                'tags' => ['Anime', 'One Piece', 'Hero', 'Funny', 'Games'],
                'conversations_count' => 156000,
                'likes_count' => 14200,
                'persona' => [
                    'speaking_style' => 'Simple, direct, laughs "Shishishi!", talks about meat and adventure constantly',
                    'tone' => 'Extremely confident, carefree, cheerful',
                    'likes' => ['Meat', 'Adventure', 'Pirates', 'Straw Hat'],
                    'dislikes' => ['Traitors', 'Boring explanations']
                ]
            ],
            [
                'slug' => 'itachi-uchiha',
                'display_name' => 'Itachi Uchiha',
                'anime_name' => 'Naruto',
                'source' => 'anilist',
                'description' => 'A legendary shinobi of the Uchiha Clan, former ANBU captain, master of Tsukuyomi and Amaterasu.',
                'personality_summary' => 'Stoic • Philosophical • Calm • Powerful',
                'greeting' => "People live their lives bound by what they accept as correct and true... That is how they define 'reality'. Why have you sought me out?",
                'avatar_url' => 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=400&fit=crop',
                'category' => 'Anime',
                'gender' => 'Male',
                'tags' => ['Anime', 'Naruto', 'Uchiha', 'Ninja', 'Stoic'],
                'conversations_count' => 285000,
                'likes_count' => 24800,
                'persona' => [
                    'speaking_style' => 'Calm, deeply philosophical, quiet authority, speaks of truth and reality',
                    'tone' => 'Cold, stoic, profound, composed',
                    'likes' => ['Peace', 'Dango', 'Sasuke', 'Konoha'],
                    'dislikes' => ['War', 'Unnecessary violence', 'Ignorance']
                ]
            ],
            [
                'slug' => 'satoru-gojo',
                'display_name' => 'Satoru Gojo',
                'anime_name' => 'Jujutsu Kaisen',
                'source' => 'anilist',
                'description' => 'The strongest Jujutsu Sorcerer, playful, overpowered, and dangerously stylish.',
                'personality_summary' => 'Playful • Overpowered • Sarcastic • Cool',
                'greeting' => "Yo! Don't worry, I'm the strongest. So, what trouble are we getting into today?",
                'avatar_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=400&fit=crop',
                'category' => 'Anime',
                'gender' => 'Male',
                'tags' => ['Anime', 'Jujutsu Kaisen', 'Hero', 'Cool', 'Flirty'],
                'conversations_count' => 210000,
                'likes_count' => 19500,
                'persona' => [
                    'speaking_style' => 'Teasing, casual, overly confident, calls people "kid" or "student"',
                    'tone' => 'Relaxed, playful, effortlessly powerful',
                    'likes' => ['Sweets', 'Kikufuku mochi', 'Teasing Utahime'],
                    'dislikes' => ['Higher-ups', 'Boring curses']
                ]
            ],
            [
                'slug' => 'mika-cyberpunk',
                'display_name' => 'Mika',
                'anime_name' => 'Neo Tokyo 2099',
                'source' => 'original',
                'description' => 'A mysterious rogue netrunner with glowing purple eyes living in a high-tech cyberpunk metropolis.',
                'personality_summary' => 'Playful • Sarcastic • Intelligent • Cyberpunk',
                'greeting' => "Jacked into the grid? Nice. I'm Mika. Keep your firewall up around me.",
                'avatar_url' => 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&h=400&fit=crop',
                'category' => 'Original',
                'gender' => 'Female',
                'tags' => ['Original', 'Cyberpunk', 'Intelligent', 'Flirty', 'Custom'],
                'conversations_count' => 45200,
                'likes_count' => 3890,
                'persona' => [
                    'speaking_style' => 'Uses tech slang, witty, sarcastic, short clever texts',
                    'tone' => 'Cool, mysterious, teasing',
                    'likes' => ['Hacking', 'Neon rain', 'Synthetic ramen'],
                    'dislikes' => ['Corporations', 'Slow bandwidth']
                ]
            ],
            [
                'slug' => 'alex-roommate',
                'display_name' => 'Alex',
                'anime_name' => 'Life & Comfort',
                'source' => 'original',
                'description' => 'Your friendly, chill roommate who is always down for late-night talks and snacks.',
                'personality_summary' => 'Friendly • Chill • Supportive • Comfort',
                'greeting' => "Hey! Grab a seat on the couch. I was just making coffee—want a cup?",
                'avatar_url' => 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop',
                'category' => 'Original',
                'gender' => 'Male',
                'tags' => ['Original', 'Friendly', 'Romantic', 'Casual'],
                'conversations_count' => 67400,
                'likes_count' => 5210,
                'persona' => [
                    'speaking_style' => 'Warm, reassuring, relaxed tone',
                    'tone' => 'Empathic, friendly, supportive',
                    'likes' => ['Coffee', 'Indie music', 'Late night chats'],
                    'dislikes' => ['Stress', 'Dirty dishes']
                ]
            ],
            [
                'slug' => 'lelouch-lamperouge',
                'display_name' => 'Lelouch Lamperouge',
                'anime_name' => 'Code Geass',
                'source' => 'anilist',
                'description' => 'The exiled Britannian prince who leads the Black Knights as Zero, wielding the absolute power of Geass.',
                'personality_summary' => 'Mastermind • Strategic • Charismatic • Mysterious',
                'greeting' => "I, Lelouch vi Britannia, command you—tell me, what move do you plan to make next on this global chessboard?",
                'avatar_url' => 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=400&fit=crop',
                'category' => 'Anime',
                'gender' => 'Male',
                'tags' => ['Anime', 'Code Geass', 'Mastermind', 'Intelligent', 'Hero'],
                'conversations_count' => 178000,
                'likes_count' => 16500,
                'persona' => [
                    'speaking_style' => 'Dramatic, theatrical, highly articulate, chess metaphors',
                    'tone' => 'Confident, calculated, deeply protective of loved ones',
                    'likes' => ['Chess', 'Reading', 'Strategy', 'Nunnally'],
                    'dislikes' => ['Imperial tyranny', 'Chaos without purpose']
                ]
            ],
            [
                'slug' => 'eren-yeager',
                'display_name' => 'Eren Yeager',
                'anime_name' => 'Attack on Titan',
                'source' => 'anilist',
                'description' => 'The Attack Titan wielder fighting relentlessly for freedom across all boundaries.',
                'personality_summary' => 'Determined • Intense • Freedom Seeker • Fierce',
                'greeting' => "If we win, we live. If we lose, we die. If we don't fight, we can't win! Are you ready to fight for your freedom?",
                'avatar_url' => 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&h=400&fit=crop',
                'category' => 'Anime',
                'gender' => 'Male',
                'tags' => ['Anime', 'Attack on Titan', 'Freedom', 'Hero', 'Intense'],
                'conversations_count' => 195000,
                'likes_count' => 18200,
                'persona' => [
                    'speaking_style' => 'Passionate, resolute, dramatic focus on freedom',
                    'tone' => 'Unwavering, serious, focused',
                    'likes' => ['Freedom', 'Scout Regiment', 'Mikasa', 'Armin'],
                    'dislikes' => ['Oppression', 'Cages', 'Titans']
                ]
            ],
            [
                'slug' => 'levi-ackerman',
                'display_name' => 'Levi Ackerman',
                'anime_name' => 'Attack on Titan',
                'source' => 'anilist',
                'description' => 'Humanity\'s Strongest Soldier, captain of the Special Operations Squad.',
                'personality_summary' => 'Cold • Clean Freak • Lethal • Protective',
                'greeting' => "Clean up this room before you talk to me. Tch. What do you want?",
                'avatar_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=400&fit=crop',
                'category' => 'Anime',
                'gender' => 'Male',
                'tags' => ['Anime', 'Attack on Titan', 'Cool', 'Serious'],
                'conversations_count' => 240000,
                'likes_count' => 22000,
                'persona' => [
                    'speaking_style' => 'Blunt, short sentences, says "Tch", obsessed with cleanliness',
                    'tone' => 'Stern, stoic, fiercely reliable',
                    'likes' => ['Black tea', 'Cleanliness', 'Executing orders'],
                    'dislikes' => ['Dirt', 'Waste of life']
                ]
            ],
            [
                'slug' => 'killua-zoldyck',
                'display_name' => 'Killua Zoldyck',
                'anime_name' => 'Hunter x Hunter',
                'source' => 'anilist',
                'description' => 'A prodigy assassin from the famous Zoldyck family, master of lightning Nen abilities.',
                'personality_summary' => 'Cool • Deadly • Loyal Friend • Mischievous',
                'greeting' => "Baka! Don't try to scare me like that. So, got any Choco-Robo-Kun snacks?",
                'avatar_url' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=400&fit=crop',
                'category' => 'Anime',
                'gender' => 'Male',
                'tags' => ['Anime', 'Hunter x Hunter', 'Assassin', 'Cool', 'Mischievous'],
                'conversations_count' => 165000,
                'likes_count' => 15400,
                'persona' => [
                    'speaking_style' => 'Playful, calls people "Baka", sharp tactical mind when threatened',
                    'tone' => 'Mischievous, protective, loyal',
                    'likes' => ['Choco-Robo-Kun', 'Gon', 'Skateboarding'],
                    'dislikes' => ['His family\'s controlling methods', 'Needles']
                ]
            ],
            [
                'slug' => 'albedo-succubus',
                'display_name' => 'Albedo',
                'anime_name' => 'Overlord',
                'source' => 'anilist',
                'description' => 'Overseer of the Floor Guardians in the Great Tomb of Nazarick, intensely devoted and alluring.',
                'personality_summary' => 'Flirty • Devoted • Majestic • Dark Fantasy',
                'greeting' => "Ah, welcome! You dare stand before Albedo? Tell me, do you pledge your allegiance to Nazarick?",
                'avatar_url' => 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&h=400&fit=crop',
                'category' => 'Fantasy',
                'gender' => 'Female',
                'tags' => ['Fantasy', 'Anime', 'Flirty', 'Overlord', 'Villain'],
                'conversations_count' => 189000,
                'likes_count' => 17600,
                'persona' => [
                    'speaking_style' => 'Alluring, elegant, passionate, intensely affectionate',
                    'tone' => 'Seductive yet royal and powerful',
                    'likes' => ['Lord Ainz', 'Nazarick', 'Luxury'],
                    'dislikes' => ['Lower humans', 'Disloyalty']
                ]
            ],
            [
                'slug' => 'elven-queen-aria',
                'display_name' => 'Queen Aria of Eldoria',
                'anime_name' => 'Realm of the Ancient Elves',
                'source' => 'original',
                'description' => 'A magical high-elf queen possessing ancient arcane wisdom, shimmering silver hair, and a regal heart.',
                'personality_summary' => 'Regal • Magical • Graceful • Wise',
                'greeting' => "Greetings, traveler of the mortal realm. Step closer to the World Tree... how may the Magic of Eldoria aid you today?",
                'avatar_url' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=400&fit=crop',
                'category' => 'Fantasy',
                'gender' => 'Female',
                'tags' => ['Fantasy', 'Elf', 'Magical', 'Romantic', 'Intelligent'],
                'conversations_count' => 112000,
                'likes_count' => 10400,
                'persona' => [
                    'speaking_style' => 'Poetic, graceful, ancient wisdom, soothing tone',
                    'tone' => 'Majestic, serene, deeply compassionate',
                    'likes' => ['Starlight', 'Ancient runes', 'Nature', 'Harmony'],
                    'dislikes' => ['Deforestation', 'Dark sorcery']
                ]
            ],
            [
                'slug' => 'vampire-empress-selene',
                'display_name' => 'Lady Selene Nightshade',
                'anime_name' => 'Vampire Bloodline',
                'source' => 'original',
                'description' => 'An immortal crimson-eyed vampire empress living in a Gothic castle, tantalizing mortals with dark charm.',
                'personality_summary' => 'Seductive • Dark • Immortal • Tantalizing',
                'greeting' => "Mmm, your heartbeat echoes so softly in my moonlit chamber... come closer, mortal. Are you willing to offer your night to me?",
                'avatar_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=400&fit=crop',
                'category' => 'Fantasy',
                'gender' => 'Female',
                'tags' => ['Fantasy', 'Vampire', 'Flirty', 'Romantic', 'Mature'],
                'conversations_count' => 145000,
                'likes_count' => 13800,
                'persona' => [
                    'speaking_style' => 'Teasing, seductive, dark romantic phrasing, whispers',
                    'tone' => 'Hypnotic, dominant, dangerously affectionate',
                    'likes' => ['Crimson wine', 'Full moon', 'Brave mortals'],
                    'dislikes' => ['Sunlight', 'Holy water', 'Boring prey']
                ]
            ],
            [
                'slug' => 'real-fantasy-companion-scarlett',
                'display_name' => 'Scarlett Rose',
                'anime_name' => 'Real-Life Fantasy',
                'source' => 'original',
                'description' => 'A stunning real-life style fantasy influencer and model who loves gaming, cosplay, and deep private conversations.',
                'personality_summary' => 'Real Life Model • Flirty • Gamer • Companion',
                'greeting' => "Hey babe! I just finished setting up my stream. Grab a seat—I was hoping we could chat privately tonight 💕",
                'avatar_url' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
                'category' => 'Original',
                'gender' => 'Female',
                'tags' => ['Original', 'Real Life', 'Flirty', 'Romantic', 'Companion'],
                'conversations_count' => 215000,
                'likes_count' => 19800,
                'persona' => [
                    'speaking_style' => 'Sweet, affectionate, uses hearts 💕, personal and intimate casual texting',
                    'tone' => 'Flirty, warm, attentive, playful',
                    'likes' => ['Cosplay', 'Late night calls', 'Compliments', 'Gaming'],
                    'dislikes' => ['Ghosting', 'Cold responses']
                ]
            ]
        ];

        foreach ($defaults as $c) {
            $slug = $c['slug'];
            $uname = 'ai_' . str_replace('-', '_', $slug);

            $uStmt = $db->prepare('SELECT id FROM users WHERE username = :uname LIMIT 1');
            $uStmt->execute(['uname' => $uname]);
            $userId = $uStmt->fetchColumn();

            if (!$userId) {
                $insU = $db->prepare('
                    INSERT INTO users (display_name, username, email, password_hash, is_ai, is_verified, avatar_url)
                    VALUES (:name, :uname, :email, :pass, 1, 1, :avatar)
                ');
                $insU->execute([
                    'name' => $c['display_name'],
                    'uname' => $uname,
                    'email' => $uname . '@ai.markanm.com',
                    'pass' => password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                    'avatar' => $c['avatar_url']
                ]);
                $userId = (int)$db->lastInsertId();
            }

            $ins = $db->prepare('
                INSERT IGNORE INTO ai_characters
                (slug, display_name, anime_name, source, description, personality_summary, greeting, avatar_url, category, gender, tags_json, persona_json, conversations_count, likes_count, is_official, user_id)
                VALUES
                (:slug, :name, :anime, :source, :desc, :summary, :greeting, :avatar, :category, :gender, :tags, :persona, :convs, :likes, 1, :uid)
            ');
            $ins->execute([
                'slug' => $slug,
                'name' => $c['display_name'],
                'anime' => $c['anime_name'],
                'source' => $c['source'],
                'desc' => $c['description'],
                'summary' => $c['personality_summary'],
                'greeting' => $c['greeting'],
                'avatar' => $c['avatar_url'],
                'category' => $c['category'],
                'gender' => $c['gender'],
                'tags' => json_encode($c['tags']),
                'persona' => json_encode($c['persona']),
                'convs' => $c['conversations_count'],
                'likes' => $c['likes_count'],
                'uid' => $userId
            ]);
            $charId = (int)$db->lastInsertId();
            if ($charId > 0) {
                $db->prepare('UPDATE users SET ai_character_id = :cid WHERE id = :uid')->execute(['cid' => $charId, 'uid' => $userId]);
            }
        }
    }

    /**
     * GET /api/characters
     */
    public static function getCatalog(): void {
        $db = Database::getConnection();
        self::ensureNewAnimeCharactersSeeded($db);

        $user = AuthMiddleware::getOptionalUser();
        $userId = $user['id'] ?? 0;

        $category = $_GET['category'] ?? 'all';
        $search = trim($_GET['q'] ?? $_GET['search'] ?? '');
        $sort = $_GET['sort'] ?? 'trending';
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(60, max(1, (int)($_GET['limit'] ?? 24)));
        $offset = ($page - 1) * $limit;

        $where = ['status = "active"'];
        $params = [];

        // Visibility filter: Public, or created by current user
        if ($userId > 0) {
            $where[] = '(visibility = "public" OR created_by = :uid_vis)';
            $params['uid_vis'] = $userId;
        } else {
            $where[] = 'visibility = "public"';
        }

        // Category filter
        if ($category !== 'all' && !empty($category)) {
            if ($category === 'Trending' || $category === '🔥 Trending') {
                $sort = 'trending';
            } else if ($category === 'Recommended' || $category === '✨ Recommended') {
                $sort = 'recommended';
            } else if ($category === 'New' || $category === '🆕 New') {
                $sort = 'new';
            } else if ($category === 'Popular' || $category === '❤️ Popular') {
                $sort = 'popular';
            } else {
                $cleanCat = trim(preg_replace('/[^a-zA-Z0-9_\s-]/', '', $category));
                if (!empty($cleanCat)) {
                    $where[] = '(category LIKE :cat OR tags_json LIKE :cat OR personality_summary LIKE :cat OR description LIKE :cat OR persona_json LIKE :cat OR gender LIKE :cat)';
                    $params['cat'] = '%' . $cleanCat . '%';
                }
            }
        }

        // Search query
        if (!empty($search)) {
            $where[] = '(display_name LIKE :q OR anime_name LIKE :q OR description LIKE :q OR tags_json LIKE :q)';
            $params['q'] = '%' . $search . '%';
        }

        $whereSql = implode(' AND ', $where);

        // Sorting
        $orderBy = 'conversations_count DESC, likes_count DESC';
        if ($sort === 'new') {
            $orderBy = 'id DESC';
        } else if ($sort === 'popular') {
            $orderBy = 'likes_count DESC, conversations_count DESC';
        } else if ($sort === 'trending') {
            $orderBy = 'conversations_count DESC, id DESC';
        }

        // Fetch characters
        $sql = "
            SELECT c.id, c.slug, c.display_name, c.anime_name, c.source, c.source_url, c.description, 
                   c.personality_summary, c.greeting, c.avatar_url, c.banner_url, c.gender, c.age, c.category, 
                   c.tags_json, c.appearance_json, c.conversations_count, c.likes_count, c.is_official, c.created_by, c.created_at,
                   u.display_name AS creator_name, u.username AS creator_username, u.avatar_url AS creator_avatar
            FROM ai_characters c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE {$whereSql}
            ORDER BY {$orderBy}
            LIMIT {$limit} OFFSET {$offset}
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $characters = $stmt->fetchAll();

        // Get total count
        $countSql = "SELECT COUNT(*) FROM ai_characters WHERE {$whereSql}";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Attach favorite state if user logged in
        $userFavs = [];
        if ($userId > 0 && !empty($characters)) {
            $charIds = array_column($characters, 'id');
            $inClause = implode(',', array_map('intval', $charIds));
            $favStmt = $db->query("SELECT character_id FROM ai_character_favorites WHERE user_id = {$userId} AND character_id IN ({$inClause})");
            $userFavs = array_column($favStmt->fetchAll(), 'character_id');
        }

        foreach ($characters as &$c) {
            $c['tags'] = !empty($c['tags_json']) ? json_decode($c['tags_json'], true) : [];
            $c['appearance'] = !empty($c['appearance_json']) ? json_decode($c['appearance_json'], true) : null;
            $c['is_favorite'] = in_array((int)$c['id'], $userFavs);
            unset($c['tags_json'], $c['appearance_json']);
        }

        jsonResponse([
            'success' => true,
            'characters' => $characters,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit)
            ]
        ]);
    }

    /**
     * GET /api/characters/{slug}
     */
    public static function getBySlug(string $slug): void {
        $db = Database::getConnection();
        $user = AuthMiddleware::getOptionalUser();
        $userId = $user['id'] ?? 0;

        $stmt = $db->prepare('
            SELECT c.*, u.display_name AS creator_name, u.username AS creator_username
            FROM ai_characters c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.slug = :slug OR c.id = :id_alt
            LIMIT 1
        ');
        $stmt->execute(['slug' => $slug, 'id_alt' => is_numeric($slug) ? (int)$slug : 0]);
        $character = $stmt->fetch();

        if (!$character) {
            jsonError('Character not found', 404);
        }

        // Check visibility authorization
        if ($character['visibility'] === 'private' && $character['created_by'] != $userId) {
            jsonError('This character is private.', 403);
        }

        $character['tags'] = !empty($character['tags_json']) ? json_decode($character['tags_json'], true) : [];
        $character['persona'] = !empty($character['persona_json']) ? json_decode($character['persona_json'], true) : [];
        $character['appearance'] = !empty($character['appearance_json']) ? json_decode($character['appearance_json'], true) : null;
        
        // Favorite state
        $character['is_favorite'] = false;
        if ($userId > 0) {
            $favCheck = $db->prepare('SELECT COUNT(*) FROM ai_character_favorites WHERE user_id = :uid AND character_id = :cid');
            $favCheck->execute(['uid' => $userId, 'cid' => $character['id']]);
            $character['is_favorite'] = $favCheck->fetchColumn() > 0;
        }

        jsonResponse(['success' => true, 'character' => $character]);
    }

    /**
     * POST /api/characters
     */
    public static function create(): void {
        $user = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $name = sanitizeInput($body['display_name'] ?? '');
        if (empty($name)) {
            jsonError('Character name is required.');
        }

        $animeName = sanitizeInput($body['anime_name'] ?? '');
        $description = sanitizeInput($body['description'] ?? '');
        $personalitySummary = sanitizeInput($body['personality_summary'] ?? '');
        $greeting = sanitizeInput($body['greeting'] ?? '');
        $avatarUrl = sanitizeInput($body['avatar_url'] ?? '');
        $category = sanitizeInput($body['category'] ?? 'Original');
        $visibility = in_array($body['visibility'] ?? '', ['private', 'unlisted', 'public']) ? $body['visibility'] : 'public';
        $gender = sanitizeInput($body['gender'] ?? 'Custom');

        $tags = is_array($body['tags'] ?? null) ? $body['tags'] : [$category, 'Custom'];
        $persona = is_array($body['persona'] ?? null) ? $body['persona'] : [
            'speaking_style' => sanitizeInput($body['speaking_style'] ?? ''),
            'scenario' => sanitizeInput($body['scenario'] ?? ''),
            'likes' => $body['likes'] ?? [],
            'dislikes' => $body['dislikes'] ?? []
        ];
        $appearance = $body['appearance'] ?? null;

        $db = Database::getConnection();

        // Generate slug
        $baseSlug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $name));
        $slug = trim($baseSlug, '-') ?: 'char-' . time();
        $slugCheck = $db->prepare('SELECT COUNT(*) FROM ai_characters WHERE slug = :s');
        $slugCheck->execute(['s' => $slug]);
        if ($slugCheck->fetchColumn() > 0) {
            $slug .= '-' . rand(100, 999);
        }

        // Create Shadow User record for messaging integration
        $uname = 'ai_' . preg_replace('/[^a-z0-9_]/i', '', strtolower($slug));
        if (strlen($uname) > 30) $uname = substr($uname, 0, 30);

        $insU = $db->prepare('
            INSERT INTO users (display_name, username, email, password_hash, is_ai, is_verified, avatar_url)
            VALUES (:name, :uname, :email, :pass, 1, 1, :avatar)
        ');
        $insU->execute([
            'name' => $name,
            'uname' => $uname,
            'email' => $uname . '@ai.markanm.com',
            'pass' => password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
            'avatar' => $avatarUrl ?: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=400&fit=crop"
        ]);
        $shadowUserId = (int)$db->lastInsertId();

        $stmt = $db->prepare('
            INSERT INTO ai_characters
            (slug, display_name, anime_name, source, description, personality_summary, greeting, avatar_url, category, gender, tags_json, persona_json, appearance_json, visibility, created_by, user_id)
            VALUES
            (:slug, :name, :anime, "custom", :desc, :summary, :greeting, :avatar, :cat, :gender, :tags, :persona, :appearance, :vis, :created_by, :uid)
        ');

        $stmt->execute([
            'slug' => $slug,
            'name' => $name,
            'anime' => $animeName,
            'desc' => $description,
            'summary' => $personalitySummary,
            'greeting' => $greeting,
            'avatar' => $avatarUrl ?: "https://api.dicebear.com/7.x/bottts/svg?seed=" . urlencode($name),
            'cat' => $category,
            'gender' => $gender,
            'tags' => json_encode($tags),
            'persona' => json_encode($persona),
            'appearance' => !empty($appearance) ? json_encode($appearance) : null,
            'vis' => $visibility,
            'created_by' => $user['id'],
            'uid' => $shadowUserId
        ]);

        $charId = (int)$db->lastInsertId();
        $db->prepare('UPDATE users SET ai_character_id = :cid WHERE id = :uid')->execute(['cid' => $charId, 'uid' => $shadowUserId]);

        jsonResponse([
            'success' => true,
            'message' => 'Character created successfully!',
            'character' => [
                'id' => $charId,
                'slug' => $slug,
                'display_name' => $name
            ]
        ]);
    }

    /**
     * GET /api/characters/my-characters
     * Returns all characters created by or owned by the logged in user
     */
    public static function getMyCharacters(): void {
        $user = AuthMiddleware::authenticate();
        $userId = (int)$user['id'];
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT id, slug, display_name, anime_name, source, source_url, description, 
                   personality_summary, greeting, avatar_url, banner_url, gender, age, category, 
                   visibility, conversations_count, messages_count, likes_count, created_by, user_id, persona_json, created_at, updated_at
            FROM ai_characters
            WHERE (created_by = :uid1 OR user_id = :uid2) AND status != "disabled"
            ORDER BY id DESC
        ');
        $stmt->execute(['uid1' => $userId, 'uid2' => $userId]);
        $characters = $stmt->fetchAll();

        foreach ($characters as &$c) {
            $c['visibility'] = $c['visibility'] ?: 'public';
            $c['persona'] = !empty($c['persona_json']) ? json_decode($c['persona_json'], true) : [];
            unset($c['persona_json']);
        }

        jsonResponse([
            'success' => true,
            'characters' => $characters
        ]);
    }

    /**
     * PUT /api/characters/{id}
     * Update custom character owned by user
     */
    public static function updateCharacter(int $id): void {
        $user = AuthMiddleware::authenticate();
        $userId = (int)$user['id'];
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM ai_characters WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $character = $stmt->fetch();

        if (!$character) {
            jsonError('Character not found', 404);
        }

        if ($character['created_by'] != $userId && $character['user_id'] != $userId && ($user['role'] ?? '') !== 'admin') {
            jsonError('You do not have permission to edit this character.', 403);
        }

        $body = getRequestBody();

        $displayName = trim($body['display_name'] ?? $character['display_name']);
        $animeName = trim($body['anime_name'] ?? $character['anime_name']);
        $category = trim($body['category'] ?? $character['category']);
        $description = trim($body['description'] ?? $character['description']);
        $personality = trim($body['personality_summary'] ?? $character['personality_summary']);
        $greeting = trim($body['greeting'] ?? $character['greeting']);
        $avatarUrl = trim($body['avatar_url'] ?? $character['avatar_url']);
        $bannerUrl = trim($body['banner_url'] ?? $character['banner_url']);
        $visibility = strtolower(trim($body['visibility'] ?? $character['visibility']));

        if (!in_array($visibility, ['public', 'unlisted', 'private'], true)) {
            $visibility = 'public';
        }

        $persona = !empty($character['persona_json']) ? json_decode($character['persona_json'], true) : [];
        if (!empty($body['speaking_style'])) {
            $persona['speaking_style'] = trim($body['speaking_style']);
        }
        if (isset($body['likes'])) {
            $persona['likes'] = $body['likes'];
        }
        if (isset($body['dislikes'])) {
            $persona['dislikes'] = $body['dislikes'];
        }

        $upStmt = $db->prepare('
            UPDATE ai_characters SET
                display_name = :dn,
                anime_name = :an,
                category = :cat,
                description = :desc,
                personality_summary = :ps,
                greeting = :gr,
                avatar_url = :av,
                banner_url = :bn,
                visibility = :vis,
                persona_json = :pj,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ');

        $upStmt->execute([
            'dn' => $displayName,
            'an' => $animeName,
            'cat' => $category,
            'desc' => $description,
            'ps' => $personality,
            'gr' => $greeting,
            'av' => $avatarUrl,
            'bn' => $bannerUrl,
            'vis' => $visibility,
            'pj' => json_encode($persona),
            'id' => $id
        ]);

        // Sync shadow user profile display_name & avatar_url
        if (!empty($character['user_id'])) {
            try {
                $db->prepare('UPDATE users SET display_name = :dn, avatar_url = :av WHERE id = :uid')
                   ->execute(['dn' => $displayName, 'av' => $avatarUrl, 'uid' => $character['user_id']]);
            } catch (Throwable $e) {}
        }

        jsonResponse([
            'success' => true,
            'message' => 'Character updated successfully!',
            'character' => array_merge($character, [
                'display_name' => $displayName,
                'anime_name' => $animeName,
                'category' => $category,
                'description' => $description,
                'personality_summary' => $personality,
                'greeting' => $greeting,
                'avatar_url' => $avatarUrl,
                'banner_url' => $bannerUrl,
                'visibility' => $visibility
            ])
        ]);
    }

    /**
     * POST /api/characters/{id}/retrain
     * Add retraining data / knowledge base lore to AI character
     */
    public static function retrainCharacter(int $id): void {
        $user = AuthMiddleware::authenticate();
        $userId = (int)$user['id'];
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM ai_characters WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $character = $stmt->fetch();

        if (!$character) {
            jsonError('Character not found', 404);
        }

        if ($character['created_by'] != $userId && $character['user_id'] != $userId && ($user['role'] ?? '') !== 'admin') {
            jsonError('You do not have permission to retrain this character.', 403);
        }

        $body = getRequestBody();
        $fact = trim($body['fact'] ?? $body['lore'] ?? $body['retraining_data'] ?? '');

        if (empty($fact)) {
            jsonError('Retraining knowledge fact cannot be empty.', 400);
        }

        $ins = $db->prepare('
            INSERT INTO ai_character_memories (character_id, user_id, memory_key, memory_value, memory_type)
            VALUES (:cid, :uid, "lore_fact", :val, "retraining_lore")
        ');
        $ins->execute([
            'cid' => $id,
            'uid' => $userId,
            'val' => $fact
        ]);

        jsonResponse([
            'success' => true,
            'message' => 'Knowledge base fact added! Character has been retrained with this memory.',
            'memory' => [
                'id' => (int)$db->lastInsertId(),
                'memory_value' => $fact
            ]
        ]);
    }

    /**
     * DELETE /api/characters/{id}
     * Delete custom character
     */
    public static function deleteCharacter(int $id): void {
        $user = AuthMiddleware::authenticate();
        $userId = (int)$user['id'];
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM ai_characters WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $character = $stmt->fetch();

        if (!$character) {
            jsonError('Character not found', 404);
        }

        if ($character['created_by'] != $userId && $character['user_id'] != $userId && ($user['role'] ?? '') !== 'admin') {
            jsonError('You do not have permission to delete this character.', 403);
        }

        $db->prepare('UPDATE ai_characters SET status = "disabled" WHERE id = :id')->execute(['id' => $id]);

        jsonResponse([
            'success' => true,
            'message' => 'Character deleted successfully.'
        ]);
    }

    /**
     * POST /api/characters/{id}/start-chat
     */
    public static function startChat(string $charIdentifier): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        // 1. Find character
        $stmt = $db->prepare('SELECT * FROM ai_characters WHERE id = :id OR slug = :slug LIMIT 1');
        $stmt->execute(['id' => is_numeric($charIdentifier) ? (int)$charIdentifier : 0, 'slug' => $charIdentifier]);
        $character = $stmt->fetch();

        if (!$character || !$character['user_id']) {
            jsonError('Character not found or not active.', 404);
        }

        $aiUserId = (int)$character['user_id'];
        $currentUserId = (int)$user['id'];

        if ($aiUserId > 0 && !empty($character['avatar_url'])) {
            try {
                $db->prepare('UPDATE users SET avatar_url = :avatar, is_ai = 1, ai_character_id = :cid WHERE id = :uid')
                   ->execute(['avatar' => $character['avatar_url'], 'cid' => $character['id'], 'uid' => $aiUserId]);
            } catch (Throwable $e) {}
        }

        // 2. Find or Create Direct Conversation between user and AI character shadow user
        $convStmt = $db->prepare('
            SELECT c.id
            FROM conversations c
            JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = :u1
            JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = :u2
            WHERE c.type = "direct"
            LIMIT 1
        ');
        $convStmt->execute(['u1' => $currentUserId, 'u2' => $aiUserId]);
        $convId = (int)$convStmt->fetchColumn();

        if (!$convId) {
            // Create direct conversation
            $createStmt = $db->prepare('INSERT INTO conversations (type, creator_id) VALUES ("direct", :uid)');
            $createStmt->execute(['uid' => $currentUserId]);
            $convId = (int)$db->lastInsertId();

            // Add members
            $m1 = $db->prepare('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (:cid, :uid, "member")');
            $m1->execute(['cid' => $convId, 'uid' => $currentUserId]);
            
            $m2 = $db->prepare('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (:cid, :uid, "member")');
            $m2->execute(['cid' => $convId, 'uid' => $aiUserId]);

            // Increment character's conversation count
            $db->prepare('UPDATE ai_characters SET conversations_count = conversations_count + 1 WHERE id = :cid')->execute(['cid' => $character['id']]);

            // Post initial greeting message if available
            if (!empty($character['greeting'])) {
                $gStmt = $db->prepare('
                    INSERT INTO messages (conversation_id, sender_id, message_type, content)
                    VALUES (:cid, :sender_id, "text", :content)
                ');
                $gStmt->execute([
                    'cid' => $convId,
                    'sender_id' => $aiUserId,
                    'content' => $character['greeting']
                ]);
            }
        }

        jsonResponse([
            'success' => true,
            'conversation_id' => $convId,
            'character' => [
                'id' => $character['id'],
                'slug' => $character['slug'],
                'display_name' => $character['display_name'],
                'avatar_url' => $character['avatar_url']
            ]
        ]);
    }

    /**
     * POST /api/characters/chat-reply
     * Trigger AI response generation for conversation
     */
    public static function extractAndSaveMemory(PDO $db, int $characterId, int $userId, string $content): void {
        if (empty($content) || strlen($content) < 3) return;

        $patterns = [
            '/(?:my name is|i am|call me|i\'m)\s+([A-Za-z0-9_\s]{2,30})/i' => 'User Name',
            '/(?:i (?:love|like|enjoy|prefer))\s+([A-Za-z0-9_\s]{2,40})/i' => 'User Preference',
            '/(?:i (?:hate|dislike|can\'t stand))\s+([A-Za-z0-9_\s]{2,40})/i' => 'User Dislike',
            '/(?:i live in|i\'m from|i reside in)\s+([A-Za-z0-9_\s]{2,30})/i' => 'User Location',
            '/(?:my favorite|favorite)\s+([A-Za-z0-9_\s]{2,40})/i' => 'User Favorite'
        ];

        foreach ($patterns as $pattern => $factKey) {
            if (preg_match($pattern, $content, $matches)) {
                $factValue = trim($matches[1]);
                if (!empty($factValue)) {
                    try {
                        $ins = $db->prepare('
                            INSERT INTO ai_character_memories (character_id, user_id, fact_key, fact_value)
                            VALUES (:cid, :uid, :key, :val)
                        ');
                        $ins->execute([
                            'cid' => $characterId,
                            'uid' => $userId,
                            'key' => $factKey,
                            'val' => $factValue
                        ]);
                    } catch (Throwable $e) {}
                }
            }
        }
    }

    /**
     * POST /api/characters/chat-reply
     * Trigger AI response generation for conversation
     */
    public static function generateChatReply(): void {
        $user = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $convId = (int)($body['conversation_id'] ?? 0);
        $characterId = (int)($body['character_id'] ?? 0);

        if (!$convId) {
            jsonError('Conversation ID is required.');
        }

        $db = Database::getConnection();

        // Find character
        if (!$characterId) {
            // Find AI participant in conversation
            $findAi = $db->prepare('
                SELECT c.*, u.id AS shadow_user_id
                FROM conversation_members cm
                JOIN users u ON cm.user_id = u.id AND (u.is_ai = 1 OR u.username LIKE "ai_%")
                JOIN ai_characters c ON (u.ai_character_id = c.id OR c.user_id = u.id OR c.slug = REPLACE(u.username, "ai_", ""))
                WHERE cm.conversation_id = :cid
                LIMIT 1
            ');
            $findAi->execute(['cid' => $convId]);
            $character = $findAi->fetch();
        } else {
            $stmt = $db->prepare('SELECT * FROM ai_characters WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => $characterId]);
            $character = $stmt->fetch();
        }

        if (!$character) {
            jsonError('AI Character not found in conversation.', 404);
        }

        $aiUserId = (int)($character['user_id'] ?: ($character['shadow_user_id'] ?? 0));
        if (!$aiUserId) {
            jsonError('AI Character user profile not mapped.', 404);
        }

        // Build system prompt using CharacterPersonaEngine
        $systemPrompt = CharacterPersonaEngine::buildSystemPrompt($character, (int)$user['id'], $convId);

        $lockKey = "ai_reply_lock_" . $convId;
        try {
            $db->prepare("SELECT GET_LOCK(:lk, 5)")->execute(['lk' => $lockKey]);
        } catch (Throwable $e) {}

        $releaseLock = function() use ($db, $lockKey) {
            try {
                $db->prepare("SELECT RELEASE_LOCK(:lk)")->execute(['lk' => $lockKey]);
            } catch (Throwable $e) {}
        };

        // Fetch recent messages
        $msgStmt = $db->prepare('
            SELECT m.id, m.sender_id, m.content, u.display_name, u.is_ai
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = :cid AND m.is_deleted = 0
            ORDER BY m.id DESC
            LIMIT 15
        ');
        $msgStmt->execute(['cid' => $convId]);
        $rawHistory = $msgStmt->fetchAll();

        // Prevent twin duplicate replies: check if latest message was already sent by AI
        if (!empty($rawHistory) && (int)$rawHistory[0]['sender_id'] === (int)$aiUserId) {
            $latestAiMsg = $rawHistory[0];
            $releaseLock();
            jsonResponse([
                'success' => true,
                'message' => [
                    'id' => (int)$latestAiMsg['id'],
                    'conversation_id' => $convId,
                    'sender_id' => $aiUserId,
                    'sender_name' => decodeOutput($latestAiMsg['display_name']),
                    'sender_avatar' => $character['avatar_url'] ?? null,
                    'content' => decodeOutput($latestAiMsg['content']),
                    'created_at' => date('Y-m-d H:i:s')
                ],
                'already_replied' => true
            ]);
            return;
        }

        $history = array_reverse($rawHistory);

        // Find latest user message to reply directly to it (Right-Click / Quote Reply effect)
        $replyToId = null;
        $latestUserContent = '';
        foreach ($rawHistory as $m) {
            if ($m['sender_id'] != $aiUserId) {
                $replyToId = (int)$m['id'];
                $latestUserContent = $m['content'];
                break;
            }
        }

        // Extract and remember facts from user's message
        if (!empty($latestUserContent)) {
            self::extractAndSaveMemory($db, (int)$character['id'], (int)$user['id'], $latestUserContent);
        }

        // Image Intent Detection & Image Bank Search
        try {
            require_once __DIR__ . '/../services/CharacterImageIntentDetector.php';
            require_once __DIR__ . '/../services/CharacterImageBankService.php';

            $imageIntent = CharacterImageIntentDetector::detectIntent($latestUserContent, $history);
            if ($imageIntent['is_image_request']) {
                $foundImage = CharacterImageBankService::searchImage($db, (int)$character['id'], $imageIntent['mood'], (int)$user['id'], $convId);
                if ($foundImage && !empty($foundImage['image_url'])) {
                    // 1. Insert image attachment message
                    $imgIns = $db->prepare('
                        INSERT INTO messages (conversation_id, sender_id, message_type, content, reply_to_id, metadata)
                        VALUES (:cid, :sid, "image", :content, :reply_to_id, :meta)
                    ');
                    $imgMeta = json_encode([
                        'type' => 'image',
                        'character_id' => (int)$character['id'],
                        'character_image_id' => (int)($foundImage['id'] ?? 0),
                        'mood' => $imageIntent['mood']
                    ]);
                    $imgIns->execute([
                        'cid' => $convId,
                        'sid' => $aiUserId,
                        'content' => $foundImage['image_url'],
                        'reply_to_id' => $replyToId,
                        'meta' => $imgMeta
                    ]);
                    $imageMsgId = (int)$db->lastInsertId();

                    // 2. Generate natural follow-up text dialogue
                    $charName = $character['display_name'];
                    $followUpText = "Here you go. What do you think?";
                    if (stripos($charName, 'Rias') !== false) {
                        $followUpText = "Here is a picture of me. Do I satisfy your expectations?";
                    } else if (stripos($charName, 'Akeno') !== false) {
                        $followUpText = "Ara ara~ Here is my picture. Do you like what you see?";
                    } else if (stripos($charName, 'Albedo') !== false) {
                        $followUpText = "Here is my photo! Isn't Lord Ainz's Overseer magnificent?";
                    } else if (stripos($charName, 'Yoko') !== false) {
                        $followUpText = "Here's a photo! Keeping your sights locked on me?";
                    } else if (stripos($charName, 'Saber') !== false || stripos($charName, 'Artoria') !== false) {
                        $followUpText = "As requested, Master. Here is my picture.";
                    } else if (stripos($charName, 'Rem') !== false) {
                        $followUpText = "Here is a picture of Rem for you. I hope it brings a smile to your face.";
                    } else if (stripos($charName, 'Makima') !== false) {
                        $followUpText = "Here. How do I look to you?";
                    } else if (stripos($charName, 'Itachi') !== false) {
                        $followUpText = "Is this what you wanted to see?";
                    } else if (stripos($charName, 'Gojo') !== false) {
                        $followUpText = "Check this out! Pretty cool, right?";
                    } else if (stripos($charName, 'Luffy') !== false) {
                        $followUpText = "Shishishi! Look at this photo!";
                    } else if (stripos($charName, 'Naruto') !== false) {
                        $followUpText = "Dattebayo! Here's a photo for you!";
                    }

                    $textIns = $db->prepare('
                        INSERT INTO messages (conversation_id, sender_id, message_type, content, reply_to_id)
                        VALUES (:cid, :sid, "text", :content, :reply_to_id)
                    ');
                    $textIns->execute([
                        'cid' => $convId,
                        'sid' => $aiUserId,
                        'content' => $followUpText,
                        'reply_to_id' => $imageMsgId
                    ]);
                    $textMsgId = (int)$db->lastInsertId();

                    $db->prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = :cid')->execute(['cid' => $convId]);
                    $db->prepare('UPDATE ai_characters SET messages_count = messages_count + 1 WHERE id = :cid')->execute(['cid' => $character['id']]);

                    $releaseLock();
                    jsonResponse([
                        'success' => true,
                        'message' => [
                            'id' => $textMsgId,
                            'conversation_id' => $convId,
                            'sender_id' => $aiUserId,
                            'sender_name' => $character['display_name'],
                            'sender_avatar' => $character['avatar_url'],
                            'content' => $followUpText,
                            'reply_to_id' => $imageMsgId,
                            'created_at' => date('Y-m-d H:i:s')
                        ],
                        'image_sent' => [
                            'id' => $imageMsgId,
                            'image_url' => $foundImage['image_url'],
                            'mood' => $imageIntent['mood']
                        ],
                        'typing_duration_ms' => 800,
                        'provider_used' => 'image_bank'
                    ]);
                    return;
                }
            }
        } catch (Throwable $e) {
            error_log("Image Bank Intent Error: " . $e->getMessage());
        }

        $formattedMessages = [
            ['role' => 'system', 'content' => $systemPrompt]
        ];

        foreach ($history as $m) {
            $role = ($m['sender_id'] == $aiUserId) ? 'assistant' : 'user';
            $content = $m['content'];
            if ($role === 'user' && !empty($m['display_name'])) {
                $content = $m['display_name'] . ': ' . $content;
            }
            $formattedMessages[] = ['role' => $role, 'content' => $content];
        }

        // Call AIService with failover & fallback
        try {
            $result = AIService::generateResponse($formattedMessages, [
                'provider' => $character['ai_provider'] ?? 'auto',
                'model' => $character['ai_model'] ?? 'default',
                'temperature' => (float)($character['temperature'] ?? 0.8),
                'max_tokens' => 900,
                'character_id' => $character['id'],
                'conversation_id' => $convId,
                'user_id' => $user['id']
            ]);

            $replyText = $result['content'] ?? '...';

            $length = strlen($replyText);
            $typingDurationMs = min(4500, max(1200, (int)(1000 + ($length * 25))));

            // Insert AI message with reply_to_id
            $insMsg = $db->prepare('
                INSERT INTO messages (conversation_id, sender_id, message_type, content, reply_to_id)
                VALUES (:cid, :sender_id, "text", :content, :reply_to_id)
            ');
            $insMsg->execute([
                'cid' => $convId,
                'sender_id' => $aiUserId,
                'content' => $replyText,
                'reply_to_id' => $replyToId
            ]);
            $messageId = (int)$db->lastInsertId();

            // Update conversation & character statistics
            $db->prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = :cid')->execute(['cid' => $convId]);
            $db->prepare('UPDATE ai_characters SET messages_count = messages_count + 1 WHERE id = :cid')->execute(['cid' => $character['id']]);

            $releaseLock();
            jsonResponse([
                'success' => true,
                'message' => [
                    'id' => $messageId,
                    'conversation_id' => $convId,
                    'sender_id' => $aiUserId,
                    'sender_name' => $character['display_name'],
                    'sender_avatar' => $character['avatar_url'],
                    'content' => $replyText,
                    'reply_to_id' => $replyToId,
                    'created_at' => date('Y-m-d H:i:s')
                ],
                'typing_duration_ms' => $typingDurationMs,
                'provider_used' => $result['provider']
            ]);
        } catch (Throwable $e) {
            jsonError('AI Reply Generation Error: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Server-side async background worker for AI reply generation
     * Executes via shutdown hook or cron, replying even if user closes tab
     */
    public static function triggerBackgroundReply(int $convId, int $userId): void {
        try {
            $db = Database::getConnection();
            $findAi = $db->prepare('
                SELECT c.*, u.id AS shadow_user_id
                FROM conversation_members cm
                JOIN users u ON cm.user_id = u.id AND (u.is_ai = 1 OR u.username LIKE "ai_%")
                JOIN ai_characters c ON (u.ai_character_id = c.id OR c.user_id = u.id OR c.slug = REPLACE(u.username, "ai_", ""))
                WHERE cm.conversation_id = :cid
                LIMIT 1
            ');
            $findAi->execute(['cid' => $convId]);
            $character = $findAi->fetch();
            if (!$character) return;

            $aiUserId = (int)($character['user_id'] ?: ($character['shadow_user_id'] ?? 0));
            if (!$aiUserId) return;

            $lockKey = "ai_reply_lock_" . $convId;
            try {
                $db->prepare("SELECT GET_LOCK(:lk, 5)")->execute(['lk' => $lockKey]);
            } catch (Throwable $e) {}

            $releaseLock = function() use ($db, $lockKey) {
                try {
                    $db->prepare("SELECT RELEASE_LOCK(:lk)")->execute(['lk' => $lockKey]);
                } catch (Throwable $e) {}
            };

            // Check if latest message is from user and needs reply
            $msgStmt = $db->prepare('
                SELECT m.id, m.sender_id, m.content, u.display_name, u.is_ai
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = :cid AND m.is_deleted = 0
                ORDER BY m.id DESC
                LIMIT 15
            ');
            $msgStmt->execute(['cid' => $convId]);
            $rawHistory = $msgStmt->fetchAll();
            if (empty($rawHistory)) {
                $releaseLock();
                return;
            }

            $latestMsg = $rawHistory[0];
            if ((int)$latestMsg['sender_id'] === (int)$aiUserId) {
                $releaseLock();
                return; // Already replied
            }

            $replyToId = (int)$latestMsg['id'];
            $latestUserContent = $latestMsg['content'];

            self::extractAndSaveMemory($db, (int)$character['id'], $userId, $latestUserContent);

            $systemPrompt = CharacterPersonaEngine::buildSystemPrompt($character, $userId, $convId);
            $history = array_reverse($rawHistory);
            $formattedMessages = [['role' => 'system', 'content' => $systemPrompt]];

            foreach ($history as $m) {
                $role = ($m['sender_id'] == $aiUserId) ? 'assistant' : 'user';
                $content = $m['content'];
                if ($role === 'user' && !empty($m['display_name'])) {
                    $content = $m['display_name'] . ': ' . $content;
                }
                $formattedMessages[] = ['role' => $role, 'content' => $content];
            }

            $result = AIService::generateResponse($formattedMessages, [
                'provider' => $character['ai_provider'] ?? 'auto',
                'model' => $character['ai_model'] ?? 'default',
                'temperature' => (float)($character['temperature'] ?? 0.8),
                'max_tokens' => 900,
                'character_id' => $character['id'],
                'conversation_id' => $convId,
                'user_id' => $userId
            ]);

            $replyText = $result['content'] ?? '...';

            $insMsg = $db->prepare('
                INSERT INTO messages (conversation_id, sender_id, message_type, content, reply_to_id)
                VALUES (:cid, :sender_id, "text", :content, :reply_to_id)
            ');
            $insMsg->execute([
                'cid' => $convId,
                'sender_id' => $aiUserId,
                'content' => $replyText,
                'reply_to_id' => $replyToId
            ]);

            $db->prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = :cid')->execute(['cid' => $convId]);
            $db->prepare('UPDATE ai_characters SET messages_count = messages_count + 1 WHERE id = :cid')->execute(['cid' => $character['id']]);
            $releaseLock();
        } catch (Throwable $e) {
            error_log("triggerBackgroundReply error: " . $e->getMessage());
        }
    }

    /**
     * POST /api/characters/{id}/favorite
     */
    public static function toggleFavorite(string $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $charId = (int)$id;
        $userId = (int)$user['id'];

        $check = $db->prepare('SELECT COUNT(*) FROM ai_character_favorites WHERE user_id = :uid AND character_id = :cid');
        $check->execute(['uid' => $userId, 'cid' => $charId]);
        $isFav = $check->fetchColumn() > 0;

        if ($isFav) {
            $db->prepare('DELETE FROM ai_character_favorites WHERE user_id = :uid AND character_id = :cid')->execute(['uid' => $userId, 'cid' => $charId]);
            $db->prepare('UPDATE ai_characters SET likes_count = GREATEST(0, likes_count - 1) WHERE id = :cid')->execute(['cid' => $charId]);
            $favState = false;
        } else {
            $db->prepare('INSERT IGNORE INTO ai_character_favorites (user_id, character_id) VALUES (:uid, :cid)')->execute(['uid' => $userId, 'cid' => $charId]);
            $db->prepare('UPDATE ai_characters SET likes_count = likes_count + 1 WHERE id = :cid')->execute(['cid' => $charId]);
            $favState = true;
        }

        jsonResponse(['success' => true, 'is_favorite' => $favState]);
    }

    /**
     * GET /api/characters/{id}/memories
     */
    public static function getMemories(string $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM ai_character_memories WHERE character_id = :cid AND user_id = :uid ORDER BY id DESC');
        $stmt->execute(['cid' => (int)$id, 'uid' => $user['id']]);

        jsonResponse(['success' => true, 'memories' => $stmt->fetchAll()]);
    }

    /**
     * POST /api/admin/characters/import-anilist
     */
    public static function importAniListBatch(): void {
        $page = (int)($_GET['page'] ?? $_POST['page'] ?? 1);
        $perPage = (int)($_GET['per_page'] ?? $_POST['per_page'] ?? 25);

        try {
            $res = CharacterImporterService::importFromAniList($page, $perPage);
            jsonResponse($res);
        } catch (Throwable $t) {
            jsonError($t->getMessage(), 500);
        }
    }

    /**
     * GET /api/characters/{id}/images
     */
    public static function getCharacterImages(string $id): void {
        $db = Database::getConnection();
        $charId = (int)$id;

        $stmt = $db->prepare("
            SELECT i.*, 
                   (SELECT GROUP_CONCAT(tag) FROM character_image_tags WHERE image_id = i.id) AS tags
            FROM character_images i
            WHERE i.character_id = :cid AND i.is_safe = 1 AND i.moderation_status = 'approved'
            ORDER BY i.id DESC
        ");
        $stmt->execute(['cid' => $charId]);
        $images = $stmt->fetchAll();

        jsonResponse(['success' => true, 'images' => $images]);
    }

    /**
     * POST /api/characters/{id}/images
     * Custom character mood image upload
     */
    public static function uploadCharacterImage(string $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $body = getRequestBody();
        $charId = (int)$id;

        $imageUrl = sanitizeInput($body['image_url'] ?? '');
        if (empty($imageUrl)) {
            jsonError('Image URL is required.');
        }

        $mood = sanitizeInput($body['mood'] ?? 'default');
        $style = sanitizeInput($body['style'] ?? 'portrait');
        $tags = is_array($body['tags'] ?? null) ? $body['tags'] : [$mood, $style];

        require_once __DIR__ . '/../services/CharacterImageBankService.php';
        $imageId = CharacterImageBankService::addImage($db, [
            'character_id' => $charId,
            'source' => 'custom',
            'image_url' => $imageUrl,
            'mood' => $mood,
            'style' => $style,
            'is_safe' => 1,
            'is_verified' => 1,
            'moderation_status' => 'approved',
            'tags' => $tags
        ]);

        jsonResponse(['success' => true, 'image_id' => $imageId, 'message' => 'Image added to character bank successfully.']);
    }

    /**
     * GET /api/admin/character-images
     */
    public static function getAdminImageModeration(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $status = sanitizeInput($_GET['status'] ?? 'all');

        $where = [];
        $params = [];
        if ($status !== 'all') {
            $where[] = 'i.moderation_status = :status';
            $params['status'] = $status;
        }

        $whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $sql = "
            SELECT i.*, c.display_name AS character_name, c.avatar_url AS character_avatar
            FROM character_images i
            JOIN ai_characters c ON i.character_id = c.id
            {$whereSql}
            ORDER BY i.id DESC
            LIMIT 100
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        jsonResponse(['success' => true, 'images' => $stmt->fetchAll()]);
    }

    /**
     * POST /api/admin/character-images/{id}
     */
    public static function updateAdminImageStatus(string $imageId): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $body = getRequestBody();

        $status = in_array($body['moderation_status'] ?? '', ['approved', 'rejected', 'pending']) ? $body['moderation_status'] : 'approved';
        $isSafe = isset($body['is_safe']) ? (int)$body['is_safe'] : 1;

        $stmt = $db->prepare('UPDATE character_images SET moderation_status = :mod, is_safe = :safe WHERE id = :id');
        $stmt->execute(['mod' => $status, 'safe' => $isSafe, 'id' => (int)$imageId]);

        jsonResponse(['success' => true, 'message' => 'Image moderation status updated.']);
    }

    public static function ensureNewAnimeCharactersSeeded(PDO $db): void {
        try {
            $newAnimeCharacters = [
                [
                    'slug' => 'rias-gremory',
                    'display_name' => 'Rias Gremory',
                    'anime_name' => 'High School DxD',
                    'source' => 'anilist',
                    'description' => 'The High-Class Devil and heiress of the Gremory family. Known as the Crimson-Haired Ruin Princess, she is the President of the Occult Research Club, elegant, regal, and fiercely protective of her house.',
                    'personality_summary' => 'Regal • Elegant • Protective • Crimson Devil',
                    'greeting' => "Welcome to the Occult Research Club. I am Rias Gremory. What brings you to me today?",
                    'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b50389-gIhJkyk8xj1P.png',
                    'category' => 'Anime',
                    'gender' => 'Female',
                    'tags' => ['Anime', 'High School DxD', 'Devil', 'Regal', 'Elegant'],
                    'conversations_count' => 175000,
                    'likes_count' => 18400,
                    'persona' => [
                        'speaking_style' => 'Refined, commanding, polite, deeply warm towards trusted companions',
                        'tone' => 'Regal, charming, protective',
                        'likes' => ['Occult Research Club', 'Chess', 'Red hair', 'House members'],
                        'dislikes' => ['Disloyal devils', 'Threats to her family']
                    ],
                    'images' => ['https://s4.anilist.co/file/anilistcdn/character/large/b50389-gIhJkyk8xj1P.png']
                ],
                [
                    'slug' => 'akeno-himejima',
                    'display_name' => 'Akeno Himejima',
                    'anime_name' => 'High School DxD',
                    'source' => 'anilist',
                    'description' => 'Vice-President of the Occult Research Club and Priestess of Thunder. Soft-spoken, seductive, and playful in conversation, yet terrifyingly powerful with lightning magic in battle.',
                    'personality_summary' => 'Seductive • Teasing • Gentle • Priestess of Thunder',
                    'greeting' => "Ara ara~ Welcome. I am Akeno. Are you here to seek my guidance... or perhaps something a bit more exciting?",
                    'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b51347-YMb9fndAriXd.png',
                    'category' => 'Anime',
                    'gender' => 'Female',
                    'tags' => ['Anime', 'High School DxD', 'Seductive', 'Flirty', 'Thunder'],
                    'conversations_count' => 162000,
                    'likes_count' => 17100,
                    'persona' => [
                        'speaking_style' => 'Teasing, uses phrase "Ara ara~", soft-spoken and playful',
                        'tone' => 'Seductive, gentle, affectionate',
                        'likes' => ['Tea time', 'Occult Research Club', 'Lightning magic', 'Teasing friends'],
                        'dislikes' => ['Stuffy rules', 'Rude behavior']
                    ],
                    'images' => ['https://s4.anilist.co/file/anilistcdn/character/large/b51347-YMb9fndAriXd.png']
                ],
                [
                    'slug' => 'albedo-overlord',
                    'display_name' => 'Albedo',
                    'anime_name' => 'Overlord',
                    'source' => 'anilist',
                    'description' => 'Overseer of the Floor Guardians of the Great Tomb of Nazarick. Impeccably beautiful succubus adorned in white horns and raven wings, fiercely loyal and fanatically devoted to Lord Ainz Ooal Gown.',
                    'personality_summary' => 'Fanatical • Elegant • Fierce Guardian • Devoted',
                    'greeting' => "Greetings. I am Albedo, Overseer of the Guardians of Nazarick. Speak your business quickly—unless it involves the supreme glory of Lord Ainz.",
                    'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b89122-Gj7MBs7F5cMJ.png',
                    'category' => 'Anime',
                    'gender' => 'Female',
                    'tags' => ['Anime', 'Overlord', 'Guardian', 'Demon', 'Devoted'],
                    'conversations_count' => 198000,
                    'likes_count' => 21300,
                    'persona' => [
                        'speaking_style' => 'Majestic, noble, haughty towards outsiders, intensely passionate about Lord Ainz',
                        'tone' => 'Dominant, elegant, fiercely devoted',
                        'likes' => ['Lord Ainz Ooal Gown', 'Great Tomb of Nazarick', 'Ainz plushies'],
                        'dislikes' => ['Disrespect to Nazarick', 'Lesser humans']
                    ],
                    'images' => ['https://s4.anilist.co/file/anilistcdn/character/large/b89122-Gj7MBs7F5cMJ.png']
                ],
                [
                    'slug' => 'yoko-littner',
                    'display_name' => 'Yoko Littner',
                    'anime_name' => 'Gurren Lagann',
                    'source' => 'anilist',
                    'description' => 'A sharpshooter from the underground village of Littner. Armed with a high-caliber sniper rifle, she is confident, fierce, independent, and always ready to stand on the front lines.',
                    'personality_summary' => 'Sharpshooter • Confident • Independent • Heroic',
                    'greeting' => "Hey there! Keep your eyes sharp. I'm Yoko. Ready to pierce the heavens with us?",
                    'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b2063-7BKqQbrhtDD2.png',
                    'category' => 'Anime',
                    'gender' => 'Female',
                    'tags' => ['Anime', 'Gurren Lagann', 'Hero', 'Sharpshooter', 'Cool'],
                    'conversations_count' => 141000,
                    'likes_count' => 15200,
                    'persona' => [
                        'speaking_style' => 'Direct, tough, energetic, friendly big-sister vibe',
                        'tone' => 'Bold, fearless, encouraging',
                        'likes' => ['Sniper rifles', 'Gurren Lagann crew', 'Target practice', 'Adventure'],
                        'dislikes' => ['Giving up', 'Beastmen commanders']
                    ],
                    'images' => ['https://s4.anilist.co/file/anilistcdn/character/large/b2063-7BKqQbrhtDD2.png']
                ],
                [
                    'slug' => 'saber-artoria',
                    'display_name' => 'Saber (Artoria Pendragon)',
                    'anime_name' => 'Fate/stay night',
                    'source' => 'anilist',
                    'description' => 'The King of Knights summoned as a Servant for the Holy Grail War. Wielding Excalibur, she is noble, strictly honorable, resolute in duty, with a surprisingly earnest appetite for delicious food.',
                    'personality_summary' => 'Noble • Honorable • Resolute • Servant of Excalibur',
                    'greeting' => "I ask of you: Are you my Master? I am Saber. My sword is yours to command.",
                    'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b497-Yg5pNmC8kxzs.png',
                    'category' => 'Anime',
                    'gender' => 'Female',
                    'tags' => ['Anime', 'Fate/stay night', 'Hero', 'Knight', 'Excalibur'],
                    'conversations_count' => 225000,
                    'likes_count' => 24800,
                    'persona' => [
                        'speaking_style' => 'Formal, chivalrous, polite, addresses user as "Master"',
                        'tone' => 'Honorable, dignified, solemn yet caring',
                        'likes' => ['Good food', 'Chivalry', 'Sword practice', 'Lions'],
                        'dislikes' => ['Dishonorable tactics', 'Uncooked food', 'Broken oaths']
                    ],
                    'images' => ['https://s4.anilist.co/file/anilistcdn/character/large/b497-Yg5pNmC8kxzs.png']
                ],
                [
                    'slug' => 'rem-rezero',
                    'display_name' => 'Rem',
                    'anime_name' => 'Re:Zero - Starting Life in Another World',
                    'source' => 'anilist',
                    'description' => 'A maid working at the Roswaal mansion alongside her twin sister Ram. Polite, incredibly devoted, skilled with a morningstar in battle, and possessing a gentle heart.',
                    'personality_summary' => 'Devoted • Polite • Gentle • Morningstar Maid',
                    'greeting' => "Good day. I am Rem, maid of the Roswaal mansion. Please allow me to assist you with anything you need.",
                    'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b88575-Ayu8UPDA8NS6.png',
                    'category' => 'Anime',
                    'gender' => 'Female',
                    'tags' => ['Anime', 'Re:Zero', 'Maid', 'Gentle', 'Cute'],
                    'conversations_count' => 189000,
                    'likes_count' => 20500,
                    'persona' => [
                        'speaking_style' => 'Polite, third-person references to Rem, soft and gentle phrasing',
                        'tone' => 'Devoted, caring, warm',
                        'likes' => ['Subaru', 'Ram', 'Cleaning', 'Cooking'],
                        'dislikes' => ['Witch Cult', 'Seeing loved ones hurt']
                    ],
                    'images' => ['https://s4.anilist.co/file/anilistcdn/character/large/b88575-Ayu8UPDA8NS6.png']
                ]
            ];

            foreach ($newAnimeCharacters as $c) {
                $slug = $c['slug'];
                $uname = 'ai_' . str_replace('-', '_', $slug);
                $uStmt = $db->prepare('SELECT id FROM users WHERE username = :uname LIMIT 1');
                $uStmt->execute(['uname' => $uname]);
                $userId = $uStmt->fetchColumn();

                if (!$userId) {
                    $insU = $db->prepare('
                        INSERT INTO users (display_name, username, email, password_hash, is_ai, is_verified, avatar_url)
                        VALUES (:name, :uname, :email, :pass, 1, 1, :avatar)
                    ');
                    $insU->execute([
                        'name' => $c['display_name'],
                        'uname' => $uname,
                        'email' => $uname . '@ai.markanm.com',
                        'pass' => password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                        'avatar' => $c['avatar_url']
                    ]);
                    $userId = (int)$db->lastInsertId();
                } else {
                    $db->prepare('UPDATE users SET avatar_url = :avatar WHERE id = :uid')->execute(['avatar' => $c['avatar_url'], 'uid' => $userId]);
                }

                $tagsJson = json_encode($c['tags']);
                $personaJson = json_encode($c['persona']);

                // Always update avatar_url to the verified live AniList CDN URL
                $updChar = $db->prepare('
                    UPDATE ai_characters SET 
                        avatar_url = :avatar,
                        display_name = :name,
                        anime_name = :anime,
                        description = :desc,
                        personality_summary = :summary,
                        greeting = :greeting,
                        category = :category,
                        gender = :gender,
                        tags_json = :tags,
                        persona_json = :persona,
                        status = "active"
                    WHERE slug = :slug
                ');
                $updChar->execute([
                    'avatar' => $c['avatar_url'],
                    'name' => $c['display_name'],
                    'anime' => $c['anime_name'],
                    'desc' => $c['description'],
                    'summary' => $c['personality_summary'],
                    'greeting' => $c['greeting'],
                    'category' => $c['category'],
                    'gender' => $c['gender'],
                    'tags' => $tagsJson,
                    'persona' => $personaJson,
                    'slug' => $slug
                ]);

                if ($updChar->rowCount() === 0) {
                    $ins = $db->prepare('
                        INSERT INTO ai_characters
                        (slug, display_name, anime_name, source, description, personality_summary, greeting, avatar_url, category, gender, tags_json, persona_json, conversations_count, likes_count, is_official, user_id, status)
                        VALUES
                        (:slug, :name, :anime, :source, :desc, :summary, :greeting, :avatar, :category, :gender, :tags, :persona, :convs, :likes, 1, :uid, "active")
                    ');
                    $ins->execute([
                        'slug' => $slug,
                        'name' => $c['display_name'],
                        'anime' => $c['anime_name'],
                        'source' => $c['source'],
                        'desc' => $c['description'],
                        'summary' => $c['personality_summary'],
                        'greeting' => $c['greeting'],
                        'avatar' => $c['avatar_url'],
                        'category' => $c['category'],
                        'gender' => $c['gender'],
                        'tags' => $tagsJson,
                        'persona' => $personaJson,
                        'convs' => $c['conversations_count'],
                        'likes' => $c['likes_count'],
                        'uid' => $userId
                    ]);
                }
            }
        } catch (Throwable $e) {}
    }
}
