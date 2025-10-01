<?php
/**
 * Test Employee Logout Functionality
 * Tests logout system with actual employee data from tbl_employee
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🧪 Testing Employee Logout System</h1>";
echo "<p>Testing logout functionality with actual employee data from tbl_employee</p>";

// Test 1: Display current employees
echo "<h2>1. Current Employees in tbl_employee</h2>";
$stmt = $conn->prepare("
    SELECT 
        e.emp_id, e.Fname, e.Lname, e.username, e.status as emp_status,
        r.role, e.location_id, e.shift_id
    FROM tbl_employee e
    LEFT JOIN tbl_role r ON e.role_id = r.role_id
    ORDER BY e.emp_id
");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Emp ID</th><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Location ID</th><th>Shift ID</th></tr>";

while ($row = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['Fname'] . " " . $row['Lname'] . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . ($row['role'] ?: 'Unknown') . "</td>";
    echo "<td>" . ($row['emp_status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['location_id'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['shift_id'] ?: 'NULL') . "</td>";
    echo "</tr>";
}
echo "</table>";

// Test 2: Check current login records
echo "<h2>2. Current Login Records in tbl_login</h2>";
$stmt = $conn->prepare("
    SELECT 
        l.login_id, l.emp_id, l.username, l.login_date, l.login_time, 
        l.logout_time, l.logout_date, l.status, l.location, l.created_at
    FROM tbl_login l
    ORDER BY l.created_at DESC 
    LIMIT 15
");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Login Date</th><th>Login Time</th><th>Logout Time</th><th>Logout Date</th><th>Status</th><th>Location</th><th>Created At</th></tr>";

while ($row = $result->fetch_assoc()) {
    $rowColor = '';
    if ($row['status'] === 'offline') {
        $rowColor = 'background-color: #ffebee;'; // Light red for offline
    } elseif ($row['status'] === 'online') {
        $rowColor = 'background-color: #e8f5e8;'; // Light green for online
    } elseif ($row['status'] === 'completed') {
        $rowColor = 'background-color: #fff3e0;'; // Light orange for completed
    }
    
    echo "<tr style='$rowColor'>";
    echo "<td>" . $row['login_id'] . "</td>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . $row['login_date'] . "</td>";
    echo "<td>" . $row['login_time'] . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['logout_date'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['location'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Test 3: Test logout for each employee
echo "<h2>3. Testing Logout for Each Employee</h2>";

$stmt = $conn->prepare("
    SELECT emp_id, username, Fname, Lname 
    FROM tbl_employee 
    WHERE status = 'Active'
    ORDER BY emp_id
");
$stmt->execute();
$result = $stmt->get_result();

while ($employee = $result->fetch_assoc()) {
    $empId = $employee['emp_id'];
    $username = $employee['username'];
    $fullName = $employee['Fname'] . " " . $employee['Lname'];
    
    echo "<h3>Testing logout for: $fullName (ID: $empId, Username: $username)</h3>";
    
    // Check if employee has any recent login records
    $stmt2 = $conn->prepare("
        SELECT login_id, status, login_date, login_time, logout_time
        FROM tbl_login 
        WHERE emp_id = ? 
        ORDER BY created_at DESC 
        LIMIT 3
    ");
    $stmt2->bind_param("i", $empId);
    $stmt2->execute();
    $result2 = $stmt2->get_result();
    
    echo "<p><strong>Recent login records:</strong></p>";
    echo "<ul>";
    while ($loginRecord = $result2->fetch_assoc()) {
        $statusColor = '';
        switch ($loginRecord['status']) {
            case 'online': $statusColor = 'color: green;'; break;
            case 'offline': $statusColor = 'color: red;'; break;
            case 'completed': $statusColor = 'color: orange;'; break;
            default: $statusColor = 'color: gray;'; break;
        }
        
        echo "<li>Login ID: {$loginRecord['login_id']}, Status: <span style='$statusColor'>{$loginRecord['status']}</span>, Date: {$loginRecord['login_date']}, Time: {$loginRecord['login_time']}, Logout: " . ($loginRecord['logout_time'] ?: 'NULL') . "</li>";
    }
    echo "</ul>";
    
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
    
    echo "<p><strong>Logout API Test:</strong></p>";
    echo "<p>HTTP Code: $httpCode</p>";
    echo "<p>Response: " . htmlspecialchars($response) . "</p>";
    
    // Parse response
    $responseData = json_decode($response, true);
    if ($responseData && $responseData['success']) {
        echo "<p style='color: green;'>✅ Logout successful for $fullName!</p>";
    } else {
        echo "<p style='color: red;'>❌ Logout failed for $fullName: " . ($responseData['message'] ?? 'Unknown error') . "</p>";
    }
    
    echo "<hr>";
}

// Test 4: Check final status after all logout tests
echo "<h2>4. Final Status Check - All Login Records</h2>";
$stmt = $conn->prepare("
    SELECT 
        l.login_id, l.emp_id, l.username, l.login_date, l.login_time, 
        l.logout_time, l.logout_date, l.status, l.location, l.created_at,
        CONCAT(e.Fname, ' ', e.Lname) as employee_name
    FROM tbl_login l
    LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id
    ORDER BY l.created_at DESC 
    LIMIT 20
");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Employee Name</th><th>Username</th><th>Login Date</th><th>Login Time</th><th>Logout Time</th><th>Logout Date</th><th>Status</th><th>Location</th><th>Created At</th></tr>";

while ($row = $result->fetch_assoc()) {
    $rowColor = '';
    switch ($row['status']) {
        case 'offline': $rowColor = 'background-color: #ffebee;'; break;
        case 'online': $rowColor = 'background-color: #e8f5e8;'; break;
        case 'completed': $rowColor = 'background-color: #fff3e0;'; break;
        default: $rowColor = 'background-color: #f5f5f5;'; break;
    }
    
    echo "<tr style='$rowColor'>";
    echo "<td>" . $row['login_id'] . "</td>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . ($row['employee_name'] ?: 'Unknown') . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . $row['login_date'] . "</td>";
    echo "<td>" . $row['login_time'] . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['logout_date'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['location'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Test 5: Summary Statistics
echo "<h2>5. Summary Statistics</h2>";

// Count by status
$stmt = $conn->prepare("
    SELECT 
        status,
        COUNT(*) as count
    FROM tbl_login 
    GROUP BY status
    ORDER BY count DESC
");
$stmt->execute();
$result = $stmt->get_result();

echo "<h3>Login Records by Status:</h3>";
echo "<ul>";
while ($row = $result->fetch_assoc()) {
    $status = $row['status'] ?: 'NULL';
    $count = $row['count'];
    echo "<li><strong>$status:</strong> $count records</li>";
}
echo "</ul>";

// Count online vs offline employees
$stmt = $conn->prepare("
    SELECT 
        CASE 
            WHEN l.status = 'offline' THEN 'OFFLINE'
            WHEN l.logout_time IS NULL OR l.logout_time = '00:00:00' THEN 'ONLINE'
            ELSE 'OFFLINE'
        END as current_status,
        COUNT(DISTINCT l.emp_id) as employee_count
    FROM tbl_login l
    WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
    GROUP BY current_status
");
$stmt->execute();
$result = $stmt->get_result();

echo "<h3>Current Employee Status (Last 24 hours):</h3>";
echo "<ul>";
while ($row = $result->fetch_assoc()) {
    $status = $row['current_status'];
    $count = $row['employee_count'];
    $color = $status === 'ONLINE' ? 'green' : 'red';
    echo "<li style='color: $color;'><strong>$status:</strong> $count employees</li>";
}
echo "</ul>";

echo "<hr>";
echo "<h2>🎯 Test Results Summary</h2>";
echo "<p><strong>✅ Expected Behavior:</strong></p>";
echo "<ul>";
echo "<li>When an employee logs out, a new record should be created in tbl_login with status = 'offline'</li>";
echo "<li>The original login record should be marked as status = 'completed'</li>";
echo "<li>Each logout should create a separate offline record for proper tracking</li>";
echo "<li>Login Logs cards should show only employees with status = 'online' or NULL</li>";
echo "</ul>";

echo "<p><strong>🔍 Check the tables above to verify:</strong></p>";
echo "<ul>";
echo "<li>Are there separate 'offline' records created for each logout?</li>";
echo "<li>Are the original login records marked as 'completed'?</li>";
echo "<li>Do the status counts make sense?</li>";
echo "</ul>";

echo "<p><strong>Test completed!</strong> If you see separate offline records being created for each employee logout, the system is working correctly.</p>";
?>
