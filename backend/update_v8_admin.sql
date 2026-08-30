-- Migration v8: Admin Panel, Account Status, Impersonation, App Settings & Audit Logs

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role ENUM('user','admin','superadmin') NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS account_status ENUM('active','suspended','banned') NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_until DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(255) DEFAULT NULL;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS is_impersonation TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impersonated_by INT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS app_settings (
  `key` VARCHAR(100) PRIMARY KEY,
  value_encrypted TEXT NOT NULL,
  updated_by INT DEFAULT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_user_id INT DEFAULT NULL,
  details JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin (admin_user_id),
  INDEX idx_target (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE users SET role = 'superadmin' WHERE LOWER(username) IN ('gdr', 'admin', 'markanm');
