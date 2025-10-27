<?php
// CORS headers must be set first, before any output
// Use centralized CORS configuration
require_once __DIR__ . '/cors.php';

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
        case 'add_supplier':
            addSupplier($conn);
            break;
        case 'create_purchase_order':
            createPurchaseOrder($conn);
            break;
        case 'purchase_orders':
            getPurchaseOrders($conn);
            break;
        case 'purchase_orders_with_products':
            getPurchaseOrdersWithProducts($conn);
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
        case 'update_product_status':
            updateProductStatus($conn);
            break;
        case 'receiving_list':
            getReceivingList($conn);
            break;
        case 'received_items_details':
            getReceivedItemsDetails($conn);
            break;
        case 'update_receiving_status':
            updateReceivingStatus($conn);
            break;
        case 'approve_purchase_order':
            approvePurchaseOrder($conn);
            break;
        case 'update_delivery_status':
            updateDeliveryStatus($conn);
            break;
        case 'receive_items':
            receiveItems($conn);
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

function addSupplier($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            echo json_encode(['success' => false, 'error' => 'Invalid input data']);
            return;
        }
        
        $supplier_name = $input['supplier_name'] ?? '';
        $supplier_address = $input['supplier_address'] ?? '';
        $supplier_contact = $input['supplier_contact'] ?? '';
        $supplier_email = $input['supplier_email'] ?? '';
        $primary_phone = $input['primary_phone'] ?? '';
        $primary_email = $input['primary_email'] ?? '';
        $contact_person = $input['contact_person'] ?? '';
        $contact_title = $input['contact_title'] ?? '';
        $notes = $input['notes'] ?? '';
        
        if (empty($supplier_name) || empty($supplier_contact) || empty($supplier_email)) {
            echo json_encode(['success' => false, 'error' => 'Supplier name, contact number, and email are required']);
            return;
        }
        
        $checkStmt = $conn->prepare("SELECT supplier_id FROM tbl_supplier WHERE supplier_name = ? AND status = 'active' LIMIT 1");
        $checkStmt->execute([$supplier_name]);
        if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
            echo json_encode(['success' => false, 'error' => 'Supplier name already exists']);
            return;
        }
        
        $stmt = $conn->prepare("
            INSERT INTO tbl_supplier (
                supplier_name, supplier_address, supplier_contact, supplier_email,
                primary_phone, primary_email, contact_person, contact_title, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ");
        
        $stmt->execute([
            $supplier_name, $supplier_address, $supplier_contact, $supplier_email,
            $primary_phone, $primary_email, $contact_person, $contact_title, $notes
        ]);
        
        echo json_encode([
            'success' => true, 
            'message' => 'Supplier added successfully',
            'data' => ['supplier_id' => $conn->lastInsertId(), 'supplier_name' => $supplier_name]
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function createPurchaseOrder($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'Invalid input data']);
        return;
    }
    
    if (!isset($input['supplier_id']) || !isset($input['products']) || empty($input['products'])) {
        echo json_encode(['success' => false, 'error' => 'Supplier ID and products are required']);
        return;
    }
    
    if (!isset($input['expected_delivery_date']) || empty($input['expected_delivery_date'])) {
        echo json_encode(['success' => false, 'error' => 'Expected delivery date is required']);
        return;
    }
    
    $orderDate = date('Y-m-d');
    $expectedDeliveryDate = $input['expected_delivery_date'];
    
    if (strtotime($expectedDeliveryDate) < strtotime($orderDate)) {
        echo json_encode(['success' => false, 'error' => 'Expected delivery date cannot be earlier than the order date']);
        return;
    }
    
    $conn->beginTransaction();
    
    try {
        $poNumber = 'PO-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        
        $headerQuery = "INSERT INTO tbl_purchase_order_header (supplier_id, total_amount, expected_delivery_date, created_by, status, date, time, notes, po_number) 
                       VALUES (?, 0, ?, ?, 'delivered', CURDATE(), CURTIME(), ?, ?)";
        $stmt = $conn->prepare($headerQuery);
        $stmt->execute([
            $input['supplier_id'], 
            $input['expected_delivery_date'], 
            $input['created_by'] ?? 21,
            $input['notes'] ?? '',
            $poNumber
        ]);
        
        $purchaseHeaderId = $conn->lastInsertId();
        
        // Insert products - check if item_status column exists
        $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
        $hasItemStatus = $checkColumn->rowCount() > 0;
        
        if ($hasItemStatus) {
            $detailQuery = "INSERT INTO tbl_purchase_order_dtl (purchase_header_id, quantity, unit_type, product_name, received_qty, missing_qty, item_status) VALUES (?, ?, ?, ?, ?, ?, ?)";
        } else {
            $detailQuery = "INSERT INTO tbl_purchase_order_dtl (purchase_header_id, quantity, unit_type, product_name, received_qty, missing_qty) VALUES (?, ?, ?, ?, ?, ?)";
        }
        
        $detailStmt = $conn->prepare($detailQuery);
        
        foreach ($input['products'] as $product) {
            $quantity = intval($product['quantity'] ?? 1);
            $unitType = $product['unit_type'] ?? 'pieces';
            $searchTerm = $product['searchTerm'] ?? '';

            if (strlen($searchTerm) > 255) {
                throw new Exception("Product name is too long (maximum 255 characters)");
            }

            if ($hasItemStatus) {
                $detailStmt->execute([
                    $purchaseHeaderId,
                    $quantity,
                    $unitType,
                    $searchTerm,
                    0, // received_qty
                    $quantity, // missing_qty
                    'delivered' // item_status
                ]);
            } else {
                $detailStmt->execute([
                    $purchaseHeaderId,
                    $quantity,
                    $unitType,
                    $searchTerm,
                    0, // received_qty
                    $quantity // missing_qty
                ]);
            }
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Purchase order created successfully',
            'po_number' => $poNumber,
            'purchase_order_id' => $purchaseHeaderId
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'error' => 'Error creating purchase order: ' . $e->getMessage()]);
    }
}

