<?php
// PHPMailer Helper Module for MarkanM Chat
// Dynamically locates composer vendor/autoload.php on Hostinger shared hosting

class Mailer {

    private static function getAutoloader(): ?string {
        $possiblePaths = [
            __DIR__ . '/../../vendor/autoload.php',
            __DIR__ . '/../../../vendor/autoload.php',
            __DIR__ . '/../vendor/autoload.php',
            ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/vendor/autoload.php',
            dirname($_SERVER['DOCUMENT_ROOT'] ?? '') . '/vendor/autoload.php',
            '/home/u200853583/public_html/vendor/autoload.php'
        ];

        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }
        return null;
    }

    private static function createPHPMailer(): object {
        $autoloader = self::getAutoloader();
        if ($autoloader) {
            require_once $autoloader;
        }

        if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
            throw new Exception('PHPMailer class not found. Autoloader could not be located.');
        }

        $mail = new PHPMailer\PHPMailer\PHPMailer(true);

        // Server Settings
        $mail->isSMTP();
        $mail->Host       = getenv('SMTP_HOST') ?: 'smtp.hostinger.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = getenv('SMTP_USER') ?: 'chat@markanm.com';
        $mail->Password   = getenv('SMTP_PASS') ?: 'GDR@Ayushi@Markanm@Bhhadva@10100';
        
        $mail->SMTPSecure = getenv('SMTP_SECURE') ?: PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int)(getenv('SMTP_PORT') ?: 587);

        $mail->setFrom($mail->Username, 'MarkanM Chat');
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';

        return $mail;
    }

    /**
     * Send 6-Digit Email Verification OTP
     */
    public static function sendOTPEmail(string $toEmail, string $displayName, string $otpCode): bool {
        try {
            $mail = self::createPHPMailer();
            $mail->addAddress($toEmail, $displayName);
            $mail->Subject = "Your MarkanM Verification Code: {$otpCode}";

            $mail->Body = '
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; background-color: #0B0E14; color: #ffffff; padding: 20px; margin: 0;">
              <div style="max-width: 500px; margin: 0 auto; background: #131822; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #6366F1; margin: 0; font-size: 22px;">MarkanM Chat</h2>
                  <p style="color: #9CA3AF; font-size: 13px; margin-top: 5px;">Confirm your email address</p>
                </div>
                <p style="font-size: 14px; color: #E5E7EB;">Hello <strong>' . htmlspecialchars($displayName) . '</strong>,</p>
                <p style="font-size: 14px; color: #9CA3AF;">Your 6-digit email verification code is:</p>
                <div style="text-align: center; margin: 25px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366F1; background: #1B2232; padding: 14px 28px; border-radius: 14px; border: 1px solid rgba(99,102,241,0.3); display: inline-block;">' . htmlspecialchars($otpCode) . '</span>
                </div>
                <p style="font-size: 12px; color: #6B7280; text-align: center;">This code will expire in 15 minutes. If you did not create a MarkanM account, please ignore this email.</p>
              </div>
            </body>
            </html>';

            return $mail->send();
        } catch (Throwable $e) {
            error_log("PHPMailer OTP Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send LinkedIn-style New Message Notification Email
     */
    public static function sendNewMessageNotification(string $toEmail, string $recipientName, string $senderName, string $messageSnippet): bool {
        try {
            $mail = self::createPHPMailer();
            $mail->addAddress($toEmail, $recipientName);
            $mail->Subject = "{$senderName} sent you a message on MarkanM Chat";

            $cleanSnippet = htmlspecialchars(mb_substr($messageSnippet, 0, 150));

            $mail->Body = '
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; background-color: #0B0E14; color: #ffffff; padding: 20px; margin: 0;">
              <div style="max-width: 520px; margin: 0 auto; background-color: #131822; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 15px;">
                  <span style="font-size: 18px; font-weight: bold; color: #6366F1;">MarkanM Chat</span>
                  <span style="float: right; font-size: 12px; color: #6B7280;">Inbox Notification</span>
                </div>
                
                <p style="font-size: 15px; color: #F3F4F6; margin-bottom: 16px;">
                  Hello <strong>' . htmlspecialchars($recipientName) . '</strong>,
                </p>

                <div style="background-color: #1B2232; border-left: 4px solid #6366F1; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                  <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #A855F7;">' . htmlspecialchars($senderName) . '</p>
                  <p style="margin: 0; font-size: 13px; color: #D1D5DB; line-height: 1.5;">"' . $cleanSnippet . '"</p>
                </div>

                <div style="text-align: center; margin: 28px 0 15px 0;">
                  <a href="https://chat.markanm.com/chat" style="background: linear-gradient(135deg, #6366F1 0%, #A855F7 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(99,102,241,0.4);">
                    Reply on MarkanM Chat
                  </a>
                </div>

                <p style="font-size: 11px; color: #6B7280; text-align: center; margin-top: 30px;">
                  🔒 Private & Secure Conversation • MarkanM Chat
                </p>
              </div>
            </body>
            </html>';

            return $mail->send();
        } catch (Throwable $e) {
            error_log("PHPMailer Message Notification Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send Stylish Platform Email Invitation
     */
    public static function sendEmailInvite(string $toEmail, string $inviterName, string $inviterUsername): bool {
        try {
            $mail = self::createPHPMailer();
            $mail->addAddress($toEmail);
            $mail->Subject = "{$inviterName} (@{$inviterUsername}) invited you to MarkanM Chat";

            $mail->Body = '
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; background-color: #0B0E14; color: #ffffff; padding: 20px; margin: 0;">
              <div style="max-width: 520px; margin: 0 auto; background-color: #131822; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 35px; box-shadow: 0 12px 35px rgba(0,0,0,0.6);">
                <div style="text-align: center; margin-bottom: 25px;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #6366F1 0%, #A855F7 100%); padding: 12px; border-radius: 16px; margin-bottom: 12px;">
                    <span style="font-size: 24px; color: #ffffff; font-weight: bold;">✦</span>
                  </div>
                  <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">MarkanM Chat</h2>
                  <p style="color: #6366F1; font-size: 13px; font-weight: 600; margin-top: 4px; tracking-wider: 1px;">PRIVATE SOCIAL CONVERSATION PLATFORM</p>
                </div>

                <div style="background-color: #1B2232; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 25px;">
                  <p style="font-size: 15px; color: #E5E7EB; margin: 0 0 8px 0;">
                    <strong>' . htmlspecialchars($inviterName) . '</strong> (<span style="color: #A855F7;">@' . htmlspecialchars($inviterUsername) . '</span>) has invited you to connect on MarkanM Chat.
                  </p>
                  <p style="font-size: 13px; color: #9CA3AF; margin: 0;">
                    Join now to start end-to-end private messaging, create group chats, and explore live social experiences.
                  </p>
                </div>

                <div style="background-color: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 14px; padding: 14px; margin-bottom: 25px; text-align: left;">
                  <div style="font-size: 12px; color: #A855F7; font-weight: bold; margin-bottom: 4px;">🔒 Private & Secure Guarantee</div>
                  <div style="font-size: 11px; color: #9CA3AF; line-height: 1.4;">
                    MarkanM Chat is built with complete privacy in mind. Your data and conversations are strictly isolated and protected.
                  </div>
                </div>

                <div style="text-align: center; margin: 30px 0 10px 0;">
                  <a href="https://chat.markanm.com/register" style="background: linear-gradient(135deg, #6366F1 0%, #A855F7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-size: 15px; font-weight: bold; display: inline-block; box-shadow: 0 6px 20px rgba(99,102,241,0.45);">
                    Accept Invitation & Sign Up
                  </a>
                </div>

                <p style="font-size: 11px; color: #6B7280; text-align: center; margin-top: 30px;">
                  This is a secure one-time invite from MarkanM Chat • chat.markanm.com
                </p>
              </div>
            </body>
            </html>';

            return $mail->send();
        } catch (Throwable $e) {
            error_log("PHPMailer Email Invite Error: " . $e->getMessage());
            return false;
        }
    }
}
