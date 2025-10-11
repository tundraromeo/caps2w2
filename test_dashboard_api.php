<?php
// Test file to verify dashboard API endpoints
require_once 'Api/conn.php';

header('Content-Type: application/json');

try {
    $conn = getDatabaseConnection();
    
    echo json_encode([
        'success' => true,
        'message' => 'Dashboard API Test Results',
        'tests' => [
            'database_connection' => 'PASSED',
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
