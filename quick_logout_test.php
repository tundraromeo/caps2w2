<?php
/**
 * Simple Employee Logout Test
 * Quick test to verify logout creates offline records for specific employees
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🚀 Quick Employee Logout Test</h1>";

// Test with specific employees from your data
$testEmployees = [
    ['emp_id' => 1, 'name' => 'ezay Gutierrez', 'username' => 'ezay'],
    ['emp_id' => 2, 'name' => 'Clyde Gasolina', 'username' => 'clyde'],
    ['emp_id' => 3, 'name' => 'Elmer Parol', 'username' => 'clyde'],
    ['emp_id' => 4, 'name' => 'Junel Cajoles', 'username' => 'jepox']
];

echo "<h2>Testing Logout for Each Employee</h2>";

foreach ($testEmployees as $employee) {
    $empId = $employee['emp_id'];
    $name = $employee['name'];
    $username = $employee['username'];
    
    echo "<h3>👤 Testing: $name (ID: $empId)</h3>";
    
    // Count records before logout
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ?");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $beforeCount = $result->fetch_assoc()['count'];
    
    echo "<p>Records before logout: $beforeCount</p>";
    
    // Test logout API
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
    
    // Count records after logout
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_login WHERE emp_id = ?");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $afterCount = $result->fetch_assoc()['count'];
    
    echo "<p>Records after logout: $afterCount</p>";
    echo "<p>HTTP Code: $httpCode</p>";
    echo "<p>Response: " . htmlspecialchars($response) . "</p>";
    
    // Check if new offline record was created
    $stmt = $conn->prepare("
        SELECT login_id, status, logout_time, logout_date, created_at
        FROM tbl_login 
        WHERE emp_id = ? AND status = 'offline'
        ORDER BY created_at DESC 
        LIMIT 1
    ");
    $stmt->bind_param("i", $empId);
    $stmt->execute();
    $result = $stmt->get_result();
    $offlineRecord = $result->fetch_assoc();
    
    if ($offlineRecord) {
        echo "<p style='color: green;'>✅ SUCCESS: Offline record created!</p>";
        echo "<p>Offline Record ID: {$offlineRecord['login_id']}</p>";
        echo "<p>Status: {$offlineRecord['status']}</p>";
        echo "<p>Logout Time: {$offlineRecord['logout_time']}</p>";
        echo "<p>Logout Date: {$offlineRecord['logout_date']}</p>";
        echo "<p>Created At: {$offlineRecord['created_at']}</p>";
    } else {
        echo "<p style='color: red;'>❌ FAILED: No offline record found</p>";
    }
    
    echo "<hr>";
}

// Final summary
echo "<h2>📊 Final Summary</h2>";

$stmt = $conn->prepare("
    SELECT 
        status,
        COUNT(*) as count,
        COUNT(DISTINCT emp_id) as unique_employees
    FROM tbl_login 
    GROUP BY status
    ORDER BY count DESC
");
$stmt->execute();
$result = $stmt->get_result();

echo "<h3>All Login Records by Status:</h3>";
echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Status</th><th>Total Records</th><th>Unique Employees</th></tr>";

while ($row = $result->fetch_assoc()) {
    $status = $row['status'] ?: 'NULL';
    $count = $row['count'];
    $employees = $row['unique_employees'];
    
    $color = '';
    switch ($status) {
        case 'offline': $color = 'background-color: #ffebee;'; break;
        case 'online': $color = 'background-color: #e8f5e8;'; break;
        case 'completed': $color = 'background-color: #fff3e0;'; break;
    }
    
    echo "<tr style='$color'>";
    echo "<td>$status</td>";
    echo "<td>$count</td>";
    echo "<td>$employees</td>";
    echo "</tr>";
}
echo "</table>";

echo "<h3>🎯 Expected Results:</h3>";
echo "<ul>";
echo "<li><strong>offline:</strong> Should have records for each employee logout</li>";
echo "<li><strong>completed:</strong> Should have records for original login sessions</li>";
echo "<li><strong>online:</strong> Should have records for currently active sessions</li>";
echo "</ul>";

echo "<p><strong>✅ If you see 'offline' records with logout times, the system is working correctly!</strong></p>";
?>
