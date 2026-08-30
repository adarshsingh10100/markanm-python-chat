<?php
// CORS Middleware for MarkanM Chat REST API

class CORSMiddleware {
    public static function handle(): void {
        $allowedOrigins = [
            'https://chat.markanm.com',
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173'
        ];
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowedOrigins, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header("Access-Control-Allow-Credentials: true");
        }

        header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit();
        }
    }
}
