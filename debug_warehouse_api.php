<?php
/**
 * Debug: Why get_products_oldest_batch is failing
 */

$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "===========================================\n";
    echo "DEBUG: Warehouse API Failure\n";
    echo "===========================================\n\n";
    
    // Test the query that get_products_oldest_batch likely uses
    echo "1. Testing products with FIFO batch query...\n";
    echo "-------------------------------------------\n";
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                p.product_id,
                p.product_name,
                p.category_id,
                p.barcode,
                p.quantity,
                p.srp,
                p.location_id,
                p.batch_id,
                fs.fifo_id,
                fs.batch_reference,
                fs.available_quantity as oldest_batch_quantity,
                fs.srp as oldest_batch_srp,
                fs.expiration_date as oldest_batch_expiration
            FROM tbl_product p
            LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
            WHERE p.location_id = 2
            AND p.status = 'active'
            ORDER BY p.product_id, fs.entry_date ASC
            LIMIT 5
        ");
        
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "✅ Query executed successfully!\n";
        echo "   Found: " . count($products) . " products\n\n";
        
        if (count($products) > 0) {
            echo "Sample data:\n";
            foreach ($products as $p) {
                $catId = $p['category_id'] ?? 'NULL';
                echo "   [{$p['product_id']}] {$p['product_name']}\n";
                echo "      category_id: $catId " . ($p['category_id'] === null ? "❌ NULL!" : "✅") . "\n";
                echo "      batch_reference: " . ($p['batch_reference'] ?? 'NULL') . "\n";
                echo "      oldest_batch_qty: " . ($p['oldest_batch_quantity'] ?? 'NULL') . "\n";
            }
        }
        
    } catch (PDOException $e) {
        echo "❌ QUERY FAILED!\n";
        echo "   Error: " . $e->getMessage() . "\n";
    }
    
    echo "\n";
    
    // 2. Check for NULL category_id (likely culprit)
    echo "2. Checking for NULL category_id...\n";
    echo "-----------------------------------\n";
    
    $stmt = $pdo->query("
        SELECT COUNT(*) as count 
        FROM tbl_product 
        WHERE category_id IS NULL
    ");
    $nullCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($nullCount > 0) {
        echo "❌ FOUND PROBLEM: $nullCount products have NULL category_id\n";
        echo "   This might cause API to fail!\n\n";
        
        $stmt = $pdo->query("
            SELECT product_id, product_name, category_id 
            FROM tbl_product 
            WHERE category_id IS NULL
            LIMIT 5
        ");
        
        echo "   Products with NULL category_id:\n";
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "   • [{$row['product_id']}] {$row['product_name']}\n";
        }
        
    } else {
        echo "✅ All products have valid category_id\n";
    }
    
    echo "\n";
    
    // 3. Check category FK
    echo "3. Checking category FK constraint...\n";
    echo "-------------------------------------\n";
    
    $stmt = $pdo->query("
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = '$dbname'
        AND TABLE_NAME = 'tbl_product'
        AND COLUMN_NAME = 'category_id'
        AND REFERENCED_TABLE_NAME = 'tbl_category'
    ");
    
    $fk = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($fk) {
        echo "✅ Category FK exists: {$fk['CONSTRAINT_NAME']}\n";
    } else {
        echo "❌ MISSING: category FK constraint\n";
    }
    
    echo "\n";
    
    // 4. Check FIFO stock data
    echo "4. Checking FIFO stock availability...\n";
    echo "--------------------------------------\n";
    
    $stmt = $pdo->query("
        SELECT 
            COUNT(DISTINCT p.product_id) as products_with_fifo,
            COUNT(*) as total_fifo_records
        FROM tbl_product p
        INNER JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
        WHERE p.location_id = 2
    ");
    
    $fifo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "   Products with FIFO records: {$fifo['products_with_fifo']}\n";
    echo "   Total FIFO batch records: {$fifo['total_fifo_records']}\n";
    
    if ($fifo['products_with_fifo'] == 0) {
        echo "   ⚠️  No FIFO data for warehouse products!\n";
    }
    
    echo "\n";
    echo "===========================================\n";
    echo "DIAGNOSIS:\n";
    echo "===========================================\n\n";
    
    if ($nullCount > 0) {
        echo "🔴 PRIMARY ISSUE: NULL category_id values\n\n";
        echo "FIX: Run this command:\n";
        echo "   php fix_new_sql.php\n\n";
        echo "This will:\n";
        echo "   ✅ Assign category_id to all products\n";
        echo "   ✅ Add category FK constraint\n";
        echo "   ✅ Fix the Warehouse API error\n";
    } else {
        echo "✅ category_id looks good\n";
        echo "   The API issue might be something else.\n";
        echo "   Check API logs for more details.\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
}
?>