function getPurchaseOrders($conn) {
    try {
        $status = $_GET['status'] ?? null;
        
        // CRITICAL CHANGE: Instead of filtering by PO-level status,
        // we now return POs that have ANY products matching the requested status
        
        $query = "SELECT DISTINCT
                    po.purchase_header_id,
                    po.po_number,
                    po.date,
                    po.expected_delivery_date,
                    po.total_amount,
                    po.status,
                    po.notes,
                    s.supplier_name,
                    s.supplier_contact
                  FROM tbl_purchase_order_header po
                  JOIN tbl_supplier s ON po.supplier_id = s.supplier_id
                  LEFT JOIN tbl_purchase_order_dtl pod ON po.purchase_header_id = pod.purchase_header_id";
        
        $params = [];
        
        // Check if item_status column exists
        $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
        $hasItemStatus = $checkColumn->rowCount() > 0;
        
        // Filter by product-level status instead of PO-level status
        if ($status) {
            if ($status === 'delivered') {
                if ($hasItemStatus) {
                    // Delivered tab shows POs where ALL products are still delivered (not received yet)
                    $query .= " WHERE po.purchase_header_id NOT IN (
                        SELECT DISTINCT purchase_header_id 
                        FROM tbl_purchase_order_dtl 
                        WHERE item_status IN ('complete', 'partial')
                    ) AND po.purchase_header_id IN (
                        SELECT DISTINCT purchase_header_id 
                        FROM tbl_purchase_order_dtl 
                        WHERE COALESCE(item_status, 'delivered') = 'delivered'
                    )";
                } else {
                    // Fallback: Use received_qty = 0 for all products
                    $query .= " WHERE po.purchase_header_id NOT IN (
                        SELECT DISTINCT purchase_header_id 
                        FROM tbl_purchase_order_dtl 
                        WHERE received_qty > 0
                    ) AND po.purchase_header_id IN (
                        SELECT DISTINCT purchase_header_id 
                        FROM tbl_purchase_order_dtl 
                        WHERE received_qty = 0
                    )";
                }
            } elseif ($status === 'partial_delivery') {
                if ($hasItemStatus) {
                    // Partial delivery tab shows POs with mixed statuses (some complete, some delivered/partial)
                    $query .= " WHERE po.purchase_header_id IN (
                        SELECT DISTINCT purchase_header_id 
                        FROM tbl_purchase_order_dtl 
                        WHERE item_status = 'partial'
                    ) OR (
                        po.purchase_header_id IN (
                            SELECT DISTINCT purchase_header_id 
                            FROM tbl_purchase_order_dtl 
                            WHERE item_status = 'complete'
                        ) AND po.purchase_header_id IN (
                            SELECT DISTINCT purchase_header_id 
                            FROM tbl_purchase_order_dtl 
                            WHERE COALESCE(item_status, 'delivered') = 'delivered'
                        )
                    )";
                } else {
                    // Fallback: Mixed received quantities
                    $query .= " WHERE po.purchase_header_id IN (
                        SELECT DISTINCT purchase_header_id 
                        FROM tbl_purchase_order_dtl 
                        WHERE received_qty > 0 AND received_qty < quantity
                    ) OR (
                        po.purchase_header_id IN (
                            SELECT DISTINCT purchase_header_id 
                            FROM tbl_purchase_order_dtl 
                            WHERE received_qty >= quantity AND received_qty > 0
                        ) AND po.purchase_header_id IN (
                            SELECT DISTINCT purchase_header_id 
                            FROM tbl_purchase_order_dtl 
                            WHERE received_qty = 0
                        )
                    )";
                }
            } elseif ($status === 'complete') {
                if ($hasItemStatus) {
                    // Complete tab shows POs where ALL products are complete AND status is not 'received' or 'return'
                    $query .= " WHERE po.purchase_header_id IN (
                        SELECT purchase_header_id FROM (
                            SELECT purchase_header_id, 
                                   COUNT(*) as total_items,
                                   SUM(CASE WHEN item_status = 'complete' THEN 1 ELSE 0 END) as complete_items
                            FROM tbl_purchase_order_dtl 
                            GROUP BY purchase_header_id
                            HAVING total_items = complete_items AND total_items > 0
                        ) as complete_pos
                    ) AND po.status NOT IN ('return', 'received')";
                } else {
                    // Fallback: Use received_qty >= quantity for all products
                    $query .= " WHERE po.purchase_header_id IN (
                        SELECT purchase_header_id FROM (
                            SELECT purchase_header_id, 
                                   COUNT(*) as total_items,
                                   SUM(CASE WHEN received_qty >= quantity AND received_qty > 0 THEN 1 ELSE 0 END) as complete_items
                            FROM tbl_purchase_order_dtl 
                            GROUP BY purchase_header_id
                            HAVING total_items = complete_items AND total_items > 0
                        ) as complete_pos
                    ) AND po.status NOT IN ('return', 'received')";
                }
            } elseif ($status === 'return') {
                // Return tab shows POs with return status at PO level
                $query .= " WHERE po.status = 'return'";
            }
        }
        
        $query .= " ORDER BY po.date DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $purchaseOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Remove duplicates and add product details
        $uniquePOs = [];
        foreach ($purchaseOrders as $po) {
            $poId = $po['purchase_header_id'];
            if (!isset($uniquePOs[$poId])) {
                // Get all products for this PO with their individual statuses
                $productsQuery = "SELECT 
                                    purchase_dtl_id,
                                    product_name,
                                    quantity,
                                    received_qty,
                                    missing_qty,
                                    unit_type,
                                    COALESCE(item_status, 'delivered') as item_status
                                  FROM tbl_purchase_order_dtl
                                  WHERE purchase_header_id = ?
                                  ORDER BY product_name";
                $productsStmt = $conn->prepare($productsQuery);
                $productsStmt->execute([$poId]);
                $products = $productsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // ALWAYS re-evaluate item_status based on received_qty vs quantity to ensure accuracy
                foreach ($products as &$product) {
                    $receivedQty = intval($product['received_qty'] ?? 0);
                    $quantity = intval($product['quantity'] ?? 0);
                    
                    // Re-calculate item_status based on actual quantities
                    if ($receivedQty >= $quantity && $quantity > 0) {
                        $product['item_status'] = 'complete';
                    } else if ($receivedQty > 0) {
                        $product['item_status'] = 'partial';
                    } else {
                        $product['item_status'] = 'delivered';
                    }
                }
                
                // Calculate the correct status based on item statuses
                $totalItems = count($products);
                $completeItems = 0;
                $partialItems = 0;
                $deliveredItems = 0;
                
                foreach ($products as $product) {
                    switch ($product['item_status']) {
                        case 'complete':
                            $completeItems++;
                            break;
                        case 'partial':
                            $partialItems++;
                            break;
                        default:
                            $deliveredItems++;
                            break;
                    }
                }
                
                // Determine the correct status for this PO
                // If PO-level status is 'received' or 'return', use that
                if ($po['status'] === 'received' || $po['status'] === 'return') {
                    // Keep the PO-level status (received or return)
                } elseif ($totalItems === $completeItems && $totalItems > 0) {
                    $po['status'] = 'complete';
                } elseif ($partialItems > 0 || ($completeItems > 0 && $deliveredItems > 0)) {
                    $po['status'] = 'partial_delivery';
                } else {
                    $po['status'] = 'delivered';
                }
                
                // Create products summary
                $productNames = array_map(function($p) { return $p['product_name']; }, $products);
                $po['products_summary'] = implode(', ', array_slice($productNames, 0, 3));
                if (count($productNames) > 3) {
                    $po['products_summary'] .= '...';
                }
                
                $po['all_products'] = $products;
                $uniquePOs[$poId] = $po;
            }
        }
        
        echo json_encode(['success' => true, 'data' => array_values($uniquePOs)]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function getPurchaseOrdersWithProducts($conn) {
    try {
        // Get all purchase orders with their individual products
        $query = "SELECT DISTINCT
                    po.purchase_header_id,
                    po.po_number,
                    po.date,
                    po.expected_delivery_date,
                    po.total_amount,
                    po.status,
                    po.notes,
                    s.supplier_name,
                    s.supplier_contact
                  FROM tbl_purchase_order_header po
                  JOIN tbl_supplier s ON po.supplier_id = s.supplier_id
                  WHERE po.status NOT IN ('returned', 'cancelled')
                  ORDER BY po.date DESC";
        
        $stmt = $conn->query($query);
        $purchaseOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Check if item_status column exists
        $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
        $hasItemStatus = $checkColumn->rowCount() > 0;
        
        // Get products for each PO
        foreach ($purchaseOrders as &$po) {
            $productsQuery = "SELECT 
                                purchase_dtl_id,
                                product_name,
                                quantity,
                                received_qty,
                                missing_qty,
                                unit_type,
                                " . ($hasItemStatus ? "COALESCE(item_status, 'delivered') as item_status" : "'delivered' as item_status") . "
                              FROM tbl_purchase_order_dtl
                              WHERE purchase_header_id = ?
                              ORDER BY product_name";
            $productsStmt = $conn->prepare($productsQuery);
            $productsStmt->execute([$po['purchase_header_id']]);
            $po['products'] = $productsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Re-evaluate item_status based on received_qty vs quantity, but preserve 'returned' status
            foreach ($po['products'] as &$product) {
                // Don't overwrite returned status - it's manually set and should persist
                if ($product['item_status'] === 'returned') {
                    continue;
                }
                
                $receivedQty = intval($product['received_qty'] ?? 0);
                $quantity = intval($product['quantity'] ?? 0);
                
                // Re-calculate item_status based on actual quantities
                if ($receivedQty >= $quantity && $quantity > 0) {
                    $product['item_status'] = 'complete';
                } else if ($receivedQty > 0) {
                    $product['item_status'] = 'partial';
                } else {
                    $product['item_status'] = 'delivered';
                }
            }
        }
        
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
        $headerQuery = "SELECT po.*, s.supplier_name
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
        
        $detailsQuery = "SELECT 
                          pod.*,
                          pod.product_name,
                          pod.quantity,
                          pod.received_qty,
                          pod.missing_qty,
                          pod.unit_type,
                          COALESCE(pod.item_status, 'delivered') as item_status
                        FROM tbl_purchase_order_dtl pod
                        WHERE pod.purchase_header_id = ?";
        $detailStmt = $conn->prepare($detailsQuery);
        $detailStmt->execute([$poId]);
        $details = $detailStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Re-evaluate item_status based on received_qty vs quantity, but preserve 'returned' status
        foreach ($details as &$detail) {
            // Don't overwrite returned status - it's manually set and should persist
            if ($detail['item_status'] === 'returned') {
                continue;
            }
            
            $receivedQty = intval($detail['received_qty'] ?? 0);
            $quantity = intval($detail['quantity'] ?? 0);
            
            // Re-calculate item_status based on actual quantities
            if ($receivedQty >= $quantity && $quantity > 0) {
                $detail['item_status'] = 'complete';
            } else if ($receivedQty > 0) {
                $detail['item_status'] = 'partial';
            } else {
                $detail['item_status'] = 'delivered';
            }
        }
        
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
        $conn->beginTransaction();
        
        $purchaseHeaderId = intval($input['purchase_header_id']);
        $status = $input['status'];
        
        // Debug: Check if PO exists
        $checkPOQuery = "SELECT purchase_header_id, status FROM tbl_purchase_order_header WHERE purchase_header_id = ?";
        $checkPOStmt = $conn->prepare($checkPOQuery);
        $checkPOStmt->execute([$purchaseHeaderId]);
        $poData = $checkPOStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$poData) {
            throw new Exception("Purchase order with ID $purchaseHeaderId not found");
        }
        
        // error_log("Updating PO $purchaseHeaderId from status '{$poData['status']}' to '$status'");
        
        // Update PO status (handle NULL status case)
        $query = "UPDATE tbl_purchase_order_header SET status = ? WHERE purchase_header_id = ?";
        $stmt = $conn->prepare($query);
        $result = $stmt->execute([$status, $purchaseHeaderId]);
        
        if (!$result) {
            throw new Exception('Database update failed');
        }
        
        // Check if the update actually changed the status
        $verifyQuery = "SELECT status FROM tbl_purchase_order_header WHERE purchase_header_id = ?";
        $verifyStmt = $conn->prepare($verifyQuery);
        $verifyStmt->execute([$purchaseHeaderId]);
        $newStatus = $verifyStmt->fetchColumn();
        
        // Handle NULL status case
        if ($newStatus === null) {
            $newStatus = '';
        }
        
        if ($newStatus !== $status) {
            // error_log("Status update mismatch: Expected '$status' but got '$newStatus' for PO $purchaseHeaderId");
            // For cancelled status, don't throw error if it's empty - just log it
            if ($status === 'cancelled' && $newStatus === '') {
                // error_log("Allowing cancelled status update even though database returned empty string");
            } else {
                throw new Exception("Status update failed. Expected '$status' but got '$newStatus'");
            }
        }
        
        // error_log("Successfully updated PO $purchaseHeaderId to status '$status'");
        
        // If status is 'received', update all items' item_status to 'received' and create receiving record
        if ($status === 'received') {
            // Update all items' item_status to 'received'
            $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
            $hasItemStatus = $checkColumn->rowCount() > 0;
            
            if ($hasItemStatus) {
                $updateItemsQuery = "UPDATE tbl_purchase_order_dtl SET item_status = 'received' WHERE purchase_header_id = ?";
                $updateItemsStmt = $conn->prepare($updateItemsQuery);
                $updateItemsStmt->execute([$purchaseHeaderId]);
                // error_log("Updated all items in PO $purchaseHeaderId to 'received' status");
            }
            
            // Check if receiving record already exists
            $checkQuery = "SELECT receiving_id FROM tbl_purchase_receiving_header WHERE purchase_header_id = ?";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->execute([$purchaseHeaderId]);
            
            if ($checkStmt->rowCount() === 0) {
                // Create receiving header record
                $receivingQuery = "INSERT INTO tbl_purchase_receiving_header 
                                  (purchase_header_id, received_by, delivery_receipt_no, notes, receiving_date, receiving_time) 
                                  VALUES (?, ?, ?, ?, CURDATE(), CURTIME())";
                $receivingStmt = $conn->prepare($receivingQuery);
                $receivingStmt->execute([
                    $purchaseHeaderId,
                    $input['approved_by'] ?? 1, // Use approved_by or default to 1
                    $input['delivery_receipt_no'] ?? 'AUTO-' . date('YmdHis'),
                    $input['approval_notes'] ?? 'Automatically received upon approval'
                ]);
                
                $receivingId = $conn->lastInsertId();
                
                // Create receiving detail records for all items
                $itemsQuery = "SELECT purchase_dtl_id, product_id, product_name, quantity, received_qty 
                              FROM tbl_purchase_order_dtl 
                              WHERE purchase_header_id = ?";
                $itemsStmt = $conn->prepare($itemsQuery);
                $itemsStmt->execute([$purchaseHeaderId]);
                $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($items as $item) {
                    $detailQuery = "INSERT INTO tbl_purchase_receiving_dtl 
                                   (receiving_id, purchase_dtl_id, product_id, product_name, received_qty) 
                                   VALUES (?, ?, ?, ?, ?)";
                    $detailStmt = $conn->prepare($detailQuery);
                    $detailStmt->execute([
                        $receivingId,
                        $item['purchase_dtl_id'],
                        $item['product_id'],
                        $item['product_name'],
                        $item['received_qty'] ?? $item['quantity'] // Use received_qty or fallback to ordered quantity
                    ]);
                }
            }
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Status updated successfully', 'receiving_id' => $receivingId ?? null]);
        
    } catch (Exception $e) {
        $conn->rollBack();
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

        $purchaseHeaderId = intval($input['purchase_header_id']);

        // Update each item's received quantity and item_status
        foreach ($input['items'] as $item) {
            $receivedQty = intval($item['received_qty'] ?? 0);
            $purchaseDtlId = intval($item['purchase_dtl_id'] ?? 0);

            if ($purchaseDtlId <= 0) {
                throw new Exception("Invalid purchase detail ID: $purchaseDtlId");
            }

            $getOrderedQtyQuery = "SELECT quantity FROM tbl_purchase_order_dtl WHERE purchase_dtl_id = ?";
            $getOrderedStmt = $conn->prepare($getOrderedQtyQuery);
            $getOrderedStmt->execute([$purchaseDtlId]);
            $orderedQtyData = $getOrderedStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$orderedQtyData) {
                throw new Exception("Purchase detail not found for ID: $purchaseDtlId");
            }
            
            $orderedQty = intval($orderedQtyData['quantity']);
            $missingQty = max(0, $orderedQty - $receivedQty);

            // Check if item_status column exists
            $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
            $hasItemStatus = $checkColumn->rowCount() > 0;
            
            if ($hasItemStatus) {
                // Use item_status from frontend if provided, otherwise determine based on received vs ordered quantity
                $itemStatus = $item['item_status'] ?? null;
                
                if ($itemStatus === null) {
                    // Determine item_status based on received vs ordered quantity
                    $itemStatus = 'delivered';
                    if ($receivedQty == 0) {
                        $itemStatus = 'delivered';
                    } elseif ($receivedQty >= $orderedQty && $receivedQty > 0) {
                        $itemStatus = 'complete'; // Use 'complete' for fully received items
                    } elseif ($receivedQty > 0 && $receivedQty < $orderedQty) {
                        $itemStatus = 'partial';
                    }
                }

                $query = "UPDATE tbl_purchase_order_dtl
                         SET received_qty = ?, missing_qty = ?, item_status = ?
                         WHERE purchase_dtl_id = ?";
                $stmt = $conn->prepare($query);
                $stmt->execute([$receivedQty, $missingQty, $itemStatus, $purchaseDtlId]);
            } else {
                // Fallback: Update without item_status column
                $query = "UPDATE tbl_purchase_order_dtl
                         SET received_qty = ?, missing_qty = ?
                         WHERE purchase_dtl_id = ?";
                $stmt = $conn->prepare($query);
                $stmt->execute([$receivedQty, $missingQty, $purchaseDtlId]);
            }
        }

        // Create receiving record
        $deliveryReceiptNo = isset($input['delivery_receipt_no']) ?
            substr(trim($input['delivery_receipt_no']), 0, 100) :
            'AUTO-' . date('YmdHis');

        $notes = isset($input['notes']) ?
            substr(trim($input['notes']), 0, 500) :
            'Auto-received via API';

        $receivingQuery = "INSERT INTO tbl_purchase_receiving_header (purchase_header_id, received_by, delivery_receipt_no, notes, receiving_date, receiving_time, status)
                          VALUES (?, ?, ?, ?, CURDATE(), CURTIME(), ?)";
        $stmt = $conn->prepare($receivingQuery);
        $stmt->execute([
            $purchaseHeaderId,
            21,
            $deliveryReceiptNo,
            $notes,
            'completed'
        ]);

        $receivingId = $conn->lastInsertId();

        // Create receiving details
        foreach ($input['items'] as $item) {
            $receivedQty = intval($item['received_qty'] ?? 0);
            $purchaseDtlId = intval($item['purchase_dtl_id'] ?? 0);

            if ($receivedQty > 0 && $purchaseDtlId > 0) {
                $productQuery = "SELECT product_name FROM tbl_purchase_order_dtl WHERE purchase_dtl_id = ?";
                $productStmt = $conn->prepare($productQuery);
                $productStmt->execute([$purchaseDtlId]);
                $productData = $productStmt->fetch(PDO::FETCH_ASSOC);
                $productName = substr($productData['product_name'] ?? 'Unknown Product', 0, 255);

                $detailQuery = "INSERT INTO tbl_purchase_receiving_dtl (receiving_id, product_name, ordered_qty, received_qty, unit_price)
                               VALUES (?, ?, ?, ?, ?)";
                $detailStmt = $conn->prepare($detailQuery);
                $detailStmt->execute([
                    $receivingId,
                    $productName,
                    $receivedQty,
                    $receivedQty,
                    0
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
        
        $purchaseHeaderId = intval($input['purchase_header_id']);
        
        foreach ($input['items'] as $item) {
            $receivedQty = intval($item['received_qty'] ?? 0);
            $purchaseDtlId = intval($item['purchase_dtl_id'] ?? 0);

            if ($purchaseDtlId <= 0) {
                throw new Exception("Invalid purchase detail ID: $purchaseDtlId");
            }

            $getOrderedQtyQuery = "SELECT quantity FROM tbl_purchase_order_dtl WHERE purchase_dtl_id = ?";
            $getOrderedStmt = $conn->prepare($getOrderedQtyQuery);
            $getOrderedStmt->execute([$purchaseDtlId]);
            $orderedQtyData = $getOrderedStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$orderedQtyData) {
                throw new Exception("Purchase detail not found for ID: $purchaseDtlId");
            }
            
            $orderedQty = intval($orderedQtyData['quantity']);
            $missingQty = max(0, $orderedQty - $receivedQty);

            // Check if item_status column exists
            $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
            $hasItemStatus = $checkColumn->rowCount() > 0;
            
            if ($hasItemStatus) {
                // Use item_status from frontend if provided, otherwise determine based on received vs ordered quantity
                $itemStatus = $item['item_status'] ?? null;
                
                if ($itemStatus === null) {
                    // Determine item_status based on received vs ordered quantity
                    $itemStatus = 'delivered';
                    if ($receivedQty == 0) {
                        $itemStatus = 'delivered';
                    } elseif ($receivedQty >= $orderedQty && $receivedQty > 0) {
                        $itemStatus = 'complete'; // Use 'complete' for fully received items
                    } elseif ($receivedQty > 0 && $receivedQty < $orderedQty) {
                        $itemStatus = 'partial';
                    }
                }

                $query = "UPDATE tbl_purchase_order_dtl
                         SET received_qty = ?, missing_qty = ?, item_status = ?
                         WHERE purchase_dtl_id = ?";
                $stmt = $conn->prepare($query);
                $stmt->execute([$receivedQty, $missingQty, $itemStatus, $purchaseDtlId]);
            } else {
                // Fallback: Update without item_status column
                $query = "UPDATE tbl_purchase_order_dtl
                         SET received_qty = ?, missing_qty = ?
                         WHERE purchase_dtl_id = ?";
                $stmt = $conn->prepare($query);
                $stmt->execute([$receivedQty, $missingQty, $purchaseDtlId]);
            }
        }
        
        // Check if all items in the PO are now complete
        $checkItemsQuery = "SELECT COUNT(*) as total, SUM(CASE WHEN item_status = 'complete' THEN 1 ELSE 0 END) as complete_count
                            FROM tbl_purchase_order_dtl 
                            WHERE purchase_header_id = ?";
        $checkStmt = $conn->prepare($checkItemsQuery);
        $checkStmt->execute([$purchaseHeaderId]);
        $checkResult = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        // Update PO-level status based on product statuses
        $overallStatus = 'partial_delivery'; // Default to partial
        if ($checkResult && $checkResult['total'] > 0) {
            if ($checkResult['complete_count'] == $checkResult['total']) {
                // All items are complete
                $overallStatus = 'complete';
            } else if ($checkResult['complete_count'] > 0) {
                // Some items are complete, but not all
                $overallStatus = 'partial_delivery';
            }
        }
        
        // Update the PO header status
        $updateHeaderQuery = "UPDATE tbl_purchase_order_header SET status = ? WHERE purchase_header_id = ?";
        $updateHeaderStmt = $conn->prepare($updateHeaderQuery);
        $updateHeaderStmt->execute([$overallStatus, $purchaseHeaderId]);
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Partial delivery updated successfully',
            'overall_status' => $overallStatus
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function updateProductStatus($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['purchase_dtl_id']) || !isset($input['item_status'])) {
        echo json_encode(['success' => false, 'error' => 'Purchase detail ID and item status are required']);
        return;
    }
    
    try {
        $purchaseDtlId = intval($input['purchase_dtl_id']);
        $itemStatus = $input['item_status'];
        
        // Validate status
        $validStatuses = ['delivered', 'partial', 'complete', 'received', 'returned'];
        if (!in_array($itemStatus, $validStatuses)) {
            echo json_encode(['success' => false, 'error' => 'Invalid item status. Must be one of: ' . implode(', ', $validStatuses)]);
            return;
        }
        
        // Check if item_status column exists
        $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
        $hasItemStatus = $checkColumn->rowCount() > 0;
        
        if ($hasItemStatus) {
            // Update with item_status column
            $query = "UPDATE tbl_purchase_order_dtl 
                     SET item_status = ? 
                     WHERE purchase_dtl_id = ?";
            $stmt = $conn->prepare($query);
            $result = $stmt->execute([$itemStatus, $purchaseDtlId]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true, 
                    'message' => "Product status updated to '$itemStatus' successfully"
                ]);
            } else {
                echo json_encode(['success' => false, 'error' => 'No rows updated. Product not found.']);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'item_status column does not exist. Run migration first.']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function receiveItems($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'Invalid input data']);
        return;
    }
    
    $conn->beginTransaction();
    
    try {
        $deliveryReceiptNo = isset($input['delivery_receipt_no']) ? 
            substr(trim($input['delivery_receipt_no']), 0, 100) : '';
        $notes = isset($input['notes']) ? 
            substr(trim($input['notes']), 0, 500) : '';
        
        $receivingQuery = "INSERT INTO tbl_purchase_receiving_header (purchase_header_id, received_by, delivery_receipt_no, notes, receiving_date, receiving_time, status) 
                          VALUES (?, ?, ?, ?, CURDATE(), CURTIME(), ?)";
        $stmt = $conn->prepare($receivingQuery);
        $stmt->execute([
            $input['purchase_header_id'], 
            $input['received_by'] ?? 21,
            $deliveryReceiptNo, 
            $notes,
            'completed'
        ]);
        
        $receivingId = $conn->lastInsertId();
        
        foreach ($input['items'] as $item) {
            $receivedQty = intval($item['received_qty'] ?? 0);
            $productId = intval($item['product_id'] ?? 0);
            
            if ($receivedQty <= 0 || $productId <= 0) {
                continue;
            }

            $orderedQty = intval($item['ordered_qty'] ?? 0);
            if ($orderedQty <= 0 && isset($item['purchase_dtl_id'])) {
                $purchaseDtlId = intval($item['purchase_dtl_id']);
                $q = $conn->prepare("SELECT quantity FROM tbl_purchase_order_dtl WHERE purchase_dtl_id = ?");
                $q->execute([$purchaseDtlId]);
                $row = $q->fetch(PDO::FETCH_ASSOC);
                if ($row) { $orderedQty = intval($row['quantity']); }
            }

            $productName = substr($item['product_name'] ?? 'Unknown Product', 0, 255);
            
            $detailQuery = "INSERT INTO tbl_purchase_receiving_dtl (receiving_id, product_id, product_name, ordered_qty, received_qty, unit_price, batch_number, expiration_date) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $detailStmt = $conn->prepare($detailQuery);
            $detailStmt->execute([
                $receivingId,
                $productId,
                $productName,
                $orderedQty,
                $receivedQty,
                0,
                '',
                null
            ]);
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Items received successfully',
            'receiving_id' => $receivingId
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function getReceivingList($conn) {
    try {
        // First, get all receiving records
        $query = "SELECT 
                    prh.receiving_id,
                    prh.purchase_header_id,
                    po.po_number,
                    s.supplier_name,
                    prh.receiving_date,
                    prh.receiving_time,
                    prh.delivery_receipt_no,
                    GROUP_CONCAT(CONCAT(prd.product_name, ' (', prd.received_qty, ')') SEPARATOR ', ') as received_items
                  FROM tbl_purchase_receiving_header prh
                  JOIN tbl_purchase_order_header po ON prh.purchase_header_id = po.purchase_header_id
                  JOIN tbl_supplier s ON po.supplier_id = s.supplier_id
                  LEFT JOIN tbl_purchase_receiving_dtl prd ON prh.receiving_id = prd.receiving_id
                  GROUP BY prh.receiving_id
                  ORDER BY prh.receiving_date DESC, prh.receiving_time DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $receivingList = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate display_status based on individual product statuses
        foreach ($receivingList as &$item) {
            // Check if item_status column exists
            $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
            $hasItemStatus = $checkColumn->rowCount() > 0;
            
            if ($hasItemStatus) {
                // Get all products for this PO with their individual statuses
                $productsQuery = "SELECT 
                                    quantity,
                                    received_qty,
                                    COALESCE(item_status, 'delivered') as item_status
                                  FROM tbl_purchase_order_dtl
                                  WHERE purchase_header_id = ?";
                $productsStmt = $conn->prepare($productsQuery);
                $productsStmt->execute([$item['purchase_header_id']]);
                $products = $productsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Calculate status based on individual products
                $totalProducts = count($products);
                $completeProducts = 0;
                $partialProducts = 0;
                
                foreach ($products as $product) {
                    $receivedQty = intval($product['received_qty'] ?? 0);
                    $orderedQty = intval($product['quantity'] ?? 0);
                    
                    // Determine status based on received vs ordered quantity
                    if ($receivedQty >= $orderedQty && $orderedQty > 0) {
                        $completeProducts++;
                    } elseif ($receivedQty > 0 && $receivedQty < $orderedQty) {
                        $partialProducts++;
                    }
                }
                
                // Set display_status based on product completion
                if ($totalProducts === $completeProducts && $totalProducts > 0) {
                    $item['display_status'] = 'Complete';
                } elseif ($partialProducts > 0 || ($completeProducts > 0 && $completeProducts < $totalProducts)) {
                    $item['display_status'] = 'Partial';
                } else {
                    $item['display_status'] = 'Ready';
                }
            } else {
                // Fallback: Use PO status if item_status column doesn't exist
                $poQuery = "SELECT status FROM tbl_purchase_order_header WHERE purchase_header_id = ?";
                $poStmt = $conn->prepare($poQuery);
                $poStmt->execute([$item['purchase_header_id']]);
                $poStatus = $poStmt->fetchColumn();
                
                switch ($poStatus) {
                    case 'received':
                        $item['display_status'] = 'Complete';
                        break;
                    case 'partial_delivery':
                        $item['display_status'] = 'Partial';
                        break;
                    default:
                        $item['display_status'] = 'Ready';
                        break;
                }
            }
        }
        
        echo json_encode(['success' => true, 'data' => $receivingList]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function getReceivedItemsDetails($conn) {
    $receivingId = $_GET['receiving_id'] ?? null;
    
    if (!$receivingId) {
        echo json_encode(['success' => false, 'error' => 'Receiving ID is required']);
        return;
    }
    
    try {
        $query = "SELECT 
                    prh.receiving_id,
                    prh.purchase_header_id,
                    po.po_number,
                    s.supplier_name,
                    prh.receiving_date,
                    prh.receiving_time,
                    prh.delivery_receipt_no,
                    prh.notes,
                    GROUP_CONCAT(CONCAT(prd.product_name, ' (', prd.received_qty, ')') SEPARATOR ', ') as received_items
                  FROM tbl_purchase_receiving_header prh
                  JOIN tbl_purchase_order_header po ON prh.purchase_header_id = po.purchase_header_id
                  JOIN tbl_supplier s ON po.supplier_id = s.supplier_id
                  LEFT JOIN tbl_purchase_receiving_dtl prd ON prh.receiving_id = prd.receiving_id
                  WHERE prh.receiving_id = ?
                  GROUP BY prh.receiving_id";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([$receivingId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            // Calculate display_status based on individual product statuses
            $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
            $hasItemStatus = $checkColumn->rowCount() > 0;
            
            if ($hasItemStatus) {
                // Get all products for this PO with their individual statuses
                $productsQuery = "SELECT 
                                    quantity,
                                    received_qty,
                                    COALESCE(item_status, 'delivered') as item_status
                                  FROM tbl_purchase_order_dtl
                                  WHERE purchase_header_id = ?";
                $productsStmt = $conn->prepare($productsQuery);
                $productsStmt->execute([$result['purchase_header_id']]);
                $products = $productsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Calculate status based on individual products
                $totalProducts = count($products);
                $completeProducts = 0;
                $partialProducts = 0;
                
                foreach ($products as $product) {
                    $receivedQty = intval($product['received_qty'] ?? 0);
                    $orderedQty = intval($product['quantity'] ?? 0);
                    
                    // Determine status based on received vs ordered quantity
                    if ($receivedQty >= $orderedQty && $orderedQty > 0) {
                        $completeProducts++;
                    } elseif ($receivedQty > 0 && $receivedQty < $orderedQty) {
                        $partialProducts++;
                    }
                }
                
                // Set display_status based on product completion
                if ($totalProducts === $completeProducts && $totalProducts > 0) {
                    $result['display_status'] = 'Complete';
                } elseif ($partialProducts > 0 || ($completeProducts > 0 && $completeProducts < $totalProducts)) {
                    $result['display_status'] = 'Partial';
                } else {
                    $result['display_status'] = 'Ready';
                }
            } else {
                // Fallback: Use PO status if item_status column doesn't exist
                $poQuery = "SELECT status FROM tbl_purchase_order_header WHERE purchase_header_id = ?";
                $poStmt = $conn->prepare($poQuery);
                $poStmt->execute([$result['purchase_header_id']]);
                $poStatus = $poStmt->fetchColumn();
                
                switch ($poStatus) {
                    case 'received':
                        $result['display_status'] = 'Complete';
                        break;
                    case 'partial_delivery':
                        $result['display_status'] = 'Partial';
                        break;
                    default:
                        $result['display_status'] = 'Ready';
                        break;
                }
            }
            
            $detailQuery = "SELECT 
                              prd.receiving_dtl_id as product_id,
                              prd.product_name,
                              prd.ordered_qty,
                              prd.received_qty,
                              prd.unit_price,
                              prd.batch_number,
                              prd.expiration_date,
                              pod.quantity as total_ordered_qty,
                              pod.received_qty as total_received_qty,
                              pod.missing_qty,
                              COALESCE(pod.item_status, 'delivered') as item_status
                            FROM tbl_purchase_receiving_dtl prd
                            JOIN tbl_purchase_order_dtl pod ON prd.product_name = pod.product_name 
                                AND pod.purchase_header_id = ?
                            WHERE prd.receiving_id = ?";
            $detailStmt = $conn->prepare($detailQuery);
            $detailStmt->execute([$result['purchase_header_id'], $receivingId]);
            $details = $detailStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($details)) {
                $fallbackQuery = "SELECT 
                                    pod.product_name,
                                    pod.quantity as ordered_qty,
                                    COALESCE(pod.received_qty, pod.quantity) as received_qty,
                                    0 as unit_price
                                  FROM tbl_purchase_order_dtl pod
                                  JOIN tbl_purchase_receiving_header prh ON pod.purchase_header_id = prh.purchase_header_id
                                  WHERE prh.receiving_id = ?";
                $fallbackStmt = $conn->prepare($fallbackQuery);
                $fallbackStmt->execute([$receivingId]);
                $details = $fallbackStmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            if (empty($details)) {
                $details = [[
                    'product_name' => 'Items received (details not available)',
                    'ordered_qty' => '-',
                    'received_qty' => 'Received',
                    'unit_price' => 0
                ]];
            }
            
            $result['details'] = $details;
            echo json_encode(['success' => true, 'data' => $result]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Receiving record not found']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}

function updateReceivingStatus($conn) {
    $receivingId = $_GET['receiving_id'] ?? null;
    $newStatus = $_GET['status'] ?? 'completed';
    
    if (!$receivingId) {
        echo json_encode(['success' => false, 'error' => 'Receiving ID is required']);
        return;
    }
    
    try {
        $query = "UPDATE tbl_purchase_receiving_header SET status = ? WHERE receiving_id = ?";
        $stmt = $conn->prepare($query);
        $result = $stmt->execute([$newStatus, $receivingId]);
        
        if ($result && $stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'No rows updated']);
        }
        
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
