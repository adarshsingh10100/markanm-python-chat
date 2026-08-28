<?php
namespace MarkanM\Bot;

class Bot {
    private $token;
    private $baseUrl;

    public function __construct(string $token, string $baseUrl = 'https://chat.markanm.com/api/bot/v1') {
        $this->token = $token;
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    public function sendMessage(string $roomId, string $text): array {
        $ch = curl_init("{$this->baseUrl}/rooms/{$roomId}/messages");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['text' => $text]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            "Authorization: Bearer {$this->token}"
        ]);
        $res = curl_exec($ch);
        curl_close($ch);
        return json_decode($res, true) ?: [];
    }

    public function verifyWebhook(string $payloadBody, string $signatureHeader, string $secret): bool {
        if (empty($signatureHeader) || empty($secret)) return false;
        preg_match('/t=([0-9]+),v1=([a-f0-9]+)/i', $signatureHeader, $m);
        if (!$m) return false;
        $timestamp = $m[1];
        $expectedSig = $m[2];
        $computedSig = hash_hmac('sha256', "{$timestamp}.{$payloadBody}", $secret);
        return hash_equals($computedSig, $expectedSig);
    }
}
