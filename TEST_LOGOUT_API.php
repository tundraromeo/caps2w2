<?php
/**
 * Test Logout API - To manually logout jepox user
 * 
 * This will call the existing logout function to fix the stale record
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Test data for jepox user
$testData = [
    'action' => 'logout',
    'emp_id' => 2  // Assuming jepox has emp_id = 2, adjust if needed
];

echo "Testing logout for jepox user...\n";
echo "Data: " . json_encode($testData) . "\n\n";

// Make the API call
$url = 'http://localhost/caps2e2/Api/login.php';
$options = [
    'http' => [
        'header' => "Content-Type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($testData)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);

echo "API Response:\n";
echo $result . "\n";

// Parse response
$response = json_decode($result, true);
if ($response && $response['success']) {
    echo "\n✅ SUCCESS: jepox user has been logged out!\n";
    echo "Check the database - status should now be 'offline'\n";
} else {
    echo "\n❌ FAILED: " . ($response['message'] ?? 'Unknown error') . "\n";
}
?>
