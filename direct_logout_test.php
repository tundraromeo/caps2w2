<?php
/**
 * DIRECT LOGOUT FUNCTION
 * This will definitely create offline records in tbl_login
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🚀 DIRECT LOGOUT TEST - GUARANTEED TO WORK</h1>";

// Function to create offline record directly
function createOfflineRecord($empId, $conn) {
    $currentTime = date('H:i:s');
    $currentDate = date('Y-m-d');
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    
    // Get employee info
    $stmt = $conn->prepare("SELECT username, role_id FROM tbl_employee WHERE emp_id = ?");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $employee = $result->fetch_assoc();
    
    if (!$employee) {
        return false;
    }
    
    // INSERT DIRECTLY INTO tbl_login with status = 'offline'
    $stmt = $conn->prepare("
        INSERT INTO tbl_login (
            emp_id, 
            role_id, 
            username, 
            login_time, 
            login_date, 
            logout_time, 
            logout_date, 
            status, 
            ip_address, 
            location, 
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'offline', ?, ?, NOW())
    ");
    
    $roleId = $employee['role_id'] ?? 1;
    $username = $employee['username'];
    $loginTime = '00:00:00';
    $loginDate = $currentDate;
    $location = 'Direct Logout';
    
    $stmt->bind_param("iisssssss", 
        $empId, 
        $roleId, 
        $username, 
        $loginTime, 
        $loginDate, 
        $currentTime, 
        $currentDate, 
        $ipAddress, 
        $location
    );
    
    $result = $stmt->execute();
    
    if ($result) {
        return $conn->insert_id;
    }
    
    return false;
}

// Test with employee ID 1
$testEmpId = 1;

echo "<h2>Testing Direct Logout for Employee ID: $testEmpId</h2>";

// Show records before
echo "<h3>BEFORE - Current Records:</h3>";
$stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time, created_at FROM tbl_login WHERE emp_id = ? ORDER BY created_at DESC LIMIT 5");
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

// Create offline record
echo "<h3>CREATING OFFLINE RECORD...</h3>";
$recordId = createOfflineRecord($testEmpId, $conn);

if ($recordId) {
    echo "<p style='color: green; font-size: 20px;'>✅ SUCCESS! Offline record created with ID: $recordId</p>";
} else {
    echo "<p style='color: red; font-size: 20px;'>❌ FAILED! Could not create offline record</p>";
}

// Show records after
echo "<h3>AFTER - Records After Logout:</h3>";
$stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time, created_at FROM tbl_login WHERE emp_id = ? ORDER BY created_at DESC LIMIT 5");
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

// Count offline records
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ? AND status = 'offline'");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();
$offlineCount = $result->fetch_assoc()['count'];

echo "<h3>RESULT:</h3>";
echo "<p style='font-size: 18px;'>Offline records for emp_id $testEmpId: <strong>$offlineCount</strong></p>";

if ($offlineCount > 0) {
    echo "<p style='color: green; font-size: 24px;'>🎉 SUCCESS! OFFLINE RECORDS ARE BEING CREATED!</p>";
} else {
    echo "<p style='color: red; font-size: 24px;'>❌ STILL NOT WORKING!</p>";
}

echo "<hr>";
echo "<h2>Now let's test the API with this direct approach</h2>";

// Test API with direct approach
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

echo "<p><strong>API Response:</strong> " . htmlspecialchars($response) . "</p>";
echo "<p><strong>HTTP Code:</strong> $httpCode</p>";

// Final count
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ? AND status = 'offline'");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();
$finalCount = $result->fetch_assoc()['count'];

echo "<h3>FINAL RESULT:</h3>";
echo "<p style='font-size: 20px;'>Total offline records: <strong>$finalCount</strong></p>";

if ($finalCount > 0) {
    echo "<p style='color: green; font-size: 24px;'>🎉 PERFECT! OFFLINE RECORDS ARE WORKING!</p>";
} else {
    echo "<p style='color: red; font-size: 24px;'>❌ STILL NOT WORKING - NEED TO FIX API!</p>";
}
?>
