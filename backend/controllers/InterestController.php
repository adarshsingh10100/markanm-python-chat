<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class InterestController {

    /**
     * GET /api/user/interests
     */
    public static function getInterests(): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT interest FROM user_interests WHERE user_id = :uid');
        $stmt->execute(['uid' => $currentUser['id']]);
        $interests = array_column($stmt->fetchAll(), 'interest');

        $moodStmt = $db->prepare('SELECT mood FROM user_moods WHERE user_id = :uid LIMIT 1');
        $moodStmt->execute(['uid' => $currentUser['id']]);
        $mood = $moodStmt->fetchColumn() ?: null;

        jsonResponse([
            'success' => true,
            'interests' => $interests,
            'mood' => $mood
        ]);
    }

    /**
     * POST /api/user/interests
     */
    public static function updateInterests(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $interests = is_array($body['interests'] ?? null) ? $body['interests'] : [];

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $del = $db->prepare('DELETE FROM user_interests WHERE user_id = :uid');
            $del->execute(['uid' => $currentUser['id']]);

            if (!empty($interests)) {
                $ins = $db->prepare('INSERT INTO user_interests (user_id, interest) VALUES (:uid, :interest)');
                foreach ($interests as $item) {
                    $clean = sanitizeInput($item);
                    if (!empty($clean)) {
                        $ins->execute(['uid' => $currentUser['id'], 'interest' => $clean]);
                    }
                }
            }

            $db->commit();

            jsonResponse([
                'success' => true,
                'message' => 'Interests updated successfully',
                'interests' => $interests
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to update interests: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/user/mood
     */
    public static function updateMood(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $mood = sanitizeInput($body['mood'] ?? '');

        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT INTO user_moods (user_id, mood)
            VALUES (:uid, :mood)
            ON DUPLICATE KEY UPDATE mood = :mood, updated_at = NOW()
        ');
        $stmt->execute(['uid' => $currentUser['id'], 'mood' => $mood]);

        jsonResponse([
            'success' => true,
            'message' => 'Mood discovery preference updated',
            'mood' => $mood
        ]);
    }
}
