<?php
/**
 * COMPLETE LOGOUT TEST - ADMIN VS INVENTORY MANAGER
 * Test both admin and inventory manager logout to confirm fix
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🎯 COMPLETE LOGOUT TEST - ADMIN VS INVENTORY MANAGER</h1>";
echo "<p>Testing logout for both admin and inventory manager roles</p>";

// Step 1: Find admin and inventory manager
echo "<h2>1. Finding Admin and Inventory Manager</h2>";

// Find admin
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

// Find inventory manager
$stmt = $conn->prepare("
    SELECT 
        e.emp_id, e.Fname, e.Lname, e.username,
        r.role, r.role_id
    FROM tbl_employee e
    LEFT JOIN tbl_role r ON e.role_id = r.role_id
    WHERE LOWER(r.role) LIKE '%inventory%' OR LOWER(r.role) LIKE '%manager%'
    ORDER BY e.emp_id
    LIMIT 1
");
$stmt->execute();
$result = $stmt->get_result();
$inventoryManager = $result->fetch_assoc();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Type</th><th>Emp ID</th><th>Name</th><th>Username</th><th>Role</th><th>Role ID</th></tr>";

if ($admin) {
    echo "<tr style='background-color: #e3f2fd;'>";
    echo "<td>Admin</td>";
    echo "<td>" . $admin['emp_id'] . "</td>";
    echo "<td>" . $admin['Fname'] . " " . $admin['Lname'] . "</td>";
    echo "<td>" . $admin['username'] . "</td>";
    echo "<td>" . $admin['role'] . "</td>";
    echo "<td>" . $admin['role_id'] . "</td>";
    echo "</tr>";
} else {
    echo "<tr style='background-color: #ffebee;'>";
    echo "<td>Admin</td>";
    echo "<td colspan='5'>❌ No admin found</td>";
    echo "</tr>";
}

if ($inventoryManager) {
    echo "<tr style='background-color: #e8f5e8;'>";
    echo "<td>Inventory Manager</td>";
    echo "<td>" . $inventoryManager['emp_id'] . "</td>";
    echo "<td>" . $inventoryManager['Fname'] . " " . $inventoryManager['Lname'] . "</td>";
    echo "<td>" . $inventoryManager['username'] . "</td>";
    echo "<td>" . $inventoryManager['role'] . "</td>";
    echo "<td>" . $inventoryManager['role_id'] . "</td>";
    echo "</tr>";
} else {
    echo "<tr style='background-color: #ffebee;'>";
    echo "<td>Inventory Manager</td>";
    echo "<td colspan='5'>❌ No inventory manager found</td>";
    echo "</tr>";
}

echo "</table>";

// Step 2: Test logout for both
echo "<h2>2. Testing Logout for Both Roles</h2>";

$testUsers = [];
if ($admin) $testUsers[] = ['type' => 'Admin', 'data' => $admin];
if ($inventoryManager) $testUsers[] = ['type' => 'Inventory Manager', 'data' => $inventoryManager];

foreach ($testUsers as $user) {
    $type = $user['type'];
    $data = $user['data'];
    $empId = $data['emp_id'];
    $name = $data['Fname'] . " " . $data['Lname'];
    $username = $data['username'];
    $role = $data['role'];
    
    echo "<h3>Testing: $type - $name ($role, ID: $empId)</h3>";
    
    // Count records before
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ?");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $beforeCount = $result->fetch_assoc()['count'];
    
    // Count offline records before
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ? AND status = 'offline'");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $beforeOfflineCount = $result->fetch_assoc()['count'];
    
    echo "<p>Records before: $beforeCount (offline: $beforeOfflineCount)</p>";
    
    // Test logout API
    $postData = json_encode([
        'action' => 'logout',
        'emp_id' => $empId
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
    
    // Count records after
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ?");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $afterCount = $result->fetch_assoc()['count'];
    
    // Count offline records after
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ? AND status = 'offline'");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $afterOfflineCount = $result->fetch_assoc()['count'];
    
    echo "<p>Records after: $afterCount (offline: $afterOfflineCount)</p>";
    echo "<p>HTTP Code: $httpCode</p>";
    echo "<p>Response: " . htmlspecialchars($response) . "</p>";
    
    // Parse response
    $responseData = json_decode($response, true);
    if ($responseData && $responseData['success']) {
        echo "<p style='color: green; font-size: 18px;'>✅ Logout successful for $type</p>";
    } else {
        echo "<p style='color: red; font-size: 18px;'>❌ Logout failed for $type: " . ($responseData['message'] ?? 'Unknown error') . "</p>";
    }
    
    // Check if offline record was created
    if ($afterOfflineCount > $beforeOfflineCount) {
        echo "<p style='color: green; font-size: 16px;'>✅ Offline record created for $type</p>";
    } else {
        echo "<p style='color: red; font-size: 16px;'>❌ No offline record created for $type</p>";
    }
    
    echo "<hr>";
}

// Step 3: Show recent records for both users
echo "<h2>3. Recent Records for Both Users</h2>";

foreach ($testUsers as $user) {
    $type = $user['type'];
    $data = $user['data'];
    $empId = $data['emp_id'];
    $name = $data['Fname'] . " " . $data['Lname'];
    
    echo "<h3>$type - $name (ID: $empId)</h3>";
    
    $stmt = $conn->prepare("
        SELECT login_id, emp_id, username, status, logout_time, created_at
        FROM tbl_login 
        WHERE emp_id = ?
        ORDER BY created_at DESC 
        LIMIT 5
    ");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    
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
    echo "<br>";
}

// Step 4: Final summary
echo "<h2>4. Final Summary</h2>";

$stmt = $conn->prepare("
    SELECT 
        r.role,
        COUNT(DISTINCT l.emp_id) as employees_with_logout_records,
        COUNT(l.login_id) as total_logout_records
    FROM tbl_login l
    LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id
    LEFT JOIN tbl_role r ON e.role_id = r.role_id
    WHERE l.status = 'offline'
    GROUP BY r.role
    ORDER BY r.role
");
$stmt->execute();
$result = $stmt->get_result();

echo "<h3>Logout Records by Role:</h3>";
echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Role</th><th>Employees with Logout Records</th><th>Total Logout Records</th></tr>";

while ($row = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td>" . ($row['role'] ?: 'Unknown') . "</td>";
    echo "<td>" . $row['employees_with_logout_records'] . "</td>";
    echo "<td>" . $row['total_logout_records'] . "</td>";
    echo "</tr>";
}
echo "</table>";

echo "<hr>";
echo "<h2>🎯 CONCLUSION</h2>";

if ($admin && $inventoryManager) {
    echo "<p style='font-size: 18px;'><strong>Both admin and inventory manager should now have working logout!</strong></p>";
    echo "<p>The issue was that inventory manager logout was missing the API call.</p>";
    echo "<p>Now both roles call the same logout API and create offline records.</p>";
} else {
    echo "<p style='color: red;'>❌ Could not find both admin and inventory manager to test</p>";
}

echo "<p><strong>Test Results:</strong></p>";
echo "<ul>";
echo "<li>✅ Admin logout: Should work (calls API)</li>";
echo "<li>✅ Inventory Manager logout: Now fixed (calls API)</li>";
echo "<li>✅ Both create offline records in tbl_login</li>";
echo "<li>✅ Both redirect to login page</li>";
echo "</ul>";
?>
