<?php
/**
 * INVENTORY MANAGER LOGOUT TEST
 * Specific test for inventory manager logout issue
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🔧 INVENTORY MANAGER LOGOUT TEST</h1>";
echo "<p>Testing why inventory manager logout doesn't work</p>";

// Step 1: Find inventory manager
echo "<h2>1. Finding Inventory Manager</h2>";
$stmt = $conn->prepare("
    SELECT 
        e.emp_id, e.Fname, e.Lname, e.username, e.status as emp_status,
        r.role, r.role_id, e.location_id, e.shift_id
    FROM tbl_employee e
    LEFT JOIN tbl_role r ON e.role_id = r.role_id
    WHERE LOWER(r.role) LIKE '%inventory%' OR LOWER(r.role) LIKE '%manager%'
    ORDER BY e.emp_id
");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Emp ID</th><th>Name</th><th>Username</th><th>Role</th><th>Role ID</th><th>Status</th></tr>";

$inventoryManagers = [];
while ($row = $result->fetch_assoc()) {
    $inventoryManagers[] = $row;
    echo "<tr>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['Fname'] . " " . $row['Lname'] . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . ($row['role'] ?: 'Unknown') . "</td>";
    echo "<td>" . ($row['role_id'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['emp_status'] ?: 'NULL') . "</td>";
    echo "</tr>";
}
echo "</table>";

if (empty($inventoryManagers)) {
    echo "<p style='color: red;'>❌ No inventory managers found!</p>";
    echo "<p>Let's check all roles:</p>";
    
    $stmt = $conn->prepare("
        SELECT DISTINCT r.role, r.role_id, COUNT(e.emp_id) as employee_count
        FROM tbl_role r
        LEFT JOIN tbl_employee e ON r.role_id = e.role_id
        GROUP BY r.role, r.role_id
        ORDER BY r.role_id
    ");
    $stmt->execute();
    $result = $stmt->get_result();
    
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>Role</th><th>Role ID</th><th>Employee Count</th></tr>";
    while ($row = $result->fetch_assoc()) {
        echo "<tr>";
        echo "<td>" . ($row['role'] ?: 'Unknown') . "</td>";
        echo "<td>" . ($row['role_id'] ?: 'NULL') . "</td>";
        echo "<td>" . $row['employee_count'] . "</td>";
        echo "</tr>";
    }
    echo "</table>";
}

// Step 2: Test logout for each inventory manager
echo "<h2>2. Testing Logout for Inventory Managers</h2>";

foreach ($inventoryManagers as $manager) {
    $empId = $manager['emp_id'];
    $name = $manager['Fname'] . " " . $manager['Lname'];
    $username = $manager['username'];
    $role = $manager['role'];
    
    echo "<h3>Testing: $name ($role, ID: $empId)</h3>";
    
    // Check current login records
    $stmt = $conn->prepare("
        SELECT login_id, emp_id, username, status, logout_time, created_at
        FROM tbl_login 
        WHERE emp_id = ?
        ORDER BY created_at DESC 
        LIMIT 3
    ");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    echo "<h4>Current Login Records:</h4>";
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Created At</th></tr>";
    
    while ($row = $result->fetch_assoc()) {
        $color = $row['status'] === 'offline' ? 'background-color: #ffebee;' : '';
        echo "<tr style='$color'>";
        echo "<td>" . $row['login_id'] . "</td>";
        echo "<td>" . $row['emp_id'] . "</td>";
        echo "<td>" . $row['username'] . "</td>";
        echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
        echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
        echo "<td>" . $row['created_at'] . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Test logout API with different approaches
    echo "<h4>Testing Logout API:</h4>";
    
    // Approach 1: Basic logout
    $postData1 = json_encode([
        'action' => 'logout',
        'emp_id' => $empId
    ]);
    
    echo "<p><strong>Approach 1 - Basic Logout:</strong></p>";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'http://localhost/Enguio_Project/Api/login.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response1 = curl_exec($ch);
    $httpCode1 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "<p>Response: " . htmlspecialchars($response1) . "</p>";
    echo "<p>HTTP Code: $httpCode1</p>";
    
    // Approach 2: Logout with route
    $postData2 = json_encode([
        'action' => 'logout',
        'emp_id' => $empId,
        'route' => '/Inventory_Con'
    ]);
    
    echo "<p><strong>Approach 2 - Logout with Route:</strong></p>";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'http://localhost/Enguio_Project/Api/login.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData2);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response2 = curl_exec($ch);
    $httpCode2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "<p>Response: " . htmlspecialchars($response2) . "</p>";
    echo "<p>HTTP Code: $httpCode2</p>";
    
    // Check results
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ? AND status = 'offline'");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $offlineCount = $result->fetch_assoc()['count'];
    
    echo "<p><strong>Offline records created: $offlineCount</strong></p>";
    
    if ($offlineCount > 0) {
        echo "<p style='color: green; font-size: 18px;'>✅ SUCCESS! Offline records created for $role</p>";
    } else {
        echo "<p style='color: red; font-size: 18px;'>❌ FAILED! No offline records created for $role</p>";
    }
    
    echo "<hr>";
}

// Step 3: Compare with admin
echo "<h2>3. Comparing with Admin</h2>";

$stmt = $conn->prepare("
    SELECT 
        e.emp_id, e.Fname, e.Lname, e.username,
        r.role, r.role_id
    FROM tbl_employee e
    LEFT JOIN tbl_role r ON e.role_id = r.role_id
    WHERE LOWER(r.role) LIKE '%admin%'
    ORDER BY e.emp_id
    LIMIT 1
");
$stmt->execute();
$result = $stmt->get_result();
$admin = $result->fetch_assoc();

if ($admin) {
    $adminId = $admin['emp_id'];
    $adminName = $admin['Fname'] . " " . $admin['Lname'];
    $adminRole = $admin['role'];
    
    echo "<h3>Testing Admin: $adminName ($adminRole, ID: $adminId)</h3>";
    
    // Test admin logout
    $postData = json_encode([
        'action' => 'logout',
        'emp_id' => $adminId
    ]);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'http://localhost/Enguio_Project/Api/login.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "<p>Admin Logout Response: " . htmlspecialchars($response) . "</p>";
    echo "<p>Admin Logout HTTP Code: $httpCode</p>";
    
    // Check admin offline records
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ? AND status = 'offline'");
    $stmt->bind_param("i", $adminId);
    $stmt->execute();
    $result = $stmt->get_result();
    $adminOfflineCount = $result->fetch_assoc()['count'];
    
    echo "<p><strong>Admin offline records: $adminOfflineCount</strong></p>";
    
    if ($adminOfflineCount > 0) {
        echo "<p style='color: green;'>✅ Admin logout works</p>";
    } else {
        echo "<p style='color: red;'>❌ Admin logout doesn't work either</p>";
    }
} else {
    echo "<p style='color: red;'>❌ No admin found</p>";
}

echo "<hr>";
echo "<h2>🎯 CONCLUSION</h2>";
echo "<p><strong>This test will show:</strong></p>";
echo "<ul>";
echo "<li>If inventory managers exist in the system</li>";
echo "<li>If logout works differently for different roles</li>";
echo "<li>If there are route-specific issues</li>";
echo "<li>If the problem is role-based or system-wide</li>";
echo "</ul>";
?>
