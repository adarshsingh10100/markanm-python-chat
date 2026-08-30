<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Mailer.php';

class UserController {

    /**
     * GET /api/users/search?q=...
     */
    public static function search(): void {
        $currentUser = AuthMiddleware::authenticate();
        $query = trim($_GET['q'] ?? '');

        if (strlen($query) < 1) {
            jsonResponse(['success' => true, 'users' => []]);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT u.id, u.display_name, u.username, u.avatar_url, u.bio,
                   c.status AS connection_status, c.requester_id
            FROM users u
            LEFT JOIN connections c ON (
                (c.requester_id = :cu1 AND c.receiver_id = u.id) OR
                (c.receiver_id = :cu2 AND c.requester_id = u.id)
            )
            WHERE u.id != :cu3 AND (u.username LIKE :q1 OR u.display_name LIKE :q2)
            ORDER BY u.display_name ASC
            LIMIT 20
        ');
        
        $searchTerm = '%' . $query . '%';
        $stmt->execute([
            'cu1' => $currentUser['id'],
            'cu2' => $currentUser['id'],
            'cu3' => $currentUser['id'],
            'q1' => $searchTerm,
            'q2' => $searchTerm
        ]);

        $users = $stmt->fetchAll();
        $formatted = array_map(function($u) use ($currentUser) {
            $status = 'none';
            if (!empty($u['connection_status'])) {
                if ($u['connection_status'] === 'accepted') {
                    $status = 'connected';
                } else if ($u['connection_status'] === 'pending') {
                    $status = ($u['requester_id'] == $currentUser['id']) ? 'request_sent' : 'request_received';
                } else {
                    $status = $u['connection_status'];
                }
            }

            return [
                'id' => (int)$u['id'],
                'display_name' => decodeOutput($u['display_name']),
                'username' => $u['username'],
                'avatar_url' => $u['avatar_url'],
                'bio' => decodeOutput($u['bio']),
                'connection_status' => $status
            ];
        }, $users);

        jsonResponse(['success' => true, 'users' => $formatted]);
    }

    /**
     * GET /api/users/@username
     */
    public static function getByUsername(string $username): void {
        $currentUser = AuthMiddleware::authenticate();
        $cleanUsername = strtolower(trim(ltrim($username, '@')));

        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT u.id, u.display_name, u.username, u.email, u.avatar_url, u.banner_url, u.bio, u.social_links, u.is_verified, u.created_at,
                   c.id AS connection_id, c.status AS connection_status, c.requester_id
            FROM users u
            LEFT JOIN connections c ON (
                (c.requester_id = :cu1 AND c.receiver_id = u.id) OR
                (c.receiver_id = :cu2 AND c.requester_id = u.id)
            )
            WHERE u.username = :username
            LIMIT 1
        ');
        $stmt->execute([
            'cu1' => $currentUser['id'],
            'cu2' => $currentUser['id'],
            'username' => $cleanUsername
        ]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonError('User not found', 404);
        }

        $connectionStatus = 'none';
        if (!empty($user['connection_status'])) {
            if ($user['connection_status'] === 'accepted') {
                $connectionStatus = 'connected';
            } else if ($user['connection_status'] === 'pending') {
                $connectionStatus = ($user['requester_id'] == $currentUser['id']) ? 'request_sent' : 'request_received';
            }
        }

        $socialLinks = [];
        if (!empty($user['social_links'])) {
            $decoded = json_decode($user['social_links'], true);
            if (is_array($decoded)) {
                $socialLinks = $decoded;
            }
        }

        jsonResponse([
            'success' => true,
            'user' => [
                'id' => (int)$user['id'],
                'display_name' => decodeOutput($user['display_name']),
                'username' => $user['username'],
                'avatar_url' => $user['avatar_url'],
                'banner_url' => $user['banner_url'],
                'bio' => decodeOutput($user['bio']),
                'social_links' => $socialLinks,
                'is_verified' => (bool)$user['is_verified'],
                'created_at' => $user['created_at'],
                'connection_id' => $user['connection_id'] ? (int)$user['connection_id'] : null,
                'connection_status' => $connectionStatus,
                'is_self' => ((int)$user['id'] === (int)$currentUser['id'])
            ]
        ]);
    }

    /**
     * PATCH /api/users/profile
     */
    public static function updateProfile(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $displayName = sanitizeInput($body['display_name'] ?? $currentUser['display_name']);
        $newUsername = strtolower(trim($body['username'] ?? $currentUser['username']));
        $bio = sanitizeInput($body['bio'] ?? ($currentUser['bio'] ?? ''));
        $bannerUrl = sanitizeInput($body['banner_url'] ?? ($currentUser['banner_url'] ?? ''));
        $socialLinks = $body['social_links'] ?? null;

        if (empty($displayName)) {
            jsonError('Display name cannot be empty', 422);
        }

        if (empty($newUsername) || strlen($newUsername) < 3 || !preg_match('/^[a-z0-9_]+$/', $newUsername)) {
            jsonError('Invalid username. Must be 3+ lowercase letters, numbers, or underscores.', 422);
        }

        $db = Database::getConnection();

        if ($newUsername !== strtolower($currentUser['username'])) {
            $checkStmt = $db->prepare('SELECT id FROM users WHERE username = :username AND id != :id LIMIT 1');
            $checkStmt->execute(['username' => $newUsername, 'id' => $currentUser['id']]);
            if ($checkStmt->fetch()) {
                jsonError('Username is already taken.', 409);
            }
        }

        $socialJson = null;
        if (is_array($socialLinks)) {
            $socialJson = json_encode(array_values(array_filter($socialLinks)));
        }

        $updateStmt = $db->prepare('
            UPDATE users
            SET display_name = :display_name, username = :username, bio = :bio, banner_url = :banner, social_links = :socials
            WHERE id = :id
        ');
        $updateStmt->execute([
            'display_name' => $displayName,
            'username' => $newUsername,
            'bio' => $bio,
            'banner' => $bannerUrl,
            'socials' => $socialJson,
            'id' => $currentUser['id']
        ]);

        jsonResponse([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => (int)$currentUser['id'],
                'display_name' => decodeOutput($displayName),
                'username' => $newUsername,
                'email' => $currentUser['email'],
                'avatar_url' => $currentUser['avatar_url'],
                'banner_url' => $bannerUrl,
                'bio' => decodeOutput($bio),
                'social_links' => is_array($socialLinks) ? array_values(array_filter($socialLinks)) : [],
                'is_verified' => (bool)$currentUser['is_verified']
            ]
        ]);
    }

    /**
     * POST /api/users/avatar
     */
    /**
     * POST /api/users/avatar
     */
    public static function uploadAvatar(): void {
        $currentUser = AuthMiddleware::authenticate();

        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            jsonError('No image uploaded or upload failed.', 400);
        }

        $file = $_FILES['avatar'];

        if ($file['size'] > MAX_UPLOAD_SIZE) {
            jsonError('File size exceeds maximum allowed limit of 5MB.', 400);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg');
        $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'heic', 'avif'];
        if (!in_array($ext, $allowedExts)) {
            jsonError('Invalid image format. Allowed formats: JPEG, PNG, WEBP, GIF, SVG.', 400);
        }

        $uploadDir = UPLOAD_DIR;
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }

