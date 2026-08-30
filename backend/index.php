<?php
// MarkanM Chat REST API Main Entry Point & Router
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/middleware/CORSMiddleware.php';

// Handle CORS Pre-flight & Headers
CORSMiddleware::handle();

// Dynamic Autoloader for Controllers & Middleware to handle Linux file-case differences
spl_autoload_register(function ($className) {
    $baseDirs = [
        __DIR__ . '/controllers/',
        __DIR__ . '/middleware/',
        __DIR__ . '/config/',
        __DIR__ . '/helpers/'
    ];
    foreach ($baseDirs as $dir) {
        $variations = [
            $dir . $className . '.php',
            $dir . strtolower($className) . '.php',
            $dir . ucfirst(strtolower($className)) . '.php'
        ];
        foreach ($variations as $file) {
            if (file_exists($file)) {
                require_once $file;
                return;
            }
        }
    }
});

require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/UserController.php';
require_once __DIR__ . '/controllers/ConnectionController.php';
require_once __DIR__ . '/controllers/ConversationController.php';
require_once __DIR__ . '/controllers/MessageController.php';
require_once __DIR__ . '/controllers/NotificationController.php';
require_once __DIR__ . '/controllers/InviteController.php';
require_once __DIR__ . '/controllers/TrackingController.php';

// Update 2 Controllers
require_once __DIR__ . '/controllers/RoomController.php';
require_once __DIR__ . '/controllers/DiscoverController.php';
require_once __DIR__ . '/controllers/ReportController.php';
require_once __DIR__ . '/controllers/BlockController.php';
require_once __DIR__ . '/controllers/InterestController.php';

// Update 3 Controllers
require_once __DIR__ . '/controllers/PollController.php';
require_once __DIR__ . '/controllers/SavedMessageController.php';
require_once __DIR__ . '/controllers/StickerController.php';
require_once __DIR__ . '/controllers/GifController.php';
require_once __DIR__ . '/controllers/PrivacyController.php';

// Update 4 Controllers (Developer Platform + OAuth + API v1)
require_once __DIR__ . '/controllers/DeveloperController.php';
require_once __DIR__ . '/controllers/OAuthController.php';
require_once __DIR__ . '/controllers/PublicApiController.php';

// Update 5 Controllers (Experiences + Sessions + Bots + Platform Ecosystem)
require_once __DIR__ . '/controllers/ExperienceController.php';
require_once __DIR__ . '/controllers/BotController.php';
require_once __DIR__ . '/controllers/BotPlatformController.php';

// Extract URI path
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Normalize request path relative to /backend/api or /api
$basePaths = ['/backend/api', '/api'];
$path = $requestUri;

foreach ($basePaths as $bp) {
    if (strpos($path, $bp) === 0) {
        $path = substr($path, strlen($bp));
        break;
    }
}
$path = '/' . ltrim($path, '/');

