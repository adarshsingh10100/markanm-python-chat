<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/HashUtils.php';

class ExperienceController {

    /**
     * GET /api/experiences
     * Public Experience Directory with real database statistics
     */
    public static function listDirectory(): void {
        $db = Database::getConnection();
        $category = sanitizeInput($_GET['category'] ?? '');
        $query = sanitizeInput($_GET['q'] ?? '');
        $filter = sanitizeInput($_GET['filter'] ?? 'trending');

        $sql = '
            SELECT e.*, u.display_name AS developer_name, u.username AS developer_username
            FROM experiences e
            JOIN users u ON e.developer_id = u.id
            WHERE e.status = "published"
        ';
        $params = [];

        if (!empty($category) && $category !== 'All') {
            $sql .= ' AND e.category = :cat';
            $params['cat'] = $category;
        }

        if (!empty($query)) {
            $sql .= ' AND (e.name LIKE :q OR e.description LIKE :q OR e.tagline LIKE :q)';
            $params['q'] = '%' . $query . '%';
        }

        if ($filter === 'featured') {
            $sql .= ' ORDER BY e.is_featured DESC, e.total_users DESC';
        } else if ($filter === 'new') {
            $sql .= ' ORDER BY e.created_at DESC';
        } else if ($filter === 'popular') {
            $sql .= ' ORDER BY e.total_users DESC';
        } else {
            $sql .= ' ORDER BY (e.total_users * 0.6 + e.total_sessions * 0.4) DESC';
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $experiences = $stmt->fetchAll();

        jsonResponse([
            'success' => true,
            'experiences' => array_map(function($e) {
                return [
                    'id' => (int)$e['id'],
                    'slug' => $e['slug'],
                    'name' => decodeOutput($e['name']),
                    'tagline' => decodeOutput($e['tagline']),
                    'icon_url' => $e['icon_url'],
                    'banner_url' => $e['banner_url'],
                    'description' => decodeOutput($e['description']),
                    'category' => $e['category'],
                    'website_url' => $e['website_url'],
                    'embed_url' => $e['embed_url'],
                    'developer_name' => decodeOutput($e['developer_name']),
                    'developer_username' => $e['developer_username'],
                    'status' => $e['status'],
                    'total_users' => (int)$e['total_users'],
                    'total_sessions' => (int)$e['total_sessions'],
                    'rating_avg' => (float)$e['rating_avg'],
                    'rating_count' => (int)$e['rating_count'],
                    'is_featured' => (bool)$e['is_featured'],
                    'is_first_party' => (bool)$e['is_first_party'],
                    'created_at' => $e['created_at']
                ];
            }, $experiences)
        ]);
    }

    /**
     * GET /api/experiences/{slug}
     */
    public static function getBySlug(string $slug): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT e.*, u.display_name AS developer_name, u.username AS developer_username, u.avatar_url AS developer_avatar
            FROM experiences e
            JOIN users u ON e.developer_id = u.id
            WHERE e.slug = :slug OR e.id = :id
            LIMIT 1
        ');
        $stmt->execute(['slug' => $slug, 'id' => is_numeric($slug) ? (int)$slug : 0]);
        $exp = $stmt->fetch();

        if (!$exp) {
            jsonError('Experience not found.', 404);
        }

        // Check if current user installed this experience
        $isInstalled = false;
        try {
            $currentUser = AuthMiddleware::authenticate();
            $instStmt = $db->prepare('SELECT id FROM experience_installations WHERE experience_id = :eid AND user_id = :uid LIMIT 1');
            $instStmt->execute(['eid' => $exp['id'], 'uid' => $currentUser['id']]);
            $isInstalled = (bool)$instStmt->fetch();
        } catch (Throwable $e) {}

        // Fetch recent reviews
        $revStmt = $db->prepare('
            SELECT r.*, u.display_name, u.username, u.avatar_url
            FROM experience_reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.experience_id = :eid
            ORDER BY r.created_at DESC
            LIMIT 10
        ');
        $revStmt->execute(['eid' => $exp['id']]);
        $reviews = $revStmt->fetchAll();

        jsonResponse([
            'success' => true,
            'experience' => [
                'id' => (int)$exp['id'],
                'slug' => $exp['slug'],
                'name' => decodeOutput($exp['name']),
                'tagline' => decodeOutput($exp['tagline']),
                'icon_url' => $exp['icon_url'],
                'banner_url' => $exp['banner_url'],
                'description' => decodeOutput($exp['description']),
                'category' => $exp['category'],
                'website_url' => $exp['website_url'],
                'embed_url' => $exp['embed_url'],
                'developer_name' => decodeOutput($exp['developer_name']),
                'developer_username' => $exp['developer_username'],
                'developer_avatar' => $exp['developer_avatar'],
                'status' => $exp['status'],
                'total_users' => (int)$exp['total_users'],
                'total_sessions' => (int)$exp['total_sessions'],
                'rating_avg' => (float)$exp['rating_avg'],
                'rating_count' => (int)$exp['rating_count'],
                'is_featured' => (bool)$exp['is_featured'],
                'is_first_party' => (bool)$exp['is_first_party'],
                'is_installed' => $isInstalled,
                'created_at' => $exp['created_at'],
                'reviews' => array_map(function($r) {
                    return [
                        'id' => (int)$r['id'],
                        'rating' => (int)$r['rating'],
                        'comment' => decodeOutput($r['comment']),
                        'user_name' => decodeOutput($r['display_name']),
                        'user_username' => $r['username'],
                        'user_avatar' => $r['avatar_url'],
                        'created_at' => $r['created_at']
                    ];
                }, $reviews)
            ]
        ]);
    }

    /**
     * POST /api/developer/experiences
     * Create / submit a new Experience for Admin Approval
     */
    public static function createExperience(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $body = getRequestBody();
        $appId = (int)($body['app_id'] ?? 0);
        $name = sanitizeInput($body['name'] ?? '');
        $tagline = sanitizeInput($body['tagline'] ?? '');
        $description = sanitizeInput($body['description'] ?? '');
        $iconUrl = sanitizeInput($body['icon_url'] ?? '');
        $bannerUrl = sanitizeInput($body['banner_url'] ?? '');
        $category = sanitizeInput($body['category'] ?? 'Game');
        $websiteUrl = sanitizeInput($body['website_url'] ?? '');
        $embedUrl = sanitizeInput($body['embed_url'] ?? '');

        if ($appId <= 0 || empty($name) || empty($embedUrl)) {
            jsonError('Application ID, Name, and Embed URL are required.', 422);
        }

        // Verify application belongs to current user
        $appStmt = $db->prepare('SELECT id FROM developer_apps WHERE id = :aid AND developer_id = :did LIMIT 1');
        $appStmt->execute(['aid' => $appId, 'did' => $currentUser['id']]);
        if (!$appStmt->fetch()) {
            jsonError('Developer Application not found or unauthorized.', 403);
        }

        $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name)) . '-' . rand(100, 999);

