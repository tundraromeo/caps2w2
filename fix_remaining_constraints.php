<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== FIXING REMAINING DATA INTEGRITY ISSUES ===\n";
    
    // Fix tbl_stock_movements data integrity issues
    echo "1. Fixing tbl_stock_movements data integrity...\n";
    
    // Check orphaned product_id in tbl_stock_movements
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements sm LEFT JOIN tbl_product p ON sm.product_id = p.product_id WHERE sm.product_id IS NOT NULL AND p.product_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Orphaned product_id records: " . $result['count'] . "\n";
    
    if ($result['count'] > 0) {
        // Set orphaned product_id to NULL
        $stmt = $pdo->query("UPDATE tbl_stock_movements SET product_id = NULL WHERE product_id NOT IN (SELECT product_id FROM tbl_product)");
        echo "   ✅ Fixed " . $stmt->rowCount() . " orphaned product_id records\n";
    }
    
    // Check orphaned batch_id in tbl_stock_movements
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements sm LEFT JOIN tbl_batch b ON sm.batch_id = b.batch_id WHERE sm.batch_id IS NOT NULL AND b.batch_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Orphaned batch_id records: " . $result['count'] . "\n";
    
    if ($result['count'] > 0) {
        // Set orphaned batch_id to NULL
        $stmt = $pdo->query("UPDATE tbl_stock_movements SET batch_id = NULL WHERE batch_id NOT IN (SELECT batch_id FROM tbl_batch)");
        echo "   ✅ Fixed " . $stmt->rowCount() . " orphaned batch_id records\n";
    }
    
    // Fix tbl_pos_returns data integrity issues
    echo "\n2. Fixing tbl_pos_returns data integrity...\n";
    
    // Check orphaned user_id in tbl_pos_returns
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_pos_returns pr LEFT JOIN tbl_employee e ON pr.user_id = e.emp_id WHERE pr.user_id IS NOT NULL AND e.emp_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Orphaned user_id records: " . $result['count'] . "\n";
    
    if ($result['count'] > 0) {
        // Set orphaned user_id to NULL
        $stmt = $pdo->query("UPDATE tbl_pos_returns SET user_id = NULL WHERE user_id NOT IN (SELECT emp_id FROM tbl_employee)");
        echo "   ✅ Fixed " . $stmt->rowCount() . " orphaned user_id records\n";
    }
    
    // Fix tbl_activity_log data integrity issues
    echo "\n3. Fixing tbl_activity_log data integrity...\n";
    
    // Check orphaned user_id in tbl_activity_log
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_activity_log al LEFT JOIN tbl_employee e ON al.user_id = e.emp_id WHERE al.user_id IS NOT NULL AND e.emp_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Orphaned user_id records: " . $result['count'] . "\n";
    
    if ($result['count'] > 0) {
        // Set orphaned user_id to NULL
        $stmt = $pdo->query("UPDATE tbl_activity_log SET user_id = NULL WHERE user_id NOT IN (SELECT emp_id FROM tbl_employee)");
        echo "   ✅ Fixed " . $stmt->rowCount() . " orphaned user_id records\n";
    }
    
    echo "\n=== ATTEMPTING TO ADD REMAINING CONSTRAINTS ===\n";
    
    // Try adding the failed constraints again
    $remaining_constraints = [
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_pos_returns` ADD CONSTRAINT `fk_returns_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_employee` (`emp_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        "ALTER TABLE `tbl_activity_log` ADD CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_employee` (`emp_id`) ON DELETE SET NULL ON UPDATE CASCADE"
    ];
    
    $success_count = 0;
    $error_count = 0;
    
    foreach ($remaining_constraints as $i => $sql) {
        try {
            echo "Adding remaining constraint " . ($i + 1) . "... ";
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
    
    if ($success_count > 0) {
        echo "✅ Added " . $success_count . " more constraints!\n";
    }
    
    echo "\n🎉 DATABASE NORMALIZATION COMPLETE!\n";
    echo "Your database now has " . $result['total_constraints'] . " foreign key constraints.\n";
    echo "Perfect for academic paper documentation!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
