<?php
require_once __DIR__ . '/AIProvider.php';

class SarvamProvider extends AIProvider {
    
    public function getName(): string {
        return 'sarvam';
    }

    private static function getPlatformKey(): string {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare('SELECT value_encrypted FROM app_settings WHERE `key` = "platform_sarvam_key" LIMIT 1');
            $stmt->execute();
            $enc = $stmt->fetchColumn();
            if ($enc) {
                require_once __DIR__ . '/CryptoHelper.php';
                $dec = CryptoHelper::decrypt($enc);
                if (!empty($dec)) return $dec;
            }
        } catch (Throwable $e) {}
        return defined('SARVAM_API_KEY') ? SARVAM_API_KEY : '';
    }

    public function generateResponse(array $messages, array $options = []): array {
        $apiKey = !empty($options['api_key_override']) ? $options['api_key_override'] : self::getPlatformKey();
        if (empty($apiKey)) {
            throw new Exception("Sarvam API Key is not configured on server.");
        }

        $startTime = microtime(true);
        $model = $options['model'] ?? 'sarvam-105b';
        if (empty($model) || $model === 'default' || $model === 'sarvam-2b' || $model === 'sarvam-30b' || strpos($model, 'groq') !== false || strpos($model, 'llama') !== false || strpos($model, 'gpt') !== false) {
            $model = 'sarvam-105b';
        }
        $temperature = $options['temperature'] ?? 0.8;
        $maxTokens = $options['max_tokens'] ?? 1024;

        $url = 'https://api.sarvam.ai/v1/chat/completions';
        
        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => (float)$temperature,
            'max_tokens' => (int)$maxTokens,
            'reasoning_effort' => 'low'
        ];

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'api-subscription-key: ' . $apiKey,
                    'Authorization: Bearer ' . $apiKey
                ],
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_TIMEOUT => 25,
                CURLOPT_CONNECTTIMEOUT => 10
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
        } else {
            $opts = [
                'http' => [
                    'method' => 'POST',
                    'header' => "Content-Type: application/json\r\napi-subscription-key: " . $apiKey . "\r\nAuthorization: Bearer " . $apiKey . "\r\n",
                    'content' => json_encode($payload),
                    'timeout' => 25,
                    'ignore_errors' => true
                ],
                'ssl' => [
                    'verify_peer' => true,
                    'verify_peer_name' => true
                ]
            ];
            $context = stream_context_create($opts);
            $response = @file_get_contents($url, false, $context);
            $httpCode = 200;
            if (isset($http_response_header)) {
                foreach ($http_response_header as $header) {
                    if (preg_match('#HTTP/[0-9\.]+\s+([0-9]+)#i', $header, $m)) {
                        $httpCode = (int)$m[1];
                    }
                }
            }
            $error = ($response === false) ? 'HTTP Request failed (file_get_contents)' : '';
        }

        $latency = (int)((microtime(true) - $startTime) * 1000);

        if ($error) {
            $this->logUsage([
                'character_id' => $options['character_id'] ?? null,
                'conversation_id' => $options['conversation_id'] ?? null,
                'user_id' => $options['user_id'] ?? null,
                'model' => $model,
                'latency_ms' => $latency,
                'status' => 'error',
                'error_message' => "cURL Error: " . $error
            ]);
            throw new Exception("Sarvam cURL error: " . $error);
        }

        $decoded = json_decode($response, true);

        $replyContent = trim($decoded['choices'][0]['message']['content'] ?? '');

        if ($httpCode >= 400 || empty($replyContent)) {
            $errMsg = $decoded['error']['message'] ?? $decoded['message'] ?? ($httpCode < 400 ? "Sarvam returned no final content (reasoning consumed the token budget)" : "HTTP {$httpCode}: {$response}");
            $this->logUsage([
                'character_id' => $options['character_id'] ?? null,
                'conversation_id' => $options['conversation_id'] ?? null,
                'user_id' => $options['user_id'] ?? null,
                'model' => $model,
                'latency_ms' => $latency,
                'status' => 'error',
                'error_message' => $errMsg
            ]);
            throw new Exception("Sarvam API Error: " . $errMsg);
        }

        $replyContent = AIProvider::stripReasoningLeak($replyContent);
        $tokensUsed = $decoded['usage']['total_tokens'] ?? 0;

        $this->logUsage([
            'character_id' => $options['character_id'] ?? null,
            'conversation_id' => $options['conversation_id'] ?? null,
            'user_id' => $options['user_id'] ?? null,
            'model' => $model,
            'latency_ms' => $latency,
            'tokens_used' => $tokensUsed,
            'status' => 'success'
        ]);

        return [
            'provider' => 'sarvam',
            'model' => $model,
            'content' => $replyContent,
            'latency_ms' => $latency,
            'tokens_used' => $tokensUsed
        ];
    }
}
