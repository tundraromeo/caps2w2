<?php
/**
 * ROLE-BASED LOGOUT TEST
 * Test logout for different roles (admin vs inventory manager)
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🔍 ROLE-BASED LOGOUT TEST</h1>";
echo "<p>Testing why logout works for admin but not inventory manager</p>";

// Step 1: Check all employees and their roles
echo "<h2>1. All Employees and Their Roles</h2>";
$stmt = $conn->prepare("
    SELECT 
        e.emp_id, e.Fname, e.Lname, e.username, e.status as emp_status,
        r.role, r.role_id, e.location_id, e.shift_id
    FROM tbl_employee e
    LEFT JOIN tbl_role r ON e.role_id = r.role_id
    ORDER BY e.emp_id
");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Emp ID</th><th>Name</th><th>Username</th><th>Role</th><th>Role ID</th><th>Status</th><th>Location ID</th><th>Shift ID</th></tr>";

while ($row = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['Fname'] . " " . $row['Lname'] . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . ($row['role'] ?: 'Unknown') . "</td>";
    echo "<td>" . ($row['role_id'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['emp_status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['location_id'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['shift_id'] ?: 'NULL') . "</td>";
    echo "</tr>";
}
echo "</table>";

// Step 2: Test logout for each role
echo "<h2>2. Testing Logout for Each Role</h2>";

$employees = [];
$stmt = $conn->prepare("
    SELECT e.emp_id, e.Fname, e.Lname, e.username, r.role, r.role_id
    FROM tbl_employee e
    LEFT JOIN tbl_role r ON e.role_id = r.role_id
    WHERE e.status = 'Active'
    ORDER BY e.emp_id
");
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $employees[] = $row;
}

foreach ($employees as $employee) {
    $empId = $employee['emp_id'];
    $name = $employee['Fname'] . " " . $employee['Lname'];
    $username = $employee['username'];
    $role = $employee['role'] ?: 'Unknown';
    $roleId = $employee['role_id'];
    
    echo "<h3>Testing: $name (Role: $role, ID: $empId)</h3>";
    
    // Count records before
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ?");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $beforeCount = $result->fetch_assoc()['count'];
    
    echo "<p>Records before logout: $beforeCount</p>";
    
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
    
    // Count offline records
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ? AND status = 'offline'");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $offlineCount = $result->fetch_assoc()['count'];
    
    echo "<p>Records after logout: $afterCount</p>";
    echo "<p>Offline records: $offlineCount</p>";
    echo "<p>HTTP Code: $httpCode</p>";
    echo "<p>Response: " . htmlspecialchars($response) . "</p>";
    
    // Parse response
    $responseData = json_decode($response, true);
    if ($responseData && $responseData['success']) {
        echo "<p style='color: green;'>✅ Logout successful for $role</p>";
    } else {
        echo "<p style='color: red;'>❌ Logout failed for $role: " . ($responseData['message'] ?? 'Unknown error') . "</p>";
    }
    
    echo "<hr>";
}

// Step 3: Check if there are different logout endpoints or handling
echo "<h2>3. Checking for Role-Specific Issues</h2>";

// Check if there are different API endpoints
echo "<h3>3.1. Checking API Endpoints</h3>";
$apiFile = 'Api/login.php';
if (file_exists($apiFile)) {
    $content = file_get_contents($apiFile);
    
    // Look for role-specific handling
    if (strpos($content, 'role') !== false) {
        echo "<p style='color: orange;'>⚠️ Found role-specific code in login.php</p>";
    } else {
        echo "<p style='color: green;'>✅ No role-specific code found</p>";
    }
    
    // Look for inventory-specific handling
    if (strpos($content, 'inventory') !== false) {
        echo "<p style='color: orange;'>⚠️ Found inventory-specific code in login.php</p>";
    } else {
        echo "<p style='color: green;'>✅ No inventory-specific code found</p>";
    }
} else {
    echo "<p style='color: red;'>❌ API file not found</p>";
}

// Step 4: Test direct database insert for each role
echo "<h3>3.2. Testing Direct Database Insert for Each Role</h3>";

foreach ($employees as $employee) {
    $empId = $employee['emp_id'];
    $name = $employee['Fname'] . " " . $employee['Lname'];
    $role = $employee['role'] ?: 'Unknown';
    
    echo "<h4>Direct test for: $name ($role)</h4>";
    
    $currentTime = date('H:i:s');
    $currentDate = date('Y-m-d');
    $ipAddress = '127.0.0.1';
    
    // Get employee info
    $stmt = $conn->prepare("SELECT username, role_id FROM tbl_employee WHERE emp_id = ?");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $empInfo = $result->fetch_assoc();
    
    if ($empInfo) {
        // Direct insert
        $stmt = $conn->prepare("
            INSERT INTO tbl_login (
                emp_id, role_id, username, login_time, login_date, 
                logout_time, logout_date, status, ip_address, location, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'offline', ?, ?, NOW())
        ");
        
        $roleId = $empInfo['role_id'] ?? 1;
        $username = $empInfo['username'];
        $loginTime = '00:00:00';
        $loginDate = $currentDate;
        $location = 'Direct Test - ' . $role;
        
        $stmt->bind_param("iisssssss", 
            $empId, $roleId, $username, $loginTime, $loginDate, 
            $currentTime, $currentDate, $ipAddress, $location
        );
        
        $result = $stmt->execute();
        
        if ($result) {
            $recordId = $conn->insert_id;
            echo "<p style='color: green;'>✅ Direct insert successful for $role! Record ID: $recordId</p>";
        } else {
            echo "<p style='color: red;'>❌ Direct insert failed for $role: " . $conn->error . "</p>";
        }
    } else {
        echo "<p style='color: red;'>❌ Employee info not found for $role</p>";
    }
}

// Step 5: Final summary
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
echo "<h2>🎯 Analysis</h2>";
echo "<p><strong>If logout works for admin but not inventory manager, check:</strong></p>";
echo "<ul>";
echo "<li>Are there different API endpoints for different roles?</li>";
echo "<li>Is there role-based validation in the logout process?</li>";
echo "<li>Are there different session handling for different roles?</li>";
echo "<li>Is the inventory manager's emp_id valid?</li>";
echo "<li>Are there permission issues?</li>";
echo "</ul>";

echo "<p><strong>This test will show exactly which roles work and which don't!</strong></p>";
?>
