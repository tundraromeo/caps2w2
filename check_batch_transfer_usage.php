<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "===========================================\n";
    echo "CHECK: tbl_batch_transfer_details Usage\n";
    echo "===========================================\n\n";
    
    // 1. Check if table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_batch_transfer_details'");
    if ($stmt->rowCount() == 0) {
        echo "❌ Table doesn't exist!\n";
        exit(0);
    }
    
    echo "✅ Table exists\n\n";
    
    // 2. Check table structure
    echo "TABLE STRUCTURE:\n";
    echo "----------------\n";
    $stmt = $pdo->query("SHOW COLUMNS FROM tbl_batch_transfer_details");
    while ($col = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   • {$col['Field']} ({$col['Type']}) - NULL: {$col['Null']}\n";
    }
    echo "\n";
    
    // 3. Check for data
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_batch_transfer_details");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    echo "DATA CHECK:\n";
    echo "-----------\n";
    echo "   Total records: $count\n";
    
    if ($count > 0) {
        echo "   ⚠️  HAS DATA! May existing records.\n\n";
        
        echo "   Sample data:\n";
        $stmt = $pdo->query("SELECT * FROM tbl_batch_transfer_details LIMIT 5");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "   - ID {$row['batch_transfer_id']}: Product {$row['product_id']}, Batch {$row['batch_id']}, Qty {$row['quantity_used']}, Location {$row['location_id']}\n";
        }
    } else {
        echo "   ✅ EMPTY - No data\n";
    }
    
    echo "\n";
    
    // 4. Check FK constraints
    echo "FOREIGN KEY CONSTRAINTS:\n";
    echo "------------------------\n";
    
    $stmt = $pdo->query("
        SELECT 
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = '$dbname'
        AND TABLE_NAME = 'tbl_batch_transfer_details'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    $fks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($fks) > 0) {
        echo "   ⚠️  This table has FK constraints:\n";
        foreach ($fks as $fk) {
            echo "   • {$fk['COLUMN_NAME']} → {$fk['REFERENCED_TABLE_NAME']}.{$fk['REFERENCED_COLUMN_NAME']}\n";
        }
    } else {
        echo "   ✅ No FK constraints pointing TO other tables\n";
    }
    
    echo "\n";
    
    // 5. Check if other tables reference this table
    echo "TABLES REFERENCING THIS TABLE:\n";
    echo "------------------------------\n";
    
    $stmt = $pdo->query("
        SELECT 
            TABLE_NAME,
            COLUMN_NAME,
            CONSTRAINT_NAME,
            REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = '$dbname'
        AND REFERENCED_TABLE_NAME = 'tbl_batch_transfer_details'
    ");
    
    $refs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($refs) > 0) {
        echo "   ⚠️  OTHER TABLES reference this table:\n";
        foreach ($refs as $ref) {
            echo "   • {$ref['TABLE_NAME']}.{$ref['COLUMN_NAME']} → {$ref['REFERENCED_COLUMN_NAME']}\n";
        }
    } else {
        echo "   ✅ No other tables reference this table\n";
    }
    
    echo "\n";
    
    // 6. Compare with tbl_transfer_batch_details (similar name!)
    $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_transfer_batch_details'");
    if ($stmt->rowCount() > 0) {
        echo "⚠️  DUPLICATE TABLES DETECTED:\n";
        echo "------------------------------\n";
        echo "   • tbl_batch_transfer_details (this one)\n";
        echo "   • tbl_transfer_batch_details (similar!)\n\n";
        
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_transfer_batch_details");
        $transferCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        echo "   tbl_transfer_batch_details has: $transferCount records\n";
        echo "   tbl_batch_transfer_details has: $count records\n\n";
        
        if ($count == 0 && $transferCount > 0) {
            echo "   💡 Looks like tbl_transfer_batch_details is the active one!\n";
            echo "   💡 tbl_batch_transfer_details might be duplicate/unused.\n";
        }
    }
    
    echo "\n";
    echo "===========================================\n";
    echo "RECOMMENDATION:\n";
    echo "===========================================\n\n";
    
    if ($count == 0 && count($refs) == 0) {
        echo "✅ SAFE TO DELETE because:\n";
        echo "   • No data in the table\n";
        echo "   • No other tables reference it\n\n";
        
        echo "To delete:\n";
        echo "   DROP TABLE tbl_batch_transfer_details;\n";
    } else {
        echo "⚠️  BE CAREFUL! This table:\n";
        if ($count > 0) {
            echo "   • Has $count records\n";
        }
        if (count($refs) > 0) {
            echo "   • Is referenced by other tables\n";
        }
        echo "\n   Review first before deleting!\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>


