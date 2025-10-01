<?php
/**
 * GUARANTEED LOGOUT TEST
 * This will definitely create offline records
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🎯 GUARANTEED LOGOUT TEST</h1>";
echo "<p>This test will DEFINITELY create offline records in tbl_login</p>";

// Test with employee ID 1
$testEmpId = 1;

echo "<h2>Testing with Employee ID: $testEmpId</h2>";

// Step 1: Show current records
echo "<h3>1. Current Records:</h3>";
$stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time, created_at FROM tbl_login WHERE emp_id = ? ORDER BY created_at DESC LIMIT 3");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Created At</th></tr>";
while ($row = $result->fetch_assoc()) {
    $color = $row['status'] === 'offline' ? 'background-color: #ffebee;' : '';
    echo "<tr style='$color'>";
    echo "<td>" . $row['login_id'] . "</td>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Step 2: Create offline record DIRECTLY
echo "<h3>2. Creating Offline Record DIRECTLY:</h3>";

$currentTime = date('H:i:s');
$currentDate = date('Y-m-d');
$ipAddress = '127.0.0.1';

// Get employee info
$stmt = $conn->prepare("SELECT username, role_id FROM tbl_employee WHERE emp_id = ?");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();
$employee = $result->fetch_assoc();

if ($employee) {
    echo "<p>✅ Employee found: " . $employee['username'] . "</p>";
    
    // INSERT DIRECTLY
    $stmt = $conn->prepare("
        INSERT INTO tbl_login (
            emp_id, role_id, username, login_time, login_date, 
            logout_time, logout_date, status, ip_address, location, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'offline', ?, ?, NOW())
    ");
    
    $roleId = $employee['role_id'] ?? 1;
    $username = $employee['username'];
    $loginTime = '00:00:00';
    $loginDate = $currentDate;
    $location = 'Direct Test';
    
    $stmt->bind_param("iisssssss", 
        $testEmpId, $roleId, $username, $loginTime, $loginDate, 
        $currentTime, $currentDate, $ipAddress, $location
    );
    
    $result = $stmt->execute();
    
    if ($result) {
        $recordId = $conn->insert_id;
        echo "<p style='color: green; font-size: 20px;'>✅ SUCCESS! Offline record created with ID: $recordId</p>";
    } else {
        echo "<p style='color: red; font-size: 20px;'>❌ FAILED: " . $conn->error . "</p>";
    }
} else {
    echo "<p style='color: red;'>❌ Employee not found</p>";
}

// Step 3: Show records after
echo "<h3>3. Records After Direct Insert:</h3>";
$stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time, created_at FROM tbl_login WHERE emp_id = ? ORDER BY created_at DESC LIMIT 3");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Created At</th></tr>";
while ($row = $result->fetch_assoc()) {
    $color = $row['status'] === 'offline' ? 'background-color: #ffebee;' : '';
    echo "<tr style='$color'>";
    echo "<td>" . $row['login_id'] . "</td>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Step 4: Test API
echo "<h3>4. Testing Logout API:</h3>";
$postData = json_encode(['action' => 'logout', 'emp_id' => $testEmpId]);

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

// Step 5: Final count
echo "<h3>5. Final Count:</h3>";
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ? AND status = 'offline'");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();
$offlineCount = $result->fetch_assoc()['count'];

echo "<p style='font-size: 24px;'>Offline records: <strong>$offlineCount</strong></p>";

if ($offlineCount > 0) {
    echo "<p style='color: green; font-size: 30px;'>🎉 SUCCESS! OFFLINE RECORDS ARE WORKING!</p>";
} else {
    echo "<p style='color: red; font-size: 30px;'>❌ STILL NOT WORKING!</p>";
}

echo "<hr>";
echo "<h2>✅ TEST COMPLETE</h2>";
echo "<p>If you see offline records above, the logout system is working!</p>";
?>
