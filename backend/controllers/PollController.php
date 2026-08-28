<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class PollController {

    /**
     * POST /api/polls
     */
    public static function createPoll(): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();

        $conversationId = (int)($body['conversation_id'] ?? 0);
        $question = sanitizeInput($body['question'] ?? '');
        $options = is_array($body['options'] ?? null) ? $body['options'] : [];
        $isMultipleChoice = !empty($body['is_multiple_choice']) ? 1 : 0;

        if ($conversationId <= 0 || empty($question)) {
            jsonError('Conversation ID and poll question are required.', 422);
        }

        $cleanOptions = array_filter(array_map('trim', $options));
        if (count($cleanOptions) < 2) {
            jsonError('At least 2 poll options are required.', 422);
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            // 1. Create Poll
            $pollStmt = $db->prepare('
                INSERT INTO polls (conversation_id, creator_id, question, is_multiple_choice)
                VALUES (:cid, :uid, :q, :mc)
            ');
            $pollStmt->execute([
                'cid' => $conversationId,
                'uid' => $currentUser['id'],
                'q' => $question,
                'mc' => $isMultipleChoice
            ]);
            $pollId = (int)$db->lastInsertId();

            // 2. Create Poll Options
            $optStmt = $db->prepare('INSERT INTO poll_options (poll_id, option_text) VALUES (:pid, :text)');
            foreach ($cleanOptions as $optText) {
                $optStmt->execute(['pid' => $pollId, 'text' => sanitizeInput($optText)]);
            }

            // 3. Create linked message with message_type 'poll'
            $msgStmt = $db->prepare('
                INSERT INTO messages (conversation_id, sender_id, message_type, content)
                VALUES (:cid, :uid, "poll", :content)
            ');
            $msgStmt->execute([
                'cid' => $conversationId,
                'uid' => $currentUser['id'],
                'content' => json_encode(['poll_id' => $pollId, 'question' => $question])
            ]);
            $msgId = (int)$db->lastInsertId();

            // Update conversation last_message_id
            $upStmt = $db->prepare('UPDATE conversations SET last_message_id = :mid, updated_at = NOW() WHERE id = :cid');
            $upStmt->execute(['mid' => $msgId, 'cid' => $conversationId]);

            $db->commit();

            jsonResponse([
                'success' => true,
                'message' => 'Poll created successfully!',
                'poll_id' => $pollId,
                'message_id' => $msgId
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to create poll: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/polls/{id}
     */
    public static function getPoll(int $pollId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT p.*, u.display_name AS creator_name, u.username AS creator_username
            FROM polls p
            JOIN users u ON p.creator_id = u.id
            WHERE p.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $pollId]);
        $poll = $stmt->fetch();

        if (!$poll) {
            jsonError('Poll not found.', 404);
        }

        // Fetch options & vote counts
        $optStmt = $db->prepare('
            SELECT po.id, po.option_text,
                   (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id) AS vote_count
            FROM poll_options po
            WHERE po.poll_id = :pid
        ');
        $optStmt->execute(['pid' => $pollId]);
        $options = $optStmt->fetchAll();

        // Calculate total votes
        $totalVotesStmt = $db->prepare('SELECT COUNT(DISTINCT user_id) FROM poll_votes WHERE poll_id = :pid');
        $totalVotesStmt->execute(['pid' => $pollId]);
        $totalVoters = (int)$totalVotesStmt->fetchColumn();

        // Check current user's votes
        $myVotesStmt = $db->prepare('SELECT option_id FROM poll_votes WHERE poll_id = :pid AND user_id = :uid');
        $myVotesStmt->execute(['pid' => $pollId, 'uid' => $currentUser['id']]);
        $myVotedOptionIds = array_column($myVotesStmt->fetchAll(), 'option_id');

        jsonResponse([
            'success' => true,
            'poll' => [
                'id' => (int)$poll['id'],
                'question' => decodeOutput($poll['question']),
                'is_multiple_choice' => (bool)$poll['is_multiple_choice'],
                'total_voters' => $totalVoters,
                'my_voted_option_ids' => array_map('intval', $myVotedOptionIds),
                'creator' => [
                    'id' => (int)$poll['creator_id'],
                    'display_name' => decodeOutput($poll['creator_name']),
                    'username' => $poll['creator_username']
                ],
                'options' => array_map(function($o) {
                    return [
                        'id' => (int)$o['id'],
                        'option_text' => decodeOutput($o['option_text']),
                        'vote_count' => (int)$o['vote_count']
                    ];
                }, $options)
            ]
        ]);
    }

    /**
     * POST /api/polls/{id}/vote
     */
    public static function votePoll(int $pollId): void {
        $currentUser = AuthMiddleware::authenticate();
        $body = getRequestBody();
        $optionId = (int)($body['option_id'] ?? 0);

        if ($optionId <= 0) {
            jsonError('Invalid option ID.', 400);
        }

        $db = Database::getConnection();

        // Verify poll exists
        $pollStmt = $db->prepare('SELECT id, is_multiple_choice FROM polls WHERE id = :id LIMIT 1');
        $pollStmt->execute(['id' => $pollId]);
        $poll = $pollStmt->fetch();

        if (!$poll) {
            jsonError('Poll not found.', 404);
        }

        $checkVote = $db->prepare('SELECT id FROM poll_votes WHERE poll_id = :pid AND option_id = :oid AND user_id = :uid LIMIT 1');
        $checkVote->execute(['pid' => $pollId, 'oid' => $optionId, 'uid' => $currentUser['id']]);
        $existing = $checkVote->fetch();

        if ($existing) {
            // Remove vote toggle
            $del = $db->prepare('DELETE FROM poll_votes WHERE id = :id');
            $del->execute(['id' => $existing['id']]);
            jsonResponse(['success' => true, 'voted' => false, 'message' => 'Vote removed']);
        } else {
            // If single choice poll, clear previous votes by user
            if (!$poll['is_multiple_choice']) {
                $clear = $db->prepare('DELETE FROM poll_votes WHERE poll_id = :pid AND user_id = :uid');
                $clear->execute(['pid' => $pollId, 'uid' => $currentUser['id']]);
            }

            $ins = $db->prepare('INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (:pid, :oid, :uid)');
            $ins->execute(['pid' => $pollId, 'oid' => $optionId, 'uid' => $currentUser['id']]);
            jsonResponse(['success' => true, 'voted' => true, 'message' => 'Vote recorded']);
        }
    }
}
