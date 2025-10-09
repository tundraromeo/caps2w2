<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "===========================================\n";
    echo "DATABASE CURRENT STATE CHECK\n";
    echo "===========================================\n\n";
    
    // 1. Check tbl_product structure
    echo "1. TBL_PRODUCT STRUCTURE:\n";
    echo "-------------------------\n";
    
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_product");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $hasCategory = false;
    $hasCategoryId = false;
    $hasDiscountId = false;
    
    foreach ($columns as $col) {
        if ($col['Field'] == 'category') {
            $hasCategory = true;
            echo "   ❌ category (VARCHAR) - STILL EXISTS (should be deleted)\n";
        }
        if ($col['Field'] == 'category_id') {
            $hasCategoryId = true;
            echo "   ✅ category_id ({$col['Type']}) - NULL: {$col['Null']}\n";
        }
        if ($col['Field'] == 'discount_id') {
            $hasDiscountId = true;
            echo "   ⚠️  discount_id ({$col['Type']}) - WRONG LOCATION!\n";
        }
    }
    
    if (!$hasCategory && !$hasCategoryId) {
        echo "   ❌ No category or category_id found!\n";
    }
    
    echo "\n";
    
    // 2. Check tbl_product FK constraints
    echo "2. TBL_PRODUCT FOREIGN KEYS:\n";
    echo "----------------------------\n";
    
    $stmt = $pdo->query("
        SELECT 
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = '$dbname'
        AND TABLE_NAME = 'tbl_product'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    $fks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $hasCategoryFK = false;
    
    foreach ($fks as $fk) {
        echo "   ✅ {$fk['COLUMN_NAME']} → {$fk['REFERENCED_TABLE_NAME']}\n";
        if ($fk['COLUMN_NAME'] == 'category_id') {
            $hasCategoryFK = true;
        }
    }
    
    if (!$hasCategoryFK && $hasCategoryId) {
        echo "   ❌ MISSING: category_id FK to tbl_category\n";
    }
    
    echo "\n";
    
    // 3. Check product data
    echo "3. PRODUCT DATA:\n";
    echo "----------------\n";
    
    $stmt = $pdo->query("
        SELECT 
            product_id,
            product_name,
            category_id
        FROM tbl_product
        LIMIT 5
    ");
    
    $nullCount = 0;
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $catDisplay = $row['category_id'] ?? 'NULL';
        if ($row['category_id'] === null) {
            $nullCount++;
            echo "   ❌ [{$row['product_id']}] {$row['product_name']} → category_id: NULL\n";
        } else {
            echo "   ✅ [{$row['product_id']}] {$row['product_name']} → category_id: {$catDisplay}\n";
        }
    }
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_product WHERE category_id IS NULL");
    $totalNull = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($totalNull > 0) {
        echo "\n   ⚠️  Total products with NULL category_id: $totalNull\n";
    }
    
    echo "\n";
    
    // 4. Check tbl_pos_sales_header
    echo "4. TBL_POS_SALES_HEADER STRUCTURE:\n";
    echo "----------------------------------\n";
    
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_pos_sales_header");
    $posColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $hasDiscountIdInPOS = false;
    $hasDiscountAmount = false;
    $hasFinalAmount = false;
    
    foreach ($posColumns as $col) {
        if ($col['Field'] == 'discount_id') {
            $hasDiscountIdInPOS = true;
            echo "   ✅ discount_id ({$col['Type']}) - NULL: {$col['Null']}\n";
        }
        if ($col['Field'] == 'discount_amount') {
            $hasDiscountAmount = true;
            echo "   ✅ discount_amount ({$col['Type']})\n";
        }
        if ($col['Field'] == 'final_amount') {
            $hasFinalAmount = true;
            echo "   ✅ final_amount ({$col['Type']})\n";
        }
    }
    
    if (!$hasDiscountIdInPOS) {
        echo "   ❌ MISSING: discount_id column\n";
    }
    if (!$hasDiscountAmount) {
        echo "   ❌ MISSING: discount_amount column\n";
    }
    if (!$hasFinalAmount) {
        echo "   ❌ MISSING: final_amount column\n";
    }
    
    echo "\n";
    
    // 5. Check POS FK constraints
    echo "5. TBL_POS_SALES_HEADER FOREIGN KEYS:\n";
    echo "-------------------------------------\n";
    
    $stmt = $pdo->query("
        SELECT 
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = '$dbname'
        AND TABLE_NAME = 'tbl_pos_sales_header'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    $posFKs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $hasDiscountFK = false;
    
    foreach ($posFKs as $fk) {
        echo "   ✅ {$fk['COLUMN_NAME']} → {$fk['REFERENCED_TABLE_NAME']}\n";
        if ($fk['COLUMN_NAME'] == 'discount_id') {
            $hasDiscountFK = true;
        }
    }
    
    if ($hasDiscountIdInPOS && !$hasDiscountFK) {
        echo "   ❌ MISSING: discount_id FK to tbl_discount\n";
    }
    
    echo "\n";
    
    // 6. Check tbl_discount data
    echo "6. TBL_DISCOUNT DATA:\n";
    echo "--------------------\n";
    
    $stmt = $pdo->query("SELECT * FROM tbl_discount");
    $discounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($discounts) == 0) {
        echo "   ❌ EMPTY - No discount types configured\n";
    } else {
        foreach ($discounts as $d) {
            echo "   ✅ [{$d['discount_id']}] {$d['discount_type']} - " . ($d['discount_rate'] * 100) . "%\n";
        }
    }
    
    echo "\n";
    echo "===========================================\n";
    echo "SUMMARY:\n";
    echo "===========================================\n\n";
    
    // Summary
    $issues = [];
    $fixed = [];
    
    if ($hasCategory) {
        $issues[] = "❌ Old 'category' VARCHAR column still exists";
    } else {
        $fixed[] = "✅ Old 'category' column removed";
    }
    
    if ($hasCategoryId) {
        $fixed[] = "✅ category_id column exists";
        if (!$hasCategoryFK) {
            $issues[] = "❌ category_id FK to tbl_category MISSING";
        } else {
            $fixed[] = "✅ category_id FK to tbl_category EXISTS";
        }
        if ($totalNull > 0) {
            $issues[] = "❌ $totalNull products have NULL category_id";
        } else {
            $fixed[] = "✅ All products have valid category_id";
        }
    } else {
        $issues[] = "❌ category_id column doesn't exist";
    }
    
    if ($hasDiscountIdInPOS) {
        $fixed[] = "✅ discount_id in tbl_pos_sales_header";
        if (!$hasDiscountFK) {
            $issues[] = "❌ discount_id FK to tbl_discount MISSING";
        } else {
            $fixed[] = "✅ discount_id FK to tbl_discount EXISTS";
        }
    } else {
        $issues[] = "❌ discount_id not in tbl_pos_sales_header";
    }
    
    if ($hasDiscountId) {
        $issues[] = "❌ discount_id in tbl_product (WRONG LOCATION!)";
    } else {
        $fixed[] = "✅ No discount_id in tbl_product (correct)";
    }
    
    echo "WHAT'S WORKING:\n";
    foreach ($fixed as $item) {
        echo "  $item\n";
    }
    
    if (count($issues) > 0) {
        echo "\nWHAT NEEDS TO BE FIXED:\n";
        foreach ($issues as $item) {
            echo "  $item\n";
        }
    } else {
        echo "\n🎉 EVERYTHING IS PERFECT!\n";
    }
    
    echo "\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>


