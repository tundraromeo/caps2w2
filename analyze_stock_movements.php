<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== DETAILED ANALYSIS OF tbl_stock_movements ===\n";
    
    // Check all unique product_id values
    $stmt = $pdo->query("SELECT DISTINCT product_id FROM tbl_stock_movements ORDER BY product_id");
    $product_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Unique product_id values: " . implode(', ', $product_ids) . "\n";
    
    // Check all unique batch_id values
    $stmt = $pdo->query("SELECT DISTINCT batch_id FROM tbl_stock_movements ORDER BY batch_id");
    $batch_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Unique batch_id values: " . implode(', ', $batch_ids) . "\n";
    
    // Check which product_ids exist in tbl_product
    echo "\n=== CHECKING PRODUCT_ID VALIDITY ===\n";
    foreach ($product_ids as $product_id) {
        if ($product_id !== null) {
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM tbl_product WHERE product_id = ?");
            $stmt->execute([$product_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] > 0) {
                echo "✅ product_id $product_id exists in tbl_product\n";
            } else {
                echo "❌ product_id $product_id NOT FOUND in tbl_product\n";
            }
        }
    }
    
    // Check which batch_ids exist in tbl_batch
    echo "\n=== CHECKING BATCH_ID VALIDITY ===\n";
    foreach ($batch_ids as $batch_id) {
        if ($batch_id !== null) {
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM tbl_batch WHERE batch_id = ?");
            $stmt->execute([$batch_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] > 0) {
                echo "✅ batch_id $batch_id exists in tbl_batch\n";
            } else {
                echo "❌ batch_id $batch_id NOT FOUND in tbl_batch\n";
            }
        }
    }
    
    // Show available product_ids and batch_ids
    echo "\n=== AVAILABLE REFERENCE VALUES ===\n";
    
    $stmt = $pdo->query("SELECT product_id FROM tbl_product ORDER BY product_id LIMIT 10");
    $available_products = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Available product_ids: " . implode(', ', $available_products) . "...\n";
    
    $stmt = $pdo->query("SELECT batch_id FROM tbl_batch ORDER BY batch_id LIMIT 10");
    $available_batches = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Available batch_ids: " . implode(', ', $available_batches) . "...\n";
    
    // Count invalid records
    echo "\n=== COUNTING INVALID RECORDS ===\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE product_id IS NOT NULL AND product_id NOT IN (SELECT product_id FROM tbl_product)");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Invalid product_id records: " . $result['count'] . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE batch_id IS NOT NULL AND batch_id NOT IN (SELECT batch_id FROM tbl_batch)");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Invalid batch_id records: " . $result['count'] . "\n";
    
    // Show sample invalid records
    if ($result['count'] > 0) {
        echo "\n=== SAMPLE INVALID RECORDS ===\n";
        $stmt = $pdo->query("SELECT movement_id, product_id, batch_id FROM tbl_stock_movements WHERE product_id IS NOT NULL AND product_id NOT IN (SELECT product_id FROM tbl_product) LIMIT 5");
        $invalid_records = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($invalid_records as $record) {
            echo "Movement ID: {$record['movement_id']}, Product: {$record['product_id']}, Batch: {$record['batch_id']}\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
