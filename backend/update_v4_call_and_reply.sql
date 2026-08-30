-- MarkanM Chat SQL Update v4: Google Meet Call & Message Types
-- Run this query on your Hostinger phpMyAdmin / MySQL Database

ALTER TABLE `messages` 
MODIFY COLUMN `message_type` ENUM('text', 'image', 'video', 'audio', 'file', 'system', 'gif', 'sticker', 'poll', 'call') NOT NULL DEFAULT 'text';
