<?php
/**
 * CORS Configuration
 * Handles Cross-Origin Resource Sharing headers
 * Uses environment variables from config.php
 * 
 * Best Practice:
 * - Include this file at the top of API files before any output
 * - CORS origin loaded from .env file
 */

require_once __DIR__ . '/config.php';

// Get allowed origins from configuration
$allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001',
];

// Get the request origin
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Check if the origin is allowed
if (in_array($requestOrigin, $allowedOrigins)) {
    $corsOrigin = $requestOrigin;
} else {
    // Fallback to config or first allowed origin
    $corsOrigin = Config::get('CORS_ORIGIN', $allowedOrigins[0]);
}

// Set CORS headers
header("Access-Control-Allow-Origin: $corsOrigin");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400"); // Cache preflight for 24 hours
header("Content-Type: application/json; charset=utf-8");

// Handle preflight OPTIONS requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
