-- MarkanM Chat - Database Migration Script
-- Updates schema for Email OTP verification and Email Notification tracking

-- 1. Add OTP Verification columns if they don't exist
ALTER TABLE `users` 
  ADD COLUMN IF NOT EXISTS `otp_code` VARCHAR(6) DEFAULT NULL AFTER `otp_secret`,
  ADD COLUMN IF NOT EXISTS `otp_expires` DATETIME DEFAULT NULL AFTER `otp_code`;

-- 2. Add Last Email Notification timestamp to conversation_members to prevent email spamming
ALTER TABLE `conversation_members` 
  ADD COLUMN IF NOT EXISTS `last_email_notified_at` DATETIME DEFAULT NULL;

-- 3. Auto-verify existing accounts that were created prior to this update
UPDATE `users` SET `is_verified` = 1 WHERE `is_verified` = 0;
