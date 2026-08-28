<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class DiscoverController {

    /**
     * GET /api/discover
     */
    public static function getDiscoverFeed(): void {
        $currentUser = null;
        try {
            $currentUser = AuthMiddleware::authenticate();
        } catch (Throwable $e) {
            // Unauthenticated guest preview supported
        }
        $currentUserId = $currentUser ? (int)$currentUser['id'] : 0;

        $db = Database::getConnection();

        // 1. Fetch Categories
        $catStmt = $db->query('SELECT id, name, slug, description FROM room_categories ORDER BY name ASC');
        $categories = $catStmt->fetchAll();

        // 2. Fetch User Interests (if logged in)
        $userInterests = [];
        if ($currentUserId > 0) {
            $intStmt = $db->prepare('SELECT interest FROM user_interests WHERE user_id = :uid');
            $intStmt->execute(['uid' => $currentUserId]);
            $userInterests = array_column($intStmt->fetchAll(), 'interest');
        }

        // 3. Helper to format room data
        $formatRoom = function($r) use ($db) {
            $tagsStmt = $db->prepare('SELECT tag FROM room_tags WHERE room_id = :rid');
            $tagsStmt->execute(['rid' => $r['id']]);
            $tags = array_column($tagsStmt->fetchAll(), 'tag');

            return [
                'id' => (int)$r['id'],
                'code' => $r['code'],
                'title' => decodeOutput($r['title']),
                'description' => decodeOutput($r['description']),
                'category_name' => $r['category_name'] ?? 'Random',
                'category_slug' => $r['category_slug'] ?? 'random',
                'type' => $r['type'],
                'status' => $r['status'],
                'expires_at' => $r['expires_at'],
                'created_at' => $r['created_at'],
                'active_participants_count' => (int)($r['active_count'] ?? 1),
                'tags' => $tags,
                'creator' => [
                    'id' => (int)$r['creator_id'],
                    'display_name' => decodeOutput($r['creator_name']),
                    'username' => $r['creator_username'],
                    'avatar_url' => $r['creator_avatar']
                ]
            ];
        };

        // 4. Live Now Rooms
        $liveStmt = $db->prepare('
            SELECT r.*, c.name AS category_name, c.slug AS category_slug,
                   u.display_name AS creator_name, u.username AS creator_username, u.avatar_url AS creator_avatar,
                   (
                       SELECT COUNT(*)
                       FROM room_members rm
                       WHERE rm.room_id = r.id AND rm.last_active_at >= NOW() - INTERVAL 60 SECOND
                   ) AS active_count
            FROM rooms r
            LEFT JOIN room_categories c ON r.category_id = c.id
            JOIN users u ON r.creator_id = u.id
            WHERE r.status = "live" AND r.type = "public"
              AND (r.expires_at IS NULL OR r.expires_at > NOW())
            ORDER BY active_count DESC, r.created_at DESC
            LIMIT 12
        ');
        $liveStmt->execute();
        $liveRooms = array_map($formatRoom, $liveStmt->fetchAll());

        // 5. Trending Rooms (Ranked by recency + active participants + message activity)
        $trendingStmt = $db->prepare('
            SELECT r.*, c.name AS category_name, c.slug AS category_slug,
                   u.display_name AS creator_name, u.username AS creator_username, u.avatar_url AS creator_avatar,
                   (
                       SELECT COUNT(*)
                       FROM room_members rm
                       WHERE rm.room_id = r.id AND rm.last_active_at >= NOW() - INTERVAL 60 SECOND
                   ) AS active_count,
                   (
                       SELECT COUNT(*)
                       FROM messages m
                       WHERE m.conversation_id = r.conversation_id AND m.created_at >= NOW() - INTERVAL 24 HOUR
                   ) AS msg_count,
                   (
                       (
                           (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id AND rm.last_active_at >= NOW() - INTERVAL 60 SECOND) * 10
                       ) +
                       (
                           (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = r.conversation_id AND m.created_at >= NOW() - INTERVAL 24 HOUR) * 2
                       ) +
                       (
                           100 / (1 + TIMESTAMPDIFF(HOUR, r.created_at, NOW()))
                       )
                   ) AS trending_score
            FROM rooms r
            LEFT JOIN room_categories c ON r.category_id = c.id
            JOIN users u ON r.creator_id = u.id
            WHERE r.status = "live" AND r.type = "public"
              AND (r.expires_at IS NULL OR r.expires_at > NOW())
            ORDER BY trending_score DESC
            LIMIT 12
        ');
        $trendingStmt->execute();
        $trendingRooms = array_map($formatRoom, $trendingStmt->fetchAll());

        // 6. Recommended Rooms (by User Interests)
        $recommendedRooms = [];
        if (!empty($userInterests)) {
            $inClause = implode(',', array_fill(0, count($userInterests), '?'));
            $recSql = "
                SELECT DISTINCT r.*, c.name AS category_name, c.slug AS category_slug,
                       u.display_name AS creator_name, u.username AS creator_username, u.avatar_url AS creator_avatar,
                       (
                           SELECT COUNT(*)
                           FROM room_members rm
                           WHERE rm.room_id = r.id AND rm.last_active_at >= NOW() - INTERVAL 60 SECOND
                       ) AS active_count
                FROM rooms r
                LEFT JOIN room_categories c ON r.category_id = c.id
                JOIN users u ON r.creator_id = u.id
                LEFT JOIN room_tags rt ON r.id = rt.room_id
                WHERE r.status = 'live' AND r.type = 'public'
                  AND (r.expires_at IS NULL OR r.expires_at > NOW())
                  AND (c.name IN ($inClause) OR rt.tag IN ($inClause))
                ORDER BY active_count DESC, r.created_at DESC
                LIMIT 12
            ";
            $recStmt = $db->prepare($recSql);
            $bindParams = array_merge($userInterests, $userInterests);
            $recStmt->execute($bindParams);
            $recommendedRooms = array_map($formatRoom, $recStmt->fetchAll());
        }

        if (empty($recommendedRooms)) {
            $recommendedRooms = array_slice($trendingRooms, 0, 6);
        }

        // 7. New Rooms
        $newStmt = $db->prepare('
            SELECT r.*, c.name AS category_name, c.slug AS category_slug,
                   u.display_name AS creator_name, u.username AS creator_username, u.avatar_url AS creator_avatar,
                   (
                       SELECT COUNT(*)
                       FROM room_members rm
                       WHERE rm.room_id = r.id AND rm.last_active_at >= NOW() - INTERVAL 60 SECOND
                   ) AS active_count
            FROM rooms r
            LEFT JOIN room_categories c ON r.category_id = c.id
            JOIN users u ON r.creator_id = u.id
            WHERE r.status = "live" AND r.type = "public"
              AND (r.expires_at IS NULL OR r.expires_at > NOW())
            ORDER BY r.created_at DESC
            LIMIT 12
        ');
        $newStmt->execute();
        $newRooms = array_map($formatRoom, $newStmt->fetchAll());

        // 8. Discoverable People
        $peopleStmt = $db->prepare('
            SELECT u.id, u.display_name, u.username, u.avatar_url, u.bio, p.status AS presence_status
            FROM users u
            LEFT JOIN user_presence p ON u.id = p.user_id
            WHERE u.id != :uid
            ORDER BY p.last_seen_at DESC, u.created_at DESC
            LIMIT 10
        ');
        $peopleStmt->execute(['uid' => $currentUserId]);
        $people = array_map(function($p) {
            return [
                'id' => (int)$p['id'],
                'display_name' => decodeOutput($p['display_name']),
                'username' => $p['username'],
                'avatar_url' => $p['avatar_url'],
                'bio' => decodeOutput($p['bio']),
                'presence' => $p['presence_status'] ?: 'offline'
            ];
        }, $peopleStmt->fetchAll());

        jsonResponse([
            'success' => true,
            'categories' => $categories,
            'user_interests' => $userInterests,
            'live_now' => $liveRooms,
            'trending' => $trendingRooms,
            'recommended' => $recommendedRooms,
            'new_rooms' => $newRooms,
            'people' => $people
        ]);
    }

    /**
     * GET /api/search?q=...&type=all|people|rooms|communities
     */
    public static function search(): void {
        $query = trim($_GET['q'] ?? '');
        $type = trim($_GET['type'] ?? 'all');

        if (strlen($query) < 1) {
            jsonResponse(['success' => true, 'people' => [], 'rooms' => []]);
        }

        $db = Database::getConnection();
        $searchTerm = '%' . $query . '%';

        $people = [];
        if (in_array($type, ['all', 'people'])) {
            $pStmt = $db->prepare('
                SELECT id, display_name, username, avatar_url, bio
                FROM users
                WHERE username LIKE :q1 OR display_name LIKE :q2
                ORDER BY display_name ASC
                LIMIT 15
            ');
            $pStmt->execute(['q1' => $searchTerm, 'q2' => $searchTerm]);
            $people = array_map(function($p) {
                return [
                    'id' => (int)$p['id'],
                    'display_name' => decodeOutput($p['display_name']),
                    'username' => $p['username'],
                    'avatar_url' => $p['avatar_url'],
                    'bio' => decodeOutput($p['bio'])
                ];
            }, $pStmt->fetchAll());
        }

        $rooms = [];
        if (in_array($type, ['all', 'rooms', 'communities'])) {
            $rStmt = $db->prepare('
                SELECT DISTINCT r.*, c.name AS category_name, c.slug AS category_slug,
                       u.display_name AS creator_name, u.username AS creator_username, u.avatar_url AS creator_avatar,
                       (
                           SELECT COUNT(*)
                           FROM room_members rm
                           WHERE rm.room_id = r.id AND rm.last_active_at >= NOW() - INTERVAL 60 SECOND
                       ) AS active_count
                FROM rooms r
                LEFT JOIN room_categories c ON r.category_id = c.id
                JOIN users u ON r.creator_id = u.id
                LEFT JOIN room_tags rt ON r.id = rt.room_id
                WHERE r.status = "live" AND r.type = "public"
                  AND (r.title LIKE :q1 OR r.description LIKE :q2 OR rt.tag LIKE :q3 OR c.name LIKE :q4)
                ORDER BY active_count DESC, r.created_at DESC
                LIMIT 15
            ');
            $rStmt->execute(['q1' => $searchTerm, 'q2' => $searchTerm, 'q3' => $searchTerm, 'q4' => $searchTerm]);
            $rawRooms = $rStmt->fetchAll();

            $rooms = array_map(function($r) use ($db) {
                $tagsStmt = $db->prepare('SELECT tag FROM room_tags WHERE room_id = :rid');
                $tagsStmt->execute(['rid' => $r['id']]);
                $tags = array_column($tagsStmt->fetchAll(), 'tag');

                return [
                    'id' => (int)$r['id'],
                    'code' => $r['code'],
                    'title' => decodeOutput($r['title']),
                    'description' => decodeOutput($r['description']),
                    'category_name' => $r['category_name'],
                    'category_slug' => $r['category_slug'],
                    'type' => $r['type'],
                    'status' => $r['status'],
                    'active_participants_count' => (int)($r['active_count'] ?? 1),
                    'tags' => $tags,
                    'creator' => [
                        'id' => (int)$r['creator_id'],
                        'display_name' => decodeOutput($r['creator_name']),
                        'username' => $r['creator_username'],
                        'avatar_url' => $r['creator_avatar']
                    ]
                ];
            }, $rawRooms);
        }

        jsonResponse([
            'success' => true,
            'people' => $people,
            'rooms' => $rooms
        ]);
    }
}
