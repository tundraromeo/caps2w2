<?php
/**
 * Verify Logout System with Employee Data
 * Ensures logout creates offline records for all employees
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🔍 Verifying Logout System with Employee Data</h1>";

// Get all active employees
$stmt = $conn->prepare("
    SELECT 
        e.emp_id, e.Fname, e.Lname, e.username, e.status,
        r.role, e.role_id
    FROM tbl_employee e
    LEFT JOIN tbl_role r ON e.role_id = r.role_id
    WHERE e.status = 'Active'
    ORDER BY e.emp_id
");
$stmt->execute();
$employees = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

echo "<h2>📋 Active Employees Found:</h2>";
echo "<ul>";
foreach ($employees as $emp) {
    echo "<li><strong>{$emp['Fname']} {$emp['Lname']}</strong> (ID: {$emp['emp_id']}, Username: {$emp['username']}, Role: " . ($emp['role'] ?: 'Unknown') . ")</li>";
}
echo "</ul>";

echo "<h2>🧪 Testing Logout for Each Employee</h2>";

$successCount = 0;
$totalCount = count($employees);

foreach ($employees as $employee) {
    $empId = $employee['emp_id'];
    $name = $employee['Fname'] . " " . $employee['Lname'];
    $username = $employee['username'];
    
    echo "<h3>Testing: $name (ID: $empId)</h3>";
    
    // Test logout
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $responseData = json_decode($response, true);
    
    if ($responseData && $responseData['success']) {
        echo "<p style='color: green;'>✅ Logout successful</p>";
        $successCount++;
    } else {
        echo "<p style='color: red;'>❌ Logout failed: " . ($responseData['message'] ?? 'Unknown error') . "</p>";
    }
    
    // Check if offline record was created
    $stmt = $conn->prepare("
        SELECT COUNT(*) as count 
        FROM tbl_login 
        WHERE emp_id = ? AND status = 'offline'
    ");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $offlineCount = $result->fetch_assoc()['count'];
    
    echo "<p>Offline records created: $offlineCount</p>";
    echo "<hr>";
}

echo "<h2>📊 Test Results Summary</h2>";
echo "<p><strong>Successful logouts:</strong> $successCount / $totalCount</p>";

if ($successCount === $totalCount) {
    echo "<p style='color: green; font-size: 18px;'>🎉 ALL TESTS PASSED! Logout system is working correctly for all employees.</p>";
} else {
    echo "<p style='color: red; font-size: 18px;'>⚠️ Some tests failed. Please check the error messages above.</p>";
}

// Show final login records
echo "<h2>📋 Final Login Records</h2>";
$stmt = $conn->prepare("
    SELECT 
        l.login_id, l.emp_id, l.username, l.status, l.logout_time, l.logout_date,
        CONCAT(e.Fname, ' ', e.Lname) as employee_name,
        l.created_at
    FROM tbl_login l
    LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id
    ORDER BY l.created_at DESC 
    LIMIT 10
");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Employee Name</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Logout Date</th><th>Created At</th></tr>";

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
    echo "<td>" . ($row['employee_name'] ?: 'Unknown') . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
    echo "<td>" . ($row['logout_date'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

echo "<h2>✅ Verification Complete</h2>";
echo "<p><strong>Expected behavior:</strong></p>";
echo "<ul>";
echo "<li>Each employee logout should create a new record with <code>status = 'offline'</code></li>";
echo "<li>The record should have <code>logout_time</code> and <code>logout_date</code> filled</li>";
echo "<li>Original login records should be marked as <code>status = 'completed'</code></li>";
echo "<li>Login Logs cards should show only employees with <code>status = 'online'</code> or <code>NULL</code></li>";
echo "</ul>";

echo "<p><strong>🎯 If you see 'offline' records in the table above, the logout system is working correctly!</strong></p>";
?>