// Handle Route Matching
try {
    // 1. BOT PLATFORM & REST API V1 ROUTES
    if ($method === 'GET' && $path === '/bot/v1/me') {
        BotPlatformController::getMe();
    } else if ($method === 'POST' && preg_match('#^/bot/v1/rooms/([a-zA-Z0-9_]+)/messages$#', $path, $matches)) {
        BotPlatformController::sendRoomMessage($matches[1]);
    } else if ($method === 'POST' && $path === '/bot/v1/polling') {
        BotPlatformController::polling();
    } else if ($method === 'GET' && $path === '/api/developer/docs') {
        BotPlatformController::getApiDocs();
    } else if ($method === 'GET' && $path === '/migrate-bots') {
        $db = Database::getConnection();
        
        try {
            // Add is_bot column if it doesn't exist
            $db->exec('ALTER TABLE users ADD COLUMN is_bot TINYINT(1) NOT NULL DEFAULT 0');
        } catch (Throwable $e) {}

        // Insert System Bots
        $bots = [
            ['username' => 'assistant', 'name' => 'MarkanM AI Assistant', 'email' => 'assistant@markanm.com'],
            ['username' => 'translator', 'name' => 'Translator Bot', 'email' => 'translator@markanm.com'],
            ['username' => 'codebot', 'name' => 'Dev Code Helper', 'email' => 'codebot@markanm.com'],
            ['username' => 'pollbot', 'name' => 'Interactive Poll Bot', 'email' => 'pollbot@markanm.com']
        ];
        
        foreach ($bots as $bot) {
            $stmt = $db->prepare('SELECT id FROM users WHERE username = :uname');
            $stmt->execute(['uname' => $bot['username']]);
            if (!$stmt->fetch()) {
                $ins = $db->prepare('INSERT INTO users (display_name, username, email, password_hash, is_bot, is_verified, avatar_url) VALUES (:name, :uname, :email, :pass, 1, 1, :avatar)');
                $ins->execute([
                    'name' => $bot['name'],
                    'uname' => $bot['username'],
                    'email' => $bot['email'],
                    'pass' => password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                    'avatar' => "https://api.dicebear.com/7.x/bottts/svg?seed=" . urlencode($bot['username'])
                ]);
            }
        }
        jsonResponse(['success' => true, 'message' => 'Bots migration completed successfully']);
    } else if ($method === 'POST' && $path === '/developer/bots') {
        BotPlatformController::createBot();
    } else if ($method === 'POST' && preg_match('#^/developer/bots/([0-9]+)/rotate-token$#', $path, $matches)) {
        BotPlatformController::rotateToken((int)$matches[1]);
    } else if ($method === 'POST' && preg_match('#^/developer/bots/([0-9]+)/webhooks$#', $path, $matches)) {
        BotPlatformController::saveWebhook((int)$matches[1]);
    } else if ($method === 'POST' && preg_match('#^/developer/bots/([0-9]+)/webhooks/test$#', $path, $matches)) {
        BotPlatformController::testWebhookPing((int)$matches[1]);
    } else if ($method === 'GET' && preg_match('#^/developer/bots/([0-9]+)/logs$#', $path, $matches)) {
        BotPlatformController::getLogs((int)$matches[1]);
    }

    // 2. AUTH ROUTES
    else if ($method === 'POST' && $path === '/auth/register') {
        AuthController::register();
    } else if ($method === 'POST' && $path === '/auth/login') {
        AuthController::login();
    } else if ($method === 'POST' && $path === '/auth/verify-otp') {
        AuthController::verifyOTP();
    } else if ($method === 'POST' && $path === '/auth/resend-otp') {
        AuthController::resendOTP();
    } else if ($method === 'POST' && $path === '/auth/logout') {
        AuthController::logout();
    } else if ($method === 'GET' && $path === '/auth/me') {
        AuthController::me();
    }

    // 3. EXPERIENCE DIRECTORY & PLATFORM ROUTES
    else if ($method === 'GET' && $path === '/experiences/questions') {
        ExperienceController::getQuestions();
    } else if ($method === 'POST' && $path === '/experiences/custom-sets') {
        ExperienceController::createCustomSet();
    } else if ($method === 'GET' && $path === '/experiences/custom-sets') {
        ExperienceController::getCustomSets();
    } else if ($method === 'GET' && $path === '/experiences') {
        ExperienceController::listDirectory();
    } else if ($method === 'GET' && preg_match('#^/experiences/([a-zA-Z0-9_-]+)$#', $path, $matches)) {
        ExperienceController::getBySlug($matches[1]);
    } else if ($method === 'POST' && $path === '/developer/experiences') {
        ExperienceController::createExperience();
    } else if ($method === 'POST' && preg_match('#^/experiences/([0-9]+)/install$#', $path, $matches)) {
        ExperienceController::installExperience((int)$matches[1]);
    } else if ($method === 'DELETE' && preg_match('#^/experiences/([0-9]+)/uninstall$#', $path, $matches)) {
        ExperienceController::uninstallExperience((int)$matches[1]);
    } else if ($method === 'GET' && $path === '/user/experiences') {
        ExperienceController::getUserExperiences();
    } else if ($method === 'POST' && $path === '/v1/experiences/sessions') {
        ExperienceController::createSession();
    } else if ($method === 'GET' && preg_match('#^/v1/experiences/sessions/([a-zA-Z0-9_]+)$#', $path, $matches)) {
        ExperienceController::getSessionState($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/v1/experiences/sessions/([a-zA-Z0-9_]+)/join$#', $path, $matches)) {
        ExperienceController::joinSession($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/v1/experiences/sessions/([a-zA-Z0-9_]+)/state$#', $path, $matches)) {
        ExperienceController::updateSessionState($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/experiences/([0-9]+)/reviews$#', $path, $matches)) {
        ExperienceController::reviewExperience((int)$matches[1]);
    } else if ($method === 'POST' && preg_match('#^/admin/experiences/([0-9]+)/review$#', $path, $matches)) {
        ExperienceController::adminReviewExperience((int)$matches[1]);
    } else if ($method === 'POST' && $path === '/bots/commands/execute') {
        BotController::executeCommand();
    }

    // 4. DEVELOPER PLATFORM ROUTES
    else if ($method === 'POST' && $path === '/developer/toggle-status') {
        DeveloperController::toggleStatus();
    } else if ($method === 'POST' && $path === '/developer/activate') {
        DeveloperController::activateDeveloper();
    } else if ($method === 'GET' && $path === '/developer/apps') {
        DeveloperController::listApps();
    } else if ($method === 'POST' && $path === '/developer/apps') {
        DeveloperController::createApp();
    } else if ($method === 'GET' && preg_match('#^/developer/apps/([0-9]+)$#', $path, $matches)) {
        DeveloperController::getAppDetails((int)$matches[1]);
    } else if ($method === 'PATCH' && preg_match('#^/developer/apps/([0-9]+)$#', $path, $matches)) {
        DeveloperController::updateApp((int)$matches[1]);
    } else if ($method === 'POST' && preg_match('#^/developer/apps/([0-9]+)/rotate-secret$#', $path, $matches)) {
        DeveloperController::rotateSecret((int)$matches[1]);
    } else if ($method === 'DELETE' && preg_match('#^/developer/apps/([0-9]+)$#', $path, $matches)) {
        DeveloperController::deleteApp((int)$matches[1]);
    } else if ($method === 'GET' && preg_match('#^/developer/apps/([0-9]+)/usage$#', $path, $matches)) {
        DeveloperController::getUsageStats((int)$matches[1]);
    } else if ($method === 'POST' && preg_match('#^/developer/apps/([0-9]+)/webhooks$#', $path, $matches)) {
        DeveloperController::saveWebhook((int)$matches[1]);
    } else if ($method === 'POST' && preg_match('#^/developer/webhooks/([0-9]+)/test$#', $path, $matches)) {
        DeveloperController::testWebhook((int)$matches[1]);
    }

    // 5. OAUTH 2.0 ROUTES
    else if ($method === 'GET' && $path === '/oauth/authorize-info') {
        OAuthController::getAuthorizeInfo();
    } else if ($method === 'POST' && $path === '/oauth/authorize') {
        OAuthController::processAuthorize();
    } else if ($method === 'POST' && $path === '/oauth/token') {
        OAuthController::exchangeToken();
    } else if ($method === 'POST' && $path === '/oauth/revoke') {
        OAuthController::revokeToken();
    } else if ($method === 'GET' && $path === '/user/connected-apps') {
        OAuthController::listConnectedApps();
    } else if ($method === 'POST' && preg_match('#^/user/connected-apps/([0-9]+)/revoke$#', $path, $matches)) {
        OAuthController::revokeAppAccess((int)$matches[1]);
    }

    // 6. PUBLIC DEVELOPER API V1 ROUTES
    else if ($method === 'GET' && $path === '/v1/me') {
        PublicApiController::getMe();
    } else if ($method === 'GET' && preg_match('#^/v1/users/([a-zA-Z0-9_@]+)$#', $path, $matches)) {
        PublicApiController::getUserByUsername($matches[1]);
    }

    // 7. DISCOVER & LIVE ROOM ROUTES
    else if ($method === 'GET' && $path === '/discover') {
        DiscoverController::getDiscoverFeed();
    } else if ($method === 'GET' && $path === '/search') {
        DiscoverController::search();
    } else if ($method === 'POST' && $path === '/rooms') {
        RoomController::create();
    } else if ($method === 'GET' && preg_match('#^/rooms/([a-zA-Z0-9]+)$#', $path, $matches)) {
        RoomController::get($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/rooms/([a-zA-Z0-9]+)/join$#', $path, $matches)) {
        RoomController::join($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/rooms/([a-zA-Z0-9]+)/leave$#', $path, $matches)) {
        RoomController::leave($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/rooms/([a-zA-Z0-9]+)/heartbeat$#', $path, $matches)) {
        RoomController::heartbeat($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/rooms/([a-zA-Z0-9]+)/follow$#', $path, $matches)) {
        RoomController::toggleFollow($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/rooms/([a-zA-Z0-9]+)/ban$#', $path, $matches)) {
        RoomController::banUser($matches[1]);
    }

    // 8. POLL ROUTES
    else if ($method === 'POST' && $path === '/polls') {
        PollController::createPoll();
    } else if ($method === 'GET' && preg_match('#^/polls/([0-9]+)$#', $path, $matches)) {
        PollController::getPoll((int)$matches[1]);
    } else if ($method === 'POST' && preg_match('#^/polls/([0-9]+)/vote$#', $path, $matches)) {
        PollController::votePoll((int)$matches[1]);
    }

    // 9. SAVED MESSAGES, STICKERS, GIFS, PRIVACY
    else if ($method === 'POST' && preg_match('#^/messages/([0-9]+)/save$#', $path, $matches)) {
        SavedMessageController::toggleSave((int)$matches[1]);
    } else if ($method === 'GET' && $path === '/saved-messages') {
        SavedMessageController::listSaved();
    } else if ($method === 'GET' && $path === '/stickers/search') {
        StickerController::search();
    } else if ($method === 'GET' && $path === '/stickers') {
        StickerController::getPacks();
    } else if ($method === 'GET' && $path === '/gifs/search') {
        GifController::search();
    } else if ($method === 'GET' && $path === '/user/privacy') {
        PrivacyController::getPrivacy();
    } else if ($method === 'POST' && $path === '/user/privacy') {
        PrivacyController::updatePrivacy();
    }

    // 10. USER & PROFILE ROUTES
    else if ($method === 'GET' && $path === '/users/search') {
        UserController::search();
    } else if ($method === 'GET' && $path === '/bots') {
        UserController::getBots();
    } else if ($method === 'GET' && preg_match('#^/users/@([a-zA-Z0-9_]+)$#', $path, $matches)) {
        UserController::getByUsername($matches[1]);
    } else if ($method === 'GET' && preg_match('#^/users/profile$#', $path)) {
        if (!empty($_GET['username'])) {
            UserController::getByUsername($_GET['username']);
        } else {
            AuthController::me();
        }
    } else if ($method === 'PATCH' && $path === '/users/profile') {
        UserController::updateProfile();
    } else if ($method === 'POST' && $path === '/users/avatar') {
        UserController::uploadAvatar();
    } else if ($method === 'POST' && $path === '/users/banner') {
        UserController::uploadBanner();
    } else if ($method === 'POST' && $path === '/users/invite-email') {
        UserController::inviteByEmail();
    } else if ($method === 'POST' && $path === '/users/block') {
        BlockController::blockUser();
    } else if ($method === 'POST' && $path === '/users/unblock') {
        BlockController::unblockUser();
    }

    // 11. USER INTERESTS & MOODS
    else if ($method === 'GET' && $path === '/user/interests') {
        InterestController::getInterests();
    } else if ($method === 'POST' && $path === '/user/mood') {
        InterestController::updateMood();
    }

    // 12. REPORTS & MODERATION
    else if ($method === 'POST' && $path === '/reports') {
        ReportController::createReport();
    } else if ($method === 'GET' && $path === '/admin/reports') {
        ReportController::listReports();
    } else if ($method === 'POST' && $path === '/admin/reports/action') {
        ReportController::actionReport();
    }

    // 13. TRACKING ROUTES
    else if ($method === 'POST' && $path === '/tracking/log') {
        TrackingController::logEvent();
    } else if ($method === 'GET' && $path === '/tracking/stats') {
        TrackingController::getStats();
    } else if ($method === 'GET' && $path === '/admin/activity-logs') {
        TrackingController::getActivityLogs();
    }

    // 14. CONNECTION ROUTES
    else if ($method === 'GET' && $path === '/connections') {
        ConnectionController::list();
    } else if ($method === 'POST' && $path === '/connections/request') {
        ConnectionController::sendRequest();
    } else if ($method === 'POST' && $path === '/connections/accept') {
        ConnectionController::acceptRequest();
    } else if ($method === 'POST' && $path === '/connections/reject') {
        ConnectionController::rejectRequest();
    } else if ($method === 'DELETE' && preg_match('#^/connections/([0-9]+)$#', $path, $matches)) {
        ConnectionController::remove((int)$matches[1]);
    }

    // 15. CONVERSATION ROUTES
    else if ($method === 'GET' && $path === '/conversations') {
        ConversationController::list();
    } else if ($method === 'POST' && $path === '/conversations/direct') {
        ConversationController::createDirect();
    } else if ($method === 'POST' && $path === '/conversations/group') {
        ConversationController::createGroup();
    } else if ($method === 'GET' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)$#', $path, $matches)) {
        ConversationController::get($matches[1]);
    } else if ($method === 'GET' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/media$#', $path, $matches)) {
        ConversationController::getMedia($matches[1]);
    } else if ($method === 'GET' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/search$#', $path, $matches)) {
        ConversationController::searchMessages($matches[1]);
    } else if ($method === 'PATCH' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)$#', $path, $matches)) {
        ConversationController::updateGroup($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/members$#', $path, $matches)) {
        ConversationController::addMember($matches[1]);
    } else if ($method === 'DELETE' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/members/([0-9]+)$#', $path, $matches)) {
        ConversationController::removeMember($matches[1], (int)$matches[2]);
    } else if ($method === 'POST' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/leave$#', $path, $matches)) {
        ConversationController::leaveGroup($matches[1]);
    }

    // 16. MESSAGE ROUTES
    else if ($method === 'GET' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/search-messages$#', $path, $matches)) {
        MessageController::searchMessages($matches[1]);
    } else if ($method === 'GET' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/messages$#', $path, $matches)) {
        MessageController::getMessages($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/messages$#', $path, $matches)) {
        MessageController::sendMessage($matches[1]);
    } else if ($method === 'PATCH' && preg_match('#^/messages/([0-9]+)$#', $path, $matches)) {
        MessageController::editMessage((int)$matches[1]);
    } else if ($method === 'DELETE' && preg_match('#^/messages/([0-9]+)$#', $path, $matches)) {
        MessageController::deleteMessage((int)$matches[1]);
    } else if ($method === 'POST' && preg_match('#^/messages/([0-9]+)/reactions$#', $path, $matches)) {
        MessageController::toggleReaction((int)$matches[1]);
    } else if ($method === 'POST' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/typing$#', $path, $matches)) {
        MessageController::updateTypingStatus($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/import-messages$#', $path, $matches)) {
        MessageController::importMessages($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/conversations/([a-zA-Z0-9_@]+)/attachments$#', $path, $matches)) {
        MessageController::uploadAttachment($matches[1]);
    }

    // 17. NOTIFICATION ROUTES
    else if ($method === 'GET' && $path === '/notifications') {
        NotificationController::list();
    } else if ($method === 'POST' && $path === '/notifications/read') {
        NotificationController::markRead();
    } else if ($method === 'POST' && $path === '/notifications/read-all') {
        NotificationController::markAllRead();
    }

    // 18. INVITE ROUTES
    else if ($method === 'POST' && preg_match('#^/groups/([0-9]+)/invites$#', $path, $matches)) {
        InviteController::createInvite((int)$matches[1]);
    } else if ($method === 'GET' && preg_match('#^/invites/([a-zA-Z0-9]+)$#', $path, $matches)) {
        InviteController::getByCode($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/invites/([a-zA-Z0-9]+)/join$#', $path, $matches)) {
        InviteController::joinGroup($matches[1]);
    } else if ($method === 'POST' && preg_match('#^/invites/([0-9]+)/disable$#', $path, $matches)) {
        InviteController::disableInvite((int)$matches[1]);
    }

    else {
        jsonError("API Endpoint Not Found: {$method} {$path}", 404);
    }
} catch (Throwable $t) {
    jsonError('Server Error: ' . $t->getMessage(), 500);
}
