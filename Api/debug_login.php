<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'conn_mysqli.php';

// Debug login function
function debugLogin($data) {
    global $conn;
    
    $username = isset($data['username']) ? trim($data['username']) : '';
    $password = isset($data['password']) ? trim($data['password']) : '';
    $captcha = isset($data['captcha']) ? trim($data['captcha']) : '';
    $captchaAnswer = isset($data['captchaAnswer']) ? trim($data['captchaAnswer']) : '';
    
    $debug = [];
    
    // Step 1: Validate inputs
    $debug['step1'] = [
        'username' => $username,
        'password_length' => strlen($password),
        'captcha' => $captcha,
        'captchaAnswer' => $captchaAnswer,
        'captcha_match' => ($captcha === $captchaAnswer)
    ];
    
    if (empty($username) || empty($password)) {
        return json_encode(['success' => false, 'message' => 'Username and password are required', 'debug' => $debug]);
    }
    
    if (empty($captcha) || empty($captchaAnswer) || $captcha !== $captchaAnswer) {
        return json_encode(['success' => false, 'message' => 'Invalid captcha', 'debug' => $debug]);
    }
    
    // Step 2: Get user data
    $stmt = $conn->prepare("
        SELECT e.emp_id, e.username, e.password, e.status, e.Fname, e.Lname, e.role_id, e.shift_id, r.role 
        FROM tbl_employee e 
        JOIN tbl_role r ON e.role_id = r.role_id 
        WHERE e.username = ?
    ");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    $debug['step2'] = [
        'user_found' => !empty($user),
        'user_data' => $user ? [
            'emp_id' => $user['emp_id'],
            'username' => $user['username'],
            'password_length' => strlen($user['password']),
            'password_start' => substr($user['password'], 0, 10) . '...',
            'status' => $user['status'],
            'role' => $user['role']
        ] : null
    ];
    
    if (!$user) {
        return json_encode(['success' => false, 'message' => 'User not found', 'debug' => $debug]);
    }
    
    // Step 3: Check user status
    $debug['step3'] = [
        'user_status' => $user['status'],
        'status_check' => strcasecmp($user['status'] ?? '', 'Active')
    ];
    
    if (strcasecmp($user['status'] ?? '', 'Active') !== 0) {
        return json_encode(['success' => false, 'message' => 'User is inactive', 'debug' => $debug]);
    }
    
    // Step 4: Verify password
    $passwordValid = false;
    $passwordMethod = '';
    
    // Try hashed password first
    if (password_verify($password, $user['password'])) {
        $passwordValid = true;
        $passwordMethod = 'hashed';
    } 
    // Try plain text comparison
    elseif ($password === $user['password']) {
        $passwordValid = true;
        $passwordMethod = 'plain_text';
    }
    
    $debug['step4'] = [
        'password_valid' => $passwordValid,
        'password_method' => $passwordMethod,
        'input_password' => $password,
        'stored_password_start' => substr($user['password'], 0, 10) . '...',
        'password_verify_result' => password_verify($password, $user['password']),
        'plain_text_match' => ($password === $user['password'])
    ];
    
    if (!$passwordValid) {
        return json_encode(['success' => false, 'message' => 'Invalid password', 'debug' => $debug]);
    }
    
    // Step 5: Success
    $debug['step5'] = [
        'login_successful' => true,
        'user_id' => $user['emp_id'],
        'full_name' => $user['Fname'] . ' ' . $user['Lname'],
        'role' => $user['role']
    ];
    
    return json_encode([
        'success' => true, 
        'message' => 'Login successful',
        'user_id' => $user['emp_id'],
        'full_name' => $user['Fname'] . ' ' . $user['Lname'],
        'role' => $user['role'],
        'debug' => $debug
    ]);
}

// Main execution
try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'debug_login':
            echo debugLogin($input);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }

} catch (Exception $e) {
    error_log("Debug Login API error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>
