<?php
// Start output buffering to prevent unwanted output
ob_start();

session_start();

// CORS and content-type headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Disable error display to prevent HTML in JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Log errors to a file for debugging
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON input"
    ]);
    exit;
}

// Database connection using PDO
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Include batch functions
    require_once 'modules/batch_functions.php';
    
    // Include reports module
    require_once 'modules/reports.php';
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection error: " . $e->getMessage()
    ]);
    exit;
}

// Action handler
$action = $data['action'];
error_log("Processing action: " . $action);

try {
    switch ($action) {
    case 'test_connection':
        echo json_encode([
            "success" => true,
            "message" => "API connection successful",
            "timestamp" => date('Y-m-d H:i:s'),
            "database" => "Connected to enguio2 database"
        ]);
        break;

    case 'generate_captcha':
        try {
            // Generate simple addition captcha only
            $num1 = rand(1, 10);
            $num2 = rand(1, 10);
            
            $question = "What is {$num1} + {$num2}?";
            $answer = $num1 + $num2;
            
            echo json_encode([
                "success" => true,
                "question" => $question,
                "answer" => $answer
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Error generating captcha: " . $e->getMessage()
            ]);
        }
        break;

    case 'login':
        try {
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            $captcha = $data['captcha'] ?? '';
            $captchaAnswer = $data['captchaAnswer'] ?? '';
            
            // Validate captcha first
            if ($captcha !== $captchaAnswer) {
                echo json_encode([
                    "success" => false,
                    "message" => "Incorrect captcha answer. Please try again."
                ]);
                break;
            }
            
            // Check if user exists and is active
            $stmt = $conn->prepare("
                SELECT e.emp_id, e.username, e.password, e.status, e.Fname, e.Lname, r.role 
                FROM tbl_employee e 
                JOIN tbl_role r ON e.role_id = r.role_id 
                WHERE e.username = ? AND e.status = 'Active'
            ");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid username or password."
                ]);
                break;
            }
            
            // Verify password (assuming passwords are hashed)
            if (!password_verify($password, $user['password'])) {
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid username or password."
                ]);
                break;
            }
            
            // Set session variables
            $_SESSION['user_id'] = $user['emp_id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['full_name'] = $user['Fname'] . ' ' . $user['Lname'];
            
            echo json_encode([
                "success" => true,
                "message" => "Login successful",
                "role" => $user['role'],
                "user_id" => $user['emp_id'],
                "full_name" => $user['Fname'] . ' ' . $user['Lname']
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Login error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_report_data':
        try {
            $report_type = $data['report_type'] ?? '';
            $start_date = $data['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $end_date = $data['end_date'] ?? date('Y-m-d');
            $check_for_updates = $data['check_for_updates'] ?? false;
            
            // Use the reports module
            $reportsModule = new ReportsModule($conn);
            $result = $reportsModule->getReportData($report_type, $start_date, $end_date, $check_for_updates);
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'check_new_sales':
        try {
            $since = $data['since'] ?? date('Y-m-d H:i:s', strtotime('-1 hour'));
            
            // Use the reports module
            $reportsModule = new ReportsModule($conn);
            $result = $reportsModule->checkNewSales($since);
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_latest_sales_activity':
        try {
            $minutes = $data['minutes'] ?? 5;
            
            // Use the reports module
            $reportsModule = new ReportsModule($conn);
            $result = $reportsModule->getLatestSalesActivity($minutes);
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'generate_report':
        try {
            $report_type = $data['report_type'] ?? '';
            $generated_by = $data['generated_by'] ?? 'Admin';
            $parameters = $data['parameters'] ?? [];
            
            // Use the reports module
            $reportsModule = new ReportsModule($conn);
            $result = $reportsModule->generateReport($report_type, $generated_by, $parameters);
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_cashier_details':
        try {
            $cashier_id = $data['cashier_id'] ?? 0;
            $start_date = $data['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $end_date = $data['end_date'] ?? date('Y-m-d');
            
            // Use the reports module
            $reportsModule = new ReportsModule($conn);
            $result = $reportsModule->getCashierDetails($cashier_id, $start_date, $end_date);
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_stock_adjustments':
        try {
            $search = $data['search'] ?? '';
            $type = $data['type'] ?? 'all';
            $status = $data['status'] ?? 'all';
            $page = $data['page'] ?? 1;
            $limit = $data['limit'] ?? 50;
            $offset = ($page - 1) * $limit;
            
            // Build the query based on type filter
            $whereConditions = [];
            $params = [];
            
            if ($type !== 'all') {
                $whereConditions[] = "sm.movement_type = ?";
                $params[] = $type;
            }
            
            if ($status !== 'all') {
                if ($status === 'pending') {
                    $whereConditions[] = "sm.movement_type = 'ADJUSTMENT'";
                } elseif ($status === 'approved') {
                    $whereConditions[] = "sm.movement_type IN ('IN', 'OUT')";
                }
            }
            
            if (!empty($search)) {
                $whereConditions[] = "(p.product_name LIKE ? OR p.barcode LIKE ? OR sm.reference_no LIKE ?)";
                $searchParam = "%$search%";
                $params[] = $searchParam;
                $params[] = $searchParam;
                $params[] = $searchParam;
            }
            
            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            // Get total count
            $countQuery = "
                SELECT COUNT(*) as total
                FROM tbl_stock_movements sm
                JOIN tbl_product p ON sm.product_id = p.product_id
                LEFT JOIN tbl_employee e ON (sm.created_by REGEXP '^[0-9]+$' AND sm.created_by = e.emp_id)
                $whereClause
            ";
            $countStmt = $conn->prepare($countQuery);
            $countStmt->execute($params);
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Get the data
            $query = "
                SELECT 
                    sm.movement_id,
                    sm.movement_type,
                    sm.quantity,
                    sm.unit_cost,
                    (sm.quantity * sm.unit_cost) as total_cost,
                    sm.reference_no,
                    sm.notes,
                    'Approved' as status,
                    sm.created_by,
                    COALESCE(e.Fname, '') as employee_first_name,
                    COALESCE(e.Lname, '') as employee_last_name,
                    CONCAT(COALESCE(e.Fname, ''), ' ', COALESCE(e.Lname, '')) as employee_name,
                    sm.movement_date as created_at,
                    DATE(sm.movement_date) as date,
                    TIME(sm.movement_date) as time,
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    p.quantity as current_stock
                FROM tbl_stock_movements sm
                JOIN tbl_product p ON sm.product_id = p.product_id
                LEFT JOIN tbl_employee e ON (sm.created_by REGEXP '^[0-9]+$' AND sm.created_by = e.emp_id)
                $whereClause
                ORDER BY sm.movement_date DESC
                LIMIT $limit OFFSET $offset
            ";
            
            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $movements,
                "total" => $totalCount,
                "page" => $page,
                "limit" => $limit,
                "totalPages" => ceil($totalCount / $limit)
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'record_activity':
        try {
            $activity_type = $data['activity_type'] ?? '';
            $description = $data['description'] ?? '';
            $table_name = $data['table_name'] ?? '';
            $record_id = $data['record_id'] ?? null;
            $user_id = $data['user_id'] ?? $_SESSION['user_id'] ?? null;
            
            if (empty($activity_type) || empty($description)) {
                echo json_encode([
                    "success" => false,
                    "message" => "Activity type and description are required"
                ]);
                break;
            }
            
            $stmt = $conn->prepare("
                INSERT INTO tbl_activity_log 
                (activity_type, activity_description, table_name, record_id, user_id, date_created, time_created) 
                VALUES (?, ?, ?, ?, ?, CURDATE(), CURTIME())
            ");
            
            $stmt->execute([$activity_type, $description, $table_name, $record_id, $user_id]);
            
            echo json_encode([
                "success" => true,
                "message" => "Activity recorded successfully"
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_activity_summary':
        try {
            $hours = $data['hours'] ?? 24;
            
            // Get activity summary for the specified time period
            $stmt = $conn->prepare("
                SELECT 
                    activity_type,
                    COUNT(*) as count
                FROM tbl_activity_log 
                WHERE date_created >= DATE_SUB(CURDATE(), INTERVAL ? HOUR)
                GROUP BY activity_type
            ");
            $stmt->execute([$hours]);
            $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate totals
            $summary = [
                'stock_in' => 0,
                'stock_out' => 0,
                'sales' => 0,
                'total' => 0
            ];
            
            foreach ($activities as $activity) {
                $type = strtolower($activity['activity_type']);
                $count = (int)$activity['count'];
                
                if (strpos($type, 'stock_in') !== false || strpos($type, 'in') !== false) {
                    $summary['stock_in'] += $count;
                } elseif (strpos($type, 'stock_out') !== false || strpos($type, 'out') !== false) {
                    $summary['stock_out'] += $count;
                } elseif (strpos($type, 'sales') !== false || strpos($type, 'pos') !== false) {
                    $summary['sales'] += $count;
                }
                
                $summary['total'] += $count;
            }
            
            echo json_encode([
                "success" => true,
                "data" => $summary,
                "activities" => $activities
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_report_details':
        try {
            $report_id = $data['report_id'] ?? 0;
            
            if (!$report_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Report ID is required"
                ]);
                break;
            }
            
            // Get report details based on movement_id
            $stmt = $conn->prepare("
                SELECT 
                    sm.movement_id,
                    p.product_name,
                    p.barcode,
                    p.category,
                    sm.quantity,
                    sm.unit_cost as unit_price,
                    (sm.quantity * sm.unit_cost) as total_value,
                    sm.movement_type,
                    sm.reference_no,
                    DATE(sm.movement_date) as date,
                    TIME(sm.movement_date) as time,
                    l.location_name,
                    s.supplier_name,
                    b.brand,
                    p.expiration as expiration_date,
                    sm.notes
                FROM tbl_stock_movements sm
                JOIN tbl_product p ON sm.product_id = p.product_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                WHERE sm.movement_id = ?
            ");
            $stmt->execute([$report_id]);
            $details = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "details" => $details
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    default:
        echo json_encode([
            "success" => false,
            "message" => "Unknown action: " . $action
        ]);
        break;
    }

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}

// Flush the output buffer to ensure clean JSON response
ob_end_flush();
?>
