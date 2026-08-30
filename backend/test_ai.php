<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/helpers/AIService.php';

try {
    $messages = [
        ['role' => 'user', 'content' => 'send your cute photo']
    ];
    $options = [
        'provider' => 'auto',
        'model' => 'default',
        'character_id' => 1
    ];
    $result = AIService::generateResponse($messages, $options);
    print_r($result);
} catch (Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
