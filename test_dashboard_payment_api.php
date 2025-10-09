<?php
require_once 'Api/conn.php';

$conn = getDatabaseConnection();

echo "TESTING DASHBOARD PAYMENT METHODS API\n";
echo "======================================\n\n";

// Test 1: Get payment methods
echo "1. Testing get_payment_methods...\n";
echo "---------------------------------\n";

$postData = json_encode([
    'action' => 'get_payment_methods',
    'days' => 30
]);

$ch = curl_init('http://localhost/caps2e2/Api/dashboard_sales_api.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if ($data && $data['success']) {
    echo "✅ SUCCESS!\n";
    echo "   Payment methods: " . count($data['data'] ?? []) . "\n";
    echo "   Period: " . ($data['period_days'] ?? 'N/A') . " days\n";
    
    if (!empty($data['data'])) {
        echo "\n   Payment method breakdown:\n";
        foreach ($data['data'] as $method) {
            echo "     - " . ($method['name'] ?? 'Unknown') . ": ";
            echo ($method['count'] ?? 0) . " transactions, ";
            echo "₱" . number_format($method['amount'] ?? 0, 2) . " ";
            echo "(" . ($method['percentage'] ?? 0) . "%)\n";
        }
    }
} else {
    echo "❌ FAILED!\n";
    echo "   Error: " . ($data['message'] ?? 'Unknown error') . "\n";
    echo "   Response: " . substr($response, 0, 500) . "\n";
}

echo "\n======================================\n";
echo "If this passes, Dashboard should work!\n";
?>

