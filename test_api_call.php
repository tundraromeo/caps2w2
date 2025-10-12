<?php
header('Content-Type: application/json');
require_once __DIR__ . '/Api/conn.php';

// Simulate the API call from frontend
$data = [
    'action' => 'get_product_details',
    'transfer_id' => 91
];

$action = $data['action'];
$transfer_id = $data['transfer_id'] ?? 0;

if ($action == 'get_product_details') {
    $stmt = $conn->prepare("
        SELECT 
            p.product_id,
            p.product_name,
            p.barcode,
            p.description,
            p.expiration,
            p.status,
            c.category_name,
            b.brand,
            s.supplier_name,
            l.location_name,
            th.transfer_header_id,
            th.date as transfer_date,
            td.qty as transfer_quantity,
            (SELECT AVG(tbd.srp) FROM tbl_transfer_batch_details tbd WHERE tbd.product_id = p.product_id AND tbd.srp > 0 LIMIT 1) as transfer_srp,
            sl.location_name as source_location,
            dl.location_name as destination_location,
            CONCAT(e.Fname, ' ', e.Lname) as employee_name,
            e.emp_id
        FROM tbl_transfer_header th
        LEFT JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
        LEFT JOIN tbl_product p ON td.product_id = p.product_id
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
        LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
        LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
        WHERE th.transfer_header_id = ?
        LIMIT 1
    ");
    $stmt->execute([$transfer_id]);
    $product_details = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product_details) {
        echo json_encode([
            "success" => false,
            "message" => "Product not found",
            "data" => []
        ]);
        exit;
    }
    
    // Get current stock levels from FIFO
    $stock_stmt = $conn->prepare("
        SELECT 
            SUM(fs.available_quantity) as total_stock,
            COUNT(fs.fifo_id) as total_batches,
            MIN(fs.expiration_date) as earliest_expiry,
            MAX(fs.expiration_date) as latest_expiry,
            AVG(fs.srp) as average_srp,
            MIN(fs.srp) as min_srp,
            MAX(fs.srp) as max_srp
        FROM tbl_fifo_stock fs
        WHERE fs.product_id = ? AND fs.available_quantity > 0
    ");
    $stock_stmt->execute([$product_details['product_id']]);
    $stock_info = $stock_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get batch details if transfer_id provided
    $batch_stmt = $conn->prepare("
        SELECT DISTINCT
            tbd.batch_id,
            tbd.batch_reference,
            tbd.quantity as batch_quantity,
            tbd.srp as batch_srp,
            tbd.expiration_date,
            tbd.created_at
        FROM tbl_transfer_batch_details tbd
        LEFT JOIN tbl_transfer_dtl td ON tbd.product_id = td.product_id
        WHERE td.transfer_header_id = ? AND tbd.product_id = ? AND tbd.quantity > 0
        ORDER BY tbd.expiration_date ASC, tbd.id ASC
    ");
    $batch_stmt->execute([$transfer_id, $product_details['product_id']]);
    $batch_details = $batch_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "data" => [
            "product" => $product_details,
            "stock_info" => $stock_info,
            "batch_details" => $batch_details
        ]
    ], JSON_PRETTY_PRINT);
}
?>
