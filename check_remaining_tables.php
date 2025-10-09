<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== CHECKING tbl_stock_movements DATA INTEGRITY ===\n";
    
    // Check tbl_stock_movements data
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM tbl_stock_movements");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total records in tbl_stock_movements: " . $result['total'] . "\n";
    
    // Check for NULL values
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE product_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Records with NULL product_id: " . $result['count'] . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements WHERE batch_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Records with NULL batch_id: " . $result['count'] . "\n";
    
    // Check for orphaned records
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements sm LEFT JOIN tbl_product p ON sm.product_id = p.product_id WHERE sm.product_id IS NOT NULL AND p.product_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Orphaned product_id records: " . $result['count'] . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_stock_movements sm LEFT JOIN tbl_batch b ON sm.batch_id = b.batch_id WHERE sm.batch_id IS NOT NULL AND b.batch_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Orphaned batch_id records: " . $result['count'] . "\n";
    
    // Show sample data
    echo "\n=== SAMPLE DATA ===\n";
    $stmt = $pdo->query("SELECT movement_id, product_id, batch_id, movement_type, quantity FROM tbl_stock_movements LIMIT 5");
    $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($samples as $sample) {
        echo "ID: {$sample['movement_id']}, Product: {$sample['product_id']}, Batch: {$sample['batch_id']}, Type: {$sample['movement_type']}, Qty: {$sample['quantity']}\n";
    }
    
    echo "\n=== CHECKING tbl_archive ===\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM tbl_archive");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total records in tbl_archive: " . $result['total'] . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_archive WHERE item_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Records with NULL item_id: " . $result['count'] . "\n";
    
    // Show sample data
    echo "\n=== SAMPLE ARCHIVE DATA ===\n";
    $stmt = $pdo->query("SELECT archive_id, item_id FROM tbl_archive LIMIT 5");
    $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($samples as $sample) {
        echo "Archive ID: {$sample['archive_id']}, Item ID: {$sample['item_id']}\n";
    }
    
    echo "\n=== ATTEMPTING TO ADD MISSING CONSTRAINTS ===\n";
    
    // Try to add tbl_stock_movements constraints
    $constraints = [
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE"
    ];
    
    foreach ($constraints as $i => $sql) {
        try {
            echo "Adding constraint " . ($i + 1) . "... ";
            $pdo->exec($sql);
            echo "✅ SUCCESS\n";
        } catch (Exception $e) {
            echo "❌ FAILED: " . $e->getMessage() . "\n";
        }
    }
    
    // Check if tbl_archive.item_id should reference tbl_product.product_id
    echo "\n=== CHECKING tbl_archive.item_id RELATIONSHIP ===\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_archive a LEFT JOIN tbl_product p ON a.item_id = p.product_id WHERE a.item_id IS NOT NULL AND p.product_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Orphaned item_id records: " . $result['count'] . "\n";
    
    if ($result['count'] == 0) {
        echo "✅ All item_id values exist in tbl_product.product_id\n";
        echo "Can add foreign key constraint!\n";
        
        try {
            echo "Adding tbl_archive constraint... ";
            $pdo->exec("ALTER TABLE `tbl_archive` ADD CONSTRAINT `fk_archive_item` FOREIGN KEY (`item_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE");
            echo "✅ SUCCESS\n";
        } catch (Exception $e) {
            echo "❌ FAILED: " . $e->getMessage() . "\n";
        }
    } else {
        echo "❌ Some item_id values don't exist in tbl_product\n";
        echo "Need to clean up data first.\n";
    }
    
    // Final verification
    echo "\n=== FINAL VERIFICATION ===\n";
    $stmt = $pdo->query("
        SELECT COUNT(*) as total_constraints
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'enguio2' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total foreign key constraints: " . $result['total_constraints'] . "\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
