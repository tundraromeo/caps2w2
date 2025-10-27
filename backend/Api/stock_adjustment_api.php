<?php
// Stock Adjustment API - Handles stock adjustment operations
// Version: 2024-12-19

// CORS headers must be set first, before any output
// Use centralized CORS configuration
require_once __DIR__ . '/cors.php';

// Handle preflight OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/conn.php';

// Get the action from POST data
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

try {
    switch ($action) {
        case 'test':
            echo json_encode([
                "success" => true,
                "message" => "Stock Adjustment API is working!",
                "data" => [
                    "action" => $action,
                    "input" => $input,
                    "timestamp" => date('Y-m-d H:i:s')
                ]
            ]);
            break;
            
        case 'get_products_for_stock_adjustment':
            handle_get_products_for_stock_adjustment($conn, $input);
            break;
            
        case 'get_product_batches_for_adjustment':
            handle_get_product_batches_for_adjustment($conn, $input);
            break;
            
        case 'create_batch_stock_adjustment':
            handle_create_batch_stock_adjustment($conn, $input);
            break;
            
        case 'get_batch_adjustment_history':
            handle_get_batch_adjustment_history($conn, $input);
            break;
            
        case 'get_batch_adjustment_stats':
            handle_get_batch_adjustment_stats($conn, $input);
            break;
            
        default:
            echo json_encode([
                "success" => false,
                "message" => "Invalid action: " . $action,
                "available_actions" => [
                    "test",
                    "get_products_for_stock_adjustment",
                    "get_product_batches_for_adjustment",
                    "create_batch_stock_adjustment",
                    "get_batch_adjustment_history",
                    "get_batch_adjustment_stats"
                ]
            ]);
            break;
    }
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}

/**
 * Get products available for stock adjustment in a specific location
 */
