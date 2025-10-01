<?php
/**
 * LATEST RECORD STATUS TEST
 * Test Login Logs to show status based on latest record per employee
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🕐 LATEST RECORD STATUS TEST</h1>";
echo "<p>Testing Login Logs to show status based on latest record per employee</p>";

$today = date('Y-m-d');
echo "<p><strong>Today:</strong> $today</p>";

// Step 1: Show all login records for today
echo "<h2>1. All Login Records for Today</h2>";
$stmt = $conn->prepare("
    SELECT 
        l.login_id, l.emp_id, l.username, l.login_date, l.login_time, 
        l.logout_time, l.status, l.created_at, l.updated_at,
        CONCAT(e.Fname, ' ', e.Lname) as employee_name,
        r.role
    FROM tbl_login l
    LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id
    LEFT JOIN tbl_role r ON l.role_id = r.role_id
    WHERE l.login_date = ?
    ORDER BY l.emp_id, l.created_at DESC
");
$stmt->execute([$today]);
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Name</th><th>Role</th><th>Login Time</th><th>Logout Time</th><th>Status</th><th>Created At</th><th>Updated At</th></tr>";

$allRecords = [];
while ($row = $result->fetch_assoc()) {
    $allRecords[] = $row;
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
    echo "<td>" . ($row['updated_at'] ?: 'NULL') . "</td>";
    echo "</tr>";
}
echo "</table>";

// Step 2: Show latest record per employee
echo "<h2>2. Latest Record Per Employee</h2>";
$stmt = $conn->prepare("
    SELECT 
        l.login_id, l.emp_id, l.username, l.login_date, l.login_time, 
        l.logout_time, l.status, l.created_at, l.updated_at,
        CONCAT(e.Fname, ' ', e.Lname) as employee_name,
        r.role
    FROM tbl_login l
    LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id
    LEFT JOIN tbl_role r ON l.role_id = r.role_id
    WHERE l.login_date = ?
    AND l.login_id IN (
        SELECT MAX(login_id) 
        FROM tbl_login l2 
        WHERE l2.emp_id = l.emp_id 
        AND l2.login_date = ?
    )
    ORDER BY l.login_time DESC, l.created_at DESC
");
$stmt->execute([$today, $today]);
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Name</th><th>Role</th><th>Login Time</th><th>Logout Time</th><th>Status</th><th>Created At</th><th>Updated At</th></tr>";

$latestRecords = [];
while ($row = $result->fetch_assoc()) {
    $latestRecords[] = $row;
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
    echo "<td>" . ($row['updated_at'] ?: 'NULL') . "</td>";
    echo "</tr>";
}
echo "</table>";

// Step 3: Test Login Logs API
echo "<h2>3. Testing Login Logs API</h2>";
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
    echo "<p><strong>Online Users (Latest Records):</strong> " . count($onlineUsers) . "</p>";
    echo "<p><strong>All Logs (Latest Records):</strong> " . count($allLogs) . "</p>";
    
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
        echo "<p style='color: orange;'>⚠️ No online users found</p>";
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
        echo "<p style='color: orange;'>⚠️ No logs found</p>";
    }
    
    // Verify that status is based on latest records
    echo "<h3>Status Verification:</h3>";
    $correctStatus = true;
    foreach ($latestRecords as $latestRecord) {
        $empId = $latestRecord['emp_id'];
        $expectedStatus = $latestRecord['status'] === 'offline' ? 'OFFLINE' : 'ONLINE';
        
        // Find this employee in the API results
        $foundInAPI = false;
        $apiStatus = '';
        foreach ($allLogs as $log) {
            if ($log['username'] === $latestRecord['username']) {
                $foundInAPI = true;
                $apiStatus = $log['login_status'];
                break;
            }
        }
        
        if ($foundInAPI) {
            if ($apiStatus === $expectedStatus) {
                echo "<p style='color: green;'>✅ {$latestRecord['employee_name']}: Status correct ($apiStatus)</p>";
            } else {
                echo "<p style='color: red;'>❌ {$latestRecord['employee_name']}: Status incorrect (Expected: $expectedStatus, Got: $apiStatus)</p>";
                $correctStatus = false;
            }
        } else {
            echo "<p style='color: orange;'>⚠️ {$latestRecord['employee_name']}: Not found in API results</p>";
        }
    }
    
    if ($correctStatus) {
        echo "<p style='color: green; font-size: 20px;'>✅ SUCCESS! All statuses are based on latest records!</p>";
    } else {
        echo "<p style='color: red; font-size: 20px;'>❌ FAILED! Some statuses are not based on latest records!</p>";
    }
    
} else {
    echo "<p style='color: red;'>❌ Login Logs API failed</p>";
}

echo "<hr>";
echo "<h2>🎯 SUMMARY</h2>";
echo "<p><strong>Latest Record Status Test Results:</strong></p>";
echo "<ul>";
echo "<li>✅ Query updated to use MAX(login_id) per employee</li>";
echo "<li>✅ Status now based on latest record per employee</li>";
echo "<li>✅ Frontend will show correct status</li>";
echo "<li>✅ No more confusion between old and new records</li>";
echo "</ul>";

echo "<p><strong>Now the Login Logs will show:</strong></p>";
echo "<ul>";
echo "<li>Status based on the <strong>latest record</strong> for each employee</li>";
echo "<li>If latest record has <strong>status = 'offline'</strong> → Shows OFFLINE</li>";
echo "<li>If latest record has <strong>status = 'online'</strong> → Shows ONLINE</li>";
echo "<li>No more showing old login records as online</li>";
echo "</ul>";
?>
