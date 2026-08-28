<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class RoomController {

    /**
     * Helper to expire outdated live rooms
     */
    private static function checkExpiredRooms(): void {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare('UPDATE rooms SET status = "ended" WHERE status = "live" AND expires_at IS NOT NULL AND expires_at <= NOW()');
            $stmt->execute();
        } catch (Throwable $e) {
            // Non-blocking background cleanup
        }
    }

    /**
     * POST /api/rooms
     */
    public static function create(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $title = sanitizeInput($body['title'] ?? '');
        $description = sanitizeInput($body['description'] ?? '');
        $categoryId = (int)($body['category_id'] ?? 16);
        $type = in_array($body['type'] ?? '', ['public', 'unlisted', 'private']) ? $body['type'] : 'public';
        $tags = is_array($body['tags'] ?? null) ? $body['tags'] : [];
        $duration = sanitizeInput($body['duration'] ?? 'none'); // 30m, 1h, 3h, 6h, 12h, 24h, none
        $maxParticipants = !empty($body['max_participants']) ? (int)$body['max_participants'] : null;

        if (empty($title)) {
            jsonError('Room title is required.', 422);
        }

        // Calculate expiration date
        $expiresAt = null;
        if ($duration !== 'none') {
            $intervalMap = [
                '30m' => '+30 minutes',
                '1h'  => '+1 hour',
                '3h'  => '+3 hours',
                '6h'  => '+6 hours',
                '12h' => '+12 hours',
                '24h' => '+24 hours'
            ];
            if (isset($intervalMap[$duration])) {
                $expiresAt = date('Y-m-d H:i:s', strtotime($intervalMap[$duration]));
            }
        }

        $code = bin2hex(random_bytes(5)); // Unique 10-character code e.g. 'a7f3b9c1d2'
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            // 1. Create linked conversation
            $convStmt = $db->prepare('
                INSERT INTO conversations (type, name, description, creator_id)
                VALUES ("group", :name, :description, :creator_id)
            ');
            $convStmt->execute([
                'name' => $title,
                'description' => $description,
                'creator_id' => $currentUser['id']
            ]);
            $convId = (int)$db->lastInsertId();

            // 2. Create Room
            $roomStmt = $db->prepare('
                INSERT INTO rooms (code, title, description, category_id, type, creator_id, conversation_id, max_participants, status, expires_at)
                VALUES (:code, :title, :description, :category_id, :type, :creator_id, :conv_id, :max_p, "live", :expires_at)
            ');
            $roomStmt->execute([
                'code' => $code,
                'title' => $title,
                'description' => $description,
                'category_id' => $categoryId,
                'type' => $type,
                'creator_id' => $currentUser['id'],
                'conv_id' => $convId,
                'max_p' => $maxParticipants,
                'expires_at' => $expiresAt
            ]);
            $roomId = (int)$db->lastInsertId();

            // 3. Add tags
            if (is_array($tags)) {
                $tagStmt = $db->prepare('INSERT INTO room_tags (room_id, tag) VALUES (:rid, :tag)');
                foreach ($tags as $t) {
                    $cleanTag = strtolower(trim(ltrim($t, '#')));
                    if (!empty($cleanTag)) {
                        $tagStmt->execute(['rid' => $roomId, 'tag' => '#' . $cleanTag]);
                    }
                }
            }

            // 4. Add owner to conversation_members and room_members
            $cmStmt = $db->prepare('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (:cid, :uid, "owner")');
            $cmStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);

            $rmStmt = $db->prepare('INSERT INTO room_members (room_id, user_id, role, last_active_at) VALUES (:rid, :uid, "owner", NOW())');
            $rmStmt->execute(['rid' => $roomId, 'uid' => $currentUser['id']]);

            $db->commit();

            jsonResponse([
                'success' => true,
                'message' => 'Live room created successfully!',
                'room' => [
                    'id' => $roomId,
                    'code' => $code,
                    'title' => $title,
                    'description' => $description,
                    'type' => $type,
                    'expires_at' => $expiresAt,
                    'room_url' => APP_URL . '/room/' . $code
                ]
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to create live room: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/rooms/{code}
     */
    public static function get(string $code): void {
        self::checkExpiredRooms();
        $currentUser = null;
        try {
            $currentUser = AuthMiddleware::authenticate();
        } catch (Throwable $e) {
            // Guest preview access allowed for public/unlisted rooms
        }

        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT r.id, r.code, r.title, r.description, r.category_id, r.type, r.creator_id, r.conversation_id,
                   r.max_participants, r.status, r.expires_at, r.created_at,
                   c.name AS category_name, c.slug AS category_slug,
                   u.display_name AS creator_name, u.username AS creator_username, u.avatar_url AS creator_avatar
            FROM rooms r
            LEFT JOIN room_categories c ON r.category_id = c.id
            JOIN users u ON r.creator_id = u.id
            WHERE r.code = :code
            LIMIT 1
        ');
        $stmt->execute(['code' => $code]);
        $room = $stmt->fetch();

        if (!$room) {
            jsonError('Live room not found.', 404);
        }

        $currentUserId = $currentUser ? (int)$currentUser['id'] : 0;

        // Check if user is banned from this room
        if ($currentUserId > 0) {
            $banStmt = $db->prepare('SELECT id FROM room_bans WHERE room_id = :rid AND user_id = :uid LIMIT 1');
            $banStmt->execute(['rid' => $room['id'], 'uid' => $currentUserId]);
            if ($banStmt->fetch()) {
                jsonError('You have been banned from this live room by the host.', 403);
            }
        }

        // Fetch room tags
        $tagsStmt = $db->prepare('SELECT tag FROM room_tags WHERE room_id = :rid');
        $tagsStmt->execute(['rid' => $room['id']]);
        $tags = array_column($tagsStmt->fetchAll(), 'tag');

        // Calculate active participants (heartbeat within 60 seconds)
        $activeStmt = $db->prepare('
            SELECT COUNT(*)
            FROM room_members
            WHERE room_id = :rid AND last_active_at >= NOW() - INTERVAL 60 SECOND
        ');
        $activeStmt->execute(['rid' => $room['id']]);
        $activeCount = (int)$activeStmt->fetchColumn();

        // Total members count
        $totalStmt = $db->prepare('SELECT COUNT(*) FROM room_members WHERE room_id = :rid');
        $totalStmt->execute(['rid' => $room['id']]);
        $totalMembers = (int)$totalStmt->fetchColumn();

        // Active participants details
        $participantsStmt = $db->prepare('
            SELECT rm.user_id, rm.role, rm.last_active_at, u.display_name, u.username, u.avatar_url
            FROM room_members rm
            JOIN users u ON rm.user_id = u.id
            WHERE rm.room_id = :rid AND rm.last_active_at >= NOW() - INTERVAL 60 SECOND
            ORDER BY rm.role DESC, rm.last_active_at DESC
            LIMIT 20
        ');
        $participantsStmt->execute(['rid' => $room['id']]);
        $activeParticipants = $participantsStmt->fetchAll();

        // User membership & follow state
        $isMember = false;
        $isFollowing = false;
        $myRole = null;

        if ($currentUserId > 0) {
            $memStmt = $db->prepare('SELECT role FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1');
            $memStmt->execute(['rid' => $room['id'], 'uid' => $currentUserId]);
            $mem = $memStmt->fetch();
            if ($mem) {
                $isMember = true;
                $myRole = $mem['role'];
            }

            $folStmt = $db->prepare('SELECT id FROM room_follows WHERE room_id = :rid AND user_id = :uid LIMIT 1');
            $folStmt->execute(['rid' => $room['id'], 'uid' => $currentUserId]);
            $isFollowing = (bool)$folStmt->fetch();
        }

        jsonResponse([
            'success' => true,
            'room' => [
                'id' => (int)$room['id'],
                'code' => $room['code'],
                'title' => decodeOutput($room['title']),
                'description' => decodeOutput($room['description']),
                'category' => [
                    'id' => (int)$room['category_id'],
                    'name' => $room['category_name'],
                    'slug' => $room['category_slug']
                ],
                'type' => $room['type'],
                'status' => $room['status'],
                'conversation_id' => (int)$room['conversation_id'],
                'max_participants' => $room['max_participants'] ? (int)$room['max_participants'] : null,
                'active_participants_count' => max($activeCount, $isMember ? 1 : 0),
                'total_members_count' => $totalMembers,
                'tags' => $tags,
                'expires_at' => $room['expires_at'],
                'created_at' => $room['created_at'],
                'creator' => [
                    'id' => (int)$room['creator_id'],
                    'display_name' => decodeOutput($room['creator_name']),
                    'username' => $room['creator_username'],
                    'avatar_url' => $room['creator_avatar']
                ],
                'is_member' => $isMember,
                'is_following' => $isFollowing,
                'my_role' => $myRole,
                'active_participants' => array_map(function($p) {
                    return [
                        'user_id' => (int)$p['user_id'],
                        'display_name' => decodeOutput($p['display_name']),
                        'username' => $p['username'],
                        'avatar_url' => $p['avatar_url'],
                        'role' => $p['role']
                    ];
                }, $activeParticipants)
            ]
        ]);
    }

    /**
     * POST /api/rooms/{code}/join
     */
    public static function join(string $code): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id, conversation_id, max_participants, status FROM rooms WHERE code = :code LIMIT 1');
        $stmt->execute(['code' => $code]);
        $room = $stmt->fetch();

        if (!$room) {
            jsonError('Room not found.', 404);
        }

        if ($room['status'] === 'ended') {
            jsonError('This live room has already ended.', 410);
        }

        // Check ban status
        $banStmt = $db->prepare('SELECT id FROM room_bans WHERE room_id = :rid AND user_id = :uid LIMIT 1');
        $banStmt->execute(['rid' => $room['id'], 'uid' => $currentUser['id']]);
        if ($banStmt->fetch()) {
            jsonError('You are banned from joining this room.', 403);
        }

        // Check participant limit
        if (!empty($room['max_participants'])) {
            $countStmt = $db->prepare('SELECT COUNT(*) FROM room_members WHERE room_id = :rid');
            $countStmt->execute(['rid' => $room['id']]);
            $currentCount = (int)$countStmt->fetchColumn();

            if ($currentCount >= (int)$room['max_participants']) {
                jsonError('Room is currently full.', 429);
            }
        }

        // Add to conversation_members and room_members
        $db->beginTransaction();
        try {
            $cmStmt = $db->prepare('
                INSERT INTO conversation_members (conversation_id, user_id, role)
                VALUES (:cid, :uid, "member")
                ON DUPLICATE KEY UPDATE role = role
            ');
            $cmStmt->execute(['cid' => $room['conversation_id'], 'uid' => $currentUser['id']]);

            $rmStmt = $db->prepare('
                INSERT INTO room_members (room_id, user_id, role, last_active_at)
                VALUES (:rid, :uid, "member", NOW())
                ON DUPLICATE KEY UPDATE last_active_at = NOW()
            ');
            $rmStmt->execute(['rid' => $room['id'], 'uid' => $currentUser['id']]);

            $db->commit();

            jsonResponse(['success' => true, 'message' => 'Joined room successfully']);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to join room: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/rooms/{code}/leave
     */
    public static function leave(string $code): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id, conversation_id FROM rooms WHERE code = :code LIMIT 1');
        $stmt->execute(['code' => $code]);
        $room = $stmt->fetch();

        if ($room) {
            $rm = $db->prepare('DELETE FROM room_members WHERE room_id = :rid AND user_id = :uid');
            $rm->execute(['rid' => $room['id'], 'uid' => $currentUser['id']]);

            $cm = $db->prepare('DELETE FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid AND role != "owner"');
            $cm->execute(['cid' => $room['conversation_id'], 'uid' => $currentUser['id']]);
        }

        jsonResponse(['success' => true, 'message' => 'Left room successfully']);
    }

    /**
     * POST /api/rooms/{code}/heartbeat
     */
    public static function heartbeat(string $code): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM rooms WHERE code = :code LIMIT 1');
        $stmt->execute(['code' => $code]);
        $room = $stmt->fetch();

        if ($room) {
            $hb = $db->prepare('
                UPDATE room_members
                SET last_active_at = NOW()
                WHERE room_id = :rid AND user_id = :uid
            ');
            $hb->execute(['rid' => $room['id'], 'uid' => $currentUser['id']]);
        }

        jsonResponse(['success' => true]);
    }

    /**
     * POST /api/rooms/{code}/follow
     */
    public static function toggleFollow(string $code): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM rooms WHERE code = :code LIMIT 1');
        $stmt->execute(['code' => $code]);
        $room = $stmt->fetch();

        if (!$room) {
            jsonError('Room not found', 404);
        }

        $check = $db->prepare('SELECT id FROM room_follows WHERE room_id = :rid AND user_id = :uid LIMIT 1');
        $check->execute(['rid' => $room['id'], 'uid' => $currentUser['id']]);
        $existing = $check->fetch();

        if ($existing) {
            $del = $db->prepare('DELETE FROM room_follows WHERE id = :id');
            $del->execute(['id' => $existing['id']]);
            jsonResponse(['success' => true, 'is_following' => false, 'message' => 'Unfollowed room']);
        } else {
            $ins = $db->prepare('INSERT INTO room_follows (room_id, user_id) VALUES (:rid, :uid)');
            $ins->execute(['rid' => $room['id'], 'uid' => $currentUser['id']]);
            jsonResponse(['success' => true, 'is_following' => true, 'message' => 'Following room']);
        }
    }

    /**
     * POST /api/rooms/{code}/ban
     */
    public static function banUser(string $code): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $targetUserId = (int)($body['target_user_id'] ?? 0);
        $reason = sanitizeInput($body['reason'] ?? 'Violation of room rules');

        if ($targetUserId <= 0) {
            jsonError('Invalid target user', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id, creator_id, conversation_id FROM rooms WHERE code = :code LIMIT 1');
        $stmt->execute(['code' => $code]);
        $room = $stmt->fetch();

        if (!$room) {
            jsonError('Room not found', 404);
        }

        // Verify host/admin
        $roleStmt = $db->prepare('SELECT role FROM room_members WHERE room_id = :rid AND user_id = :uid LIMIT 1');
        $roleStmt->execute(['rid' => $room['id'], 'uid' => $currentUser['id']]);
        $myRole = $roleStmt->fetch();

        if (!$myRole || !in_array($myRole['role'], ['owner', 'admin'])) {
            jsonError('Only room owners or admins can ban participants.', 403);
        }

        $db->beginTransaction();
        try {
            $ins = $db->prepare('
                INSERT INTO room_bans (room_id, user_id, banned_by, reason)
                VALUES (:rid, :uid, :banned_by, :reason)
                ON DUPLICATE KEY UPDATE reason = :reason
            ');
            $ins->execute(['rid' => $room['id'], 'uid' => $targetUserId, 'banned_by' => $currentUser['id'], 'reason' => $reason]);

            $rm = $db->prepare('DELETE FROM room_members WHERE room_id = :rid AND user_id = :uid');
            $rm->execute(['rid' => $room['id'], 'uid' => $targetUserId]);

            $cm = $db->prepare('DELETE FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid');
            $cm->execute(['cid' => $room['conversation_id'], 'uid' => $targetUserId]);

            $db->commit();
            jsonResponse(['success' => true, 'message' => 'Participant banned successfully']);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to ban user: ' . $e->getMessage(), 500);
        }
    }
}
