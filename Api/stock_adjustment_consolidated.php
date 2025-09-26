<?php
require_once 'conn.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST method allowed']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$action = $data['action'] ?? '';

switch ($action) {
    case 'get_all_stock_adjustment_data':
        try {
            $start_date = $data['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $end_date = $data['end_date'] ?? date('Y-m-d');
            
            // Get stock adjustments (both IN and OUT movements)
            $stmt1 = $conn->prepare("
                SELECT 
                    CONCAT('SA-', sm.movement_id) as id,
                    COALESCE(p.product_name, 'Unknown Product') as product_name,
                    COALESCE(p.barcode, 'N/A') as product_id,
                    CASE 
                        WHEN sm.movement_type = 'IN' THEN 'Stock In'
                        WHEN sm.movement_type = 'OUT' THEN 'Stock Out'
                        ELSE 'Adjustment'
                    END as adjustment_type,
                    sm.quantity,
                    sm.notes as reason,
                    COALESCE(
                        CASE 
                            WHEN sm.created_by REGEXP '^[0-9]+$' THEN CONCAT(e.fname, ' ', e.lname)
                            ELSE sm.created_by
                        END, 
                        'System'
                    ) as adjusted_by,
                    DATE(sm.movement_date) as date,
                    TIME(sm.movement_date) as time,
                    'Approved' as status,
                    sm.reference_no,
                    'stock_adjustment' as source,
                    sm.movement_date as full_date,
                    COALESCE(p.srp, p.unit_price, 0.00) as unit_cost,
                    COALESCE(sm.expiration_date, p.expiration, NULL) as expiration_date
                FROM tbl_stock_movements sm
                LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                LEFT JOIN tbl_employee e ON (sm.created_by REGEXP '^[0-9]+$' AND sm.created_by = e.emp_id)
                WHERE sm.movement_type IN ('IN', 'OUT')
                AND DATE(sm.movement_date) BETWEEN ? AND ?
                ORDER BY sm.movement_date DESC
            ");
            $stmt1->execute([$start_date, $end_date]);
            $stockAdjustments = $stmt1->fetchAll(PDO::FETCH_ASSOC);
            
            // Get transfer data (both incoming and outgoing transfers)
            $stmt2 = $conn->prepare("
                SELECT 
                    CONCAT('TR-', th.transfer_header_id, '-', td.transfer_dtl_id) as id,
                    p.product_name,
                    p.barcode as product_id,
                    CASE 
                        WHEN th.source_location_id != ? THEN 'Stock In'
                        ELSE 'Stock Out'
                    END as adjustment_type,
                    td.qty as quantity,
                    CONCAT('Transfer from ', sl.location_name, ' to ', dl.location_name) as reason,
                    COALESCE(CONCAT(e.fname, ' ', e.lname), 'System') as adjusted_by,
                    DATE(th.date) as date,
                    TIME(th.date) as time,
                    'Approved' as status,
                    CONCAT('TR-', th.transfer_header_id) as reference_no,
                    'transfer' as source,
                    th.date as full_date,
                    COALESCE(p.srp, p.unit_price, 0.00) as unit_cost,
                    COALESCE(p.expiration, NULL) as expiration_date
                FROM tbl_transfer_header th
                JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                JOIN tbl_product p ON td.product_id = p.product_id
                LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
                LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
                WHERE th.status = 'approved'
                AND DATE(th.date) BETWEEN ? AND ?
                ORDER BY th.date DESC
            ");
            // For transfer query, we need to determine the current location ID
            // This is a simplified approach - you may need to adjust based on your location logic
            $current_location_id = 1; // Default location ID - adjust as needed
            $stmt2->execute([$current_location_id, $start_date, $end_date]);
            $transfers = $stmt2->fetchAll(PDO::FETCH_ASSOC);
            
            // Get recent product updates (products that were recently added/updated)
            $stmt3 = $conn->prepare("
                SELECT 
                    CONCAT('PU-', p.product_id) as id,
                    p.product_name,
                    p.barcode as product_id,
                    'Stock In' as adjustment_type,
                    p.quantity,
                    'Product Update' as reason,
                    'Inventory Manager' as adjusted_by,
                    DATE(p.date_added) as date,
                    TIME(p.date_added) as time,
                    'Approved' as status,
                    CONCAT('PROD-', p.product_id) as reference_no,
                    'product_update' as source,
                    p.date_added as full_date,
                    COALESCE(p.srp, p.unit_price, 0.00) as unit_cost,
                    COALESCE(p.expiration, NULL) as expiration_date
                FROM tbl_product p
                WHERE p.status = 'active'
                AND p.quantity > 0
                AND DATE(p.date_added) BETWEEN ? AND ?
                ORDER BY p.date_added DESC
            ");
            $stmt3->execute([$start_date, $end_date]);
            $productUpdates = $stmt3->fetchAll(PDO::FETCH_ASSOC);
            
            // Combine all data
            $allData = array_merge($stockAdjustments, $transfers, $productUpdates);
            
            // Sort by date (newest first)
            usort($allData, function($a, $b) {
                return strtotime($b['full_date']) - strtotime($a['full_date']);
            });
            
            // Calculate summary
            $summary = [
                'total_records' => count($allData),
                'stock_adjustments' => count($stockAdjustments),
                'transfers' => count($transfers),
                'product_updates' => count($productUpdates),
                'total_quantity' => array_sum(array_column($allData, 'quantity'))
            ];
            
            echo json_encode([
                'success' => true,
                'data' => $allData,
                'summary' => $summary
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage(),
                'data' => []
            ]);
        }
        break;

    case 'get_stock_adjustments':
        try {
            $search = $data['search'] ?? '';
            $type = $data['type'] ?? 'all';
            $status = $data['status'] ?? 'all';
            $page = $data['page'] ?? 1;
            $limit = $data['limit'] ?? 10;
            $offset = ($page - 1) * $limit;
            
            $whereConditions = [];
            $params = [];
            
            if ($search) {
                $whereConditions[] = "(p.product_name LIKE ? OR p.barcode LIKE ? OR sm.notes LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            
            if ($type !== 'all') {
                $whereConditions[] = "sm.movement_type = ?";
                $params[] = $type;
            }
            
            if ($status !== 'all') {
                $whereConditions[] = "sm.status = ?";
                $params[] = $status;
            }
            
            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            // Get total count
            $countStmt = $conn->prepare("
                SELECT COUNT(*) as total
                FROM tbl_stock_movements sm
                LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                LEFT JOIN tbl_employee e ON sm.created_by = e.emp_id
                $whereClause
            ");
            $countStmt->execute($params);
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Get adjustments with pagination
            $stmt = $conn->prepare("
                SELECT 
                    sm.movement_id as id,
                    COALESCE(p.product_name, 'Unknown Product') as product_name,
                    COALESCE(p.barcode, 'N/A') as product_id,
                    CASE 
                        WHEN sm.movement_type = 'IN' THEN 'Stock In'
                        WHEN sm.movement_type = 'OUT' THEN 'Stock Out'
                        ELSE sm.movement_type
                    END as adjustment_type,
                    sm.quantity,
                    sm.notes as reason,
                    COALESCE(CONCAT(e.fname, ' ', e.lname), sm.created_by, 'System') as adjusted_by,
                    DATE(sm.movement_date) as date,
                    TIME(sm.movement_date) as time,
                    COALESCE(sm.status, 'Approved') as status,
                    sm.reference_no,
                    COALESCE(p.srp, p.unit_price, 0.00) as unit_cost,
                    COALESCE(sm.expiration_date, p.expiration, NULL) as expiration_date
                FROM tbl_stock_movements sm
                LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                LEFT JOIN tbl_employee e ON sm.created_by = e.emp_id
                $whereClause
                ORDER BY sm.movement_date DESC
                LIMIT ? OFFSET ?
            ");
            
            $params[] = $limit;
            $params[] = $offset;
            $stmt->execute($params);
            $adjustments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => $adjustments,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => ceil($totalCount / $limit),
                    'total_records' => $totalCount,
                    'records_per_page' => $limit
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

    case 'get_stock_adjustment_stats':
        try {
            $stmt = $conn->prepare("
                SELECT 
                    COUNT(*) as total_adjustments,
                    COUNT(CASE WHEN movement_type = 'IN' THEN 1 END) as additions,
                    COUNT(CASE WHEN movement_type = 'OUT' THEN 1 END) as subtractions,
                    SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE -quantity END) as net_quantity
                FROM tbl_stock_movements
                WHERE movement_type IN ('IN', 'OUT')
            ");
            $stmt->execute();
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => $stats
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage(),
                'data' => []
            ]);
        }
        break;

    case 'create_stock_adjustment':
        try {
            $product_id = $data['product_id'] ?? 0;
            $adjustment_type = $data['adjustment_type'] ?? 'Addition';
            $quantity = $data['quantity'] ?? 0;
            $reason = $data['reason'] ?? '';
            $notes = $data['notes'] ?? '';
            $unit_cost = $data['unit_cost'] ?? 0;
            $expiration_date = $data['expiration_date'] ?? null;
            $created_by = $data['created_by'] ?? 'admin';
                
            if (!$product_id || !$quantity || !$reason) {
                echo json_encode([
                    "success" => false,
                    "message" => "Product ID, quantity, and reason are required"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get product details
            $productStmt = $conn->prepare("
                SELECT product_name, quantity, location_id, unit_price 
                FROM tbl_product 
                WHERE product_id = ?
            ");
            $productStmt->execute([$product_id]);
            $product = $productStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                throw new Exception("Product not found");
            }
            
            // Determine movement type
            $movement_type = ($adjustment_type === 'Addition') ? 'IN' : 'OUT';
            
            // Calculate new quantity
            $old_quantity = $product['quantity'];
            $new_quantity = ($movement_type === 'IN') ? 
                $old_quantity + $quantity : 
                max(0, $old_quantity - $quantity);
            
            // Create batch record for the adjustment
            $batchStmt = $conn->prepare("
                INSERT INTO tbl_batch (
                    batch, supplier_id, location_id, entry_date, entry_time, 
                    entry_by, order_no
                ) VALUES (?, ?, ?, CURDATE(), CURTIME(), ?, ?)
            ");
            $batch_no = 'ADJ-' . date('YmdHis');
            $batchStmt->execute([
                $batch_no, 
                0, // No supplier for adjustments
                $product['location_id'], 
                $created_by, 
                'STOCK-ADJ-' . date('YmdHis')
            ]);
            $batch_id = $conn->lastInsertId();
            
            // Create stock movement record with SRP
            $movementStmt = $conn->prepare("
                INSERT INTO tbl_stock_movements (
                    product_id, movement_type, quantity, movement_date, 
                    reference_no, notes, created_by, batch_id, unit_cost, expiration_date
                ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)
            ");
            $reference_no = 'ADJ-' . date('YmdHis');
            $movementStmt->execute([
                $product_id, 
                $movement_type, 
                $quantity, 
                $reference_no, 
                $reason, 
                $created_by, 
                $batch_id,
                $unit_cost, // This is now the SRP value
                $expiration_date
            ]);
            $movement_id = $conn->lastInsertId();
            
            // Update product quantity and stock status
            $updateProductStmt = $conn->prepare("
                UPDATE tbl_product 
                SET quantity = ?,
                    stock_status = CASE 
                        WHEN ? <= 0 THEN 'out of stock'
                        WHEN ? <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END
                WHERE product_id = ?
            ");
            $updateProductStmt->execute([$new_quantity, $new_quantity, $new_quantity, $product_id]);
            
            // Note: No batch detail table exists, so we skip this step
            
            // Commit transaction
            $conn->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Stock adjustment created successfully',
                'data' => [
                    'adjustment_id' => $movement_id,
                    'batch_id' => $batch_id,
                    'reference_no' => $reference_no,
                    'old_quantity' => $old_quantity,
                    'new_quantity' => $new_quantity,
                    'quantity_changed' => $quantity
                ]
            ]);
            
        } catch (Exception $e) {
            // Rollback transaction on error
            if ($conn->inTransaction()) {
                $conn->rollback();
            }
            
            echo json_encode([
                'success' => false,
                'message' => 'Failed to create stock adjustment: ' . $e->getMessage()
            ]);
        }
        break;

    case 'update_stock_adjustment':
        try {
            $movement_id = $data['movement_id'] ?? 0;
            $quantity = $data['quantity'] ?? 0;
            $reason = $data['reason'] ?? '';
            $notes = $data['notes'] ?? '';
            $unit_cost = $data['unit_cost'] ?? 0;
            $expiration_date = $data['expiration_date'] ?? null;
                
            if (!$movement_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Movement ID is required"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get current movement details
            $movementStmt = $conn->prepare("
                SELECT sm.*, p.product_name, p.quantity as current_product_quantity
                FROM tbl_stock_movements sm
                LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                WHERE sm.movement_id = ?
            ");
            $movementStmt->execute([$movement_id]);
            $movement = $movementStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$movement) {
                throw new Exception("Movement not found");
            }
            
            // Calculate quantity difference
            $quantity_diff = $quantity - $movement['quantity'];
            
            // Update product quantity
            $new_product_quantity = $movement['current_product_quantity'] + $quantity_diff;
            $new_product_quantity = max(0, $new_product_quantity);
            
            $updateProductStmt = $conn->prepare("
                UPDATE tbl_product 
                SET quantity = ?,
                    stock_status = CASE 
                        WHEN ? <= 0 THEN 'out of stock'
                        WHEN ? <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END
                WHERE product_id = ?
            ");
            $updateProductStmt->execute([$new_product_quantity, $new_product_quantity, $new_product_quantity, $movement['product_id']]);
            
            // Update movement record
            $updateMovementStmt = $conn->prepare("
                UPDATE tbl_stock_movements 
                SET quantity = ?, 
                    notes = ?, 
                    unit_cost = ?,
                    expiration_date = ?,
                    updated_at = NOW()
                WHERE movement_id = ?
            ");
            $updateMovementStmt->execute([$quantity, $reason, $unit_cost, $expiration_date, $movement_id]);
            
            // Note: No batch detail table exists, so we skip batch detail updates
            
            // Commit transaction
            $conn->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Stock adjustment updated successfully',
                'data' => [
                    'adjustment_id' => $movement_id,
                    'old_quantity' => $movement['quantity'],
                    'new_quantity' => $quantity,
                    'quantity_diff' => $quantity_diff,
                    'product_old_quantity' => $movement['current_product_quantity'],
                    'product_new_quantity' => $new_product_quantity
                ]
            ]);
            
        } catch (Exception $e) {
            // Rollback transaction on error
            if ($conn->inTransaction()) {
                $conn->rollback();
            }
            
            echo json_encode([
                'success' => false,
                'message' => 'Failed to update stock adjustment: ' . $e->getMessage()
            ]);
        }
        break;

    case 'delete_stock_adjustment':
        try {
            $movement_id = $data['movement_id'] ?? 0;
            
            if (!$movement_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Movement ID is required"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get movement details
            $movementStmt = $conn->prepare("
                SELECT sm.*, p.quantity as current_product_quantity
                FROM tbl_stock_movements sm
                LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                WHERE sm.movement_id = ?
            ");
            $movementStmt->execute([$movement_id]);
            $movement = $movementStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$movement) {
                throw new Exception("Movement not found");
            }
            
            // Reverse the adjustment effect on product quantity
            $quantity_to_reverse = ($movement['movement_type'] === 'IN') ? -$movement['quantity'] : $movement['quantity'];
            $new_product_quantity = $movement['current_product_quantity'] + $quantity_to_reverse;
            $new_product_quantity = max(0, $new_product_quantity);
            
            // Update product quantity
            $updateProductStmt = $conn->prepare("
                UPDATE tbl_product 
                SET quantity = ?,
                    stock_status = CASE 
                        WHEN ? <= 0 THEN 'out of stock'
                        WHEN ? <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END
                WHERE product_id = ?
            ");
            $updateProductStmt->execute([$new_product_quantity, $new_product_quantity, $new_product_quantity, $movement['product_id']]);
            
            // Delete movement record
            $deleteMovementStmt = $conn->prepare("DELETE FROM tbl_stock_movements WHERE movement_id = ?");
            $deleteMovementStmt->execute([$movement_id]);
            
            // Note: No batch detail table exists, so we skip batch detail cleanup
            
            // Commit transaction
            $conn->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Stock adjustment deleted successfully',
                'data' => [
                    'deleted_movement_id' => $movement_id,
                    'product_id' => $movement['product_id'],
                    'quantity_reversed' => $quantity_to_reverse,
                    'product_old_quantity' => $movement['current_product_quantity'],
                    'product_new_quantity' => $new_product_quantity
                ]
            ]);
            
        } catch (Exception $e) {
            // Rollback transaction on error
            if ($conn->inTransaction()) {
                $conn->rollback();
            }
            
            echo json_encode([
                'success' => false,
                'message' => 'Failed to delete stock adjustment: ' . $e->getMessage()
            ]);
        }
        break;

    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action specified'
        ]);
        break;
}
?>
