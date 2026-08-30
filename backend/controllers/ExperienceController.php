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
        $slug = sanitizeInput($body['slug'] ?? '');

        // Verify or resolve experience_id safely to prevent Foreign Key violations
        $expCheck = $db->prepare('SELECT id FROM experiences WHERE id = :eid OR (slug = :slug AND :slug != "") LIMIT 1');
        $expCheck->execute(['eid' => $expId, 'slug' => $slug]);
        $foundExp = $expCheck->fetch();

        if ($foundExp) {
            $expId = (int)$foundExp['id'];
        } else {
            // Auto-register missing first-party experience entry with explicit NULL app_id
            $targetSlug = !empty($slug) ? $slug : 'compatibility-test';
            try {
                $insExp = $db->prepare('
                    INSERT INTO experiences (app_id, slug, name, tagline, icon_url, category, embed_url, developer_id, status, is_featured, is_first_party)
                    VALUES (NULL, :slug, :name, :tag, :icon, "Social", :embed, :did, "published", 1, 1)
                ');
                $insExp->execute([
                    'slug' => $targetSlug,
                    'name' => str_replace('-', ' ', ucfirst($targetSlug)),
                    'tag' => 'Interactive experience for MarkanM Chat',
                    'icon' => 'https://api.iconify.design/twemoji:sparkling-heart.svg',
                    'embed' => '/experiences/embed/' . $targetSlug,
                    'did' => $currentUser['id']
                ]);
                $expId = (int)$db->lastInsertId();
            } catch (Throwable $e) {
                // Fallback: If DB table strictly requires existing app_id or fails, use first available experience ID
                $fb = $db->query('SELECT id FROM experiences LIMIT 1')->fetch();
                if ($fb) {
                    $expId = (int)$fb['id'];
                }
            }
        }

        $sessionCode = 'SES_' . strtoupper(bin2hex(random_bytes(4)));
        $expiresAt = date('Y-m-d H:i:s', time() + 86400); // 24 hour session

        $db->beginTransaction();

        try {
            // 1. Enforce ONE game at a time: expire ALL active/waiting sessions tied to this conversation
            if ($convId) {
                // Expire sessions that have conversation_id set
                $db->prepare('UPDATE experience_sessions SET status = "expired" WHERE conversation_id = :cid AND status IN ("active","waiting")')
                   ->execute(['cid' => $convId]);
                // Also expire sessions sent via message bubbles in this conversation (may have NULL conversation_id)
                // by looking up message-embedded session codes in this conversation
                try {
                    $msgSessions = $db->prepare(
                        "SELECT DISTINCT SUBSTRING(content, LOCATE('Session #', content) + 9, 12) AS scode
                         FROM messages
                         WHERE conversation_id = :cid AND content LIKE '%Session #SES_%'"
                    );
                    $msgSessions->execute(['cid' => $convId]);
                    while ($row = $msgSessions->fetch()) {
                        $scode = trim($row['scode'] ?? '');
                        if (strlen($scode) >= 8) {
                            $db->prepare('UPDATE experience_sessions SET status = "expired" WHERE session_code LIKE :scode AND status IN ("active","waiting")')
                               ->execute(['scode' => $scode . '%']);
                        }
                    }
                } catch (Throwable $e) {}
            }

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

        $stateData = $session['state_json'] ? json_decode($session['state_json'], true) : [];

        // Ensure questions are deterministically seeded for this session if not already present
        if (empty($stateData['questions']) || !is_array($stateData['questions'])) {
            $gameSlug = $session['experience_slug'] ?? 'compatibility-test';
            $testMode = $stateData['test_mode'] ?? 'friends';
            $totalQ = (int)($stateData['total_questions'] ?? 10);

            // Fetch available questions from game_questions table filtered by test_mode (Love vs Friends)
            $catFilter = ($testMode === 'partner') ? "category IN ('Love', 'Romantic')" : "category IN ('Personality', 'Communication', 'Lifestyle', 'Habits')";
            $qStmt = $db->prepare("SELECT id, game_slug, category, question_type, question_text, options_json FROM game_questions WHERE game_slug = :slug AND {$catFilter} ORDER BY id ASC");
            $qStmt->execute(['slug' => $gameSlug]);
            $allQs = $qStmt->fetchAll();

            // Fallback if category specific fetch returned empty
            if (empty($allQs)) {
                $qStmtFallback = $db->prepare('SELECT id, game_slug, category, question_type, question_text, options_json FROM game_questions WHERE game_slug = :slug ORDER BY id ASC');
                $qStmtFallback->execute(['slug' => $gameSlug]);
                $allQs = $qStmtFallback->fetchAll();
            }

            if (!empty($allQs)) {
                // Seed PRNG with session_code CRC32 hash so ALL players receive identical question ordering
                mt_srand(crc32($session['session_code']));
                $countQs = count($allQs);
                $indices = range(0, $countQs - 1);
                for ($i = $countQs - 1; $i > 0; $i--) {
                    $j = mt_rand(0, $i);
                    $tmp = $indices[$i];
                    $indices[$i] = $indices[$j];
                    $indices[$j] = $tmp;
                }

                $selectedQs = [];
                for ($k = 0; $k < min($totalQ, $countQs); $k++) {
                    $q = $allQs[$indices[$k]];
                    $selectedQs[] = [
                        'id' => (int)$q['id'],
                        'question_text' => decodeOutput($q['question_text']),
                        'options' => json_decode($q['options_json'], true) ?: []
                    ];
                }

                $stateData['questions'] = $selectedQs;
                $stateData['total_questions'] = count($selectedQs);
                $stateData['status'] = $stateData['status'] ?? 'in_progress';
                $stateData['answers'] = $stateData['answers'] ?? [];

                // Persist seeded questions back into experience_sessions
                $upd = $db->prepare('UPDATE experience_sessions SET state_json = :sj WHERE id = :sid');
                $upd->execute(['sj' => json_encode($stateData), 'sid' => $session['id']]);
            }
        }

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
                'creator_id' => (int)$session['creator_id'],
                'state_json' => json_encode($stateData),
                'state' => $stateData,
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
     * Sync updated session JSON state via SDK with turn synchronization
     */
    public static function updateSessionState(string $code): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM experience_sessions WHERE session_code = :code LIMIT 1');
        $stmt->execute(['code' => $code]);
        $session = $stmt->fetch();

        if (!$session) {
            jsonError('Session not found.', 404);
        }

        $existingState = $session['state_json'] ? json_decode($session['state_json'], true) : [];
        $newState = !empty($body['state']) ? $body['state'] : [];

        // Record player answer for synchronized / asynchronous progression
        if (isset($newState['answer'])) {
            $qIdx    = (int)($newState['answer']['q_index'] ?? 0);
            $choice  = $newState['answer']['choice'] ?? null;
            $userId  = (string)$currentUser['id'];
            $totalQ  = (int)($existingState['total_questions'] ?? (count($existingState['questions'] ?? []) ?: 10));

            if (!isset($existingState['answers'])) $existingState['answers'] = [];
            if (!isset($existingState['answers'][$userId])) $existingState['answers'][$userId] = [];
            $existingState['answers'][$userId][(string)$qIdx] = $choice;

            // Dual Player Slots: P1 (Creator) and P2 (Partner)
            $isP1 = ((int)$session['creator_id'] === (int)$currentUser['id']);
            $pSlot = $isP1 ? 'p1_answers' : 'p2_answers';
            if (!isset($existingState[$pSlot])) $existingState[$pSlot] = [];
            $existingState[$pSlot][(string)$qIdx] = $choice;

            $p1Count = count($existingState['p1_answers'] ?? []);
            $p2Count = count($existingState['p2_answers'] ?? []);
            $allPlayersCount = count($existingState['answers']);

            // ---- Mutual completion check ----
            $bothFinished = ($p1Count >= $totalQ && $p2Count >= $totalQ) || ($allPlayersCount >= 2 && min(array_map('count', $existingState['answers'])) >= $totalQ);

            if ($bothFinished) {
                $existingState['status'] = 'completed';
                // Mark DB row as ended
                $db->prepare('UPDATE experience_sessions SET status = "ended" WHERE id = :sid')
                   ->execute(['sid' => $session['id']]);
            }

            // ---- Chat notifications ----
            $convId = $session['conversation_id'];
            if ($convId) {
                if (!isset($existingState['notified_completions'])) {
                    $existingState['notified_completions'] = [];
                }

                // 1. Current user just finished all questions
                $myAnsCount = count($existingState['answers'][$userId] ?? []);
                if ($myAnsCount >= $totalQ && empty($existingState['notified_completions'][$userId])) {
                    $existingState['notified_completions'][$userId] = true;
                    $userName = decodeOutput($currentUser['display_name']);
                    $msgText  = "🔒 {$userName} has completed the Compatibility Test! Waiting for the other person to finish. Session #{$code}";
                    try {
                        $ins = $db->prepare('INSERT INTO messages (conversation_id, sender_id, message_type, content) VALUES (:cid, :sid, "text", :content)');
                        $ins->execute(['cid' => $convId, 'sid' => $currentUser['id'], 'content' => $msgText]);
                        $mid = (int)$db->lastInsertId();
                        $db->prepare('UPDATE conversations SET last_message_id=:mid, last_message_at=NOW() WHERE id=:cid')
                           ->execute(['mid' => $mid, 'cid' => $convId]);
                    } catch (Throwable $e) {}
                }

                // 2. Both players done — unlock results & post score in chat!
                if ($bothFinished && empty($existingState['notified_all_completed'])) {
                    $existingState['notified_all_completed'] = true;

                    // Calculate compatibility score
                    $p1Ans = $existingState['p1_answers'] ?? reset($existingState['answers']) ?: [];
                    $p2Ans = $existingState['p2_answers'] ?? end($existingState['answers']) ?: [];
                    $matchesCount = 0;
                    for ($i = 0; $i < $totalQ; $i++) {
                        $k = (string)$i;
                        if (isset($p1Ans[$k]) && isset($p2Ans[$k]) && trim((string)$p1Ans[$k]) === trim((string)$p2Ans[$k])) {
                            $matchesCount++;
                        }
                    }
                    $pct = (int)round(($matchesCount / max(1, $totalQ)) * 100);
                    $badge = ($pct >= 80) ? "💖 Perfect Soulmates!" : (($pct >= 50) ? "✨ Great Synergy!" : "⚡ Opposites Attract!");

                    $msgText = "🎉 Compatibility Test Results: {$pct}% ({$badge})! Matched on {$matchesCount}/{$totalQ} questions. Open activity to reveal full breakdown! Session #{$code}";
                    try {
                        $ins = $db->prepare('INSERT INTO messages (conversation_id, sender_id, message_type, content) VALUES (:cid, :sid, "text", :content)');
                        $ins->execute(['cid' => $convId, 'sid' => $currentUser['id'], 'content' => $msgText]);
                        $mid = (int)$db->lastInsertId();
                        $db->prepare('UPDATE conversations SET last_message_id=:mid, last_message_at=NOW() WHERE id=:cid')
                           ->execute(['mid' => $mid, 'cid' => $convId]);
                    } catch (Throwable $e) {}
                }
            }
        }

        // Merge any outer state properties (skip 'answer' key)
        foreach ($newState as $k => $v) {
            if ($k !== 'answer') {
                $existingState[$k] = $v;
            }
        }

        $stateJson = json_encode($existingState);
        $db->prepare('UPDATE experience_sessions SET state_json = :state WHERE id = :sid')
           ->execute(['state' => $stateJson, 'sid' => $session['id']]);

        jsonResponse(['success' => true, 'state' => $existingState]);
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

    /**
     * GET /api/experiences/questions
     * Returns unasked questions filtered by category and/or custom set
     */
    public static function getQuestions(): void {
        $db = Database::getConnection();
        $slug = sanitizeInput($_GET['game_slug'] ?? 'quick-quiz');
        $category = sanitizeInput($_GET['category'] ?? '');
        $excludeRaw = $_GET['exclude'] ?? '';
        $type = sanitizeInput($_GET['type'] ?? '');
        $setId = (int)($_GET['set_id'] ?? 0);

        // If custom set_id requested, fetch from custom_set_questions table!
        if ($setId > 0) {
            $stmt = $db->prepare('SELECT * FROM custom_set_questions WHERE set_id = :sid ORDER BY RAND() LIMIT 20');
            $stmt->execute(['sid' => $setId]);
            $customQs = $stmt->fetchAll();

            if (!empty($customQs)) {
                jsonResponse([
                    'success' => true,
                    'questions' => array_map(function($q) {
                        return [
                            'id' => (int)$q['id'],
                            'game_slug' => 'custom',
                            'category' => 'Custom Pack',
                            'question_type' => $q['question_type'],
                            'question_text' => decodeOutput($q['question_text']),
                            'options' => $q['options_json'] ? json_decode($q['options_json'], true) : null,
                            'correct_index' => (int)$q['correct_index']
                        ];
                    }, $customQs)
                ]);
                return;
            }
        }

        $excludeIds = [];
        if (!empty($excludeRaw)) {
            $parts = explode(',', $excludeRaw);
            foreach ($parts as $p) {
                $val = (int)trim($p);
                if ($val > 0) $excludeIds[] = $val;
            }
        }

        $sql = 'SELECT * FROM game_questions WHERE game_slug = :slug';
        $params = ['slug' => $slug];

        if (!empty($category) && $category !== 'All') {
            $sql .= ' AND category = :cat';
            $params['cat'] = $category;
        }

        if (!empty($type)) {
            $sql .= ' AND question_type = :type';
            $params['type'] = $type;
        }

        if (!empty($excludeIds)) {
            $inClause = implode(',', $excludeIds);
            $sql .= " AND id NOT IN ({$inClause})";
        }

        $sql .= ' ORDER BY RAND() LIMIT 10';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $questions = $stmt->fetchAll();

        // Fallback: If all questions in DB for category have been answered in this session, reset exclusion filter
        if (empty($questions)) {
            $fallbackSql = 'SELECT * FROM game_questions WHERE game_slug = :slug';
            $fallbackParams = ['slug' => $slug];
            if (!empty($category) && $category !== 'All') {
                $fallbackSql .= ' AND category = :cat';
                $fallbackParams['cat'] = $category;
            }
            if (!empty($type)) {
                $fallbackSql .= ' AND question_type = :type';
                $fallbackParams['type'] = $type;
            }
            $fallbackSql .= ' ORDER BY RAND() LIMIT 10';
            $stmt = $db->prepare($fallbackSql);
            $stmt->execute($fallbackParams);
            $questions = $stmt->fetchAll();
        }

        jsonResponse([
            'success' => true,
            'questions' => array_map(function($q) {
                return [
                    'id' => (int)$q['id'],
                    'game_slug' => $q['game_slug'],
                    'category' => $q['category'],
                    'question_type' => $q['question_type'],
                    'question_text' => decodeOutput($q['question_text']),
                    'options' => $q['options_json'] ? json_decode($q['options_json'], true) : null,
                    'correct_index' => (int)$q['correct_index'],
                    'difficulty' => $q['difficulty']
                ];
            }, $questions)
        ]);
    }

    /**
     * POST /api/experiences/custom-sets
     * Create custom Question Set / Truth & Dare Pack
     */
    public static function createCustomSet(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $title = sanitizeInput($body['title'] ?? '');
        $category = sanitizeInput($body['category'] ?? 'Party');
        $gameSlug = sanitizeInput($body['game_slug'] ?? 'party-game');
        $description = sanitizeInput($body['description'] ?? '');
        $isPublic = isset($body['is_public']) ? ((bool)$body['is_public'] ? 1 : 0) : 1;
        $questions = $body['questions'] ?? [];

        if (empty($title) || empty($questions) || !is_array($questions)) {
            jsonError('Title and questions array are required.', 422);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT INTO custom_question_sets (user_id, title, category, game_slug, description, is_public)
            VALUES (:uid, :title, :cat, :slug, :desc, :pub)
        ');
        $stmt->execute([
            'uid' => $currentUser['id'],
            'title' => $title,
            'cat' => $category,
            'slug' => $gameSlug,
            'desc' => $description,
            'pub' => $isPublic
        ]);
        $setId = (int)$db->lastInsertId();

        $qStmt = $db->prepare('
            INSERT INTO custom_set_questions (set_id, question_type, question_text, options_json, correct_index)
            VALUES (:sid, :qtype, :qtext, :opts, :cidx)
        ');

        foreach ($questions as $q) {
            $text = sanitizeInput($q['question_text'] ?? '');
            if (empty($text)) continue;
            $type = sanitizeInput($q['question_type'] ?? 'truth');
            $opts = !empty($q['options']) ? json_encode($q['options']) : null;
            $cidx = (int)($q['correct_index'] ?? 0);

            $qStmt->execute([
                'sid' => $setId,
                'qtype' => $type,
                'qtext' => $text,
                'opts' => $opts,
                'cidx' => $cidx
            ]);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Custom Question Set created successfully!',
            'set_id' => $setId
        ], 201);
    }

    /**
     * GET /api/experiences/custom-sets
     * Fetch user & public community question sets
     */
    public static function getCustomSets(): void {
        $db = Database::getConnection();
        $gameSlug = sanitizeInput($_GET['game_slug'] ?? 'party-game');
        $category = sanitizeInput($_GET['category'] ?? '');

        $sql = '
            SELECT s.*, u.display_name AS creator_name, u.username AS creator_username,
                   (SELECT COUNT(*) FROM custom_set_questions WHERE set_id = s.id) AS question_count
            FROM custom_question_sets s
            JOIN users u ON s.user_id = u.id
            WHERE (s.is_public = 1
        ';
        $params = [];

        try {
            $currentUser = AuthMiddleware::authenticate();
            $sql .= ' OR s.user_id = :uid';
            $params['uid'] = $currentUser['id'];
        } catch (Throwable $e) {}

        $sql .= ')';

        if (!empty($gameSlug)) {
            $sql .= ' AND s.game_slug = :slug';
            $params['slug'] = $gameSlug;
        }

        if (!empty($category) && $category !== 'All') {
            $sql .= ' AND s.category = :cat';
            $params['cat'] = $category;
        }

        $sql .= ' ORDER BY s.created_at DESC LIMIT 30';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $sets = $stmt->fetchAll();

        jsonResponse([
            'success' => true,
            'sets' => array_map(function($s) {
                return [
                    'id' => (int)$s['id'],
                    'title' => decodeOutput($s['title']),
                    'category' => $s['category'],
                    'game_slug' => $s['game_slug'],
                    'description' => decodeOutput($s['description']),
                    'is_public' => (bool)$s['is_public'],
                    'creator_name' => decodeOutput($s['creator_name']),
                    'creator_username' => $s['creator_username'],
                    'question_count' => (int)$s['question_count'],
                    'total_plays' => (int)$s['total_plays']
                ];
            }, $sets)
        ]);
    }
}


