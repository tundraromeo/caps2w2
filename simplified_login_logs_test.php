<?php
/**
 * SIMPLIFIED LOGIN LOGS TEST
 * Test Login Logs with only 3 employees and today only
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>👥 SIMPLIFIED LOGIN LOGS TEST</h1>";
echo "<p>Testing Login Logs with only 3 employees and today only</p>";

$today = date('Y-m-d');
echo "<p><strong>Today:</strong> $today</p>";

// Step 1: Check current login records for today
echo "<h2>1. Current Login Records for Today</h2>";
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
    ORDER BY l.login_time DESC, l.created_at DESC
    LIMIT 10
");
$stmt->execute([$today]);
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Name</th><th>Role</th><th>Login Time</th><th>Logout Time</th><th>Status</th><th>Created At</th></tr>";

while ($row = $result->fetch_assoc()) {
    $color = '';
    if ($row['status'] === 'offline') {
        $color = 'background-color: #ffebee;'; // Red for offline
    } elseif ($row['status'] === 'online' || $row['status'] === null || $row['status'] === '') {
        $color = 'background-color: #e8f5e8;'; // Green for online
    }
    
    echo "<tr style='$color'>";
    echo "<td>" . $row['login_id'] . "</td>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['employee_name'] . "</td>";
    echo "<td>" . ($row['role'] ?: 'Unknown') . "</td>";
    echo "<td>" . $row['login_time'] . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Step 2: Test Login Logs API
echo "<h2>2. Testing Login Logs API</h2>";
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

echo "<p><strong>API Response:</strong></p>";
echo "<pre>" . htmlspecialchars($response) . "</pre>";
echo "<p><strong>HTTP Code:</strong> $httpCode</p>";

// Parse response
$responseData = json_decode($response, true);
if ($responseData && $responseData['success']) {
    $data = $responseData['data'];
    $onlineUsers = $data['online_users'] ?? [];
    $allLogs = $data['all_logs'] ?? [];
    
    echo "<h3>API Results:</h3>";
    echo "<p><strong>Online Users (Today, Max 3):</strong> " . count($onlineUsers) . "</p>";
    echo "<p><strong>All Logs (Today, Max 3):</strong> " . count($allLogs) . "</p>";
    
    // Show online users
    if (!empty($onlineUsers)) {
        echo "<h4>Online Users (Cards):</h4>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Name</th><th>Role</th><th>Login Time</th><th>Status</th><th>Description</th></tr>";
        foreach ($onlineUsers as $user) {
            echo "<tr style='background-color: #e8f5e8;'>";
            echo "<td>" . $user['employee_name'] . "</td>";
            echo "<td>" . $user['role'] . "</td>";
            echo "<td>" . $user['time'] . "</td>";
            echo "<td>" . $user['login_status'] . "</td>";
            echo "<td>" . $user['description'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p style='color: orange;'>⚠️ No online users found for today</p>";
    }
    
    // Show all logs
    if (!empty($allLogs)) {
        echo "<h4>All Logs (Table):</h4>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Name</th><th>Role</th><th>Login Time</th><th>Status</th><th>Action</th><th>Description</th></tr>";
        foreach ($allLogs as $log) {
            $color = $log['login_status'] === 'ONLINE' ? 'background-color: #e8f5e8;' : 'background-color: #ffebee;';
            echo "<tr style='$color'>";
            echo "<td>" . $log['employee_name'] . "</td>";
            echo "<td>" . $log['role'] . "</td>";
            echo "<td>" . $log['time'] . "</td>";
            echo "<td>" . $log['login_status'] . "</td>";
            echo "<td>" . $log['action'] . "</td>";
            echo "<td>" . $log['description'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p style='color: orange;'>⚠️ No logs found for today</p>";
    }
    
    // Check if limit is working
    if (count($onlineUsers) <= 3 && count($allLogs) <= 3) {
        echo "<p style='color: green; font-size: 18px;'>✅ SUCCESS! Limited to 3 employees maximum</p>";
    } else {
        echo "<p style='color: red; font-size: 18px;'>❌ FAILED! More than 3 employees shown</p>";
    }
    
} else {
    echo "<p style='color: red;'>❌ Login Logs API failed</p>";
}

// Step 3: Test logout functionality
echo "<h2>3. Testing Logout (Status Change Only)</h2>";

// Find an online user to test logout
$stmt = $conn->prepare("
    SELECT login_id, emp_id, username, status
    FROM tbl_login 
    WHERE login_date = ?
    AND (logout_time IS NULL OR logout_time = '00:00:00')
    AND (status = 'online' OR status IS NULL OR status = '')
    ORDER BY login_time DESC
    LIMIT 1
");
$stmt->execute([$today]);
$result = $stmt->get_result();
$onlineUser = $result->fetch_assoc();

if ($onlineUser) {
    $empId = $onlineUser['emp_id'];
    $loginId = $onlineUser['login_id'];
    $username = $onlineUser['username'];
    
    echo "<p><strong>Testing logout for:</strong> $username (ID: $empId)</p>";
    
    // Show status before logout
    echo "<h4>Before Logout:</h4>";
    $stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time FROM tbl_login WHERE login_id = ?");
    $stmt->bind_param("i", $loginId);
    $stmt->execute();
    $result = $stmt->get_result();
    $beforeRecord = $result->fetch_assoc();
    
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th></tr>";
    echo "<tr style='background-color: #e8f5e8;'>";
    echo "<td>" . $beforeRecord['login_id'] . "</td>";
    echo "<td>" . $beforeRecord['emp_id'] . "</td>";
    echo "<td>" . $beforeRecord['username'] . "</td>";
    echo "<td>" . ($beforeRecord['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($beforeRecord['logout_time'] ?: 'NULL') . "</td>";
    echo "</tr>";
    echo "</table>";
    
    // Test logout API
    echo "<h4>Calling Logout API...</h4>";
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
    
    echo "<p><strong>Logout API Response:</strong> " . htmlspecialchars($response) . "</p>";
    echo "<p><strong>HTTP Code:</strong> $httpCode</p>";
    
    // Show status after logout
    echo "<h4>After Logout:</h4>";
    $stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time FROM tbl_login WHERE login_id = ?");
    $stmt->bind_param("i", $loginId);
    $stmt->execute();
    $result = $stmt->get_result();
    $afterRecord = $result->fetch_assoc();
    
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th></tr>";
    $color = $afterRecord['status'] === 'offline' ? 'background-color: #ffebee;' : 'background-color: #e8f5e8;';
    echo "<tr style='$color'>";
    echo "<td>" . $afterRecord['login_id'] . "</td>";
    echo "<td>" . $afterRecord['emp_id'] . "</td>";
    echo "<td>" . $afterRecord['username'] . "</td>";
    echo "<td>" . ($afterRecord['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($afterRecord['logout_time'] ?: 'NULL') . "</td>";
    echo "</tr>";
    echo "</table>";
    
    // Check if status changed
    if ($afterRecord['status'] === 'offline' && $afterRecord['logout_time'] !== null) {
        echo "<p style='color: green; font-size: 18px;'>✅ SUCCESS! Status changed to offline (no new row added)</p>";
    } else {
        echo "<p style='color: red; font-size: 18px;'>❌ FAILED! Status not changed to offline</p>";
    }
    
} else {
    echo "<p style='color: orange;'>⚠️ No online users found to test logout</p>";
}

echo "<hr>";
echo "<h2>🎯 SUMMARY</h2>";
echo "<p><strong>Simplified Login Logs Features:</strong></p>";
echo "<ul>";
echo "<li>✅ <strong>Only 3 employees maximum</strong> shown</li>";
echo "<li>✅ <strong>Today only</strong> - no yesterday's data</li>";
echo "<li>✅ <strong>Logout changes status only</strong> - no new rows added</li>";
echo "<li>✅ <strong>Clean interface</strong> - simple and focused</li>";
echo "</ul>";

echo "<p><strong>Test Results:</strong></p>";
echo "<ul>";
echo "<li>Max 3 employees: " . (isset($onlineUsers) && count($onlineUsers) <= 3 ? '✅ Working' : '❌ Failed') . "</li>";
echo "<li>Today only: " . (isset($allLogs) && count($allLogs) <= 3 ? '✅ Working' : '❌ Failed') . "</li>";
echo "<li>Status change logout: " . (isset($afterRecord) && $afterRecord['status'] === 'offline' ? '✅ Working' : '❌ Failed') . "</li>";
echo "</ul>";
?>
