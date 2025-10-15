
<?php
/**
 * Sales API - Handles all POS and sales related operations
 * Direct implementation instead of proxy to backend.php
 */

// CORS headers must be set first, before any output
// Load environment variables for CORS configuration
require_once __DIR__ . '/../simple_dotenv.php';
$dotenv = new SimpleDotEnv(__DIR__ . '/..');
$dotenv->load();

// Get allowed origins from environment variable (comma-separated)
$corsOriginsEnv = $_ENV['CORS_ALLOWED_ORIGINS'] ?? 'http://localhost:3000,http://localhost:3001';
$allowed_origins = array_map('trim', explode(',', $corsOriginsEnv));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Fallback to first allowed origin for development
    header("Access-Control-Allow-Origin: " . $allowed_origins[0]);
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400"); // Cache preflight for 24 hours
header("Content-Type: application/json; charset=utf-8");

// Handle preflight OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Start output buffering to prevent unwanted output
ob_start();

// Disable error display to prevent HTML in JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Log errors to a file for debugging
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Use centralized database connection
require_once __DIR__ . '/conn.php';

// Clear any output that might have been generated
ob_clean();

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input: ' . json_last_error_msg()]);
    exit();
}

$action = $data['action'] ?? '';

try {
    switch ($action) {
        case 'get_discounts':
            // Get all discount types
            $stmt = $conn->prepare("SELECT DISTINCT type FROM tbl_discount ORDER BY type ASC");
            $stmt->execute();
            $discounts = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            echo json_encode([
                "success" => true,
                "data" => $discounts
            ]);
            break;

        case 'check_barcode':
            // Check if barcode exists
            $barcode = $data['barcode'] ?? '';
            
            if (empty($barcode)) {
                echo json_encode(['success' => false, 'message' => 'Barcode is required']);
                break;
            }
            
            $stmt = $conn->prepare("
                SELECT p.*, 
                       c.category_name as category, 
                       p.category_id,
                       l.location_name,
                       COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
                       COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp
                FROM tbl_product p 
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id 
                WHERE p.barcode = ? 
                AND p.status = 'active'
                LIMIT 1
            ");
            $stmt->execute([$barcode]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($product) {
                echo json_encode([
                    "success" => true,
                    "found" => true,
                    "product" => $product
                ]);
            } else {
                echo json_encode([
                    "success" => true,
                    "found" => false,
                    "message" => "Product not found"
                ]);
            }
            break;

        case 'check_product_name':
            // Check if product name exists
            $product_name = $data['product_name'] ?? '';
            
            if (empty($product_name)) {
                echo json_encode(['success' => false, 'message' => 'Product name is required']);
                break;
            }
            
            $stmt = $conn->prepare("
                SELECT p.*, 
                       c.category_name as category, 
                       p.category_id,
                       l.location_name,
                       COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
                       COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp
                FROM tbl_product p 
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id 
                WHERE LOWER(p.product_name) LIKE LOWER(?) 
                AND p.status = 'active'
                LIMIT 1
            ");
            $stmt->execute(["%{$product_name}%"]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($product) {
                echo json_encode([
                    "success" => true,
                    "found" => true,
                    "product" => $product
                ]);
            } else {
                echo json_encode([
                    "success" => true,
                    "found" => false,
                    "message" => "Product not found"
                ]);
            }
            break;

        case 'save_pos_sale':
            try {
                $client_txn_id = $data['transactionId'] ?? '';
                $total_amount = (float)($data['totalAmount'] ?? 0);
                $reference_number = $data['referenceNumber'] ?? '';
                $terminal_name = trim($data['terminalName'] ?? 'POS Terminal');
                $items = $data['items'] ?? [];
                $payment_method = strtolower(trim($data['paymentMethod'] ?? ($reference_number ? 'gcash' : 'cash')));

                if (!is_array($items) || count($items) === 0) {
                    echo json_encode(["success" => false, "message" => "No items to save."]); 
                    break;
                }

                // Start transaction
                $conn->beginTransaction();

                // Ensure terminal exists or create one
                $termStmt = $conn->prepare("SELECT terminal_id FROM tbl_pos_terminal WHERE terminal_name = ? LIMIT 1");
                $termStmt->execute([$terminal_name]);
                $terminal = $termStmt->fetch(PDO::FETCH_ASSOC);
                if ($terminal && isset($terminal['terminal_id'])) {
                    $terminal_id = (int)$terminal['terminal_id'];
                } else {
                    // shift_id is required; default to 1
                    $insTerm = $conn->prepare("INSERT INTO tbl_pos_terminal (terminal_name, shift_id) VALUES (?, 1)");
                    $insTerm->execute([$terminal_name]);
                    $terminal_id = (int)$conn->lastInsertId();
                }

                // Map to enum in schema: ('cash','card','Gcash')
                $payment_enum = ($payment_method === 'gcash') ? 'Gcash' : (($payment_method === 'card') ? 'card' : 'cash');

                // Get employee ID from session or payload
                $empId = isset($data['emp_id']) ? (int)$data['emp_id'] : 0;
                if ($empId <= 0) {
                    if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }
                    if (!empty($_SESSION['user_id'])) { $empId = (int)$_SESSION['user_id']; }
                }
                if ($empId <= 0) { $empId = 1; } // Default to admin if no session

                // Create transaction row (schema: transaction_id, date, time, emp_id, payment_type)
                $txnStmt = $conn->prepare("INSERT INTO tbl_pos_transaction (date, time, emp_id, payment_type) VALUES (CURDATE(), CURTIME(), ?, ?)");
                $txnStmt->execute([$empId, $payment_enum]);
                $transaction_id = (int)$conn->lastInsertId();

                // If no reference number was provided (cash), store the client txn id so we can locate it later if needed
                $header_reference = $reference_number !== null && $reference_number !== '' ? $reference_number : ($client_txn_id ?: '');

                // Create sales header
                $hdrStmt = $conn->prepare("INSERT INTO tbl_pos_sales_header (transaction_id, total_amount, reference_number, terminal_id) VALUES (?, ?, ?, ?)");
                $hdrStmt->execute([$transaction_id, $total_amount, $header_reference, $terminal_id]);
                $sales_header_id = (int)$conn->lastInsertId();

                // Insert each item into details (quantity already updated by convenience_store_api.php or pharmacy_api.php)
                $dtlStmt = $conn->prepare("INSERT INTO tbl_pos_sales_details (sales_header_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");

                foreach ($items as $it) {
                    $pid = (int)($it['product_id'] ?? $it['id'] ?? 0);
                    $qty = (int)($it['quantity'] ?? 0);
                    $price = (float)($it['price'] ?? 0);
                    if ($pid <= 0 || $qty <= 0) { continue; }
                    $dtlStmt->execute([$sales_header_id, $pid, $qty, $price]);
                    // Note: Product quantity is already updated by convenience_store_api.php or pharmacy_api.php
                    // to avoid double deduction
                }

                // Log activity to system activity logs
                try {
                    // Get employee details for logging (using actual emp_id)
                    $empStmt = $conn->prepare("SELECT username, CONCAT(Fname, ' ', Lname) as full_name FROM tbl_employee WHERE emp_id = ?");
                    $empStmt->execute([$empId]);
                    $empData = $empStmt->fetch(PDO::FETCH_ASSOC);
                    
                    // Insert activity log
                    $logStmt = $conn->prepare("INSERT INTO tbl_activity_log (user_id, username, role, activity_type, activity_description, table_name, record_id, date_created, time_created, created_at) VALUES (:user_id, :username, :role, :activity_type, :activity_description, :table_name, :record_id, CURDATE(), CURTIME(), NOW())");
                    $logStmt->execute([
                        ':user_id' => $empId,
                        ':username' => $empData['username'] ?? 'Unknown',
                        ':role' => 'Cashier', // Default role for POS operations
                        ':activity_type' => 'POS_SALE_SAVED',
                        ':activity_description' => "POS Sale completed: ₱{$total_amount} ({$payment_enum}, " . count($items) . " items) - Terminal: {$terminal_name}",
                        ':table_name' => 'tbl_pos_transaction',
                        ':record_id' => $transaction_id
                    ]);
                    
                } catch (Exception $logError) {
                    error_log("Activity logging error: " . $logError->getMessage());
                }

                $conn->commit();
                echo json_encode([
                    "success" => true,
                    "message" => "POS sale saved",
                    "data" => [
                        "transaction_id" => $transaction_id,
                        "sales_header_id" => $sales_header_id,
                        "terminal_id" => $terminal_id
                    ]
                ]);
            } catch (Exception $e) {
                if (isset($conn)) { $conn->rollback(); }
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
            break;

        case 'save_pos_transaction':
            try {
                $client_txn_id = $data['transactionId'] ?? '';
                $payment_type = strtolower(trim($data['paymentType'] ?? 'cash'));
                $payment_enum = ($payment_type === 'gcash') ? 'Gcash' : (($payment_type === 'card') ? 'card' : 'cash');

                // Try to locate the sales header by using the client transaction id stored in reference_number (for cash)
                $findStmt = $conn->prepare("SELECT transaction_id FROM tbl_pos_sales_header WHERE reference_number = ? ORDER BY sales_header_id DESC LIMIT 1");
                $findStmt->execute([$client_txn_id]);
                $row = $findStmt->fetch(PDO::FETCH_ASSOC);

                if ($row && isset($row['transaction_id'])) {
                    $upd = $conn->prepare("UPDATE tbl_pos_transaction SET payment_type = ? WHERE transaction_id = ?");
                    $upd->execute([$payment_enum, (int)$row['transaction_id']]);
                    echo json_encode(["success" => true, "message" => "Payment type updated."]);
                } else {
                    // Fallback: update the latest transaction today
                    $upd = $conn->prepare("UPDATE tbl_pos_transaction SET payment_type = ? WHERE date = CURDATE() ORDER BY transaction_id DESC LIMIT 1");
                    $upd->execute([$payment_enum]);
                    echo json_encode(["success" => true, "message" => "Payment type updated (latest transaction)." ]);
                }
            } catch (Exception $e) {
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
            break;

        case 'get_pos_sales':
            try {
                $limit = isset($data['limit']) ? (int)$data['limit'] : 50;
                $location = $data['location'] ?? null;
                $date = $data['date'] ?? null;
                
                $whereClause = "WHERE 1=1";
                $params = [];
                
                if ($location) {
                    $whereClause .= " AND th.transaction_id IN (SELECT transaction_id FROM tbl_pos_transaction WHERE payment_type LIKE :location)";
                    $params[':location'] = "%{$location}%";
                }
                
                if ($date) {
                    $whereClause .= " AND DATE(t.date) = :date";
                    $params[':date'] = $date;
                }
                
                $sql = "
                    SELECT 
                        t.transaction_id,
                        t.date,
                        t.time,
                        t.payment_type,
                        t.emp_id,
                        e.username AS cashier,
                        e.shift_id,
                        s.shifts AS shift_name,
                        th.total_amount,
                        th.reference_number,
                        term.terminal_name,
                        COUNT(td.product_id) as items_count,
                        GROUP_CONCAT(CONCAT(p.product_name, ' x', td.quantity, ' @₱', td.price) SEPARATOR ', ') as items_summary
                    FROM tbl_pos_transaction t
                    JOIN tbl_pos_sales_header th ON t.transaction_id = th.transaction_id
                    JOIN tbl_pos_terminal term ON th.terminal_id = term.terminal_id
                    LEFT JOIN tbl_employee e ON t.emp_id = e.emp_id
                    LEFT JOIN tbl_shift s ON e.shift_id = s.shift_id
                    LEFT JOIN tbl_pos_sales_details td ON th.sales_header_id = td.sales_header_id
                    LEFT JOIN tbl_product p ON td.product_id = p.product_id
                    {$whereClause}
                    GROUP BY t.transaction_id, t.date, t.time, t.payment_type, t.emp_id, e.username, e.shift_id, s.shifts, th.total_amount, th.reference_number, term.terminal_name
                    ORDER BY t.date DESC, t.time DESC
                    LIMIT :limit
                ";
                
                $stmt = $conn->prepare($sql);
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
                $stmt->execute();
                
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode([ 'success' => true, 'data' => $rows ]);
                
            } catch (Exception $e) {
                echo json_encode([ 'success' => false, 'message' => 'Database error: ' . $e->getMessage() ]);
            }
            break;

        case 'update_product_stock':
            try {
                $product_id = $data['product_id'] ?? 0;
                $quantity = $data['quantity'] ?? 0;
                
                if ($product_id <= 0) {
                    echo json_encode(['success' => false, 'message' => 'Invalid product ID']);
                    break;
                }
                
                // Update quantity in tbl_fifo_stock instead of tbl_product.quantity (which doesn't exist)
                $stmt = $conn->prepare("UPDATE tbl_fifo_stock SET available_quantity = ? WHERE product_id = ?");
                $stmt->execute([$quantity, $product_id]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Product stock updated successfully in FIFO system'
                ]);
                
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
            }
            break;

        case 'reduce_product_stock':
            try {
                $product_id = $data['product_id'] ?? 0;
                $quantity = $data['quantity'] ?? 0;
                $transaction_id = $data['transaction_id'] ?? '';
                $location_name = $data['location_name'] ?? '';
                $location_id = $data['location_id'] ?? 0;
                $entry_by = $data['entry_by'] ?? 'POS System';
                
                if ($product_id <= 0 || $quantity <= 0) {
                    echo json_encode(['success' => false, 'message' => 'Invalid product ID or quantity']);
                    break;
                }
                
                // Get current stock from transfer batch details
                $stockStmt = $conn->prepare("
                    SELECT 
                        COALESCE(SUM(tbd.quantity), 0) as current_stock
                    FROM tbl_transfer_batch_details tbd
                    WHERE tbd.product_id = ? AND tbd.location_id = ?
                ");
                $stockStmt->execute([$product_id, $location_id]);
                $current_stock = $stockStmt->fetchColumn();
                
                if ($current_stock < $quantity) {
                    echo json_encode([
                        'success' => false,
                        'message' => "Insufficient stock. Available: $current_stock, Requested: $quantity"
                    ]);
                    break;
                }
                
                // Reduce stock from transfer batch details (FIFO - First In, First Out)
                $remaining_to_reduce = $quantity;
                
                // Get batches ordered by oldest first (FIFO)
                $batchStmt = $conn->prepare("
                    SELECT 
                        tbd.id,
                        tbd.batch_id,
                        tbd.batch_reference,
                        tbd.quantity,
                        tbd.srp,
                        tbd.expiration_date
                    FROM tbl_transfer_batch_details tbd
                    WHERE tbd.product_id = ? AND tbd.location_id = ? AND tbd.quantity > 0
                    ORDER BY tbd.id ASC, tbd.expiration_date ASC
                ");
                $batchStmt->execute([$product_id, $location_id]);
                $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($batches as $batch) {
                    if ($remaining_to_reduce <= 0) break;
                    
                    $batch_quantity = $batch['quantity'];
                    $reduce_from_batch = min($remaining_to_reduce, $batch_quantity);
                    
                    // Update batch quantity
                    $updateBatchStmt = $conn->prepare("
                        UPDATE tbl_transfer_batch_details 
                        SET quantity = quantity - ? 
                        WHERE id = ?
                    ");
                    $updateBatchStmt->execute([$reduce_from_batch, $batch['id']]);
                    
                    // Log stock movement for this batch
                    $logStmt = $conn->prepare("
                        INSERT INTO tbl_stock_movements 
                        (product_id, batch_id, movement_type, quantity, remaining_quantity, srp, 
                         expiration_date, reference_no, notes, created_by)
                        VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $logStmt->execute([
                        $product_id,
                        $batch['batch_id'],
                        $reduce_from_batch,
                        $batch_quantity - $reduce_from_batch,
                        $batch['srp'],
                        $batch['expiration_date'],
                        $transaction_id,
                        "POS Sale - Reduced by $reduce_from_batch units from batch {$batch['batch_reference']}",
                        $entry_by
                    ]);
                    
                    $remaining_to_reduce -= $reduce_from_batch;
                }
                
                // Log POS transaction
                $posTransactionStmt = $conn->prepare("
                    INSERT INTO tbl_pos_transaction 
                    (transaction_id, product_id, quantity, unit_price, total_amount, location_name, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                ");
                $posTransactionStmt->execute([
                    $transaction_id,
                    $product_id,
                    $quantity,
                    $batches[0]['srp'] ?? 0,
                    ($batches[0]['srp'] ?? 0) * $quantity,
                    $location_name,
                    $entry_by
                ]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Product stock reduced successfully',
                    'data' => [
                        'product_id' => $product_id,
                        'old_quantity' => $current_stock,
                        'new_quantity' => $current_stock - $quantity,
                        'reduced_by' => $quantity,
                        'location_name' => $location_name
                    ]
                ]);
                
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
            }
            break;

        case 'get_pos_inventory':
            try {
                $location_id = $data['location_id'] ?? 0;
                $location_name = $data['location_name'] ?? '';
                $location = $data['location'] ?? null;
                $search = $data['search'] ?? '';
                
                // If location_id is not provided, try to get it from location_name or location
                if (!$location_id) {
                    $searchLocation = $location_name ?: $location;
                    if ($searchLocation) {
                        $locStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE ? LIMIT 1");
                        $locStmt->execute(["%{$searchLocation}%"]);
                        $location_id = $locStmt->fetchColumn();
                    }
                }
                
                if (!$location_id) {
                    echo json_encode(['success' => false, 'message' => 'Location ID or Location Name is required']);
                    break;
                }
                
                // Build the query to get all products with stock from transfer batch details
                $sql = "
                    SELECT 
                        p.product_id,
                        p.product_name,
                        p.barcode,
                        -- For Mang tomas, get quantity from warehouse (location_id = 2), otherwise from current location
                        CASE 
                            WHEN p.product_name = 'Mang tomas' THEN 
                                COALESCE(
                                    (SELECT SUM(tbd_warehouse.quantity) 
                                     FROM tbl_transfer_batch_details tbd_warehouse
                                     JOIN tbl_product p_warehouse ON tbd_warehouse.product_id = p_warehouse.product_id
                                     WHERE p_warehouse.product_name = 'Mang tomas' 
                                     AND tbd_warehouse.location_id = 2), 0)
                            ELSE 
                                COALESCE(SUM(tbd.quantity), 0)
                        END as quantity,
                        -- For Mang tomas, get SRP from warehouse (location_id = 2), otherwise from current location
                        CASE 
                            WHEN p.product_name = 'Mang tomas' THEN 
                                COALESCE(
                                    (SELECT tbd_warehouse2.srp 
                                     FROM tbl_transfer_batch_details tbd_warehouse2
                                     JOIN tbl_product p_warehouse2 ON tbd_warehouse2.product_id = p_warehouse2.product_id
                                     WHERE p_warehouse2.product_name = 'Mang tomas' 
                                     AND tbd_warehouse2.location_id = 2
                                     AND tbd_warehouse2.quantity > 0
                                     ORDER BY 
                                        CASE WHEN tbd_warehouse2.expiration_date IS NULL THEN 1 ELSE 0 END,
                                        tbd_warehouse2.expiration_date ASC,
                                        tbd_warehouse2.id ASC
                                     LIMIT 1),
                                    COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0), 0)
                            ELSE 
                                COALESCE(
                                    (SELECT tbd2.srp 
                                     FROM tbl_transfer_batch_details tbd2
                                     WHERE tbd2.product_id = p.product_id 
                                     AND tbd2.location_id = ?
                                     AND tbd2.quantity > 0
                                     ORDER BY 
                                        CASE WHEN tbd2.expiration_date IS NULL THEN 1 ELSE 0 END,
                                        tbd2.expiration_date ASC,
                                        tbd2.id ASC
                                     LIMIT 1),
                                    COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0), 0)
                        END as unit_price,
                        CASE 
                            WHEN p.product_name = 'Mang tomas' THEN 
                                COALESCE(
                                    (SELECT tbd_warehouse3.srp 
                                     FROM tbl_transfer_batch_details tbd_warehouse3
                                     JOIN tbl_product p_warehouse3 ON tbd_warehouse3.product_id = p_warehouse3.product_id
                                     WHERE p_warehouse3.product_name = 'Mang tomas' 
                                     AND tbd_warehouse3.location_id = 2
                                     AND tbd_warehouse3.quantity > 0
                                     ORDER BY 
                                        CASE WHEN tbd_warehouse3.expiration_date IS NULL THEN 1 ELSE 0 END,
                                        tbd_warehouse3.expiration_date ASC,
                                        tbd_warehouse3.id ASC
                                     LIMIT 1),
                                    COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0), 0)
                            ELSE 
                                COALESCE(
                                    (SELECT tbd3.srp 
                                     FROM tbl_transfer_batch_details tbd3
                                     WHERE tbd3.product_id = p.product_id 
                                     AND tbd3.location_id = ?
                                     AND tbd3.quantity > 0
                                     ORDER BY 
                                        CASE WHEN tbd3.expiration_date IS NULL THEN 1 ELSE 0 END,
                                        tbd3.expiration_date ASC,
                                        tbd3.id ASC
                                     LIMIT 1),
                                    COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0), 0)
                        END as srp,
                        ? as location_name,
                        COALESCE(b.brand, '') as brand,
                        COALESCE(s.supplier_name, '') as supplier_name,
                        c.category_name as category,
                        p.description,
                        p.prescription,
                        p.bulk
                    FROM tbl_product p
                    LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                    LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                    LEFT JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id
                    WHERE p.status = 'active' AND (tbd.location_id = ? OR tbd.location_id IS NULL OR p.product_name = 'Mang tomas')
                ";
                
                $params = [$location_id, $location_id, $location_name, $location_id];
                
                // Add search filter if provided
                if (!empty($search)) {
                    $sql .= " AND (p.product_name LIKE ? OR p.description LIKE ? OR c.category_name LIKE ? OR p.barcode LIKE ?)";
                    $searchParam = "%{$search}%";
                    $params[] = $searchParam;
                    $params[] = $searchParam;
                    $params[] = $searchParam;
                    $params[] = $searchParam;
                }
                
                $sql .= " GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, p.description, p.prescription, p.bulk, b.brand, s.supplier_name";
                $sql .= " HAVING COALESCE(SUM(tbd.quantity), 0) > 0"; // Only show products that have stock in this location
                $sql .= " ORDER BY p.product_name ASC";
                
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'data' => $products,
                    'count' => count($products),
                    'location_id' => $location_id,
                    'location_name' => $location_name
                ]);
                
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
            }
            break;

        case 'get_locations':
            try {
                $stmt = $conn->prepare("SELECT location_id, location_name FROM tbl_location ORDER BY location_name ASC");
                $stmt->execute();
                $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'data' => $locations
                ]);
                
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
            }
            break;

        case 'get_today_sales':
            try {
                $cashier_username = $data['cashier_username'] ?? 'Admin';
                $location_name = $data['location_name'] ?? '';
                $terminal_name = $data['terminal_name'] ?? '';
                
                // Get today's date
                $today = date('Y-m-d');
                
                // Build the query to get today's sales data based on actual database schema
                $sql = "
                    SELECT 
                        COUNT(DISTINCT pt.transaction_id) as total_transactions,
                        COALESCE(SUM(psh.total_amount), 0) as total_sales,
                        COALESCE(SUM(CASE WHEN pt.payment_type = 'cash' THEN psh.total_amount ELSE 0 END), 0) as cash_sales,
                        COALESCE(SUM(CASE WHEN pt.payment_type = 'Gcash' THEN psh.total_amount ELSE 0 END), 0) as gcash_sales,
                        COALESCE(SUM(CASE WHEN pt.payment_type = 'card' THEN psh.total_amount ELSE 0 END), 0) as card_sales,
                        0 as total_discount
                    FROM tbl_pos_transaction pt
                    LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
                    LEFT JOIN tbl_employee e ON pt.emp_id = e.emp_id
                    WHERE DATE(pt.date) = :today
                ";
                
                $params = [':today' => $today];
                
                // Add cashier filter if provided (but allow showing all sales for debugging)
                if (!empty($cashier_username) && $cashier_username !== 'Admin' && $cashier_username !== 'all') {
                    $sql .= " AND e.username = :username";
                    $params[':username'] = $cashier_username;
                }
                
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                $salesData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // Since there's no discount_amount column in tbl_pos_sales_header,
                // we'll set total_discount to 0 for now
                $salesData['total_discount'] = 0;
                
                echo json_encode([
                    "success" => true,
                    "data" => $salesData,
                    "date" => $today,
                    "cashier" => $cashier_username,
                    "location" => $location_name,
                    "terminal" => $terminal_name,
                    "note" => "Location and terminal filtering not available in current schema"
                ]);
                
            } catch (Exception $e) {
                echo json_encode([
                    "success" => false,
                    "message" => "Error fetching today's sales: " . $e->getMessage()
                ]);
            }
            break;

        case 'log_activity':
            try {
                $activity_type = $data['activity_type'] ?? '';
                $description = $data['description'] ?? '';
                $table_name = $data['table_name'] ?? '';
                $record_id = $data['record_id'] ?? null;
                $user_id = $data['user_id'] ?? 1;
                $username = $data['username'] ?? 'System';
                $role = $data['role'] ?? 'System';
                
                $stmt = $conn->prepare("
                    INSERT INTO tbl_activity_log (
                        user_id, username, role, activity_type, activity_description, 
                        table_name, record_id, date_created, time_created, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), CURTIME(), NOW())
                ");
                $stmt->execute([$user_id, $username, $role, $activity_type, $description, $table_name, $record_id]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Activity logged successfully'
                ]);
                
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
            }
            break;

        case 'get_report_data':
            try {
                $report_type = $data['report_type'] ?? 'all';
                $start_date = $data['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
                $end_date = $data['end_date'] ?? date('Y-m-d');
                
                // Get stock movements as reports
                $stmt = $conn->prepare("
                    SELECT 
                        sm.movement_id,
                        CONCAT('Stock ', 
                            CASE sm.movement_type 
                                WHEN 'IN' THEN 'In Report'
                                WHEN 'OUT' THEN 'Out Report'
                                WHEN 'ADJUSTMENT' THEN 'Adjustment Report'
                                WHEN 'TRANSFER' THEN 'Transfer Report'
                                ELSE CONCAT(sm.movement_type, ' Report')
                            END
                        ) as title,
                        CASE sm.movement_type 
                            WHEN 'IN' THEN 'Stock In Report'
                            WHEN 'OUT' THEN 'Stock Out Report'
                            WHEN 'ADJUSTMENT' THEN 'Stock Adjustment Report'
                            WHEN 'TRANSFER' THEN 'Transfer Report'
                            ELSE CONCAT(sm.movement_type, ' Report')
                        END as type,
                        CONCAT('Report for ', p.product_name, ' - ', sm.movement_type, ' movement') as description,
                        COALESCE(sm.created_by, 'System') as generatedBy,
                        DATE(sm.movement_date) as date,
                        TIME(sm.movement_date) as time,
                        'Completed' as status,
                        'PDF' as format,
                        '2.5 MB' as fileSize
                    FROM tbl_stock_movements sm
                    JOIN tbl_product p ON sm.product_id = p.product_id
                    WHERE DATE(sm.movement_date) BETWEEN ? AND ?
                    ORDER BY sm.movement_date DESC
                    LIMIT 50
                ");
                $stmt->execute([$start_date, $end_date]);
                $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Get analytics data
                $analytics = [];
                
                // Total products
                $stmt = $conn->prepare("SELECT COUNT(*) as total FROM tbl_product WHERE status IS NULL OR status <> 'archived'");
                $stmt->execute();
                $totalProducts = $stmt->fetch()['total'];
                
                // Low stock items (quantity <= 10) - using tbl_fifo_stock
                $stmt = $conn->prepare("
                    SELECT COUNT(DISTINCT p.product_id) as total 
                    FROM tbl_product p 
                    WHERE (p.status IS NULL OR p.status <> 'archived')
                    AND (SELECT COALESCE(SUM(fs.available_quantity), 0) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id) BETWEEN 1 AND 10
                ");
                $stmt->execute();
                $lowStockItems = $stmt->fetch()['total'];
                
                // Out of stock items - using tbl_fifo_stock
                $stmt = $conn->prepare("
                    SELECT COUNT(DISTINCT p.product_id) as total 
                    FROM tbl_product p 
                    WHERE (p.status IS NULL OR p.status <> 'archived')
                    AND (SELECT COALESCE(SUM(fs.available_quantity), 0) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id) = 0
                ");
                $stmt->execute();
                $outOfStockItems = $stmt->fetch()['total'];
                
                // Total inventory value - using tbl_fifo_stock
                $stmt = $conn->prepare("
                    SELECT COALESCE(SUM(fs.available_quantity * fs.srp), 0) as total 
                    FROM tbl_fifo_stock fs 
                    JOIN tbl_product p ON fs.product_id = p.product_id 
                    WHERE p.status IS NULL OR p.status <> 'archived'
                ");
                $stmt->execute();
                $totalValue = $stmt->fetch()['total'];
                
                $analytics = [
                    'totalProducts' => (int)$totalProducts,
                    'lowStockItems' => (int)$lowStockItems,
                    'outOfStockItems' => (int)$outOfStockItems,
                    'totalValue' => (float)$totalValue
                ];
                
                // Get top categories
                $stmt = $conn->prepare("
                    SELECT 
                        c.category_name as category_name,
                        COUNT(*) as product_count,
                        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbl_product WHERE status IS NULL OR status <> 'archived')), 1) as percentage
                    FROM tbl_product p
                    LEFT JOIN tbl_category c ON p.category_id = c.category_id
                WHERE p.status IS NULL OR p.status <> 'archived'
                    AND c.category_name IS NOT NULL AND c.category_name <> ''
                    GROUP BY c.category_name
                    ORDER BY product_count DESC
                    LIMIT 6
                ");
                $stmt->execute();
                $topCategories = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'reports' => $reports,
                    'analytics' => $analytics,
                    'topCategories' => $topCategories
                ]);
                
            } catch (Exception $e) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Error fetching reports data: ' . $e->getMessage(),
                    'reports' => [],
                    'analytics' => [
                        'totalProducts' => 0,
                        'lowStockItems' => 0,
                        'outOfStockItems' => 0,
                        'totalValue' => 0
                    ],
                    'topCategories' => []
                ]);
            }
            break;

        case 'get_report_details':
            try {
                $report_id = $data['report_id'] ?? 0;
                
                if ($report_id <= 0) {
                    echo json_encode(['success' => false, 'message' => 'Invalid report ID']);
                    break;
                }
                
                // Get report details from stock movements
                $stmt = $conn->prepare("
                    SELECT 
                        sm.movement_id,
                        p.product_name,
                        p.barcode,
                        c.category_name as category,
                        sm.quantity,
                        COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as unit_price,
                        sm.movement_type,
                        sm.reference_no,
                        DATE(sm.movement_date) as date,
                        TIME(sm.movement_date) as time,
                        COALESCE(l.location_name, 'Warehouse') as location_name,
                        COALESCE(s.supplier_name, 'Unknown') as supplier_name,
                        COALESCE(b.brand, 'Generic') as brand,
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
                
                if (empty($details)) {
                    // Try to get from transfer reports
                    $transferStmt = $conn->prepare("
                        SELECT 
                            th.transfer_header_id as movement_id,
                            p.product_name,
                            p.barcode,
                            c.category_name as category,
                            td.qty as quantity,
                            COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as unit_price,
                            'TRANSFER' as movement_type,
                            th.reference_number as reference_no,
                            DATE(th.date) as date,
                            TIME(th.date) as time,
                            COALESCE(l.location_name, 'Warehouse') as location_name,
                            COALESCE(s.supplier_name, 'Unknown') as supplier_name,
                            COALESCE(b.brand, 'Generic') as brand,
                            p.expiration as expiration_date,
                            th.notes
                        FROM tbl_transfer_header th
                        JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                        JOIN tbl_product p ON td.product_id = p.product_id
                        LEFT JOIN tbl_location l ON p.location_id = l.location_id
                        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                        LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                        WHERE th.transfer_header_id = ?
                    ");
                    $transferStmt->execute([$report_id]);
                    $details = $transferStmt->fetchAll(PDO::FETCH_ASSOC);
                }
                
                echo json_encode([
                    'success' => true,
                    'details' => $details,
                    'report_id' => $report_id
                ]);
                
            } catch (Exception $e) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Error fetching report details: ' . $e->getMessage(),
                    'details' => []
                ]);
            }
            break;

        case 'generate_report':
            try {
                $report_type = $data['report_type'] ?? '';
                $generated_by = $data['generated_by'] ?? 'System';
                $parameters = $data['parameters'] ?? [];
                
                // This can be extended to create PDF reports, Excel exports, etc.
                // For now, just return success message
                echo json_encode([
                    'success' => true,
                    'message' => 'Report generated successfully',
                    'report_type' => $report_type,
                    'generated_by' => $generated_by,
                    'parameters' => $parameters,
                    'report_id' => time() // Generate a unique ID
                ]);
                
            } catch (Exception $e) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Error generating report: ' . $e->getMessage()
                ]);
            }
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Unknown action: ' . $action]);
            break;
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
