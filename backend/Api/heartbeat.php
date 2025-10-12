<?php
/**
 * Heartbeat API - Real-time Online/Offline Status Detection
 * 
 * This endpoint updates the last_seen timestamp for logged-in users
 * to enable real-time detection of online/offline status
 * 
 * Frontend calls this every 30 seconds to maintain "online" status
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/conn.php';

try {
    // Get database connection
    $conn = getDatabaseConnection();
    
    // Get input data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['action'])) {
        throw new Exception('Invalid request: action required');
    }
    
    $action = $input['action'];
    
    switch ($action) {
        case 'heartbeat':
            // Update last_seen timestamp for the logged-in user
            $empId = $input['emp_id'] ?? null;
            $loginId = $input['login_id'] ?? null;
            
            if (!$empId) {
                throw new Exception('Employee ID required');
            }
            
            // Find the most recent active login record for this employee
            $stmt = $conn->prepare("
                SELECT login_id 
                FROM tbl_login 
                WHERE emp_id = ? 
                AND login_date = CURDATE()
                AND status = 'online'
                AND (logout_time IS NULL OR logout_time = '00:00:00')
                ORDER BY login_id DESC 
                LIMIT 1
            ");
            $stmt->execute([$empId]);
            $loginRecord = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($loginRecord) {
                // Update last_seen timestamp
                $updateStmt = $conn->prepare("
                    UPDATE tbl_login 
                    SET last_seen = NOW()
                    WHERE login_id = ?
                ");
                $updateStmt->execute([$loginRecord['login_id']]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Heartbeat received',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'login_id' => $loginRecord['login_id']
                ]);
            } else {
                // No active login found - user might have been logged out
                echo json_encode([
                    'success' => false,
                    'message' => 'No active login session found',
                    'should_relogin' => true
                ]);
            }
            break;
            
        case 'check_status':
            // Check if user is still online based on last_seen
            $empId = $input['emp_id'] ?? null;
            
            if (!$empId) {
                throw new Exception('Employee ID required');
            }
            
            // Check last_seen within 2 minutes = online
            $stmt = $conn->prepare("
                SELECT 
                    login_id,
                    status,
                    last_seen,
                    TIMESTAMPDIFF(SECOND, last_seen, NOW()) as seconds_since_seen
                FROM tbl_login 
                WHERE emp_id = ? 
                AND login_date = CURDATE()
                AND (logout_time IS NULL OR logout_time = '00:00:00')
                ORDER BY login_id DESC 
                LIMIT 1
            ");
            $stmt->execute([$empId]);
            $loginRecord = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($loginRecord) {
                // Consider online if seen within last 120 seconds (2 minutes)
                $isOnline = ($loginRecord['seconds_since_seen'] <= 120) && ($loginRecord['status'] === 'online');
                
                echo json_encode([
                    'success' => true,
                    'is_online' => $isOnline,
                    'last_seen' => $loginRecord['last_seen'],
                    'seconds_since_seen' => $loginRecord['seconds_since_seen']
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'is_online' => false,
                    'message' => 'No active login session'
                ]);
            }
            break;
            
        case 'auto_cleanup':
            // Automatically mark users as offline if no heartbeat for > 2 minutes
            // This should be called periodically by a cron job or scheduled task
            
            $stmt = $conn->prepare("
                UPDATE tbl_login 
                SET status = 'offline',
                    logout_time = TIME(last_seen),
                    logout_date = DATE(last_seen)
                WHERE status = 'online'
                AND login_date = CURDATE()
                AND (logout_time IS NULL OR logout_time = '00:00:00')
                AND TIMESTAMPDIFF(SECOND, last_seen, NOW()) > 120
            ");
            
            $stmt->execute();
            $affectedRows = $stmt->rowCount();
            
            echo json_encode([
                'success' => true,
                'message' => 'Auto cleanup completed',
                'users_marked_offline' => $affectedRows
            ]);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => $e->getMessage() // Keep for backward compatibility
    ]);
}

