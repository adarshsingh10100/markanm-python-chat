<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class PrivacyController {

    /**
     * GET /api/user/privacy
     */
    public static function getPrivacy(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM user_privacy_settings WHERE user_id = :uid LIMIT 1');
        $stmt->execute(['uid' => $currentUser['id']]);
        $settings = $stmt->fetch();

        if (!$settings) {
            $settings = [
                'connection_requests' => 'everyone',
                'messaging' => 'everyone',
                'show_online_status' => 1,
                'show_last_seen' => 1,
                'interests_visibility' => 'public'
            ];
        }

        jsonResponse([
            'success' => true,
            'settings' => [
                'connection_requests' => $settings['connection_requests'],
                'messaging' => $settings['messaging'],
                'show_online_status' => (bool)$settings['show_online_status'],
                'show_last_seen' => (bool)$settings['show_last_seen'],
                'interests_visibility' => $settings['interests_visibility']
            ]
        ]);
    }

    /**
     * POST /api/user/privacy
     */
    public static function updatePrivacy(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $connReq = in_array($body['connection_requests'] ?? '', ['everyone', 'shared_interests', 'nobody']) ? $body['connection_requests'] : 'everyone';
        $messaging = in_array($body['messaging'] ?? '', ['everyone', 'connections', 'nobody']) ? $body['messaging'] : 'everyone';
        $showOnline = isset($body['show_online_status']) ? ((bool)$body['show_online_status'] ? 1 : 0) : 1;
        $showLastSeen = isset($body['show_last_seen']) ? ((bool)$body['show_last_seen'] ? 1 : 0) : 1;
        $interestsVis = in_array($body['interests_visibility'] ?? '', ['public', 'connections', 'private']) ? $body['interests_visibility'] : 'public';

        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT INTO user_privacy_settings (user_id, connection_requests, messaging, show_online_status, show_last_seen, interests_visibility)
            VALUES (:uid, :cr, :msg, :so, :sls, :iv)
            ON DUPLICATE KEY UPDATE
              connection_requests = :cr,
              messaging = :msg,
              show_online_status = :so,
              show_last_seen = :sls,
              interests_visibility = :iv,
              updated_at = NOW()
        ');
        $stmt->execute([
            'uid' => $currentUser['id'],
            'cr' => $connReq,
            'msg' => $messaging,
            'so' => $showOnline,
            'sls' => $showLastSeen,
            'iv' => $interestsVis
        ]);

        jsonResponse(['success' => true, 'message' => 'Privacy settings updated successfully']);
    }
}
