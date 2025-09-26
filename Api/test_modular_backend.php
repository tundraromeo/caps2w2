<?php
// Test the modular backend directly
header('Content-Type: application/json');

// Simulate a request to get today's sales
$testData = [
    'action' => 'get_today_sales',
    'cashier_username' => 'Admin',
    'location_name' => 'Convenience Store',
    'terminal_name' => 'Convenience POS'
];

// Include the modular backend
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['SCRIPT_NAME'] = '/Enguio_Project/Api/test_modular_backend.php';

// Capture output
ob_start();

// Simulate the input stream
$originalInput = file_get_contents('php://input');
file_put_contents('php://temp', json_encode($testData));

// Include the modular backend
include 'backend_modular.php';

$output = ob_get_clean();

echo "=== MODULAR BACKEND TEST ===\n";
echo "Test Data: " . json_encode($testData, JSON_PRETTY_PRINT) . "\n";
echo "Output: " . $output . "\n";
?>

