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

// Get allowed origins from configuration (comma-separated)
$allowedOrigins = Config::get('CORS_ALLOWED_ORIGINS');
$originsArray = array_map('trim', explode(',', $allowedOrigins));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $originsArray)) {
    header("Access-Control-Allow-Origin: $origin");
} elseif (Config::isDebug()) {
    // In development, allow the first origin as fallback
    header("Access-Control-Allow-Origin: " . $originsArray[0]);
} else {
    // In production, do not set Allow-Origin if not in list
    header("Access-Control-Allow-Origin: none");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400"); // Cache preflight for 24 hours

// Security headers
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Strict-Transport-Security: max-age=31536000; includeSubDomains");

header("Content-Type: application/json; charset=utf-8");

// Handle preflight OPTIONS requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