        $stmt = $db->prepare('
            INSERT INTO experiences (app_id, slug, name, tagline, icon_url, banner_url, description, category, website_url, embed_url, developer_id, status)
            VALUES (:aid, :slug, :name, :tagline, :icon, :banner, :desc, :cat, :web, :embed, :did, "submitted")
        ');
        $stmt->execute([
            'aid' => $appId,
            'slug' => $slug,
            'name' => $name,
            'tagline' => $tagline,
            'icon' => $iconUrl,
            'banner' => $bannerUrl,
            'desc' => $description,
            'cat' => $category,
            'web' => $websiteUrl,
            'embed' => $embedUrl,
            'did' => $currentUser['id']
        ]);
        $expId = (int)$db->lastInsertId();

        jsonResponse([
            'success' => true,
            'message' => 'Experience submitted for admin approval!',
            'experience_id' => $expId,
            'slug' => $slug
        ], 201);
    }

    /**
     * POST /api/experiences/{id}/install
     */
    public static function installExperience(int $expId): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $convId = !empty($body['conversation_id']) ? (int)$body['conversation_id'] : null;

        $db = Database::getConnection();

        $checkStmt = $db->prepare('SELECT id FROM experiences WHERE id = :id AND status = "published" LIMIT 1');
        $checkStmt->execute(['id' => $expId]);
        if (!$checkStmt->fetch()) {
            jsonError('Experience not found or not published.', 404);
        }

        $instStmt = $db->prepare('
            INSERT INTO experience_installations (experience_id, user_id, conversation_id, granted_scopes)
            VALUES (:eid, :uid, :cid, "profile.read username.read avatar.read")
            ON DUPLICATE KEY UPDATE installed_at = NOW()
        ');
        $instStmt->execute(['eid' => $expId, 'uid' => $currentUser['id'], 'cid' => $convId]);

        // Increment total users count
        $upd = $db->prepare('UPDATE experiences SET total_users = total_users + 1 WHERE id = :eid');
        $upd->execute(['eid' => $expId]);

        jsonResponse(['success' => true, 'message' => 'Experience added successfully!']);
    }

