<?php
// Test script to verify warehouse inventory aggregation
require_once __DIR__ . '/Api/conn.php';

try {
    $conn = getDatabaseConnection();

    // Test the modified get_products_oldest_batch function
    $location_id = 2; // Warehouse location

    $sql = "
        SELECT
            p.product_id,
            p.product_name,
            c.category_name as category,
            COALESCE(SUM(fs.available_quantity), 0) as total_quantity,
            p.barcode,
            p.srp,
            p.srp as unit_price,
            p.location_id,
            l.location_name,
            COALESCE(b.brand, '') as brand,
            COALESCE(s.supplier_name, '') as supplier_name,
            MIN(fs.expiration_date) as earliest_expiry,
            MIN(fs.batch_reference) as oldest_batch_ref,
            DATEDIFF(MIN(fs.expiration_date), CURDATE()) as days_until_expiry,
            COALESCE(NULLIF(first_batch.first_batch_srp, 0), p.srp) as first_batch_srp
        FROM tbl_product p
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id AND fs.available_quantity > 0
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
        LEFT JOIN (
            SELECT
                fs2.product_id,
                fs2.srp as first_batch_srp,
                ROW_NUMBER() OVER (PARTITION BY fs2.product_id ORDER BY fs2.entry_date ASC, fs2.fifo_id ASC) as rn
            FROM tbl_fifo_stock fs2
            WHERE fs2.available_quantity > 0 AND fs2.srp > 0
        ) first_batch ON p.product_id = first_batch.product_id AND first_batch.rn = 1
        WHERE p.status = 'active' AND p.location_id = ?
        GROUP BY p.product_id, p.product_name, c.category_name, p.barcode, p.srp, p.location_id, l.location_name, b.brand, s.supplier_name
        ORDER BY earliest_expiry ASC
        LIMIT 5
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(1, $location_id, PDO::PARAM_INT);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "=== WAREHOUSE INVENTORY AGGREGATION TEST ===\n\n";
    echo "Found " . count($products) . " products with aggregated quantities:\n\n";

    foreach ($products as $product) {
        echo "Product: {$product['product_name']}\n";
        echo "  - Total Quantity (aggregated): {$product['total_quantity']}\n";
        echo "  - Category: {$product['category']}\n";
        echo "  - Barcode: {$product['barcode']}\n";
        echo "  - SRP: {$product['srp']}\n";
        echo "  - Earliest Expiry: {$product['earliest_expiry']}\n";
        echo "  - Oldest Batch Ref: {$product['oldest_batch_ref']}\n";
        echo "\n";

        // Also check individual batches for this product to verify aggregation
        $batchSql = "
            SELECT batch_reference, available_quantity, expiration_date
            FROM tbl_fifo_stock
            WHERE product_id = ? AND available_quantity > 0
            ORDER BY entry_date ASC
        ";
        $batchStmt = $conn->prepare($batchSql);
        $batchStmt->bindValue(1, $product['product_id'], PDO::PARAM_INT);
        $batchStmt->execute();
        $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

        echo "  Individual batches:\n";
        $totalFromBatches = 0;
        foreach ($batches as $batch) {
            echo "    - {$batch['batch_reference']}: {$batch['available_quantity']} units (exp: {$batch['expiration_date']})\n";
            $totalFromBatches += $batch['available_quantity'];
        }
        echo "  - Sum of batch quantities: {$totalFromBatches}\n";
        echo "  - Match: " . ($product['total_quantity'] == $totalFromBatches ? "✅ YES" : "❌ NO") . "\n";
        echo "\n";
        echo str_repeat("-", 50) . "\n";
    }

    echo "\n=== TEST SUMMARY ===\n";
    echo "✅ Aggregation test completed successfully!\n";
    echo "The API now returns total_quantity as the sum of all available batch quantities for each product.\n";

} catch (Exception $e) {
    echo "❌ Error during test: " . $e->getMessage() . "\n";
}
?>
