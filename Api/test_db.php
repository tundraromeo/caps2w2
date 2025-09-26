<?php
// Test database connection and sales data
$conn = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== DATABASE CONNECTION TEST ===\n";

try {
    // Check transactions
    $stmt = $conn->prepare('SELECT COUNT(*) as count FROM tbl_pos_transaction');
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total transactions: " . $result['count'] . "\n";
    
    // Check sales headers
    $stmt = $conn->prepare('SELECT COUNT(*) as count FROM tbl_pos_sales_header');
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total sales headers: " . $result['count'] . "\n";
    
    // Check sales details
    $stmt = $conn->prepare('SELECT COUNT(*) as count FROM tbl_pos_sales_details');
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total sales details: " . $result['count'] . "\n";
    
    // Show recent transactions
    echo "\n=== RECENT TRANSACTIONS ===\n";
    $stmt = $conn->prepare('
        SELECT pt.transaction_id, pt.date, pt.time, pt.payment_type, psh.total_amount, psh.reference_number
        FROM tbl_pos_transaction pt
        LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
        ORDER BY pt.date DESC, pt.time DESC
        LIMIT 5
    ');
    $stmt->execute();
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($transactions as $txn) {
        echo "TXN {$txn['transaction_id']}: {$txn['date']} {$txn['time']} - {$txn['payment_type']} - ₱{$txn['total_amount']}\n";
    }
    
    // Test today's sales
    echo "\n=== TODAY'S SALES TEST ===\n";
    $today = date('Y-m-d');
    $stmt = $conn->prepare('
        SELECT 
            COUNT(DISTINCT pt.transaction_id) as total_transactions,
            COALESCE(SUM(psh.total_amount), 0) as total_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = "cash" THEN psh.total_amount ELSE 0 END), 0) as cash_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = "Gcash" THEN psh.total_amount ELSE 0 END), 0) as gcash_sales
        FROM tbl_pos_transaction pt
        LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
        WHERE DATE(pt.date) = ?
    ');
    $stmt->execute([$today]);
    $salesData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Today ({$today}):\n";
    echo "- Total Transactions: {$salesData['total_transactions']}\n";
    echo "- Total Sales: ₱{$salesData['total_sales']}\n";
    echo "- Cash Sales: ₱{$salesData['cash_sales']}\n";
    echo "- GCash Sales: ₱{$salesData['gcash_sales']}\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