    /**
     * DELETE /api/experiences/{id}/uninstall
     */
    public static function uninstallExperience(int $expId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $del = $db->prepare('DELETE FROM experience_installations WHERE experience_id = :eid AND user_id = :uid');
        $del->execute(['eid' => $expId, 'uid' => $currentUser['id']]);

        jsonResponse(['success' => true, 'message' => 'Experience removed from account.']);
    }

    /**
     * GET /api/user/experiences
     */
    public static function getUserExperiences(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT e.*, i.installed_at
            FROM experience_installations i
            JOIN experiences e ON i.experience_id = e.id
            WHERE i.user_id = :uid
            ORDER BY i.installed_at DESC
        ');
        $stmt->execute(['uid' => $currentUser['id']]);
        $experiences = $stmt->fetchAll();

        jsonResponse([
            'success' => true,
            'experiences' => array_map(function($e) {
                return [
                    'id' => (int)$e['id'],
                    'slug' => $e['slug'],
                    'name' => decodeOutput($e['name']),
                    'tagline' => decodeOutput($e['tagline']),
                    'icon_url' => $e['icon_url'],
                    'category' => $e['category'],
                    'embed_url' => $e['embed_url'],
                    'installed_at' => $e['installed_at']
                ];
            }, $experiences)
        ]);
    }

