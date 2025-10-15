<?php
/**
 * Migration: Add item_status column to tbl_purchase_order_dtl
 * 
 * Run this file ONCE to add the item_status column
 * Access via: http://localhost/caps2w2/backend/Api/migrations/run_add_item_status.php
 */

require_once '../conn.php';

try {
    echo "Starting migration: Add item_status column...\n<br>";
    
    // Read SQL file
    $sql = file_get_contents(__DIR__ . '/add_item_status_column.sql');
    
    // Split by semicolons to execute each statement separately
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    $conn->beginTransaction();
    
    foreach ($statements as $statement) {
        if (empty($statement) || strpos($statement, '--') === 0) {
            continue; // Skip empty lines and comments
        }
        
        echo "Executing: " . substr($statement, 0, 100) . "...\n<br>";
        $conn->exec($statement);
    }
    
    $conn->commit();
    
    echo "\n<br><strong>✅ Migration completed successfully!</strong>\n<br>";
    echo "The item_status column has been added to tbl_purchase_order_dtl table.\n<br>";
    
} catch (Exception $e) {
    if ($conn) {
        $conn->rollBack();
    }
    echo "\n<br><strong>❌ Migration failed:</strong> " . $e->getMessage() . "\n<br>";
}

$conn = null;
?>

