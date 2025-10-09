<?php
/**
 * Fix Category FK for New SQL (enguio2 6.sql)
 * 
 * You already deleted category VARCHAR and added category_id INT
 * This script just:
 * 1. Updates NULL category_id values
 * 2. Adds the missing FK constraint
 */

$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "==========================================\n";
    echo "FIX CATEGORY FK (New SQL File)\n";
    echo "==========================================\n\n";
    
    // Check current state
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_product LIKE 'category_id'");
    $col = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$col) {
        echo "❌ category_id column doesn't exist!\n";
        echo "   Run the old migration script first.\n";
        exit(1);
    }
    
    echo "✅ category_id column exists: " . $col['Type'] . "\n";
    
    // Check for NULL values
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_product WHERE category_id IS NULL");
    $nullCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    echo "⚠️  Products with NULL category_id: $nullCount\n\n";
    
    if ($nullCount > 0) {
        echo "📋 Products needing category assignment:\n";
        $stmt = $pdo->query("SELECT product_id, product_name, category_id FROM tbl_product WHERE category_id IS NULL");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "   - [{$row['product_id']}] {$row['product_name']}\n";
        }
        echo "\n";
    }
    
    // Ask confirmation
    echo "This will:\n";
    echo "  1. Assign categories to products with NULL\n";
    echo "  2. Add Foreign Key constraint\n";
    echo "  3. Make category_id NOT NULL\n\n";
    
    echo "Continue? (yes/no): ";
    $handle = fopen("php://stdin", "r");
    $line = trim(fgets($handle));
    fclose($handle);
    
    if (strtolower($line) !== 'yes') {
        echo "Cancelled.\n";
        exit(0);
    }
    
    echo "\n🚀 Fixing...\n\n";
    
    $pdo->beginTransaction();
    
    // Step 1: Update NULL values
    if ($nullCount > 0) {
        echo "1. Assigning categories to products... ";
        
        // Mang tomas, Ketchup = Convenience Food (24)
        $pdo->exec("
            UPDATE tbl_product 
            SET category_id = 24 
            WHERE (product_name LIKE '%Mang tomas%' OR product_name LIKE '%Ketchup%')
            AND category_id IS NULL
        ");
        
        // Spicy, Sinamak = Snack Foods (25)
        $pdo->exec("
            UPDATE tbl_product 
            SET category_id = 25 
            WHERE (product_name LIKE '%Spicy%' OR product_name LIKE '%Sinamak%')
            AND category_id IS NULL
        ");
        
        // Create Uncategorized if needed
        $pdo->exec("
            INSERT INTO tbl_category (category_name)
            SELECT 'Uncategorized'
            WHERE NOT EXISTS (SELECT 1 FROM tbl_category WHERE category_name = 'Uncategorized')
        ");
        
        // Assign remaining to Uncategorized
        $pdo->exec("
            UPDATE tbl_product 
            SET category_id = (SELECT category_id FROM tbl_category WHERE category_name = 'Uncategorized')
            WHERE category_id IS NULL
        ");
        
        echo "✅\n";
    } else {
        echo "1. All products already have categories ✅\n";
    }
    
    // Step 2: Make NOT NULL
    echo "2. Setting NOT NULL constraint... ";
    $pdo->exec("ALTER TABLE tbl_product MODIFY COLUMN category_id INT NOT NULL");
    echo "✅\n";
    
    // Step 3: Add FK constraint (if not exists)
    echo "3. Adding Foreign Key constraint... ";
    try {
        $pdo->exec("
            ALTER TABLE tbl_product
            ADD CONSTRAINT fk_product_category 
            FOREIGN KEY (category_id) 
            REFERENCES tbl_category(category_id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE
        ");
        echo "✅\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "✅ (already exists)\n";
        } else {
            throw $e;
        }
    }
    
    // Step 4: Add index (if not exists)
    echo "4. Adding index... ";
    try {
        $pdo->exec("ALTER TABLE tbl_product ADD INDEX idx_category_id (category_id)");
        echo "✅\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "✅ (already exists)\n";
        } else {
            throw $e;
        }
    }
    
    $pdo->commit();
    
    echo "\n==========================================\n";
    echo "✅ CATEGORY FK FIXED!\n";
    echo "==========================================\n\n";
    
    // Verification
    echo "📊 Verification:\n";
    
    // Check FK
    $stmt = $pdo->query("
        SELECT 
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = '$dbname'
        AND TABLE_NAME = 'tbl_product'
        AND COLUMN_NAME = 'category_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    $fk = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($fk) {
        echo "✅ Foreign Key: {$fk['CONSTRAINT_NAME']}\n";
        echo "   {$fk['COLUMN_NAME']} -> {$fk['REFERENCED_TABLE_NAME']}.{$fk['REFERENCED_COLUMN_NAME']}\n\n";
    }
    
    // Products by category
    $stmt = $pdo->query("
        SELECT 
            c.category_name,
            COUNT(p.product_id) as count
        FROM tbl_category c
        LEFT JOIN tbl_product p ON c.category_id = p.category_id
        GROUP BY c.category_id, c.category_name
        HAVING count > 0
        ORDER BY count DESC
    ");
    
    echo "📈 Products by Category:\n";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   {$row['category_name']}: {$row['count']} products\n";
    }
    
    echo "\n✅ Done! Category FK is now properly implemented!\n";
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>