    /**
     * POST /api/v1/experiences/sessions
     * Create live Experience session code (e.g. SES_9A8B7C)
     */
    public static function createSession(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $expId = (int)($body['experience_id'] ?? 0);
        $convId = !empty($body['conversation_id']) ? (int)$body['conversation_id'] : null;
        $initialState = !empty($body['initial_state']) ? json_encode($body['initial_state']) : json_encode(['score' => 0, 'turn' => 1]);

        if ($expId <= 0) {
            jsonError('experience_id is required', 422);
        }

        $db = Database::getConnection();

        $sessionCode = 'SES_' . strtoupper(bin2hex(random_bytes(4)));
        $expiresAt = date('Y-m-d H:i:s', time() + 86400); // 24 hour session

        $db->beginTransaction();

        try {
            $stmt = $db->prepare('
                INSERT INTO experience_sessions (session_code, experience_id, conversation_id, creator_id, state_json, status, expires_at)
                VALUES (:code, :eid, :cid, :crid, :state, "active", :exp)
            ');
            $stmt->execute([
                'code' => $sessionCode,
                'eid' => $expId,
                'cid' => $convId,
                'crid' => $currentUser['id'],
                'state' => $initialState,
                'exp' => $expiresAt
            ]);
            $sessionId = (int)$db->lastInsertId();

            // Add creator as member
            $mem = $db->prepare('INSERT INTO experience_session_members (session_id, user_id) VALUES (:sid, :uid)');
            $mem->execute(['sid' => $sessionId, 'uid' => $currentUser['id']]);

            // Increment experience total_sessions
            $updExp = $db->prepare('UPDATE experiences SET total_sessions = total_sessions + 1 WHERE id = :eid');
            $updExp->execute(['eid' => $expId]);

            $db->commit();

            jsonResponse([
                'success' => true,
                'session_code' => $sessionCode,
                'session_id' => $sessionId
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to create session: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/v1/experiences/sessions/{code}
     */
    public static function getSessionState(string $code): void {
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT s.*, e.name AS experience_name, e.slug AS experience_slug, e.embed_url, e.icon_url,
                   u.display_name AS creator_name, u.username AS creator_username
            FROM experience_sessions s
            JOIN experiences e ON s.experience_id = e.id
            JOIN users u ON s.creator_id = u.id
            WHERE s.session_code = :code OR s.id = :id
            LIMIT 1
        ');
        $stmt->execute(['code' => $code, 'id' => is_numeric($code) ? (int)$code : 0]);
        $session = $stmt->fetch();

        if (!$session) {
            jsonError('Session not found.', 404);
        }

        // Fetch session members
        $memStmt = $db->prepare('
            SELECT sm.score, sm.joined_at, u.id AS user_id, u.display_name, u.username, u.avatar_url
            FROM experience_session_members sm
            JOIN users u ON sm.user_id = u.id
            WHERE sm.session_id = :sid
            ORDER BY sm.score DESC, sm.joined_at ASC
        ');
        $memStmt->execute(['sid' => $session['id']]);
        $members = $memStmt->fetchAll();

        jsonResponse([
            'success' => true,
            'session' => [
                'id' => (int)$session['id'],
                'session_code' => $session['session_code'],
                'experience_name' => decodeOutput($session['experience_name']),
                'experience_slug' => $session['experience_slug'],
                'embed_url' => $session['embed_url'],
                'icon_url' => $session['icon_url'],
                'creator_name' => decodeOutput($session['creator_name']),
                'creator_username' => $session['creator_username'],
                'state' => $session['state_json'] ? json_decode($session['state_json'], true) : null,
                'status' => $session['status'],
                'members' => array_map(function($m) {
                    return [
                        'user_id' => (int)$m['user_id'],
                        'display_name' => decodeOutput($m['display_name']),
                        'username' => $m['username'],
                        'avatar_url' => $m['avatar_url'],
                        'score' => (int)$m['score']
                    ];
                }, $members),
                'created_at' => $session['created_at']
            ]
        ]);
    }

    /**
     * POST /api/v1/experiences/sessions/{code}/join
     */
    public static function joinSession(string $code): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM experience_sessions WHERE session_code = :code LIMIT 1');
        $stmt->execute(['code' => $code]);
        $session = $stmt->fetch();

        if (!$session) {
            jsonError('Session not found.', 404);
        }

        $ins = $db->prepare('INSERT INTO experience_session_members (session_id, user_id) VALUES (:sid, :uid) ON DUPLICATE KEY UPDATE score = score');
        $ins->execute(['sid' => $session['id'], 'uid' => $currentUser['id']]);

        jsonResponse(['success' => true, 'message' => 'Joined session!']);
    }

    /**
     * POST /api/v1/experiences/sessions/{code}/state
     * Sync updated session JSON state via SDK
     */
    public static function updateSessionState(string $code): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $state = !empty($body['state']) ? json_encode($body['state']) : null;
        $userScore = isset($body['score']) ? (int)$body['score'] : null;

        if (!$state) {
            jsonError('state payload is required.', 422);
        }

        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM experience_sessions WHERE session_code = :code LIMIT 1');
        $stmt->execute(['code' => $code]);
        $session = $stmt->fetch();

        if (!$session) {
            jsonError('Session not found.', 404);
        }

        $upd = $db->prepare('UPDATE experience_sessions SET state_json = :state WHERE id = :sid');
        $upd->execute(['state' => $state, 'sid' => $session['id']]);

        if ($userScore !== null) {
            $updScore = $db->prepare('UPDATE experience_session_members SET score = :score WHERE session_id = :sid AND user_id = :uid');
            $updScore->execute(['score' => $userScore, 'sid' => $session['id'], 'uid' => $currentUser['id']]);
        }

        jsonResponse(['success' => true, 'message' => 'Session state updated successfully!']);
    }

    /**
     * POST /api/experiences/{id}/reviews
     */
    public static function reviewExperience(int $expId): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $rating = min(max((int)($body['rating'] ?? 5), 1), 5);
        $comment = sanitizeInput($body['comment'] ?? '');

        $db = Database::getConnection();

        $ins = $db->prepare('
            INSERT INTO experience_reviews (experience_id, user_id, rating, comment)
            VALUES (:eid, :uid, :r, :c)
            ON DUPLICATE KEY UPDATE rating = :r, comment = :c
        ');
        $ins->execute(['eid' => $expId, 'uid' => $currentUser['id'], 'r' => $rating, 'c' => $comment]);

        // Recalculate average rating
        $avgStmt = $db->prepare('SELECT AVG(rating) AS avg_rating, COUNT(*) AS cnt FROM experience_reviews WHERE experience_id = :eid');
        $avgStmt->execute(['eid' => $expId]);
        $calc = $avgStmt->fetch();

        $updExp = $db->prepare('UPDATE experiences SET rating_avg = :avg, rating_count = :cnt WHERE id = :eid');
        $updExp->execute(['avg' => round((float)$calc['avg_rating'], 2), 'cnt' => (int)$calc['cnt'], 'eid' => $expId]);

        jsonResponse(['success' => true, 'message' => 'Review submitted successfully!']);
    }

    /**
     * POST /api/admin/experiences/{id}/review
     * Admin Review & Approval Endpoint
     */
    public static function adminReviewExperience(int $expId): void {
        $currentUser = AuthMiddleware::authenticate();
        if ($currentUser['role'] !== 'admin') {
            jsonError('Admin authorization required.', 403);
        }

        $body = getRequestBody();
        $status = sanitizeInput($body['status'] ?? 'published');

        if (!in_array($status, ['published', 'rejected', 'disabled'])) {
            jsonError('Invalid status.', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE experiences SET status = :st WHERE id = :eid');
        $stmt->execute(['st' => $status, 'eid' => $expId]);

        jsonResponse(['success' => true, 'message' => "Experience status updated to {$status}."]);
    }
}
