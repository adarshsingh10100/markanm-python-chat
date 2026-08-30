<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Mailer.php';
require_once __DIR__ . '/../controllers/TrackingController.php';

class AuthController {

    /**
     * POST /api/auth/register
     */
    public static function register(): void {
        $body = getRequestBody();
        $displayName = sanitizeInput($body['display_name'] ?? ($body['name'] ?? ''));
        $username = strtolower(trim($body['username'] ?? ''));
        $email = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        // Optional attribution & referral params
        $refUserId = !empty($body['ref_user_id']) ? (int)$body['ref_user_id'] : null;
        $signupSourceLink = sanitizeInput($body['source_link'] ?? ($body['landing_url'] ?? '/register'));
        $inviteCode = sanitizeInput($body['invite_code'] ?? '');

        // Validation rules
        if (empty($displayName) || empty($username) || empty($email) || empty($password)) {
            jsonError('Display name, username, email, and password are required.', 422);
        }

        if (strlen($username) < 3 || strlen($username) > 30) {
            jsonError('Username must be between 3 and 30 characters.', 422);
        }

        if (!preg_match('/^[a-z0-9_]+$/', $username)) {
            jsonError('Username can only contain lowercase letters, numbers, and underscores.', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonError('Invalid email format.', 422);
        }

        if (strlen($password) < 6) {
            jsonError('Password must be at least 6 characters long.', 422);
        }

        $db = Database::getConnection();

        // Check unique username or email
        $checkStmt = $db->prepare('SELECT id, username, email FROM users WHERE username = :username OR email = :email LIMIT 1');
        $checkStmt->execute(['username' => $username, 'email' => $email]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            if ($existing['username'] === $username) {
                jsonError('Username is already taken.', 409);
            }
            if ($existing['email'] === $email) {
                jsonError('Email is already registered.', 409);
            }
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $otpCode = sprintf('%06d', mt_rand(0, 999999));
        $otpExpires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        // If inviteCode was provided, verify inviter ID from group_invites or email_invites
        if (!$refUserId && !empty($inviteCode)) {
            $invCodeStmt = $db->prepare('SELECT creator_id FROM group_invites WHERE code = :code LIMIT 1');
            $invCodeStmt->execute(['code' => $inviteCode]);
            $groupInv = $invCodeStmt->fetch();
            if ($groupInv) {
                $refUserId = (int)$groupInv['creator_id'];
            }
        }

        // Execute registration inside a database transaction
        $db->beginTransaction();

        try {
            $stmt = $db->prepare('
                INSERT INTO users (display_name, username, email, password_hash, is_verified, otp_code, otp_expires, referred_by_user_id, signup_source_link)
                VALUES (:display_name, :username, :email, :password_hash, 0, :otp_code, :otp_expires, :ref_user_id, :source_link)
            ');
            $stmt->execute([
                'display_name' => $displayName,
                'username' => $username,
                'email' => $email,
                'password_hash' => $passwordHash,
                'otp_code' => $otpCode,
                'otp_expires' => $otpExpires,
                'ref_user_id' => $refUserId,
                'source_link' => $signupSourceLink
            ]);

            $userId = (int)$db->lastInsertId();

            // Create initial user presence record
            $presStmt = $db->prepare('INSERT INTO user_presence (user_id, status) VALUES (:user_id, "online")');
            $presStmt->execute(['user_id' => $userId]);

            // Create active session token
            $token = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', strtotime('+' . TOKEN_EXPIRY_DAYS . ' days'));
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

            $sessStmt = $db->prepare('
                INSERT INTO sessions (user_id, token, user_agent, ip_address, expires_at)
                VALUES (:user_id, :token, :user_agent, :ip_address, :expires_at)
            ');
            $sessStmt->execute([
                'user_id' => $userId,
                'token' => $token,
                'user_agent' => mb_substr($userAgent, 0, 255),
                'ip_address' => $ipAddress,
                'expires_at' => $expiresAt
            ]);

            $_SESSION['auth_token'] = $token;

            $db->commit();

            // Track attribution log event
            $eventType = $refUserId ? 'signup_via_invite' : 'signup_direct';
            TrackingController::recordEvent($eventType, $userId, $refUserId, $inviteCode, $signupSourceLink);
            // Log activity with IP geolocation
            TrackingController::logActivity('register', $userId, ['source' => $signupSourceLink]);

            // Dispatch OTP verification code via PHPMailer
            Mailer::sendOTPEmail($email, $displayName, $otpCode);

            jsonResponse([
                'success' => true,
                'message' => 'Registration successful! Verification code sent to your email.',
                'token' => $token,
                'user' => [
                    'id' => $userId,
                    'display_name' => $displayName,
                    'username' => $username,
                    'email' => $email,
                    'avatar_url' => null,
                    'is_verified' => false
                ]
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Registration failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/auth/verify-otp
     */
    public static function verifyOTP(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $code = trim($body['code'] ?? ($body['otp'] ?? ''));

        if (empty($code) || strlen($code) !== 6) {
            jsonError('Please provide a 6-digit verification code.', 422);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id, otp_code, otp_expires FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $currentUser['id']]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonError('User not found.', 404);
        }

        if (empty($user['otp_code']) || $user['otp_code'] !== $code) {
            jsonError('Invalid verification code. Please check your email.', 400);
        }

        if (strtotime($user['otp_expires']) < time()) {
            jsonError('Verification code has expired. Please request a new one.', 400);
        }

        // Mark user as verified
        $updateStmt = $db->prepare('UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE id = :id');
        $updateStmt->execute(['id' => $currentUser['id']]);

        jsonResponse([
            'success' => true,
            'message' => 'Email verified successfully!',
            'user' => array_merge($currentUser, ['is_verified' => true])
        ]);
    }

    /**
     * POST /api/auth/resend-otp
     */
    public static function resendOTP(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $otpCode = sprintf('%06d', mt_rand(0, 999999));
        $otpExpires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        $stmt = $db->prepare('UPDATE users SET otp_code = :code, otp_expires = :expires WHERE id = :id');
        $stmt->execute(['code' => $otpCode, 'expires' => $otpExpires, 'id' => $currentUser['id']]);

        Mailer::sendOTPEmail($currentUser['email'], $currentUser['display_name'], $otpCode);

        jsonResponse([
            'success' => true,
            'message' => 'A new 6-digit verification code has been sent to your email.'
        ]);
    }

    /**
     * POST /api/auth/login
     */
    public static function login(): void {
        $body = getRequestBody();
        $identifier = trim($body['identifier'] ?? ($body['login'] ?? ($body['username'] ?? ($body['email'] ?? ''))));
        $password = $body['password'] ?? '';

        if (empty($identifier) || empty($password)) {
            jsonError('Username/email and password are required.', 422);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT id, display_name, username, email, password_hash, avatar_url, bio, is_verified
            FROM users
            WHERE username = :id_user OR email = :id_email
            LIMIT 1
        ');
        $stmt->execute(['id_user' => strtolower($identifier), 'id_email' => strtolower($identifier)]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            jsonError('Invalid credentials.', 401);
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+' . TOKEN_EXPIRY_DAYS . ' days'));
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

        $sessStmt = $db->prepare('
            INSERT INTO sessions (user_id, token, user_agent, ip_address, expires_at)
            VALUES (:user_id, :token, :user_agent, :ip_address, :expires_at)
        ');
        $sessStmt->execute([
            'user_id' => $user['id'],
            'token' => $token,
            'user_agent' => mb_substr($userAgent, 0, 255),
            'ip_address' => $ipAddress,
            'expires_at' => $expiresAt
        ]);

        $_SESSION['auth_token'] = $token;

        // Log login event with IP geo
        TrackingController::recordEvent('login', (int)$user['id'], null, null, sanitizeInput($body['landing_url'] ?? '/login'));
        TrackingController::logActivity('login', (int)$user['id']);

        // Fetch updated geo info for response
        $geoStmt = $db->prepare('SELECT country_code, country_name, city, timezone FROM users WHERE id = :uid LIMIT 1');
        $geoStmt->execute(['uid' => $user['id']]);
        $geoRow = $geoStmt->fetch();

        jsonResponse([
            'success' => true,
            'token' => $token,
            'user' => [
                'id'           => (int)$user['id'],
                'display_name' => decodeOutput($user['display_name']),
                'username'     => $user['username'],
                'email'        => $user['email'],
                'avatar_url'   => $user['avatar_url'],
                'bio'          => decodeOutput($user['bio']),
                'is_verified'  => (bool)$user['is_verified'],
                'country_code' => $geoRow['country_code'] ?? null,
                'country_name' => $geoRow['country_name'] ?? null,
                'city'         => $geoRow['city'] ?? null,
                'timezone'     => $geoRow['timezone'] ?? 'Asia/Kolkata',
            ]
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public static function logout(): void {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        $token = null;

        if (!empty($authHeader) && preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            $token = $matches[1];
        } else if (!empty($_SESSION['auth_token'])) {
            $token = $_SESSION['auth_token'];
        }

        if ($token) {
            $db = Database::getConnection();
            // Get user_id before deleting session for activity logging
            $sesStmt = $db->prepare('SELECT user_id FROM sessions WHERE token = :token LIMIT 1');
            $sesStmt->execute(['token' => $token]);
            $sesRow = $sesStmt->fetch();
            $logoutUserId = $sesRow ? (int)$sesRow['user_id'] : null;

            $stmt = $db->prepare('DELETE FROM sessions WHERE token = :token');
            $stmt->execute(['token' => $token]);

            if ($logoutUserId) {
                TrackingController::logActivity('logout', $logoutUserId);
            }
        }

        unset($_SESSION['auth_token']);
        jsonResponse(['success' => true, 'message' => 'Logged out successfully']);
    }

    /**
     * GET /api/auth/me
     */
    public static function me(): void {
        $user = AuthMiddleware::authenticate();

        // Background: update last_seen_at and refresh geo if stale
        TrackingController::logActivity('session_check', (int)$user['id']);

        // Re-fetch geo so timezone is always fresh after logActivity may have updated it
        $db = Database::getConnection();
        $freshStmt = $db->prepare('SELECT country_code, country_name, city, timezone FROM users WHERE id = :uid LIMIT 1');
        $freshStmt->execute(['uid' => $user['id']]);
        $fresh = $freshStmt->fetch();

        jsonResponse([
            'success' => true,
            'user' => [
                'id'           => (int)$user['id'],
                'display_name' => decodeOutput($user['display_name']),
                'username'     => $user['username'],
                'email'        => $user['email'],
                'avatar_url'   => $user['avatar_url'],
                'bio'          => decodeOutput($user['bio']),
                'is_verified'  => (bool)$user['is_verified'],
                'created_at'   => $user['created_at'],
                'country_code' => $fresh['country_code'] ?? $user['country_code'] ?? null,
                'country_name' => $fresh['country_name'] ?? $user['country_name'] ?? null,
                'city'         => $fresh['city'] ?? $user['city'] ?? null,
                'timezone'     => $fresh['timezone'] ?? $user['timezone'] ?? 'Asia/Kolkata',
            ]
        ]);
    }
}
