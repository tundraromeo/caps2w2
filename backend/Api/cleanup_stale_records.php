<?php
require_once 'conn.php';

try {
    $conn = getDatabaseConnection();
    
    echo "=== CLEANING UP STALE ONLINE RECORDS ===\n\n";
    
    // Find stale online records (older than 5 minutes)
    echo "✓ Finding stale online records (older than 5 minutes)...\n";
    $stmt = $conn->query("
        SELECT 
            COUNT(*) as stale_count,
            GROUP_CONCAT(DISTINCT username) as usernames
        FROM tbl_login 
        WHERE status = 'online'
        AND (logout_time IS NULL OR logout_time = '00:00:00')
        AND TIMESTAMPDIFF(MINUTE, last_seen, NOW()) > 5
    ");
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $staleCount = $result['stale_count'];
    $usernames = $result['usernames'];
    
    if ($staleCount > 0) {
        echo "  Found {$staleCount} stale online records for users: {$usernames}\n";
        
        echo "\n✓ Cleaning up stale records...\n";
        
        // Update stale records to offline
        $updateStmt = $conn->prepare("
            UPDATE tbl_login 
            SET status = 'offline',
                logout_time = CURTIME(),
                logout_date = CURDATE()
            WHERE status = 'online'
            AND (logout_time IS NULL OR logout_time = '00:00:00')
            AND TIMESTAMPDIFF(MINUTE, last_seen, NOW()) > 5
        ");
        
        $updateStmt->execute();
        $updatedCount = $updateStmt->rowCount();
        
        echo "  ✅ Successfully updated {$updatedCount} records to offline\n";
        
    } else {
        echo "  ✅ No stale online records found\n";
    }
    
    echo "\n✓ Checking remaining online users...\n";
    
    // Check remaining online users
    $stmt = $conn->query("
        SELECT 
            username,
            last_seen,
            TIMESTAMPDIFF(SECOND, last_seen, NOW()) as seconds_since_seen
        FROM tbl_login 
        WHERE status = 'online'
        AND (logout_time IS NULL OR logout_time = '00:00:00')
        ORDER BY last_seen DESC
    ");
    
    $onlineUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($onlineUsers) > 0) {
        echo "  Remaining online users:\n";
        foreach($onlineUsers as $user) {
            echo "    - {$user['username']} (Last seen: {$user['last_seen']}, {$user['seconds_since_seen']} seconds ago)\n";
        }
    } else {
        echo "  ✅ No online users remaining\n";
    }
    
    echo "\n=== AUTOMATIC LOGOUT IMPLEMENTATION ===\n\n";
    echo "✅ Added beforeunload event listener to both:\n";
    echo "   - frontend/app/admin/page.js\n";
    echo "   - frontend/app/Inventory_Con/page.js\n";
    echo "\n✅ Features implemented:\n";
    echo "   - Detects browser tab close\n";
    echo "   - Stops heartbeat service immediately\n";
    echo "   - Calls logout API\n";
    echo "   - Updates status to 'offline'\n";
    echo "   - Clears session storage\n";
    echo "   - Clears local storage\n";
    
    echo "\n=== TESTING INSTRUCTIONS ===\n\n";
    echo "1. Login to Admin Dashboard or Inventory\n";
    echo "2. Check Login Logs Report - should show ONLINE\n";
    echo "3. Close the browser tab (Ctrl+W or click X)\n";
    echo "4. Check Login Logs Report again - should show OFFLINE\n";
    echo "5. Check browser console for:\n";
    echo "   '🚪 Tab closing - Auto logout triggered'\n";
    echo "   '✅ Auto logout successful'\n";
    
    echo "\n=== EXPECTED BEHAVIOR ===\n\n";
    echo "✅ Tab close = Automatic logout\n";
    echo "✅ Status changes to OFFLINE\n";
    echo "✅ Login Logs Report updates\n";
    echo "✅ No more stale online records\n";
    echo "✅ Accurate online/offline status\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
