<?php
/**
 * Simple Test Environment-Based Database Connection (No Composer Required)
 * This file tests if your .env configuration is working correctly
 */

// Include the simple connection file
require_once 'Api/conn_simple.php';

// Set response header
header('Content-Type: application/json');

// If we reached this point, connection was successful
echo json_encode([
    'success' => true,
    'message' => '✅ Database connection successful! (No Composer required)',
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
    'note' => 'Your secure environment-based connection is working without Composer!'
], JSON_PRETTY_PRINT);
?>
