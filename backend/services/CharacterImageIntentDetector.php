<?php

class CharacterImageIntentDetector {

    private static $moodKeywords = [
        'cute' => ['cute', 'kawaii', 'sweet', 'adorable', 'pretty'],
        'happy' => ['happy', 'smiling', 'cheerful', 'joy', 'smile', 'laughing'],
        'sad' => ['sad', 'crying', 'depressed', 'tears', 'gloomy'],
        'angry' => ['angry', 'mad', 'furious', 'rage', 'annoyed'],
        'battle' => ['battle', 'action', 'fighting', 'fight', 'power', 'attack'],
        'romantic' => ['romantic', 'love', 'loving', 'heart', 'romance'],
        'flirty' => ['flirty', 'wink', 'teasing', 'sexy'],
        'cool' => ['cool', 'badass', 'awesome', 'dramatic', 'stylist'],
        'casual' => ['casual', 'outfit', 'everyday', 'clothes', 'streetwear'],
        'funny' => ['funny', 'silly', 'chibi', 'meme', 'goofy'],
        'serious' => ['serious', 'calm', 'quiet', 'pokerface', 'stern'],
        'beach' => ['beach', 'swimsuit', 'summer', 'ocean', 'sea'],
        'formal' => ['formal', 'suit', 'dress', 'tuxedo'],
        'school' => ['school', 'uniform', 'student', 'class']
    ];

    private static $triggerPatterns = [
        '/(?:send|show|give|share|post)\s+(?:me\s+)?(?:a\s+|your\s+)?(?:\w+\s+)*(?:photo|pic|picture|snapshot|image|portrait|face|avatar)/i',
        '/(?:can|may)\s+i\s+(?:see|look\s+at)\s+(?:you|your\s+(?:\w+\s+)*(?:photo|pic|picture|snapshot|image|portrait|face))/i',
        '/what\s+do\s+you\s+(?:look\s+like|wear)/i',
        '/i\s+wanna?\s+see\s+(?:you|your\s+face|a\s+(?:\w+\s+)*(?:pic|photo|picture))/i',
        '/(?:got|have)\s+any\s+(?:\w+\s+)*(?:pics|photos|pictures|images)/i',
        '/show\s+yourself/i',
        '/lemme\s+see\s+you/i'
    ];

    private static $followUpPatterns = [
        '/(?:send|show)\s+(?:another|one\s+more|more)/i',
        '/another\s+one/i',
        '/one\s+more\s+(?:pic|photo|picture)/i',
        '/more\s+(?:pics|photos|pictures)/i'
    ];

    public static function detectIntent(string $userMessage, array $recentHistory = []): array {
        $cleanMessage = trim($userMessage);
        $lowerMessage = strtolower($cleanMessage);

        $isDirectRequest = false;
        foreach (self::$triggerPatterns as $pattern) {
            if (preg_match($pattern, $lowerMessage)) {
                $isDirectRequest = true;
                break;
            }
        }

        $isFollowUp = false;
        if (!$isDirectRequest) {
            foreach (self::$followUpPatterns as $pattern) {
                if (preg_match($pattern, $lowerMessage)) {
                    $isFollowUp = true;
                    break;
                }
            }
        }

        if (!$isDirectRequest && !$isFollowUp) {
            return [
                'is_image_request' => false,
                'intent' => null,
                'mood' => 'default',
                'style' => null,
                'count' => 1
            ];
        }

        // Extract mood
        $detectedMood = 'default';
        foreach (self::$moodKeywords as $mood => $keywords) {
            foreach ($keywords as $kw) {
                if (strpos($lowerMessage, $kw) !== false) {
                    $detectedMood = $mood;
                    break 2;
                }
            }
        }

        // If follow-up without explicit mood, check recent conversation history for previous mood
        if ($isFollowUp && $detectedMood === 'default') {
            for ($i = count($recentHistory) - 1; $i >= 0; $i--) {
                $msgContent = strtolower($recentHistory[$i]['content'] ?? '');
                foreach (self::$moodKeywords as $mood => $keywords) {
                    foreach ($keywords as $kw) {
                        if (strpos($msgContent, $kw) !== false) {
                            $detectedMood = $mood;
                            break 3;
                        }
                    }
                }
            }
        }

        return [
            'is_image_request' => true,
            'intent' => 'character_image_request',
            'mood' => $detectedMood,
            'style' => null,
            'count' => 1
        ];
    }
}
