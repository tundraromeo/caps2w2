<?php
header('Content-Type: application/json');

// Test database connection and sales data
try {
    $conn = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $result = [
        'database_connection' => 'success',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    // Check transactions
    $stmt = $conn->prepare('SELECT COUNT(*) as count FROM tbl_pos_transaction');
    $stmt->execute();
    $result['total_transactions'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Check sales headers
    $stmt = $conn->prepare('SELECT COUNT(*) as count FROM tbl_pos_sales_header');
    $stmt->execute();
    $result['total_sales_headers'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Check sales details
    $stmt = $conn->prepare('SELECT COUNT(*) as count FROM tbl_pos_sales_details');
    $stmt->execute();
    $result['total_sales_details'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Show recent transactions
    $stmt = $conn->prepare('
        SELECT pt.transaction_id, pt.date, pt.time, pt.payment_type, psh.total_amount, psh.reference_number
        FROM tbl_pos_transaction pt
        LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
        ORDER BY pt.date DESC, pt.time DESC
        LIMIT 5
    ');
    $stmt->execute();
    $result['recent_transactions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Test today's sales
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
    $result['today_sales'] = $stmt->fetch(PDO::FETCH_ASSOC);
    $result['today_sales']['date'] = $today;
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>

