<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== FIXING PURCHASE ORDER CREATED_BY ISSUE ===\n";
    
    // Check what created_by values exist
    echo "1. Checking orphaned created_by values...\n";
    $stmt = $pdo->query("SELECT DISTINCT created_by FROM tbl_purchase_order_header WHERE created_by IS NOT NULL ORDER BY created_by");
    $created_by_values = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "   Found created_by values: " . implode(', ', $created_by_values) . "\n";
    
    // Check which ones don't exist in tbl_employee
    foreach ($created_by_values as $emp_id) {
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM tbl_employee WHERE emp_id = ?");
        $stmt->execute([$emp_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] == 0) {
            echo "   ❌ emp_id $emp_id doesn't exist in tbl_employee\n";
            
            // Fix by setting to NULL or mapping to existing employee
            $stmt = $pdo->prepare("UPDATE tbl_purchase_order_header SET created_by = NULL WHERE created_by = ?");
            $stmt->execute([$emp_id]);
            echo "   ✅ Set created_by $emp_id to NULL for " . $stmt->rowCount() . " records\n";
        } else {
            echo "   ✅ emp_id $emp_id exists in tbl_employee\n";
        }
    }
    
    // Verify fix
    echo "\n2. Verifying fix...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_purchase_order_header poh LEFT JOIN tbl_employee e ON poh.created_by = e.emp_id WHERE poh.created_by IS NOT NULL AND e.emp_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Remaining orphaned created_by records: " . $result['count'] . "\n";
    
    echo "\n=== PURCHASE ORDER CLEANUP COMPLETE ===\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
