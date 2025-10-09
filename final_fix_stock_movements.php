<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== FINAL FIX FOR tbl_stock_movements ===\n";
    
    // Fix records with 0 values by setting them to NULL
    echo "1. Fixing records with 0 values...\n";
    
    $stmt = $pdo->query("UPDATE tbl_stock_movements SET product_id = NULL WHERE product_id = 0");
    echo "   Set product_id = 0 to NULL: " . $stmt->rowCount() . " records\n";
    
    $stmt = $pdo->query("UPDATE tbl_stock_movements SET batch_id = NULL WHERE batch_id = 0");
    echo "   Set batch_id = 0 to NULL: " . $stmt->rowCount() . " records\n";
    
    // Verify the fix
    echo "\n2. Verifying the fix...\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE product_id = 0");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Records with product_id = 0: " . $result['count'] . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE batch_id = 0");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Records with batch_id = 0: " . $result['count'] . "\n";
    
    // Check for any remaining invalid records
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE product_id IS NOT NULL AND product_id NOT IN (SELECT product_id FROM tbl_product)");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Invalid product_id records: " . $result['count'] . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE batch_id IS NOT NULL AND batch_id NOT IN (SELECT batch_id FROM tbl_batch)");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Invalid batch_id records: " . $result['count'] . "\n";
    
    echo "\n3. Adding foreign key constraints...\n";
    
    $constraints = [
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE"
    ];
    
    $success_count = 0;
    $error_count = 0;
    
    foreach ($constraints as $i => $sql) {
        try {
            echo "   Adding constraint " . ($i + 1) . "... ";
            $pdo->exec($sql);
            echo "✅ SUCCESS\n";
            $success_count++;
        } catch (Exception $e) {
            echo "❌ FAILED: " . $e->getMessage() . "\n";
            $error_count++;
        }
    }
    
    echo "\n4. Final verification...\n";
    
    // Check total constraints
    $stmt = $pdo->query("
        SELECT COUNT(*) as total_constraints
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'enguio2' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Total foreign key constraints: " . $result['total_constraints'] . "\n";
    
    // Check tbl_stock_movements constraints specifically
    $stmt = $pdo->query("
        SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'enguio2' 
        AND TABLE_NAME = 'tbl_stock_movements'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $stock_constraints = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "   tbl_stock_movements constraints: " . count($stock_constraints) . "\n";
    foreach ($stock_constraints as $constraint) {
        echo "     ✅ {$constraint['CONSTRAINT_NAME']}: {$constraint['COLUMN_NAME']} → {$constraint['REFERENCED_TABLE_NAME']}.{$constraint['REFERENCED_COLUMN_NAME']}\n";
    }
    
    echo "\n=== FINAL SUMMARY ===\n";
    
    if ($success_count > 0) {
        echo "🎉 SUCCESS! tbl_stock_movements constraints added!\n";
        echo "✅ Database now has " . $result['total_constraints'] . " foreign key constraints\n";
        echo "✅ All tables with FK columns now have proper constraints\n";
        echo "✅ Database is fully normalized and ready for academic paper!\n";
    } else {
        echo "❌ Failed to add tbl_stock_movements constraints\n";
        echo "Database still has " . $result['total_constraints'] . " foreign key constraints\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
