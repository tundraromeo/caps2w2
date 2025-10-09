<?php
/**
 * SIMPLE: Fix Category Foreign Key Only
 * 
 * Discount stays in POS tables (correct location for PWD/Senior discounts)
 * Only fixes the category VARCHAR to INT FK issue
 */

$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "================================================\n";
    echo "SIMPLE CATEGORY FK FIX\n";
    echo "================================================\n\n";
    
    // Check current state
    echo "🔍 Checking current database...\n";
    
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_product LIKE 'category'");
    $categoryCol = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$categoryCol) {
        echo "✅ Category column already migrated to category_id!\n";
        exit(0);
    }
    
    echo "⚠️  Found: category column is " . $categoryCol['Type'] . "\n";
    echo "✅ Will convert to: category_id INT with FK\n\n";
    
    // Count products
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_product");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "📦 Total products: $count\n\n";
    
    // Ask confirmation
    echo "Continue? (yes/no): ";
    $handle = fopen("php://stdin", "r");
    $line = trim(fgets($handle));
    fclose($handle);
    
    if (strtolower($line) !== 'yes') {
        echo "Cancelled.\n";
        exit(0);
    }
    
    echo "\n🚀 Starting migration...\n\n";
    
    $pdo->beginTransaction();
    
    // Step 1: Add category_id
    echo "1. Adding category_id column... ";
    $pdo->exec("ALTER TABLE tbl_product ADD COLUMN category_id INT NULL AFTER category");
    echo "✅\n";
    
    // Step 2: Map data
    echo "2. Mapping categories... ";
    $stmt = $pdo->exec("
        UPDATE tbl_product p
        INNER JOIN tbl_category c ON p.category = c.category_name
        SET p.category_id = c.category_id
    ");
    echo "✅ ($stmt products)\n";
    
    // Step 3: Handle unmapped
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_product WHERE category_id IS NULL");
    $unmapped = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($unmapped > 0) {
        echo "3. Handling $unmapped unmapped products... ";
        $pdo->exec("
            INSERT INTO tbl_category (category_name)
            SELECT 'Uncategorized'
            WHERE NOT EXISTS (SELECT 1 FROM tbl_category WHERE category_name = 'Uncategorized')
        ");
        $pdo->exec("
            UPDATE tbl_product 
            SET category_id = (SELECT category_id FROM tbl_category WHERE category_name = 'Uncategorized')
            WHERE category_id IS NULL
        ");
        echo "✅\n";
    } else {
        echo "3. No unmapped products ✅\n";
    }
    
    // Step 4: Make NOT NULL
    echo "4. Setting NOT NULL constraint... ";
    $pdo->exec("ALTER TABLE tbl_product MODIFY COLUMN category_id INT NOT NULL");
    echo "✅\n";
    
    // Step 5: Drop old column
    echo "5. Removing old VARCHAR column... ";
    $pdo->exec("ALTER TABLE tbl_product DROP COLUMN category");
    echo "✅\n";
    
    // Step 6: Add FK
    echo "6. Adding Foreign Key constraint... ";
    $pdo->exec("
        ALTER TABLE tbl_product
        ADD CONSTRAINT fk_product_category 
        FOREIGN KEY (category_id) 
        REFERENCES tbl_category(category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ");
    echo "✅\n";
    
    // Step 7: Add index
    echo "7. Adding index... ";
    $pdo->exec("ALTER TABLE tbl_product ADD INDEX idx_category_id (category_id)");
    echo "✅\n";
    
    $pdo->commit();
    
    echo "\n================================================\n";
    echo "✅ MIGRATION COMPLETED SUCCESSFULLY!\n";
    echo "================================================\n\n";
    
    // Verify
    $stmt = $pdo->query("
        SELECT 
            c.category_name,
            COUNT(p.product_id) as product_count
        FROM tbl_category c
        LEFT JOIN tbl_product p ON c.category_id = p.category_id
        GROUP BY c.category_id, c.category_name
        HAVING product_count > 0
        ORDER BY product_count DESC
    ");
    
    echo "📊 Products by Category:\n";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   {$row['category_name']}: {$row['product_count']} products\n";
    }
    
    echo "\n✅ Category FK is now properly implemented!\n";
    echo "✅ Discount remains in POS tables (correct location)\n";
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Transaction rolled back.\n";
    exit(1);
}
?>


