<?php
require_once __DIR__ . '/../config/config.php';

class CryptoHelper {

    /**
     * Encrypt plaintext using AES-256-GCM
     */
    public static function encrypt(string $plaintext): string {
        $rawKey = base64_decode(APP_ENCRYPTION_KEY);
        if (strlen($rawKey) !== 32) {
            $rawKey = hash('sha256', APP_ENCRYPTION_KEY, true);
        }

        $iv = random_bytes(12); // 96-bit IV for GCM
        $tag = '';
        
        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            $rawKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($ciphertext === false) {
            throw new Exception("Encryption failure.");
        }

        // Combine IV (12 bytes) + Tag (16 bytes) + Ciphertext into one binary blob and base64 encode
        return base64_encode($iv . $tag . $ciphertext);
    }

    /**
     * Decrypt ciphertext using AES-256-GCM
     */
    public static function decrypt(string $encoded): string {
        $rawKey = base64_decode(APP_ENCRYPTION_KEY);
        if (strlen($rawKey) !== 32) {
            $rawKey = hash('sha256', APP_ENCRYPTION_KEY, true);
        }

        $data = base64_decode($encoded);
        if ($data === false || strlen($data) < 28) {
            throw new Exception("Invalid ciphertext structure.");
        }

        $iv = substr($data, 0, 12);
        $tag = substr($data, 12, 16);
        $ciphertext = substr($data, 28);

        $plaintext = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $rawKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($plaintext === false) {
            throw new Exception("Decryption failure or invalid key.");
        }

        return $plaintext;
    }
}
