<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class InviteController {

    /**
     * POST /api/groups/{id}/invites
     */
    public static function createInvite(int $convId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        // Ensure user is owner/admin
        $roleStmt = $db->prepare('SELECT role FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $roleStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        $member = $roleStmt->fetch();

        if (!$member || !in_array($member['role'], ['owner', 'admin'])) {
            jsonError('Only group owners or admins can create shareable invite links.', 403);
        }

        $body = getRequestBody();
        $maxUses = !empty($body['max_uses']) ? (int)$body['max_uses'] : null;
        $expiresInDays = !empty($body['expires_in_days']) ? (int)$body['expires_in_days'] : null;

        $expiresAt = null;
        if ($expiresInDays !== null && $expiresInDays > 0) {
            $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expiresInDays} days"));
        }

        $code = bin2hex(random_bytes(8)); // 16-character unique code

        $stmt = $db->prepare('
            INSERT INTO group_invites (conversation_id, code, creator_id, max_uses, expires_at)
            VALUES (:cid, :code, :creator_id, :max_uses, :expires_at)
        ');
        $stmt->execute([
            'cid' => $convId,
            'code' => $code,
            'creator_id' => $currentUser['id'],
            'max_uses' => $maxUses,
            'expires_at' => $expiresAt
        ]);

        $inviteId = (int)$db->lastInsertId();

        jsonResponse([
            'success' => true,
            'invite' => [
                'id' => $inviteId,
                'code' => $code,
                'invite_url' => APP_URL . '/join/' . $code,
                'max_uses' => $maxUses,
                'uses_count' => 0,
                'expires_at' => $expiresAt
            ]
        ], 201);
    }

    /**
     * GET /api/invites/{code}
     * Public Preview endpoint (Does NOT strictly require auth to see preview details!)
     */
    public static function getByCode(string $code): void {
        $code = trim($code);
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT gi.id AS invite_id, gi.conversation_id, gi.code, gi.max_uses, gi.uses_count, gi.expires_at, gi.is_disabled,
                   c.name AS group_name, c.description AS group_description, c.avatar_url AS group_avatar, c.created_at AS group_created_at,
                   (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) AS member_count
            FROM group_invites gi
            JOIN conversations c ON gi.conversation_id = c.id
            WHERE gi.code = :code
            LIMIT 1
        ');
        $stmt->execute(['code' => $code]);
        $invite = $stmt->fetch();

        if (!$invite) {
            jsonError('Invalid or expired invite link.', 404);
        }

        $isValid = true;
        $reason = null;

        if ($invite['is_disabled']) {
            $isValid = false;
            $reason = 'This invite link has been disabled by an admin.';
        } else if ($invite['max_uses'] !== null && (int)$invite['uses_count'] >= (int)$invite['max_uses']) {
            $isValid = false;
            $reason = 'This invite link has reached its maximum usage limit.';
        } else if ($invite['expires_at'] !== null && strtotime($invite['expires_at']) < time()) {
            $isValid = false;
            $reason = 'This invite link has expired.';
        }

        jsonResponse([
            'success' => true,
            'preview' => [
                'invite_id' => (int)$invite['invite_id'],
                'code' => $invite['code'],
                'conversation_id' => (int)$invite['conversation_id'],
                'group_name' => $invite['group_name'],
                'group_description' => $invite['group_description'],
                'group_avatar' => $invite['group_avatar'],
                'member_count' => (int)$invite['member_count'],
                'is_valid' => $isValid,
                'invalid_reason' => $reason
            ]
        ]);
    }

    /**
     * POST /api/invites/{code}/join
     */
    public static function joinGroup(string $code): void {
        $currentUser = AuthMiddleware::authenticate();
        $code = trim($code);

        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT gi.id AS invite_id, gi.conversation_id, gi.max_uses, gi.uses_count, gi.expires_at, gi.is_disabled,
                   c.name AS group_name
            FROM group_invites gi
            JOIN conversations c ON gi.conversation_id = c.id
            WHERE gi.code = :code
            LIMIT 1
        ');
        $stmt->execute(['code' => $code]);
        $invite = $stmt->fetch();

        if (!$invite) {
            jsonError('Invalid invite link.', 404);
        }

        if ($invite['is_disabled'] || ($invite['max_uses'] !== null && $invite['uses_count'] >= $invite['max_uses']) || ($invite['expires_at'] !== null && strtotime($invite['expires_at']) < time())) {
            jsonError('This invite link is no longer valid.', 400);
        }

        $convId = (int)$invite['conversation_id'];

        // Check if already a member
        $memStmt = $db->prepare('SELECT role FROM conversation_members WHERE conversation_id = :cid AND user_id = :uid LIMIT 1');
        $memStmt->execute(['cid' => $convId, 'uid' => $currentUser['id']]);
        if ($memStmt->fetch()) {
            jsonResponse([
                'success' => true,
                'message' => 'You are already a member of this group.',
                'conversation_id' => $convId
            ]);
        }

        $db->beginTransaction();

        try {
            // Join conversation
            $join = $db->prepare('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (:cid, :uid, "member")');
            $join->execute(['cid' => $convId, 'uid' => $currentUser['id']]);

            // Increment usage count
            $inc = $db->prepare('UPDATE group_invites SET uses_count = uses_count + 1 WHERE id = :id');
            $inc->execute(['id' => $invite['invite_id']]);

            // Add system message
            $sysMsg = $db->prepare('
                INSERT INTO messages (conversation_id, sender_id, message_type, content)
                VALUES (:cid, :sid, "system", :content)
            ');
            $sysMsg->execute([
                'cid' => $convId,
                'sid' => $currentUser['id'],
                'content' => $currentUser['display_name'] . ' joined the group via invite link.'
            ]);

            $db->commit();

            jsonResponse([
                'success' => true,
                'message' => 'Successfully joined group!',
                'conversation_id' => $convId
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            jsonError('Failed to join group: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/invites/{id}/disable
     */
    public static function disableInvite(int $inviteId): void {
        $currentUser = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT gi.id, cm.role
            FROM group_invites gi
            JOIN conversation_members cm ON gi.conversation_id = cm.conversation_id AND cm.user_id = :uid
            WHERE gi.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $inviteId, 'uid' => $currentUser['id']]);
        $inv = $stmt->fetch();

        if (!$inv || !in_array($inv['role'], ['owner', 'admin'])) {
            jsonError('Unauthorized to disable this invite link.', 403);
        }

        $upd = $db->prepare('UPDATE group_invites SET is_disabled = 1 WHERE id = :id');
        $upd->execute(['id' => $inviteId]);

        jsonResponse(['success' => true, 'message' => 'Invite link disabled']);
    }
}
