<?php
// Test transfer batch details
header('Content-Type: application/json');

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check transfer batch details for Mang tomas
    $stmt = $conn->prepare("
        SELECT 
            tbd.*,
            p.product_name,
            l.location_name
        FROM tbl_transfer_batch_details tbd
        LEFT JOIN tbl_product p ON tbd.product_id = p.product_id
        LEFT JOIN tbl_location l ON tbd.location_id = l.location_id
        WHERE p.product_name = 'Mang tomas'
    ");
    
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "transfer_details" => $rows,
        "count" => count($rows)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>
