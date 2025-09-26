<?php
// Sync Stock Data - Create stock movements and summaries for existing products
// This script will populate tbl_stock_movements and tbl_stock_summary for existing products

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected to database successfully.\n";
} catch (Exception $e) {
    echo "Database connection error: " . $e->getMessage() . "\n";
    exit;
}

try {
    $conn->beginTransaction();
    
    echo "Starting stock data sync...\n";
    
    // Get products without stock movements
    $productsStmt = $conn->prepare("
        SELECT p.product_id, p.product_name, p.quantity, p.unit_price, p.srp, 
               p.location_id, p.batch_id, p.expiration, p.date_added, p.supplier_id
        FROM tbl_product p
        LEFT JOIN tbl_stock_movements sm ON p.product_id = sm.product_id
        WHERE sm.product_id IS NULL AND p.quantity > 0
    ");
    $productsStmt->execute();
    $products = $productsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($products) . " products without stock movements.\n";
    
    $synced_count = 0;
    
    foreach ($products as $product) {
        echo "Processing product: " . $product['product_name'] . " (ID: " . $product['product_id'] . ")\n";
        
        // Create batch if needed
        $batch_id = $product['batch_id'];
        if (!$batch_id) {
            $batch_reference = 'SYNC-' . date('Ymd-His') . '-' . $product['product_id'];
            $batchStmt = $conn->prepare("
                INSERT INTO tbl_batch (
                    batch, supplier_id, location_id, entry_date, entry_time, 
                    entry_by, order_no
                ) VALUES (?, ?, ?, ?, CURTIME(), 'System Sync', 'SYNC')
            ");
            $batchStmt->execute([$batch_reference, $product['supplier_id'], $product['location_id'], $product['date_added']]);
            $batch_id = $conn->lastInsertId();
            
            // Update product with batch_id
            $updateProductStmt = $conn->prepare("UPDATE tbl_product SET batch_id = ? WHERE product_id = ?");
            $updateProductStmt->execute([$batch_id, $product['product_id']]);
            
            echo "  Created batch: " . $batch_reference . " (ID: " . $batch_id . ")\n";
        }
        
        // Create stock movement
        $movementStmt = $conn->prepare("
            INSERT INTO tbl_stock_movements (
                product_id, batch_id, movement_type, quantity, remaining_quantity,
                unit_cost, expiration_date, reference_no, notes, created_by
            ) VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?, 'System Sync')
        ");
        $movementStmt->execute([
            $product['product_id'], $batch_id, $product['quantity'], $product['quantity'],
            $product['unit_price'], $product['expiration'], 'SYNC-' . $product['product_id'],
            'Synced existing product', 'System Sync'
        ]);
        
        echo "  Created stock movement for " . $product['quantity'] . " units\n";
        
        // Create stock summary
        $summaryStmt = $conn->prepare("
            INSERT INTO tbl_stock_summary (
                product_id, batch_id, available_quantity, unit_cost, srp,
                expiration_date, batch_reference, total_quantity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $batchRefStmt = $conn->prepare("SELECT batch FROM tbl_batch WHERE batch_id = ?");
        $batchRefStmt->execute([$batch_id]);
        $batch_ref = $batchRefStmt->fetchColumn();
        
        $summaryStmt->execute([
            $product['product_id'], $batch_id, $product['quantity'], 
            $product['unit_price'], $product['srp'], $product['expiration'], 
            $batch_ref, $product['quantity']
        ]);
        
        echo "  Created stock summary\n";
        
        $synced_count++;
    }
    
    $conn->commit();
    
    echo "\nSync completed successfully!\n";
    echo "Synced " . $synced_count . " products.\n";
    echo "Created stock movements and summaries for all existing products.\n";
    
} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    echo "Error during sync: " . $e->getMessage() . "\n";
}

// Show current counts
try {
    $movementCountStmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_stock_movements");
    $movementCountStmt->execute();
    $movementCount = $movementCountStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $summaryCountStmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_stock_summary");
    $summaryCountStmt->execute();
    $summaryCount = $summaryCountStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    echo "\nCurrent counts:\n";
    echo "Stock movements: " . $movementCount . "\n";
    echo "Stock summaries: " . $summaryCount . "\n";
    
} catch (Exception $e) {
    echo "Error getting counts: " . $e->getMessage() . "\n";
}
?>
