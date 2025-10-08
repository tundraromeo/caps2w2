<?php
// Test stock summary
header('Content-Type: application/json');

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check stock summary for Mang tomas in convenience store
    $stmt = $conn->prepare("
        SELECT 
            ss.*,
            p.product_name,
            l.location_name
        FROM tbl_stock_summary ss
        LEFT JOIN tbl_product p ON ss.product_id = p.product_id
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        WHERE p.product_name = 'Mang tomas' AND l.location_name LIKE '%convenience%'
    ");
    
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "stock_summary" => $rows,
        "count" => count($rows)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>
