<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class GifController {

    /**
     * GET /api/gifs/search?q=...
     * Proxy to GIPHY Worldwide GIF Search API
     */
    public static function search(): void {
        $query = trim($_GET['q'] ?? '');
        $apiKey = 'dc6zaTOxFJmzC'; // GIPHY Public Beta Key

        $endpoint = empty($query)
            ? "https://api.giphy.com/v1/gifs/trending?api_key={$apiKey}&limit=30"
            : "https://api.giphy.com/v1/gifs/search?api_key={$apiKey}&q=" . urlencode($query) . "&limit=30";

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
                            'title' => $item['title'] ?: 'GIF',
                            'url' => $item['images']['original']['url'] ?? $item['images']['fixed_height']['url'],
                            'preview' => $item['images']['fixed_height']['url'] ?? $item['images']['original']['url']
                        ];
                    }
                }
            }
        } catch (Throwable $e) {
            // Fallback to static curation if network is restricted
        }

        if (empty($results)) {
            $results = [
                ['id' => 'g1', 'title' => 'Happy Cat', 'url' => 'https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif', 'preview' => 'https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif'],
                ['id' => 'g2', 'title' => 'Mind Blown', 'url' => 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', 'preview' => 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif'],
                ['id' => 'g3', 'title' => 'Applause', 'url' => 'https://media.giphy.com/media/swtiK9jFZLBzG/giphy.gif', 'preview' => 'https://media.giphy.com/media/swtiK9jFZLBzG/giphy.gif'],
                ['id' => 'g4', 'title' => 'Popcorn', 'url' => 'https://media.giphy.com/media/t3sZxY5zS5B0z5zMIz/giphy.gif', 'preview' => 'https://media.giphy.com/media/t3sZxY5zS5B0z5zMIz/giphy.gif']
            ];
        }

        jsonResponse(['success' => true, 'gifs' => $results]);
    }
}
