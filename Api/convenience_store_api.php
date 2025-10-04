<?php
/**
 * Convenience Store API
 * Handles all convenience store specific operations
 */

// Start output buffering to prevent unwanted output
ob_start();

// Set content type to JSON
header('Content-Type: application/json');

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

// Database connection using PDO
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection error: " . $e->getMessage()
    ]);
    exit;
}

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
        case 'get_locations':
            // Get all locations
            $stmt = $conn->prepare("SELECT location_id, location_name FROM tbl_location ORDER BY location_name ASC");
            $stmt->execute();
            $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $locations
            ]);
            break;
            
        case 'get_convenience_products':
            // Get products specifically for convenience store
            $location_name = $data['location_name'] ?? 'convenience';
            $search = $data['search'] ?? '';
            $category = $data['category'] ?? 'all';
            $product_type = $data['product_type'] ?? 'all';
            
            $where = "l.location_name LIKE '%convenience%'";
            $params = [];
            
            if (!empty($search)) {
                $where .= " AND (p.product_name LIKE ? OR p.barcode LIKE ? OR p.category LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam]);
            }
            
            if ($category !== 'all') {
                $where .= " AND p.category = ?";
                $params[] = $category;
            }
            
            if ($product_type !== 'all') {
                if ($product_type === 'Regular') {
                    $where .= " AND p.product_type = 'Regular'";
                } elseif ($product_type === 'Transferred') {
                    $where .= " AND p.product_type = 'Transferred'";
                }
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    MIN(p.product_id) as product_id,
                    p.product_name,
                    p.barcode,
                    p.category,
                    b.brand,
                    AVG(p.unit_price) as unit_price,
                    AVG(p.srp) as srp,
                    SUM(p.quantity) as total_quantity,
                    MAX(p.status) as status,
                    s.supplier_name,
                    MAX(p.expiration) as expiration,
                    l.location_name,
                    COALESCE(NULLIF(first_transfer_batch.first_batch_srp, 0), AVG(p.srp)) as first_batch_srp
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN (
                    SELECT 
                        tbd.product_id,
                        tbd.srp as first_batch_srp,
                        ROW_NUMBER() OVER (PARTITION BY tbd.product_id ORDER BY tbd.created_at ASC, tbd.id ASC) as rn
                    FROM tbl_transfer_batch_details tbd
                    WHERE tbd.srp > 0
                ) first_transfer_batch ON p.product_id = first_transfer_batch.product_id AND first_transfer_batch.rn = 1
                WHERE $where
                GROUP BY p.product_name, p.barcode, p.category, b.brand, s.supplier_name, l.location_name, first_transfer_batch.first_batch_srp
                ORDER BY p.product_name ASC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Update quantity field to use total_quantity
            foreach ($rows as &$row) {
                $row['quantity'] = $row['total_quantity'];
            }
            
            echo json_encode([
                "success" => true,
                "data" => $rows
            ]);
            break;
            
        case 'get_products_by_location_name':
            // Fallback action for compatibility
            $location_name = $data['location_name'] ?? 'convenience';
            $search = $data['search'] ?? '';
            $category = $data['category'] ?? 'all';
            
            $where = "l.location_name LIKE ?";
            $params = ["%$location_name%"];
            
            if (!empty($search)) {
                $where .= " AND (p.product_name LIKE ? OR p.barcode LIKE ? OR p.category LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam]);
            }
            
            if ($category !== 'all') {
                $where .= " AND p.category = ?";
                $params[] = $category;
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    MIN(p.product_id) as product_id,
                    p.product_name,
                    p.barcode,
                    p.category,
                    b.brand,
                    AVG(p.unit_price) as unit_price,
                    AVG(p.srp) as srp,
                    SUM(p.quantity) as total_quantity,
                    MAX(p.status) as status,
                    s.supplier_name,
                    MAX(p.expiration) as expiration,
                    l.location_name,
                    COALESCE(NULLIF(first_transfer_batch.first_batch_srp, 0), AVG(p.srp)) as first_batch_srp
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN (
                    SELECT 
                        tbd.product_id,
                        tbd.srp as first_batch_srp,
                        ROW_NUMBER() OVER (PARTITION BY tbd.product_id ORDER BY tbd.created_at ASC, tbd.id ASC) as rn
                    FROM tbl_transfer_batch_details tbd
                    WHERE tbd.srp > 0
                ) first_transfer_batch ON p.product_id = first_transfer_batch.product_id AND first_transfer_batch.rn = 1
                WHERE $where
                GROUP BY p.product_name, p.barcode, p.category, b.brand, s.supplier_name, l.location_name, first_transfer_batch.first_batch_srp
                ORDER BY p.product_name ASC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Update quantity field to use total_quantity
            foreach ($rows as &$row) {
                $row['quantity'] = $row['total_quantity'];
            }
            
            echo json_encode([
                "success" => true,
                "data" => $rows
            ]);
            break;
            
        case 'get_convenience_batch_details':
            // Get batch transfer details for convenience store
            $product_id = $data['product_id'] ?? 0;
            $location_id = $data['location_id'] ?? null;
            
            if (!$product_id) {
                echo json_encode(['success' => false, 'message' => 'Product ID is required']);
                break;
            }
            
            // Get convenience store location ID if not provided
            if (!$location_id) {
                $locStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE '%convenience%' LIMIT 1");
                $locStmt->execute();
                $location_id = $locStmt->fetchColumn();
            }
            
            // Get the product details to find related products with same name/barcode
            $productStmt = $conn->prepare("SELECT product_name, barcode FROM tbl_product WHERE product_id = ?");
            $productStmt->execute([$product_id]);
            $productInfo = $productStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$productInfo) {
                echo json_encode(['success' => false, 'message' => 'Product not found']);
                break;
            }
            
            // Find all related product IDs with same name and barcode
            $relatedStmt = $conn->prepare("SELECT product_id FROM tbl_product WHERE product_name = ? AND barcode = ?");
            $relatedStmt->execute([$productInfo['product_name'], $productInfo['barcode']]);
            $relatedProductIds = $relatedStmt->fetchAll(PDO::FETCH_COLUMN);
            
            // Create placeholders for IN clause
            $placeholders = str_repeat('?,', count($relatedProductIds) - 1) . '?';
            
            // Get batch transfer details from tbl_batch_transfer_details for all related products
            $batchStmt = $conn->prepare("
                SELECT 
                    btd.batch_transfer_id,
                    btd.batch_id,
                    btd.batch_reference,
                    btd.quantity_used as batch_quantity,
                    btd.srp,
                    btd.srp as batch_srp,
                    btd.expiration_date,
                    btd.status,
                    btd.transfer_date,
                    p.product_name,
                    p.barcode,
                    b.brand,
                    p.category,
                    l.location_name as source_location_name,
                    'System' as employee_name
                FROM tbl_batch_transfer_details btd
                LEFT JOIN tbl_product p ON btd.product_id = p.product_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_location l ON btd.location_id = l.location_id
                WHERE btd.product_id IN ($placeholders)
                ORDER BY btd.transfer_date ASC, btd.batch_transfer_id ASC
            ");
            $batchStmt->execute($relatedProductIds);
            $batchDetails = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // If still no data, try to get FIFO stock data directly for all related products
            if (empty($batchDetails)) {
                $fifoStmt = $conn->prepare("
                    SELECT 
                        fs.fifo_id as batch_transfer_id,
                        fs.batch_id,
                        fs.batch_reference,
                        fs.available_quantity as batch_quantity,
                        fs.srp,
                        fs.srp as batch_srp,
                        fs.expiration_date,
                        'Available' as status,
                        fs.created_at as transfer_date,
                        p.product_name,
                        p.barcode,
                        b.brand,
                        p.category,
                        'Warehouse' as source_location_name,
                        fs.entry_by as employee_name
                    FROM tbl_fifo_stock fs
                    LEFT JOIN tbl_product p ON fs.product_id = p.product_id
                    LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                    WHERE fs.product_id IN ($placeholders)
                    ORDER BY fs.expiration_date ASC, fs.fifo_id ASC
                ");
                $fifoStmt->execute($relatedProductIds);
                $batchDetails = $fifoStmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            // If no batch details found, try to get from transfer details for all related products
            if (empty($batchDetails)) {
                $fallbackStmt = $conn->prepare("
                    SELECT 
                        td.transfer_header_id as batch_transfer_id,
                        fs.batch_id,
                        CONCAT('BR-', fs.batch_id) as batch_reference,
                        td.qty as batch_quantity,
                        fs.srp,
                        p.unit_price as batch_srp,
                        fs.expiration_date,
                        'Available' as status,
                        th.date as transfer_date,
                        p.product_name,
                        p.barcode,
                        br.brand,
                        p.category,
                        sl.location_name as source_location_name,
                        e.Fname as employee_name
                    FROM tbl_transfer_dtl td
                    JOIN tbl_transfer_header th ON td.transfer_header_id = th.transfer_header_id
                    JOIN tbl_product p ON td.product_id = p.product_id
                    LEFT JOIN tbl_brand br ON p.brand_id = br.brand_id
                    LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                    LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
                    LEFT JOIN tbl_fifo_stock fs ON td.product_id = fs.product_id
                    WHERE td.product_id IN ($placeholders) AND th.destination_location_id = ?
                    ORDER BY th.date ASC, td.transfer_header_id ASC
                ");
                $fallbackParams = array_merge($relatedProductIds, [$location_id]);
                $fallbackStmt->execute($fallbackParams);
                $batchDetails = $fallbackStmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            // Calculate summary
            $summary = [
                'total_transfers' => count($batchDetails),
                'total_quantity' => array_sum(array_column($batchDetails, 'batch_quantity')),
                'total_value' => array_sum(array_map(function($batch) {
                    return $batch['batch_quantity'] * ($batch['srp'] ?? 0);
                }, $batchDetails))
            ];
            
            echo json_encode([
                "success" => true,
                "data" => [
                    "batch_details" => $batchDetails,
                    "summary" => $summary
                ]
            ]);
            break;
            
        case 'get_transfer_batch_details':
            // Get transfer batch details for convenience store
            $transfer_id = $data['transfer_id'] ?? 0;
            $product_id = $data['product_id'] ?? 0;
            $location_id = $data['location_id'] ?? 0;
            
            // Check if this is for inventory (transfer_id) or store (product_id + location_id)
            if ($transfer_id) {
                // For InventoryTransfer modal - get batch details for specific transfer
                $stmt = $conn->prepare("
                    SELECT DISTINCT
                        tbd.id,
                        tbd.batch_id,
                        tbd.batch_reference,
                        tbd.quantity as batch_quantity,
                        tbd.srp as batch_srp,
                        tbd.expiration_date,
                        fs.srp,
                        fs.available_quantity
                    FROM tbl_transfer_batch_details tbd
                    LEFT JOIN tbl_fifo_stock fs ON tbd.batch_id = fs.batch_id
                    LEFT JOIN tbl_transfer_dtl td ON tbd.product_id = td.product_id AND td.transfer_header_id = ?
                    WHERE td.transfer_header_id = ?
                    ORDER BY tbd.id ASC
                ");
                $stmt->execute([$transfer_id, $transfer_id]);
                $batch_details = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(["success" => true, "data" => $batch_details]);
            } elseif ($product_id && $location_id) {
                // For ConvenienceStore modal - get individual batches from tbl_transfer_batch_details
                // Use existing relationship: tbd.product_id -> td.product_id -> th.transfer_header_id
                $stmt = $conn->prepare("
                    SELECT 
                        tbd.id as batch_transfer_id,
                        tbd.batch_id,
                        tbd.batch_reference,
                        tbd.quantity as batch_quantity,
                        tbd.srp as batch_srp,
                        tbd.expiration_date,
                        'Consumed' as status,
                        th.date as transfer_date,
                        th.transfer_header_id,
                        p.product_name,
                        p.barcode,
                        p.unit_price,
                        p.srp,
                        b.brand,
                        s.supplier_name,
                        l.location_name as location_name,
                        sl.location_name as source_location_name,
                        CONCAT(e.Fname, ' ', e.Lname) as employee_name
                    FROM tbl_transfer_batch_details tbd
                    JOIN tbl_transfer_dtl td ON tbd.product_id = td.product_id
                    JOIN tbl_transfer_header th ON td.transfer_header_id = th.transfer_header_id
                    JOIN tbl_product p ON tbd.product_id = p.product_id
                    LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                    LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                    LEFT JOIN tbl_location l ON th.destination_location_id = l.location_id
                    LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                    LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
                    WHERE tbd.product_id = ? AND th.destination_location_id = ?
                    ORDER BY tbd.id ASC
                ");
                $stmt->execute([$product_id, $location_id]);
                $batch_details = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Calculate totals for store modals
                $total_stock = array_sum(array_column($batch_details, 'batch_quantity'));
                $total_batches = count($batch_details);
                $active_batches = count(array_filter($batch_details, function($item) {
                    return $item['status'] === 'Available';
                }));
                $consumed_batches = count(array_filter($batch_details, function($item) {
                    return $item['status'] === 'Consumed';
                }));
                
                // Get unique SRP
                $srp = $batch_details[0]['batch_srp'] ?? 0;
                
                $response_data = [
                    'batch_details' => $batch_details,
                    'summary' => [
                        'total_stock' => $total_stock,
                        'total_transfer_quantity' => $total_stock,
                        'srp' => $srp,
                        'total_batches' => $total_batches,
                        'active_batches' => $active_batches,
                        'consumed_batches' => $consumed_batches
                    ]
                ];
                
                echo json_encode(["success" => true, "data" => $response_data]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
            }
            break;
            
        case 'process_convenience_sale':
            // Process sale with FIFO batch consumption for convenience store
            $transaction_id = $data['transaction_id'] ?? '';
            $total_amount = $data['total_amount'] ?? 0;
            $items = $data['items'] ?? [];
            $location_name = 'Convenience Store';
            
            // Debug logging
            error_log("Convenience Store Sale Processing: Transaction ID: $transaction_id, Total: $total_amount, Items: " . json_encode($items));
            
            if (empty($items) || $total_amount <= 0) {
                error_log("Convenience Store Sale Error: Invalid sale data - Items: " . json_encode($items) . ", Total: $total_amount");
                echo json_encode(['success' => false, 'message' => 'Invalid sale data']);
                break;
            }
            
            $conn->beginTransaction();
            
            try {
                // Get convenience store location ID
                $locStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE '%convenience%' LIMIT 1");
                $locStmt->execute();
                $location_id = $locStmt->fetchColumn();
                
                if (!$location_id) {
                    throw new Exception("Convenience store location not found");
                }
                
                // Process each item with FIFO consumption
                foreach ($items as $item) {
                    $product_id = $item['product_id'] ?? $item['id'] ?? 0;
                    $quantity = $item['quantity'] ?? 0;
                    
                    if ($product_id > 0 && $quantity > 0) {
                        // Consume from FIFO batches for products in this location
                        $fifoStmt = $conn->prepare("
                            SELECT fs.fifo_id, fs.available_quantity, fs.batch_reference, fs.batch_id
                            FROM tbl_fifo_stock fs
                            INNER JOIN tbl_product p ON fs.product_id = p.product_id
                            WHERE fs.product_id = ? AND p.location_id = ? AND fs.available_quantity > 0
                            ORDER BY fs.expiration_date ASC, fs.fifo_id ASC
                        ");
                        $fifoStmt->execute([$product_id, $location_id]);
                        $fifoBatches = $fifoStmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        $remaining_to_consume = $quantity;
                        $consumed_batches = [];
                        
                        foreach ($fifoBatches as $batch) {
                            if ($remaining_to_consume <= 0) break;
                            
                            $consume_qty = min($batch['available_quantity'], $remaining_to_consume);
                            
                            // Update FIFO stock
                            $updateFifoStmt = $conn->prepare("
                                UPDATE tbl_fifo_stock 
                                SET available_quantity = available_quantity - ?
                                WHERE fifo_id = ?
                            ");
                            $updateFifoStmt->execute([$consume_qty, $batch['fifo_id']]);
                            
                            // Update batch transfer details status
                            $updateBatchStmt = $conn->prepare("
                                UPDATE tbl_batch_transfer_details 
                                SET status = CASE 
                                    WHEN batch_quantity <= ? THEN 'Consumed'
                                    ELSE 'Partially Consumed'
                                END
                                WHERE batch_id = ? AND destination_location_id = ?
                            ");
                            $updateBatchStmt->execute([$consume_qty, $batch['batch_id'], $location_id]);
                            
                            $consumed_batches[] = [
                                'batch_id' => $batch['batch_id'],
                                'batch_reference' => $batch['batch_reference'],
                                'quantity_consumed' => $consume_qty
                            ];
                            
                            $remaining_to_consume -= $consume_qty;
                        }
                        
                        // Update product quantity
                        error_log("Updating product quantity: Product ID: $product_id, Quantity to subtract: $quantity");
                        $updateProductStmt = $conn->prepare("
                            UPDATE tbl_product 
                            SET quantity = quantity - ?
                            WHERE product_id = ?
                        ");
                        $updateProductStmt->execute([$quantity, $product_id]);
                        $rowsAffected = $updateProductStmt->rowCount();
                        error_log("Product quantity update result: Rows affected: $rowsAffected");
                        
                        // Get current product quantity after sale
                        $currentQtyStmt = $conn->prepare("SELECT quantity FROM tbl_product WHERE product_id = ?");
                        $currentQtyStmt->execute([$product_id]);
                        $current_quantity = $currentQtyStmt->fetchColumn();
                        error_log("Current product quantity after sale: $current_quantity");
                        
                        // Log stock movement
                        $movementStmt = $conn->prepare("
                            INSERT INTO tbl_stock_movements (
                                product_id, movement_type, quantity, remaining_quantity,
                                reference_no, notes, created_by
                            ) VALUES (?, 'OUT', ?, ?, ?, ?, ?)
                        ");
                        $movementStmt->execute([
                            $product_id,
                            $quantity,
                            $current_quantity, // Current stock after sale
                            $transaction_id,
                            "POS Sale - FIFO Consumption: " . json_encode($consumed_batches),
                            'POS System'
                        ]);
                    }
                }
                
                $conn->commit();
                error_log("Convenience Store Sale Success: Transaction $transaction_id completed successfully");
                echo json_encode([
                    'success' => true,
                    'message' => 'Convenience store sale processed with FIFO consumption',
                    'data' => [
                        'transaction_id' => $transaction_id,
                        'location' => $location_name,
                        'total_amount' => $total_amount,
                        'items_processed' => count($items)
                    ]
                ]);
                
            } catch (Exception $e) {
                $conn->rollback();
                throw $e;
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Unknown action']);
            break;
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
