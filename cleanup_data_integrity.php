<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== DATA CLEANUP FOR FOREIGN KEY CONSTRAINTS ===\n";
    
    // 1. Fix orphaned login records (emp_id = 3 doesn't exist)
    echo "1. Fixing orphaned login records...\n";
    $stmt = $pdo->prepare("UPDATE tbl_login SET emp_id = ? WHERE emp_id = 3");
    $stmt->execute([2]); // Map to existing emp_id = 2 (clyde)
    echo "   Updated " . $stmt->rowCount() . " login records (emp_id 3 -> 2)\n";
    
    // 2. Fix orphaned role records
    echo "\n2. Fixing orphaned role records...\n";
    $stmt = $pdo->query("SELECT DISTINCT l.role_id FROM tbl_login l LEFT JOIN tbl_role r ON l.role_id = r.role_id WHERE l.role_id IS NOT NULL AND r.role_id IS NULL");
    $orphaned_roles = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($orphaned_roles as $role_id) {
        echo "   Found orphaned role_id: $role_id\n";
        // Set to NULL or map to existing role
        $stmt = $pdo->prepare("UPDATE tbl_login SET role_id = NULL WHERE role_id = ?");
        $stmt->execute([$role_id]);
        echo "   Set role_id $role_id to NULL for " . $stmt->rowCount() . " records\n";
    }
    
    // 3. Verify fixes
    echo "\n3. Verifying fixes...\n";
    
    // Check orphaned login records
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_login l LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id WHERE l.emp_id IS NOT NULL AND e.emp_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Remaining orphaned login records: " . $result['count'] . "\n";
    
    // Check orphaned role records
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_login l LEFT JOIN tbl_role r ON l.role_id = r.role_id WHERE l.role_id IS NOT NULL AND r.role_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Remaining orphaned role records: " . $result['count'] . "\n";
    
    echo "\n=== CLEANUP COMPLETE ===\n";
    echo "You can now add foreign key constraints!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
