<?php
// Simple barcode test
require_once 'Api/conn.php';

echo "<h1>Simple Barcode Test</h1>";

$conn = getDatabaseConnection();

// Test barcode from the image
$barcode = '4801668100288';

echo "<h2>Testing barcode: $barcode</h2>";

try {
    // Simple query without FIFO
    $sql = "SELECT * FROM tbl_product WHERE barcode = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$barcode]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($product) {
        echo "<h3>✅ Product found in database:</h3>";
        echo "<pre>" . print_r($product, true) . "</pre>";
        
        echo "<h3>Product details:</h3>";
        echo "<p><strong>ID:</strong> " . $product['product_id'] . "</p>";
        echo "<p><strong>Name:</strong> " . $product['product_name'] . "</p>";
        echo "<p><strong>Barcode:</strong> " . $product['barcode'] . "</p>";
        echo "<p><strong>Status:</strong> " . $product['status'] . "</p>";
        echo "<p><strong>Category ID:</strong> " . $product['category_id'] . "</p>";
        echo "<p><strong>Brand ID:</strong> " . $product['brand_id'] . "</p>";
        echo "<p><strong>Location ID:</strong> " . $product['location_id'] . "</p>";
        
        // Check if status is active
        if ($product['status'] === 'active') {
            echo "<p style='color: green;'><strong>✅ Status is ACTIVE</strong></p>";
        } else {
            echo "<p style='color: red;'><strong>❌ Status is NOT active: " . $product['status'] . "</strong></p>";
        }
        
        // Check category
        if ($product['category_id']) {
            $catSql = "SELECT category_name FROM tbl_category WHERE category_id = ?";
            $catStmt = $conn->prepare($catSql);
            $catStmt->execute([$product['category_id']]);
            $category = $catStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($category) {
                echo "<p><strong>Category:</strong> " . $category['category_name'] . "</p>";
            } else {
                echo "<p style='color: red;'><strong>❌ Category not found for ID: " . $product['category_id'] . "</strong></p>";
            }
        }
        
        // Check brand
        if ($product['brand_id']) {
            $brandSql = "SELECT brand FROM tbl_brand WHERE brand_id = ?";
            $brandStmt = $conn->prepare($brandSql);
            $brandStmt->execute([$product['brand_id']]);
            $brand = $brandStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($brand) {
                echo "<p><strong>Brand:</strong> " . $brand['brand'] . "</p>";
            } else {
                echo "<p style='color: red;'><strong>❌ Brand not found for ID: " . $product['brand_id'] . "</strong></p>";
            }
        }
        
    } else {
        echo "<h3>❌ Product NOT found in database</h3>";
        
        // Check if there are any products with similar barcode
        $similarSql = "SELECT barcode, product_name FROM tbl_product WHERE barcode LIKE ? LIMIT 5";
        $similarStmt = $conn->prepare($similarSql);
        $similarStmt->execute(["%$barcode%"]);
        $similar = $similarStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($similar) {
            echo "<h4>Similar barcodes found:</h4>";
            echo "<pre>" . print_r($similar, true) . "</pre>";
        }
        
        // Show some sample products
        $sampleSql = "SELECT barcode, product_name, status FROM tbl_product LIMIT 5";
        $sampleStmt = $conn->prepare($sampleSql);
        $sampleStmt->execute();
        $samples = $sampleStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<h4>Sample products in database:</h4>";
        echo "<pre>" . print_r($samples, true) . "</pre>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'><strong>Error:</strong> " . $e->getMessage() . "</p>";
}
?>
