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

// Load environment variables
require_once __DIR__ . '/../simple_dotenv.php';
$dotenv = new SimpleDotEnv(__DIR__ . '/..');
try {
    $dotenv->load();
} catch (Exception $e) {
    // .env not loaded, will use defaults
}

// Get allowed origins from .env - REQUIRED for production
if (!isset($_ENV['CORS_ALLOWED_ORIGINS']) || empty($_ENV['CORS_ALLOWED_ORIGINS'])) {
    // Development fallback only - logs warning
    // error_log("WARNING: CORS_ALLOWED_ORIGINS not set in .env file. Using development defaults.");
    $corsOriginsEnv = 'http://localhost:3000,http://localhost:3001,https://enguiostore.vercel.app';
} else {
    $corsOriginsEnv = $_ENV['CORS_ALLOWED_ORIGINS'];
}

$allowedOrigins = array_map('trim', explode(',', $corsOriginsEnv));

// Get the request origin
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Check if the origin is allowed
if (!empty($requestOrigin) && in_array($requestOrigin, $allowedOrigins)) {
    $corsOrigin = $requestOrigin;
} else {
    // Use first allowed origin if request origin doesn't match
    $corsOrigin = $allowedOrigins[0] ?? 'https://enguiostore.vercel.app';
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
