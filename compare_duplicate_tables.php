<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "===========================================\n";
    echo "DUPLICATE TABLES COMPARISON\n";
    echo "===========================================\n\n";
    
    $tables = [
        'tbl_batch_transfer_details',
        'tbl_transfer_batch_details'
    ];
    
    foreach ($tables as $table) {
        // Check if exists
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() == 0) {
            echo "❌ $table - DOESN'T EXIST\n\n";
            continue;
        }
        
        echo "✅ TABLE: $table\n";
        echo str_repeat("-", 50) . "\n";
        
        // Get structure
        echo "COLUMNS:\n";
        $stmt = $pdo->query("SHOW COLUMNS FROM $table");
        $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($cols as $col) {
            echo "   • $col\n";
        }
        
        // Get data count
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM $table");
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        echo "\nDATA: $count records\n";
        
        if ($count > 0) {
            echo "Sample:\n";
            $stmt = $pdo->query("SELECT * FROM $table LIMIT 3");
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                echo "   ID: {$row['id']} | Product: {$row['product_id']} | Batch: {$row['batch_id']} | Qty: {$row['quantity']}\n";
            }
        }
        
        // Get FK constraints
        $stmt = $pdo->query("
            SELECT 
                CONSTRAINT_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = '$dbname'
            AND TABLE_NAME = '$table'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ");
        
        $fks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "\nFOREIGN KEYS: " . count($fks) . "\n";
        foreach ($fks as $fk) {
            echo "   • {$fk['COLUMN_NAME']} → {$fk['REFERENCED_TABLE_NAME']}\n";
        }
        
        echo "\n" . str_repeat("=", 50) . "\n\n";
    }
    
    // Recommendation
    echo "RECOMMENDATION:\n";
    echo "===============\n\n";
    
    $stmt1 = $pdo->query("SELECT COUNT(*) as count FROM tbl_batch_transfer_details");
    $count1 = $stmt1->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt2 = $pdo->query("SELECT COUNT(*) as count FROM tbl_transfer_batch_details");
    $count2 = $stmt2->fetch(PDO::FETCH_ASSOC)['count'];
    
    echo "tbl_batch_transfer_details: $count1 records\n";
    echo "tbl_transfer_batch_details: $count2 records\n\n";
    
    if ($count1 == 0 && $count2 > 0) {
        echo "💡 DELETE: tbl_batch_transfer_details (EMPTY, duplicate)\n";
        echo "💡 KEEP: tbl_transfer_batch_details (HAS DATA)\n\n";
        echo "Command:\n";
        echo "   DROP TABLE tbl_batch_transfer_details;\n";
    } elseif ($count2 == 0 && $count1 > 0) {
        echo "💡 DELETE: tbl_transfer_batch_details (EMPTY, duplicate)\n";
        echo "💡 KEEP: tbl_batch_transfer_details (HAS DATA)\n\n";
        echo "Command:\n";
        echo "   DROP TABLE tbl_transfer_batch_details;\n";
    } else {
        echo "⚠️  Both tables have data! Need to merge or check which is correct.\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>

