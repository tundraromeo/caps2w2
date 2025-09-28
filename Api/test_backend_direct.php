<?php
// Test the backend.php directly
header('Content-Type: application/json');

// Simulate the request
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['SCRIPT_NAME'] = '/Enguio_Project/Api/test_backend_direct.php';

// Set the input data
$testData = [
    'action' => 'get_today_sales',
    'cashier_username' => 'Admin',
    'location_name' => 'Convenience Store',
    'terminal_name' => 'Convenience POS'
];

// Mock the input stream
$originalInput = file_get_contents('php://input');
file_put_contents('php://temp', json_encode($testData));

echo "=== TESTING BACKEND.PHP DIRECTLY ===\n";
echo "Test Data: " . json_encode($testData, JSON_PRETTY_PRINT) . "\n\n";

// Capture output
ob_start();

// Include the backend
include 'backend.php';

$output = ob_get_clean();

echo "Backend Output:\n";
echo $output . "\n";

// Try to decode the output
$decoded = json_decode($output, true);
if ($decoded) {
    echo "\nDecoded Response:\n";
    echo json_encode($decoded, JSON_PRETTY_PRINT);
} else {
    echo "\nFailed to decode JSON response\n";
}
?>
















