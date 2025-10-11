<?php
// Test existing barcodes in database
require_once 'Api/conn.php';

echo "<h1>Existing Barcodes Test</h1>";

$conn = getDatabaseConnection();

try {
    // Get some existing products with barcodes
    $sql = "SELECT product_id, product_name, barcode, status FROM tbl_product WHERE barcode IS NOT NULL AND barcode != '' AND status = 'active' LIMIT 10";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h2>Existing products with barcodes (status = active):</h2>";
    
    if ($products) {
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>ID</th><th>Name</th><th>Barcode</th><th>Status</th><th>Test</th></tr>";
        
        foreach ($products as $product) {
            echo "<tr>";
            echo "<td>" . $product['product_id'] . "</td>";
            echo "<td>" . htmlspecialchars($product['product_name']) . "</td>";
            echo "<td>" . htmlspecialchars($product['barcode']) . "</td>";
            echo "<td>" . htmlspecialchars($product['status']) . "</td>";
            echo "<td><button onclick='testBarcode(\"" . htmlspecialchars($product['barcode']) . "\")'>Test</button></td>";
            echo "</tr>";
        }
        echo "</table>";
        
        // Test the first barcode
        $firstBarcode = $products[0]['barcode'];
        echo "<h3>Testing first barcode: $firstBarcode</h3>";
        
        // Call the actual API
        $apiUrl = "http://localhost/caps2e2/Api/backend_modular.php";
        $postData = json_encode([
            'action' => 'check_barcode',
            'barcode' => $firstBarcode
        ]);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => $postData
            ]
        ]);
        
        $response = file_get_contents($apiUrl, false, $context);
        
        echo "<h4>API Response:</h4>";
        echo "<pre>" . htmlspecialchars($response) . "</pre>";
        
        // Try to parse JSON
        $data = json_decode($response, true);
        if ($data) {
            echo "<h4>Parsed Response:</h4>";
            echo "<pre>" . print_r($data, true) . "</pre>";
            
            echo "<h4>Analysis:</h4>";
            echo "<p><strong>Success:</strong> " . ($data['success'] ? 'YES' : 'NO') . "</p>";
            echo "<p><strong>Found:</strong> " . ($data['found'] ? 'YES' : 'NO') . "</p>";
            echo "<p><strong>Product exists:</strong> " . ($data['product'] ? 'YES' : 'NO') . "</p>";
        } else {
            echo "<p style='color: red;'><strong>❌ Invalid JSON response</strong></p>";
        }
        
    } else {
        echo "<p>No products with barcodes found</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'><strong>Error:</strong> " . $e->getMessage() . "</p>";
}
?>

<script>
function testBarcode(barcode) {
    const apiUrl = "http://localhost/caps2e2/Api/backend_modular.php";
    const data = {
        action: 'check_barcode',
        barcode: barcode
    };
    
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.text())
    .then(text => {
        alert('Response for barcode ' + barcode + ':\n' + text);
        console.log('Response:', text);
    })
    .catch(error => {
        alert('Error testing barcode ' + barcode + ':\n' + error.message);
        console.error('Error:', error);
    });
}
</script>
