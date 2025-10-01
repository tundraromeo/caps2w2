<?php
/**
 * Step-by-Step Logout Test
 * Simulates the exact logout process
 */

require_once 'Api/conn_mysqli.php';

echo "<h1>🔬 Step-by-Step Logout Test</h1>";

// Test with emp_id = 1
$testEmpId = 1;

echo "<h2>Testing Logout Process for Employee ID: $testEmpId</h2>";

// Step 1: Simulate the LoginManager class
echo "<h3>Step 1: Creating LoginManager Instance</h3>";

class TestLoginManager {
    private $conn;
    
    public function __construct($connection) {
        $this->conn = $connection;
    }
    
    public function getUserById($empId) {
        $stmt = $this->conn->prepare("
            SELECT e.emp_id, e.username, e.Fname, e.Lname, r.role 
            FROM tbl_employee e 
            JOIN tbl_role r ON e.role_id = r.role_id 
            WHERE e.emp_id = ?
        ");
        $stmt->bind_param("i", $empId);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }
    
    public function updateLogoutTime($empId, $loginId) {
        if (!$empId) {
            echo "<p style='color: red;'>❌ No emp_id provided</p>";
            return 0;
        }

        $currentTime = date('H:i:s');
        $currentDate = date('Y-m-d');
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

        echo "<p>🕐 Current time: $currentTime</p>";
        echo "<p>📅 Current date: $currentDate</p>";
        echo "<p>🌐 IP address: $ipAddress</p>";

        // First, try to get user info for the logout record
        $userInfo = $this->getUserById($empId);
        if (!$userInfo) {
            echo "<p style='color: red;'>❌ User not found for emp_id: $empId</p>";
            return 0;
        }
        
        echo "<p style='color: green;'>✅ User found: " . $userInfo['Fname'] . " " . $userInfo['Lname'] . " (" . $userInfo['username'] . ")</p>";

        // Get the most recent login record to copy details
        $loginRecord = null;
        if ($loginId) {
            $stmt = $this->conn->prepare("
                SELECT * FROM tbl_login 
                WHERE login_id = ? AND emp_id = ? 
                ORDER BY login_id DESC LIMIT 1
            ");
            $stmt->bind_param("ii", $loginId, $empId);
            $stmt->execute();
            $result = $stmt->get_result();
            $loginRecord = $result->fetch_assoc();
            
            if ($loginRecord) {
                echo "<p style='color: green;'>✅ Found login record with ID: " . $loginRecord['login_id'] . "</p>";
            } else {
                echo "<p style='color: orange;'>⚠️ No login record found with ID: $loginId</p>";
            }
        }

        // If no specific login record found, get the most recent one
        if (!$loginRecord) {
            $stmt = $this->conn->prepare("
                SELECT * FROM tbl_login 
                WHERE emp_id = ? AND (logout_time IS NULL OR logout_time = '00:00:00')
                ORDER BY login_id DESC LIMIT 1
            ");
            $stmt->bind_param("i", $empId);
            $stmt->execute();
            $result = $stmt->get_result();
            $loginRecord = $result->fetch_assoc();
            
            if ($loginRecord) {
                echo "<p style='color: green;'>✅ Found recent login record with ID: " . $loginRecord['login_id'] . "</p>";
            } else {
                echo "<p style='color: orange;'>⚠️ No recent login record found</p>";
            }
        }

        // Create a separate logout record
        echo "<p>🔄 Creating separate logout record...</p>";
        
        $stmt = $this->conn->prepare("
            INSERT INTO tbl_login (
                emp_id, role_id, username, login_time, login_date, 
                logout_time, logout_date, status, ip_address, location, 
                terminal_id, shift_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'offline', ?, ?, ?, ?, NOW(), NOW())
        ");

        // Use login record details if available, otherwise use user info
        $roleId = $loginRecord['role_id'] ?? 0;
        $username = $loginRecord['username'] ?? $userInfo['username'] ?? 'Unknown';
        $loginTime = $loginRecord['login_time'] ?? '00:00:00';
        $loginDate = $loginRecord['login_date'] ?? $currentDate;
        $location = $loginRecord['location'] ?? 'System Logout';
        $terminalId = $loginRecord['terminal_id'] ?? null;
        $shiftId = $loginRecord['shift_id'] ?? null;

        echo "<p>📝 Using data:</p>";
        echo "<ul>";
        echo "<li>Role ID: $roleId</li>";
        echo "<li>Username: $username</li>";
        echo "<li>Login Time: $loginTime</li>";
        echo "<li>Login Date: $loginDate</li>";
        echo "<li>Location: $location</li>";
        echo "<li>Terminal ID: " . ($terminalId ?: 'NULL') . "</li>";
        echo "<li>Shift ID: " . ($shiftId ?: 'NULL') . "</li>";
        echo "</ul>";

        $stmt->bind_param("iisssssssii", 
            $empId, 
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
            $logoutRecordId = $this->conn->insert_id;
            echo "<p style='color: green;'>✅ Logout record created successfully! ID: $logoutRecordId</p>";
            
            // Also update the original login record to mark it as completed
            if ($loginRecord) {
                echo "<p>🔄 Updating original login record...</p>";
                $updateStmt = $this->conn->prepare("
                    UPDATE tbl_login 
                    SET logout_time = ?, logout_date = ?, status = 'completed', updated_at = NOW() 
                    WHERE login_id = ?
                ");
                $updateStmt->bind_param("ssi", $currentTime, $currentDate, $loginRecord['login_id']);
                $updateResult = $updateStmt->execute();
                
                if ($updateResult) {
                    echo "<p style='color: green;'>✅ Original login record updated successfully!</p>";
                } else {
                    echo "<p style='color: red;'>❌ Failed to update original login record: " . $this->conn->error . "</p>";
                }
            }
            
            return 1; // Success
        } else {
            echo "<p style='color: red;'>❌ Failed to create logout record: " . $this->conn->error . "</p>";
            return 0;
        }
    }
}

$loginManager = new TestLoginManager($conn);
echo "<p style='color: green;'>✅ LoginManager created successfully</p>";

// Step 2: Test getUserById
echo "<h3>Step 2: Testing getUserById</h3>";
$userInfo = $loginManager->getUserById($testEmpId);
if ($userInfo) {
    echo "<p style='color: green;'>✅ User found: " . $userInfo['Fname'] . " " . $userInfo['Lname'] . "</p>";
} else {
    echo "<p style='color: red;'>❌ User not found</p>";
    exit;
}

// Step 3: Test updateLogoutTime
echo "<h3>Step 3: Testing updateLogoutTime</h3>";
$result = $loginManager->updateLogoutTime($testEmpId, null);

if ($result === 1) {
    echo "<p style='color: green; font-size: 20px;'>🎉 SUCCESS! Logout process completed successfully!</p>";
} else {
    echo "<p style='color: red; font-size: 20px;'>❌ FAILED! Logout process failed!</p>";
}

// Step 4: Check final results
echo "<h3>Step 4: Checking Final Results</h3>";
$stmt = $conn->prepare("
    SELECT login_id, emp_id, username, status, logout_time, logout_date, created_at
    FROM tbl_login 
    WHERE emp_id = ?
    ORDER BY created_at DESC 
    LIMIT 5
");
$stmt->bind_param("i", $testEmpId);
$stmt->execute();
$result = $stmt->get_result();

echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>Login ID</th><th>Emp ID</th><th>Username</th><th>Status</th><th>Logout Time</th><th>Logout Date</th><th>Created At</th></tr>";

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
    echo "<td>" . ($row['logout_date'] ?: 'NULL') . "</td>";
    echo "<td>" . $row['created_at'] . "</td>";
    echo "</tr>";
}
echo "</table>";

echo "<hr>";
echo "<h2>🎯 Final Summary</h2>";
echo "<p>This step-by-step test shows exactly what happens during the logout process.</p>";
echo "<p><strong>If you see a new 'offline' record in the table above, the logout system is working!</strong></p>";
?>
