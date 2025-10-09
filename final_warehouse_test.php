<?php
require_once 'Api/conn.php';
require_once 'Api/modules/batch_functions.php';

$conn = getDatabaseConnection();

$data = ['location_id' => 2];

ob_start();
get_products_oldest_batch($conn, $data);
$json = ob_get_clean();
$response = json_decode($json, true);

echo "WAREHOUSE API TEST\n";
echo "==================\n\n";

if ($response['success']) {
    echo "✅ SUCCESS!\n";
    echo "Products: " . count($response['data']) . "\n\n";
    
    foreach ($response['data'] as $i => $p) {
        echo "Product " . ($i + 1) . ":\n";
        echo "  ID: {$p['product_id']}\n";
        echo "  Name: {$p['product_name']}\n";
        echo "  Category: " . ($p['category'] ?? 'NULL') . "\n";
        echo "  Barcode: {$p['barcode']}\n";
        echo "\n";
    }
} else {
    echo "❌ FAILED: {$response['message']}\n";
}
?>

