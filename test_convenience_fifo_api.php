<?php
require_once 'Api/conn.php';

$conn = getDatabaseConnection();

echo "TESTING CONVENIENCE FIFO API\n";
echo "============================\n\n";

// Test: get_convenience_products_fifo
echo "1. Testing get_convenience_products_fifo...\n";
echo "-------------------------------------------\n";

$postData = json_encode([
    'action' => 'get_convenience_products_fifo',
    'location_name' => 'convenience',
    'search' => '',
    'category' => 'all',
    'product_type' => 'all'
]);

$ch = curl_init('http://localhost/caps2e2/Api/convenience_store_api.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if ($data && $data['success']) {
    echo "✅ SUCCESS!\n";
    echo "   Products found: " . count($data['data'] ?? []) . "\n";
    
    if (!empty($data['data'])) {
        echo "\n   First 3 products:\n";
        foreach (array_slice($data['data'], 0, 3) as $product) {
            echo "   - " . ($product['product_name'] ?? 'N/A') . "\n";
            echo "     Category: " . ($product['category'] ?? 'NULL') . "\n";
            echo "     Quantity: " . ($product['total_quantity'] ?? 0) . "\n\n";
        }
    }
} else {
    echo "❌ FAILED!\n";
    echo "   Error: " . ($data['message'] ?? 'Unknown error') . "\n";
}

echo "\n============================\n";
echo "If this passes, Convenience Store should work!\n";
?>

