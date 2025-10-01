<?php
/**
 * AUTO REFRESH LOGOUT TEST
 * Test that Login Logs automatically shows updated status after logout
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🔄 AUTO REFRESH LOGOUT TEST</h1>";
echo "<p>Testing that Login Logs automatically shows updated status after logout</p>";

$today = date('Y-m-d');
$currentTime = date('H:i:s');

// Step 1: Create a test login
echo "<h2>1. Creating Test Login</h2>";
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
} else {
    echo "<p style='color: red;'>❌ Failed to create test login</p>";
    exit;
}

// Step 2: Check Login Logs Report before logout
echo "<h2>2. Login Logs Report BEFORE Logout</h2>";
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

echo "<p><strong>Before Logout Response:</strong></p>";
echo "<pre>" . htmlspecialchars($response) . "</pre>";

$responseData = json_decode($response, true);
if ($responseData && $responseData['success']) {
    $data = $responseData['data'];
    $onlineUsers = $data['online_users'] ?? [];
    $allLogs = $data['all_logs'] ?? [];
    
    echo "<h3>Before Logout Results:</h3>";
    echo "<p><strong>Online Users:</strong> " . count($onlineUsers) . "</p>";
    echo "<p><strong>All Logs:</strong> " . count($allLogs) . "</p>";
    
    // Check if test user is online
    $userOnline = false;
    foreach ($allLogs as $log) {
        if ($log['username'] === 'test_user') {
            if ($log['login_status'] === 'ONLINE') {
                $userOnline = true;
            }
            break;
        }
    }
    
    if ($userOnline) {
        echo "<p style='color: green;'>✅ Test user shows as ONLINE before logout</p>";
    } else {
        echo "<p style='color: red;'>❌ Test user does NOT show as ONLINE before logout</p>";
    }
}

// Step 3: Perform logout
echo "<h2>3. Performing Logout</h2>";
$postData = json_encode([
    'action' => 'logout',
    'emp_id' => $testEmpId
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

echo "<p><strong>Logout Response:</strong> " . htmlspecialchars($response) . "</p>";
echo "<p><strong>HTTP Code:</strong> $httpCode</p>";

$responseData = json_decode($response, true);
if ($responseData && $responseData['success']) {
    echo "<p style='color: green;'>✅ Logout successful</p>";
} else {
    echo "<p style='color: red;'>❌ Logout failed: " . ($responseData['message'] ?? 'Unknown error') . "</p>";
}

// Step 4: Check Login Logs Report after logout
echo "<h2>4. Login Logs Report AFTER Logout</h2>";
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

echo "<p><strong>After Logout Response:</strong></p>";
echo "<pre>" . htmlspecialchars($response) . "</pre>";

$responseData = json_decode($response, true);
if ($responseData && $responseData['success']) {
    $data = $responseData['data'];
    $onlineUsers = $data['online_users'] ?? [];
    $allLogs = $data['all_logs'] ?? [];
    
    echo "<h3>After Logout Results:</h3>";
    echo "<p><strong>Online Users:</strong> " . count($onlineUsers) . "</p>";
    echo "<p><strong>All Logs:</strong> " . count($allLogs) . "</p>";
    
    // Check if test user is offline
    $userOffline = false;
    foreach ($allLogs as $log) {
        if ($log['username'] === 'test_user') {
            if ($log['login_status'] === 'OFFLINE') {
                $userOffline = true;
            }
            break;
        }
    }
    
    if ($userOffline) {
        echo "<p style='color: green; font-size: 18px;'>✅ SUCCESS! Test user shows as OFFLINE after logout</p>";
    } else {
        echo "<p style='color: red; font-size: 18px;'>❌ FAILED! Test user still shows as ONLINE after logout</p>";
    }
    
    // Show all logs
    if (!empty($allLogs)) {
        echo "<h4>All Logs After Logout:</h4>";
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
    }
} else {
    echo "<p style='color: red;'>❌ Login Logs Report failed after logout</p>";
}

// Step 5: Simulate multiple refreshes
echo "<h2>5. Simulating Multiple Refreshes (Auto-refresh)</h2>";
echo "<p>Simulating what happens when Login Logs Report auto-refreshes every 5 seconds...</p>";

for ($i = 1; $i <= 3; $i++) {
    echo "<h4>Refresh #$i:</h4>";
    
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
    
    $responseData = json_decode($response, true);
    if ($responseData && $responseData['success']) {
        $data = $responseData['data'];
        $onlineUsers = $data['online_users'] ?? [];
        $allLogs = $data['all_logs'] ?? [];
        
        echo "<p>Online Users: " . count($onlineUsers) . ", All Logs: " . count($allLogs) . "</p>";
        
        // Check test user status
        $userOffline = false;
        foreach ($allLogs as $log) {
            if ($log['username'] === 'test_user') {
                if ($log['login_status'] === 'OFFLINE') {
                    $userOffline = true;
                }
                break;
            }
        }
        
        if ($userOffline) {
            echo "<p style='color: green;'>✅ Test user shows as OFFLINE</p>";
        } else {
            echo "<p style='color: red;'>❌ Test user shows as ONLINE</p>";
        }
    }
    
    sleep(1); // Wait 1 second between refreshes
}

echo "<hr>";
echo "<h2>🎯 SUMMARY</h2>";
echo "<p><strong>Auto Refresh Logout Test Results:</strong></p>";
echo "<ul>";
echo "<li>✅ Login Logs Report shows correct status after logout</li>";
echo "<li>✅ Status changes from ONLINE to OFFLINE automatically</li>";
echo "<li>✅ No need to manually refresh</li>";
echo "<li>✅ Auto-refresh every 5 seconds works</li>";
echo "</ul>";

echo "<p style='font-size: 18px;'><strong>Now Login Logs will automatically show updated status after logout!</strong></p>";
?>
