<?php
require_once 'Api/conn.php';

$conn = getDatabaseConnection();

echo "TESTING REPORTS API\n";
echo "===================\n\n";

// Test 1: Get report data
echo "1. Testing get_report_data...\n";
echo "------------------------------\n";

$postData = json_encode([
    'action' => 'get_report_data',
    'report_type' => 'all',
    'start_date' => date('Y-m-d', strtotime('-30 days')),
    'end_date' => date('Y-m-d')
]);

$ch = curl_init('http://localhost/caps2e2/Api/sales_api.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if ($data && $data['success']) {
    echo "✅ SUCCESS!\n";
    echo "   Reports: " . count($data['reports'] ?? []) . "\n";
    echo "   Analytics:\n";
    echo "     - Total Products: " . ($data['analytics']['totalProducts'] ?? 0) . "\n";
    echo "     - Low Stock: " . ($data['analytics']['lowStockItems'] ?? 0) . "\n";
    echo "     - Out of Stock: " . ($data['analytics']['outOfStockItems'] ?? 0) . "\n";
    echo "   Top Categories: " . count($data['topCategories'] ?? []) . "\n";
    
    if (!empty($data['topCategories'])) {
        echo "\n   Category breakdown:\n";
        foreach ($data['topCategories'] as $cat) {
            echo "     - " . ($cat['category_name'] ?? 'Unknown') . ": " . ($cat['product_count'] ?? 0) . " products (" . ($cat['percentage'] ?? 0) . "%)\n";
        }
    }
} else {
    echo "❌ FAILED!\n";
    echo "   Error: " . ($data['message'] ?? 'Unknown error') . "\n";
    echo "   Response: " . substr($response, 0, 500) . "\n";
}

echo "\n===================\n";
echo "If this passes, Reports page should work!\n";
?>

