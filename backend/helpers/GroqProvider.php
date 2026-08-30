<?php
require_once __DIR__ . '/AIProvider.php';

class GroqProvider extends AIProvider {

    public function getName(): string {
        return 'groq';
    }

    private static function getPlatformKey(): string {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare('SELECT value_encrypted FROM app_settings WHERE `key` = "platform_groq_key" LIMIT 1');
            $stmt->execute();
            $enc = $stmt->fetchColumn();
            if ($enc) {
                require_once __DIR__ . '/CryptoHelper.php';
                $dec = CryptoHelper::decrypt($enc);
                if (!empty($dec)) return $dec;
            }
        } catch (Throwable $e) {}
        return defined('GROQ_API_KEY') ? GROQ_API_KEY : '';
    }

    public function generateResponse(array $messages, array $options = []): array {
        $apiKey = !empty($options['api_key_override']) ? $options['api_key_override'] : self::getPlatformKey();
        if (empty($apiKey) || $apiKey === 'gsk_default_groq_key') {
            throw new Exception("Groq API Key is not configured on server.");
        }

        $startTime = microtime(true);
        $model = $options['model'] ?? 'openai/gpt-oss-120b';
        if (empty($model) || $model === 'default' || strpos($model, 'sarvam') !== false || $model === 'llama-3.3-70b-versatile') {
            $model = 'openai/gpt-oss-120b';
        }
        $temperature = $options['temperature'] ?? 0.8;
        $maxTokens = $options['max_tokens'] ?? 1024;

        $url = 'https://api.groq.com/openai/v1/chat/completions';
        
        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => (float)$temperature,
            'max_tokens' => (int)$maxTokens,
            'reasoning_effort' => 'low',
            'reasoning_format' => 'hidden'
        ];

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
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
                    'header' => "Content-Type: application/json\r\nAuthorization: Bearer " . $apiKey . "\r\n",
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
            throw new Exception("Groq cURL error: " . $error);
        }

        $decoded = json_decode($response, true);

        if ($httpCode >= 400 || empty($decoded['choices'][0]['message']['content'])) {
            $errMsg = $decoded['error']['message'] ?? "HTTP {$httpCode}: {$response}";
            $this->logUsage([
                'character_id' => $options['character_id'] ?? null,
                'conversation_id' => $options['conversation_id'] ?? null,
                'user_id' => $options['user_id'] ?? null,
                'model' => $model,
                'latency_ms' => $latency,
                'status' => 'error',
                'error_message' => $errMsg
            ]);
            throw new Exception("Groq API Error: " . $errMsg);
        }

        $replyContent = trim($decoded['choices'][0]['message']['content']);
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
            'provider' => 'groq',
            'model' => $model,
            'content' => $replyContent,
            'latency_ms' => $latency,
            'tokens_used' => $tokensUsed
        ];
    }
}
