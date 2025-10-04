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
        case 'suppliers':
            getSuppliers($conn);
            break;
        case 'create_purchase_order':
            createPurchaseOrder($conn);
            break;
        case 'purchase_orders':
            getPurchaseOrders($conn);
            break;
        case 'purchase_order_details':
            getPurchaseOrderDetails($conn);
            break;
        case 'update_po_status':
            updatePOStatus($conn);
            break;
        case 'update_received_quantities':
            updateReceivedQuantities($conn);
            break;
        case 'update_partial_delivery':
            updatePartialDelivery($conn);
            break;
        case 'receiving_list':
            getReceivingList($conn);
            break;
        case 'approve_purchase_order':
            approvePurchaseOrder($conn);
            break;
        case 'update_delivery_status':
            updateDeliveryStatus($conn);
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
        
        // Insert purchase order header
        $headerQuery = "INSERT INTO tbl_purchase_order_header (supplier_id, total_amount, expected_delivery_date, created_by, status, date, time, notes, po_number) 
                       VALUES (?, 0, ?, ?, 'delivered', CURDATE(), CURTIME(), ?, ?)";
        $stmt = $conn->prepare($headerQuery);
        $stmt->execute([
            $input['supplier_id'], 
            $input['expected_delivery_date'] ?? null, 
            $input['created_by'] ?? 21,
            $input['notes'] ?? '',
            $poNumber
        ]);
        
        $purchaseHeaderId = $conn->lastInsertId();
        
        // Insert purchase order details
        $detailQuery = "INSERT INTO tbl_purchase_order_dtl (purchase_header_id, product_id, quantity, price, unit_type, product_name) VALUES (?, ?, ?, ?, ?, ?)";
        $detailStmt = $conn->prepare($detailQuery);
        
        foreach ($input['products'] as $product) {
            $quantity = intval($product['quantity'] ?? 1);
            $unitType = $product['unit_type'] ?? 'pieces';
            $searchTerm = $product['searchTerm'] ?? '';
            
            // For now, we'll use a placeholder product_id since we're creating custom products
            $productId = 9999; // Placeholder ID for custom products
            
            $detailStmt->execute([
                $purchaseHeaderId, 
                $productId, 
                $quantity, 
                0, // No pricing
                $unitType,
                $searchTerm
            ]);
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Purchase order created successfully',
            'po_number' => $poNumber,
            'purchase_order_id' => $purchaseHeaderId
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollBack();
        echo json_encode(['success' => false, 'error' => 'Error creating purchase order: ' . $e->getMessage()]);
    }
}

