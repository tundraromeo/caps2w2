<?php
/**
 * Category and Discount Foreign Key Migration Script
 * 
 * This script fixes the database normalization issue where tbl_product.category
 * is VARCHAR instead of a proper foreign key to tbl_category.
 * 
 * BEFORE RUNNING:
 * 1. Backup your database!
 * 2. Review the SQL migration file
 * 3. Test on development environment first
 */

$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "========================================\n";
    echo "CATEGORY & DISCOUNT FK MIGRATION SCRIPT\n";
    echo "========================================\n\n";
    
    // Pre-flight checks
    echo "🔍 PRE-FLIGHT CHECKS\n";
    echo "-------------------\n";
    
    // Check 1: Current product table structure
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_product LIKE 'category'");
    $categoryCol = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($categoryCol) {
        echo "✓ Current category column type: " . $categoryCol['Type'] . "\n";
        
        if (strpos($categoryCol['Type'], 'varchar') !== false) {
            echo "  ⚠️  Category is VARCHAR - needs migration\n";
        } else {
            echo "  ✓ Category already uses proper data type\n";
        }
    } else {
        echo "❌ Category column not found!\n";
    }
    
    // Check 2: Count products
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_product");
    $productCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "✓ Total products to migrate: $productCount\n";
    
    // Check 3: Count categories
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_category");
    $categoryCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "✓ Total categories in system: $categoryCount\n";
    
    // Check 4: Find products with category names not in tbl_category
    $stmt = $pdo->query("
        SELECT DISTINCT p.category 
        FROM tbl_product p
        LEFT JOIN tbl_category c ON p.category = c.category_name
        WHERE c.category_id IS NULL
    ");
    $unmappedCategories = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($unmappedCategories) > 0) {
        echo "⚠️  Found " . count($unmappedCategories) . " unmapped category names:\n";
        foreach ($unmappedCategories as $cat) {
            echo "   - $cat\n";
        }
    } else {
        echo "✓ All product categories match tbl_category\n";
    }
    
    // Check 5: Check if discount table has data
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_discount");
    $discountCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "✓ Total discounts in system: $discountCount\n";
    
    echo "\n";
    
    // Ask for confirmation
    echo "⚠️  WARNING: This will modify the tbl_product table structure!\n";
    echo "   - Add category_id column (INT)\n";
    echo "   - Add discount_id column (INT, nullable)\n";
    echo "   - Remove category column (VARCHAR)\n";
    echo "   - Add foreign key constraints\n\n";
    
    echo "Do you want to continue? (yes/no): ";
    $handle = fopen("php://stdin", "r");
    $line = trim(fgets($handle));
    fclose($handle);
    
    if (strtolower($line) !== 'yes') {
        echo "\n❌ Migration cancelled by user.\n";
        exit(0);
    }
    
    echo "\n🚀 STARTING MIGRATION\n";
    echo "--------------------\n\n";
    
    // Begin transaction
    $pdo->beginTransaction();
    
    // Step 1: Create backup
    echo "Step 1: Creating backup...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS tbl_product_category_backup AS
        SELECT 
            product_id,
            category as category_name,
            NOW() as backup_date
        FROM tbl_product
    ");
    echo "✓ Backup created: tbl_product_category_backup\n\n";
    
    // Step 2: Add category_id column
    echo "Step 2: Adding category_id column...\n";
    
    // Check if column already exists
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_product LIKE 'category_id'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE tbl_product ADD COLUMN category_id INT NULL AFTER category");
        echo "✓ category_id column added\n\n";
    } else {
        echo "✓ category_id column already exists\n\n";
    }
    
    // Step 3: Map categories
    echo "Step 3: Mapping category names to category_id...\n";
    $stmt = $pdo->exec("
        UPDATE tbl_product p
        INNER JOIN tbl_category c ON p.category = c.category_name
        SET p.category_id = c.category_id
    ");
    echo "✓ Mapped $stmt products\n";
    
    // Check for unmapped
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_product WHERE category_id IS NULL");
    $unmappedCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($unmappedCount > 0) {
        echo "⚠️  Found $unmappedCount unmapped products\n";
        
        // Create Uncategorized category
        $pdo->exec("
            INSERT INTO tbl_category (category_name)
            SELECT 'Uncategorized'
            WHERE NOT EXISTS (SELECT 1 FROM tbl_category WHERE category_name = 'Uncategorized')
        ");
        
        // Map unmapped to Uncategorized
        $pdo->exec("
            UPDATE tbl_product 
            SET category_id = (SELECT category_id FROM tbl_category WHERE category_name = 'Uncategorized')
            WHERE category_id IS NULL
        ");
        
        echo "✓ Unmapped products assigned to 'Uncategorized'\n";
    }
    echo "\n";
    
    // Step 4: Make category_id NOT NULL
    echo "Step 4: Setting category_id to NOT NULL...\n";
    $pdo->exec("ALTER TABLE tbl_product MODIFY COLUMN category_id INT NOT NULL");
    echo "✓ category_id is now required\n\n";
    
    // Step 5: Drop old category column
    echo "Step 5: Removing old category VARCHAR column...\n";
    $pdo->exec("ALTER TABLE tbl_product DROP COLUMN category");
    echo "✓ Old category column removed\n\n";
    
    // Step 6: Add FK constraint for category
    echo "Step 6: Adding foreign key constraint for category...\n";
    try {
        $pdo->exec("
            ALTER TABLE tbl_product
            ADD CONSTRAINT fk_product_category 
            FOREIGN KEY (category_id) 
            REFERENCES tbl_category(category_id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE
        ");
        echo "✓ Foreign key constraint added: fk_product_category\n\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "✓ Foreign key constraint already exists\n\n";
        } else {
            throw $e;
        }
    }
    
    // Step 7: Add discount_id column and FK
    echo "Step 7: Adding discount_id column and FK constraint...\n";
    
    // Check if column already exists
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_product LIKE 'discount_id'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE tbl_product ADD COLUMN discount_id INT NULL AFTER srp");
        echo "✓ discount_id column added\n";
    } else {
        echo "✓ discount_id column already exists\n";
    }
    
    // Add FK constraint
    try {
        $pdo->exec("
            ALTER TABLE tbl_product
            ADD CONSTRAINT fk_product_discount 
            FOREIGN KEY (discount_id) 
            REFERENCES tbl_discount(discount_id)
            ON DELETE SET NULL
            ON UPDATE CASCADE
        ");
        echo "✓ Foreign key constraint added: fk_product_discount\n\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "✓ Foreign key constraint already exists\n\n";
        } else {
            throw $e;
        }
    }
    
    // Step 8: Add indexes
    echo "Step 8: Adding indexes for performance...\n";
    try {
        $pdo->exec("ALTER TABLE tbl_product ADD INDEX idx_category_id (category_id)");
        echo "✓ Index created: idx_category_id\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "✓ Index already exists: idx_category_id\n";
        } else {
            throw $e;
        }
    }
    
    try {
        $pdo->exec("ALTER TABLE tbl_product ADD INDEX idx_discount_id (discount_id)");
        echo "✓ Index created: idx_discount_id\n\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "✓ Index already exists: idx_discount_id\n\n";
        } else {
            throw $e;
        }
    }
    
    // Commit transaction
    $pdo->commit();
    
    echo "========================================\n";
    echo "✅ MIGRATION COMPLETED SUCCESSFULLY!\n";
    echo "========================================\n\n";
    
    // Verification
    echo "📊 VERIFICATION\n";
    echo "---------------\n";
    
    // Check foreign keys
    $stmt = $pdo->query("
        SELECT 
            TABLE_NAME,
            COLUMN_NAME,
            CONSTRAINT_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM 
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE 
            TABLE_SCHEMA = '$dbname' 
            AND TABLE_NAME = 'tbl_product'
            AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    $fks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "\n✓ Foreign Keys in tbl_product: " . count($fks) . "\n";
    foreach ($fks as $fk) {
        echo "  - {$fk['COLUMN_NAME']} -> {$fk['REFERENCED_TABLE_NAME']}.{$fk['REFERENCED_COLUMN_NAME']}\n";
    }
    
    // Product distribution by category
    $stmt = $pdo->query("
        SELECT 
            c.category_name,
            COUNT(p.product_id) as product_count
        FROM tbl_category c
        LEFT JOIN tbl_product p ON c.category_id = p.category_id
        GROUP BY c.category_id, c.category_name
        ORDER BY product_count DESC
    ");
    
    echo "\n📈 Products by Category:\n";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - {$row['category_name']}: {$row['product_count']} products\n";
    }
    
    echo "\n✅ Database normalization improved!\n";
    echo "✅ Referential integrity enforced!\n";
    echo "✅ Category relationships properly defined!\n";
    
    echo "\n💡 NEXT STEPS:\n";
    echo "  1. Update API code to use category_id instead of category name\n";
    echo "  2. Update frontend forms to use category dropdown\n";
    echo "  3. Test all category-related functionality\n";
    echo "  4. Remove backup table after verification: DROP TABLE tbl_product_category_backup;\n";
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "\n❌ MIGRATION FAILED!\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "Transaction rolled back. No changes made.\n";
    exit(1);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>


