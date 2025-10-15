<?php
/**
 * Migration: Add last_seen column to tbl_login table
 * 
 * This migration adds the last_seen column to track real-time user activity
 * for accurate online/offline status detection via heartbeat service
 */

require_once __DIR__ . '/../conn.php';

try {
    $conn = getDatabaseConnection();
    
    // Check if last_seen column already exists
    $checkStmt = $conn->query("SHOW COLUMNS FROM tbl_login LIKE 'last_seen'");
    $exists = $checkStmt->rowCount() > 0;
    
    if ($exists) {
        echo "✅ Column 'last_seen' already exists in tbl_login table\n";
        exit(0);
    }
    
    // Add last_seen column
    echo "📝 Adding 'last_seen' column to tbl_login table...\n";
    
    $conn->exec("
        ALTER TABLE tbl_login 
        ADD COLUMN last_seen DATETIME DEFAULT NULL AFTER logout_date
    ");
    
    echo "✅ Successfully added 'last_seen' column to tbl_login table\n";
    
    // Update existing records to set last_seen to login_time for active sessions
    echo "📝 Updating existing active login records...\n";
    
    $conn->exec("
        UPDATE tbl_login 
        SET last_seen = CONCAT(login_date, ' ', login_time)
        WHERE status = 'online' 
        AND (logout_time IS NULL OR logout_time = '00:00:00')
        AND login_date = CURDATE()
    ");
    
    echo "✅ Migration completed successfully!\n";
    echo "💡 Users will now be automatically marked offline if they don't send heartbeat signals\n";
    
} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

