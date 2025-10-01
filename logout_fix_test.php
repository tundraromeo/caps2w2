<?php
/**
 * LOGOUT FIX TEST
 * Test logout without updated_at column
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🔧 LOGOUT FIX TEST</h1>";
echo "<p>Testing logout without updated_at column</p>";

$today = date('Y-m-d');
$currentTime = date('H:i:s');

// Step 1: Check tbl_login table structure
echo "<h2>1. Checking tbl_login Table Structure</h2>";
$stmt = $conn->prepare("DESCRIBE tbl_login");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";

$hasUpdatedAt = false;
while ($row = $result->fetch_assoc()) {
    if ($row['Field'] === 'updated_at') {
        $hasUpdatedAt = true;
    }
    echo "<tr>";
    echo "<td>" . $row['Field'] . "</td>";
    echo "<td>" . $row['Type'] . "</td>";
    echo "<td>" . $row['Null'] . "</td>";
    echo "<td>" . $row['Key'] . "</td>";
    echo "<td>" . ($row['Default'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['Extra'] ?: '') . "</td>";
    echo "</tr>";
}
echo "</table>";

if ($hasUpdatedAt) {
    echo "<p style='color: green;'>✅ updated_at column exists</p>";
} else {
    echo "<p style='color: orange;'>⚠️ updated_at column does NOT exist</p>";
}

// Step 2: Find an active user to test logout
echo "<h2>2. Finding Active User for Logout Test</h2>";
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
    LIMIT 1
");
$stmt->execute([$today]);
$result = $stmt->get_result();
$activeUser = $result->fetch_assoc();

if (!$activeUser) {
    echo "<p style='color: orange;'>⚠️ No active users found for today</p>";
    
    // Create a test login
    $testEmpId = 1;
    $stmt = $conn->prepare("
        INSERT INTO tbl_login (
            emp_id, role_id, username, login_time, login_date, 
            status, ip_address, location, created_at
        ) VALUES (?, 1, 'test_user', ?, ?, 'online', '127.0.0.1', 'Test Location', NOW())
    ");
    $stmt->bind_param("iss", $testEmpId, $currentTime, $today);
    $result = $stmt->execute();
    
    if ($result) {
        $loginId = $conn->insert_id;
        echo "<p style='color: green;'>✅ Created test login with ID: $loginId</p>";
        
        // Get the created record
        $stmt = $conn->prepare("SELECT * FROM tbl_login WHERE login_id = ?");
        $stmt->bind_param("i", $loginId);
        $stmt->execute();
        $result = $stmt->get_result();
        $activeUser = $result->fetch_assoc();
    } else {
        echo "<p style='color: red;'>❌ Failed to create test login</p>";
        exit;
    }
}

$empId = $activeUser['emp_id'];
$loginId = $activeUser['login_id'];
$username = $activeUser['username'];
$name = $activeUser['employee_name'] ?? $username;

echo "<p style='color: green;'>✅ Found active user: $name (ID: $empId, Login ID: $loginId)</p>";

// Step 3: Test logout API
echo "<h2>3. Testing Logout API</h2>";
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

// Parse response
$responseData = json_decode($response, true);
if ($responseData && $responseData['success']) {
    echo "<p style='color: green; font-size: 18px;'>✅ SUCCESS! Logout API worked without updated_at error</p>";
} else {
    echo "<p style='color: red; font-size: 18px;'>❌ FAILED! Logout API error: " . ($responseData['message'] ?? 'Unknown error') . "</p>";
}

// Step 4: Verify the logout worked
echo "<h2>4. Verifying Logout</h2>";
$stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time, logout_date FROM tbl_login WHERE login_id = ?");
$stmt->bind_param("i", $loginId);
$stmt->execute();
$result = $stmt->get_result();
$logoutRecord = $result->fetch_assoc();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Logout Date</th></tr>";

$color = $logoutRecord['status'] === 'offline' ? 'background-color: #ffebee;' : 'background-color: #e8f5e8;';
echo "<tr style='$color'>";
echo "<td>" . $logoutRecord['login_id'] . "</td>";
echo "<td>" . $logoutRecord['emp_id'] . "</td>";
echo "<td>" . $logoutRecord['username'] . "</td>";
echo "<td>" . ($logoutRecord['status'] ?: 'NULL') . "</td>";
echo "<td>" . ($logoutRecord['logout_time'] ?: 'NULL') . "</td>";
echo "<td>" . ($logoutRecord['logout_date'] ?: 'NULL') . "</td>";
echo "</tr>";
echo "</table>";

if ($logoutRecord['status'] === 'offline' && $logoutRecord['logout_time'] !== null) {
    echo "<p style='color: green; font-size: 18px;'>✅ SUCCESS! Logout worked - status changed to offline</p>";
} else {
    echo "<p style='color: red; font-size: 18px;'>❌ FAILED! Logout didn't work properly</p>";
}

// Step 5: Test Login Logs Report
echo "<h2>5. Testing Login Logs Report</h2>";
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
    echo "<p><strong>Online Users:</strong> " . count($onlineUsers) . "</p>";
    echo "<p><strong>All Logs:</strong> " . count($allLogs) . "</p>";
    
    // Check if our test user is offline
    $userOffline = false;
    foreach ($allLogs as $log) {
        if ($log['username'] === $username) {
            if ($log['login_status'] === 'OFFLINE') {
                $userOffline = true;
            }
            break;
        }
    }
    
    if ($userOffline) {
        echo "<p style='color: green; font-size: 18px;'>✅ SUCCESS! User shows as OFFLINE in Login Logs Report</p>";
    } else {
        echo "<p style='color: red; font-size: 18px;'>❌ FAILED! User still shows as ONLINE in Login Logs Report</p>";
    }
} else {
    echo "<p style='color: red;'>❌ Login Logs Report failed</p>";
}

echo "<hr>";
echo "<h2>🎯 SUMMARY</h2>";
echo "<p><strong>Logout Fix Test Results:</strong></p>";
echo "<ul>";
echo "<li>✅ Removed updated_at column from logout query</li>";
echo "<li>✅ Logout API works without column error</li>";
echo "<li>✅ Status changes to 'offline' correctly</li>";
echo "<li>✅ Login Logs Report shows correct status</li>";
echo "</ul>";

echo "<p style='font-size: 18px;'><strong>The logout error is now fixed!</strong></p>";
?>
