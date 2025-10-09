<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== EXISTING FOREIGN KEY CONSTRAINTS ===\n";
    
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
    
    $constraints = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($constraints)) {
        echo "No foreign key constraints found.\n";
    } else {
        foreach ($constraints as $constraint) {
            echo "✅ {$constraint['TABLE_NAME']}.{$constraint['COLUMN_NAME']} → {$constraint['REFERENCED_TABLE_NAME']}.{$constraint['REFERENCED_COLUMN_NAME']} ({$constraint['CONSTRAINT_NAME']})\n";
        }
    }
    
    echo "\n=== CHECKING FOR DUPLICATE CONSTRAINT NAMES ===\n";
    
    $stmt = $pdo->query("
        SELECT CONSTRAINT_NAME, COUNT(*) as count
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'enguio2' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
        GROUP BY CONSTRAINT_NAME
        HAVING COUNT(*) > 1
    ");
    
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($duplicates)) {
        echo "No duplicate constraint names found.\n";
    } else {
        foreach ($duplicates as $dup) {
            echo "❌ Duplicate constraint name: {$dup['CONSTRAINT_NAME']} ({$dup['count']} occurrences)\n";
        }
    }
    
    echo "\n=== CHECKING SPECIFIC CONSTRAINT NAMES ===\n";
    
    // Check if our constraint names already exist
    $constraint_names = [
        'fk_batch_supplier',
        'fk_batch_location',
        'fk_employee_role',
        'fk_employee_shift',
        'fk_login_employee',
        'fk_login_role',
        'fk_login_shift'
    ];
    
    foreach ($constraint_names as $name) {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE REFERENCED_TABLE_SCHEMA = 'enguio2' 
            AND CONSTRAINT_NAME = ?
        ");
        $stmt->execute([$name]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            echo "❌ Constraint '$name' already exists\n";
        } else {
            echo "✅ Constraint '$name' is available\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
