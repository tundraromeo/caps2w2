<?php
require_once 'conn.php';

header('Content-Type: application/json');

try {
    // First, let's see what we have in the database
    $checkStmt = $conn->prepare("
        SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN srp IS NOT NULL AND srp > 0 THEN 1 END) as products_with_srp,
            COUNT(CASE WHEN unit_price IS NOT NULL AND unit_price > 0 THEN 1 END) as products_with_unit_price,
            AVG(srp) as avg_srp,
            AVG(unit_price) as avg_unit_price
        FROM tbl_product 
        WHERE status = 'active'
    ");
    
    $checkStmt->execute();
    $beforeStats = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    // Update products that have NULL or 0 SRP to use unit_price as SRP
    $updateStmt = $conn->prepare("
        UPDATE tbl_product 
        SET srp = unit_price 
        WHERE (srp IS NULL OR srp = 0) 
        AND unit_price > 0
    ");
    
    $updateStmt->execute();
    $updatedProducts = $updateStmt->rowCount();
    
    // Update stock movements that have 0 unit_cost with SRP values
    $updateMovementStmt = $conn->prepare("
        UPDATE tbl_stock_movements sm
        JOIN tbl_product p ON sm.product_id = p.product_id
        SET sm.unit_cost = COALESCE(p.srp, p.unit_price)
        WHERE sm.unit_cost = 0
        AND (p.srp > 0 OR p.unit_price > 0)
    ");
    
    $updateMovementStmt->execute();
    $updatedMovements = $updateMovementStmt->rowCount();
    
    // Check final state
    $finalCheckStmt = $conn->prepare("
        SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN srp IS NOT NULL AND srp > 0 THEN 1 END) as products_with_srp,
            COUNT(CASE WHEN unit_price IS NOT NULL AND unit_price > 0 THEN 1 END) as products_with_unit_price,
            AVG(srp) as avg_srp,
            AVG(unit_price) as avg_unit_price
        FROM tbl_product 
        WHERE status = 'active'
    ");
    
    $finalCheckStmt->execute();
    $afterStats = $finalCheckStmt->fetch(PDO::FETCH_ASSOC);
    
    // Get sample of updated products
    $sampleStmt = $conn->prepare("
        SELECT product_id, product_name, srp, unit_price
        FROM tbl_product 
        WHERE status = 'active' 
        AND srp > 0
        ORDER BY product_id
        LIMIT 5
    ");
    
    $sampleStmt->execute();
    $sampleProducts = $sampleStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'SRP values populated successfully',
        'data' => [
            'before_stats' => $beforeStats,
            'after_stats' => $afterStats,
            'updated_products' => $updatedProducts,
            'updated_movements' => $updatedMovements,
            'sample_products' => $sampleProducts
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
