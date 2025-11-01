<?php
/**
 * Employee Management API
 * Handles employee updates and management
 */

require_once 'conn.php';
require_once 'cors.php';

header('Content-Type: application/json');

// Cache-busting headers to prevent API response caching
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

try {
    $conn = getDatabaseConnection();
    
    // Get the action from POST data
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_POST['action'] ?? '';

    switch ($action) {
        case 'get_employees':
            // Get all active employees
            $stmt = $conn->prepare("
                SELECT 
                    e.emp_id,
                    e.Fname,
                    e.Lname,
                    e.username,
                    e.email,
                    e.contact_num,
                    e.status,
                    r.role,
                    r.role_id
                FROM tbl_employee e
                LEFT JOIN tbl_role r ON e.role_id = r.role_id
                WHERE e.status = 'Active'
                ORDER BY e.Fname, e.Lname
            ");
            $stmt->execute();
            $employees = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'employees' => $employees
            ]);
            break;
            
        case 'update_employee':
            // Update employee information
            $emp_id = $input['emp_id'] ?? $_POST['emp_id'] ?? '';
            $fname = $input['fname'] ?? $_POST['fname'] ?? '';
            $lname = $input['lname'] ?? $_POST['lname'] ?? '';
            $username = $input['username'] ?? $_POST['username'] ?? '';
            
            if (empty($emp_id) || empty($fname)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Employee ID and first name are required'
                ]);
                exit;
            }
            
            // Update the employee
            $stmt = $conn->prepare("
                UPDATE tbl_employee 
                SET Fname = ?, Lname = ?, username = ?
                WHERE emp_id = ?
            ");
            
            $result = $stmt->execute([$fname, $lname, $username, $emp_id]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Employee updated successfully'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to update employee'
                ]);
            }
            break;
            
        case 'get_cashier_performance':
            // Get cashier performance data with proper sales and returns calculation
            // Only show actual cashiers (role_id = 2), not inventory staff
            // Support date range filtering
            
            require_once 'utils/DateFilterHelper.php';
            
            $period = $input['period'] ?? $_POST['period'] ?? 'all'; // today, week, month, all
            
            // Get date conditions using helper
            $transactionCondition = DateFilterHelper::getTransactionDateCondition($period);
            $returnCondition = DateFilterHelper::getReturnDateCondition($period);
            
            $stmt = $conn->prepare("
                SELECT 
                    e.emp_id,
                    CONCAT(COALESCE(e.Fname, ''), ' ', COALESCE(e.Lname, '')) as cashier_name,
                    e.username,
                    COUNT(DISTINCT CASE WHEN pt.transaction_id IS NOT NULL THEN psh.sales_header_id END) as transactions_count,
                    COALESCE(SUM(CASE WHEN pt.transaction_id IS NOT NULL THEN psh.total_amount ELSE 0 END), 0) as total_sales,
                    COALESCE(
                        (SELECT SUM(r.total_refund) 
                         FROM tbl_pos_returns r 
                         WHERE r.user_id = e.emp_id 
                         AND r.status = 'approved'
                         AND r.method = 'refund'
                         {$returnCondition['condition']}), 0
                    ) as total_returns
                FROM tbl_employee e
                LEFT JOIN tbl_pos_transaction pt ON e.emp_id = pt.emp_id {$transactionCondition['condition']}
                LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
                WHERE e.role_id = 2 AND e.status = 'Active'
                GROUP BY e.emp_id, e.Fname, e.Lname, e.username
                ORDER BY total_sales DESC
            ");
            $stmt->execute();
            $performance = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'performance' => $performance,
                'period' => $period,
                'debug' => DateFilterHelper::getDebugInfo($period)
            ]);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'message' => 'Invalid action'
            ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
