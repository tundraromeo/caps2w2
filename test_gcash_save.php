<?php
// Test GCash Transaction Save
// Run this: http://localhost/caps2e2/test_gcash_save.php

require_once __DIR__ . '/Api/conn.php';

header('Content-Type: application/json');

try {
    $conn = getDatabaseConnection();
    
    // Get first available product from database
    $productStmt = $conn->prepare("SELECT product_id, product_name, srp as price FROM tbl_product WHERE status = 'active' LIMIT 1");
    $productStmt->execute();
    $product = $productStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        throw new Exception("No active products found in database!");
    }
    
    echo "✅ Found product: {$product['product_name']} (ID: {$product['product_id']})\n\n";
    
    // Test data - simulating a GCash transaction with real product
    $testData = [
        'transactionId' => 'TEST' . time(),
        'totalAmount' => 100.50,
        'referenceNumber' => 'GCASH123456789',
        'terminalName' => 'Test Terminal',
        'paymentMethod' => 'gcash',
        'emp_id' => 1,
        'items' => [
            ['product_id' => $product['product_id'], 'quantity' => 2, 'price' => 50.25]
        ]
    ];
    
    echo "Testing GCash transaction save...\n\n";
    echo "Test Data:\n";
    echo json_encode($testData, JSON_PRETTY_PRINT) . "\n\n";
    
    $conn->beginTransaction();
    
    // 1. Check/Create terminal
    $stmt = $conn->prepare("SELECT terminal_id FROM tbl_pos_terminal WHERE terminal_name = ? LIMIT 1");
    $stmt->execute([$testData['terminalName']]);
    $terminal_id = $stmt->fetchColumn();
    
    if (!$terminal_id) {
        $ins = $conn->prepare("INSERT INTO tbl_pos_terminal (terminal_name, shift_id) VALUES (?, 1)");
        $ins->execute([$testData['terminalName']]);
        $terminal_id = $conn->lastInsertId();
        echo "✅ Terminal created: ID = $terminal_id\n";
    } else {
        echo "✅ Terminal found: ID = $terminal_id\n";
    }
    
    // 2. Normalize payment method
    $pt = strtolower(trim($testData['paymentMethod']));
    if ($pt === 'gcash' || $pt === 'g-cash' || $pt === 'g cash') {
        $paymentEnum = 'Gcash';
    } elseif ($pt === 'card') {
        $paymentEnum = 'card';
    } else {
        $paymentEnum = 'cash';
    }
    echo "✅ Payment method normalized: '$pt' => '$paymentEnum'\n";
    
    // 3. Create transaction
    $txnStmt = $conn->prepare("INSERT INTO tbl_pos_transaction (date, time, emp_id, payment_type) VALUES (CURDATE(), CURTIME(), ?, ?)");
    $txnStmt->execute([$testData['emp_id'], $paymentEnum]);
    $transaction_id = $conn->lastInsertId();
    echo "✅ Transaction created: ID = $transaction_id, payment_type = $paymentEnum\n";
    
    // 4. Create sales header
    $hdrStmt = $conn->prepare("INSERT INTO tbl_pos_sales_header (transaction_id, total_amount, reference_number, terminal_id) VALUES (?, ?, ?, ?)");
    $hdrStmt->execute([
        $transaction_id,
        $testData['totalAmount'],
        $testData['referenceNumber'],
        $terminal_id
    ]);
    $sales_header_id = $conn->lastInsertId();
    echo "✅ Sales header created: ID = $sales_header_id, ref = " . $testData['referenceNumber'] . "\n";
    
    // 5. Insert items
    $dtlStmt = $conn->prepare("INSERT INTO tbl_pos_sales_details (sales_header_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
    foreach ($testData['items'] as $item) {
        $dtlStmt->execute([
            $sales_header_id,
            $item['product_id'],
            $item['quantity'],
            $item['price']
        ]);
        echo "✅ Item saved: product_id = {$item['product_id']}, qty = {$item['quantity']}\n";
    }
    
    $conn->commit();
    
    echo "\n✅✅✅ SUCCESS! GCash transaction saved successfully!\n\n";
    
    // Verify saved data
    $verify = $conn->prepare("
        SELECT 
            t.transaction_id,
            t.payment_type,
            h.total_amount,
            h.reference_number,
            term.terminal_name
        FROM tbl_pos_transaction t
        JOIN tbl_pos_sales_header h ON t.transaction_id = h.transaction_id
        JOIN tbl_pos_terminal term ON h.terminal_id = term.terminal_id
        WHERE t.transaction_id = ?
    ");
    $verify->execute([$transaction_id]);
    $saved = $verify->fetch(PDO::FETCH_ASSOC);
    
    echo "Verification - Saved Data:\n";
    echo json_encode($saved, JSON_PRETTY_PRINT) . "\n";
    
} catch (Exception $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    echo "\n❌❌❌ ERROR: " . $e->getMessage() . "\n";
    echo "Error File: " . $e->getFile() . "\n";
    echo "Error Line: " . $e->getLine() . "\n";
}
?>

