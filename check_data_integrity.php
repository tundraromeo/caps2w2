<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== DATA INTEGRITY CHECK ===\n";
    
    // Check orphaned login records
    echo "1. Checking orphaned login records...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_login l LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id WHERE l.emp_id IS NOT NULL AND e.emp_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Orphaned login records: " . $result['count'] . "\n";
    
    if ($result['count'] > 0) {
        echo "   Details of orphaned records:\n";
        $stmt = $pdo->query("SELECT l.login_id, l.emp_id, l.username FROM tbl_login l LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id WHERE l.emp_id IS NOT NULL AND e.emp_id IS NULL");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "     Login ID: " . $row['login_id'] . ", Emp ID: " . $row['emp_id'] . ", Username: " . $row['username'] . "\n";
        }
    }
    
    // Check orphaned role records
    echo "\n2. Checking orphaned role records...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_login l LEFT JOIN tbl_role r ON l.role_id = r.role_id WHERE l.role_id IS NOT NULL AND r.role_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Orphaned role records: " . $result['count'] . "\n";
    
    // Check orphaned shift records
    echo "\n3. Checking orphaned shift records...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_login l LEFT JOIN tbl_shift s ON l.shift_id = s.shift_id WHERE l.shift_id IS NOT NULL AND s.shift_id IS NULL");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Orphaned shift records: " . $result['count'] . "\n";
    
    // Check what employee IDs exist
    echo "\n4. Available employee IDs:\n";
    $stmt = $pdo->query("SELECT emp_id, username FROM tbl_employee ORDER BY emp_id");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   Emp ID: " . $row['emp_id'] . ", Username: " . $row['username'] . "\n";
    }
    
    // Check what role IDs exist
    echo "\n5. Available role IDs:\n";
    $stmt = $pdo->query("SELECT role_id, role FROM tbl_role ORDER BY role_id");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   Role ID: " . $row['role_id'] . ", Role: " . $row['role'] . "\n";
    }
    
    // Check what shift IDs exist
    echo "\n6. Available shift IDs:\n";
    $stmt = $pdo->query("SELECT shift_id, shifts FROM tbl_shift ORDER BY shift_id");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   Shift ID: " . $row['shift_id'] . ", Shift: " . $row['shifts'] . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
