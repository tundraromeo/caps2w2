<?php
/**
 * Test Script for Production Readiness
 * Verifies configuration loading and database connectivity
 */

// Include configuration
require_once __DIR__ . '/config.php';

// Test configuration loading
echo "Testing Configuration Loading...\n";
echo "DB_HOST: " . Config::get('DB_HOST') . "\n";
echo "DB_NAME: " . Config::get('DB_NAME') . "\n";
echo "APP_ENV: " . Config::get('APP_ENV') . "\n";
echo "CORS_ALLOWED_ORIGINS: " . Config::get('CORS_ALLOWED_ORIGINS') . "\n";
echo "Configuration loaded successfully.\n\n";

// Test database connection
echo "Testing Database Connection...\n";
try {
    require_once __DIR__ . '/conn.php';
    $conn = getDatabaseConnection();
    echo "Database connection successful.\n";

    // Test a simple query
    $stmt = $conn->query("SELECT 1 as test");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($result && $result['test'] == 1) {
        echo "Database query successful.\n";
    } else {
        echo "Database query failed.\n";
    }
} catch (Exception $e) {
    echo "Database connection failed: " . (Config::isDebug() ? $e->getMessage() : "Check your .env file") . "\n";
}

// Test CORS
echo "\nTesting CORS Configuration...\n";
require_once __DIR__ . '/cors.php';
echo "CORS headers set successfully.\n";

// Test health endpoint
echo "\nTesting Health Endpoint...\n";
require_once __DIR__ . '/health.php';
?>