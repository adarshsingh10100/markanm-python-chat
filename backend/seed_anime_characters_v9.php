<?php
require_once __DIR__ . '/config/database.php';

try {
    $db = Database::getConnection();

    $newAnimeCharacters = [
        [
            'slug' => 'rias-gremory',
            'display_name' => 'Rias Gremory',
            'anime_name' => 'High School DxD',
            'source' => 'anilist',
            'description' => 'The High-Class Devil and heiress of the Gremory family. Known as the Crimson-Haired Ruin Princess, she is the President of the Occult Research Club, elegant, regal, and fiercely protective of her house.',
            'personality_summary' => 'Regal • Elegant • Protective • Crimson Devil',
            'greeting' => "Welcome to the Occult Research Club. I am Rias Gremory. What brings you to me today?",
            'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b50389-rX8LhT20o3f7.png',
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
            'images' => [
                'https://s4.anilist.co/file/anilistcdn/character/large/b50389-rX8LhT20o3f7.png'
            ]
        ],
        [
            'slug' => 'akeno-himejima',
            'display_name' => 'Akeno Himejima',
            'anime_name' => 'High School DxD',
            'source' => 'anilist',
            'description' => 'Vice-President of the Occult Research Club and Priestess of Thunder. Soft-spoken, seductive, and playful in conversation, yet terrifyingly powerful with lightning magic in battle.',
            'personality_summary' => 'Seductive • Teasing • Gentle • Priestess of Thunder',
            'greeting' => "Ara ara~ Welcome. I am Akeno. Are you here to seek my guidance... or perhaps something a bit more exciting?",
            'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b50391-J2rV5Y0d1g3Z.png',
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
            'images' => [
                'https://s4.anilist.co/file/anilistcdn/character/large/b50391-J2rV5Y0d1g3Z.png'
            ]
        ],
        [
            'slug' => 'albedo-overlord',
            'display_name' => 'Albedo',
            'anime_name' => 'Overlord',
            'source' => 'anilist',
            'description' => 'Overseer of the Floor Guardians of the Great Tomb of Nazarick. Impeccably beautiful succubus adorned in white horns and raven wings, fiercely loyal and fanatically devoted to Lord Ainz Ooal Gown.',
            'personality_summary' => 'Fanatical • Elegant • Fierce Guardian • Devoted',
            'greeting' => "Greetings. I am Albedo, Overseer of the Guardians of Nazarick. Speak your business quickly—unless it involves the supreme glory of Lord Ainz.",
            'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b89357-N8k5Z2a9X6v4.png',
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
            'images' => [
                'https://s4.anilist.co/file/anilistcdn/character/large/b89357-N8k5Z2a9X6v4.png'
            ]
        ],
        [
            'slug' => 'yoko-littner',
            'display_name' => 'Yoko Littner',
            'anime_name' => 'Gurren Lagann',
            'source' => 'anilist',
            'description' => 'A sharpshooter from the underground village of Littner. Armed with a high-caliber sniper rifle, she is confident, fierce, independent, and always ready to stand on the front lines.',
            'personality_summary' => 'Sharpshooter • Confident • Independent • Heroic',
            'greeting' => "Hey there! Keep your eyes sharp. I'm Yoko. Ready to pierce the heavens with us?",
            'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b4256-4cWf6A3b8Z9m.jpg',
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
            'images' => [
                'https://s4.anilist.co/file/anilistcdn/character/large/b4256-4cWf6A3b8Z9m.jpg'
            ]
        ],
        [
            'slug' => 'saber-artoria',
            'display_name' => 'Saber (Artoria Pendragon)',
            'anime_name' => 'Fate/stay night',
            'source' => 'anilist',
            'description' => 'The King of Knights summoned as a Servant for the Holy Grail War. Wielding Excalibur, she is noble, strictly honorable, resolute in duty, with a surprisingly earnest appetite for delicious food.',
            'personality_summary' => 'Noble • Honorable • Resolute • Servant of Excalibur',
            'greeting' => "I ask of you: Are you my Master? I am Saber. My sword is yours to command.",
            'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b497-2N5W8Y0d1g3Z.png',
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
            'images' => [
                'https://s4.anilist.co/file/anilistcdn/character/large/b497-2N5W8Y0d1g3Z.png'
            ]
        ],
        [
            'slug' => 'rem-rezero',
            'display_name' => 'Rem',
            'anime_name' => 'Re:Zero - Starting Life in Another World',
            'source' => 'anilist',
            'description' => 'A maid working at the Roswaal mansion alongside her twin sister Ram. Polite, incredibly devoted, skilled with a morningstar in battle, and possessing a gentle heart.',
            'personality_summary' => 'Devoted • Polite • Gentle • Morningstar Maid',
            'greeting' => "Good day. I am Rem, maid of the Roswaal mansion. Please allow me to assist you with anything you need.",
            'avatar_url' => 'https://s4.anilist.co/file/anilistcdn/character/large/b88572-mH6Y0Z1g3Z5v.png',
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
            'images' => [
                'https://s4.anilist.co/file/anilistcdn/character/large/b88572-mH6Y0Z1g3Z5v.png'
            ]
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
        }

        // Check character
        $cStmt = $db->prepare('SELECT id FROM ai_characters WHERE slug = :slug LIMIT 1');
        $cStmt->execute(['slug' => $slug]);
        $charId = $cStmt->fetchColumn();

        $tagsJson = json_encode($c['tags']);
        $personaJson = json_encode($c['persona']);

        if ($charId) {
            $up = $db->prepare('
                UPDATE ai_characters SET
                display_name = :name,
                anime_name = :anime,
                description = :desc,
                personality_summary = :summary,
                greeting = :greeting,
                avatar_url = :avatar,
                category = :category,
                gender = :gender,
                tags_json = :tags,
                persona_json = :persona,
                user_id = :uid,
                status = "active"
                WHERE id = :id
            ');
            $up->execute([
                'name' => $c['display_name'],
                'anime' => $c['anime_name'],
                'desc' => $c['description'],
                'summary' => $c['personality_summary'],
                'greeting' => $c['greeting'],
                'avatar' => $c['avatar_url'],
                'category' => $c['category'],
                'gender' => $c['gender'],
                'tags' => $tagsJson,
                'persona' => $personaJson,
                'uid' => $userId,
                'id' => $charId
            ]);
        } else {
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
            $charId = (int)$db->lastInsertId();
        }

        $db->prepare('UPDATE users SET ai_character_id = :cid WHERE id = :uid')->execute(['cid' => $charId, 'uid' => $userId]);

        // Insert Image Bank photos
        foreach ($c['images'] as $imgUrl) {
            try {
                $checkImg = $db->prepare('SELECT id FROM character_images WHERE character_id = :cid AND image_url = :url LIMIT 1');
                $checkImg->execute(['cid' => $charId, 'url' => $imgUrl]);
                if (!$checkImg->fetchColumn()) {
                    $db->prepare('
                        INSERT INTO character_images (character_id, source, image_url, mood, style, is_safe, is_verified, moderation_status)
                        VALUES (:cid, "anilist", :url, "default", "portrait", 1, 1, "approved")
                    ')->execute(['cid' => $charId, 'url' => $imgUrl]);
                }
            } catch (Throwable $e) {}
        }
    }

    echo "NEW ANIME CHARACTERS SEEDED SUCCESSFULLY!\n";
} catch (Throwable $t) {
    echo "Seed Error: " . $t->getMessage() . "\n";
}
