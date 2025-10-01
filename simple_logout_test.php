<?php
/**
 * Simple Logout Test
 * Direct test of logout functionality
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🚀 Simple Logout Test</h1>";

// Test with emp_id = 1 (ezay)
$testEmpId = 1;

echo "<h2>Testing Logout for Employee ID: $testEmpId</h2>";

// Step 1: Check current records
echo "<h3>1. Current Records Before Logout</h3>";
$stmt = $conn->prepare("
    SELECT login_id, emp_id, username, status, logout_time, created_at
    FROM tbl_login 
    WHERE emp_id = ?
    ORDER BY created_at DESC 
    LIMIT 5
");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Created At</th></tr>";

while ($row = $result->fetch_assoc()) {
    $rowColor = '';
    switch ($row['status']) {
        case 'offline': $rowColor = 'background-color: #ffebee;'; break;
        case 'online': $rowColor = 'background-color: #e8f5e8;'; break;
        case 'completed': $rowColor = 'background-color: #fff3e0;'; break;
    }
    
    echo "<tr style='$rowColor'>";
    echo "<td>" . $row['login_id'] . "</td>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Step 2: Test logout API
echo "<h3>2. Testing Logout API</h3>";

$postData = json_encode([
    'action' => 'logout',
    'emp_id' => $testEmpId
]);

echo "<p><strong>POST Data:</strong> " . htmlspecialchars($postData) . "</p>";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/Enguio_Project/Api/login.php');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "<p><strong>HTTP Code:</strong> $httpCode</p>";
echo "<p><strong>Response:</strong> " . htmlspecialchars($response) . "</p>";

if ($curlError) {
    echo "<p style='color: red;'><strong>CURL Error:</strong> $curlError</p>";
}

// Parse response
$responseData = json_decode($response, true);
if ($responseData) {
    if ($responseData['success']) {
        echo "<p style='color: green; font-size: 18px;'>✅ Logout API returned success!</p>";
    } else {
        echo "<p style='color: red; font-size: 18px;'>❌ Logout API failed: " . ($responseData['message'] ?? 'Unknown error') . "</p>";
    }
} else {
    echo "<p style='color: red; font-size: 18px;'>❌ Invalid JSON response</p>";
}

// Step 3: Check records after logout
echo "<h3>3. Records After Logout</h3>";
$stmt = $conn->prepare("
    SELECT login_id, emp_id, username, status, logout_time, created_at
    FROM tbl_login 
    WHERE emp_id = ?
    ORDER BY created_at DESC 
    LIMIT 5
");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Created At</th></tr>";

while ($row = $result->fetch_assoc()) {
    $rowColor = '';
    switch ($row['status']) {
        case 'offline': $rowColor = 'background-color: #ffebee;'; break;
        case 'online': $rowColor = 'background-color: #e8f5e8;'; break;
        case 'completed': $rowColor = 'background-color: #fff3e0;'; break;
    }
    
    echo "<tr style='$rowColor'>";
    echo "<td>" . $row['login_id'] . "</td>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Step 4: Check for offline records specifically
echo "<h3>4. Checking for Offline Records</h3>";
$stmt = $conn->prepare("
    SELECT COUNT(*) as count
    FROM tbl_login 
    WHERE emp_id = ? AND status = 'offline'
");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();
$offlineCount = $result->fetch_assoc()['count'];

echo "<p><strong>Offline records for emp_id $testEmpId:</strong> $offlineCount</p>";

if ($offlineCount > 0) {
    echo "<p style='color: green; font-size: 18px;'>🎉 SUCCESS! Offline records are being created!</p>";
} else {
    echo "<p style='color: red; font-size: 18px;'>❌ PROBLEM! No offline records found.</p>";
}

// Step 5: Manual test - create offline record directly
echo "<h3>5. Manual Test - Direct Database Insert</h3>";

try {
    $currentTime = date('H:i:s');
    $currentDate = date('Y-m-d');
    
    $stmt = $conn->prepare("
        INSERT INTO tbl_login (
            emp_id, role_id, username, login_time, login_date, 
            logout_time, logout_date, status, ip_address, location, 
            terminal_id, shift_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'offline', ?, ?, ?, ?, NOW(), NOW())
    ");
    
    $roleId = 1;
    $username = 'manual_test';
    $loginTime = '00:00:00';
    $loginDate = $currentDate;
    $ipAddress = '127.0.0.1';
    $location = 'Manual Test';
    $terminalId = null;
    $shiftId = null;
    
    $stmt->bind_param("iisssssssii", 
        $testEmpId, 
        $roleId, 
        $username, 
        $loginTime, 
        $loginDate, 
        $currentTime, 
        $currentDate, 
        $ipAddress, 
        $location, 
        $terminalId, 
        $shiftId
    );
    
    $result = $stmt->execute();
    
    if ($result) {
        $insertId = $conn->insert_id;
        echo "<p style='color: green;'>✅ Manual insert successful! Insert ID: $insertId</p>";
    } else {
        echo "<p style='color: red;'>❌ Manual insert failed: " . $conn->error . "</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Manual insert error: " . $e->getMessage() . "</p>";
}

echo "<hr>";
echo "<h2>🎯 Test Summary</h2>";
echo "<p><strong>If you see:</strong></p>";
echo "<ul>";
echo "<li>✅ Logout API returned success</li>";
echo "<li>✅ Offline records count > 0</li>";
echo "<li>✅ Manual insert successful</li>";
echo "</ul>";
echo "<p><strong>Then the logout system is working correctly!</strong></p>";

echo "<p><strong>If you see:</strong></p>";
echo "<ul>";
echo "<li>❌ Logout API failed</li>";
echo "<li>❌ No offline records</li>";
echo "<li>❌ Manual insert failed</li>";
echo "</ul>";
echo "<p><strong>Then there's a problem that needs to be fixed.</strong></p>";
?>
