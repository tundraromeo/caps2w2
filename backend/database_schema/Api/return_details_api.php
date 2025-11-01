<?php
/**
 * Return Details API
 * Provides detailed information about returned products
 */

// Use centralized CORS configuration
require_once __DIR__ . '/cors.php';

require_once 'conn.php';

try {
    $conn = getDatabaseConnection();
    
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true) ?: $_POST;
    
    $action = $data['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'get_return_product_details':
            $referenceNumber = $data['reference_number'] ?? '';
            
            if (empty($referenceNumber)) {
                echo json_encode(['success' => false, 'message' => 'Reference number is required']);
                break;
            }
            
            // Extract original transaction ID from reference number
            $originalTransactionId = str_replace('_RETURNED', '', $referenceNumber);
            
            // Get return details
            $stmt = $conn->prepare("
                SELECT 
                    pr.return_id,
                    pr.original_transaction_id,
                    pr.reason,
                    pr.total_refund,
                    pr.status,
                    pr.created_at,
                    pr.username,
                    pr.location_name,
                    pr.terminal_name
                FROM tbl_pos_returns pr
                WHERE pr.original_transaction_id = ?
                ORDER BY pr.created_at DESC
                LIMIT 1
            ");
            $stmt->execute([$originalTransactionId]);
            $returnRecord = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$returnRecord) {
                echo json_encode(['success' => false, 'message' => 'Return record not found']);
                break;
            }
            
            // Get returned products
            $stmt = $conn->prepare("
                SELECT 
                    pri.product_id,
                    p.product_name,
                    p.barcode,
                    pri.quantity,
                    pri.price,
                    pri.total,
                    pri.item_condition
                FROM tbl_pos_return_items pri
                LEFT JOIN tbl_product p ON pri.product_id = p.product_id
                WHERE pri.return_id = ?
                ORDER BY pri.product_id
            ");
            $stmt->execute([$returnRecord['return_id']]);
            $returnedProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format the product information
            $productDetails = [];
            foreach ($returnedProducts as $product) {
                $productDetails[] = $product['product_name'] . ' (RETURNED: ' . $product['quantity'] . 'x ₱' . number_format($product['price'], 2) . ')';
            }
            
            $productsString = empty($productDetails) ? 'Return processed - No product details' : implode(', ', $productDetails);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'return_info' => $returnRecord,
                    'returned_products' => $returnedProducts,
                    'products_string' => $productsString
                ]
            ]);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
