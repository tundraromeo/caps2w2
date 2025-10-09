<?php
/**
 * Test the exact API call that Warehouse makes
 */

require_once 'Api/conn.php';
require_once 'Api/modules/products.php';

$conn = getDatabaseConnection();

echo "TESTING WAREHOUSE API CALLS\n";
echo "===========================\n\n";

// Test 1: get_products_oldest_batch (primary call)
echo "1. Testing get_products_oldest_batch...\n";
echo "---------------------------------------\n";

$data = [
    'location_id' => 2,  // Warehouse
    'role' => 'inventory',
    'user_id' => 1
];

try {
    ob_start();
    handle_get_products_oldest_batch($conn, $data);
    $response = json_decode(ob_get_clean(), true);
    
    if ($response['success']) {
        echo "✅ SUCCESS!\n";
        echo "   Products returned: " . count($response['data']) . "\n";
        
        if (count($response['data']) > 0) {
            $firstProduct = $response['data'][0];
            echo "\n   First product:\n";
            echo "   - ID: " . ($firstProduct['product_id'] ?? 'N/A') . "\n";
            echo "   - Name: " . ($firstProduct['product_name'] ?? 'N/A') . "\n";
            echo "   - Category: " . ($firstProduct['category'] ?? 'N/A') . "\n";
            echo "   - Barcode: " . ($firstProduct['barcode'] ?? 'N/A') . "\n";
        }
    } else {
        echo "❌ FAILED!\n";
        echo "   Error: " . ($response['message'] ?? 'Unknown error') . "\n";
    }
} catch (Exception $e) {
    echo "❌ EXCEPTION: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 2: get_products (fallback call)
echo "2. Testing get_products (fallback)...\n";
echo "--------------------------------------\n";

try {
    ob_start();
    handle_get_products($conn, $data);
    $response = json_decode(ob_get_clean(), true);
    
    if ($response['success']) {
        echo "✅ SUCCESS!\n";
        echo "   Products returned: " . count($response['data']) . "\n";
        
        if (count($response['data']) > 0) {
            $firstProduct = $response['data'][0];
            echo "\n   First product:\n";
            echo "   - ID: " . ($firstProduct['product_id'] ?? 'N/A') . "\n";
            echo "   - Name: " . ($firstProduct['product_name'] ?? 'N/A') . "\n";
            echo "   - Category: " . ($firstProduct['category'] ?? 'N/A') . "\n";
            echo "   - Barcode: " . ($firstProduct['barcode'] ?? 'N/A') . "\n";
        }
    } else {
        echo "❌ FAILED!\n";
        echo "   Error: " . ($response['message'] ?? 'Unknown error') . "\n";
    }
} catch (Exception $e) {
    echo "❌ EXCEPTION: " . $e->getMessage() . "\n";
}

echo "\n===========================\n";
echo "If both tests pass, Warehouse should work!\n";
?>

