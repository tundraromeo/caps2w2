<?php
header('Content-Type: application/json');
require_once __DIR__ . '/Api/conn.php';

$transfer_id = 91;

try {
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
    
    echo json_encode([
        "success" => true,
        "message" => "Query prepared successfully",
        "query_ok" => true
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Query preparation failed",
        "error" => $e->getMessage()
    ]);
}
?>

