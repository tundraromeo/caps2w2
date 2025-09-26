<?php
require_once 'conn.php';

header('Content-Type: application/json');

try {
    // Check expiration dates in stock movements
    $stockMovementsStmt = $conn->prepare("
        SELECT 
            sm.movement_id,
            p.product_name,
            sm.expiration_date,
            sm.movement_type,
            sm.movement_date
        FROM tbl_stock_movements sm
        LEFT JOIN tbl_product p ON sm.product_id = p.product_id
        WHERE sm.expiration_date IS NOT NULL
        ORDER BY sm.movement_date DESC
        LIMIT 10
    ");
    
    $stockMovementsStmt->execute();
    $stockMovements = $stockMovementsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Check expiration dates in products
    $productsStmt = $conn->prepare("
        SELECT 
            product_id,
            product_name,
            expiration,
            date_added
        FROM tbl_product 
        WHERE expiration IS NOT NULL 
        AND expiration != '0000-00-00'
        ORDER BY date_added DESC
        LIMIT 10
    ");
    
    $productsStmt->execute();
    $products = $productsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get summary statistics
    $summaryStmt = $conn->prepare("
        SELECT 
            (SELECT COUNT(*) FROM tbl_stock_movements WHERE expiration_date IS NOT NULL) as movements_with_expiration,
            (SELECT COUNT(*) FROM tbl_stock_movements WHERE expiration_date IS NULL) as movements_without_expiration,
            (SELECT COUNT(*) FROM tbl_product WHERE expiration IS NOT NULL AND expiration != '0000-00-00') as products_with_expiration,
            (SELECT COUNT(*) FROM tbl_product WHERE expiration IS NULL OR expiration = '0000-00-00') as products_without_expiration
    ");
    
    $summaryStmt->execute();
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Current expiration date data in database',
        'data' => [
            'summary' => $summary,
            'stock_movements_with_expiration' => $stockMovements,
            'products_with_expiration' => $products
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
