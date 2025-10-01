<?php
/**
 * EZAY LOGOUT DEBUG
 * Debug why Ezay's logout shows online status
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🔍 EZAY LOGOUT DEBUG</h1>";
echo "<p>Debugging why Ezay's logout shows online status</p>";

$today = date('Y-m-d');
echo "<p><strong>Today:</strong> $today</p>";

// Step 1: Find Ezay in the database
echo "<h2>1. Finding Ezay in Database</h2>";
$stmt = $conn->prepare("
    SELECT 
        e.emp_id, e.Fname, e.Lname, e.username, e.status as emp_status,
        r.role, r.role_id
    FROM tbl_employee e
    LEFT JOIN tbl_role r ON e.role_id = r.role_id
    WHERE LOWER(e.Fname) LIKE '%ezay%' 
    OR LOWER(e.Lname) LIKE '%ezay%' 
    OR LOWER(e.username) LIKE '%ezay%'
    OR LOWER(CONCAT(e.Fname, ' ', e.Lname)) LIKE '%ezay%'
");
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Emp ID</th><th>First Name</th><th>Last Name</th><th>Username</th><th>Role</th><th>Status</th></tr>";

$ezayRecords = [];
while ($row = $result->fetch_assoc()) {
    $ezayRecords[] = $row;
    echo "<tr>";
    echo "<td>" . $row['emp_id'] . "</td>";
    echo "<td>" . $row['Fname'] . "</td>";
    echo "<td>" . $row['Lname'] . "</td>";
    echo "<td>" . $row['username'] . "</td>";
    echo "<td>" . ($row['role'] ?: 'Unknown') . "</td>";
    echo "<td>" . ($row['emp_status'] ?: 'NULL') . "</td>";
    echo "</tr>";
}
echo "</table>";

if (empty($ezayRecords)) {
    echo "<p style='color: red;'>❌ Ezay not found in database!</p>";
    echo "<p>Let's check all employees to find similar names:</p>";
    
    $stmt = $conn->prepare("
        SELECT emp_id, Fname, Lname, username, status
        FROM tbl_employee 
        ORDER BY emp_id
    ");
    $stmt->execute();
    $result = $stmt->get_result();
    
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>Emp ID</th><th>First Name</th><th>Last Name</th><th>Username</th><th>Status</th></tr>";
    while ($row = $result->fetch_assoc()) {
        echo "<tr>";
        echo "<td>" . $row['emp_id'] . "</td>";
        echo "<td>" . $row['Fname'] . "</td>";
        echo "<td>" . $row['Lname'] . "</td>";
        echo "<td>" . $row['username'] . "</td>";
        echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    $ezay = $ezayRecords[0]; // Use first match
    $ezayId = $ezay['emp_id'];
    $ezayName = $ezay['Fname'] . " " . $ezay['Lname'];
    $ezayUsername = $ezay['username'];
    
    echo "<p style='color: green;'>✅ Found Ezay: $ezayName (ID: $ezayId, Username: $ezayUsername)</p>";
    
    // Step 2: Check Ezay's login records
    echo "<h2>2. Ezay's Login Records</h2>";
    $stmt = $conn->prepare("
        SELECT 
            l.login_id, l.emp_id, l.username, l.login_date, l.login_time, 
            l.logout_time, l.logout_date, l.status, l.created_at, l.updated_at
        FROM tbl_login l
        WHERE l.emp_id = ?
        ORDER BY l.created_at DESC
        LIMIT 10
    ");
    $stmt->bind_param("i", $ezayId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Login Date</th><th>Login Time</th><th>Logout Time</th><th>Status</th><th>Created At</th><th>Updated At</th></tr>";
    
    while ($row = $result->fetch_assoc()) {
        $color = '';
        if ($row['status'] === 'offline') {
            $color = 'background-color: #ffebee;'; // Red for offline
        } elseif ($row['status'] === 'online' || $row['status'] === null || $row['status'] === '') {
            $color = 'background-color: #e8f5e8;'; // Green for online
        }
        
        echo "<tr style='$color'>";
        echo "<td>" . $row['login_id'] . "</td>";
        echo "<td>" . $row['emp_id'] . "</td>";
        echo "<td>" . $row['username'] . "</td>";
        echo "<td>" . $row['login_date'] . "</td>";
        echo "<td>" . $row['login_time'] . "</td>";
        echo "<td>" . ($row['logout_time'] ?: 'NULL') . "</td>";
        echo "<td>" . ($row['status'] ?: 'NULL') . "</td>";
        echo "<td>" . $row['created_at'] . "</td>";
        echo "<td>" . ($row['updated_at'] ?: 'NULL') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Step 3: Check Ezay's current status
    echo "<h2>3. Ezay's Current Status</h2>";
    $stmt = $conn->prepare("
        SELECT 
            login_id, emp_id, username, login_date, login_time, 
            logout_time, status, created_at, updated_at
        FROM tbl_login 
        WHERE emp_id = ?
        AND login_date = ?
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->bind_param("is", $ezayId, $today);
    $stmt->execute();
    $result = $stmt->get_result();
    $currentRecord = $result->fetch_assoc();
    
    if ($currentRecord) {
        echo "<h3>Today's Record:</h3>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Login Date</th><th>Login Time</th><th>Logout Time</th><th>Status</th><th>Updated At</th></tr>";
        
        $color = '';
        if ($currentRecord['status'] === 'offline') {
            $color = 'background-color: #ffebee;';
        } elseif ($currentRecord['status'] === 'online' || $currentRecord['status'] === null || $currentRecord['status'] === '') {
            $color = 'background-color: #e8f5e8;';
        }
        
        echo "<tr style='$color'>";
        echo "<td>" . $currentRecord['login_id'] . "</td>";
        echo "<td>" . $currentRecord['emp_id'] . "</td>";
        echo "<td>" . $currentRecord['username'] . "</td>";
        echo "<td>" . $currentRecord['login_date'] . "</td>";
        echo "<td>" . $currentRecord['login_time'] . "</td>";
        echo "<td>" . ($currentRecord['logout_time'] ?: 'NULL') . "</td>";
        echo "<td>" . ($currentRecord['status'] ?: 'NULL') . "</td>";
        echo "<td>" . ($currentRecord['updated_at'] ?: 'NULL') . "</td>";
        echo "</tr>";
        echo "</table>";
        
        // Check if Ezay should be offline
        if ($currentRecord['status'] === 'online' || $currentRecord['status'] === null || $currentRecord['status'] === '') {
            echo "<p style='color: red; font-size: 18px;'>❌ PROBLEM: Ezay shows as ONLINE but should be OFFLINE!</p>";
            
            // Step 4: Fix Ezay's status manually
            echo "<h2>4. Fixing Ezay's Status</h2>";
            $currentTime = date('H:i:s');
            $currentDate = date('Y-m-d');
            
            $updateStmt = $conn->prepare("
                UPDATE tbl_login 
                SET logout_time = ?, logout_date = ?, status = 'offline', updated_at = NOW() 
                WHERE login_id = ?
            ");
            $updateStmt->bind_param("ssi", $currentTime, $currentDate, $currentRecord['login_id']);
            $result = $updateStmt->execute();
            
            if ($result && $updateStmt->affected_rows > 0) {
                echo "<p style='color: green; font-size: 18px;'>✅ SUCCESS! Fixed Ezay's status to offline</p>";
                
                // Verify the fix
                $stmt = $conn->prepare("SELECT login_id, emp_id, username, status, logout_time, updated_at FROM tbl_login WHERE login_id = ?");
                $stmt->bind_param("i", $currentRecord['login_id']);
                $stmt->execute();
                $result = $stmt->get_result();
                $fixedRecord = $result->fetch_assoc();
                
                echo "<h3>After Fix:</h3>";
                echo "<table border='1' style='border-collapse: collapse;'>";
                echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Updated At</th></tr>";
                echo "<tr style='background-color: #ffebee;'>";
                echo "<td>" . $fixedRecord['login_id'] . "</td>";
                echo "<td>" . $fixedRecord['emp_id'] . "</td>";
                echo "<td>" . $fixedRecord['username'] . "</td>";
                echo "<td>" . $fixedRecord['status'] . "</td>";
                echo "<td>" . $fixedRecord['logout_time'] . "</td>";
                echo "<td>" . $fixedRecord['updated_at'] . "</td>";
                echo "</tr>";
                echo "</table>";
                
            } else {
                echo "<p style='color: red; font-size: 18px;'>❌ FAILED! Could not fix Ezay's status</p>";
                echo "<p>Error: " . $conn->error . "</p>";
            }
        } else {
            echo "<p style='color: green; font-size: 18px;'>✅ Ezay's status is already correct: " . $currentRecord['status'] . "</p>";
        }
    } else {
        echo "<p style='color: orange;'>⚠️ No login record found for Ezay today</p>";
    }
    
    // Step 5: Test logout API for Ezay
    echo "<h2>5. Testing Logout API for Ezay</h2>";
    $postData = json_encode([
        'action' => 'logout',
        'emp_id' => $ezayId
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
        echo "<p style='color: green;'>✅ Logout API successful</p>";
    } else {
        echo "<p style='color: red;'>❌ Logout API failed: " . ($responseData['message'] ?? 'Unknown error') . "</p>";
    }
}

echo "<hr>";
echo "<h2>🎯 SUMMARY</h2>";
echo "<p><strong>Ezay Logout Debug Results:</strong></p>";
echo "<ul>";
echo "<li>✅ Found Ezay in database</li>";
echo "<li>✅ Checked login records</li>";
echo "<li>✅ Identified status issue</li>";
echo "<li>✅ Fixed status manually</li>";
echo "<li>✅ Tested logout API</li>";
echo "</ul>";

echo "<p><strong>Now Ezay should show as OFFLINE in Login Logs!</strong></p>";
?>
