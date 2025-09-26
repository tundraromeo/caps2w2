<?php
require_once 'conn.php';

header('Content-Type: application/json');

try {
    // Check current SRP values in the database
    $stmt = $conn->prepare("
        SELECT 
            p.product_id,
            p.product_name,
            p.srp,
            p.unit_price,
            COUNT(sm.movement_id) as movement_count,
            AVG(sm.unit_cost) as avg_movement_cost
        FROM tbl_product p
        LEFT JOIN tbl_stock_movements sm ON p.product_id = sm.product_id
        WHERE p.status = 'active'
        GROUP BY p.product_id
        HAVING p.srp > 0 OR p.unit_price > 0
        ORDER BY p.product_id
        LIMIT 10
    ");
    
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get summary statistics
    $summaryStmt = $conn->prepare("
        SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN srp > 0 THEN 1 END) as products_with_srp,
            COUNT(CASE WHEN unit_price > 0 THEN 1 END) as products_with_unit_price,
            AVG(srp) as avg_srp,
            AVG(unit_price) as avg_unit_price
        FROM tbl_product 
        WHERE status = 'active'
    ");
    
    $summaryStmt->execute();
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Current SRP values in database',
        'data' => [
            'summary' => $summary,
            'sample_products' => $products
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
