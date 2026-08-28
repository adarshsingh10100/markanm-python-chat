<?php

class HashUtils {
    private static string $salt = 'MarkanM_Chat_Secret_Salt_2026_x9k2';
    private static string $alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    /**
     * Encode an integer database ID into a sleek, encrypted string slug (e.g., 1 -> 'c8f2a9d1')
     */
    public static function encodeId(int $id): string {
        if ($id <= 0) return '';

        $val = ($id * 9973) ^ 0x3f5c7a;
        $hash = '';
        $base = strlen(self::$alphabet);

        while ($val > 0) {
            $hash = self::$alphabet[$val % $base] . $hash;
            $val = intdiv($val, $base);
        }

        $checksumChar = self::$alphabet[($id * 31 + 7) % $base];
        return strtolower($checksumChar . $hash);
    }

    /**
     * Decode an encrypted string slug or plain integer string back to the original integer ID
     */
    public static function decodeId(string $hash): int {
        $clean = trim($hash);
        if (is_numeric($clean)) {
            return (int)$clean;
        }

        if (strlen($clean) < 2) return 0;

        $body = substr($clean, 1);
        $base = strlen(self::$alphabet);
        $val = 0;

        for ($i = 0; $i < strlen($body); $i++) {
            $char = $body[$i];
            $pos = strpos(self::$alphabet, $char);
            if ($pos === false) {
                $pos = strpos(strtolower(self::$alphabet), strtolower($char));
            }
            if ($pos !== false) {
                $val = $val * $base + $pos;
            }
        }

        $id = ($val ^ 0x3f5c7a) / 9973;

        return (is_int($id) || is_float($id)) && $id > 0 ? (int)round($id) : 0;
    }

    /**
     * Generate a public Client ID string (e.g., 'mkm_app_9a8f7d6e5c4b3a21')
     */
    public static function generateClientId(): string {
        return 'mkm_app_' . bin2hex(random_bytes(12));
    }

    /**
     * Generate a sensitive Client Secret string (e.g., 'mkm_sec_...')
     */
    public static function generateClientSecret(): string {
        return 'mkm_sec_' . bin2hex(random_bytes(24));
    }

    /**
     * Generate a short-lived OAuth Authorization Code (e.g., 'mkm_code_...')
     */
    public static function generateAuthCode(): string {
        return 'mkm_code_' . bin2hex(random_bytes(20));
    }

    /**
     * Generate an OAuth Access Token (e.g., 'mkm_tok_...')
     */
    public static function generateAccessToken(): string {
        return 'mkm_tok_' . bin2hex(random_bytes(32));
    }

    /**
     * Generate Webhook Secret signing key
     */
    public static function generateWebhookSecret(): string {
        return 'mkm_whsec_' . bin2hex(random_bytes(20));
    }

    /**
     * Secure hash for secret strings
     */
    public static function hashSecret(string $secret): string {
        return hash('sha256', self::$salt . ':' . $secret);
    }
}
