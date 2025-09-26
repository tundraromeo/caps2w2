<?php
/**
 * Simple API Main File
 * Clean, easy-to-understand API structure
 */

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include required files
require_once 'Database.php';
require_once 'ApiHelper.php';
require_once 'SimpleBatchService.php';

try {
    // Get input data and action
    $data = InputHelper::getData();
    $action = InputHelper::getAction();
    
    // Initialize services
    $batchService = new BatchService();
    
    // Route actions
    switch ($action) {
        
        // Batch-related actions
        case 'get_transfer_batch_details':
            $transferId = InputHelper::getInt($data['transfer_id'] ?? 0);
            if (!$transferId) {
                ApiResponse::error('Transfer ID is required');
            }
            $batches = $batchService->getTransferBatchDetails($transferId);
            ApiResponse::success($batches, 'Batch details retrieved successfully');
            break;
            
        case 'get_batch_details_by_product_location':
            $productId = InputHelper::getInt($data['product_id'] ?? 0);
            $locationId = InputHelper::getInt($data['location_id'] ?? 0);
            
            if (!$productId || !$locationId) {
                ApiResponse::error('Product ID and Location ID are required');
            }
            
            $result = $batchService->getBatchDetailsByProductLocation($productId, $locationId);
            ApiResponse::success($result, 'Batch details retrieved successfully');
            break;
            
        case 'get_product_batches':
            $productId = InputHelper::getInt($data['product_id'] ?? 0);
            if (!$productId) {
                ApiResponse::error('Product ID is required');
            }
            
            $batches = $batchService->getProductBatches($productId);
            ApiResponse::success($batches, 'Product batches retrieved successfully');
            break;
            
        case 'get_batches_by_location':
            $locationId = InputHelper::getInt($data['location_id'] ?? 0);
            if (!$locationId) {
                ApiResponse::error('Location ID is required');
            }
            
            $batches = $batchService->getBatchesByLocation($locationId);
            ApiResponse::success($batches, 'Location batches retrieved successfully');
            break;
            
        case 'create_batch_entry':
            $result = $batchService->createBatchEntry($data);
            ApiResponse::success($result, 'Batch entry created successfully');
            break;
            
        case 'update_batch_quantity':
            $batchId = InputHelper::getInt($data['batch_id'] ?? 0);
            $newQuantity = InputHelper::getInt($data['quantity'] ?? 0);
            
            if (!$batchId || $newQuantity < 0) {
                ApiResponse::error('Valid Batch ID and quantity are required');
            }
            
            $affectedRows = $batchService->updateBatchQuantity($batchId, $newQuantity);
            ApiResponse::success(['affected_rows' => $affectedRows], 'Batch quantity updated successfully');
            break;
            
        case 'consume_batch_stock':
            $batchId = InputHelper::getInt($data['batch_id'] ?? 0);
            $quantity = InputHelper::getInt($data['quantity'] ?? 0);
            
            if (!$batchId || $quantity <= 0) {
                ApiResponse::error('Valid Batch ID and quantity are required');
            }
            
            $result = $batchService->consumeBatchStock($batchId, $quantity);
            ApiResponse::success($result, 'Batch stock consumed successfully');
            break;
            
        case 'get_batch_summary':
            $productId = InputHelper::getInt($data['product_id'] ?? 0) ?: null;
            $locationId = InputHelper::getInt($data['location_id'] ?? 0) ?: null;
            
            $summary = $batchService->getBatchSummary($productId, $locationId);
            ApiResponse::success($summary, 'Batch summary retrieved successfully');
            break;
            
        // Product-related actions (simplified)
        case 'get_products':
            $db = new Database();
            $sql = "
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    p.category,
                    p.unit_price,
                    p.srp,
                    p.description,
                    b.brand,
                    s.supplier_name,
                    SUM(fs.available_quantity) as total_stock,
                    COUNT(fs.batch_id) as batch_count
                FROM tbl_product p
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
                GROUP BY p.product_id
                ORDER BY p.product_name ASC
            ";
            
            $products = $db->select($sql);
            ApiResponse::success($products, 'Products retrieved successfully');
            break;
            
        case 'get_product_by_id':
            $productId = InputHelper::getInt($data['product_id'] ?? 0);
            if (!$productId) {
                ApiResponse::error('Product ID is required');
            }
            
            $db = new Database();
            $sql = "
                SELECT 
                    p.*,
                    b.brand,
                    s.supplier_name,
                    SUM(fs.available_quantity) as total_stock,
                    COUNT(fs.batch_id) as batch_count
                FROM tbl_product p
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
                WHERE p.product_id = ?
                GROUP BY p.product_id
            ";
            
            $product = $db->selectOne($sql, [$productId]);
            if (!$product) {
                ApiResponse::notFound('Product not found');
            }
            
            ApiResponse::success($product, 'Product retrieved successfully');
            break;
            
        // Location-related actions (simplified)
        case 'get_locations':
            $db = new Database();
            $sql = "SELECT * FROM tbl_location ORDER BY location_name ASC";
            $locations = $db->select($sql);
            ApiResponse::success($locations, 'Locations retrieved successfully');
            break;
            
        // Transfer-related actions (simplified)
        case 'get_transfers':
            $db = new Database();
            $sql = "
                SELECT 
                    th.transfer_header_id,
                    th.date,
                    th.status,
                    sl.location_name as source_location,
                    dl.location_name as destination_location,
                    CONCAT(e.Fname, ' ', e.Lname) as employee_name,
                    COUNT(td.product_id) as total_products,
                    SUM(td.qty) as total_quantity
                FROM tbl_transfer_header th
                LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
                LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
                LEFT JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                GROUP BY th.transfer_header_id
                ORDER BY th.transfer_header_id DESC
            ";
            
            $transfers = $db->select($sql);
            ApiResponse::success($transfers, 'Transfers retrieved successfully');
            break;
            
        // Default case
        default:
            ApiResponse::error('Invalid action specified', 400);
            break;
    }
    
} catch (Exception $e) {
    ApiResponse::error('Server error: ' . $e->getMessage(), 500);
}
?>
