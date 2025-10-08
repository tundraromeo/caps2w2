<?php
// Admin Module
// Handles admin-related functions including employee management

/**
 * Get admin employee information from database
 */
function handle_get_admin_employee_info($conn, $data) {
    try {
        // Get admin employee information from database
        $sql = "
            SELECT 
                CONCAT(Fname, ' ', Lname) as fullName,
                email,
                role_id,
                username
            FROM tbl_employee 
            WHERE role_id = 1 AND status = 'active'
            LIMIT 1
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'fullName' => $result['fullName'] ?: 'Admin User',
                    'email' => $result['email'] ?: 'admin@enguio.com',
                    'username' => $result['username'] ?: 'admin',
                    'position' => 'System Administrator',
                    'department' => 'IT Department'
                ]
            ]);
        } else {
            // Return default admin data if no employee found
            echo json_encode([
                'success' => true,
                'data' => [
                    'fullName' => 'Admin User',
                    'email' => 'admin@enguio.com',
                    'username' => 'admin',
                    'position' => 'System Administrator',
                    'department' => 'IT Department'
                ]
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching admin employee info: ' . $e->getMessage()
        ]);
    }
}

/**
 * Update admin employee name in database
 */
function handle_update_admin_name($conn, $data) {
    try {
        $newName = trim($data['newName'] ?? '');
        
        if (empty($newName)) {
            echo json_encode([
                'success' => false,
                'message' => 'Name cannot be empty'
            ]);
            return;
        }
        
        // Split the name into first and last name
        $nameParts = explode(' ', $newName, 2);
        $firstName = $nameParts[0];
        $lastName = isset($nameParts[1]) ? $nameParts[1] : '';
        
        // Update admin employee name in database
        $sql = "
            UPDATE tbl_employee 
            SET Fname = :firstName, Lname = :lastName
            WHERE role_id = 1 AND status = 'active'
            LIMIT 1
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':firstName', $firstName, PDO::PARAM_STR);
        $stmt->bindValue(':lastName', $lastName, PDO::PARAM_STR);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Name updated successfully',
                'data' => [
                    'fullName' => $newName,
                    'firstName' => $firstName,
                    'lastName' => $lastName
                ]
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'No admin employee found to update'
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error updating name: ' . $e->getMessage()
        ]);
    }
}

/**
 * Update admin employee information (email, position, department)
 */
function handle_update_admin_employee_info($conn, $data) {
    try {
        $fullName = trim($data['fullName'] ?? '');
        $email = trim($data['email'] ?? '');
        $position = trim($data['position'] ?? '');
        $department = trim($data['department'] ?? '');
        
        if (empty($fullName) || empty($email)) {
            echo json_encode([
                'success' => false,
                'message' => 'Full name and email are required'
            ]);
            return;
        }
        
        // Split the name into first and last name
        $nameParts = explode(' ', $fullName, 2);
        $firstName = $nameParts[0];
        $lastName = isset($nameParts[1]) ? $nameParts[1] : '';
        
        // Update admin employee information in database
        $sql = "
            UPDATE tbl_employee 
            SET Fname = :firstName, Lname = :lastName, email = :email
            WHERE role_id = 1 AND status = 'active'
            LIMIT 1
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':firstName', $firstName, PDO::PARAM_STR);
        $stmt->bindValue(':lastName', $lastName, PDO::PARAM_STR);
        $stmt->bindValue(':email', $email, PDO::PARAM_STR);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Employee information updated successfully',
                'data' => [
                    'fullName' => $fullName,
                    'email' => $email,
                    'position' => $position,
                    'department' => $department
                ]
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'No admin employee found to update'
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error updating employee information: ' . $e->getMessage()
        ]);
    }
}

/**
 * Change admin password (without current password verification)
 */
function handle_change_admin_password($conn, $data) {
    try {
        $newPassword = trim($data['newPassword'] ?? '');
        
        if (empty($newPassword)) {
            echo json_encode([
                'success' => false,
                'message' => 'New password is required'
            ]);
            return;
        }
        
        if (strlen($newPassword) < 6) {
            echo json_encode([
                'success' => false,
                'message' => 'New password must be at least 6 characters long'
            ]);
            return;
        }
        
        // Update password directly (no current password verification needed)
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $updateSql = "
            UPDATE tbl_employee 
            SET password = :newPassword
            WHERE role_id = 1 AND status = 'active'
            LIMIT 1
        ";
        
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bindValue(':newPassword', $hashedPassword, PDO::PARAM_STR);
        $updateStmt->execute();
        
        if ($updateStmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Password updated successfully'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'No admin employee found to update'
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error changing password: ' . $e->getMessage()
        ]);
    }
}
?>
