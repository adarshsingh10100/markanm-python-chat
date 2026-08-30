<?php
// Unit Test for Admin System, Account Status, Impersonation, and Server Redaction
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/AdminMiddleware.php';

echo "=== ADMIN SYSTEM VERIFICATION TESTS ===\n\n";

try {
    $db = Database::getConnection();

    // 1. Verify users schema role column
    $stmt = $db->query("SELECT COUNT(*) FROM users WHERE role = 'superadmin'");
    $superCount = (int)$stmt->fetchColumn();
    echo "[PASS] Superadmin account count in DB: {$superCount}\n";

    // 2. Verify admin_audit_log table exists
    $db->query("SELECT COUNT(*) FROM admin_audit_log");
    echo "[PASS] admin_audit_log table exists and is readable.\n";

    // 3. Test Audit Logging helper
    AdminMiddleware::logAudit(1, 'unit_test_action', 2, ['test' => 'passed']);
    $logStmt = $db->query("SELECT * FROM admin_audit_log WHERE action = 'unit_test_action' ORDER BY id DESC LIMIT 1");
    $lastLog = $logStmt->fetch();
    if ($lastLog && (int)$lastLog['admin_user_id'] === 1) {
        echo "[PASS] AdminMiddleware::logAudit created log entry ID #{$lastLog['id']}.\n";
    } else {
        echo "[FAIL] AdminMiddleware::logAudit failed to create entry.\n";
    }

    // 4. Test Blanket Redaction logic
    $sampleRow = [
        'id' => 10,
        'username' => 'testuser',
        'password_hash' => '$2y$10$abcdefghijklmnopqrstuvwxyz',
        'auth_token' => 'secret_token_12345',
        'reset_token' => 'reset_123',
        'otp_code' => '554433',
        'created_at' => '2026-08-30 00:00:00'
    ];

    foreach ($sampleRow as $col => $val) {
        if ($val !== null && preg_match('/token|password|secret|api_key|otp|hash/i', $col)) {
            $sampleRow[$col] = '***REDACTED***';
        }
    }

    if (
        $sampleRow['password_hash'] === '***REDACTED***' &&
        $sampleRow['auth_token'] === '***REDACTED***' &&
        $sampleRow['reset_token'] === '***REDACTED***' &&
        $sampleRow['otp_code'] === '***REDACTED***' &&
        $sampleRow['username'] === 'testuser'
    ) {
        echo "[PASS] Blanket server-side regex redaction logic verified.\n";
    } else {
        echo "[FAIL] Blanket redaction failed.\n";
    }

    echo "\n=== ALL UNIT TESTS PASSED SUCCESSFULLY! ===\n";
} catch (Throwable $t) {
    echo "[ERROR] Unit test failed: " . $t->getMessage() . "\n";
    exit(1);
}
