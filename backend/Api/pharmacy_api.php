<?php
/**
 * Pharmacy API
 * Handles all pharmacy specific operations
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
        case 'get_products':
            // Alias for get_pharmacy_products_fifo for compatibility
            $location_name = $data['location_name'] ?? 'pharmacy';
            $search = $data['search'] ?? '';
            $category = $data['category'] ?? 'all';
            
            $where = "l.location_name LIKE '%pharmacy%'";
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
            
            $stmt = $conn->prepare("
                SELECT DISTINCT
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    c.category_name,
                    b.brand,
                    -- Use stock summary SRP if available, then transfer batch details SRP, then product SRP
                    COALESCE(ss.srp, tbd.srp, 0) as unit_price,
                    COALESCE(ss.srp, tbd.srp, 0) as srp,
                    -- Get first batch quantity for FIFO consistency (handle related products)
                    COALESCE(
                        (SELECT tbd2.quantity 
                         FROM tbl_transfer_batch_details tbd2 
                         WHERE tbd2.product_id IN (
                             SELECT p2.product_id 
                             FROM tbl_product p2 
                             WHERE p2.product_name = p.product_name 
                             AND p2.barcode = p.barcode
                         )
                         ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                         LIMIT 1),
                        0
                    ) as quantity,
                    -- Sum all batch quantities for same product (handle related products)
                    -- Only use tbl_transfer_batch_details
                    COALESCE(
                        (SELECT SUM(tbd3.quantity) 
                         FROM tbl_transfer_batch_details tbd3 
                         WHERE tbd3.product_id = p.product_id
                         AND tbd3.location_id = (
                             SELECT l3.location_id FROM tbl_location l3 WHERE l3.location_name LIKE '%pharmacy%' LIMIT 1
                         )),
                        0
                    ) as total_quantity,
                    p.status,
                    s.supplier_name,
                    p.expiration,
                    l.location_name,
                    COALESCE(SUM(fs.available_quantity * fs.srp), 0) as total_srp_value,
                    tbd.srp as transfer_srp,
                    tbd.expiration_date as transfer_expiration,
                    COALESCE(ss.srp, tbd.srp, 0) as first_batch_srp
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
                LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                LEFT JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id AND tbd.location_id = p.location_id
                WHERE $where
                GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, p.status, s.supplier_name, p.expiration, l.location_name, tbd.srp, tbd.expiration_date
                ORDER BY p.product_name ASC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $rows,
                "count" => count($rows)
            ]);
            break;
            
        case 'get_pharmacy_products_fifo':
            // Get products with FIFO-consistent quantities (first batch quantity)
            $location_name = $data['location_name'] ?? 'pharmacy';
            $search = $data['search'] ?? '';
            $category = $data['category'] ?? 'all';
            
            $where = "l.location_name LIKE '%pharmacy%'";
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
            
            $stmt = $conn->prepare("
                SELECT DISTINCT
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    c.category_name,
                    b.brand,
                    -- Use stock summary SRP if available, then transfer batch details SRP, then product SRP
                    COALESCE(ss.srp, tbd.srp, 0) as unit_price,
                    COALESCE(ss.srp, tbd.srp, 0) as srp,
                    -- Get first batch quantity for FIFO consistency (handle related products)
                    COALESCE(
                        (SELECT tbd2.quantity 
                         FROM tbl_transfer_batch_details tbd2 
                         WHERE tbd2.product_id IN (
                             SELECT p2.product_id 
                             FROM tbl_product p2 
                             WHERE p2.product_name = p.product_name 
                             AND p2.barcode = p.barcode
                         )
                         ORDER BY tbd2.expiration_date ASC, tbd2.id ASC 
                         LIMIT 1),
                        0
                    ) as quantity,
                    -- Sum all batch quantities for same product (handle related products)
                    -- Only use tbl_transfer_batch_details
                    COALESCE(
                        (SELECT SUM(tbd3.quantity) 
                         FROM tbl_transfer_batch_details tbd3 
                         WHERE tbd3.product_id = p.product_id
                         AND tbd3.location_id = (
                             SELECT l3.location_id FROM tbl_location l3 WHERE l3.location_name LIKE '%pharmacy%' LIMIT 1
                         )),
                        0
                    ) as total_quantity,
                    p.status,
                    s.supplier_name,
                    p.expiration,
                    l.location_name,
                    COALESCE(SUM(fs.available_quantity * fs.srp), 0) as total_srp_value,
                    tbd.srp as transfer_srp,
                    tbd.expiration_date as transfer_expiration,
                    COALESCE(ss.srp, tbd.srp, 0) as first_batch_srp
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
                LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                LEFT JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id AND tbd.location_id = p.location_id
                WHERE $where
                GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, p.status, s.supplier_name, p.expiration, l.location_name, tbd.srp, tbd.expiration_date
                ORDER BY p.product_name ASC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $rows,
                "count" => count($rows)
            ]);
            break;
            
        case 'get_pharmacy_products':
            // Get products specifically for pharmacy - directly from transfer_batch_details
            $location_name = $data['location_name'] ?? 'pharmacy';
            $search = $data['search'] ?? '';
            $category = $data['category'] ?? 'all';
            
            // Get pharmacy location ID first
            $locStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE '%pharmacy%' LIMIT 1");
            $locStmt->execute();
            $pharmacy_location_id = $locStmt->fetchColumn();
            
            if (!$pharmacy_location_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Pharmacy location not found",
                    "data" => []
                ]);
                break;
            }
            
            // Build WHERE clause
            $where = "tbd.location_id = ?";
            $params = [$pharmacy_location_id];
            
            if (!empty($search)) {
                $where .= " AND (p.product_name LIKE ? OR p.barcode LIKE ? OR c.category_name LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam]);
            }
            
            if ($category !== 'all') {
                $where .= " AND c.category_name = ?";
                $params[] = $category;
            }
            
            // Select directly from transfer_batch_details to get actual transferred products
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    c.category_name,
                    c.category_name as category,
                    b.brand,
                    -- Get first batch SRP (FIFO)
                    (SELECT tbd_first.srp 
                     FROM tbl_transfer_batch_details tbd_first 
                     WHERE tbd_first.product_id = p.product_id 
                     AND tbd_first.location_id = ?
                     AND tbd_first.quantity > 0
                     ORDER BY tbd_first.expiration_date ASC, tbd_first.id ASC 
                     LIMIT 1) as srp,
                    (SELECT tbd_first.srp 
                     FROM tbl_transfer_batch_details tbd_first 
                     WHERE tbd_first.product_id = p.product_id 
                     AND tbd_first.location_id = ?
                     AND tbd_first.quantity > 0
                     ORDER BY tbd_first.expiration_date ASC, tbd_first.id ASC 
                     LIMIT 1) as first_batch_srp,
                    (SELECT tbd_first.srp 
                     FROM tbl_transfer_batch_details tbd_first 
                     WHERE tbd_first.product_id = p.product_id 
                     AND tbd_first.location_id = ?
                     AND tbd_first.quantity > 0
                     ORDER BY tbd_first.expiration_date ASC, tbd_first.id ASC 
                     LIMIT 1) as unit_price,
                    -- Get first batch quantity (FIFO)
                    (SELECT tbd_first.quantity 
                     FROM tbl_transfer_batch_details tbd_first 
                     WHERE tbd_first.product_id = p.product_id 
                     AND tbd_first.location_id = ?
                     ORDER BY tbd_first.expiration_date ASC, tbd_first.id ASC 
                     LIMIT 1) as quantity,
                    -- Sum all batch quantities for total
                    COALESCE(SUM(tbd.quantity), 0) as total_quantity,
                    -- Count total batches
                    COUNT(DISTINCT tbd.batch_id) as total_batches,
                    p.status,
                    s.supplier_name,
                    -- Get earliest expiration date
                    (SELECT tbd_exp.expiration_date 
                     FROM tbl_transfer_batch_details tbd_exp 
                     WHERE tbd_exp.product_id = p.product_id 
                     AND tbd_exp.location_id = ?
                     ORDER BY tbd_exp.expiration_date ASC 
                     LIMIT 1) as expiration,
                    'Pharmacy' as location_name,
                    -- Calculate stock status
                    CASE 
                        WHEN COALESCE(SUM(tbd.quantity), 0) = 0 THEN 'out of stock'
                        WHEN COALESCE(SUM(tbd.quantity), 0) <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END as stock_status
                FROM tbl_transfer_batch_details tbd
                INNER JOIN tbl_product p ON tbd.product_id = p.product_id
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                WHERE $where
                AND p.status != 'archived'
                GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, p.status, s.supplier_name
                HAVING total_quantity >= 0
                ORDER BY p.product_name ASC
            ");
            
            // Add pharmacy_location_id to params for all the subqueries
            array_splice($params, 1, 0, array_fill(0, 5, $pharmacy_location_id));
            
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $rows,
                "count" => count($rows),
                "pharmacy_location_id" => $pharmacy_location_id
            ]);
            break;
            
        case 'get_products_by_location_name':
            // Fallback action for compatibility
            $location_name = $data['location_name'] ?? 'pharmacy';
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
                SELECT DISTINCT
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    c.category_name,
                    b.brand,
                    COALESCE(ss.srp, tbd.srp, 0) as unit_price,
                    COALESCE(ss.srp, tbd.srp, 0) as srp,
                    COALESCE(tbd.qty, 0) as quantity,
                    -- Sum all batch quantities for same product (handle related products)
                    -- Only use tbl_transfer_batch_details
                    COALESCE(
                        (SELECT SUM(tbd5.quantity) 
                         FROM tbl_transfer_batch_details tbd5 
                         WHERE tbd5.product_id = p.product_id
                         AND tbd5.location_id = (
                             SELECT l5.location_id FROM tbl_location l5 WHERE l5.location_name LIKE '%pharmacy%' LIMIT 1
                         )),
                        0
                    ) as total_quantity,
                    p.status,
                    s.supplier_name,
                    p.expiration,
                    l.location_name
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                WHERE $where
                ORDER BY p.product_name ASC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $rows
            ]);
            break;
            
        case 'get_pharmacy_batch_details':
            // Get batch transfer details for pharmacy - COPY LOGIC FROM CONVENIENCE STORE
            $product_id = $data['product_id'] ?? 0;
            $location_id = $data['location_id'] ?? null;
            
            if (!$product_id) {
                echo json_encode(['success' => false, 'message' => 'Product ID is required']);
                break;
            }
            
            try {
            
            // Get pharmacy location ID if not provided
            if (!$location_id) {
                $locStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE '%pharmacy%' LIMIT 1");
                $locStmt->execute();
                $location_id = $locStmt->fetchColumn();
            }
            
            // Debug: Log the location ID
            error_log("DEBUG get_pharmacy_batch_details: pharmacy location_id=$location_id");
            
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
            error_log("DEBUG get_pharmacy_batch_details: product_id=$product_id, location_id=$location_id");
            error_log("DEBUG get_pharmacy_batch_details: relatedProductIds=" . json_encode($relatedProductIds));
            
            // Get batch transfer details from tbl_transfer_batch_details for all related products
            // First try to get transfers TO the pharmacy (location_id = destination)
            $batchStmt = $conn->prepare("
                SELECT 
                    btd.id,
                    btd.batch_id,
                    btd.batch_reference,
                    btd.quantity as batch_quantity,
                    btd.srp,
                    btd.srp as batch_srp,
                    btd.expiration_date,
                    btd.created_at as transfer_date,
                    CONCAT('TR-', btd.id) as transfer_id,
                    CASE 
                        WHEN btd.quantity > 0 THEN 'Consumed'
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
                ORDER BY btd.expiration_date ASC, btd.id ASC
            ");
            $batchStmt->execute($relatedProductIds);
            $batchDetails = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // All batches should now be retrieved without location filter
            
            // Debug: Log the results
            error_log("DEBUG get_pharmacy_batch_details: batchDetails count=" . count($batchDetails));
            error_log("DEBUG get_pharmacy_batch_details: batchDetails=" . json_encode($batchDetails));
            
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
                        fs.srp as batch_srp,
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
                    return ($batch['batch_quantity'] ?? 0) * ($batch['srp'] ?? 0);
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
                error_log("Error in get_pharmacy_batch_details: " . $e->getMessage());
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage(),
                    "data" => []
                ]);
            }
            break;
            
        case 'get_transfer_batch_details':
            // Get transfer batch details for pharmacy
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
                // For PharmacyInventory modal - get individual batches from tbl_transfer_batch_details
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
            
        case 'process_pharmacy_sale':
            // Process sale with FIFO batch consumption for pharmacy
            $transaction_id = $data['transaction_id'] ?? '';
            $total_amount = $data['total_amount'] ?? 0;
            $items = $data['items'] ?? [];
            $location_name = 'Pharmacy';
            
            if (empty($items) || $total_amount <= 0) {
                echo json_encode(['success' => false, 'message' => 'Invalid sale data']);
                break;
            }
            
            $conn->beginTransaction();
            
            try {
                // Get pharmacy location ID
                $locStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE '%pharmacy%' LIMIT 1");
                $locStmt->execute();
                $location_id = $locStmt->fetchColumn();
                
                if (!$location_id) {
                    throw new Exception("Pharmacy location not found");
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
                        
                        // Note: tbl_product.quantity column has been removed in multi-unit migration
                        // Quantities are now tracked in tbl_fifo_stock and tbl_transfer_batch_details
                        
                        // Update stock summary
                        $updateStockSummaryStmt = $conn->prepare("
                            UPDATE tbl_stock_summary 
                            SET available_quantity = available_quantity - ?, 
                                total_quantity = total_quantity - ?,
                                last_updated = NOW()
                            WHERE product_id = ?
                        ");
                        $updateStockSummaryStmt->execute([$quantity, $quantity, $product_id]);
                        
                        // Update transfer batch details quantity (fallback if no FIFO data)
                        if (empty($consumed_batches)) {
                            $updateTransferBatchStmt = $conn->prepare("
                                UPDATE tbl_transfer_batch_details 
                                SET quantity = quantity - ?
                                WHERE product_id = ? AND location_id = ?
                                ORDER BY expiration_date ASC, id ASC
                                LIMIT 1
                            ");
                            $updateTransferBatchStmt->execute([$quantity, $product_id, $location_id]);
                        }
                        
                        // Get current product quantity after sale from tbl_fifo_stock
                        $currentQtyStmt = $conn->prepare("SELECT COALESCE(SUM(available_quantity), 0) FROM tbl_fifo_stock WHERE product_id = ?");
                        $currentQtyStmt->execute([$product_id]);
                        $current_quantity = $currentQtyStmt->fetchColumn();
                        
                        // Log stock movement for each consumed batch
                        if (!empty($consumed_batches)) {
                            $movementStmt = $conn->prepare("
                                INSERT INTO tbl_stock_movements (
                                    product_id, batch_id, movement_type, quantity, remaining_quantity,
                                    reference_no, notes, created_by
                                ) VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?)
                            ");
                            foreach ($consumed_batches as $consumed) {
                                $movementStmt->execute([
                                    $product_id,
                                    $consumed['batch_id'],
                                    $consumed['quantity_consumed'],
                                    $current_quantity, // Current stock after sale
                                    $transaction_id,
                                    "POS Sale - FIFO: {$consumed['batch_reference']} ({$consumed['quantity_consumed']} units)",
                                    'Pharmacy Cashier'
                                ]);
                            }
                        } else {
                            // Fallback: If no batches consumed, try to find a valid batch_id
                            error_log("Warning: No FIFO batches consumed for product $product_id in pharmacy, attempting fallback");
                            
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
                                    'Pharmacy Cashier'
                                ]);
                            } else {
                                error_log("Error: No valid batch_id found for product $product_id in pharmacy");
                                throw new Exception("No valid batch found for product $product_id");
                            }
                        }
                    }
                }
                
                $conn->commit();
                echo json_encode([
                    'success' => true,
                    'message' => 'Pharmacy sale processed with FIFO consumption',
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
