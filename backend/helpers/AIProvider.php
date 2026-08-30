<?php

abstract class AIProvider {
    abstract public function getName(): string;
    abstract public function generateResponse(array $messages, array $options = []): array;
    
    protected function logUsage(array $logData): void {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare('
                INSERT INTO ai_generation_logs
                (character_id, conversation_id, user_id, provider, model, latency_ms, tokens_used, status, error_message)
                VALUES (:cid, :conv_id, :uid, :provider, :model, :latency, :tokens, :status, :err)
            ');
            $stmt->execute([
                'cid' => $logData['character_id'] ?? null,
                'conv_id' => $logData['conversation_id'] ?? null,
                'uid' => $logData['user_id'] ?? null,
                'provider' => $this->getName(),
                'model' => $logData['model'] ?? 'default',
                'latency' => $logData['latency_ms'] ?? 0,
                'tokens' => $logData['tokens_used'] ?? 0,
                'status' => $logData['status'] ?? 'success',
                'err' => $logData['error_message'] ?? null
            ]);
        } catch (Throwable $t) {
            // Log failure ignored to prevent crashing main response
        }
    }

    public static function stripReasoningLeak(string $text): string {
        if (empty($text)) {
            throw new Exception("Empty response content received.");
        }

        // 1. Remove complete or truncated <think>...</think> and <reasoning>...</reasoning> blocks
        $clean = preg_replace('#<think>.*?</think>#is', '', $text);
        $clean = preg_replace('#<reasoning>.*?</reasoning>#is', '', $clean);

        if (stripos($clean, '</think>') !== false) {
            $parts = preg_split('#</think>#i', $clean, 2);
            $clean = $parts[1] ?? '';
        }
        if (stripos($clean, '</reasoning>') !== false) {
            $parts = preg_split('#</reasoning>#i', $clean, 2);
            $clean = $parts[1] ?? '';
        }

        // 2. Remove Harmony-format control tokens and analysis blocks
        $clean = preg_replace('#<\|channel\|>analysis.*?<\|(?:start|message)\|>#is', '', $clean);
        $clean = str_replace([
            '<|start|>', '<|end|>', '<|channel|>', '<|message|>', '<|return|>', '<|constrain|>'
        ], '', $clean);

        $clean = trim($clean);

        if (empty($clean)) {
            throw new Exception("Response content empty after stripping reasoning thoughts.");
        }

        return $clean;
    }
}
