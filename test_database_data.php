<?php
require_once 'Api/conn.php';

header('Content-Type: application/json');

try {
    $conn = getDatabaseConnection();
    
    // Test 1: Check total products
    $stmt = $conn->query("SELECT COUNT(*) as total FROM tbl_product WHERE status IS NULL OR status != 'archived'");
    $productCount = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Test 2: Check locations
    $stmt2 = $conn->query("SELECT location_name FROM tbl_location LIMIT 5");
    $locations = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    // Test 3: Check warehouse KPIs query
    $stmt3 = $conn->prepare("
        SELECT 
            COUNT(DISTINCT p.product_id) as totalProducts,
            COUNT(DISTINCT s.supplier_id) as totalSuppliers,
            ROUND(COUNT(DISTINCT p.product_id) * 100.0 / 1000, 1) as storageCapacity,
            COALESCE((SELECT SUM(fs.available_quantity * fs.srp) FROM tbl_fifo_stock fs), 0) as warehouseValue,
            COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs), 0) as totalQuantity,
            COALESCE((SELECT COUNT(DISTINCT fs.product_id) FROM tbl_fifo_stock fs WHERE fs.available_quantity <= 10 AND fs.available_quantity > 0), 0) as lowStockItems,
            COUNT(CASE WHEN p.expiration IS NOT NULL AND p.expiration <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiringSoon,
            COUNT(DISTINCT b.batch_id) as totalBatches
        FROM tbl_product p
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
        LEFT JOIN tbl_batch b ON p.batch_id = b.batch_id
        WHERE (p.status IS NULL OR p.status <> 'archived')
    ");
    $stmt3->execute();
    $warehouseKPIs = $stmt3->fetch(PDO::FETCH_ASSOC);
    
    // Test 4: Check FIFO stock
    $stmt4 = $conn->query("SELECT COUNT(*) as fifo_count FROM tbl_fifo_stock");
    $fifoCount = $stmt4->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'database_test' => [
            'total_products' => $productCount['total'],
            'locations' => $locations,
            'warehouse_kpis' => $warehouseKPIs,
            'fifo_stock_count' => $fifoCount['fifo_count']
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>
