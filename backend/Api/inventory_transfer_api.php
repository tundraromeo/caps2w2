<?php
// Include proper CORS configuration
require_once __DIR__ . '/cors.php';

// Include database connection
require_once __DIR__ . '/conn.php';

try {
    // Get the raw POST data
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    
    if (!is_array($data)) {
        $data = [];
    }
    
    $action = $data['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('Action parameter is required');
    }
    
    // Handle different actions
    switch ($action) {
        case 'get_products_oldest_batch':
            handle_get_products_oldest_batch($conn, $data);
            break;
            
        case 'get_product_batches_for_adjustment':
            handle_get_product_batches_for_adjustment($conn, $data);
            break;
            
        default:
            throw new Exception('Invalid action: ' . $action);
    }
    
} catch (Exception $e) {
    // error_log('Inventory Transfer API Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Handle get_products_oldest_batch action
 */
function handle_get_products_oldest_batch($conn, $data) {
    try {
        $location_id = $data['location_id'] ?? null;
        $status = $data['status'] ?? 'active';
        $limit = $data['limit'] ?? 1000;

        $whereClause = "WHERE (p.status IS NULL OR p.status <> 'archived')";
        $params = [];

        if ($location_id) {
            $whereClause .= " AND p.location_id = ?";
            $params[] = $location_id;
        }

        if ($status) {
            $whereClause .= " AND (p.status = ? OR p.status IS NULL)";
            $params[] = $status;
        }

        // Use complex query with FIFO data to ensure correct oldest batch values
        $stmt = $conn->prepare("
            SELECT
                p.product_id,
                p.product_name,
                c.category_name as category,
                p.barcode,
                p.description,
                COALESCE(b.brand, '') as brand,
                COALESCE(s.supplier_name, '') as supplier_name,
                COALESCE(oldest_available_batch.srp, 0) as unit_price,
                COALESCE(oldest_available_batch.srp, 0) as srp,
                COALESCE(oldest_available_batch.srp, 0) as first_batch_srp,
                p.location_id,
                l.location_name,
                p.stock_status,
                p.date_added,
                p.status,
                -- Oldest available batch information
                COALESCE(oldest_available_batch.batch_reference, 'N/A') as batch_reference,
                COALESCE(oldest_available_batch.entry_date, p.date_added) as entry_date,
                COALESCE(oldest_available_batch.quantity, 0) as oldest_batch_quantity,
                COALESCE(oldest_available_batch.expiration_date, 'N/A') as expiry_date,
                COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as total_quantity
            FROM tbl_product p
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            LEFT JOIN tbl_location l ON p.location_id = l.location_id
            LEFT JOIN (
                SELECT 
                    fs.product_id,
                    fs.batch_reference,
                    fs.entry_date,
                    fs.quantity,
                    fs.expiration_date,
                    fs.srp,
                    ROW_NUMBER() OVER (PARTITION BY fs.product_id ORDER BY fs.expiration_date ASC, fs.entry_date ASC, fs.batch_reference ASC) as rn
                FROM tbl_fifo_stock fs
                WHERE fs.quantity > 0
            ) oldest_available_batch ON p.product_id = oldest_available_batch.product_id AND oldest_available_batch.rn = 1
            {$whereClause}
            ORDER BY p.product_name ASC
            LIMIT " . (int)$limit . "
        ");
        
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $products,
            'count' => count($products)
        ]);
        
    } catch (Exception $e) {
        throw new Exception('Error fetching products oldest batch: ' . $e->getMessage());
    }
}

/**
 * Handle get_product_batches_for_adjustment action
 */
function handle_get_product_batches_for_adjustment($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? null;
        
        if (!$product_id) {
            throw new Exception('Product ID is required');
        }

        // Get all active batches for the product
        $stmt = $conn->prepare("
            SELECT 
                fs.batch_id,
                fs.batch_reference,
                fs.entry_date,
                fs.expiration_date,
                fs.quantity,
                fs.srp,
                fs.product_id,
                p.product_name,
                p.barcode
            FROM tbl_fifo_stock fs
            INNER JOIN tbl_product p ON fs.product_id = p.product_id
            WHERE fs.product_id = ? 
                AND fs.quantity > 0
            ORDER BY fs.expiration_date ASC, fs.entry_date ASC, fs.batch_reference ASC
        ");
        
        $stmt->execute([$product_id]);
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $batches,
            'count' => count($batches)
        ]);
        
    } catch (Exception $e) {
        throw new Exception('Error fetching product batches: ' . $e->getMessage());
    }
}
?>
