<?php
/**
 * Health Check Endpoint
 * Simple endpoint to verify API is working and CORS is configured correctly
 */

// Include proper CORS configuration
require_once __DIR__ . '/cors.php';

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Return health status
$response = [
    'success' => true,
    'message' => 'API is healthy',
    'timestamp' => date('Y-m-d H:i:s'),
    'server' => [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'Unknown',
        'request_origin' => $_SERVER['HTTP_ORIGIN'] ?? 'Not set',
        'request_referer' => $_SERVER['HTTP_REFERER'] ?? 'Not set',
    ],
    'cors' => [
        'origin_header' => $_SERVER['HTTP_ORIGIN'] ?? 'Not provided',
        'allowed_origin' => '*',
        'status' => 'CORS enabled'
    ]
];

http_response_code(200);
echo json_encode($response, JSON_PRETTY_PRINT);
exit();
?>
