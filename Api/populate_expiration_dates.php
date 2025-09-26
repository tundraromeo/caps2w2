<?php
require_once 'conn.php';

header('Content-Type: application/json');

try {
    // First, let's see what we have
    $checkStmt = $conn->prepare("
        SELECT 
            COUNT(*) as total_movements,
            COUNT(CASE WHEN expiration_date IS NOT NULL AND expiration_date != '0000-00-00' THEN 1 END) as movements_with_expiration,
            COUNT(CASE WHEN expiration_date IS NULL OR expiration_date = '0000-00-00' THEN 1 END) as movements_without_expiration
        FROM tbl_stock_movements
    ");
    
    $checkStmt->execute();
    $beforeStats = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    // Update stock movements that don't have expiration dates to use product expiration
    $updateMovementsStmt = $conn->prepare("
        UPDATE tbl_stock_movements sm
        JOIN tbl_product p ON sm.product_id = p.product_id
        SET sm.expiration_date = p.expiration
        WHERE (sm.expiration_date IS NULL OR sm.expiration_date = '0000-00-00')
        AND p.expiration IS NOT NULL 
        AND p.expiration != '0000-00-00'
    ");
    
    $updateMovementsStmt->execute();
    $updatedMovements = $updateMovementsStmt->rowCount();
    
    // Check final state
    $finalCheckStmt = $conn->prepare("
        SELECT 
            COUNT(*) as total_movements,
            COUNT(CASE WHEN expiration_date IS NOT NULL AND expiration_date != '0000-00-00' THEN 1 END) as movements_with_expiration,
            COUNT(CASE WHEN expiration_date IS NULL OR expiration_date = '0000-00-00' THEN 1 END) as movements_without_expiration
        FROM tbl_stock_movements
    ");
    
    $finalCheckStmt->execute();
    $afterStats = $finalCheckStmt->fetch(PDO::FETCH_ASSOC);
    
    // Get sample of updated movements
    $sampleStmt = $conn->prepare("
        SELECT 
            sm.movement_id,
            p.product_name,
            sm.expiration_date,
            sm.movement_type
        FROM tbl_stock_movements sm
        JOIN tbl_product p ON sm.product_id = p.product_id
        WHERE sm.expiration_date IS NOT NULL 
        AND sm.expiration_date != '0000-00-00'
        ORDER BY sm.movement_date DESC
        LIMIT 5
    ");
    
    $sampleStmt->execute();
    $sampleMovements = $sampleStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Expiration dates populated successfully',
        'data' => [
            'before_stats' => $beforeStats,
            'after_stats' => $afterStats,
            'updated_movements' => $updatedMovements,
            'sample_movements' => $sampleMovements
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
