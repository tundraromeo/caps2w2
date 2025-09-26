<?php
header('Content-Type: application/json');

try {
    $conn = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $result = [
        'database_connection' => 'success',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    // Check what sales-related tables exist
    $stmt = $conn->prepare("SHOW TABLES LIKE '%sales%'");
    $stmt->execute();
    $salesTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $result['sales_tables'] = $salesTables;
    
    // Check what pos-related tables exist
    $stmt = $conn->prepare("SHOW TABLES LIKE '%pos%'");
    $stmt->execute();
    $posTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $result['pos_tables'] = $posTables;
    
    // Check what transaction-related tables exist
    $stmt = $conn->prepare("SHOW TABLES LIKE '%transaction%'");
    $stmt->execute();
    $transactionTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $result['transaction_tables'] = $transactionTables;
    
    // For each sales table, get structure and sample data
    foreach ($salesTables as $table) {
        // Get table structure
        $stmt = $conn->prepare("DESCRIBE `$table`");
        $stmt->execute();
        $structure = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['table_structures'][$table] = $structure;
        
        // Get row count
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM `$table`");
        $stmt->execute();
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        $result['table_counts'][$table] = $count;
        
        // Get sample data (first 3 rows)
        if ($count > 0) {
            $stmt = $conn->prepare("SELECT * FROM `$table` LIMIT 3");
            $stmt->execute();
            $sample = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $result['sample_data'][$table] = $sample;
        }
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>

