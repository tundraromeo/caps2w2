<?php
/**
 * LOGIN LOGS DATE FILTER TEST
 * Test the new date-based online/offline logic
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>📅 LOGIN LOGS DATE FILTER TEST</h1>";
echo "<p>Testing the new date-based online/offline logic</p>";

$today = date('Y-m-d');
$yesterday = date('Y-m-d', strtotime('-1 day'));
$twoDaysAgo = date('Y-m-d', strtotime('-2 days'));

echo "<h2>Date Information:</h2>";
echo "<p><strong>Today:</strong> $today</p>";
echo "<p><strong>Yesterday:</strong> $yesterday</p>";
echo "<p><strong>Two Days Ago:</strong> $twoDaysAgo</p>";

// Step 1: Show all login records
echo "<h2>1. All Login Records</h2>";
$stmt = $conn->prepare("
    SELECT 
        l.login_id, l.emp_id, l.username, l.login_date, l.login_time, 
        l.logout_time, l.logout_date, l.status, l.created_at,
        CONCAT(e.Fname, ' ', e.Lname) as employee_name,
        r.role
    FROM tbl_login l
    LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id
    LEFT JOIN tbl_role r ON l.role_id = r.role_id
    ORDER BY l.login_date DESC, l.login_time DESC, l.created_at DESC
    LIMIT 20
");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Name</th><th>Role</th><th>Login Date</th><th>Login Time</th><th>Logout Time</th><th>Status</th><th>Created At</th></tr>";

while ($row = $result->fetch_assoc()) {
    $color = '';
    if ($row['login_date'] === $today) {
        $color = 'background-color: #e8f5e8;'; // Green for today
    } elseif ($row['login_date'] === $yesterday) {
        $color = 'background-color: #fff3e0;'; // Orange for yesterday
    } else {
        $color = 'background-color: #ffebee;'; // Red for older
    }
    
    echo "<tr style='$color'>";
    echo "<td>" . $row['login_id'] . "</td>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['employee_name'] . "</td>";
    echo "<td>" . ($row['role'] ?: 'Unknown') . "</td>";
    echo "<td>" . $row['login_date'] . "</td>";
    echo "<td>" . $row['login_time'] . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Step 2: Test the new online logic (only today)
echo "<h2>2. Online Users (Today Only)</h2>";
$onlineStmt = $conn->prepare("
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
    ORDER BY l.login_time DESC, l.created_at DESC
");
$onlineStmt->execute([$today]);
$result = $onlineStmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Name</th><th>Role</th><th>Login Date</th><th>Login Time</th><th>Status</th><th>Created At</th></tr>";

$onlineCount = 0;
while ($row = $result->fetch_assoc()) {
    $onlineCount++;
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
echo "<p><strong>Online Users Count: $onlineCount</strong></p>";

// Step 3: Test the new offline logic (yesterday and earlier)
echo "<h2>3. Offline Users (Yesterday and Earlier)</h2>";
$offlineStmt = $conn->prepare("
    SELECT 
        l.login_id, l.emp_id, l.username, l.login_date, l.login_time, 
        l.logout_time, l.status, l.created_at,
        CONCAT(e.Fname, ' ', e.Lname) as employee_name,
        r.role
    FROM tbl_login l
    LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id
    LEFT JOIN tbl_role r ON l.role_id = r.role_id
    WHERE l.login_date < ?
    ORDER BY l.login_date DESC, l.login_time DESC, l.created_at DESC
    LIMIT 10
");
$offlineStmt->execute([$today]);
$result = $offlineStmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Name</th><th>Role</th><th>Login Date</th><th>Login Time</th><th>Logout Time</th><th>Status</th><th>Created At</th></tr>";

$offlineCount = 0;
while ($row = $result->fetch_assoc()) {
    $offlineCount++;
    $color = $row['login_date'] === $yesterday ? 'background-color: #fff3e0;' : 'background-color: #ffebee;';
    echo "<tr style='$color'>";
    echo "<td>" . $row['login_id'] . "</td>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['employee_name'] . "</td>";
    echo "<td>" . ($row['role'] ?: 'Unknown') . "</td>";
    echo "<td>" . $row['login_date'] . "</td>";
    echo "<td>" . $row['login_time'] . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";
echo "<p><strong>Offline Users Count: $offlineCount</strong></p>";

// Step 4: Test the API
echo "<h2>4. Testing Login Logs API</h2>";
$postData = json_encode([
    'action' => 'get_report',
    'report_type' => 'login_logs',
    'start_date' => $twoDaysAgo,
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
    echo "<p><strong>Online Users (Today):</strong> " . count($onlineUsers) . "</p>";
    echo "<p><strong>All Logs:</strong> " . count($allLogs) . "</p>";
    
    // Show online users
    if (!empty($onlineUsers)) {
        echo "<h4>Online Users from API:</h4>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Name</th><th>Role</th><th>Login Date</th><th>Login Time</th><th>Description</th></tr>";
        foreach ($onlineUsers as $user) {
            echo "<tr style='background-color: #e8f5e8;'>";
            echo "<td>" . $user['employee_name'] . "</td>";
            echo "<td>" . $user['role'] . "</td>";
            echo "<td>" . $user['date'] . "</td>";
            echo "<td>" . $user['time'] . "</td>";
            echo "<td>" . $user['description'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // Show sample of all logs
    if (!empty($allLogs)) {
        echo "<h4>Sample All Logs from API:</h4>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Name</th><th>Role</th><th>Login Date</th><th>Status</th><th>Action</th><th>Description</th></tr>";
        $count = 0;
        foreach ($allLogs as $log) {
            if ($count >= 5) break; // Show only first 5
            $color = $log['login_status'] === 'ONLINE' ? 'background-color: #e8f5e8;' : 'background-color: #ffebee;';
            echo "<tr style='$color'>";
            echo "<td>" . $log['employee_name'] . "</td>";
            echo "<td>" . $log['role'] . "</td>";
            echo "<td>" . $log['date'] . "</td>";
            echo "<td>" . $log['login_status'] . "</td>";
            echo "<td>" . $log['action'] . "</td>";
            echo "<td>" . $log['description'] . "</td>";
            echo "</tr>";
            $count++;
        }
        echo "</table>";
    }
} else {
    echo "<p style='color: red;'>❌ API call failed</p>";
}

echo "<hr>";
echo "<h2>🎯 SUMMARY</h2>";
echo "<p><strong>New Logic:</strong></p>";
echo "<ul>";
echo "<li>✅ <strong>Online:</strong> Only users who logged in TODAY and have no logout_time</li>";
echo "<li>✅ <strong>Offline:</strong> Users who logged in YESTERDAY or earlier (regardless of logout_time)</li>";
echo "<li>✅ <strong>Cards:</strong> Show only today's online users</li>";
echo "<li>✅ <strong>Table:</strong> Show all activities with proper status</li>";
echo "</ul>";

echo "<p><strong>Test Results:</strong></p>";
echo "<ul>";
echo "<li>Online Users (Today): $onlineCount</li>";
echo "<li>Offline Users (Yesterday/Earlier): $offlineCount</li>";
echo "<li>API Status: " . ($responseData && $responseData['success'] ? '✅ Working' : '❌ Failed') . "</li>";
echo "</ul>";
?>