function handle_get_products_for_stock_adjustment($conn, $data) {
    try {
        $location_id = $data['location_id'] ?? 0;
        
        if (!$location_id) {
            echo json_encode([
                "success" => false,
                "message" => "Location ID is required"
            ]);
            return;
        }
        
        // Get products based on location
        // For warehouse (location_id = 2), check tbl_fifo_stock
        // For other locations, check tbl_transfer_batch_details
        if ($location_id == 2) {
            // Warehouse products - get from tbl_fifo_stock
            // Use actual current quantity from tbl_product instead of summing batches
            $stmt = $conn->prepare("
                SELECT DISTINCT
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    p.description,
                    c.category_name,
                    b.brand,
                    s.supplier_name,
                    l.location_name,
                    p.quantity as total_quantity,
                    p.srp as avg_srp,
                    NULL as earliest_expiry,
                    NULL as latest_expiry,
                    COUNT(DISTINCT fs.batch_id) as batch_count
                FROM tbl_product p
                LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id AND fs.quantity > 0
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_location l ON l.location_id = ?
                WHERE p.location_id = ?
                AND p.quantity > 0
                AND (p.status IS NULL OR p.status <> 'archived')
                GROUP BY p.product_id, p.product_name, p.barcode, p.description, c.category_name, b.brand, s.supplier_name, l.location_name, p.quantity, p.srp
                ORDER BY p.product_name ASC
            ");
            $stmt->execute([$location_id, $location_id]);
        } else {
            // Other locations - get actual quantities from tbl_transfer_batch_details
            // Use actual current quantity instead of summing all batches
            $stmt = $conn->prepare("
                SELECT DISTINCT
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    p.description,
                    c.category_name,
                    b.brand,
                    s.supplier_name,
                    l.location_name,
                    COALESCE(SUM(tbd.quantity), 0) as total_quantity,
                    AVG(tbd.srp) as avg_srp,
                    MIN(tbd.expiration_date) as earliest_expiry,
                    MAX(tbd.expiration_date) as latest_expiry,
                    COUNT(DISTINCT tbd.batch_id) as batch_count
                FROM tbl_transfer_batch_details tbd
                LEFT JOIN tbl_product p ON tbd.product_id = p.product_id
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_location l ON tbd.location_id = l.location_id
                WHERE tbd.location_id = ? 
                AND tbd.quantity > 0
                AND (p.status IS NULL OR p.status <> 'archived')
                AND (
                    -- Pharmacy Store: Show 5 specific products (including Lady pills)
                    (? = 3 AND p.product_id IN (155, 156, 159, 160, 162))
                    OR
                    -- Convenience Store: Show Pinoy Spice and Lady pills
                    (? = 4 AND p.product_id IN (154, 162))
                    OR
                    -- Other locations: Show all products
                    (? NOT IN (3, 4))
                )
                GROUP BY p.product_id, p.product_name, p.barcode, p.description, c.category_name, b.brand, s.supplier_name, l.location_name
                HAVING total_quantity > 0
                ORDER BY p.product_name ASC
            ");
            $stmt->execute([$location_id, $location_id, $location_id, $location_id]);
        }
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Debug logging
        error_log("Stock Adjustment API - Location ID: " . $location_id);
        error_log("Stock Adjustment API - Products found: " . count($products));
        if (!empty($products)) {
            error_log("Stock Adjustment API - First product: " . json_encode($products[0]));
            // Log Lady pills specifically if found
            foreach ($products as $product) {
                if (strpos(strtolower($product['product_name']), 'lady pills') !== false) {
                    error_log("Stock Adjustment API - Lady pills quantity: " . $product['total_quantity']);
                }
            }
        }
        
        echo json_encode([
            "success" => true,
            "data" => $products,
            "debug" => [
                "location_id" => $location_id,
                "products_count" => count($products)
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
            "data" => []
        ]);
    }
}

/**
 * Get product batches for adjustment
 */
function handle_get_product_batches_for_adjustment($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $location_id = $data['location_id'] ?? 0;
        
        if (!$product_id || !$location_id) {
            echo json_encode([
                "success" => false,
                "message" => "Product ID and Location ID are required"
            ]);
            return;
        }
        
        // Get product info
        $productStmt = $conn->prepare("
            SELECT 
                p.product_id,
                p.product_name,
                p.barcode,
                c.category_name,
                b.brand,
                s.supplier_name
            FROM tbl_product p
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            WHERE p.product_id = ?
        ");
        $productStmt->execute([$product_id]);
        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        // Get batches for this product in this location
        // For warehouse (location_id = 2), check tbl_fifo_stock
        // For other locations, check tbl_transfer_batch_details
        if ($location_id == 2) {
            // Warehouse products - get from tbl_fifo_stock
            // Use available_quantity instead of quantity to show current stock
            $batchesStmt = $conn->prepare("
                SELECT 
                    fs.batch_id,
                    fs.batch_reference,
                    fs.available_quantity as current_qty,
                    fs.srp,
                    fs.expiration_date,
                    l.location_name,
                    fs.created_at as batch_created_at
                FROM tbl_fifo_stock fs
                LEFT JOIN tbl_location l ON l.location_id = ?
                WHERE fs.product_id = ? AND fs.available_quantity > 0
                ORDER BY fs.expiration_date ASC, fs.created_at ASC
            ");
            $batchesStmt->execute([$location_id, $product_id]);
        } else {
            // Other locations - get from tbl_transfer_batch_details
            $batchesStmt = $conn->prepare("
                SELECT 
                    tbd.batch_id,
                    tbd.batch_reference,
                    tbd.quantity as current_qty,
                    tbd.srp,
                    tbd.expiration_date,
                    l.location_name,
                    tbd.created_at as batch_created_at
                FROM tbl_transfer_batch_details tbd
                LEFT JOIN tbl_location l ON tbd.location_id = l.location_id
                WHERE tbd.product_id = ? AND tbd.location_id = ? AND tbd.quantity > 0
                ORDER BY tbd.expiration_date ASC, tbd.created_at ASC
            ");
            $batchesStmt->execute([$product_id, $location_id]);
        }
        $batches = $batchesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Debug logging for batches
        error_log("Batch API - Product ID: " . $product_id . ", Location ID: " . $location_id);
        error_log("Batch API - Batches found: " . count($batches));
        if (!empty($batches)) {
            error_log("Batch API - First batch: " . json_encode($batches[0]));
            // Log total batch quantities
            $totalBatchQty = array_sum(array_column($batches, 'current_qty'));
            error_log("Batch API - Total batch quantity: " . $totalBatchQty);
        }
        
        echo json_encode([
            "success" => true,
            "data" => [
                "product" => $product,
                "batches" => $batches
            ],
            "debug" => [
                "product_id" => $product_id,
                "location_id" => $location_id,
                "batches_count" => count($batches),
                "total_batch_qty" => !empty($batches) ? array_sum(array_column($batches, 'current_qty')) : 0
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
            "data" => []
        ]);
    }
}

/**
 * Create batch stock adjustment
 */
function handle_create_batch_stock_adjustment($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $batch_id = $data['batch_id'] ?? 0;
        $old_qty = $data['old_qty'] ?? 0;
        $new_qty = $data['new_qty'] ?? 0;
        $adjustment_qty = $data['adjustment_qty'] ?? 0;
        $reason = $data['reason'] ?? '';
        $notes = $data['notes'] ?? '';
        $adjusted_by = $data['adjusted_by'] ?? 'system';
        
        if (!$product_id || !$batch_id || !$reason) {
            echo json_encode([
                "success" => false,
                "message" => "Product ID, Batch ID, and Reason are required"
            ]);
            return;
        }
        
        // Start transaction
        $conn->beginTransaction();
        
        // Determine which table to update based on location
        // For warehouse (location_id = 2), update tbl_fifo_stock
        // For other locations, update tbl_transfer_batch_details
        
        // Get location_id for this batch from tbl_product
        $locationStmt = $conn->prepare("
            SELECT p.location_id 
            FROM tbl_product p
            WHERE p.product_id = ?
            LIMIT 1
        ");
        $locationStmt->execute([$product_id]);
        $location = $locationStmt->fetch(PDO::FETCH_ASSOC);
        
        error_log("Stock Adjustment - Product ID: $product_id, Location ID: " . ($location ? $location['location_id'] : 'not found'));
        
        if ($location && $location['location_id'] == 2) {
            // Warehouse - update tbl_fifo_stock
            $updateStmt = $conn->prepare("
                UPDATE tbl_fifo_stock 
                SET available_quantity = ?, quantity = ?
                WHERE batch_id = ? AND product_id = ?
            ");
            $updateStmt->execute([$new_qty, $new_qty, $batch_id, $product_id]);
            
            error_log("Stock Adjustment - Updated tbl_fifo_stock: batch_id=$batch_id, product_id=$product_id, new_qty=$new_qty");
        } else {
            // Other locations - update tbl_transfer_batch_details
            $updateStmt = $conn->prepare("
                UPDATE tbl_transfer_batch_details 
                SET quantity = ? 
                WHERE batch_id = ? AND product_id = ?
            ");
            $updateStmt->execute([$new_qty, $batch_id, $product_id]);
            
            error_log("Stock Adjustment - Updated tbl_transfer_batch_details: batch_id=$batch_id, product_id=$product_id, new_qty=$new_qty");
        }
        
        // Log the adjustment
        $logStmt = $conn->prepare("
            INSERT INTO tbl_batch_adjustment_log (
                product_id, batch_id, old_qty, new_qty, adjustment_qty, 
                reason, notes, adjusted_by, movement_type, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $movement_type = $adjustment_qty > 0 ? 'IN' : 'OUT';
        $logStmt->execute([
            $product_id, $batch_id, $old_qty, $new_qty, $adjustment_qty,
            $reason, $notes, $adjusted_by, $movement_type
        ]);
        
        // Additional logging for debugging
        error_log("Stock Adjustment - Adjustment logged: product_id=$product_id, batch_id=$batch_id, old_qty=$old_qty, new_qty=$new_qty, adjustment_qty=$adjustment_qty");
        
        $conn->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Stock adjustment created successfully",
            "data" => [
                "adjustment_id" => $conn->lastInsertId(),
                "movement_type" => $movement_type,
                "location_id" => $location ? $location['location_id'] : 'unknown',
                "table_updated" => ($location && $location['location_id'] == 2) ? 'tbl_fifo_stock' : 'tbl_transfer_batch_details'
            ]
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
}

/**
 * Get batch adjustment history
 */
function handle_get_batch_adjustment_history($conn, $data) {
    try {
        $page = $data['page'] ?? 1;
        $limit = $data['limit'] ?? 10;
        $offset = ($page - 1) * $limit;
        $includeArchived = $data['include_archived'] ?? false;
        
        // Check if is_archived column exists
        $checkColumnStmt = $conn->prepare("SHOW COLUMNS FROM tbl_batch_adjustment_log LIKE 'is_archived'");
        $checkColumnStmt->execute();
        $columnExists = $checkColumnStmt->fetch();
        
        if (!$columnExists) {
            try {
                $conn->exec("ALTER TABLE tbl_batch_adjustment_log ADD COLUMN is_archived TINYINT(1) DEFAULT 0");
            } catch (Exception $e) {
                error_log("Could not add is_archived column: " . $e->getMessage());
            }
        }
        
        // Build WHERE clause based on include_archived parameter
        $whereClause = "";
        if (!$includeArchived) {
            $whereClause = "WHERE bal.is_archived IS NULL OR bal.is_archived = 0";
        }
        
        $sql = "
            SELECT DISTINCT
                bal.log_id,
                bal.product_id,
                p.product_name,
                p.barcode,
                bal.batch_id,
                COALESCE(tbd.batch_reference, fs.batch_reference, 'N/A') as batch_reference,
                bal.old_qty,
                bal.new_qty,
                bal.adjustment_qty,
                bal.reason,
                bal.notes,
                bal.adjusted_by,
                bal.movement_type,
                bal.created_at,
                COALESCE(bal.is_archived, 0) as is_archived,
                COALESCE(tbd.srp, fs.srp, 0) as srp,
                COALESCE(tbd.expiration_date, fs.expiration_date) as expiration_date,
                c.category_name,
                b.brand
            FROM tbl_batch_adjustment_log bal
            LEFT JOIN tbl_product p ON bal.product_id = p.product_id
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_transfer_batch_details tbd ON bal.batch_id = tbd.batch_id AND bal.product_id = tbd.product_id
            LEFT JOIN tbl_fifo_stock fs ON bal.batch_id = fs.batch_id AND bal.product_id = fs.product_id
            " . $whereClause . "
            ORDER BY bal.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([$limit, $offset]);
        $adjustments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Debug logging
        error_log("Batch Adjustment History - Found " . count($adjustments) . " adjustments (include_archived: " . ($includeArchived ? 'true' : 'false') . ")");
        if (!empty($adjustments)) {
            error_log("Batch Adjustment History - Sample adjustment: " . json_encode($adjustments[0]));
        }
        
        // Get total count
        $countSql = "SELECT COUNT(*) FROM tbl_batch_adjustment_log";
        if (!$includeArchived) {
            $countSql .= " WHERE is_archived IS NULL OR is_archived = 0";
        }
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute();
        $total = $countStmt->fetchColumn();
        
        echo json_encode([
            "success" => true,
            "data" => $adjustments,
            "total" => $total,
            "page" => $page,
            "limit" => $limit
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
            "data" => []
        ]);
    }
}

/**
 * Get batch adjustment statistics
 */
function handle_get_batch_adjustment_stats($conn, $data) {
    try {
        $stmt = $conn->prepare("
            SELECT 
                COUNT(*) as total_adjustments,
                SUM(CASE WHEN movement_type = 'IN' THEN 1 ELSE 0 END) as additions,
                SUM(CASE WHEN movement_type = 'OUT' THEN 1 ELSE 0 END) as subtractions,
                SUM(adjustment_qty) as net_quantity
            FROM tbl_batch_adjustment_log
            WHERE is_archived IS NULL OR is_archived = 0
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
}
?>
