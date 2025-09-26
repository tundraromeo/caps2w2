<?php
header('Content-Type: application/json');

try {
    $conn = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $result = [
        'database_connection' => 'success',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    // Test the exact query from the backend
    $today = date('Y-m-d');
    
    $sql = "
        SELECT 
            COUNT(DISTINCT pt.transaction_id) as total_transactions,
            COALESCE(SUM(psh.total_amount), 0) as total_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = 'cash' THEN psh.total_amount ELSE 0 END), 0) as cash_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = 'Gcash' THEN psh.total_amount ELSE 0 END), 0) as gcash_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = 'card' THEN psh.total_amount ELSE 0 END), 0) as card_sales,
            0 as total_discount
        FROM tbl_pos_transaction pt
        LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
        LEFT JOIN tbl_employee e ON pt.emp_id = e.emp_id
        WHERE DATE(pt.date) = :today
    ";
    
    $params = [':today' => $today];
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $salesData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $result['today_sales_query'] = $salesData;
    $result['query_date'] = $today;
    
    // Also test without date filter to see all data
    $sqlAll = "
        SELECT 
            COUNT(DISTINCT pt.transaction_id) as total_transactions,
            COALESCE(SUM(psh.total_amount), 0) as total_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = 'cash' THEN psh.total_amount ELSE 0 END), 0) as cash_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = 'Gcash' THEN psh.total_amount ELSE 0 END), 0) as gcash_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = 'card' THEN psh.total_amount ELSE 0 END), 0) as card_sales
        FROM tbl_pos_transaction pt
        LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
        LEFT JOIN tbl_employee e ON pt.emp_id = e.emp_id
    ";
    
    $stmt = $conn->prepare($sqlAll);
    $stmt->execute();
    $allSalesData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $result['all_sales_query'] = $allSalesData;
    
    // Check individual table data
    $stmt = $conn->prepare('SELECT COUNT(*) as count FROM tbl_pos_transaction');
    $stmt->execute();
    $result['transaction_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $conn->prepare('SELECT COUNT(*) as count FROM tbl_pos_sales_header');
    $stmt->execute();
    $result['sales_header_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $conn->prepare('SELECT COUNT(*) as count FROM tbl_pos_sales_details');
    $stmt->execute();
    $result['sales_details_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Show sample data
    $stmt = $conn->prepare('SELECT * FROM tbl_pos_transaction LIMIT 3');
    $stmt->execute();
    $result['sample_transactions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $conn->prepare('SELECT * FROM tbl_pos_sales_header LIMIT 3');
    $stmt->execute();
    $result['sample_sales_headers'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>

