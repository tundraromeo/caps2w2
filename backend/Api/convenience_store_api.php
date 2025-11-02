<?php
/**
 * Convenience Store API
 * Handles all convenience store specific operations
 */

// CORS headers must be set first, before any output
// Use centralized CORS configuration
require_once __DIR__ . '/cors.php';

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
        case 'get_convenience_products_fifo':
            // Get products with FIFO-consistent quantities (first batch quantity)
            $location_name = $data['location_name'] ?? 'convenience';
            $search = $data['search'] ?? '';
            $category = $data['category'] ?? 'all';
            $product_type = $data['product_type'] ?? 'all';
            
            $where = "l.location_name LIKE '%convenience%'";
            $params = [];
            
            if (!empty($search)) {
                $where .= " AND (p.product_name LIKE ? OR p.barcode LIKE ? OR c.category_name LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam]);
            }
            
            if ($category !== 'all') {
                $where .= " AND c.category_name = ?";
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
                    c.category_name,
                    b.brand,
                    -- Use transfer batch details SRP (no fallback to tbl_product)
                    COALESCE(tbd.srp, 0) as unit_price,
                    COALESCE(tbd.srp, 0) as srp,
                    -- Sum all batch quantities for same product (handle related products)
                    -- Only use tbl_transfer_batch_details
                    COALESCE(
                        (SELECT SUM(tbd2.quantity) 
                         FROM tbl_transfer_batch_details tbd2 
                         WHERE tbd2.product_id = p.product_id
                         AND tbd2.location_id = (
                             SELECT l2.location_id FROM tbl_location l2 WHERE l2.location_name LIKE '%convenience%' LIMIT 1
                         )),
                        0
                    ) as total_quantity,
                    -- Count total batches for this product
                    COALESCE(
                        (SELECT COUNT(DISTINCT tbd3.batch_id) 
                         FROM tbl_transfer_batch_details tbd3 
                         WHERE tbd3.product_id = p.product_id
                         AND tbd3.location_id = (
                             SELECT l3.location_id FROM tbl_location l3 WHERE l3.location_name LIKE '%convenience%' LIMIT 1
                         )),
                        0
                    ) as total_batches,
                    MAX(p.status) as status,
                    s.supplier_name,
                    -- Use transfer expiration if available, otherwise product expiration
                    COALESCE(
                        (SELECT tbd_exp.expiration_date 
                         FROM tbl_transfer_batch_details tbd_exp 
                         WHERE tbd_exp.product_id = p.product_id 
                         AND tbd_exp.location_id = (
                             SELECT l_exp.location_id FROM tbl_location l_exp WHERE l_exp.location_name LIKE '%convenience%' LIMIT 1
                         )
                         ORDER BY tbd_exp.expiration_date ASC, tbd_exp.id ASC 
                         LIMIT 1),
                        MAX(p.expiration)
                    ) as expiration,
                    l.location_name,
                    (SELECT tbd2.srp 
                     FROM tbl_transfer_batch_details tbd2 
                     WHERE tbd2.product_id = p.product_id 
                     AND tbd2.location_id = tbd.location_id
                     ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                     LIMIT 1) as transfer_srp,
                    (SELECT tbd_exp.expiration_date 
                     FROM tbl_transfer_batch_details tbd_exp 
                     WHERE tbd_exp.product_id = p.product_id 
                     AND tbd_exp.location_id = (
                         SELECT l_exp.location_id FROM tbl_location l_exp WHERE l_exp.location_name LIKE '%convenience%' LIMIT 1
                     )
                     ORDER BY tbd_exp.expiration_date ASC, tbd_exp.id ASC 
                     LIMIT 1) as transfer_expiration,
                    COALESCE(tbd.srp, 0) as first_batch_srp
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                LEFT JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id AND tbd.location_id = (
                    SELECT l2.location_id FROM tbl_location l2 WHERE l2.location_name LIKE '%convenience%' LIMIT 1
                )
                WHERE ($where OR EXISTS (
                    SELECT 1 FROM tbl_transfer_batch_details tbd3 
                    WHERE tbd3.product_id = p.product_id 
                    AND tbd3.location_id = (
                        SELECT l3.location_id FROM tbl_location l3 WHERE l3.location_name LIKE '%convenience%' LIMIT 1
                    )
                ))
                GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, s.supplier_name, l.location_name
                HAVING srp > 0
                ORDER BY COALESCE(
                    (SELECT MIN(tbd_earliest.expiration_date) 
                     FROM tbl_transfer_batch_details tbd_earliest 
                     WHERE tbd_earliest.product_id = p.product_id 
                     AND tbd_earliest.location_id = (
                         SELECT l_earliest.location_id FROM tbl_location l_earliest WHERE l_earliest.location_name LIKE '%convenience%' LIMIT 1
                     )
                     AND tbd_earliest.quantity > 0),
                    (SELECT MIN(fs_earliest.expiration_date) 
                     FROM tbl_fifo_stock fs_earliest 
                     WHERE fs_earliest.product_id = p.product_id 
                     AND fs_earliest.available_quantity > 0),
                    ss.expiration_date, 
                    p.expiration
                ) ASC, p.product_name ASC
            ");
            
            try {
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                // error_log("SQL Error in get_convenience_products_fifo: " . $e->getMessage());
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage(),
                    "data" => []
                ]);
                break;
            }
            
            // Update quantity field to use total_quantity and ensure total_batches is set
            // AND add multi-unit information if available
            foreach ($rows as &$row) {
                $row['quantity'] = $row['total_quantity'];
                
                // If total_batches is not set, calculate it
                if (!isset($row['total_batches']) || $row['total_batches'] === null) {
                    $batchCountStmt = $conn->prepare("
                        SELECT COUNT(DISTINCT batch_id) as batch_count
                        FROM tbl_transfer_batch_details 
                        WHERE product_id = ? 
                        AND location_id = (
                            SELECT location_id FROM tbl_location WHERE location_name LIKE '%convenience%' LIMIT 1
                        )
                    ");
                    $batchCountStmt->execute([$row['product_id']]);
                    $batchCount = $batchCountStmt->fetch(PDO::FETCH_ASSOC);
                    $row['total_batches'] = $batchCount['batch_count'] ?? 0;
                }
                
                // Get product units if multi-unit is enabled
                $unitsStmt = $conn->prepare("
                    SELECT 
                        pu.unit_id,
                        pu.unit_name,
                        pu.unit_quantity,
                        pu.unit_price,
                        pu.is_base_unit,
                        pu.barcode,
                        FLOOR(? / pu.unit_quantity) as available_stock
                    FROM tbl_product_units pu
                    JOIN tbl_product p ON pu.product_id = p.product_id
                    WHERE pu.product_id = ? 
                    AND pu.status = 'active'
                    AND p.allow_multi_unit = 1
                    ORDER BY pu.unit_quantity ASC
                ");
                $unitsStmt->execute([$row['total_quantity'], $row['product_id']]);
                $units = $unitsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                $row['has_units'] = count($units) > 0;
                $row['units'] = $units;
                $row['default_unit'] = null;
                
                if (count($units) > 0) {
                    // Set default unit (base unit or first unit)
                    foreach ($units as $unit) {
                        if ($unit['is_base_unit'] == 1) {
                            $row['default_unit'] = $unit['unit_name'];
                            break;
                        }
                    }
                    if (!$row['default_unit']) {
                        $row['default_unit'] = $units[0]['unit_name'];
                    }
                }
            }
            
            echo json_encode([
                "success" => true,
                "data" => $rows,
                "count" => count($rows)
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
                $where .= " AND (p.product_name LIKE ? OR p.barcode LIKE ? OR c.category_name LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam]);
            }
            
            if ($category !== 'all') {
                $where .= " AND c.category_name = ?";
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
                    c.category_name,
                    b.brand,
                    -- Use stock summary SRP if available, then transfer batch details SRP, then product SRP
                    COALESCE(ss.srp, tbd.srp, 0) as unit_price,
                    COALESCE(ss.srp, tbd.srp, 0) as srp,
                    -- Sum all batch quantities for same product (handle related products)
                    COALESCE(
                        (SELECT SUM(tbd2.quantity) 
                         FROM tbl_transfer_batch_details tbd2 
                         WHERE tbd2.product_id = p.product_id
                         AND tbd2.location_id = (
                             SELECT l2.location_id FROM tbl_location l2 WHERE l2.location_name LIKE '%convenience%' LIMIT 1
                         )),
                        SUM(ss.available_quantity), 
                        0
                    ) as total_quantity,
                    MAX(p.status) as status,
                    s.supplier_name,
                    -- Use transfer expiration if available, otherwise product expiration
                    COALESCE(
                        (SELECT tbd_exp.expiration_date 
                         FROM tbl_transfer_batch_details tbd_exp 
                         WHERE tbd_exp.product_id = p.product_id 
                         AND tbd_exp.location_id = (
                             SELECT l_exp.location_id FROM tbl_location l_exp WHERE l_exp.location_name LIKE '%convenience%' LIMIT 1
                         )
                         ORDER BY tbd_exp.expiration_date ASC, tbd_exp.id ASC 
                         LIMIT 1),
                        MAX(p.expiration)
                    ) as expiration,
                    l.location_name,
                    (SELECT tbd2.srp 
                     FROM tbl_transfer_batch_details tbd2 
                     WHERE tbd2.product_id = p.product_id 
                     AND tbd2.location_id = tbd.location_id
                     ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                     LIMIT 1) as transfer_srp,
                    (SELECT tbd_exp.expiration_date 
                     FROM tbl_transfer_batch_details tbd_exp 
                     WHERE tbd_exp.product_id = p.product_id 
                     AND tbd_exp.location_id = (
                         SELECT l_exp.location_id FROM tbl_location l_exp WHERE l_exp.location_name LIKE '%convenience%' LIMIT 1
                     )
                     ORDER BY tbd_exp.expiration_date ASC, tbd_exp.id ASC 
                     LIMIT 1) as transfer_expiration,
                    COALESCE(ss.srp, tbd.srp, 0) as first_batch_srp
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                LEFT JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id AND tbd.location_id = p.location_id
                WHERE $where
                GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, s.supplier_name, l.location_name
                HAVING total_quantity > 0
                ORDER BY COALESCE(
                    (SELECT MIN(tbd_earliest.expiration_date) 
                     FROM tbl_transfer_batch_details tbd_earliest 
                     WHERE tbd_earliest.product_id = p.product_id 
                     AND tbd_earliest.location_id = (
                         SELECT l_earliest.location_id FROM tbl_location l_earliest WHERE l_earliest.location_name LIKE '%convenience%' LIMIT 1
                     )
                     AND tbd_earliest.quantity > 0),
                    (SELECT MIN(fs_earliest.expiration_date) 
                     FROM tbl_fifo_stock fs_earliest 
                     WHERE fs_earliest.product_id = p.product_id 
                     AND fs_earliest.available_quantity > 0),
                    ss.expiration_date, 
                    p.expiration
                ) ASC, p.product_name ASC
            ");
            
            try {
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                // error_log("SQL Error in get_convenience_products: " . $e->getMessage());
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage(),
                    "data" => []
                ]);
                break;
            }
            
            // Update quantity field to use total_quantity and ensure total_batches is set
            foreach ($rows as &$row) {
                $row['quantity'] = $row['total_quantity'];
                
                // If total_batches is not set, calculate it
                if (!isset($row['total_batches']) || $row['total_batches'] === null) {
                    $batchCountStmt = $conn->prepare("
                        SELECT COUNT(DISTINCT batch_id) as batch_count
                        FROM tbl_transfer_batch_details 
                        WHERE product_id = ? 
                        AND location_id = (
                            SELECT location_id FROM tbl_location WHERE location_name LIKE '%convenience%' LIMIT 1
                        )
                    ");
                    $batchCountStmt->execute([$row['product_id']]);
                    $batchCount = $batchCountStmt->fetch(PDO::FETCH_ASSOC);
                    $row['total_batches'] = $batchCount['batch_count'] ?? 0;
                }
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
                $where .= " AND (p.product_name LIKE ? OR p.barcode LIKE ? OR c.category_name LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam]);
            }
            
            if ($category !== 'all') {
                $where .= " AND c.category_name = ?";
                $params[] = $category;
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    MIN(p.product_id) as product_id,
                    p.product_name,
                    p.barcode,
                    c.category_name,
                    b.brand,
                    -- Use stock summary SRP if available, then transfer batch details SRP, then product SRP
                    COALESCE(ss.srp, tbd.srp, 0) as unit_price,
                    COALESCE(ss.srp, tbd.srp, 0) as srp,
                    -- Sum all batch quantities for same product (handle related products)
                    COALESCE(
                        (SELECT SUM(tbd2.quantity) 
                         FROM tbl_transfer_batch_details tbd2 
                         WHERE tbd2.product_id = p.product_id
                         AND tbd2.location_id = (
                             SELECT l2.location_id FROM tbl_location l2 WHERE l2.location_name LIKE '%convenience%' LIMIT 1
                         )),
                        SUM(ss.available_quantity), 
                        0
                    ) as total_quantity,
                    MAX(p.status) as status,
                    s.supplier_name,
                    -- Use transfer expiration if available, otherwise product expiration
                    COALESCE(
                        (SELECT tbd_exp.expiration_date 
                         FROM tbl_transfer_batch_details tbd_exp 
                         WHERE tbd_exp.product_id = p.product_id 
                         AND tbd_exp.location_id = (
                             SELECT l_exp.location_id FROM tbl_location l_exp WHERE l_exp.location_name LIKE '%convenience%' LIMIT 1
                         )
                         ORDER BY tbd_exp.expiration_date ASC, tbd_exp.id ASC 
                         LIMIT 1),
                        MAX(p.expiration)
                    ) as expiration,
                    l.location_name,
                    (SELECT tbd2.srp 
                     FROM tbl_transfer_batch_details tbd2 
                     WHERE tbd2.product_id = p.product_id 
                     AND tbd2.location_id = tbd.location_id
                     ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                     LIMIT 1) as transfer_srp,
                    (SELECT tbd_exp.expiration_date 
                     FROM tbl_transfer_batch_details tbd_exp 
                     WHERE tbd_exp.product_id = p.product_id 
                     AND tbd_exp.location_id = (
                         SELECT l_exp.location_id FROM tbl_location l_exp WHERE l_exp.location_name LIKE '%convenience%' LIMIT 1
                     )
                     ORDER BY tbd_exp.expiration_date ASC, tbd_exp.id ASC 
                     LIMIT 1) as transfer_expiration,
                    COALESCE(ss.srp, tbd.srp, 0) as first_batch_srp
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                LEFT JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id AND tbd.location_id = p.location_id
                WHERE $where
                GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, s.supplier_name, l.location_name
                HAVING total_quantity > 0
                ORDER BY COALESCE(
                    (SELECT MIN(tbd_earliest.expiration_date) 
                     FROM tbl_transfer_batch_details tbd_earliest 
                     WHERE tbd_earliest.product_id = p.product_id 
                     AND tbd_earliest.location_id = (
                         SELECT l_earliest.location_id FROM tbl_location l_earliest WHERE l_earliest.location_name LIKE '%convenience%' LIMIT 1
                     )
                     AND tbd_earliest.quantity > 0),
                    (SELECT MIN(fs_earliest.expiration_date) 
                     FROM tbl_fifo_stock fs_earliest 
                     WHERE fs_earliest.product_id = p.product_id 
                     AND fs_earliest.available_quantity > 0),
                    ss.expiration_date, 
                    p.expiration
                ) ASC, p.product_name ASC
            ");
            
            try {
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                // error_log("SQL Error in get_convenience_products: " . $e->getMessage());
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage(),
                    "data" => []
                ]);
                break;
            }
            
            // Update quantity field to use total_quantity and ensure total_batches is set
            foreach ($rows as &$row) {
                $row['quantity'] = $row['total_quantity'];
                
                // If total_batches is not set, calculate it
                if (!isset($row['total_batches']) || $row['total_batches'] === null) {
                    $batchCountStmt = $conn->prepare("
                        SELECT COUNT(DISTINCT batch_id) as batch_count
                        FROM tbl_transfer_batch_details 
                        WHERE product_id = ? 
                        AND location_id = (
                            SELECT location_id FROM tbl_location WHERE location_name LIKE '%convenience%' LIMIT 1
                        )
                    ");
                    $batchCountStmt->execute([$row['product_id']]);
                    $batchCount = $batchCountStmt->fetch(PDO::FETCH_ASSOC);
                    $row['total_batches'] = $batchCount['batch_count'] ?? 0;
                }
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
            
            try {
            
            // Get convenience store location ID if not provided
            if (!$location_id) {
                $locStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE '%convenience%' LIMIT 1");
                $locStmt->execute();
                $location_id = $locStmt->fetchColumn();
            }
            
            // Debug: Log the location ID
            // error_log("DEBUG get_convenience_batch_details: convenience store location_id=$location_id");
            
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
            
            // If no related products found, use the original product_id
            if (empty($relatedProductIds)) {
                $relatedProductIds = [$product_id];
            }
            
            // Create placeholders for IN clause
            $placeholders = str_repeat('?,', count($relatedProductIds) - 1) . '?';
            
            // Debug: Log the parameters
            // error_log("DEBUG get_convenience_batch_details: product_id=$product_id, location_id=$location_id");
            // error_log("DEBUG get_convenience_batch_details: relatedProductIds=" . json_encode($relatedProductIds));
            
            // Get batch transfer details from tbl_transfer_batch_details for all related products
            // Only show batches that still have available quantity (not completely consumed)
            $batchStmt = $conn->prepare("
                SELECT 
                    btd.id,
                    btd.batch_id,
                    btd.batch_reference,
                    btd.quantity as batch_quantity,  -- Show actual consumed quantities
                    btd.srp,
                    btd.srp as batch_srp,
                    btd.expiration_date,
                    btd.created_at as transfer_date,
                    CONCAT('TR-', btd.id) as transfer_id,
                    CASE 
                        WHEN btd.quantity > 0 THEN 'Done'
                        ELSE 'Available'
                    END as status,
                    p.product_name,
                    p.barcode,
                    br.brand,
                    c.category_name,
                    COALESCE(l.location_name, 'Warehouse') as source_location_name,
                    'System' as employee_name
                FROM tbl_transfer_batch_details btd
                LEFT JOIN tbl_product p ON btd.product_id = p.product_id
                LEFT JOIN tbl_brand br ON p.brand_id = br.brand_id
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON btd.location_id = l.location_id
                WHERE btd.product_id IN ($placeholders)
                AND btd.quantity > 0  -- Only show batches with available quantity
                ORDER BY btd.expiration_date ASC, btd.id ASC
            ");
            $batchStmt->execute($relatedProductIds);
            $batchDetails = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // All batches should now be retrieved without location filter
            
            // Debug: Log the results
            // error_log("DEBUG get_convenience_batch_details: batchDetails count=" . count($batchDetails));
            // error_log("DEBUG get_convenience_batch_details: batchDetails=" . json_encode($batchDetails));
            
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
                        c.category_name,
                        'Warehouse' as source_location_name,
                        fs.entry_by as employee_name
                    FROM tbl_fifo_stock fs
                    LEFT JOIN tbl_product p ON fs.product_id = p.product_id
                    LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                    LEFT JOIN tbl_category c ON p.category_id = c.category_id
                    WHERE fs.product_id IN ($placeholders)
                    AND fs.available_quantity > 0  -- Only show batches with available quantity
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
                        COALESCE(tbd.srp, 0) as batch_srp,
                        fs.expiration_date,
                        'Available' as status,
                        th.date as transfer_date,
                        p.product_name,
                        p.barcode,
                        br.brand,
                        c.category_name,
                        sl.location_name as source_location_name,
                        e.Fname as employee_name
                    FROM tbl_transfer_dtl td
                    JOIN tbl_transfer_header th ON td.transfer_header_id = th.transfer_header_id
                    JOIN tbl_product p ON td.product_id = p.product_id
                    LEFT JOIN tbl_brand br ON p.brand_id = br.brand_id
                    LEFT JOIN tbl_category c ON p.category_id = c.category_id
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
            
            } catch (Exception $e) {
                echo json_encode([
                    'success' => false, 
                    'message' => 'Database error: ' . $e->getMessage(),
                    'data' => []
                ]);
            }
            break;
            
        case 'get_transfer_batch_details':
            // Get transfer batch details for convenience store
            $transfer_id = $data['transfer_id'] ?? 0;
            $product_id = $data['product_id'] ?? 0;
            $location_id = $data['location_id'] ?? 0;
            
            // Check if this is for inventory (transfer_id) or store (product_id + location_id)
            if ($transfer_id) {
                // For InventoryTransfer modal - get batch details for specific transfer
                // Updated query to properly join with transfer details
                $stmt = $conn->prepare("
                    SELECT DISTINCT
                        tbd.id,
                        tbd.product_id,
                        tbd.batch_id,
                        tbd.batch_reference,
                        tbd.quantity as batch_quantity,
                        tbd.srp as batch_srp,
                        tbd.expiration_date,
                        tbd.created_at as transfer_date,
                        p.product_name,
                        p.barcode,
                        fs.available_quantity,
                        th.source_location_id,
                        th.destination_location_id,
                        sl.location_name as source_location_name,
                        dl.location_name as destination_location_name,
                        CONCAT(e.Fname, ' ', e.Lname) as employee_name
                    FROM tbl_transfer_batch_details tbd
                    LEFT JOIN tbl_product p ON tbd.product_id = p.product_id
                    LEFT JOIN tbl_fifo_stock fs ON tbd.batch_id = fs.batch_id
                    LEFT JOIN tbl_transfer_dtl td ON tbd.product_id = td.product_id
                    LEFT JOIN tbl_transfer_header th ON td.transfer_header_id = th.transfer_header_id
                    LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                    LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
                    LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
                    WHERE th.transfer_header_id = ?
                    ORDER BY tbd.expiration_date ASC, tbd.id ASC
                ");
                $stmt->execute([$transfer_id]);
                $batch_details = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // If no batch details found from tbl_transfer_batch_details, try getting from tbl_transfer_dtl
                if (empty($batch_details)) {
                    $fallbackStmt = $conn->prepare("
                        SELECT 
                            td.transfer_dtl_id as id,
                            td.product_id,
                            fs.batch_id,
                            fs.batch_reference,
                            td.qty as batch_quantity,
                            fs.srp as batch_srp,
                            fs.expiration_date,
                            th.date as transfer_date,
                            p.product_name,
                            p.barcode,
                            fs.available_quantity,
                            th.source_location_id,
                            th.destination_location_id,
                            sl.location_name as source_location_name,
                            dl.location_name as destination_location_name,
                            CONCAT(e.Fname, ' ', e.Lname) as employee_name
                        FROM tbl_transfer_dtl td
                        JOIN tbl_transfer_header th ON td.transfer_header_id = th.transfer_header_id
                        LEFT JOIN tbl_product p ON td.product_id = p.product_id
                        LEFT JOIN tbl_fifo_stock fs ON td.product_id = fs.product_id
                        LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                        LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
                        LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
                        WHERE th.transfer_header_id = ?
                        ORDER BY fs.expiration_date ASC, td.transfer_dtl_id ASC
                    ");
                    $fallbackStmt->execute([$transfer_id]);
                    $batch_details = $fallbackStmt->fetchAll(PDO::FETCH_ASSOC);
                }
                
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
                        'Done' as status,
                        th.date as transfer_date,
                        th.transfer_header_id,
                        p.product_name,
                        p.barcode,
                        COALESCE(tbd.srp, 0) as unit_price,
                        COALESCE(tbd.srp, 0) as srp,
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
                LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
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
                    return $item['status'] === 'Done';
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
            
        case 'get_batch_transfers_by_location':
            // Get all batch transfers for a specific location (convenience store)
            $location_id = $data['location_id'] ?? 0;
            
            if (!$location_id) {
                echo json_encode(['success' => false, 'message' => 'Location ID is required']);
                break;
            }
            
            // Get batch transfer details for the location
            $stmt = $conn->prepare("
                SELECT 
                    btd.id,
                    btd.batch_id,
                    btd.batch_reference,
                    btd.quantity as batch_quantity,
                    btd.srp as batch_srp,
                    btd.expiration_date,
                    p.product_name,
                    p.barcode,
                    c.category_name,
                    b.brand,
                    s.supplier_name,
                    l.location_name as source_location_name,
                    e.Fname,
                    e.Lname,
                    CONCAT(e.Fname, ' ', e.Lname) as employee_name
                FROM tbl_transfer_batch_details btd
                LEFT JOIN tbl_product p ON btd.product_id = p.product_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_employee e ON btd.transferred_by = e.emp_id
                WHERE p.location_id = ?
                ORDER BY btd.id DESC
            ");
            $stmt->execute([$location_id]);
            $batchTransfers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate summary
            $summary = [
                'total_transfers' => count($batchTransfers),
                'total_products' => count(array_unique(array_column($batchTransfers, 'product_id'))),
                'total_quantity' => array_sum(array_column($batchTransfers, 'batch_quantity')),
                'total_value' => array_sum(array_map(function($transfer) {
                    return $transfer['batch_quantity'] * ($transfer['batch_srp'] ?? 0);
                }, $batchTransfers))
            ];
            
            echo json_encode([
                "success" => true,
                "data" => [
                    "batch_transfers" => $batchTransfers,
                    "summary" => $summary
                ]
            ]);
            break;
            
        case 'process_convenience_sale':
            // Process sale with FIFO batch consumption for convenience store
            $transaction_id = $data['transaction_id'] ?? '';
            $total_amount = $data['total_amount'] ?? 0;
            $items = $data['items'] ?? [];
            $location_name = 'Convenience Store';
            
            // Debug logging
            // error_log("Convenience Store Sale Processing: Transaction ID: $transaction_id, Total: $total_amount, Items: " . json_encode($items));
            
            if (empty($items) || $total_amount <= 0) {
                // error_log("Convenience Store Sale Error: Invalid sale data - Items: " . json_encode($items) . ", Total: $total_amount");
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
                        // Consume from transfer batch details using FIFO (earliest expiration first)
                        $fifoStmt = $conn->prepare("
                            SELECT 
                                tbd.id as batch_id,
                                tbd.batch_reference, 
                                tbd.quantity as available_quantity,
                                tbd.expiration_date,
                                tbd.srp
                            FROM tbl_transfer_batch_details tbd
                            WHERE tbd.product_id = ? 
                            AND tbd.location_id = ?
                            AND tbd.quantity > 0
                            ORDER BY tbd.expiration_date ASC, tbd.id ASC
                        ");
                        $fifoStmt->execute([$product_id, $location_id]);
                        $fifoBatches = $fifoStmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        // error_log("FIFO batches found for product $product_id: " . count($fifoBatches) . " batches");
                        if (empty($fifoBatches)) {
                            // error_log("WARNING: No FIFO batches found for product $product_id in location $location_id");
                        }
                        
                        $remaining_to_consume = $quantity;
                        $consumed_batches = [];
                        
                        foreach ($fifoBatches as $batch) {
                            if ($remaining_to_consume <= 0) break;
                            
                            $consume_qty = min($batch['available_quantity'], $remaining_to_consume);
                            
                            // error_log("Consuming from batch {$batch['batch_reference']}: $consume_qty units (available: {$batch['available_quantity']})");
                            
                            // Update transfer batch details quantity (FIFO consumption)
                            $updateBatchStmt = $conn->prepare("
                                UPDATE tbl_transfer_batch_details 
                                SET quantity = quantity - ?
                                WHERE id = ? AND location_id = ?
                            ");
                            $updateBatchStmt->execute([$consume_qty, $batch['batch_id'], $location_id]);
                            $batchRowsAffected = $updateBatchStmt->rowCount();
                            // error_log("Batch transfer details updated: batch_id {$batch['batch_id']}, location_id $location_id, consumed: $consume_qty, rows affected: $batchRowsAffected");
                            
                            $consumed_batches[] = [
                                'batch_id' => $batch['batch_id'],
                                'batch_reference' => $batch['batch_reference'],
                                'quantity_consumed' => $consume_qty
                            ];
                            
                            $remaining_to_consume -= $consume_qty;
                        }
                        
                        // NOTE: FIFO stock already updated above per batch (lines 754-787)
                        // No need to update again here as it would cause double subtraction
                        // error_log("FIFO stock already updated per batch above - no additional subtraction needed");
                        
                        // Update stock summary
                        $updateStockSummaryStmt = $conn->prepare("
                            UPDATE tbl_stock_summary 
                            SET available_quantity = available_quantity - ?, 
                                total_quantity = total_quantity - ?,
                                last_updated = NOW()
                            WHERE product_id = ?
                        ");
                        $updateStockSummaryStmt->execute([$quantity, $quantity, $product_id]);
                        $stockSummaryRowsAffected = $updateStockSummaryStmt->rowCount();
                        // error_log("Stock summary update result: Rows affected: $stockSummaryRowsAffected");
                        
                        // Update transfer batch details quantity (fallback if no FIFO data)
                        if (empty($consumed_batches)) {
                            // Get product info for related products lookup
                            $productInfoStmt = $conn->prepare("SELECT product_name, barcode FROM tbl_product WHERE product_id = ?");
                            $productInfoStmt->execute([$product_id]);
                            $productInfo = $productInfoStmt->fetch(PDO::FETCH_ASSOC);
                            
                            if ($productInfo) {
                                // Find related products with same name and barcode
                                $relatedStmt = $conn->prepare("SELECT product_id FROM tbl_product WHERE product_name = ? AND barcode = ?");
                                $relatedStmt->execute([$productInfo['product_name'], $productInfo['barcode']]);
                                $relatedProductIds = $relatedStmt->fetchAll(PDO::FETCH_COLUMN);
                                
                                // Update transfer batch details for related products
                                foreach ($relatedProductIds as $relatedProductId) {
                                $updateTransferBatchStmt = $conn->prepare("
                                    UPDATE tbl_transfer_batch_details 
                                    SET quantity = quantity - ?
                                    WHERE product_id = ? AND location_id = 2
                                    ORDER BY expiration_date ASC, id ASC
                                    LIMIT 1
                                ");
                                $updateTransferBatchStmt->execute([$quantity, $relatedProductId]);
                                    $transferBatchRowsAffected = $updateTransferBatchStmt->rowCount();
                                    // error_log("Transfer batch details update for product $relatedProductId: Rows affected: $transferBatchRowsAffected");
                                }
                            }
                        }
                        
                        // Get current product quantity after sale from tbl_fifo_stock
                        $currentQtyStmt = $conn->prepare("SELECT COALESCE(SUM(available_quantity), 0) FROM tbl_fifo_stock WHERE product_id = ?");
                        $currentQtyStmt->execute([$product_id]);
                        $current_quantity = $currentQtyStmt->fetchColumn();
                        // error_log("Current product quantity after sale (from FIFO): $current_quantity");
                        
                        // Log stock movement for each consumed batch
                        if (!empty($consumed_batches)) {
                            $movementStmt = $conn->prepare("
                                INSERT INTO tbl_stock_movements (
                                    product_id, batch_id, movement_type, quantity, remaining_quantity,
                                    reference_no, notes, created_by
                                ) VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?)
                            ");
                            foreach ($consumed_batches as $consumed) {
                                // Verify the batch_id exists in tbl_batch before inserting
                                $batchCheckStmt = $conn->prepare("SELECT batch_id FROM tbl_batch WHERE batch_id = ?");
                                $batchCheckStmt->execute([$consumed['batch_id']]);
                                $validBatchId = $batchCheckStmt->fetchColumn();
                                
                                if ($validBatchId) {
                                    $movementStmt->execute([
                                        $product_id,
                                        $consumed['batch_id'],
                                        $consumed['quantity_consumed'],
                                        $current_quantity, // Current stock after sale
                                        $transaction_id,
                                        "POS Sale - FIFO: {$consumed['batch_reference']} ({$consumed['quantity_consumed']} units)",
                                        'POS System'
                                    ]);
                                    // error_log("Stock movement logged: Product $product_id, Batch {$consumed['batch_id']}, Quantity {$consumed['quantity_consumed']}");
                                } else {
                                    // error_log("WARNING: Batch ID {$consumed['batch_id']} not found in tbl_batch - skipping stock movement log");
                                }
                            }
                        } else {
                            // Fallback: If no batches consumed, try to find a valid batch_id or create one
                            // error_log("Warning: No FIFO batches consumed for product $product_id, attempting fallback");
                            
                            // Try to get any batch_id associated with this product
                            $batchStmt = $conn->prepare("
                                SELECT batch_id FROM tbl_batch 
                                WHERE batch_id IN (
                                    SELECT DISTINCT batch_id FROM tbl_fifo_stock WHERE product_id = ?
                                    UNION
                                    SELECT DISTINCT batch_id FROM tbl_stock_summary WHERE product_id = ?
                                )
                                LIMIT 1
                            ");
                            $batchStmt->execute([$product_id, $product_id]);
                            $fallback_batch_id = $batchStmt->fetchColumn();
                            
                            if ($fallback_batch_id) {
                                $movementStmt = $conn->prepare("
                                    INSERT INTO tbl_stock_movements (
                                        product_id, batch_id, movement_type, quantity, remaining_quantity,
                                        reference_no, notes, created_by
                                    ) VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?)
                                ");
                                $movementStmt->execute([
                                    $product_id,
                                    $fallback_batch_id,
                                    $quantity,
                                    $current_quantity,
                                    $transaction_id,
                                    "POS Sale - Non-FIFO (Fallback)",
                                    'POS System'
                                ]);
                            } else {
                                // error_log("Error: No valid batch_id found for product $product_id");
                                throw new Exception("No valid batch found for product $product_id");
                            }
                        }
                    }
                }
                
                $conn->commit();
                // error_log("Convenience Store Sale Success: Transaction $transaction_id completed successfully");
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
            
        case 'get_pos_products_fifo':
            // Get products for POS with FIFO-consistent quantities (first batch quantity)
            $location_name = $data['location_name'] ?? 'convenience';
            $search = $data['search'] ?? '';
            $category = $data['category'] ?? 'all';
            
            // Get the location_id for the specified location_name
            $locationStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE ? LIMIT 1");
            $locationStmt->execute(["%$location_name%"]);
            $locationResult = $locationStmt->fetch(PDO::FETCH_ASSOC);
            $target_location_id = $locationResult ? $locationResult['location_id'] : null;
            
            if (!$target_location_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Location '$location_name' not found",
                    "data" => []
                ]);
                break;
            }
            
            // Build WHERE clause for the new query structure
            $where = "tbd.location_id = ?";
            $params = [$target_location_id];
            
            if (!empty($search)) {
                $where .= " AND (p.product_name LIKE ? OR p.barcode LIKE ? OR c.category_name LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam]);
            }
            
            if ($category !== 'all') {
                $where .= " AND c.category_name = ?";
                $params[] = $category;
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    c.category_name,
                    b.brand,
                    -- Use SRP from earliest expiry batch (FIFO), then stock summary SRP, then 0
                    COALESCE(
                        (SELECT tbd2.srp 
                         FROM tbl_transfer_batch_details tbd2 
                         WHERE tbd2.product_id = p.product_id 
                         AND tbd2.location_id = tbd.location_id
                         ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                         LIMIT 1), 
                        ss.srp, 0
                    ) as unit_price,
                    COALESCE(
                        (SELECT tbd2.srp 
                         FROM tbl_transfer_batch_details tbd2 
                         WHERE tbd2.product_id = p.product_id 
                         AND tbd2.location_id = tbd.location_id
                         ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                         LIMIT 1), 
                        ss.srp, 0
                    ) as srp,
                    -- Sum all batch quantities for same product from the specific location
                    SUM(tbd.quantity) as available_quantity,
                    COALESCE(SUM(ss.reserved_quantity), 0) as reserved_quantity,
                    COALESCE(SUM(ss.total_quantity), 0) as total_quantity,
                    p.status,
                    s.supplier_name,
                    -- Use transfer expiration if available, otherwise product expiration
                    COALESCE(
                        (SELECT tbd_exp.expiration_date 
                         FROM tbl_transfer_batch_details tbd_exp 
                         WHERE tbd_exp.product_id = p.product_id 
                         AND tbd_exp.location_id = tbd.location_id
                         ORDER BY tbd_exp.expiration_date ASC, tbd_exp.id ASC 
                         LIMIT 1),
                        p.expiration
                    ) as expiration,
                    l.location_name,
                    ss.batch_reference,
                    ss.expiration_date,
                    (SELECT tbd2.srp 
                     FROM tbl_transfer_batch_details tbd2 
                     WHERE tbd2.product_id = p.product_id 
                     AND tbd2.location_id = tbd.location_id
                     ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                     LIMIT 1) as transfer_srp,
                    (SELECT fs.expiration_date 
         FROM tbl_fifo_stock fs 
         WHERE fs.product_id = p.product_id 
         AND fs.available_quantity > 0
         ORDER BY fs.expiration_date ASC, fs.fifo_id ASC 
         LIMIT 1) as transfer_expiration
                FROM tbl_transfer_batch_details tbd
                LEFT JOIN tbl_product p ON tbd.product_id = p.product_id
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON tbd.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                WHERE $where
                GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, p.status, s.supplier_name, p.expiration, l.location_name
                HAVING available_quantity > 0
                ORDER BY COALESCE(
                    (SELECT MIN(tbd_earliest.expiration_date) 
                     FROM tbl_transfer_batch_details tbd_earliest 
                     WHERE tbd_earliest.product_id = p.product_id 
                     AND tbd_earliest.location_id = (
                         SELECT l_earliest.location_id FROM tbl_location l_earliest WHERE l_earliest.location_name LIKE '%convenience%' LIMIT 1
                     )
                     AND tbd_earliest.quantity > 0),
                    (SELECT MIN(fs_earliest.expiration_date) 
                     FROM tbl_fifo_stock fs_earliest 
                     WHERE fs_earliest.product_id = p.product_id 
                     AND fs_earliest.available_quantity > 0),
                    ss.expiration_date, 
                    p.expiration
                ) ASC, p.product_name ASC
            ");
            
            try {
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                // error_log("SQL Error in get_pos_products_fifo: " . $e->getMessage());
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage(),
                    "data" => []
                ]);
                break;
            }
            
            // Update quantity field to use available_quantity for POS display
            foreach ($rows as &$row) {
                $row['quantity'] = $row['available_quantity'];
            }
            
            echo json_encode([
                "success" => true,
                "data" => $rows,
                "count" => count($rows)
            ]);
            break;
            
        case 'get_accurate_stock_quantities':
            // Get accurate stock quantities from tbl_stock_summary for specific location
            $location_name = $data['location_name'] ?? 'convenience';
            $search = $data['search'] ?? '';
            $category = $data['category'] ?? 'all';
            
            $where = "l.location_name LIKE ?";
            $params = ["%$location_name%"];
            
            if (!empty($search)) {
                $where .= " AND (p.product_name LIKE ? OR p.barcode LIKE ? OR c.category_name LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam]);
            }
            
            if ($category !== 'all') {
                $where .= " AND c.category_name = ?";
                $params[] = $category;
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    c.category_name,
                    b.brand,
                    -- Use stock summary SRP if available, then transfer batch details SRP, then product SRP
                    COALESCE(ss.srp, tbd.srp, 0) as unit_price,
                    COALESCE(ss.srp, tbd.srp, 0) as srp,
                    -- Sum all batch quantities for same product (handle related products)
                    -- Only use tbl_transfer_batch_details
                    COALESCE(
                        (SELECT SUM(tbd2.quantity) 
                         FROM tbl_transfer_batch_details tbd2 
                         WHERE tbd2.product_id = p.product_id
                         AND tbd2.location_id = (
                             SELECT l2.location_id FROM tbl_location l2 WHERE l2.location_name LIKE '%convenience%' LIMIT 1
                         )),
                        0
                    ) as available_quantity,
                    COALESCE(SUM(ss.reserved_quantity), 0) as reserved_quantity,
                    COALESCE(SUM(ss.total_quantity), 0) as total_quantity,
                    p.status,
                    s.supplier_name,
                    p.expiration,
                    l.location_name,
                    ss.batch_reference,
                    ss.expiration_date,
                    (SELECT tbd2.srp 
                     FROM tbl_transfer_batch_details tbd2 
                     WHERE tbd2.product_id = p.product_id 
                     AND tbd2.location_id = tbd.location_id
                     ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                     LIMIT 1) as transfer_srp,
                    (SELECT fs.expiration_date 
         FROM tbl_fifo_stock fs 
         WHERE fs.product_id = p.product_id 
         AND fs.available_quantity > 0
         ORDER BY fs.expiration_date ASC, fs.fifo_id ASC 
         LIMIT 1) as transfer_expiration
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                LEFT JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id AND tbd.location_id = p.location_id
                WHERE $where
                GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, p.status, s.supplier_name, p.expiration, l.location_name
                HAVING srp > 0
                ORDER BY COALESCE(
                    (SELECT MIN(tbd_earliest.expiration_date) 
                     FROM tbl_transfer_batch_details tbd_earliest 
                     WHERE tbd_earliest.product_id = p.product_id 
                     AND tbd_earliest.location_id = (
                         SELECT l_earliest.location_id FROM tbl_location l_earliest WHERE l_earliest.location_name LIKE '%convenience%' LIMIT 1
                     )
                     AND tbd_earliest.quantity > 0),
                    (SELECT MIN(fs_earliest.expiration_date) 
                     FROM tbl_fifo_stock fs_earliest 
                     WHERE fs_earliest.product_id = p.product_id 
                     AND fs_earliest.available_quantity > 0),
                    ss.expiration_date, 
                    p.expiration
                ) ASC, p.product_name ASC
            ");
            
            try {
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                // error_log("SQL Error in get_convenience_products: " . $e->getMessage());
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage(),
                    "data" => []
                ]);
                break;
            }
            
            // Normalize the response to match expected format
            foreach ($rows as &$row) {
                $row['quantity'] = $row['available_quantity'];
            }
            
            echo json_encode([
                "success" => true,
                "data" => $rows
            ]);
            break;
            
        case 'search_by_barcode':
            // Search for a specific product by barcode in convenience store
            $barcode = $data['barcode'] ?? '';
            $location_name = $data['location_name'] ?? 'convenience';
            
            if (empty($barcode)) {
                echo json_encode([
                    "success" => false,
                    "message" => "Barcode is required"
                ]);
                break;
            }
            
            // Get the location_id for the specified location_name
            $locationStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE ? LIMIT 1");
            $locationStmt->execute(["%$location_name%"]);
            $locationResult = $locationStmt->fetch(PDO::FETCH_ASSOC);
            $target_location_id = $locationResult ? $locationResult['location_id'] : null;
            
            if (!$target_location_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Location '$location_name' not found",
                    "data" => []
                ]);
                break;
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    c.category_name,
                    b.brand,
                    -- Use SRP from earliest expiry batch (FIFO), then stock summary SRP, then 0
                    COALESCE(
                        (SELECT tbd2.srp 
                         FROM tbl_transfer_batch_details tbd2 
                         WHERE tbd2.product_id = p.product_id 
                         AND tbd2.location_id = tbd.location_id
                         ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                         LIMIT 1), 
                        ss.srp, 0
                    ) as unit_price,
                    COALESCE(
                        (SELECT tbd2.srp 
                         FROM tbl_transfer_batch_details tbd2 
                         WHERE tbd2.product_id = p.product_id 
                         AND tbd2.location_id = tbd.location_id
                         ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                         LIMIT 1), 
                        ss.srp, 0
                    ) as srp,
                    -- Sum all batch quantities for same product from the specific location
                    SUM(tbd.quantity) as available_quantity,
                    COALESCE(SUM(ss.reserved_quantity), 0) as reserved_quantity,
                    COALESCE(SUM(ss.total_quantity), 0) as total_quantity,
                    p.status,
                    s.supplier_name,
                    p.expiration,
                    l.location_name,
                    ss.batch_reference,
                    ss.expiration_date,
                    (SELECT tbd2.srp 
                     FROM tbl_transfer_batch_details tbd2 
                     WHERE tbd2.product_id = p.product_id 
                     AND tbd2.location_id = tbd.location_id
                     ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                     LIMIT 1) as transfer_srp,
                    (SELECT fs.expiration_date 
         FROM tbl_fifo_stock fs 
         WHERE fs.product_id = p.product_id 
         AND fs.available_quantity > 0
         ORDER BY fs.expiration_date ASC, fs.fifo_id ASC 
         LIMIT 1) as transfer_expiration
                FROM tbl_transfer_batch_details tbd
                LEFT JOIN tbl_product p ON tbd.product_id = p.product_id
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON tbd.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                WHERE tbd.location_id = ? AND p.barcode = ?
                GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, p.status, s.supplier_name, p.expiration, l.location_name
                HAVING available_quantity > 0
                ORDER BY COALESCE(
                    (SELECT MIN(tbd_earliest.expiration_date) 
                     FROM tbl_transfer_batch_details tbd_earliest 
                     WHERE tbd_earliest.product_id = p.product_id 
                     AND tbd_earliest.location_id = (
                         SELECT l_earliest.location_id FROM tbl_location l_earliest WHERE l_earliest.location_name LIKE '%convenience%' LIMIT 1
                     )
                     AND tbd_earliest.quantity > 0),
                    (SELECT MIN(fs_earliest.expiration_date) 
                     FROM tbl_fifo_stock fs_earliest 
                     WHERE fs_earliest.product_id = p.product_id 
                     AND fs_earliest.available_quantity > 0),
                    ss.expiration_date, 
                    p.expiration
                ) ASC, p.product_name ASC
            ");
            $stmt->execute([$target_location_id, $barcode]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Normalize the response to match expected format
            foreach ($rows as &$row) {
                $row['quantity'] = $row['available_quantity'];
            }
            
            echo json_encode([
                "success" => true,
                "data" => $rows
            ]);
            break;
            
        case 'sync_transferred_products':
            // Sync transferred products to stock summary
            $location_name = $data['location_name'] ?? 'convenience';
            
            try {
                // Get products that have been transferred but need SRP update
                // NOTE: tbl_product no longer has quantity or srp - get from tbl_transfer_batch_details
                $stmt = $conn->prepare("
                    SELECT 
                        p.product_id,
                        p.product_name,
                        tbd.quantity,
                        tbd.srp,
                        tbd.batch_id,
                        p.location_id,
                        l.location_name,
                        tbd.batch_reference,
                        DATE(tbd.created_at) as entry_date,
                        tbd.created_at as entry_time,
                        tbd.srp as transfer_srp,
                        tbd.expiration_date as transfer_expiration
                    FROM tbl_product p
                    LEFT JOIN tbl_category c ON p.category_id = c.category_id
                    LEFT JOIN tbl_location l ON p.location_id = l.location_id
                    LEFT JOIN tbl_transfer_batch_details tbd ON tbd.product_id = p.product_id AND tbd.location_id = p.location_id
                    WHERE l.location_name LIKE ? 
                    AND tbd.quantity > 0 
                    AND p.status = 'active'
                    ORDER BY tbd.expiration_date ASC
                ");
                $stmt->execute(["%$location_name%"]);
                $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $synced_count = 0;
                
                foreach ($products as $product) {
                    // Use transfer SRP (already the final SRP)
                    $final_srp = $product['transfer_srp'] ?: $product['srp'];
                    $final_expiration = $product['transfer_expiration'];
                    
                    // Create stock movement record for sync
                    $movementStmt = $conn->prepare("
                        INSERT INTO tbl_stock_movements (
                            product_id, batch_id, movement_type, quantity, 
                            remaining_quantity, reference_no, notes, created_by
                        ) VALUES (?, ?, 'SYNC', ?, ?, ?, ?, 'System Sync')
                    ");
                    
                    $movementStmt->execute([
                        $product['product_id'],
                        $product['batch_id'],
                        $product['quantity'],
                        $product['quantity'],
                        'SYNC-TRANSFER-' . $product['product_id'],
                        'Synced transferred product - SRP: ' . $final_srp . ', Expiration: ' . $final_expiration
                    ]);
                    
                    $synced_count++;
                }
                
                echo json_encode([
                    "success" => true,
                    "message" => "Synced $synced_count transferred products to stock summary",
                    "synced_count" => $synced_count
                ]);
                
            } catch (Exception $e) {
                echo json_encode([
                    "success" => false,
                    "message" => "Sync failed: " . $e->getMessage()
                ]);
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
