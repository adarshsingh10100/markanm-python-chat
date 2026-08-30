<?php
require_once __DIR__ . '/SarvamProvider.php';
require_once __DIR__ . '/GroqProvider.php';

class AIService {

    public static function generateResponse(array $messages, array $options = []): array {
        $requestedProvider = strtolower($options['provider'] ?? 'auto');
        
        $primary = null;
        $secondary = null;

        if ($requestedProvider === 'sarvam') {
            $primary = new SarvamProvider();
            $secondary = new GroqProvider();
        } else if ($requestedProvider === 'groq') {
            $primary = new GroqProvider();
            $secondary = new SarvamProvider();
        } else {
            // Auto mode: default primary is Sarvam, fallback is Groq
            $primary = new SarvamProvider();
            $secondary = new GroqProvider();
        }

        try {
            return $primary->generateResponse($messages, $options);
        } catch (Throwable $t) {
            error_log("AIService Primary Provider (" . $primary->getName() . ") Failed: " . $t->getMessage() . ". Trying secondary provider (" . $secondary->getName() . ")...");
            
            try {
                $res = $secondary->generateResponse($messages, $options);
                $res['fallback_triggered'] = true;
                $res['primary_error'] = $t->getMessage();
                return $res;
            } catch (Throwable $t2) {
                error_log("BOTH_PROVIDERS_FAILED: Primary (" . $primary->getName() . ") Error: " . $t->getMessage() . " | Secondary (" . $secondary->getName() . ") Error: " . $t2->getMessage());
                
                // Try personal BYOK key fallback if user_id is provided
                $userId = (int)($options['user_id'] ?? 0);
                if ($userId > 0) {
                    try {
                        require_once __DIR__ . '/CryptoHelper.php';
                        $db = Database::getConnection();
                        $keyStmt = $db->prepare('SELECT provider, api_key_encrypted FROM user_ai_keys WHERE user_id = :uid');
                        $keyStmt->execute(['uid' => $userId]);
                        $userKeys = [];
                        foreach ($keyStmt->fetchAll() as $row) {
                            $userKeys[$row['provider']] = CryptoHelper::decrypt($row['api_key_encrypted']);
                        }

                        // Try personal keys in same primary -> secondary order
                        $providersToTry = [$primary->getName() => $primary, $secondary->getName() => $secondary];
                        foreach ($providersToTry as $pName => $pInstance) {
                            if (!empty($userKeys[$pName])) {
                                try {
                                    $personalOptions = array_merge($options, ['api_key_override' => $userKeys[$pName]]);
                                    $res = $pInstance->generateResponse($messages, $personalOptions);
                                    $res['used_personal_key'] = true;
                                    $res['personal_provider'] = $pName;
                                    return $res;
                                } catch (Throwable $pkErr) {
                                    error_log("Personal Key Provider ($pName) Failed for user $userId: " . $pkErr->getMessage());
                                }
                            }
                        }
                    } catch (Throwable $pkOuterErr) {
                        error_log("Personal key lookup error: " . $pkOuterErr->getMessage());
                    }
                }

                return [
                    'provider' => 'persona_fallback',
                    'model' => 'persona_engine',
                    'content' => self::buildFallbackReply($messages, $options),
                    'is_fallback' => true,
                    'primary_error' => $t->getMessage(),
                    'secondary_error' => $t2->getMessage(),
                    'latency_ms' => 120,
                    'tokens_used' => 30
                ];
            }
        }
    }

    private static function buildFallbackReply(array $messages, array $options): string {
        $lastUserMsg = '';
        for ($i = count($messages) - 1; $i >= 0; $i--) {
            if (($messages[$i]['role'] ?? '') === 'user') {
                $lastUserMsg = trim($messages[$i]['content'] ?? '');
                break;
            }
        }

        // Clean user display name prefix if present
        if (strpos($lastUserMsg, ': ') !== false) {
            $parts = explode(': ', $lastUserMsg, 2);
            $lastUserMsg = $parts[1] ?? $lastUserMsg;
        }

        $charId = (int)($options['character_id'] ?? 0);
        $charName = 'Character';
        $speakingStyle = '';
        if ($charId > 0) {
            try {
                $db = Database::getConnection();
                $stmt = $db->prepare('SELECT display_name, speaking_style FROM ai_characters WHERE id = :id LIMIT 1');
                $stmt->execute(['id' => $charId]);
                $c = $stmt->fetch();
                if ($c) {
                    $charName = $c['display_name'];
                    $speakingStyle = $c['speaking_style'] ?? '';
                    $lowerName = strtolower($charName);
                    if (strpos($lowerName, 'makima') !== false) {
                        return "All humans are foolish, yet... intriguing. You ask '{$lastUserMsg}'? A good dog always obeys without questioning. What will you do for me?";
                    }
                    if (strpos($lowerName, 'itachi') !== false) {
                        return "People live their lives bound by what they accept as correct and true... Your words, '{$lastUserMsg}', reflect the path you walk. Tell me, what truth do you seek?";
                    }
                    if (strpos($lowerName, 'gojo') !== false) {
                        return "Yo! '{$lastUserMsg}'? Interesting choice of words! Don't worry, I'm the strongest, so you can tell me anything on your mind!";
                    }
                    if (strpos($lowerName, 'naruto') !== false) {
                        return "Dattebayo! You said '{$lastUserMsg}'! I'm listening loud and clear. Let's keep talking!";
                    }
                    if (strpos($lowerName, 'eren') !== false) {
                        return "If we don't fight, we can't win! You say '{$lastUserMsg}'... are you ready to fight for your freedom?";
                    }
                    if (strpos($lowerName, 'levi') !== false) {
                        return "Tch. '{$lastUserMsg}'? Make sure your hands are clean before you speak to me again.";
                    }
                    if (strpos($lowerName, 'luffy') !== false) {
                        return "Shishishi! '{$lastUserMsg}'? That sounds like an adventure! Got any meat?";
                    }
                    if (strpos($lowerName, 'albedo') !== false) {
                        return "Mmm, you speak of '{$lastUserMsg}'... Tell me, do you pledge your full devotion to Nazarick?";
                    }
                }
            } catch (Throwable $e) {}
        }
        // Generic fallback with optional speaking style
        if (!empty($speakingStyle)) {
            return "{$charName} ({$speakingStyle}) responds: '{$lastUserMsg}'. Tell me more.";
        }
        return "I hear you clearly... You said \"{$lastUserMsg}\". Tell me more about what you mean.";
    }
}
