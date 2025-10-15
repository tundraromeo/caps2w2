<?php
require_once 'conn.php';

try {
    $conn = getDatabaseConnection();
    
    echo "=== CHECKING LOGIN STATUS ===\n\n";
    
    // Check recent login records
    $stmt = $conn->query("
        SELECT 
            username, 
            status, 
            login_date, 
            login_time, 
            logout_time,
            last_seen
        FROM tbl_login 
        WHERE login_date = CURDATE() 
        ORDER BY login_id DESC 
        LIMIT 10
    ");
    
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($rows) > 0) {
        echo "Recent login records for today:\n";
        echo "Username | Status | Login Date | Login Time | Logout Time | Last Seen\n";
        echo "---------|--------|------------|------------|-------------|----------\n";
        
        foreach($rows as $row) {
            echo sprintf("%-8s | %-6s | %-10s | %-10s | %-11s | %s\n",
                $row['username'],
                $row['status'] ?: 'NULL',
                $row['login_date'],
                $row['login_time'],
                $row['logout_time'] ?: 'NULL',
                $row['last_seen'] ?: 'NULL'
            );
        }
    } else {
        echo "No login records found for today!\n";
    }
    
    echo "\n=== CHECKING STATUS COLUMN ===\n\n";
    
    // Check if status column exists
    $checkStmt = $conn->query("SHOW COLUMNS FROM tbl_login LIKE 'status'");
    $hasStatus = $checkStmt->rowCount() > 0;
    
    if ($hasStatus) {
        echo "✅ Status column exists\n";
        
        // Check status values
        $statusStmt = $conn->query("SELECT DISTINCT status FROM tbl_login WHERE status IS NOT NULL");
        $statuses = $statusStmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo "Status values found: " . implode(', ', $statuses) . "\n";
    } else {
        echo "❌ Status column does NOT exist!\n";
    }
    
    echo "\n=== CHECKING LAST_SEEN COLUMN ===\n\n";
    
    // Check if last_seen column exists
    $checkLastSeen = $conn->query("SHOW COLUMNS FROM tbl_login LIKE 'last_seen'");
    $hasLastSeen = $checkLastSeen->rowCount() > 0;
    
    if ($hasLastSeen) {
        echo "✅ Last_seen column exists\n";
    } else {
        echo "❌ Last_seen column does NOT exist!\n";
    }
    
    echo "\n=== RECOMMENDATIONS ===\n\n";
    
    if (!$hasStatus) {
        echo "1. Add status column to tbl_login table\n";
        echo "   ALTER TABLE tbl_login ADD COLUMN status VARCHAR(20) DEFAULT 'offline';\n\n";
    }
    
    if (!$hasLastSeen) {
        echo "2. Add last_seen column to tbl_login table\n";
        echo "   ALTER TABLE tbl_login ADD COLUMN last_seen DATETIME DEFAULT NULL;\n\n";
    }
    
    echo "3. Restart Apache after making changes\n";
    echo "4. Test login again\n\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
