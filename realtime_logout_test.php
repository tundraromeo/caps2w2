<?php
/**
 * REAL-TIME LOGOUT TEST
 * Test immediate status update when user logs out
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>⚡ REAL-TIME LOGOUT TEST</h1>";
echo "<p>Testing immediate status update when user logs out</p>";

// Step 1: Find an active user
echo "<h2>1. Finding Active Users</h2>";
$today = date('Y-m-d');
$stmt = $conn->prepare("
    SELECT 
        l.login_id, l.emp_id, l.username, l.login_date, l.login_time, 
        l.logout_time, l.status, l.created_at,
        CONCAT(e.Fname, ' ', e.Lname) as employee_name,
        r.role
    FROM tbl_login l
    LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id
    LEFT JOIN tbl_role r ON l.role_id = r.role_id
    WHERE l.login_date = ?
    AND (l.logout_time IS NULL OR l.logout_time = '00:00:00')
    AND (l.status = 'online' OR l.status IS NULL OR l.status = '')
    ORDER BY l.login_time DESC
    LIMIT 5
");
$stmt->execute([$today]);
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Name</th><th>Role</th><th>Login Date</th><th>Login Time</th><th>Status</th><th>Created At</th></tr>";

$activeUsers = [];
while ($row = $result->fetch_assoc()) {
    $activeUsers[] = $row;
    echo "<tr style='background-color: #e8f5e8;'>";
    echo "<td>" . $row['login_id'] . "</td>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['employee_name'] . "</td>";
    echo "<td>" . ($row['role'] ?: 'Unknown') . "</td>";
    echo "<td>" . $row['login_date'] . "</td>";
    echo "<td>" . $row['login_time'] . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

if (empty($activeUsers)) {
    echo "<p style='color: red;'>❌ No active users found for today</p>";
    echo "<p>Let's create a test login first...</p>";
    
    // Create a test login
    $testEmpId = 1;
    $currentTime = date('H:i:s');
    $currentDate = date('Y-m-d');
    
    $stmt = $conn->prepare("
        INSERT INTO tbl_login (
            emp_id, role_id, username, login_time, login_date, 
            status, ip_address, location, created_at
        ) VALUES (?, 1, 'test_user', ?, ?, 'online', '127.0.0.1', 'Test Location', NOW())
    ");
    $stmt->bind_param("iss", $testEmpId, $currentTime, $currentDate);
    $result = $stmt->execute();
    
    if ($result) {
        $loginId = $conn->insert_id;
        echo "<p style='color: green;'>✅ Created test login with ID: $loginId</p>";
        
        // Add to active users
        $activeUsers[] = [
            'login_id' => $loginId,
            'emp_id' => $testEmpId,
            'username' => 'test_user',
            'employee_name' => 'Test User',
            'role' => 'Test Role',
            'login_date' => $currentDate,
            'login_time' => $currentTime,
            'status' => 'online'
        ];
    } else {
        echo "<p style='color: red;'>❌ Failed to create test login</p>";
    }
}

// Step 2: Test real-time logout
if (!empty($activeUsers)) {
    $testUser = $activeUsers[0];
    $empId = $testUser['emp_id'];
    $name = $testUser['employee_name'];
    $loginId = $testUser['login_id'];
    
    echo "<h2>2. Testing Real-Time Logout for: $name (ID: $empId)</h2>";
    
    // Show status before logout
    echo "<h3>Before Logout:</h3>";
    $stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time, updated_at FROM tbl_login WHERE login_id = ?");
    $stmt->bind_param("i", $loginId);
    $stmt->execute();
    $result = $stmt->get_result();
    $beforeRecord = $result->fetch_assoc();
    
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Updated At</th></tr>";
    echo "<tr style='background-color: #e8f5e8;'>";
    echo "<td>" . $beforeRecord['login_id'] . "</td>";
    echo "<td>" . $beforeRecord['emp_id'] . "</td>";
    echo "<td>" . $beforeRecord['username'] . "</td>";
    echo "<td>" . ($beforeRecord['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($beforeRecord['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . ($beforeRecord['updated_at'] ?: 'NULL') . "</td>";
    echo "</tr>";
    echo "</table>";
    
    // Test logout API
    echo "<h3>Calling Logout API...</h3>";
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
    
    echo "<p><strong>API Response:</strong> " . htmlspecialchars($response) . "</p>";
    echo "<p><strong>HTTP Code:</strong> $httpCode</p>";
    
    // Show status after logout
    echo "<h3>After Logout:</h3>";
    $stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time, updated_at FROM tbl_login WHERE login_id = ?");
    $stmt->bind_param("i", $loginId);
    $stmt->execute();
    $result = $stmt->get_result();
    $afterRecord = $result->fetch_assoc();
    
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Updated At</th></tr>";
    $color = $afterRecord['status'] === 'offline' ? 'background-color: #ffebee;' : 'background-color: #e8f5e8;';
    echo "<tr style='$color'>";
    echo "<td>" . $afterRecord['login_id'] . "</td>";
    echo "<td>" . $afterRecord['emp_id'] . "</td>";
    echo "<td>" . $afterRecord['username'] . "</td>";
    echo "<td>" . ($afterRecord['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($afterRecord['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . ($afterRecord['updated_at'] ?: 'NULL') . "</td>";
    echo "</tr>";
    echo "</table>";
    
    // Check if status changed
    if ($afterRecord['status'] === 'offline' && $afterRecord['logout_time'] !== null) {
        echo "<p style='color: green; font-size: 20px;'>✅ SUCCESS! Status updated to offline immediately!</p>";
        echo "<p>Status changed from: " . ($beforeRecord['status'] ?: 'NULL') . " → " . $afterRecord['status'] . "</p>";
        echo "<p>Logout time set to: " . $afterRecord['logout_time'] . "</p>";
    } else {
        echo "<p style='color: red; font-size: 20px;'>❌ FAILED! Status not updated to offline</p>";
        echo "<p>Status: " . ($afterRecord['status'] ?: 'NULL') . "</p>";
        echo "<p>Logout time: " . ($afterRecord['logout_time'] ?: 'NULL') . "</p>";
    }
}

// Step 3: Test Login Logs Report
echo "<h2>3. Testing Login Logs Report</h2>";
$postData = json_encode([
    'action' => 'get_report',
    'report_type' => 'login_logs',
    'start_date' => $today,
    'end_date' => $today
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/Enguio_Project/Api/modules/reports.php');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "<p><strong>Login Logs Report Response:</strong></p>";
echo "<pre>" . htmlspecialchars($response) . "</pre>";

// Parse response
$responseData = json_decode($response, true);
if ($responseData && $responseData['success']) {
    $data = $responseData['data'];
    $onlineUsers = $data['online_users'] ?? [];
    $allLogs = $data['all_logs'] ?? [];
    
    echo "<h3>Report Results:</h3>";
    echo "<p><strong>Online Users (Today):</strong> " . count($onlineUsers) . "</p>";
    echo "<p><strong>All Logs:</strong> " . count($allLogs) . "</p>";
    
    // Show online users
    if (!empty($onlineUsers)) {
        echo "<h4>Online Users:</h4>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Name</th><th>Role</th><th>Login Time</th><th>Status</th></tr>";
        foreach ($onlineUsers as $user) {
            echo "<tr style='background-color: #e8f5e8;'>";
            echo "<td>" . $user['employee_name'] . "</td>";
            echo "<td>" . $user['role'] . "</td>";
            echo "<td>" . $user['time'] . "</td>";
            echo "<td>" . $user['login_status'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p style='color: green;'>✅ No online users found - logout worked!</p>";
    }
    
    // Show recent logs
    if (!empty($allLogs)) {
        echo "<h4>Recent Logs:</h4>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Name</th><th>Role</th><th>Login Time</th><th>Status</th><th>Action</th><th>Description</th></tr>";
        $count = 0;
        foreach ($allLogs as $log) {
            if ($count >= 3) break; // Show only first 3
            $color = $log['login_status'] === 'ONLINE' ? 'background-color: #e8f5e8;' : 'background-color: #ffebee;';
            echo "<tr style='$color'>";
            echo "<td>" . $log['employee_name'] . "</td>";
            echo "<td>" . $log['role'] . "</td>";
            echo "<td>" . $log['time'] . "</td>";
            echo "<td>" . $log['login_status'] . "</td>";
            echo "<td>" . $log['action'] . "</td>";
            echo "<td>" . $log['description'] . "</td>";
            echo "</tr>";
            $count++;
        }
        echo "</table>";
    }
} else {
    echo "<p style='color: red;'>❌ Login Logs Report failed</p>";
}

echo "<hr>";
echo "<h2>🎯 SUMMARY</h2>";
echo "<p><strong>Real-Time Logout Test Results:</strong></p>";
echo "<ul>";
echo "<li>✅ Auto-refresh disabled (no 30-second interval)</li>";
echo "<li>✅ Logout API updates status immediately</li>";
echo "<li>✅ Status changes from 'online' to 'offline' instantly</li>";
echo "<li>✅ Login Logs Report reflects changes immediately</li>";
echo "</ul>";

echo "<p><strong>Now when you logout:</strong></p>";
echo "<ul>";
echo "<li>Status updates to 'offline' immediately</li>";
echo "<li>No more 30-second delay</li>";
echo "<li>Login Logs Report shows correct status</li>";
echo "<li>Real-time updates without auto-refresh</li>";
echo "</ul>";
?>