        $filename = 'avatar_' . $currentUser['id'] . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $targetPath = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            jsonError('Failed to save uploaded file.', 500);
        }

        $avatarUrl = UPLOAD_URL_PREFIX . $filename;

        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE users SET avatar_url = :avatar WHERE id = :id');
        $stmt->execute(['avatar' => $avatarUrl, 'id' => $currentUser['id']]);

        jsonResponse([
            'success' => true,
            'avatar_url' => $avatarUrl
        ]);
    }

    /**
     * POST /api/users/banner
     */
    public static function uploadBanner(): void {
        $currentUser = AuthMiddleware::authenticate();

        if (!isset($_FILES['banner']) || $_FILES['banner']['error'] !== UPLOAD_ERR_OK) {
            jsonError('No banner image uploaded or upload failed.', 400);
        }

        $file = $_FILES['banner'];

        if ($file['size'] > MAX_UPLOAD_SIZE) {
            jsonError('File size exceeds maximum allowed limit of 5MB.', 400);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg');
        $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'heic', 'avif'];
        if (!in_array($ext, $allowedExts)) {
            jsonError('Invalid image format. Allowed formats: JPEG, PNG, WEBP, GIF, SVG.', 400);
        }

        $uploadDir = UPLOAD_DIR;
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }

        $filename = 'banner_' . $currentUser['id'] . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $targetPath = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            jsonError('Failed to save uploaded banner image.', 500);
        }

        $bannerUrl = UPLOAD_URL_PREFIX . $filename;

        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE users SET banner_url = :banner WHERE id = :id');
        $stmt->execute(['banner' => $bannerUrl, 'id' => $currentUser['id']]);

        jsonResponse([
            'success' => true,
            'banner_url' => $bannerUrl
        ]);
    }

    /**
     * POST /api/users/invite-email
     */
    public static function inviteByEmail(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $email = strtolower(trim($body['email'] ?? ''));

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonError('Valid recipient email address is required.', 422);
        }

        $db = Database::getConnection();

        // Check total lifetime invites sent to this recipient email across platform
        $totalStmt = $db->prepare('SELECT COUNT(*) FROM email_invites WHERE recipient_email = :email');
        $totalStmt->execute(['email' => $email]);
        $totalSent = (int)$totalStmt->fetchColumn();

        if ($totalSent >= 2) {
            jsonError('This email address has already received the maximum limit of 2 platform invitations.', 429);
        }

        // Check if an invite was sent to this email within the last 24 hours
        $lastStmt = $db->prepare('SELECT sent_at FROM email_invites WHERE recipient_email = :email ORDER BY sent_at DESC LIMIT 1');
        $lastStmt->execute(['email' => $email]);
        $lastInvite = $lastStmt->fetch();

        if ($lastInvite && (time() - strtotime($lastInvite['sent_at'])) < 86400) {
            jsonError('An invitation was already sent to this email address today. Please wait 24 hours before inviting again.', 429);
        }

        // Record invitation in DB
        $ins = $db->prepare('INSERT INTO email_invites (inviter_id, recipient_email) VALUES (:inviter_id, :email)');
        $ins->execute(['inviter_id' => $currentUser['id'], 'email' => $email]);

        // Send stylish HTML email
        $sent = Mailer::sendEmailInvite($email, decodeOutput($currentUser['display_name']), $currentUser['username']);

        if (!$sent) {
            jsonError('Failed to deliver email invitation. Please try again later.', 500);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Stylish invitation email sent successfully!',
            'invites_sent' => $totalSent + 1,
            'max_invites' => 2
        ]);
    }
}
