<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ReportController {

    /**
     * POST /api/reports
     */
    public static function createReport(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $targetType = in_array($body['target_type'] ?? '', ['user', 'message', 'room']) ? $body['target_type'] : null;
        $targetId = (int)($body['target_id'] ?? 0);
        $reason = in_array($body['reason'] ?? '', ['spam', 'harassment', 'hate', 'sexual_content', 'violence', 'scam', 'illegal', 'other']) ? $body['reason'] : 'other';
        $description = sanitizeInput($body['description'] ?? '');

        if (!$targetType || $targetId <= 0) {
            jsonError('Valid target type and ID are required.', 422);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
            VALUES (:reporter_id, :target_type, :target_id, :reason, :description)
        ');
        $stmt->execute([
            'reporter_id' => $currentUser['id'],
            'target_type' => $targetType,
            'target_id' => $targetId,
            'reason' => $reason,
            'description' => $description
        ]);

        jsonResponse([
            'success' => true,
            'message' => 'Report submitted successfully. Our moderation team will review it.'
        ], 201);
    }

    /**
     * GET /api/admin/reports
     */
    public static function listReports(): void {
        $currentUser = AuthMiddleware::authenticate();
        
        // Simple admin authorization check (username 'gdr' or role check)
        if (strtolower($currentUser['username']) !== 'gdr' && (int)$currentUser['id'] !== 1) {
            jsonError('Unauthorized. Admin moderation access required.', 403);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT r.*, u.display_name AS reporter_name, u.username AS reporter_username
            FROM reports r
            JOIN users u ON r.reporter_id = u.id
            ORDER BY r.created_at DESC
            LIMIT 50
        ');
        $stmt->execute();
        $reports = $stmt->fetchAll();

        jsonResponse([
            'success' => true,
            'reports' => array_map(function($rep) {
                return [
                    'id' => (int)$rep['id'],
                    'target_type' => $rep['target_type'],
                    'target_id' => (int)$rep['target_id'],
                    'reason' => $rep['reason'],
                    'description' => decodeOutput($rep['description']),
                    'status' => $rep['status'],
                    'created_at' => $rep['created_at'],
                    'reporter' => [
                        'id' => (int)$rep['reporter_id'],
                        'display_name' => decodeOutput($rep['reporter_name']),
                        'username' => $rep['reporter_username']
                    ]
                ];
            }, $reports)
        ]);
    }

    /**
     * POST /api/admin/reports/action
     */
    public static function actionReport(): void {
        $currentUser = AuthMiddleware::authenticate();
        if (strtolower($currentUser['username']) !== 'gdr' && (int)$currentUser['id'] !== 1) {
            jsonError('Unauthorized.', 403);
        }

        $body = getRequestBody();
        $reportId = (int)($body['report_id'] ?? 0);
        $action = sanitizeInput($body['action'] ?? 'dismiss'); // dismiss, suspend_user, close_room

        if ($reportId <= 0) {
            jsonError('Invalid report ID', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM reports WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $reportId]);
        $report = $stmt->fetch();

        if (!$report) {
            jsonError('Report not found', 404);
        }

        if ($action === 'close_room' && $report['target_type'] === 'room') {
            $closeStmt = $db->prepare('UPDATE rooms SET status = "ended" WHERE id = :rid');
            $closeStmt->execute(['rid' => $report['target_id']]);
        }

        $up = $db->prepare('UPDATE reports SET status = :status WHERE id = :id');
        $up->execute(['status' => $action === 'dismiss' ? 'dismissed' : 'action_taken', 'id' => $reportId]);

        jsonResponse(['success' => true, 'message' => 'Report action processed']);
    }
}
