<?php
// Stock Adjustment API - Handles stock adjustment operations
// Version: 2024-12-19

// CORS headers must be set first, before any output
// Load environment variables for CORS configuration
require_once __DIR__ . '/../simple_dotenv.php';
$dotenv = new SimpleDotEnv(__DIR__ . '/..');
$dotenv->load();

// Get allowed origins from environment variable (comma-separated) - PRODUCTION READY
$corsOriginsEnv = $_ENV['CORS_ALLOWED_ORIGINS'] ?? 'https://enguiostore.vercel.app,https://enguio.shop,http://localhost:3000,http://localhost:3001';
$allowed_origins = array_map('trim', explode(',', $corsOriginsEnv));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Fallback to production URL
    header("Access-Control-Allow-Origin: https://enguiostore.vercel.app");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=utf-8");

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
                    SUM(fs.quantity) as total_quantity,
                    AVG(fs.srp) as avg_srp,
                    MIN(fs.expiration_date) as earliest_expiry,
                    MAX(fs.expiration_date) as latest_expiry,
                    COUNT(DISTINCT fs.batch_id) as batch_count
                FROM tbl_fifo_stock fs
                LEFT JOIN tbl_product p ON fs.product_id = p.product_id
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_location l ON l.location_id = ?
                WHERE fs.quantity > 0
                AND (p.status IS NULL OR p.status <> 'archived')
                GROUP BY p.product_id, p.product_name, p.barcode, p.description, c.category_name, b.brand, s.supplier_name, l.location_name
                ORDER BY p.product_name ASC
            ");
            $stmt->execute([$location_id]);
        } else {
            // Other locations - get from tbl_transfer_batch_details
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
                    SUM(tbd.quantity) as total_quantity,
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
            $batchesStmt = $conn->prepare("
                SELECT 
                    fs.batch_id,
                    fs.batch_reference,
                    fs.quantity as current_qty,
                    fs.srp,
                    fs.expiration_date,
                    l.location_name,
                    fs.created_at as batch_created_at
                FROM tbl_fifo_stock fs
                LEFT JOIN tbl_location l ON l.location_id = ?
                WHERE fs.product_id = ? AND fs.quantity > 0
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
        
        echo json_encode([
            "success" => true,
            "data" => [
                "product" => $product,
                "batches" => $batches
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
        
        // Update the batch quantity in tbl_transfer_batch_details
        $updateStmt = $conn->prepare("
            UPDATE tbl_transfer_batch_details 
            SET quantity = ? 
            WHERE batch_id = ? AND product_id = ?
        ");
        $updateStmt->execute([$new_qty, $batch_id, $product_id]);
        
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
        
        $conn->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Stock adjustment created successfully",
            "data" => [
                "adjustment_id" => $conn->lastInsertId(),
                "movement_type" => $movement_type
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
        
        $stmt = $conn->prepare("
            SELECT DISTINCT
                bal.log_id,
                bal.product_id,
                p.product_name,
                bal.batch_id,
                tbd.batch_reference,
                bal.old_qty,
                bal.new_qty,
                bal.adjustment_qty,
                bal.reason,
                bal.notes,
                bal.adjusted_by,
                bal.movement_type,
                bal.created_at
            FROM tbl_batch_adjustment_log bal
            LEFT JOIN tbl_product p ON bal.product_id = p.product_id
            LEFT JOIN tbl_transfer_batch_details tbd ON bal.batch_id = tbd.batch_id
            ORDER BY bal.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$limit, $offset]);
        $adjustments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get total count
        $countStmt = $conn->prepare("SELECT COUNT(*) FROM tbl_batch_adjustment_log");
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
