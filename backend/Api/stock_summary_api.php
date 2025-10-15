<?php
// Stock Summary and Movement API
// Handles stock movements and stock summary operations

// Start output buffering to prevent unwanted output
ob_start();

session_start();

// Use centralized CORS configuration
require_once __DIR__ . '/cors.php';

// Disable error display to prevent HTML in JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Log errors to a file for debugging
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

// Use centralized database connection
require_once __DIR__ . '/conn.php';

// Clear any output that might have been generated
ob_clean();

// Read and decode incoming JSON request
$rawData = file_get_contents("php://input");
error_log("Stock Summary API - Raw input: " . $rawData);

$data = json_decode($rawData, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON input"
    ]);
    exit;
}

$action = $data['action'] ?? '';

switch ($action) {
    case 'get_stock_movements':
        try {
            $search = $data['search'] ?? '';
            $type = $data['type'] ?? 'all';
            $status = $data['status'] ?? 'all';
            $page = $data['page'] ?? 1;
            $limit = $data['limit'] ?? 10;
            $offset = ($page - 1) * $limit;
            
            $whereConditions = [];
            $params = [];
            
            if ($search) {
                $whereConditions[] = "(p.product_name LIKE ? OR p.barcode LIKE ? OR sm.notes LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            
            if ($type !== 'all') {
                $whereConditions[] = "sm.movement_type = ?";
                $params[] = $type;
            }
            
            if ($status !== 'all') {
                $whereConditions[] = "sm.status = ?";
                $params[] = $status;
            }
            
            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            // Get total count
            $countStmt = $conn->prepare("
                SELECT COUNT(*) as total
                FROM tbl_stock_movements sm
                LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                LEFT JOIN tbl_employee e ON sm.created_by = e.emp_id
                $whereClause
            ");
            $countStmt->execute($params);
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Get movements with pagination
            $stmt = $conn->prepare("
                SELECT 
                    sm.movement_id as id,
                    COALESCE(p.product_name, 'Unknown Product') as product_name,
                    COALESCE(p.barcode, 'N/A') as product_id,
                    CASE 
                        WHEN sm.movement_type = 'IN' THEN 'Addition'
                        WHEN sm.movement_type = 'OUT' THEN 'Subtraction'
                        ELSE 'Adjustment'
                    END as adjustment_type,
                    sm.quantity,
                    sm.notes as reason,
                    COALESCE(
                        CASE 
                            WHEN sm.created_by REGEXP '^[0-9]+$' THEN CONCAT(e.fname, ' ', e.lname)
                            ELSE sm.created_by
                        END, 
                        'System'
                    ) as adjusted_by,
                    DATE(sm.movement_date) as date,
                    TIME(sm.movement_date) as time,
                    'Approved' as status,
                    sm.notes,
                    sm.expiration_date,
                    sm.reference_no
                FROM tbl_stock_movements sm
                LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                LEFT JOIN tbl_employee e ON (sm.created_by REGEXP '^[0-9]+$' AND sm.created_by = e.emp_id)
                $whereClause
                ORDER BY sm.movement_date DESC
                LIMIT " . (int)$limit . " OFFSET " . (int)$offset
            );
            
            $stmt->execute($params);
            $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $movements,
                "total" => $totalCount,
                "page" => $page,
                "limit" => $limit,
                "pages" => ceil($totalCount / $limit)
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'get_stock_summary':
        try {
            $location_id = $data['location_id'] ?? 0;
            $search = $data['search'] ?? '';
            $category = $data['category'] ?? 'all';
            $stock_status = $data['stock_status'] ?? 'all';
            $page = $data['page'] ?? 1;
            $limit = $data['limit'] ?? 20;
            $offset = ($page - 1) * $limit;
            
            $whereConditions = [];
            $params = [];
            
            // Base condition for products with stock summary data
            $whereConditions[] = "ss.available_quantity > 0";
            
            if ($location_id > 0) {
                $whereConditions[] = "p.location_id = ?";
                $params[] = $location_id;
            }
            
            if ($search) {
                $whereConditions[] = "(p.product_name LIKE ? OR p.barcode LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            
            if ($category && $category !== 'all') {
                $whereConditions[] = "c.category_name = ?";
                $params[] = $category;
            }
            
            if ($stock_status && $stock_status !== 'all') {
                $whereConditions[] = "p.stock_status = ?";
                $params[] = $stock_status;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            // Get total count
            $countStmt = $conn->prepare("
                SELECT COUNT(DISTINCT p.product_id) as total
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                INNER JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                INNER JOIN tbl_batch b ON ss.batch_id = b.batch_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_brand br ON p.brand_id = br.brand_id
                $whereClause
            ");
            $countStmt->execute($params);
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Get stock summary data with pagination
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    c.category_name as category,
                    p.barcode,
                    p.description,
                    COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as current_stock,
                    p.stock_status,
                    COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as unit_price,
                    COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp,
                    p.expiration as product_expiration,
                    p.date_added,
                    l.location_name,
                    s.supplier_name,
                    br.brand,
                    ss.available_quantity as summary_available,
                    ss.total_quantity as summary_total,
                    ss.srp as summary_srp,
                    ss.expiration_date as summary_expiration,
                    ss.batch_reference,
                    ss.last_updated,
                    b.entry_date as batch_date,
                    b.entry_by
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                INNER JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                INNER JOIN tbl_batch b ON ss.batch_id = b.batch_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_brand br ON p.brand_id = br.brand_id
                $whereClause
                ORDER BY p.product_name ASC
                LIMIT " . (int)$limit . " OFFSET " . (int)$offset
            );
            
            $stmt->execute($params);
            $stockSummary = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $stockSummary,
                "total" => $totalCount,
                "page" => $page,
                "limit" => $limit,
                "pages" => ceil($totalCount / $limit)
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'get_stock_adjustment_stats':
        try {
            $stmt = $conn->prepare("
                SELECT 
                    COUNT(*) as total_adjustments,
                    COUNT(CASE WHEN movement_type = 'IN' THEN 1 END) as additions,
                    COUNT(CASE WHEN movement_type = 'OUT' THEN 1 END) as subtractions,
                    SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE -quantity END) as net_quantity
                FROM tbl_stock_movements
                WHERE movement_type IN ('IN', 'OUT')
            ");
            $stmt->execute();
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $stats
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'create_stock_movement':
        try {
            $product_id = $data['product_id'] ?? 0;
            $movement_type = $data['movement_type'] ?? 'IN';
            $quantity = $data['quantity'] ?? 0;
            $notes = $data['notes'] ?? '';
            $srp = $data['srp'] ?? 0;
            $expiration_date = $data['expiration_date'] ?? null;
            $created_by = $data['created_by'] ?? 'admin';
            $reference_no = $data['reference_no'] ?? '';
            
            if (!$product_id || !$quantity) {
                echo json_encode([
                    "success" => false,
                    "message" => "Product ID and quantity are required"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get product details
            $productStmt = $conn->prepare("
                SELECT product_name, quantity, location_id, batch_id 
                FROM tbl_product 
                WHERE product_id = ?
            ");
            $productStmt->execute([$product_id]);
            $product = $productStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                throw new Exception("Product not found");
            }
            
            // Calculate new quantity
            $old_quantity = $product['quantity'];
            $new_quantity = ($movement_type === 'IN') ? 
                $old_quantity + $quantity : 
                max(0, $old_quantity - $quantity);
            
            // Create batch record if needed
            $batch_id = $product['batch_id'];
            if (!$batch_id) {
                $batch_reference = 'MOV-' . date('Ymd-His') . '-' . rand(1000, 9999);
                $batchStmt = $conn->prepare("
                    INSERT INTO tbl_batch (
                        batch, supplier_id, location_id, entry_date, entry_time, 
                        entry_by, order_no
                    ) VALUES (?, ?, ?, CURDATE(), CURTIME(), ?, ?)
                ");
                $batchStmt->execute([$batch_reference, null, $product['location_id'], $created_by, '']);
                $batch_id = $conn->lastInsertId();
                
                // Update product with batch_id
                $updateProductStmt = $conn->prepare("UPDATE tbl_product SET batch_id = ? WHERE product_id = ?");
                $updateProductStmt->execute([$batch_id, $product_id]);
            }
            
            // Update product quantity
            $updateStmt = $conn->prepare("
                UPDATE tbl_product 
                SET quantity = ?,
                    stock_status = CASE 
                        WHEN ? <= 0 THEN 'out of stock'
                        WHEN ? <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END
                WHERE product_id = ?
            ");
            $updateStmt->execute([$new_quantity, $new_quantity, $new_quantity, $product_id]);
            
            // Create stock movement record
            $movementStmt = $conn->prepare("
                INSERT INTO tbl_stock_movements (
                    product_id, batch_id, movement_type, quantity, remaining_quantity,
                        srp, expiration_date, reference_no, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $movementStmt->execute([
                $product_id, $batch_id, $movement_type, $quantity, $new_quantity,
                $srp, $expiration_date, $reference_no, $notes, $created_by
            ]);
            
            // Create or update stock summary record
            $summaryStmt = $conn->prepare("
                INSERT INTO tbl_stock_summary (
                    product_id, batch_id, available_quantity, srp,
                    expiration_date, batch_reference, total_quantity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    available_quantity = available_quantity + VALUES(available_quantity),
                    total_quantity = total_quantity + VALUES(total_quantity),
                    srp = VALUES(srp),
                    last_updated = CURRENT_TIMESTAMP
            ");
            
            // Get batch reference
            $batchRefStmt = $conn->prepare("SELECT batch FROM tbl_batch WHERE batch_id = ?");
            $batchRefStmt->execute([$batch_id]);
            $batch_ref = $batchRefStmt->fetchColumn();
            
            $summaryStmt->execute([
                $product_id, $batch_id, $quantity, $srp,
                $expiration_date, $batch_ref, $quantity
            ]);
            
            $conn->commit();
            
            echo json_encode([
                "success" => true,
                "message" => "Stock movement created successfully",
                "data" => [
                    "movement_id" => $conn->lastInsertId(),
                    "old_quantity" => $old_quantity,
                    "new_quantity" => $new_quantity,
                    "batch_id" => $batch_id
                ]
            ]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'sync_existing_products':
        try {
            // This function will create stock movements and summaries for existing products that don't have them
            $conn->beginTransaction();
            
            // Get products without stock movements
            $productsStmt = $conn->prepare("
                SELECT p.product_id, p.product_name, p.quantity, COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as unit_price, COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp, 
                       p.location_id, p.batch_id, p.expiration, p.date_added
                FROM tbl_product p
                LEFT JOIN tbl_stock_movements sm ON p.product_id = sm.product_id
                WHERE sm.product_id IS NULL AND p.quantity > 0
            ");
            $productsStmt->execute();
            $products = $productsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $synced_count = 0;
            
            foreach ($products as $product) {
                // Create batch if needed
                $batch_id = $product['batch_id'];
                if (!$batch_id) {
                    $batch_reference = 'SYNC-' . date('Ymd-His') . '-' . $product['product_id'];
                    $batchStmt = $conn->prepare("
                        INSERT INTO tbl_batch (
                            batch, supplier_id, location_id, entry_date, entry_time, 
                            entry_by, order_no
                        ) VALUES (?, ?, ?, ?, CURTIME(), 'System Sync', 'SYNC')
                    ");
                    $batchStmt->execute([$batch_reference, null, $product['location_id'], $product['date_added']]);
                    $batch_id = $conn->lastInsertId();
                    
                    // Update product with batch_id
                    $updateProductStmt = $conn->prepare("UPDATE tbl_product SET batch_id = ? WHERE product_id = ?");
                    $updateProductStmt->execute([$batch_id, $product['product_id']]);
                }
                
                // Create stock movement
                $movementStmt = $conn->prepare("
                    INSERT INTO tbl_stock_movements (
                        product_id, batch_id, movement_type, quantity, remaining_quantity,
                        srp, expiration_date, reference_no, notes, created_by
                    ) VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?, 'System Sync')
                ");
                $movementStmt->execute([
                    $product['product_id'], $batch_id, $product['quantity'], $product['quantity'],
                    $product['srp'], $product['expiration'], 'SYNC-' . $product['product_id'],
                    'Synced existing product', 'System Sync'
                ]);
                
                // Create stock summary
                $summaryStmt = $conn->prepare("
                INSERT INTO tbl_stock_summary (
                    product_id, batch_id, available_quantity, srp,
                    expiration_date, batch_reference, total_quantity
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                
                $batchRefStmt = $conn->prepare("SELECT batch FROM tbl_batch WHERE batch_id = ?");
                $batchRefStmt->execute([$batch_id]);
                $batch_ref = $batchRefStmt->fetchColumn();
                
                $summaryStmt->execute([
                    $product['product_id'], $batch_id, $product['quantity'], 
                    $product['srp'], $product['srp'], $product['expiration'], 
                    $batch_ref, $product['quantity']
                ]);
                
                $synced_count++;
            }
            
            $conn->commit();
            
            echo json_encode([
                "success" => true,
                "message" => "Successfully synced $synced_count products",
                "data" => [
                    "synced_count" => $synced_count,
                    "total_products" => count($products)
                ]
            ]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    default:
        echo json_encode([
            "success" => false,
            "message" => "Unknown action: $action"
        ]);
        break;
}

ob_end_flush();
?>
