<?php

class CharacterImageBankService {

    /**
     * Search best matching character image from Image Bank
     */
    public static function searchImage(PDO $db, int $characterId, string $requestedMood, int $userId, int $conversationId): ?array {
        if ($characterId <= 0) return null;

        $mood = strtolower(trim($requestedMood)) ?: 'default';

        // 1. Fetch recent image IDs used in this conversation to prevent repetition ("exclude last 3")
        $recentStmt = $db->prepare('
            SELECT image_id 
            FROM character_image_usage 
            WHERE conversation_id = :cid AND character_id = :char_id 
            ORDER BY id DESC 
            LIMIT 3
        ');
        $recentStmt->execute(['cid' => $conversationId, 'char_id' => $characterId]);
        $recentImageIds = array_column($recentStmt->fetchAll(), 'image_id');

        $notInClause = '';
        if (!empty($recentImageIds)) {
            $idsClean = array_map('intval', $recentImageIds);
            $notInClause = 'AND id NOT IN (' . implode(',', $idsClean) . ')';
        }

        // 2. Query candidates for character
        $stmt = $db->prepare("
            SELECT i.*, 
                   (SELECT GROUP_CONCAT(tag) FROM character_image_tags WHERE image_id = i.id) AS tags
            FROM character_images i
            WHERE i.character_id = :char_id
              AND i.is_safe = 1
              AND i.moderation_status = 'approved'
              {$notInClause}
            ORDER BY i.id DESC
            LIMIT 50
        ");
        $stmt->execute(['char_id' => $characterId]);
        $candidates = $stmt->fetchAll();

        // 3. Fallback to all images (ignoring exclusion if count is too low)
        if (empty($candidates) && !empty($recentImageIds)) {
            $stmtAll = $db->prepare("
                SELECT i.*, 
                       (SELECT GROUP_CONCAT(tag) FROM character_image_tags WHERE image_id = i.id) AS tags
                FROM character_images i
                WHERE i.character_id = :char_id
                  AND i.is_safe = 1
                  AND i.moderation_status = 'approved'
                ORDER BY i.id DESC
                LIMIT 50
            ");
            $stmtAll->execute(['char_id' => $characterId]);
            $candidates = $stmtAll->fetchAll();
        }

        // If no candidate exists in character_images, fallback to main character avatar picture
        if (empty($candidates)) {
            $charStmt = $db->prepare('SELECT avatar_url, display_name FROM ai_characters WHERE id = :id LIMIT 1');
            $charStmt->execute(['id' => $characterId]);
            $charData = $charStmt->fetch();

            if ($charData && !empty($charData['avatar_url'])) {
                return [
                    'id' => 0,
                    'character_id' => $characterId,
                    'image_url' => $charData['avatar_url'],
                    'mood' => 'default',
                    'style' => 'portrait',
                    'is_fallback_avatar' => true
                ];
            }
            return null;
        }

        // 4. Scoring Algorithm
        $scored = [];
        foreach ($candidates as $img) {
            $score = 0;
            $imgMood = strtolower($img['mood'] ?? '');
            $imgTags = strtolower($img['tags'] ?? '');

            if ($mood !== 'default' && $imgMood === $mood) {
                $score += 50;
            } else if ($mood !== 'default' && strpos($imgTags, $mood) !== false) {
                $score += 30;
            } else if ($imgMood === 'default' || $imgMood === 'portrait') {
                $score += 10;
            }

            if (!empty($img['is_verified'])) {
                $score += 20;
            }

            $scored[] = [
                'image' => $img,
                'score' => $score
            ];
        }

        // Sort by score DESC
        usort($scored, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });

        // Top candidate with controlled randomness among top 3
        $topScore = $scored[0]['score'];
        $topCandidates = array_filter($scored, function($item) use ($topScore) {
            return $item['score'] >= max(0, $topScore - 20);
        });

        $chosen = $topCandidates[array_rand($topCandidates)]['image'];

        // 5. Record usage
        if ($chosen['id'] > 0) {
            try {
                $rec = $db->prepare('
                    INSERT INTO character_image_usage (image_id, character_id, user_id, conversation_id, requested_mood)
                    VALUES (:img_id, :char_id, :uid, :cid, :mood)
                ');
                $rec->execute([
                    'img_id' => $chosen['id'],
                    'char_id' => $characterId,
                    'uid' => $userId,
                    'cid' => $conversationId,
                    'mood' => $mood
                ]);
            } catch (Throwable $e) {}
        }

        return $chosen;
    }

    /**
     * Add new image to Character Image Bank
     */
    public static function addImage(PDO $db, array $data): int {
        $stmt = $db->prepare('
            INSERT INTO character_images
            (character_id, source, source_id, image_url, thumbnail_url, mood, style, is_safe, is_verified, moderation_status, source_url)
            VALUES
            (:cid, :source, :sid, :url, :thumb, :mood, :style, :safe, :verified, :mod, :surl)
        ');
        $stmt->execute([
            'cid' => $data['character_id'],
            'source' => $data['source'] ?? 'custom',
            'sid' => $data['source_id'] ?? null,
            'url' => $data['image_url'],
            'thumb' => $data['thumbnail_url'] ?? $data['image_url'],
            'mood' => $data['mood'] ?? 'default',
            'style' => $data['style'] ?? 'portrait',
            'safe' => $data['is_safe'] ?? 1,
            'verified' => $data['is_verified'] ?? 1,
            'mod' => $data['moderation_status'] ?? 'approved',
            'surl' => $data['source_url'] ?? null
        ]);
        $imageId = (int)$db->lastInsertId();

        // Insert tags
        if (!empty($data['tags']) && is_array($data['tags'])) {
            $tagStmt = $db->prepare('INSERT INTO character_image_tags (image_id, tag) VALUES (:img_id, :tag)');
            foreach ($data['tags'] as $t) {
                $cleanTag = strtolower(trim($t));
                if (!empty($cleanTag)) {
                    $tagStmt->execute(['img_id' => $imageId, 'tag' => $cleanTag]);
                }
            }
        }

        return $imageId;
    }
}
