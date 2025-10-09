<?php
// Enable CORS for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Prevent PHP warnings/notices from breaking JSON responses
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database connection
require_once 'conn.php';

// Get action from query parameter
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'create_purchase_order':
            createPurchaseOrder($conn);
            break;
        case 'suppliers':
            getSuppliers($conn);
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action: ' . $action]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function getSuppliers($conn) {
    try {
        $query = "SELECT supplier_id, supplier_name, supplier_contact FROM tbl_supplier WHERE status = 'active' ORDER BY supplier_name";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $suppliers]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function createPurchaseOrder($conn) {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'Invalid input data']);
        return;
    }
    
    // Validate required fields
    if (!isset($input['supplier_id']) || !isset($input['products']) || empty($input['products'])) {
        echo json_encode(['success' => false, 'error' => 'Supplier ID and products are required']);
        return;
    }
    
    // Start transaction
    $conn->beginTransaction();
    
    try {
        // Generate PO number
        $poNumber = 'PO-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        
        // Insert purchase order header with status from input (default: 'delivered')
        $status = $input['status'] ?? 'delivered';
        $headerQuery = "INSERT INTO tbl_purchase_order_header (supplier_id, total_amount, expected_delivery_date, created_by, status, date, time, notes, po_number) 
                       VALUES (?, 0, ?, ?, ?, CURDATE(), CURTIME(), ?, ?)";
        $stmt = $conn->prepare($headerQuery);
        $stmt->execute([
            $input['supplier_id'], 
            $input['expected_delivery_date'] ?? null, 
            $input['created_by'] ?? 21,
            $status,
            $input['notes'] ?? '',
            $poNumber
        ]);
        
        $purchaseHeaderId = $conn->lastInsertId();
        
        // Insert purchase order details - NO product_id or price required, just product_name
        $detailQuery = "INSERT INTO tbl_purchase_order_dtl (purchase_header_id, quantity, unit_type, product_name, received_qty, missing_qty) VALUES (?, ?, ?, ?, ?, ?)";
        $detailStmt = $conn->prepare($detailQuery);
        
        foreach ($input['products'] as $product) {
            $quantity = intval($product['quantity'] ?? 1);
            $unitType = $product['unit_type'] ?? 'pieces';
            $searchTerm = $product['searchTerm'] ?? '';
            
            // Calculate missing quantity (initially same as ordered quantity)
            $missingQty = $quantity;
            
            $detailStmt->execute([
                $purchaseHeaderId, 
                $quantity, 
                $unitType,
                $searchTerm,
                0, // received_qty starts at 0
                $missingQty // missing_qty starts as full quantity
            ]);
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Purchase order created successfully',
            'po_number' => $poNumber,
            'po_id' => $purchaseHeaderId,  // Changed from purchase_order_id to po_id for frontend compatibility
            'purchase_header_id' => $purchaseHeaderId
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollBack();
        echo json_encode(['success' => false, 'error' => 'Error creating purchase order: ' . $e->getMessage()]);
    }
}

$conn = null; // Close connection
?>
