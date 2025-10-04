<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== CHECKING STOCK MOVEMENTS FOR DUPLICATION ===\n\n";
    
    // Check stock movements with the problematic reference number
    echo "=== STOCK MOVEMENTS FOR TXN881380 ===\n";
    $stmt = $pdo->query('
        SELECT 
            sm.movement_id,
            sm.product_id,
            p.product_name,
            p.barcode,
            sm.movement_type,
            sm.quantity,
            sm.unit_cost,
            sm.reference_no,
            sm.created_by,
            sm.created_at,
            sm.movement_date,
            sm.notes
        FROM tbl_stock_movements sm
        LEFT JOIN tbl_product p ON sm.product_id = p.product_id
        WHERE sm.reference_no = "TXN881380"
        ORDER BY sm.movement_date DESC, sm.created_at DESC
    ');
    
    $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($movements as $movement) {
        echo "Movement ID: " . $movement['movement_id'] . "\n";
        echo "Product: " . $movement['product_name'] . " (ID: " . $movement['product_id'] . ")\n";
        echo "Barcode: " . $movement['barcode'] . "\n";
        echo "Type: " . $movement['movement_type'] . "\n";
        echo "Quantity: " . $movement['quantity'] . "\n";
        echo "Reference: " . $movement['reference_no'] . "\n";
        echo "Created By: " . $movement['created_by'] . "\n";
        echo "Date: " . $movement['movement_date'] . "\n";
        echo "Notes: " . $movement['notes'] . "\n";
        echo "---\n";
    }
    
    echo "\n=== CHECKING FOR DUPLICATE MOVEMENT RECORDS ===\n";
    
    // Check for duplicate movement records
    $stmt = $pdo->query('
        SELECT 
            product_id,
            reference_no,
            movement_type,
            COUNT(*) as count,
            GROUP_CONCAT(movement_id) as movement_ids
        FROM tbl_stock_movements 
        WHERE reference_no = "TXN881380"
        GROUP BY product_id, reference_no, movement_type
        HAVING COUNT(*) > 1
    ');
    
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($duplicates)) {
        echo "No duplicate movement records found.\n";
    } else {
        foreach ($duplicates as $dup) {
            echo "Duplicate found:\n";
            echo "Product ID: " . $dup['product_id'] . "\n";
            echo "Reference: " . $dup['reference_no'] . "\n";
            echo "Type: " . $dup['movement_type'] . "\n";
            echo "Count: " . $dup['count'] . "\n";
            echo "Movement IDs: " . $dup['movement_ids'] . "\n";
            echo "---\n";
        }
    }
    
    echo "\n=== CHECKING RECENT STOCK MOVEMENTS ===\n";
    $stmt = $pdo->query('
        SELECT 
            sm.movement_id,
            sm.product_id,
            p.product_name,
            sm.movement_type,
            sm.quantity,
            sm.reference_no,
            sm.created_by,
            DATE(sm.movement_date) as date,
            TIME(sm.movement_date) as time
        FROM tbl_stock_movements sm
        LEFT JOIN tbl_product p ON sm.product_id = p.product_id
        WHERE sm.movement_date >= "2025-10-01"
        ORDER BY sm.movement_date DESC, sm.created_at DESC
        LIMIT 10
    ');
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "ID: " . $row['movement_id'] . " | " . $row['date'] . " " . $row['time'] . " | " . $row['product_name'] . " | " . $row['movement_type'] . " | Qty: " . $row['quantity'] . " | Ref: " . $row['reference_no'] . " | By: " . $row['created_by'] . "\n";
    }
    
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . "\n";
}
?>
