<?php
/**
 * Debug Logout Issue
 * Let's see what's happening with the logout system
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🔍 Debug Logout Issue</h1>";

// Test 1: Check if we can connect to the database
echo "<h2>1. Database Connection Test</h2>";
if ($conn) {
    echo "<p style='color: green;'>✅ Database connection successful</p>";
} else {
    echo "<p style='color: red;'>❌ Database connection failed</p>";
    exit;
}

// Test 2: Check current tbl_login structure
echo "<h2>2. tbl_login Table Structure</h2>";
$stmt = $conn->prepare("DESCRIBE tbl_login");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
while ($row = $result->fetch_assoc()) {
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

// Test 3: Check current records
echo "<h2>3. Current tbl_login Records</h2>";
$stmt = $conn->prepare("
    SELECT 
        login_id, emp_id, username, login_date, login_time, 
        logout_time, logout_date, status, created_at
    FROM tbl_login 
    ORDER BY created_at DESC 
    LIMIT 10
");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Login Date</th><th>Login Time</th><th>Logout Time</th><th>Logout Date</th><th>Status</th><th>Created At</th></tr>";

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
    echo "<td>" . $row['login_date'] . "</td>";
    echo "<td>" . $row['login_time'] . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['logout_date'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Test 4: Test direct database insert
echo "<h2>4. Test Direct Database Insert</h2>";
$testEmpId = 1;
$currentTime = date('H:i:s');
$currentDate = date('Y-m-d');

echo "<p>Testing direct insert for emp_id: $testEmpId</p>";

try {
    $stmt = $conn->prepare("
        INSERT INTO tbl_login (
            emp_id, role_id, username, login_time, login_date, 
            logout_time, logout_date, status, ip_address, location, 
            terminal_id, shift_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'offline', ?, ?, ?, ?, NOW(), NOW())
    ");
    
    $roleId = 1;
    $username = 'test_user';
    $loginTime = '00:00:00';
    $loginDate = $currentDate;
    $ipAddress = '127.0.0.1';
    $location = 'Test Location';
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
        echo "<p style='color: green;'>✅ Direct insert successful! Insert ID: $insertId</p>";
    } else {
        echo "<p style='color: red;'>❌ Direct insert failed: " . $conn->error . "</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Direct insert error: " . $e->getMessage() . "</p>";
}

// Test 5: Test logout API directly
echo "<h2>5. Test Logout API</h2>";
$postData = json_encode([
    'action' => 'logout',
    'emp_id' => $testEmpId
]);

echo "<p>POST Data: " . htmlspecialchars($postData) . "</p>";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/Enguio_Project/Api/login.php');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_VERBOSE, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "<p>HTTP Code: $httpCode</p>";
echo "<p>Response: " . htmlspecialchars($response) . "</p>";
if ($curlError) {
    echo "<p style='color: red;'>CURL Error: $curlError</p>";
}

// Test 6: Check if API file exists and is accessible
echo "<h2>6. API File Check</h2>";
$apiFile = 'Api/login.php';
if (file_exists($apiFile)) {
    echo "<p style='color: green;'>✅ API file exists: $apiFile</p>";
    echo "<p>File size: " . filesize($apiFile) . " bytes</p>";
    echo "<p>Last modified: " . date('Y-m-d H:i:s', filemtime($apiFile)) . "</p>";
} else {
    echo "<p style='color: red;'>❌ API file not found: $apiFile</p>";
}

// Test 7: Check PHP error logs
echo "<h2>7. PHP Error Check</h2>";
$errorLog = 'php_errors.log';
if (file_exists($errorLog)) {
    echo "<p style='color: green;'>✅ Error log exists: $errorLog</p>";
    $errors = file_get_contents($errorLog);
    $recentErrors = array_slice(explode("\n", $errors), -10);
    echo "<h3>Recent errors:</h3>";
    echo "<pre>" . htmlspecialchars(implode("\n", $recentErrors)) . "</pre>";
} else {
    echo "<p style='color: orange;'>⚠️ Error log not found: $errorLog</p>";
}

// Test 8: Check records after tests
echo "<h2>8. Records After Tests</h2>";
$stmt = $conn->prepare("
    SELECT 
        login_id, emp_id, username, login_date, login_time, 
        logout_time, logout_date, status, created_at
    FROM tbl_login 
    WHERE emp_id = ?
    ORDER BY created_at DESC 
    LIMIT 5
");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Login Date</th><th>Login Time</th><th>Logout Time</th><th>Logout Date</th><th>Status</th><th>Created At</th></tr>";

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
    echo "<td>" . $row['login_date'] . "</td>";
    echo "<td>" . $row['login_time'] . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['logout_date'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

echo "<hr>";
echo "<h2>🎯 Debug Summary</h2>";
echo "<p>This debug script will help us identify why logout records are not being created.</p>";
echo "<p><strong>Check the results above to see:</strong></p>";
echo "<ul>";
echo "<li>If database connection is working</li>";
echo "<li>If direct database insert works</li>";
echo "<li>If the logout API is responding</li>";
echo "<li>If there are any PHP errors</li>";
echo "<li>If records are actually being created</li>";
echo "</ul>";
?>
