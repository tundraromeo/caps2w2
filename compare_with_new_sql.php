<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== COMPARING WITH NEW SQL FILE ===\n";
    
    // Get current constraints in database
    $stmt = $pdo->query("
        SELECT 
            TABLE_NAME,
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM 
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE 
            REFERENCED_TABLE_SCHEMA = 'enguio2' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY 
            TABLE_NAME, CONSTRAINT_NAME
    ");
    
    $current_constraints = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Current constraints in database: " . count($current_constraints) . "\n";
    echo "Constraints in new SQL file: 50\n\n";
    
    // Check if tbl_stock_movements still has constraints
    $stock_movements_constraints = array_filter($current_constraints, function($c) {
        return $c['TABLE_NAME'] === 'tbl_stock_movements';
    });
    
    echo "tbl_stock_movements constraints: " . count($stock_movements_constraints) . "\n";
    
    if (count($stock_movements_constraints) > 0) {
        echo "✅ tbl_stock_movements has constraints:\n";
        foreach ($stock_movements_constraints as $constraint) {
            echo "   • {$constraint['CONSTRAINT_NAME']}: {$constraint['COLUMN_NAME']} → {$constraint['REFERENCED_TABLE_NAME']}.{$constraint['REFERENCED_COLUMN_NAME']}\n";
        }
    } else {
        echo "❌ tbl_stock_movements still missing constraints\n";
    }
    
    // Check if tbl_archive has constraints
    $archive_constraints = array_filter($current_constraints, function($c) {
        return $c['TABLE_NAME'] === 'tbl_archive';
    });
    
    echo "\ntbl_archive constraints: " . count($archive_constraints) . "\n";
    
    if (count($archive_constraints) > 0) {
        echo "✅ tbl_archive has constraints:\n";
        foreach ($archive_constraints as $constraint) {
            echo "   • {$constraint['CONSTRAINT_NAME']}: {$constraint['COLUMN_NAME']} → {$constraint['REFERENCED_TABLE_NAME']}.{$constraint['REFERENCED_COLUMN_NAME']}\n";
        }
    } else {
        echo "❌ tbl_archive still missing constraints\n";
    }
    
    // Check for any other missing tables
    echo "\n=== CHECKING FOR OTHER MISSING TABLES ===\n";
    
    $stmt = $pdo->query("SHOW TABLES");
    $all_tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $tables_with_constraints = array_unique(array_column($current_constraints, 'TABLE_NAME'));
    
    $tables_without_constraints = [];
    foreach ($all_tables as $table) {
        if (!in_array($table, $tables_with_constraints)) {
            // Check if this table has FK-like columns
            $stmt = $pdo->query("DESCRIBE `$table`");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $fk_columns = [];
            foreach ($columns as $column) {
                $column_name = $column['Field'];
                if (preg_match('/_id$/', $column_name) && $column['Key'] !== 'PRI') {
                    $fk_columns[] = $column_name;
                }
            }
            
            if (!empty($fk_columns)) {
                $tables_without_constraints[$table] = $fk_columns;
            }
        }
    }
    
    if (empty($tables_without_constraints)) {
        echo "✅ All tables with FK columns have constraints!\n";
    } else {
        echo "❌ Tables still missing constraints:\n";
        foreach ($tables_without_constraints as $table => $fk_columns) {
            echo "   📋 $table: " . implode(', ', $fk_columns) . "\n";
        }
    }
    
    echo "\n=== SUMMARY ===\n";
    echo "Current database constraints: " . count($current_constraints) . "\n";
    echo "New SQL file constraints: 50\n";
    
    if (count($current_constraints) >= 50) {
        echo "✅ Database is up to date with new SQL file!\n";
    } else {
        echo "⚠️  Database may need updates from new SQL file.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
