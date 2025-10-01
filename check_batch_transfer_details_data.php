<?php
/**
 * Check data in tbl_batch_transfer_details for Gatorade Blue Bolt
 */

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<h2>tbl_batch_transfer_details Data Check</h2>";
    
    // Check all Gatorade Blue Bolt related products
    echo "<h3>1. All Gatorade Blue Bolt Products</h3>";
    $stmt = $conn->prepare("
        SELECT 
            p.product_id,
            p.product_name,
            p.barcode,
            p.quantity,
            l.location_name
        FROM tbl_product p
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        WHERE p.product_name LIKE '%Gatorade%'
        ORDER BY p.product_id ASC
    ");
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table border='1' cellpadding='5' cellspacing='0'>";
    echo "<tr><th>Product ID</th><th>Product Name</th><th>Barcode</th><th>Quantity</th><th>Location</th></tr>";
    foreach ($products as $product) {
        echo "<tr>";
        echo "<td>" . $product['product_id'] . "</td>";
        echo "<td>" . $product['product_name'] . "</td>";
        echo "<td>" . $product['barcode'] . "</td>";
        echo "<td>" . $product['quantity'] . "</td>";
        echo "<td>" . $product['location_name'] . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Get all product IDs for Gatorade Blue Bolt
    $gatoradeProductIds = array_column($products, 'product_id');
    $placeholders = str_repeat('?,', count($gatoradeProductIds) - 1) . '?';
    
    echo "<h3>2. Data in tbl_batch_transfer_details for Gatorade Products</h3>";
    
    $stmt = $conn->prepare("
        SELECT 
            btd.batch_transfer_id,
            btd.product_id,
            btd.batch_id,
            btd.batch_reference,
            btd.quantity_used,
            btd.unit_cost,
            btd.srp,
            btd.expiration_date,
            btd.status,
            btd.transfer_date,
            btd.location_id,
            p.product_name,
            l.location_name
        FROM tbl_batch_transfer_details btd
        LEFT JOIN tbl_product p ON btd.product_id = p.product_id
        LEFT JOIN tbl_location l ON btd.location_id = l.location_id
        WHERE btd.product_id IN ($placeholders)
        ORDER BY btd.transfer_date ASC, btd.batch_transfer_id ASC
    ");
    $stmt->execute($gatoradeProductIds);
    $batchData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p><strong>Total Records Found:</strong> " . count($batchData) . "</p>";
    
    if (count($batchData) > 0) {
        echo "<table border='1' cellpadding='3' cellspacing='0'>";
        echo "<tr><th>ID</th><th>Product ID</th><th>Product Name</th><th>Batch Reference</th><th>Quantity</th><th>Unit Cost</th><th>SRP</th><th>Status</th><th>Location</th><th>Transfer Date</th></tr>";
        foreach ($batchData as $batch) {
            echo "<tr>";
            echo "<td>" . $batch['batch_transfer_id'] . "</td>";
            echo "<td>" . $batch['product_id'] . "</td>";
            echo "<td>" . $batch['product_name'] . "</td>";
            echo "<td>" . $batch['batch_reference'] . "</td>";
            echo "<td>" . $batch['quantity_used'] . "</td>";
            echo "<td>₱" . number_format($batch['unit_cost'], 2) . "</td>";
            echo "<td>₱" . number_format($batch['srp'], 2) . "</td>";
            echo "<td>" . $batch['status'] . "</td>";
            echo "<td>" . $batch['location_name'] . "</td>";
            echo "<td>" . $batch['transfer_date'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p style='color: red;'><strong>❌ No data found in tbl_batch_transfer_details for Gatorade products!</strong></p>";
    }
    
    echo "<h3>3. Test API Call Directly</h3>";
    
    // Test the exact API call
    $testData = [
        'action' => 'get_convenience_batch_details',
        'product_id' => 115,
        'location_id' => 4
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'http://localhost/Enguio_Project/Api/convenience_store_api.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen(json_encode($testData))
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "<p><strong>HTTP Code:</strong> $httpCode</p>";
    
    if ($response) {
        $data = json_decode($response, true);
        echo "<p><strong>API Response:</strong></p>";
        echo "<pre>" . json_encode($data, JSON_PRETTY_PRINT) . "</pre>";
        
        if ($data && isset($data['success']) && $data['success']) {
            $batchDetails = $data['data']['batch_details'] ?? [];
            echo "<p><strong>Batch Details Count:</strong> " . count($batchDetails) . "</p>";
        }
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
}
?>
