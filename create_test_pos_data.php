<?php
// Test script to create sample POS data for testing auto-reflect functionality
require_once 'Api/conn_mysqli.php';

try {
    echo "🔄 Creating test POS data...\n";
    
    // Check if we already have data
    $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_pos_sales_header");
    $checkStmt->execute();
    $result = $checkStmt->fetch();
    $existingCount = $result['count'];
    
    if ($existingCount > 0) {
        echo "✅ POS data already exists ($existingCount records)\n";
        echo "🔄 Adding new test transaction...\n";
    } else {
        echo "📝 No existing POS data found. Creating test data...\n";
    }
    
    // Create a test transaction
    $txnStmt = $conn->prepare("INSERT INTO tbl_pos_transaction (date, time, emp_id, payment_type) VALUES (CURDATE(), CURTIME(), 1, 'cash')");
    $txnStmt->execute();
    $transactionId = $conn->lastInsertId();
    
    echo "✅ Created transaction ID: $transactionId\n";
    
    // Create sales header
    $headerStmt = $conn->prepare("INSERT INTO tbl_pos_sales_header (transaction_id, total_amount, reference_number, terminal_id) VALUES (?, ?, ?, ?)");
    $testAmount = rand(100, 1000); // Random amount between 100-1000
    $referenceNumber = 'TEST-' . date('YmdHis');
    $terminalId = 1;
    
    $headerStmt->execute([$transactionId, $testAmount, $referenceNumber, $terminalId]);
    $salesHeaderId = $conn->lastInsertId();
    
    echo "✅ Created sales header ID: $salesHeaderId (Amount: ₱$testAmount)\n";
    
    // Create sales details (sample products)
    $products = [
        ['product_id' => 1, 'quantity' => 2, 'price' => $testAmount / 2],
        ['product_id' => 2, 'quantity' => 1, 'price' => $testAmount / 2]
    ];
    
    foreach ($products as $product) {
        $detailStmt = $conn->prepare("INSERT INTO tbl_pos_sales_details (sales_header_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
        $detailStmt->execute([$salesHeaderId, $product['product_id'], $product['quantity'], $product['price']]);
    }
    
    echo "✅ Created sales details for " . count($products) . " products\n";
    
    // Test the API endpoint
    echo "\n🧪 Testing API endpoint...\n";
    
    $testData = [
        'action' => 'get_report_data',
        'report_type' => 'sales',
        'start_date' => date('Y-m-d'),
        'end_date' => date('Y-m-d')
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'http://localhost/Enguio_Project/Api/backend.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $result = json_decode($response, true);
        if ($result && $result['success']) {
            $dataCount = count($result['data']);
            echo "✅ API test successful! Found $dataCount sales records\n";
            echo "📊 Sample data: " . json_encode($result['data'][0] ?? 'No data') . "\n";
        } else {
            echo "❌ API test failed: " . ($result['message'] ?? 'Unknown error') . "\n";
        }
    } else {
        echo "❌ API test failed with HTTP code: $httpCode\n";
    }
    
    echo "\n🎉 Test data creation complete!\n";
    echo "💡 Now you can:\n";
    echo "   1. Go to the admin dashboard\n";
    echo "   2. Open Sales Report or Cashier Performance Report\n";
    echo "   3. Enable auto-refresh\n";
    echo "   4. Run this script again to see real-time updates!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
