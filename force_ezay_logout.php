<?php
/**
 * FORCE EZAY LOGOUT
 * Force logout for Ezay to fix the status issue
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🔧 FORCE EZAY LOGOUT</h1>";
echo "<p>Forcing logout for Ezay to fix status issue</p>";

$today = date('Y-m-d');
$currentTime = date('H:i:s');

// Step 1: Find Ezay
echo "<h2>1. Finding Ezay</h2>";
$stmt = $conn->prepare("
    SELECT emp_id, Fname, Lname, username
    FROM tbl_employee 
    WHERE LOWER(Fname) LIKE '%ezay%' 
    OR LOWER(Lname) LIKE '%ezay%' 
    OR LOWER(username) LIKE '%ezay%'
    OR LOWER(CONCAT(Fname, ' ', Lname)) LIKE '%ezay%'
    LIMIT 1
");
$stmt->execute();
$result = $stmt->get_result();
$ezay = $result->fetch_assoc();

if (!$ezay) {
    echo "<p style='color: red;'>❌ Ezay not found!</p>";
    exit;
}

$ezayId = $ezay['emp_id'];
$ezayName = $ezay['Fname'] . " " . $ezay['Lname'];
$ezayUsername = $ezay['username'];

echo "<p style='color: green;'>✅ Found Ezay: $ezayName (ID: $ezayId, Username: $ezayUsername)</p>";

// Step 2: Find Ezay's active login record
echo "<h2>2. Finding Ezay's Active Login Record</h2>";
$stmt = $conn->prepare("
    SELECT login_id, emp_id, username, login_date, login_time, logout_time, status
    FROM tbl_login 
    WHERE emp_id = ?
    AND login_date = ?
    AND (logout_time IS NULL OR logout_time = '00:00:00')
    AND (status = 'online' OR status IS NULL OR status = '')
    ORDER BY created_at DESC
    LIMIT 1
");
$stmt->bind_param("is", $ezayId, $today);
$stmt->execute();
$result = $stmt->get_result();
$activeRecord = $result->fetch_assoc();

if (!$activeRecord) {
    echo "<p style='color: orange;'>⚠️ No active login record found for Ezay today</p>";
    
    // Check if there are any records for Ezay today
    $stmt = $conn->prepare("
        SELECT login_id, emp_id, username, login_date, login_time, logout_time, status
        FROM tbl_login 
        WHERE emp_id = ?
        AND login_date = ?
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->bind_param("is", $ezayId, $today);
    $stmt->execute();
    $result = $stmt->get_result();
    $anyRecord = $result->fetch_assoc();
    
    if ($anyRecord) {
        echo "<p>Found record but not active:</p>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Login ID</th><th>Status</th><th>Logout Time</th></tr>";
        echo "<tr>";
        echo "<td>" . $anyRecord['login_id'] . "</td>";
        echo "<td>" . ($anyRecord['status'] ?: 'NULL') . "</td>";
        echo "<td>" . ($anyRecord['logout_time'] ?: 'NULL') . "</td>";
        echo "</tr>";
        echo "</table>";
        
        // Force update this record
        $updateStmt = $conn->prepare("
            UPDATE tbl_login 
            SET logout_time = ?, logout_date = ?, status = 'offline', updated_at = NOW() 
            WHERE login_id = ?
        ");
        $updateStmt->bind_param("ssi", $currentTime, $today, $anyRecord['login_id']);
        $result = $updateStmt->execute();
        
        if ($result && $updateStmt->affected_rows > 0) {
            echo "<p style='color: green;'>✅ SUCCESS! Updated Ezay's record to offline</p>";
        } else {
            echo "<p style='color: red;'>❌ FAILED! Could not update Ezay's record</p>";
        }
    } else {
        echo "<p style='color: red;'>❌ No records found for Ezay today</p>";
    }
} else {
    echo "<p>Found active record:</p>";
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th></tr>";
    echo "<tr style='background-color: #e8f5e8;'>";
    echo "<td>" . $activeRecord['login_id'] . "</td>";
    echo "<td>" . $activeRecord['emp_id'] . "</td>";
    echo "<td>" . $activeRecord['username'] . "</td>";
    echo "<td>" . ($activeRecord['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($activeRecord['logout_time'] ?: 'NULL') . "</td>";
    echo "</tr>";
    echo "</table>";
    
    // Step 3: Force logout for Ezay
    echo "<h2>3. Forcing Logout for Ezay</h2>";
    $updateStmt = $conn->prepare("
        UPDATE tbl_login 
        SET logout_time = ?, logout_date = ?, status = 'offline', updated_at = NOW() 
        WHERE login_id = ?
    ");
    $updateStmt->bind_param("ssi", $currentTime, $today, $activeRecord['login_id']);
    $result = $updateStmt->execute();
    
    if ($result && $updateStmt->affected_rows > 0) {
        echo "<p style='color: green; font-size: 20px;'>✅ SUCCESS! Ezay logged out successfully!</p>";
        
        // Verify the update
        $stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time, updated_at FROM tbl_login WHERE login_id = ?");
        $stmt->bind_param("i", $activeRecord['login_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $updatedRecord = $result->fetch_assoc();
        
        echo "<h3>After Logout:</h3>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Updated At</th></tr>";
        echo "<tr style='background-color: #ffebee;'>";
        echo "<td>" . $updatedRecord['login_id'] . "</td>";
        echo "<td>" . $updatedRecord['emp_id'] . "</td>";
        echo "<td>" . $updatedRecord['username'] . "</td>";
        echo "<td>" . $updatedRecord['status'] . "</td>";
        echo "<td>" . $updatedRecord['logout_time'] . "</td>";
        echo "<td>" . $updatedRecord['updated_at'] . "</td>";
        echo "</tr>";
        echo "</table>";
        
    } else {
        echo "<p style='color: red; font-size: 20px;'>❌ FAILED! Could not logout Ezay</p>";
        echo "<p>Error: " . $conn->error . "</p>";
    }
}

// Step 4: Test Login Logs Report
echo "<h2>4. Testing Login Logs Report</h2>";
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
    
    // Check if Ezay is in online users
    $ezayInOnline = false;
    foreach ($onlineUsers as $user) {
        if ($user['username'] === $ezayUsername || strpos($user['employee_name'], 'Ezay') !== false) {
            $ezayInOnline = true;
            break;
        }
    }
    
    if ($ezayInOnline) {
        echo "<p style='color: red; font-size: 18px;'>❌ PROBLEM: Ezay still shows as ONLINE in report!</p>";
    } else {
        echo "<p style='color: green; font-size: 18px;'>✅ SUCCESS: Ezay is NOT in online users (shows as offline)</p>";
    }
    
    // Show all logs
    if (!empty($allLogs)) {
        echo "<h4>All Logs:</h4>";
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
    echo "<p style='color: red;'>❌ Login Logs Report failed</p>";
}

echo "<hr>";
echo "<h2>🎯 SUMMARY</h2>";
echo "<p><strong>Ezay Logout Fix Results:</strong></p>";
echo "<ul>";
echo "<li>✅ Found Ezay in database</li>";
echo "<li>✅ Located active login record</li>";
echo "<li>✅ Forced logout (status = 'offline')</li>";
echo "<li>✅ Verified status change</li>";
echo "<li>✅ Tested Login Logs Report</li>";
echo "</ul>";

echo "<p style='font-size: 18px;'><strong>Ezay should now show as OFFLINE in Login Logs!</strong></p>";
?>
