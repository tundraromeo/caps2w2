<?php
// Direct test of barcode API
require_once 'Api/conn.php';
require_once 'Api/modules/barcode.php';

echo "<h1>Direct Barcode API Test</h1>";

$conn = getDatabaseConnection();

// Test data
$testData = [
    'action' => 'check_barcode',
    'barcode' => '4801668100288'
];

echo "<h2>Testing barcode: " . $testData['barcode'] . "</h2>";

try {
    echo "<h3>Calling check_barcode function...</h3>";
    
    // Call the function directly
    $result = check_barcode($conn, $testData);
    
    echo "<h3>Function returned:</h3>";
    echo "<pre>" . print_r($result, true) . "</pre>";
    
    echo "<h3>JSON encoded:</h3>";
    echo "<pre>" . json_encode($result, JSON_PRETTY_PRINT) . "</pre>";
    
    echo "<h3>Analysis:</h3>";
    echo "<p><strong>Success:</strong> " . ($result['success'] ? 'YES' : 'NO') . "</p>";
    echo "<p><strong>Found:</strong> " . ($result['found'] ? 'YES' : 'NO') . "</p>";
    echo "<p><strong>Product exists:</strong> " . ($result['product'] ? 'YES' : 'NO') . "</p>";
    echo "<p><strong>Product type:</strong> " . gettype($result['product']) . "</p>";
    
    if ($result['product']) {
        echo "<p><strong>Product keys:</strong> " . implode(', ', array_keys($result['product'])) . "</p>";
        echo "<p><strong>Product name:</strong> " . ($result['product']['product_name'] ?? 'N/A') . "</p>";
        echo "<p><strong>Category:</strong> " . ($result['product']['category'] ?? 'N/A') . "</p>";
        echo "<p><strong>Brand:</strong> " . ($result['product']['brand'] ?? 'N/A') . "</p>";
        echo "<p><strong>Quantity:</strong> " . ($result['product']['quantity'] ?? 'N/A') . "</p>";
        echo "<p><strong>SRP:</strong> " . ($result['product']['srp'] ?? 'N/A') . "</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'><strong>Error:</strong> " . $e->getMessage() . "</p>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}

// Also test the database query directly
echo "<h2>Direct Database Test</h2>";

try {
    $barcode = '4801668100288';
    $sql = "
        SELECT 
            p.product_id,
            p.product_name,
            p.category_id,
            c.category_name as category,
            p.barcode,
            p.description,
            COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
            p.unit_price,
            COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), p.unit_price) as srp,
            p.prescription,
            p.bulk,
            p.expiration,
            p.status,
            p.location_id,
            l.location_name,
            p.brand_id,
            COALESCE(b.brand, '') as brand,
            p.supplier_id,
            COALESCE(s.supplier_name, '') as supplier_name,
            p.product_type
        FROM tbl_product p
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
        WHERE p.barcode = ? AND p.status = 'active'
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([$barcode]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "<h3>Direct database query result:</h3>";
    if ($product) {
        echo "<p><strong>Product found!</strong></p>";
        echo "<pre>" . print_r($product, true) . "</pre>";
    } else {
        echo "<p><strong>No product found in database</strong></p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'><strong>Database Error:</strong> " . $e->getMessage() . "</p>";
}
?>
