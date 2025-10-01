<?php
/**
 * Test Logout Functionality
 * This file tests the new logout system that creates separate offline records
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>Testing Logout Functionality</h1>";

// Test 1: Check current login records
echo "<h2>1. Current Login Records</h2>";
$stmt = $conn->prepare("
    SELECT 
        login_id, emp_id, username, login_date, login_time, 
        logout_time, logout_date, status, location, created_at
    FROM tbl_login 
    ORDER BY created_at DESC 
    LIMIT 10
");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Login Date</th><th>Login Time</th><th>Logout Time</th><th>Logout Date</th><th>Status</th><th>Location</th><th>Created At</th></tr>";

while ($row = $result->fetch_assoc()) {
    echo "<tr>";
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

// Test 2: Test logout API
echo "<h2>2. Test Logout API</h2>";
echo "<p>Testing logout functionality...</p>";

// Simulate logout request
$testEmpId = 1; // Change this to an existing emp_id
$testLoginId = null; // Will be determined from recent login

// Get most recent login for testing
$stmt = $conn->prepare("
    SELECT login_id, emp_id FROM tbl_login 
    WHERE (logout_time IS NULL OR logout_time = '00:00:00')
    ORDER BY login_id DESC LIMIT 1
");
$stmt->execute();
$result = $stmt->get_result();
$recentLogin = $result->fetch_assoc();

if ($recentLogin) {
    $testEmpId = $recentLogin['emp_id'];
    $testLoginId = $recentLogin['login_id'];
    
    echo "<p>Testing logout for Emp ID: $testEmpId, Login ID: $testLoginId</p>";
    
    // Test the logout API
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
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "<p>HTTP Code: $httpCode</p>";
    echo "<p>Response: " . htmlspecialchars($response) . "</p>";
    
    // Parse response
    $responseData = json_decode($response, true);
    if ($responseData && $responseData['success']) {
        echo "<p style='color: green;'>✅ Logout successful!</p>";
    } else {
        echo "<p style='color: red;'>❌ Logout failed: " . ($responseData['message'] ?? 'Unknown error') . "</p>";
    }
} else {
    echo "<p style='color: orange;'>⚠️ No recent login found to test logout</p>";
}

// Test 3: Check records after logout
echo "<h2>3. Records After Logout Test</h2>";
$stmt = $conn->prepare("
    SELECT 
        login_id, emp_id, username, login_date, login_time, 
        logout_time, logout_date, status, location, created_at
    FROM tbl_login 
    WHERE emp_id = ? OR login_id = ?
    ORDER BY created_at DESC 
    LIMIT 5
");
$stmt->bind_param("ii", $testEmpId, $testLoginId);
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

// Test 4: Check online users count
echo "<h2>4. Online Users Count</h2>";
$stmt = $conn->prepare("
    SELECT COUNT(*) as online_count
    FROM tbl_login 
    WHERE (logout_time IS NULL OR logout_time = '00:00:00')
    AND (status = 'online' OR status IS NULL OR status = '')
");
$stmt->execute();
$result = $stmt->get_result();
$onlineCount = $result->fetch_assoc()['online_count'];

echo "<p>Currently online users: <strong>$onlineCount</strong></p>";

// Test 5: Check offline users count
echo "<h2>5. Offline Users Count</h2>";
$stmt = $conn->prepare("
    SELECT COUNT(*) as offline_count
    FROM tbl_login 
    WHERE status = 'offline'
");
$stmt->execute();
$result = $stmt->get_result();
$offlineCount = $result->fetch_assoc()['offline_count'];

echo "<p>Offline users: <strong>$offlineCount</strong></p>";

echo "<hr>";
echo "<p><strong>Test completed!</strong></p>";
echo "<p>If you see separate offline records being created, the logout system is working correctly.</p>";
?>
