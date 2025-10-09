<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== DEBUGGING UPDATE ISSUE ===\n";
    
    // Check the exact data types and values
    $stmt = $pdo->query("SELECT movement_id, product_id, batch_id FROM tbl_stock_movements WHERE product_id = 0 OR batch_id = 0 LIMIT 5");
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Sample records with 0 values:\n";
    foreach ($records as $record) {
        echo "ID: {$record['movement_id']}, Product: '{$record['product_id']}' (type: " . gettype($record['product_id']) . "), Batch: '{$record['batch_id']}' (type: " . gettype($record['batch_id']) . ")\n";
    }
    
    // Try different update approaches
    echo "\n=== TRYING DIFFERENT UPDATE APPROACHES ===\n";
    
    // Approach 1: Direct NULL assignment
    echo "1. Direct NULL assignment...\n";
    $stmt = $pdo->query("UPDATE tbl_stock_movements SET product_id = NULL WHERE product_id = 0");
    echo "   Rows affected: " . $stmt->rowCount() . "\n";
    
    $stmt = $pdo->query("UPDATE tbl_stock_movements SET batch_id = NULL WHERE batch_id = 0");
    echo "   Rows affected: " . $stmt->rowCount() . "\n";
    
    // Check if it worked
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE product_id = 0");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Records with product_id = 0 after update: " . $result['count'] . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE batch_id = 0");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Records with batch_id = 0 after update: " . $result['count'] . "\n";
    
    // If still not working, try deleting the problematic records
    if ($result['count'] > 0) {
        echo "\n2. Deleting problematic records...\n";
        
        $stmt = $pdo->query("DELETE FROM tbl_stock_movements WHERE product_id = 0 OR batch_id = 0");
        echo "   Deleted records: " . $stmt->rowCount() . "\n";
        
        // Verify deletion
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE product_id = 0 OR batch_id = 0");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "   Records with 0 values after deletion: " . $result['count'] . "\n";
    }
    
    // Now try adding constraints
    echo "\n3. Adding foreign key constraints...\n";
    
    $constraints = [
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE"
    ];
    
    $success_count = 0;
    
    foreach ($constraints as $i => $sql) {
        try {
            echo "   Adding constraint " . ($i + 1) . "... ";
            $pdo->exec($sql);
            echo "✅ SUCCESS\n";
            $success_count++;
        } catch (Exception $e) {
            echo "❌ FAILED: " . $e->getMessage() . "\n";
        }
    }
    
    // Final verification
    echo "\n4. Final verification...\n";
    
    $stmt = $pdo->query("
        SELECT COUNT(*) as total_constraints
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'enguio2' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Total foreign key constraints: " . $result['total_constraints'] . "\n";
    
    if ($success_count > 0) {
        echo "\n🎉 SUCCESS! tbl_stock_movements constraints added!\n";
        echo "Database now has " . $result['total_constraints'] . " foreign key constraints.\n";
    } else {
        echo "\n❌ Still failed to add constraints.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
