<?php
/**
 * Manual API Test - Simulates the exact request the dashboard makes
 */

// Set headers like the real API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

echo "🧪 MANUAL API TEST\n";
echo "==================\n\n";

// Test the exact same request the dashboard makes
$testData = [
    'action' => 'get_warehouse_kpis',
    'product' => 'All',
    'location' => 'Warehouse',
    'timePeriod' => 'monthly'
];

echo "📤 Request Data:\n";
echo json_encode($testData, JSON_PRETTY_PRINT) . "\n\n";

echo "📥 Response:\n";

try {
    // Include the backend.php logic directly
    require_once 'Api/conn.php';
    
    $data = $testData;
    $conn = getDatabaseConnection();
    
    $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
    $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
    
    // Build WHERE conditions
    $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
    $params = [];
    
    if ($location_filter && $location_filter !== 'Warehouse') {
        $whereConditions[] = "l.location_name = ?";
        $params[] = $location_filter;
    } else if ($location_filter === 'Warehouse') {
        // Only filter by warehouse if specifically requested
        $whereConditions[] = "p.location_id = 2";
    }
    
    if ($product_filter) {
        $whereConditions[] = "c.category_name = ?";
        $params[] = $product_filter;
    }
    
    $whereClause = "WHERE " . implode(" AND ", $whereConditions);
    
    echo "🔍 SQL Query:\n";
    echo "WHERE clause: " . $whereClause . "\n";
    echo "Parameters: " . json_encode($params) . "\n\n";
    
    // Get warehouse-specific KPIs using PDO
    $stmt = $conn->prepare("
        SELECT 
            COUNT(DISTINCT p.product_id) as totalProducts,
            COUNT(DISTINCT s.supplier_id) as totalSuppliers,
            ROUND(COUNT(DISTINCT p.product_id) * 100.0 / 1000, 1) as storageCapacity,
            COALESCE((SELECT SUM(fs.available_quantity * fs.srp) FROM tbl_fifo_stock fs), 0) as warehouseValue,
            COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs), 0) as totalQuantity,
            COALESCE((SELECT COUNT(DISTINCT fs.product_id) FROM tbl_fifo_stock fs WHERE fs.available_quantity <= 10 AND fs.available_quantity > 0), 0) as lowStockItems,
            COUNT(CASE WHEN p.expiration IS NOT NULL AND p.expiration <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiringSoon,
            COUNT(DISTINCT b.batch_id) as totalBatches,
            COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as activeTransfers
        FROM tbl_product p
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
        LEFT JOIN tbl_batch b ON p.batch_id = b.batch_id
        LEFT JOIN tbl_transfer_dtl td ON p.product_id = td.product_id
        LEFT JOIN tbl_transfer_header t ON td.transfer_header_id = t.transfer_header_id
        $whereClause
    ");
    
    $stmt->execute($params);
    $warehouseKPIs = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $response = [
        "success" => true,
        "data" => $warehouseKPIs,
        "debug" => [
            "where_clause" => $whereClause,
            "parameters" => $params,
            "timestamp" => date('Y-m-d H:i:s')
        ]
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    $response = [
        "success" => false,
        "message" => "Database error: " . $e->getMessage(),
        "debug" => [
            "error_type" => get_class($e),
            "timestamp" => date('Y-m-d H:i:s')
        ]
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);
}
?>
