<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== FINAL CLEANUP FOR tbl_stock_movements ===\n";
    
    // Check current data
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM tbl_stock_movements");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total records: " . $result['total'] . "\n";
    
    // Check records with 0 values
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE product_id = 0 OR batch_id = 0");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Records with 0 values: " . $result['count'] . "\n";
    
    // Check orphaned records
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements sm LEFT JOIN tbl_product p ON sm.product_id = p.product_id WHERE sm.product_id IS NOT NULL AND sm.product_id != 0 AND p.product_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Orphaned product_id records: " . $result['count'] . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements sm LEFT JOIN tbl_batch b ON sm.batch_id = b.batch_id WHERE sm.batch_id IS NOT NULL AND sm.batch_id != 0 AND b.batch_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Orphaned batch_id records: " . $result['count'] . "\n";
    
    echo "\n=== CLEANING UP DATA ===\n";
    
    // Set 0 values to NULL
    $stmt = $pdo->query("UPDATE tbl_stock_movements SET product_id = NULL WHERE product_id = 0");
    echo "Set product_id = 0 to NULL: " . $stmt->rowCount() . " records\n";
    
    $stmt = $pdo->query("UPDATE tbl_stock_movements SET batch_id = NULL WHERE batch_id = 0");
    echo "Set batch_id = 0 to NULL: " . $stmt->rowCount() . " records\n";
    
    // Set orphaned values to NULL
    $stmt = $pdo->query("UPDATE tbl_stock_movements SET product_id = NULL WHERE product_id NOT IN (SELECT product_id FROM tbl_product) AND product_id IS NOT NULL");
    echo "Set orphaned product_id to NULL: " . $stmt->rowCount() . " records\n";
    
    $stmt = $pdo->query("UPDATE tbl_stock_movements SET batch_id = NULL WHERE batch_id NOT IN (SELECT batch_id FROM tbl_batch) AND batch_id IS NOT NULL");
    echo "Set orphaned batch_id to NULL: " . $stmt->rowCount() . " records\n";
    
    echo "\n=== ADDING FOREIGN KEY CONSTRAINTS ===\n";
    
    $constraints = [
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE"
    ];
    
    $success_count = 0;
    $error_count = 0;
    
    foreach ($constraints as $i => $sql) {
        try {
            echo "Adding constraint " . ($i + 1) . "... ";
            $pdo->exec($sql);
            echo "✅ SUCCESS\n";
            $success_count++;
        } catch (Exception $e) {
            echo "❌ FAILED: " . $e->getMessage() . "\n";
            $error_count++;
        }
    }
    
    echo "\n=== FINAL VERIFICATION ===\n";
    $stmt = $pdo->query("
        SELECT COUNT(*) as total_constraints
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'enguio2' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total foreign key constraints: " . $result['total_constraints'] . "\n";
    
    // Check tbl_stock_movements constraints specifically
    $stmt = $pdo->query("
        SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'enguio2' 
        AND TABLE_NAME = 'tbl_stock_movements'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $stock_constraints = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\ntbl_stock_movements constraints: " . count($stock_constraints) . "\n";
    foreach ($stock_constraints as $constraint) {
        echo "   ✅ {$constraint['CONSTRAINT_NAME']}: {$constraint['COLUMN_NAME']} → {$constraint['REFERENCED_TABLE_NAME']}.{$constraint['REFERENCED_COLUMN_NAME']}\n";
    }
    
    if ($success_count > 0) {
        echo "\n🎉 tbl_stock_movements CONSTRAINTS SUCCESSFULLY ADDED!\n";
        echo "Your database now has " . $result['total_constraints'] . " foreign key constraints.\n";
        echo "Perfect for academic paper documentation!\n";
    } else {
        echo "\n❌ Failed to add tbl_stock_movements constraints.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
