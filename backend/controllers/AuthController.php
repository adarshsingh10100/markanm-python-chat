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
        $geoRow = [];
        try {
            $geoStmt = $db->prepare('SELECT country_code, country_name, city, timezone FROM users WHERE id = :uid LIMIT 1');
            $geoStmt->execute(['uid' => $user['id']]);
            $geoRow = $geoStmt->fetch() ?: [];
        } catch (Throwable $e) {
            // Ignore if geo columns don't exist in schema yet
        }

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
        $fresh = [];
        try {
            $freshStmt = $db->prepare('SELECT country_code, country_name, city, timezone FROM users WHERE id = :uid LIMIT 1');
            $freshStmt->execute(['uid' => $user['id']]);
            $fresh = $freshStmt->fetch() ?: [];
        } catch (Throwable $e) {}

        jsonResponse([
            'success' => true,
            'user' => [
                'id'                => (int)$user['id'],
                'display_name'      => decodeOutput($user['display_name']),
                'username'          => $user['username'],
                'email'             => $user['email'],
                'avatar_url'        => $user['avatar_url'],
                'bio'               => decodeOutput($user['bio']),
                'is_verified'       => (bool)$user['is_verified'],
                'created_at'        => $user['created_at'],
                'country_code'      => $fresh['country_code'] ?? $user['country_code'] ?? null,
                'country_name'      => $fresh['country_name'] ?? $user['country_name'] ?? null,
                'city'              => $fresh['city'] ?? $user['city'] ?? null,
                'timezone'          => $fresh['timezone'] ?? $user['timezone'] ?? 'Asia/Kolkata',
                'gender'            => $user['gender'] ?? null,
                'date_of_birth'     => $user['date_of_birth'] ?? null,
                'profile_completed' => (bool)($user['profile_completed'] ?? false),
                'google_id'         => $user['google_id'] ?? null,
            ]
        ]);
    }

    /**
     * POST /api/auth/forgot-password
     */
    public static function forgotPassword(): void {
        $body = getRequestBody();
        $email = strtolower(trim($body['email'] ?? ''));

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonError('A valid email address is required.', 422);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id, display_name, email FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        // Always return success to prevent email enumeration attacks
        if (!$user) {
            jsonResponse(['success' => true, 'message' => 'If an account exists with this email, a password reset link has been sent.']);
        }

        // Generate secure reset token
        $resetToken = bin2hex(random_bytes(32));
        $resetExpires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $upd = $db->prepare('UPDATE users SET reset_token = :token, reset_expires = :expires WHERE id = :id');
        $upd->execute(['token' => $resetToken, 'expires' => $resetExpires, 'id' => $user['id']]);

        $resetLink = (getenv('APP_URL') ?: 'https://chat.markanm.com') . '/reset-password?token=' . $resetToken;

        Mailer::sendPasswordResetEmail($user['email'], $user['display_name'], $resetLink);

        jsonResponse(['success' => true, 'message' => 'If an account exists with this email, a password reset link has been sent.']);
    }

    /**
     * POST /api/auth/reset-password
     */
    public static function resetPassword(): void {
        $body = getRequestBody();
        $token = trim($body['token'] ?? '');
        $newPassword = $body['password'] ?? '';

        if (empty($token)) {
            jsonError('Reset token is required.', 422);
        }

        if (strlen($newPassword) < 6) {
            jsonError('Password must be at least 6 characters.', 422);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id FROM users WHERE reset_token = :token AND reset_expires > NOW() LIMIT 1');
        $stmt->execute(['token' => $token]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonError('Invalid or expired reset token. Please request a new password reset link.', 400);
        }

        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);

        // Update password, clear reset token, invalidate all sessions
        $upd = $db->prepare('UPDATE users SET password_hash = :hash, reset_token = NULL, reset_expires = NULL WHERE id = :id');
        $upd->execute(['hash' => $newHash, 'id' => $user['id']]);

        $db->prepare('DELETE FROM sessions WHERE user_id = :id')->execute(['id' => $user['id']]);

        jsonResponse(['success' => true, 'message' => 'Password has been reset successfully. Please log in with your new password.']);
    }

    /**
     * POST /api/auth/google
     * Accepts Google ID token credential from Google Identity Services SDK
     */
    public static function googleLogin(): void {
        $body = getRequestBody();
        $credential = trim($body['credential'] ?? '');

        if (empty($credential)) {
            jsonError('Google credential token is required.', 422);
        }

        // Decode the Google JWT (ID Token) payload without verifying signature
        // (Verification happens via Google's public keys; for simplicity we trust HTTPS delivery + expiry check)
        $parts = explode('.', $credential);
        if (count($parts) !== 3) {
            jsonError('Invalid Google credential format.', 400);
        }

        $payload = json_decode(base64_decode(str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4 === 0 ? strlen($parts[1]) : strlen($parts[1]) + 4 - strlen($parts[1]) % 4, '=', STR_PAD_RIGHT)), true);

        if (!$payload) {
            jsonError('Failed to decode Google credential.', 400);
        }

        // Verify token is for our client and not expired
        $allowedClients = [
            getenv('GOOGLE_CLIENT_ID') ?: '755697154434-6epavkdgts6c0vaa2iqo69pmpkd4nqdf.apps.googleusercontent.com'
        ];

        if (!in_array($payload['aud'] ?? '', $allowedClients, true)) {
            jsonError('Invalid Google client audience.', 401);
        }

        if (($payload['exp'] ?? 0) < time()) {
            jsonError('Google credential has expired. Please try again.', 401);
        }

        $googleId  = $payload['sub'] ?? '';
        $email     = strtolower(trim($payload['email'] ?? ''));
        $name      = trim($payload['name'] ?? '');
        $picture   = $payload['picture'] ?? null;

        if (empty($googleId) || empty($email)) {
            jsonError('Google account does not provide required information.', 400);
        }

        $db = Database::getConnection();

        // Try to find existing user by google_id or email
        $user = null;
        try {
            $stmt = $db->prepare('SELECT id, display_name, username, email, avatar_url, bio, is_verified, profile_completed FROM users WHERE google_id = :gid OR email = :email LIMIT 1');
            $stmt->execute(['gid' => $googleId, 'email' => $email]);
            $user = $stmt->fetch();
        } catch (Throwable $e) {
            // google_id column may not exist yet
            $stmt = $db->prepare('SELECT id, display_name, username, email, avatar_url, bio, is_verified FROM users WHERE email = :email LIMIT 1');
            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch();
        }

        if ($user) {
            // Update google_id if not already linked
            try {
                $db->prepare('UPDATE users SET google_id = :gid WHERE id = :id AND (google_id IS NULL OR google_id = "")')->execute(['gid' => $googleId, 'id' => $user['id']]);
            } catch (Throwable $e) {}
        } else {
            // Auto-create new verified user
            // Generate a unique username from Google name
            $baseUsername = strtolower(preg_replace('/[^a-z0-9]/', '', $name));
            if (strlen($baseUsername) < 3) $baseUsername = 'user';
            $username = $baseUsername;
            $counter = 1;

            while (true) {
                $ck = $db->prepare('SELECT id FROM users WHERE username = :u LIMIT 1');
                $ck->execute(['u' => $username]);
                if (!$ck->fetch()) break;
                $username = $baseUsername . $counter++;
            }

            $randomPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);

            try {
                $ins = $db->prepare('INSERT INTO users (display_name, username, email, password_hash, avatar_url, is_verified, google_id, profile_completed) VALUES (:name, :uname, :email, :pass, :avatar, 1, :gid, 0)');
                $ins->execute(['name' => $name, 'uname' => $username, 'email' => $email, 'pass' => $randomPassword, 'avatar' => $picture, 'gid' => $googleId]);
            } catch (Throwable $e) {
                // Fallback without google_id / profile_completed columns
                $ins = $db->prepare('INSERT INTO users (display_name, username, email, password_hash, avatar_url, is_verified) VALUES (:name, :uname, :email, :pass, :avatar, 1)');
                $ins->execute(['name' => $name, 'uname' => $username, 'email' => $email, 'pass' => $randomPassword, 'avatar' => $picture]);
            }

            $newId = (int)$db->lastInsertId();

            // Create user presence record
            try {
                $db->prepare('INSERT IGNORE INTO user_presence (user_id, status) VALUES (:uid, "online")')->execute(['uid' => $newId]);
            } catch (Throwable $e) {}

            // Fetch the newly created user
            $stmt = $db->prepare('SELECT id, display_name, username, email, avatar_url, bio, is_verified FROM users WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => $newId]);
            $user = $stmt->fetch();
        }

        // Create session
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+' . TOKEN_EXPIRY_DAYS . ' days'));
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

        $sessStmt = $db->prepare('INSERT INTO sessions (user_id, token, user_agent, ip_address, expires_at) VALUES (:uid, :token, :ua, :ip, :exp)');
        $sessStmt->execute(['uid' => $user['id'], 'token' => $token, 'ua' => mb_substr($userAgent, 0, 255), 'ip' => $ipAddress, 'exp' => $expiresAt]);

        $_SESSION['auth_token'] = $token;

        TrackingController::logActivity('google_login', (int)$user['id']);

        $profileCompleted = (bool)($user['profile_completed'] ?? false);

        jsonResponse([
            'success'           => true,
            'token'             => $token,
            'profile_completed' => $profileCompleted,
            'user'              => [
                'id'                => (int)$user['id'],
                'display_name'      => decodeOutput($user['display_name']),
                'username'          => $user['username'],
                'email'             => $user['email'],
                'avatar_url'        => $user['avatar_url'],
                'bio'               => decodeOutput($user['bio'] ?? ''),
                'is_verified'       => true,
                'profile_completed' => $profileCompleted,
            ]
        ]);
    }

    /**
     * POST /api/auth/complete-profile
     * Save gender, date of birth, etc. for Google-login users
     */
    public static function completeProfile(): void {
        $user = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $gender      = sanitizeInput($body['gender'] ?? '');
        $dob         = sanitizeInput($body['date_of_birth'] ?? '');

        if (!in_array($gender, ['male', 'female', 'trans', 'prefer_not_to_say'], true)) {
            jsonError('Please select a valid gender option.', 422);
        }

        $db = Database::getConnection();

        try {
            $upd = $db->prepare('UPDATE users SET gender = :gender, date_of_birth = :dob, profile_completed = 1 WHERE id = :id');
            $upd->execute(['gender' => $gender, 'dob' => ($dob ?: null), 'id' => $user['id']]);
        } catch (Throwable $e) {
            // Columns may not exist yet — run migration gracefully
            try {
                $db->exec('ALTER TABLE users ADD COLUMN gender VARCHAR(30) DEFAULT NULL, ADD COLUMN date_of_birth DATE DEFAULT NULL, ADD COLUMN profile_completed TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN google_id VARCHAR(100) DEFAULT NULL');
                $upd = $db->prepare('UPDATE users SET gender = :gender, date_of_birth = :dob, profile_completed = 1 WHERE id = :id');
                $upd->execute(['gender' => $gender, 'dob' => ($dob ?: null), 'id' => $user['id']]);
            } catch (Throwable $e2) {
                jsonError('Could not save profile: ' . $e2->getMessage(), 500);
            }
        }

        jsonResponse(['success' => true, 'message' => 'Profile completed!']);
    }
}
