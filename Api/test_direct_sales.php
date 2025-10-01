<?php
// Direct test of the sales API
header('Content-Type: application/json');

echo "=== DIRECT SALES API TEST ===\n\n";

// Test 1: Check if we can access the sales tables directly
try {
    $conn = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "1. Database Connection: SUCCESS\n";
    
    // Check if sales tables exist and have data
    $tables = ['tbl_pos_transaction', 'tbl_pos_sales_header', 'tbl_pos_sales_details'];
    foreach ($tables as $table) {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM `$table`");
        $stmt->execute();
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        echo "   - $table: $count records\n";
    }
    
    echo "\n2. Testing Sales Query:\n";
    
    // Test the exact query from backend
    $today = date('Y-m-d');
    $sql = "
        SELECT 
            COUNT(DISTINCT pt.transaction_id) as total_transactions,
            COALESCE(SUM(psh.total_amount), 0) as total_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = 'cash' THEN psh.total_amount ELSE 0 END), 0) as cash_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = 'Gcash' THEN psh.total_amount ELSE 0 END), 0) as gcash_sales,
            COALESCE(SUM(CASE WHEN pt.payment_type = 'card' THEN psh.total_amount ELSE 0 END), 0) as card_sales
        FROM tbl_pos_transaction pt
        LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
        WHERE DATE(pt.date) = :today
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([':today' => $today]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "   Date: $today\n";
    echo "   Total Transactions: " . ($result['total_transactions'] ?? 0) . "\n";
    echo "   Total Sales: " . ($result['total_sales'] ?? 0) . "\n";
    echo "   Cash Sales: " . ($result['cash_sales'] ?? 0) . "\n";
    echo "   GCash Sales: " . ($result['gcash_sales'] ?? 0) . "\n";
    echo "   Card Sales: " . ($result['card_sales'] ?? 0) . "\n";
    
    echo "\n3. Testing Sales API Call:\n";
    
    // Test the actual API call
    $testData = [
        'action' => 'get_today_sales',
        'cashier_username' => 'Admin',
        'location_name' => 'Convenience Store',
        'terminal_name' => 'Convenience POS'
    ];
    
    $url = 'http://localhost/Enguio_Project/Api/sales_api.php';
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "   HTTP Code: $httpCode\n";
    echo "   Response: $response\n";
    
    if ($response) {
        $decoded = json_decode($response, true);
        if ($decoded) {
            echo "   Decoded Response:\n";
            echo "   - Success: " . ($decoded['success'] ? 'true' : 'false') . "\n";
            if (isset($decoded['data'])) {
                echo "   - Data: " . json_encode($decoded['data'], JSON_PRETTY_PRINT) . "\n";
            }
            if (isset($decoded['message'])) {
                echo "   - Message: " . $decoded['message'] . "\n";
            }
        }
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
?>




















