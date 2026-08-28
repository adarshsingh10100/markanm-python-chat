<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class StickerController {

    /**
     * GET /api/stickers
     */
    public static function getPacks(): void {
        $packs = [
            [
                'id' => 1,
                'name' => 'Reactions',
                'slug' => 'reactions',
                'icon' => '😊',
                'stickers' => [
                    ['id' => 101, 'name' => 'Thumbs Up', 'url' => 'https://api.iconify.design/twemoji:thumbs-up.svg'],
                    ['id' => 102, 'name' => 'Heart Eyes', 'url' => 'https://api.iconify.design/twemoji:smiling-face-with-heart-eyes.svg'],
                    ['id' => 103, 'name' => 'Party', 'url' => 'https://api.iconify.design/twemoji:partying-face.svg'],
                    ['id' => 104, 'name' => 'Mind Blown', 'url' => 'https://api.iconify.design/twemoji:exploding-head.svg']
                ]
            ],
            [
                'id' => 2,
                'name' => 'Funny',
                'slug' => 'funny',
                'icon' => '😂',
                'stickers' => [
                    ['id' => 201, 'name' => 'LOL', 'url' => 'https://api.iconify.design/twemoji:rolling-on-the-floor-laughing.svg'],
                    ['id' => 202, 'name' => 'Facepalm', 'url' => 'https://api.iconify.design/twemoji:man-facepalming.svg'],
                    ['id' => 203, 'name' => 'Shrug', 'url' => 'https://api.iconify.design/twemoji:woman-shrugging.svg'],
                    ['id' => 204, 'name' => 'Wink', 'url' => 'https://api.iconify.design/twemoji:winking-face.svg']
                ]
            ],
            [
                'id' => 3,
                'name' => 'Hype',
                'slug' => 'hype',
                'icon' => '🔥',
                'stickers' => [
                    ['id' => 301, 'name' => 'Fire', 'url' => 'https://api.iconify.design/twemoji:fire.svg'],
                    ['id' => 302, 'name' => 'Rocket', 'url' => 'https://api.iconify.design/twemoji:rocket.svg'],
                    ['id' => 303, 'name' => '100', 'url' => 'https://api.iconify.design/twemoji:hundred-points.svg'],
                    ['id' => 304, 'name' => 'Sparkles', 'url' => 'https://api.iconify.design/twemoji:sparkles.svg']
                ]
            ]
        ];

        jsonResponse(['success' => true, 'packs' => $packs]);
    }

    /**
     * GET /api/stickers/search?q=...
     * Proxy to GIPHY Worldwide Animated Stickers API
     */
    public static function search(): void {
        $query = trim($_GET['q'] ?? '');
        $apiKey = 'dc6zaTOxFJmzC'; // GIPHY Public Beta Key

        $endpoint = empty($query)
            ? "https://api.giphy.com/v1/stickers/trending?api_key={$apiKey}&limit=30"
            : "https://api.giphy.com/v1/stickers/search?api_key={$apiKey}&q=" . urlencode($query) . "&limit=30";

        $results = [];

        try {
            $context = stream_context_create([
                'http' => [
                    'timeout' => 4,
                    'user_agent' => 'MarkanMChat/3.0'
                ]
            ]);
            $json = @file_get_contents($endpoint, false, $context);
            if ($json) {
                $data = json_decode($json, true);
                if (!empty($data['data']) && is_array($data['data'])) {
                    foreach ($data['data'] as $item) {
                        $results[] = [
                            'id' => $item['id'],
                            'name' => $item['title'] ?: 'Sticker',
                            'url' => $item['images']['fixed_height']['url'] ?? $item['images']['original']['url']
                        ];
                    }
                }
            }
        } catch (Throwable $e) {}

        jsonResponse(['success' => true, 'stickers' => $results]);
    }
}
