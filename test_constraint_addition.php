<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== TESTING DATABASE CONNECTION ===\n";
    echo "✅ Connected to database successfully!\n";
    
    echo "\n=== TESTING FOREIGN KEY ADDITION ===\n";
    
    // Test adding one constraint at a time
    $constraints_to_test = [
        "ALTER TABLE `tbl_product` ADD CONSTRAINT `fk_product_brand` FOREIGN KEY (`brand_id`) REFERENCES `tbl_brand` (`brand_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        "ALTER TABLE `tbl_product` ADD CONSTRAINT `fk_product_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_supplier` (`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        "ALTER TABLE `tbl_product` ADD CONSTRAINT `fk_product_location` FOREIGN KEY (`location_id`) REFERENCES `tbl_location` (`location_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        "ALTER TABLE `tbl_product` ADD CONSTRAINT `fk_product_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE SET NULL ON UPDATE CASCADE"
    ];
    
    $success_count = 0;
    $error_count = 0;
    
    foreach ($constraints_to_test as $i => $sql) {
        try {
            echo "Testing constraint " . ($i + 1) . "... ";
            $pdo->exec($sql);
            echo "✅ SUCCESS\n";
            $success_count++;
        } catch (Exception $e) {
            echo "❌ FAILED: " . $e->getMessage() . "\n";
            $error_count++;
        }
    }
    
    echo "\n=== RESULTS ===\n";
    echo "Successful: $success_count\n";
    echo "Failed: $error_count\n";
    
    if ($success_count > 0) {
        echo "\n✅ Some constraints were added successfully!\n";
        echo "You can continue with the remaining constraints.\n";
    } else {
        echo "\n❌ All constraints failed. Check MySQL permissions.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Database connection error: " . $e->getMessage() . "\n";
    echo "\nPossible solutions:\n";
    echo "1. Check if MySQL service is running\n";
    echo "2. Verify username/password\n";
    echo "3. Check MySQL user permissions\n";
    echo "4. Try using phpMyAdmin instead\n";
}
?>
