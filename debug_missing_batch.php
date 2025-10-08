<?php
// Debug why the batch with 10 quantity is missing
$conn = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');

echo "=== DEBUGGING MISSING BATCH WITH 10 QUANTITY ===\n";

// Check all batches for products 130 and 131
echo "\n--- All batches for products 130 and 131 ---\n";
$stmt = $conn->query("
    SELECT 
        id,
        product_id,
        location_id,
        batch_id,
        batch_reference,
        quantity,
        srp,
        expiration_date,
        created_at
    FROM tbl_transfer_batch_details 
    WHERE product_id IN (130, 131)
    ORDER BY expiration_date ASC, created_at ASC
");

$batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach($batches as $batch) {
    echo "Product: " . $batch['product_id'] . 
         ", ID: " . $batch['id'] . 
         ", Batch Ref: " . $batch['batch_reference'] . 
         ", Quantity: " . $batch['quantity'] . 
         ", SRP: " . $batch['srp'] . 
         ", Expiry: " . $batch['expiration_date'] . 
         ", Location: " . $batch['location_id'] . "\n";
}

// Check the actual API call for product 131
echo "\n--- Simulating API call for product 131 ---\n";
$product_id = 131;

// Get product info
$productStmt = $conn->prepare("SELECT product_name, barcode FROM tbl_product WHERE product_id = ?");
$productStmt->execute([$product_id]);
$productInfo = $productStmt->fetch(PDO::FETCH_ASSOC);

if ($productInfo) {
    echo "Product 131: " . $productInfo['product_name'] . " (" . $productInfo['barcode'] . ")\n";
    
    // Get related products (same name/barcode)
    $relatedStmt = $conn->prepare("
        SELECT DISTINCT product_id FROM tbl_product 
        WHERE (product_name = ? OR barcode = ?) AND product_id != ?
    ");
    $relatedStmt->execute([$productInfo['product_name'], $productInfo['barcode'], $product_id]);
    $relatedProductIds = $relatedStmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "Related Product IDs: " . implode(', ', $relatedProductIds) . "\n";
    
    // Get convenience store location
    $locationStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name = 'Convenience Store' LIMIT 1");
    $locationStmt->execute();
    $convenienceLocationId = $locationStmt->fetchColumn();
    echo "Convenience Store Location ID: " . $convenienceLocationId . "\n";
    
    // Simulate the API query
    $allProductIds = array_merge([$product_id], $relatedProductIds);
    $placeholders = str_repeat('?,', count($allProductIds) - 1) . '?';
    
    echo "\n--- API Query Simulation ---\n";
    $batchStmt = $conn->prepare("
        SELECT 
            btd.id,
            btd.batch_id,
            btd.batch_reference,
            btd.quantity as batch_quantity,
            btd.srp,
            btd.srp as batch_srp,
            btd.expiration_date,
            'Consumed' as status,
            btd.created_at as transfer_date,
            p.product_name,
            p.barcode,
            b.brand,
            p.category,
            'Warehouse' as source_location_name,
            'System' as employee_name,
            btd.product_id,
            btd.location_id
        FROM tbl_transfer_batch_details btd
        LEFT JOIN tbl_product p ON btd.product_id = p.product_id
        LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
        WHERE btd.product_id IN ($placeholders)
        ORDER BY btd.expiration_date ASC, btd.id ASC
    ");
    
    $batchStmt->execute($allProductIds);
    $batchDetails = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "API returns " . count($batchDetails) . " batches:\n";
    foreach($batchDetails as $batch) {
        echo "- Product: " . $batch['product_id'] . 
             ", Location: " . $batch['location_id'] . 
             ", Batch: " . $batch['batch_reference'] . 
             ", Qty: " . $batch['batch_quantity'] . 
             ", SRP: " . $batch['batch_srp'] . 
             ", Expiry: " . $batch['expiration_date'] . "\n";
    }
    
    // Check if there's a location filter issue
    echo "\n--- Checking Location Filter ---\n";
    $locationFilterStmt = $conn->prepare("
        SELECT 
            btd.id,
            btd.product_id,
            btd.location_id,
            btd.batch_reference,
            btd.quantity
        FROM tbl_transfer_batch_details btd
        WHERE btd.product_id IN ($placeholders) 
        AND btd.location_id = ?
        ORDER BY btd.expiration_date ASC, btd.id ASC
    ");
    $locationFilterStmt->execute(array_merge($allProductIds, [$convenienceLocationId]));
    $locationFilteredBatches = $locationFilterStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "With location filter (location_id = $convenienceLocationId):\n";
    foreach($locationFilteredBatches as $batch) {
        echo "- Product: " . $batch['product_id'] . 
             ", Location: " . $batch['location_id'] . 
             ", Batch: " . $batch['batch_reference'] . 
             ", Qty: " . $batch['quantity'] . "\n";
    }
}
?>
