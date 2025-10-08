<?php
// Test updated sync function
header('Content-Type: application/json');

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get products that need syncing
    $stmt = $conn->prepare("
        SELECT 
            p.product_id,
            p.product_name,
            p.quantity,
            p.srp,
            p.batch_id,
            p.location_id,
            l.location_name,
            b.batch_reference,
            b.entry_date,
            b.entry_time,
            tbd.srp as transfer_srp,
            tbd.expiration_date as transfer_expiration
        FROM tbl_product p
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_batch b ON p.batch_id = b.batch_id
        LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
        LEFT JOIN tbl_transfer_batch_details tbd ON tbd.batch_id = p.batch_id
        WHERE l.location_name LIKE '%convenience%' 
        AND p.quantity > 0 
        AND p.status = 'active'
        ORDER BY COALESCE(tbd.expiration_date, p.expiration) ASC
    ");
    
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "products_to_sync" => $products,
        "count" => count($products)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>
