<?php
require_once __DIR__ . '/../config/database.php';

class CharacterImporterService {

    /**
     * Import characters from AniList GraphQL API in paginated batches
     */
    public static function importFromAniList(int $page = 1, int $perPage = 25): array {
        $query = '
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo {
              currentPage
              hasNextPage
            }
            characters(sort: FAVOURITES_DESC) {
              id
              name {
                full
                native
                alternative
              }
              image {
                large
                medium
              }
              description
              gender
              dateOfBirth {
                year
                month
                day
              }
              siteUrl
              media(sort: POPULARITY_DESC, perPage: 1) {
                nodes {
                  title {
                    romaji
                    english
                  }
                }
              }
            }
          }
        }
        ';

        $payload = json_encode([
            'query' => $query,
            'variables' => [
                'page' => $page,
                'perPage' => $perPage
            ]
        ]);

        $ch = curl_init('https://graphql.anilist.co');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_TIMEOUT => 20
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400 || !$response) {
            throw new Exception("AniList API Error (HTTP {$httpCode}): {$response}");
        }

        $decoded = json_decode($response, true);
        $charactersData = $decoded['data']['Page']['characters'] ?? [];
        $pageInfo = $decoded['data']['Page']['pageInfo'] ?? [];

        $imported = [];
        $db = Database::getConnection();

        foreach ($charactersData as $c) {
            $fullName = trim($c['name']['full'] ?? '');
            if (empty($fullName)) continue;

            $sourceId = (string)$c['id'];
            $animeTitle = $c['media']['nodes'][0]['title']['english'] ?? $c['media']['nodes'][0]['title']['romaji'] ?? 'Anime';
            $description = strip_tags($c['description'] ?? '');
            if (strlen($description) > 1000) {
                $description = substr($description, 0, 997) . '...';
            }

            $avatarUrl = $c['image']['large'] ?? $c['image']['medium'] ?? '';
            $gender = $c['gender'] ?? 'Unknown';

            // Generate clean slug
            $slugBase = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $fullName));
            $slug = trim($slugBase, '-');
            
            // Check if character already exists
            $checkStmt = $db->prepare('SELECT id, slug, user_id FROM ai_characters WHERE source = "anilist" AND source_id = :sid LIMIT 1');
            $checkStmt->execute(['sid' => $sourceId]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                // Update
                $updateStmt = $db->prepare('
                    UPDATE ai_characters SET
                    display_name = :name,
                    anime_name = :anime,
                    description = :desc,
                    avatar_url = :avatar,
                    gender = :gender
                    WHERE id = :id
                ');
                $updateStmt->execute([
                    'name' => $fullName,
                    'anime' => $animeTitle,
                    'desc' => $description,
                    'avatar' => $avatarUrl,
                    'gender' => $gender,
                    'id' => $existing['id']
                ]);
                $imported[] = ['id' => $existing['id'], 'name' => $fullName, 'status' => 'updated'];
            } else {
                // Ensure unique slug
                $slugCheck = $db->prepare('SELECT COUNT(*) FROM ai_characters WHERE slug = :s');
                $slugCheck->execute(['s' => $slug]);
                if ($slugCheck->fetchColumn() > 0) {
                    $slug .= '-' . substr(md5($sourceId), 0, 5);
                }

                // Create Shadow User record for messaging integration
                $uname = 'ai_' . preg_replace('/[^a-z0-9_]/i', '', strtolower($slug));
                if (strlen($uname) > 30) $uname = substr($uname, 0, 30);
                
                $uStmt = $db->prepare('SELECT id FROM users WHERE username = :uname LIMIT 1');
                $uStmt->execute(['uname' => $uname]);
                $userId = $uStmt->fetchColumn();

                if (!$userId) {
                    $insU = $db->prepare('
                        INSERT INTO users (display_name, username, email, password_hash, is_ai, is_verified, avatar_url)
                        VALUES (:name, :uname, :email, :pass, 1, 1, :avatar)
                    ');
                    $insU->execute([
                        'name' => $fullName,
                        'uname' => $uname,
                        'email' => $uname . '@ai.markanm.com',
                        'pass' => password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                        'avatar' => $avatarUrl
                    ]);
                    $userId = (int)$db->lastInsertId();
                }

                // Default Persona
                $tags = json_encode(['Anime', $animeTitle, 'Fictional', $gender]);
                $persona = json_encode([
                    'speaking_style' => 'Casual and in-character for ' . $fullName . ' from ' . $animeTitle,
                    'tone' => 'Engaging, expressive, anime roleplay',
                    'scenario' => 'Chatting on MarkanM Chat platform'
                ]);

                $insC = $db->prepare('
                    INSERT INTO ai_characters
                    (slug, display_name, anime_name, source, source_id, source_url, description, personality_summary, greeting, avatar_url, gender, category, tags_json, persona_json, is_official, user_id)
                    VALUES
                    (:slug, :name, :anime, "anilist", :sid, :surl, :desc, :summary, :greeting, :avatar, :gender, "Anime", :tags, :persona, 1, :uid)
                ');

                $greeting = "Greetings... I was expecting you. What brings you to me today?";
                if (stripos($fullName, 'Makima') !== false) {
                    $greeting = "All humans are foolish, yet... interesting. Tell me, are you willing to be my loyal pet?";
                } else if (stripos($fullName, 'Gojo') !== false) {
                    $greeting = "Yo! Don't worry, I'm the strongest! So, what trouble are we getting into today?";
                } else if (stripos($fullName, 'Itachi') !== false) {
                    $greeting = "People live their lives bound by what they accept as correct and true... Tell me, why do you stand before me?";
                } else if (stripos($fullName, 'Luffy') !== false) {
                    $greeting = "Shishishi! I'm gonna be King of the Pirates! Got any meat?";
                } else if (stripos($fullName, 'Eren') !== false) {
                    $greeting = "If we don't fight, we can't win! Are you ready to fight for your freedom?";
                } else if (stripos($fullName, 'Levi') !== false) {
                    $greeting = "Clean up this room before you talk to me. Tch. What do you want?";
                } else if (stripos($fullName, 'Frieren') !== false) {
                    $greeting = "It's been a long journey... Tell me, what kind of magic or adventure are you searching for?";
                }
                $insC->execute([
                    'slug' => $slug,
                    'name' => $fullName,
                    'anime' => $animeTitle,
                    'sid' => $sourceId,
                    'surl' => $c['siteUrl'] ?? '',
                    'desc' => $description,
                    'summary' => "Energetic and loyal fictional character from {$animeTitle}.",
                    'greeting' => $greeting,
                    'avatar' => $avatarUrl,
                    'gender' => $gender,
                    'tags' => $tags,
                    'persona' => $persona,
                    'uid' => $userId
                ]);

                $charId = (int)$db->lastInsertId();

                // Link back user record
                $db->prepare('UPDATE users SET ai_character_id = :cid WHERE id = :uid')->execute(['cid' => $charId, 'uid' => $userId]);

                // Populate main image into Character Image Bank
                if (!empty($avatarUrl)) {
                    self::importMainImageToBank($db, $charId, $avatarUrl, 'anilist', $sourceId);
                }

                $imported[] = ['id' => $charId, 'name' => $fullName, 'status' => 'created'];
            }
        }

        return [
            'success' => true,
            'imported_count' => count($imported),
            'page' => $page,
            'has_next_page' => $pageInfo['hasNextPage'] ?? false,
            'items' => $imported
        ];
    }

    /**
     * Store character portrait in Image Bank
     */
    public static function importMainImageToBank(PDO $db, int $characterId, string $imageUrl, string $source = 'anilist', ?string $sourceId = null): void {
        if (empty($imageUrl) || $characterId <= 0) return;
        try {
            require_once __DIR__ . '/CharacterImageBankService.php';
            CharacterImageBankService::addImage($db, [
                'character_id' => $characterId,
                'source' => $source,
                'source_id' => $sourceId,
                'image_url' => $imageUrl,
                'mood' => 'default',
                'style' => 'portrait',
                'is_safe' => 1,
                'is_verified' => 1,
                'moderation_status' => 'approved',
                'tags' => ['portrait', 'default', 'official']
            ]);
        } catch (Throwable $e) {}
    }

    /**
     * Fetch pictures for character from Jikan API (/characters/{id}/pictures)
     */
    public static function importJikanPictures(int $malId, int $characterId): int {
        if ($malId <= 0 || $characterId <= 0) return 0;
        
        $url = "https://api.jikan.moe/v4/characters/{$malId}/pictures";
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_HTTPHEADER => ['User-Agent: MarkanMChat/1.0']
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        if (empty($response)) return 0;

        $decoded = json_decode($response, true);
        $data = $decoded['data'] ?? [];
        if (empty($data) || !is_array($data)) return 0;

        $db = Database::getConnection();
        require_once __DIR__ . '/CharacterImageBankService.php';

        $count = 0;
        foreach ($data as $item) {
            $imgUrl = $item['jpg']['image_url'] ?? $item['image_url'] ?? null;
            if (empty($imgUrl)) continue;

            try {
                CharacterImageBankService::addImage($db, [
                    'character_id' => $characterId,
                    'source' => 'jikan',
                    'source_id' => (string)$malId,
                    'image_url' => $imgUrl,
                    'mood' => 'default',
                    'style' => 'gallery',
                    'is_safe' => 1,
                    'is_verified' => 1,
                    'moderation_status' => 'approved',
                    'source_url' => "https://myanimelist.net/character/{$malId}",
                    'tags' => ['gallery', 'jikan', 'official']
                ]);
                $count++;
            } catch (Throwable $e) {}
        }

        return $count;
    }
}
