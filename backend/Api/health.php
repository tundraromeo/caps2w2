<?php
/**
 * Health Check Endpoint
 * Verifies database connectivity and system status
 * Returns JSON response for monitoring
 */

// Include CORS and configuration
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/conn.php';

try {
    // Test database connection
    $conn = getDatabaseConnection();

    // Simple query to test connection
    $stmt = $conn->query("SELECT 1");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        http_response_code(200);
        echo json_encode([
            "status" => "healthy",
            "database" => "connected",
            "timestamp" => date('c'),
            "environment" => Config::get('APP_ENV')
        ]);
    } else {
        throw new Exception("Database query failed");
    }
} catch (Exception $e) {
    http_response_code(503);
    echo json_encode([
        "status" => "unhealthy",
        "database" => "disconnected",
        "error" => Config::isDebug() ? $e->getMessage() : "Service unavailable",
        "timestamp" => date('c')
    ]);
}
?>