function getPurchaseOrders($conn) {
    try {
        $status = $_GET['status'] ?? null;
        
        $whereClause = '';
        $params = [];
        
        if ($status) {
            $whereClause = 'WHERE po.status = ?';
            $params[] = $status;
        }
        
        $query = "SELECT 
                    po.purchase_header_id,
                    po.po_number,
                    po.date,
                    po.expected_delivery_date,
                    po.total_amount,
                    po.status,
                    po.notes,
                    s.supplier_name,
                    s.supplier_contact,
                    GROUP_CONCAT(DISTINCT pod.product_name SEPARATOR ', ') as products_summary
                  FROM tbl_purchase_order_header po
                  JOIN tbl_supplier s ON po.supplier_id = s.supplier_id
                  LEFT JOIN tbl_purchase_order_dtl pod ON po.purchase_header_id = pod.purchase_header_id
                  $whereClause
                  GROUP BY po.purchase_header_id
                  ORDER BY po.date DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $purchaseOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $purchaseOrders]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function getPurchaseOrderDetails($conn) {
    $poId = $_GET['po_id'] ?? 0;
    
    if (!$poId) {
        echo json_encode(['success' => false, 'error' => 'Purchase order ID required']);
        return;
    }
    
    try {
        // Get header
        $headerQuery = "SELECT 
                         po.*, s.supplier_name
                       FROM tbl_purchase_order_header po
                       JOIN tbl_supplier s ON po.supplier_id = s.supplier_id
                       WHERE po.purchase_header_id = ?";
        $stmt = $conn->prepare($headerQuery);
        $stmt->execute([$poId]);
        $header = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$header) {
            echo json_encode(['success' => false, 'error' => 'Purchase order not found']);
            return;
        }
        
        // Get details
        $detailsQuery = "SELECT 
                          pod.*,
                          pod.product_name,
                          pod.quantity,
                          pod.received_qty,
                          pod.missing_qty,
                          pod.unit_type
                        FROM tbl_purchase_order_dtl pod
                        WHERE pod.purchase_header_id = ?";
        $detailStmt = $conn->prepare($detailsQuery);
        $detailStmt->execute([$poId]);
        $details = $detailStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'header' => $header,
            'details' => $details
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function updatePOStatus($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['purchase_header_id']) || !isset($input['status'])) {
        echo json_encode(['success' => false, 'error' => 'Purchase header ID and status are required']);
        return;
    }
    
    try {
        $query = "UPDATE tbl_purchase_order_header SET status = ? WHERE purchase_header_id = ?";
        $stmt = $conn->prepare($query);
        $result = $stmt->execute([$input['status'], $input['purchase_header_id']]);
        
        if ($result && $stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'No rows updated']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function updateReceivedQuantities($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['purchase_header_id']) || !isset($input['items'])) {
        echo json_encode(['success' => false, 'error' => 'Purchase header ID and items are required']);
        return;
    }
    
    try {
        $conn->beginTransaction();
        
        // Update each item's received quantity
        foreach ($input['items'] as $item) {
            $receivedQty = intval($item['received_qty'] ?? 0);
            $missingQty = intval($item['missing_qty'] ?? 0);
            $purchaseDtlId = intval($item['purchase_dtl_id'] ?? 0);
            
            $query = "UPDATE tbl_purchase_order_dtl 
                     SET received_qty = ?, missing_qty = ? 
                     WHERE purchase_dtl_id = ?";
            $stmt = $conn->prepare($query);
            $stmt->execute([$receivedQty, $missingQty, $purchaseDtlId]);
        }
        
        // Create receiving record
        $receivingQuery = "INSERT INTO tbl_purchase_receiving_header (purchase_header_id, received_by, delivery_receipt_no, notes, receiving_date, receiving_time) 
                          VALUES (?, ?, ?, ?, CURDATE(), CURTIME())";
        $stmt = $conn->prepare($receivingQuery);
        $stmt->execute([
            $input['purchase_header_id'], 
            21, // Default employee ID
            'AUTO-' . date('YmdHis'), 
            'Auto-received via API'
        ]);
        
        $receivingId = $conn->lastInsertId();
        
        // Create receiving details
        foreach ($input['items'] as $item) {
            $receivedQty = intval($item['received_qty'] ?? 0);
            $purchaseDtlId = intval($item['purchase_dtl_id'] ?? 0);
            
            if ($receivedQty > 0) {
                // Get product name from purchase order detail
                $productQuery = "SELECT product_name FROM tbl_purchase_order_dtl WHERE purchase_dtl_id = ?";
                $productStmt = $conn->prepare($productQuery);
                $productStmt->execute([$purchaseDtlId]);
                $productData = $productStmt->fetch(PDO::FETCH_ASSOC);
                $productName = $productData['product_name'] ?? 'Unknown Product';
                
                $detailQuery = "INSERT INTO tbl_purchase_receiving_dtl (receiving_id, product_name, ordered_qty, received_qty, unit_price) 
                               VALUES (?, ?, ?, ?, ?)";
                $detailStmt = $conn->prepare($detailQuery);
                $detailStmt->execute([
                    $receivingId,
                    $productName,
                    $receivedQty,
                    $receivedQty,
                    0 // No pricing
                ]);
            }
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Received quantities updated successfully',
            'receiving_id' => $receivingId
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function updatePartialDelivery($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['purchase_header_id']) || !isset($input['items'])) {
        echo json_encode(['success' => false, 'error' => 'Purchase header ID and items are required']);
        return;
    }
    
    try {
        $conn->beginTransaction();
        
        // Update each item's received quantity
        foreach ($input['items'] as $item) {
            $receivedQty = intval($item['received_qty'] ?? 0);
            $orderedQty = intval($item['ordered_qty'] ?? 0);
            $missingQty = max(0, $orderedQty - $receivedQty);
            $purchaseDtlId = intval($item['purchase_dtl_id'] ?? 0);
            
            $query = "UPDATE tbl_purchase_order_dtl 
                     SET received_qty = ?, missing_qty = ? 
                     WHERE purchase_dtl_id = ?";
            $stmt = $conn->prepare($query);
            $stmt->execute([$receivedQty, $missingQty, $purchaseDtlId]);
        }
        
        // Determine new status based on delivery completion
        $allComplete = true;
        $hasPartial = false;
        
        foreach ($input['items'] as $item) {
            $receivedQty = intval($item['received_qty'] ?? 0);
            $orderedQty = intval($item['ordered_qty'] ?? 0);
            
            if ($receivedQty < $orderedQty) {
                $allComplete = false;
                if ($receivedQty > 0) {
                    $hasPartial = true;
                }
            }
        }
        
        $newStatus = $allComplete ? 'complete' : ($hasPartial ? 'partial_delivery' : 'delivered');
        
        // Update PO status
        $statusQuery = "UPDATE tbl_purchase_order_header SET status = ? WHERE purchase_header_id = ?";
        $statusStmt = $conn->prepare($statusQuery);
        $statusStmt->execute([$newStatus, $input['purchase_header_id']]);
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Partial delivery updated successfully',
            'new_status' => $newStatus
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function getReceivingList($conn) {
    try {
        $query = "SELECT 
                    prh.receiving_id,
                    prh.purchase_header_id,
                    po.po_number,
                    s.supplier_name,
                    prh.receiving_date,
                    prh.receiving_time,
                    prh.delivery_receipt_no,
                    GROUP_CONCAT(CONCAT(prd.product_name, ' (', prd.received_qty, ')') SEPARATOR ', ') as received_items,
                    CASE 
                        WHEN po.status = 'received' THEN 'Complete'
                        WHEN po.status = 'partial_delivery' THEN 'Partial'
                        ELSE 'Ready'
                    END as display_status
                  FROM tbl_purchase_receiving_header prh
                  JOIN tbl_purchase_order_header po ON prh.purchase_header_id = po.purchase_header_id
                  JOIN tbl_supplier s ON po.supplier_id = s.supplier_id
                  LEFT JOIN tbl_purchase_receiving_dtl prd ON prh.receiving_id = prd.receiving_id
                  GROUP BY prh.receiving_id
                  ORDER BY prh.receiving_date DESC, prh.receiving_time DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $receivingList = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $receivingList]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function approvePurchaseOrder($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['purchase_header_id'])) {
        echo json_encode(['success' => false, 'error' => 'Purchase header ID is required']);
        return;
    }
    
    try {
        $query = "UPDATE tbl_purchase_order_header 
                 SET status = ?, 
                     approved_by = ?, 
                     approval_notes = ?,
                     approval_date = CURDATE(),
                     approval_time = CURTIME()
                 WHERE purchase_header_id = ?";
        $stmt = $conn->prepare($query);
        $result = $stmt->execute([
            $input['approval_status'] ?? 'approved',
            $input['approved_by'] ?? 21,
            $input['approval_notes'] ?? 'Approved',
            $input['purchase_header_id']
        ]);
        
        if ($result && $stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Purchase order approved successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'No rows updated']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function updateDeliveryStatus($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['purchase_header_id']) || !isset($input['delivery_status'])) {
        echo json_encode(['success' => false, 'error' => 'Purchase header ID and delivery status are required']);
        return;
    }
    
    try {
        $query = "UPDATE tbl_purchase_order_header 
                 SET delivery_status = ?, 
                     actual_delivery_date = ?
                 WHERE purchase_header_id = ?";
        $stmt = $conn->prepare($query);
        $result = $stmt->execute([
            $input['delivery_status'],
            $input['actual_delivery_date'] ?? null,
            $input['purchase_header_id']
        ]);
        
        if ($result && $stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Delivery status updated successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'No rows updated']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

$conn = null; // Close connection
?>
