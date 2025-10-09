<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== CHECKING FOR STANDALONE TABLES WITH FK COLUMNS ===\n";
    
    // Get all tables in the database
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Get tables that already have foreign key constraints
    $stmt = $pdo->query("
        SELECT DISTINCT TABLE_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'enguio2' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $tables_with_fk = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "Tables with FK constraints: " . count($tables_with_fk) . "\n";
    echo "Total tables: " . count($tables) . "\n\n";
    
    $standalone_tables = [];
    
    foreach ($tables as $table) {
        if (!in_array($table, $tables_with_fk)) {
            // Check if this table has columns that look like foreign keys
            $stmt = $pdo->query("DESCRIBE `$table`");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $fk_columns = [];
            foreach ($columns as $column) {
                $column_name = $column['Field'];
                // Check if column name ends with _id and is not a primary key
                if (preg_match('/_id$/', $column_name) && $column['Key'] !== 'PRI') {
                    $fk_columns[] = $column_name;
                }
            }
            
            if (!empty($fk_columns)) {
                $standalone_tables[$table] = $fk_columns;
            }
        }
    }
    
    echo "=== STANDALONE TABLES WITH FK COLUMNS ===\n";
    
    if (empty($standalone_tables)) {
        echo "✅ No standalone tables with FK columns found!\n";
        echo "All tables with FK columns already have constraints.\n";
    } else {
        foreach ($standalone_tables as $table => $fk_columns) {
            echo "\n📋 $table:\n";
            foreach ($fk_columns as $fk_column) {
                echo "   • $fk_column (potential FK)\n";
            }
        }
        
        echo "\n=== ANALYZING POTENTIAL RELATIONSHIPS ===\n";
        
        foreach ($standalone_tables as $table => $fk_columns) {
            echo "\n🔍 Analyzing $table:\n";
            
            foreach ($fk_columns as $fk_column) {
                // Try to find the referenced table
                $possible_ref_table = str_replace('_id', '', $fk_column);
                $possible_ref_table = 'tbl_' . $possible_ref_table;
                
                // Check if this table exists
                $stmt = $pdo->query("SHOW TABLES LIKE '$possible_ref_table'");
                if ($stmt->rowCount() > 0) {
                    // Check if the referenced column exists
                    $stmt = $pdo->query("DESCRIBE `$possible_ref_table`");
                    $ref_columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
                    
                    if (in_array($fk_column, $ref_columns)) {
                        echo "   ✅ $fk_column → $possible_ref_table.$fk_column (CONFIRMED)\n";
                    } else {
                        echo "   ❓ $fk_column → $possible_ref_table (table exists, column unknown)\n";
                    }
                } else {
                    // Try alternative naming patterns
                    $alt_patterns = [
                        'tbl_' . $possible_ref_table,
                        $possible_ref_table,
                        'tbl_' . str_replace('tbl_', '', $possible_ref_table)
                    ];
                    
                    $found = false;
                    foreach ($alt_patterns as $pattern) {
                        $stmt = $pdo->query("SHOW TABLES LIKE '$pattern'");
                        if ($stmt->rowCount() > 0) {
                            $stmt = $pdo->query("DESCRIBE `$pattern`");
                            $ref_columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
                            
                            if (in_array($fk_column, $ref_columns)) {
                                echo "   ✅ $fk_column → $pattern.$fk_column (CONFIRMED)\n";
                                $found = true;
                                break;
                            }
                        }
                    }
                    
                    if (!$found) {
                        echo "   ❓ $fk_column → (no clear reference table found)\n";
                    }
                }
            }
        }
    }
    
    echo "\n=== SUMMARY ===\n";
    echo "Standalone tables with FK columns: " . count($standalone_tables) . "\n";
    
    if (count($standalone_tables) > 0) {
        echo "\n⚠️  These tables may need foreign key constraints!\n";
        echo "Consider adding constraints for better data integrity.\n";
    } else {
        echo "\n✅ All tables are properly constrained!\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
