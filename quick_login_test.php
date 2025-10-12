<?php
/**
 * Quick Login Test & Session Fix
 * This script helps you:
 * 1. Check if session is properly set
 * 2. Test login functionality
 * 3. Manually create a session for testing
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/conn.php';

session_start();

$action = $_GET['action'] ?? ($_POST['action'] ?? 'check_session');

switch ($action) {
    case 'check_session':
        echo json_encode([
            'success' => true,
            'session_id' => session_id(),
            'has_user_id' => isset($_SESSION['user_id']),
            'has_emp_id' => isset($_SESSION['emp_id']),
            'has_username' => isset($_SESSION['username']),
            'has_role' => isset($_SESSION['role']),
            'session_data' => $_SESSION,
            'message' => 'Session status checked'
        ]);
        break;
        
    case 'quick_login':
        // Quick login for testing - creates a valid session
        try {
            // Get first active employee from database
            $stmt = $conn->prepare("
                SELECT e.emp_id, e.username, e.Fname, e.Lname, e.role_id, r.role
                FROM tbl_employee e
                LEFT JOIN tbl_role r ON e.role_id = r.role_id
                WHERE e.status = 'Active'
                AND (r.role LIKE '%Inventory%' OR r.role LIKE '%Admin%' OR r.role LIKE '%Manager%')
                LIMIT 1
            ");
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                // Set session variables
                $_SESSION['user_id'] = $user['emp_id'];
                $_SESSION['emp_id'] = $user['emp_id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role'] = $user['role'];
                $_SESSION['full_name'] = $user['Fname'] . ' ' . $user['Lname'];
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Quick login successful',
                    'user' => [
                        'emp_id' => $user['emp_id'],
                        'username' => $user['username'],
                        'full_name' => $user['Fname'] . ' ' . $user['Lname'],
                        'role' => $user['role']
                    ],
                    'session_id' => session_id()
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'No active inventory/admin user found in database'
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ]);
        }
        break;
        
    case 'manual_login':
        // Manual login with username/password
        try {
            $rawData = file_get_contents("php://input");
            $data = json_decode($rawData, true);
            
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            
            if (empty($username) || empty($password)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Username and password required'
                ]);
                break;
            }
            
            $stmt = $conn->prepare("
                SELECT e.emp_id, e.username, e.password, e.Fname, e.Lname, e.role_id, e.status, r.role
                FROM tbl_employee e
                LEFT JOIN tbl_role r ON e.role_id = r.role_id
                WHERE e.username = ?
            ");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                echo json_encode([
                    'success' => false,
                    'message' => 'User not found'
                ]);
                break;
            }
            
            if ($user['status'] !== 'Active') {
                echo json_encode([
                    'success' => false,
                    'message' => 'User is inactive'
                ]);
                break;
            }
            
            // Check password
            $passwordValid = false;
            if (password_verify($password, $user['password'])) {
                $passwordValid = true;
            } elseif ($password === $user['password']) {
                // Plain text password (for backward compatibility)
                $passwordValid = true;
            }
            
            if (!$passwordValid) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid password'
                ]);
                break;
            }
            
            // Set session variables
            $_SESSION['user_id'] = $user['emp_id'];
            $_SESSION['emp_id'] = $user['emp_id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['full_name'] = $user['Fname'] . ' ' . $user['Lname'];
            
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'emp_id' => $user['emp_id'],
                    'username' => $user['username'],
                    'full_name' => $user['Fname'] . ' ' . $user['Lname'],
                    'role' => $user['role']
                ],
                'session_id' => session_id()
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ]);
        }
        break;
        
    case 'clear_session':
        $_SESSION = [];
        session_destroy();
        echo json_encode([
            'success' => true,
            'message' => 'Session cleared'
        ]);
        break;
        
    case 'get_test_users':
        // Get list of available test users
        try {
            $stmt = $conn->prepare("
                SELECT e.emp_id, e.username, e.Fname, e.Lname, e.status, r.role
                FROM tbl_employee e
                LEFT JOIN tbl_role r ON e.role_id = r.role_id
                WHERE e.status = 'Active'
                ORDER BY 
                    CASE 
                        WHEN r.role LIKE '%Admin%' THEN 1
                        WHEN r.role LIKE '%Inventory%' THEN 2
                        WHEN r.role LIKE '%Manager%' THEN 3
                        ELSE 4
                    END,
                    e.emp_id
                LIMIT 10
            ");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'users' => $users,
                'message' => 'Found ' . count($users) . ' active users'
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ]);
        }
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Unknown action',
            'available_actions' => [
                'check_session',
                'quick_login',
                'manual_login',
                'clear_session',
                'get_test_users'
            ]
        ]);
        break;
}
?>

