<?php
/**
 * Test Environment-Based Database Connection
 * This file tests if your .env configuration is working correctly
 */

// Include the connection file
require_once 'Api/conn.php';

// Set response header
header('Content-Type: application/json');

// If we reached this point, connection was successful
echo json_encode([
    'success' => true,
    'message' => '✅ Database connection successful!',
    'environment' => [
        'app_env' => $_ENV['APP_ENV'] ?? 'not set',
        'database' => $_ENV['DB_DATABASE'] ?? 'not set',
        'host' => $_ENV['DB_HOST'] ?? 'not set',
        'charset' => $_ENV['DB_CHARSET'] ?? 'not set',
    ],
    'connection' => [
        'status' => 'Connected',
        'driver' => $conn->getAttribute(PDO::ATTR_DRIVER_NAME),
        'server_version' => $conn->getAttribute(PDO::ATTR_SERVER_VERSION),
    ],
    'note' => 'Your secure environment-based connection is working! You can delete this test file.'
], JSON_PRETTY_PRINT);
?>
