<?php
/**
 * Batch Tracking API
 * Handles all FIFO batch tracking operations
 */

// Use centralized CORS configuration
require_once __DIR__ . '/cors.php';

require_once 'conn.php';

// Get the data from the request
$data = json_decode(file_get_contents('php://input'), true) ?? $_POST ?? [];

// Get the action from the request
$action = $data['action'] ?? $_POST['action'] ?? $_GET['action'] ?? '';


try {
    switch ($action) {
        case 'test':
            echo json_encode([
                'success' => true,
                'message' => 'API connection successful',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            break;
            
        case 'get_fifo_stock_status':
            getFifoStockStatus($conn, $data);
            break;
            
        case 'check_fifo_availability':
            checkFifoAvailability($conn, $data);
            break;
            
        case 'create_batch_transfer':
            createBatchTransfer($conn, $data);
            break;
            
        case 'update_product_stock':
            updateProductStock($conn, $data);
            break;
            
        case 'consume_stock_fifo':
            consumeStockFifo($conn, $data);
            break;
            
        case 'get_quantity_history':
            getQuantityHistory($conn, $data);
            break;
            
        case 'get_product_batches':
            getProductBatches($conn, $data);
            break;
            
        case 'add_batch_entry':
            addBatchEntry($conn, $data);
            break;
            
        case 'sync_fifo_stock':
            syncFifoStock($conn, $data);
            break;
            
        case 'check_fifo_stock':
            checkFifoStock($conn, $data);
            break;
            
        case 'duplicate_product_batches':
            duplicateProductBatches($conn, $data);
            break;
            
        case 'get_pharmacy_products':
            getPharmacyProducts($conn, $data);
            break;
            
        case 'get_locations':
            getLocations($conn, $data);
            break;
            
        case 'get_location_products':
            getLocationProducts($conn, $data);
            break;
            
        case 'delete_product':
            deleteProduct($conn, $data);
            break;
            
        case 'get_pharmacy_batch_details':
            getPharmacyBatchDetails($conn, $data);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'message' => 'Invalid action'
            ]);
            break;
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}

/**
 * Get FIFO stock status for a product
 */
function getFifoStockStatus($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $location_id = $data['location_id'] ?? null;
        
        // Get FIFO stock data from tbl_fifo_stock
        $sql = "
            SELECT 
                fs.product_id,
                fs.batch_id,
                fs.batch_reference,
                fs.quantity,
                fs.available_quantity,
                fs.srp,
                fs.expiration_date,
                fs.entry_date,
                p.product_name,
                p.location_id
            FROM tbl_fifo_stock fs
            JOIN tbl_product p ON fs.product_id = p.product_id
            WHERE fs.product_id = ? 
            AND fs.available_quantity > 0
        ";
        
        $params = [$product_id];
        
        if ($location_id) {
            $sql .= " AND p.location_id = ?";
            $params[] = $location_id;
        }
        
        $sql .= " ORDER BY fs.expiration_date ASC, fs.entry_date ASC, fs.fifo_id ASC"; // FIFO order by expiration date first
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $fifo_entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($fifo_entries)) {
            echo json_encode([
                'success' => true,
                'total_available' => 0,
                'batches_count' => 0,
                'fifo_batches' => [],
                'message' => 'Product not found or no FIFO stock available'
            ]);
            return;
        }
        
        // Calculate total available from FIFO entries
        $total_available = 0;
        $fifo_batches = [];
        $fifo_rank = 1;
        
        foreach ($fifo_entries as $entry) {
            $total_available += $entry['available_quantity'];
            
            $fifo_batches[] = [
                'available_quantity' => $entry['available_quantity'],
                'batch_reference' => $entry['batch_reference'],
                'entry_date' => $entry['entry_date'],
                'fifo_rank' => $fifo_rank,
                'batch_id' => $entry['batch_id'],
                'srp' => $entry['srp'],
                'expiration_date' => $entry['expiration_date']
            ];
            
            $fifo_rank++;
        }
        
        echo json_encode([
            'success' => true,
            'total_available' => $total_available,
            'batches_count' => count($fifo_batches),
            'fifo_batches' => $fifo_batches,
            'product_name' => $fifo_entries[0]['product_name']
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error getting FIFO stock status: ' . $e->getMessage()
        ]);
    }
}

/**
 * Check FIFO availability for a product
 */
function checkFifoAvailability($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $location_id = $data['location_id'] ?? 0;
        $requested_quantity = $data['requested_quantity'] ?? 0;
        
        // Get FIFO stock data from tbl_fifo_stock
        $stmt = $conn->prepare("
            SELECT 
                fs.product_id,
                fs.batch_id,
                fs.batch_reference,
                fs.quantity,
                fs.available_quantity,
                fs.srp,
                fs.expiration_date,
                fs.entry_date,
                p.product_name,
                p.location_id
            FROM tbl_fifo_stock fs
            JOIN tbl_product p ON fs.product_id = p.product_id
            WHERE fs.product_id = ? 
            AND p.location_id = ?
            AND fs.available_quantity > 0
            ORDER BY fs.expiration_date ASC, fs.entry_date ASC, fs.fifo_id ASC
        ");
        $stmt->execute([$product_id, $location_id]);
        $fifo_entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($fifo_entries)) {
            echo json_encode([
                'success' => true,
                'available' => false,
                'total_available' => 0,
                'message' => 'No FIFO stock available for this product at this location'
            ]);
            return;
        }
        
        // Calculate total available from FIFO entries
        $total_available = 0;
        $fifo_batches = [];
        $fifo_rank = 1;
        
        foreach ($fifo_entries as $entry) {
            $total_available += $entry['available_quantity'];
            
            $fifo_batches[] = [
                'available_quantity' => $entry['available_quantity'],
                'batch_reference' => $entry['batch_reference'],
                'entry_date' => $entry['entry_date'],
                'fifo_rank' => $fifo_rank,
                'batch_id' => $entry['batch_id'],
                'srp' => $entry['srp'],
                'expiration_date' => $entry['expiration_date']
            ];
            
            $fifo_rank++;
        }
        
        $available = $total_available >= $requested_quantity;
        
        echo json_encode([
            'success' => true,
            'available' => $available,
            'total_available' => $total_available,
            'requested_quantity' => $requested_quantity,
            'batches_count' => count($fifo_batches),
            'fifo_batches' => $fifo_batches,
            'product_name' => $fifo_entries[0]['product_name']
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error checking FIFO availability: ' . $e->getMessage()
        ]);
    }
}

/**
 * Update product stock with FIFO tracking
 */
function updateProductStock($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $new_quantity = $data['new_quantity'] ?? 0;
        $batch_reference = $data['batch_reference'] ?? '';
        $expiration_date = $data['expiration_date'] ?? null;
        $new_srp = $data['new_srp'] ?? null;
        $entry_by = $data['entry_by'] ?? 'admin';
        
        // Use SRP as the primary value
        $srp = $new_srp ?? 0;
        
        if ($product_id <= 0 || $new_quantity <= 0) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID or quantity"
            ]);
            return;
        }
        
        // Start transaction
        $conn->beginTransaction();
        
        // Get current product details (NO quantity - it's in tbl_fifo_stock only)
        $productStmt = $conn->prepare("
            SELECT product_name, category_id, barcode, description, prescription, bulk,
                   expiration, brand_id, supplier_id, location_id, status
            FROM tbl_product 
            WHERE product_id = ?
            LIMIT 1
        ");
        $productStmt->execute([$product_id]);
        $productDetails = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$productDetails) {
            throw new Exception("Product not found");
        }
        
        // Get old quantity from tbl_fifo_stock instead
        $oldQtyStmt = $conn->prepare("
            SELECT COALESCE(SUM(available_quantity), 0) as total_quantity
            FROM tbl_fifo_stock
            WHERE product_id = ?
        ");
        $oldQtyStmt->execute([$product_id]);
        $old_quantity = $oldQtyStmt->fetchColumn();
        $quantity_change = $new_quantity; // This is the amount being added
        
        // Create batch record if batch reference is provided
        $batch_id = null;
        if ($batch_reference) {
            // Check if batch reference already exists to prevent duplicates
            $checkBatchStmt = $conn->prepare("
                SELECT batch_id FROM tbl_batch 
                WHERE batch_reference = ? 
                LIMIT 1
            ");
            $checkBatchStmt->execute([$batch_reference]);
            $existingBatch = $checkBatchStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingBatch) {
                // Use existing batch
                $batch_id = $existingBatch['batch_id'];
                error_log("✅ Using existing batch - Batch ID: $batch_id, Reference: $batch_reference");
            } else {
                // Create new batch
                $batchStmt = $conn->prepare("
                    INSERT INTO tbl_batch (
                        batch, supplier_id, location_id, entry_date, entry_time, 
                        entry_by, order_no
                    ) VALUES (?, ?, ?, CURDATE(), CURTIME(), ?, ?)
                ");
                $batchStmt->execute([$batch_reference, $productDetails['supplier_id'], $productDetails['location_id'], $entry_by, '']);
                $batch_id = $conn->lastInsertId();
                error_log("✅ New batch created - Batch ID: $batch_id, Reference: $batch_reference");
            }
        }
        
        // NO LONGER UPDATE tbl_product.quantity - it doesn't exist anymore!
        // Only update batch_id and expiration if provided
        if ($batch_id || $expiration_date) {
            $updateStmt = $conn->prepare("
                UPDATE tbl_product 
                SET batch_id = COALESCE(?, batch_id),
                    expiration = COALESCE(?, expiration)
                WHERE product_id = ?
            ");
            $updateStmt->execute([$batch_id, $expiration_date, $product_id]);
        }
        
        // Create FIFO stock entry - ALWAYS create for stock updates
        $fifoStmt = $conn->prepare("
            INSERT INTO tbl_fifo_stock (
                product_id, batch_id, batch_reference, quantity, available_quantity,
                srp, expiration_date, entry_date, entry_by, location_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)
        ");
        $fifoStmt->execute([
            $product_id, 
            $batch_id, 
            $batch_reference, 
            $new_quantity, 
            $new_quantity,
            $srp, 
            $expiration_date, 
            $entry_by,
            $productDetails['location_id']
        ]);
        
        // Record the stock movement for tracking quantity changes
        $movementStmt = $conn->prepare("
            INSERT INTO tbl_stock_movements (
                product_id, batch_id, movement_type, quantity, remaining_quantity,
                expiration_date, reference_no, notes, created_by
            ) VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?)
        ");
        $movementStmt->execute([
            $product_id,
            $batch_id ?: $productDetails['batch_id'],
            $quantity_change,
            $old_quantity + $new_quantity,
            $expiration_date,
            $batch_reference,
            "Stock added: +{$quantity_change} units. Old: {$old_quantity}, New: " . ($old_quantity + $new_quantity),
            $entry_by
        ]);
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Stock updated successfully with FIFO tracking",
            "old_quantity" => $old_quantity,
            "new_quantity" => $old_quantity + $new_quantity,
            "quantity_added" => $quantity_change,
            "batch_id" => $batch_id,
            "batch_reference" => $batch_reference
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode([
            "success" => false,
            "message" => "Error updating stock: " . $e->getMessage()
        ]);
    }
}

/**
 * Consume stock using FIFO method
 */
function consumeStockFifo($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $quantity = $data['quantity'] ?? 0;
        $reference_no = $data['reference_no'] ?? '';
        $notes = $data['notes'] ?? '';
        $created_by = $data['created_by'] ?? 'admin';
        
        if ($product_id <= 0 || $quantity <= 0) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID or quantity"
            ]);
            return;
        }
        
        // Start transaction
        $conn->beginTransaction();
        
        // Get FIFO stock data for the product
        $fifoStmt = $conn->prepare("
            SELECT 
                fs.batch_id,
                fs.batch_reference,
                fs.available_quantity,
                fs.srp
            FROM tbl_fifo_stock fs
            JOIN tbl_batch b ON fs.batch_id = b.batch_id
            WHERE fs.product_id = ? AND fs.available_quantity > 0
            ORDER BY fs.expiration_date ASC, b.entry_date ASC, fs.fifo_id ASC
        ");
        $fifoStmt->execute([$product_id]);
        $fifoStock = $fifoStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($fifoStock)) {
            throw new Exception("No FIFO stock available for this product");
        }
        
        $remaining_quantity = $quantity;
        $consumed_batches = [];
        
        // Consume stock from FIFO order
        foreach ($fifoStock as $batch) {
            if ($remaining_quantity <= 0) break;
            
            $batch_quantity = min($remaining_quantity, $batch['available_quantity']);
            
            if ($batch_quantity > 0) {
                // Update FIFO stock
                if ($batch_quantity >= $batch['available_quantity']) {
                    // Consume entire batch
                    $updateStmt = $conn->prepare("
                        UPDATE tbl_fifo_stock 
                        SET available_quantity = 0, updated_at = NOW()
                        WHERE batch_id = ? AND product_id = ?
                    ");
                    $updateStmt->execute([$batch['batch_id'], $product_id]);
                } else {
                    // Partial consumption
                    $updateStmt = $conn->prepare("
                        UPDATE tbl_fifo_stock 
                        SET available_quantity = available_quantity - ?
                        WHERE batch_id = ? AND product_id = ?
                    ");
                    $updateStmt->execute([$batch_quantity, $batch['batch_id'], $product_id]);
                }
                
                // Record stock movement
                $movementStmt = $conn->prepare("
                    INSERT INTO tbl_stock_movements (
                        product_id, batch_id, movement_type, quantity, remaining_quantity,
                        srp, reference_no, notes, created_by
                    ) VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?, ?)
                ");
                $movementStmt->execute([
                    $product_id, $batch['batch_id'], $batch_quantity, 
                    $batch['available_quantity'] - $batch_quantity,
                    $batch['srp'], $reference_no, $notes, $created_by
                ]);
                
                $consumed_batches[] = [
                    'batch_reference' => $batch['batch_reference'],
                    'quantity' => $batch_quantity,
                    'srp' => $batch['srp']
                ];
                
                $remaining_quantity -= $batch_quantity;
            }
        }
        
        if ($remaining_quantity > 0) {
            throw new Exception("Insufficient stock. Requested: {$quantity}, Available: " . ($quantity - $remaining_quantity));
        }
        
        // Update product total quantity
        $updateProductStmt = $conn->prepare("
            UPDATE tbl_product 
            SET quantity = (
                SELECT COALESCE(SUM(fs.available_quantity), 0)
                FROM tbl_fifo_stock fs
                WHERE fs.product_id = tbl_product.product_id
            ),
            stock_status = CASE 
                WHEN (
                    SELECT COALESCE(SUM(fs.available_quantity), 0)
                    FROM tbl_fifo_stock fs
                    WHERE fs.product_id = tbl_product.product_id
                ) <= 0 THEN 'out of stock'
                WHEN (
                    SELECT COALESCE(SUM(fs.available_quantity), 0)
                    FROM tbl_fifo_stock fs
                    WHERE fs.product_id = tbl_product.product_id
                ) <= 10 THEN 'low stock'
                ELSE 'in stock'
            END
            WHERE product_id = ?
        ");
        $updateProductStmt->execute([$product_id]);
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Stock consumed successfully using FIFO method",
            "consumed_quantity" => $quantity,
            "consumed_batches" => $consumed_batches
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode([
            "success" => false,
            "message" => "Error consuming stock: " . $e->getMessage()
        ]);
    }
}

/**
 * Get quantity history for a product
 */
function getQuantityHistory($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        
        if ($product_id <= 0) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID"
            ]);
            return;
        }
        
        $stmt = $conn->prepare("
            SELECT 
                sm.movement_id,
                sm.movement_type,
                sm.quantity as quantity_change,
                sm.remaining_quantity,
                sm.srp,
                sm.movement_date,
                sm.reference_no,
                sm.notes,
                sm.created_by,
                b.batch_reference,
                b.entry_date as batch_date,
                -- Get expiration date from tbl_fifo_stock (priority 1)
                COALESCE(fs.expiration_date, sm.expiration_date) as expiration_date,
                -- Get expiration date from tbl_product as fallback
                p.expiration as product_expiration
            FROM tbl_stock_movements sm
            LEFT JOIN tbl_batch b ON sm.batch_id = b.batch_id
            LEFT JOIN tbl_fifo_stock fs ON sm.product_id = fs.product_id AND sm.batch_id = fs.batch_id
            LEFT JOIN tbl_product p ON sm.product_id = p.product_id
            WHERE sm.product_id = ? 
            AND sm.movement_type != 'OUT'
            ORDER BY sm.movement_date DESC
            LIMIT 20
        ");
        $stmt->execute([$product_id]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $history
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
 * Get product batches
 */
function getProductBatches($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        
        if ($product_id <= 0) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID"
            ]);
            return;
        }
        
        $stmt = $conn->prepare("
            SELECT 
                fs.fifo_id,
                fs.batch_id,
                fs.batch_reference,
                fs.available_quantity,
                fs.srp
            FROM tbl_fifo_stock fs
            JOIN tbl_batch b ON fs.batch_id = b.batch_id
            WHERE fs.product_id = ? AND fs.available_quantity > 0
            ORDER BY fs.expiration_date ASC, b.entry_date ASC, fs.fifo_id ASC
        ");
        $stmt->execute([$product_id]);
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $batches
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
 * Add batch entry
 */
function addBatchEntry($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $batch_reference = $data['batch_reference'] ?? '';
        $quantity = $data['quantity'] ?? 0;
        $srp = $data['srp'] ?? 0;
        $expiration_date = $data['expiration_date'] ?? null;
        $entry_by = $data['entry_by'] ?? 'admin';
        
        if ($product_id <= 0 || $quantity <= 0) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID or quantity"
            ]);
            return;
        }
        
        // Start transaction
        $conn->beginTransaction();
        
        // Get product details
        $productStmt = $conn->prepare("
            SELECT product_name, supplier_id, location_id
            FROM tbl_product 
            WHERE product_id = ?
        ");
        $productStmt->execute([$product_id]);
        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            throw new Exception("Product not found");
        }
        
        // Create batch record
        $batchStmt = $conn->prepare("
            INSERT INTO tbl_batch (
                batch, supplier_id, location_id, entry_date, entry_time, 
                entry_by, order_no
            ) VALUES (?, ?, ?, CURDATE(), CURTIME(), ?, ?)
        ");
        $batchStmt->execute([$batch_reference, $product['supplier_id'], $product['location_id'], $entry_by, '']);
        $batch_id = $conn->lastInsertId();
        
        // Create FIFO stock entry
        $fifoStmt = $conn->prepare("
            INSERT INTO tbl_fifo_stock (
                product_id, batch_id, batch_reference, quantity, available_quantity,
                srp, expiration_date, entry_date, entry_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)
        ");
        $fifoStmt->execute([
            $product_id, $batch_id, $batch_reference, $quantity, $quantity,
            $srp, $expiration_date, $entry_by
        ]);
        
        // Update product quantity
        $updateStmt = $conn->prepare("
            UPDATE tbl_product 
            SET quantity = quantity + ?,
                stock_status = CASE 
                    WHEN quantity + ? <= 0 THEN 'out of stock'
                    WHEN quantity + ? <= 10 THEN 'low stock'
                    ELSE 'in stock'
                END
            WHERE product_id = ?
        ");
        $updateStmt->execute([$quantity, $quantity, $quantity, $product_id]);
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Batch entry added successfully",
            "batch_id" => $batch_id,
            "batch_reference" => $batch_reference
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode([
            "success" => false,
            "message" => "Error adding batch entry: " . $e->getMessage()
        ]);
    }
}

/**
 * Sync FIFO stock
 */
function syncFifoStock($conn, $data) {
    try {
        // COMMENTED OUT - tbl_product.quantity and p.srp columns were removed
        // This function was updating tbl_product.quantity which no longer exists
        // Stock quantities are now managed purely through tbl_fifo_stock
        
        echo json_encode([
            "success" => true,
            "message" => "FIFO stock synchronized successfully"
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error syncing FIFO stock: " . $e->getMessage()
        ]);
    }
}

/**
 * Check FIFO stock
 */
function checkFifoStock($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        
        if ($product_id <= 0) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID"
            ]);
            return;
        }
        
        $stmt = $conn->prepare("
            SELECT 
                COUNT(*) as batch_count,
                SUM(available_quantity) as total_available,
                MIN(entry_date) as oldest_batch,
                MAX(entry_date) as newest_batch
            FROM tbl_fifo_stock 
            WHERE product_id = ? AND available_quantity > 0
        ");
        $stmt->execute([$product_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $result
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
}

/**
 * Duplicate product batches
 */
function duplicateProductBatches($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $batch_ids = $data['batch_ids'] ?? [];
        
        if ($product_id <= 0 || empty($batch_ids)) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID or batch IDs"
            ]);
            return;
        }
        
        // Start transaction
        $conn->beginTransaction();
        
        $duplicated_batches = [];
        
        foreach ($batch_ids as $batch_id) {
            // Get original batch data
            $originalStmt = $conn->prepare("
                SELECT * FROM tbl_fifo_stock 
                WHERE batch_id = ? AND product_id = ?
            ");
            $originalStmt->execute([$batch_id, $product_id]);
            $original = $originalStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($original) {
                // Create new batch reference
                $new_batch_reference = $original['batch_reference'] . '-COPY-' . date('YmdHis');
                
                // Create new batch
                $batchStmt = $conn->prepare("
                    INSERT INTO tbl_batch (
                        batch, supplier_id, location_id, entry_date, entry_time, 
                        entry_by, order_no
                    ) VALUES (?, ?, ?, CURDATE(), CURTIME(), ?, ?)
                ");
                $batchStmt->execute([$new_batch_reference, 1, 2, 'admin', '']);
                $new_batch_id = $conn->lastInsertId();
                
                // Create new FIFO stock entry
                $fifoStmt = $conn->prepare("
                    INSERT INTO tbl_fifo_stock (
                        product_id, batch_id, batch_reference, quantity, available_quantity,
                        srp, expiration_date, entry_date, entry_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)
                ");
                $fifoStmt->execute([
                    $product_id, $new_batch_id, $new_batch_reference, 
                    $original['quantity'], $original['available_quantity'],
                    $original['srp'], $original['expiration_date'], 'admin'
                ]);
                
                $duplicated_batches[] = [
                    'original_batch_id' => $batch_id,
                    'new_batch_id' => $new_batch_id,
                    'new_batch_reference' => $new_batch_reference
                ];
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Batches duplicated successfully",
            "duplicated_batches" => $duplicated_batches
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode([
            "success" => false,
            "message" => "Error duplicating batches: " . $e->getMessage()
        ]);
    }
}

/**
 * Get pharmacy products with total SRP value from FIFO batches
 */
function getPharmacyProducts($conn, $data) {
    try {
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
                COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp,
                COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
                COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as total_quantity,
                p.status,
                s.supplier_name,
                p.expiration,
                l.location_name,
                COALESCE(NULLIF(first_transfer_batch.first_batch_srp, 0), (SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1)) as first_batch_srp,
                CASE
                    WHEN COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) = 0 THEN 'out of stock'
                    WHEN COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) <= 10 THEN 'low stock'
                    ELSE 'in stock'
                END as stock_status
            FROM tbl_product p
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
            LEFT JOIN tbl_location l ON p.location_id = l.location_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            LEFT JOIN (
                SELECT 
                    tbd.product_id,
                    tbd.srp as first_batch_srp,
                    ROW_NUMBER() OVER (PARTITION BY tbd.product_id ORDER BY tbd.created_at ASC, tbd.id ASC) as rn
                FROM tbl_transfer_batch_details tbd
                WHERE tbd.srp > 0
            ) first_transfer_batch ON p.product_id = first_transfer_batch.product_id AND first_transfer_batch.rn = 1
            WHERE $where
            ORDER BY p.product_name ASC
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $rows
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
 * Get all locations
 */
function getLocations($conn, $data) {
    try {
        $stmt = $conn->prepare("SELECT location_id, location_name FROM tbl_location ORDER BY location_name ASC");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $rows
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
 * Get products for a specific location
 */
function getLocationProducts($conn, $data) {
    try {
        $location_id = $data['location_id'] ?? 0;
        $search = $data['search'] ?? '';
        $category = $data['category'] ?? 'all';
        
        if (!$location_id) {
            echo json_encode([
                "success" => false,
                "message" => "Location ID is required"
            ]);
            return;
        }
        
        $where = "p.location_id = ?";
        $params = [$location_id];
        
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
                COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp,
                COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
                COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as total_quantity,
                p.status,
                s.supplier_name,
                p.expiration,
                l.location_name,
                COALESCE(SUM(fs.available_quantity * fs.srp), 0) as total_srp_value,
                CASE
                    WHEN COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) = 0 THEN 'out of stock'
                    WHEN COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) <= 10 THEN 'low stock'
                    ELSE 'in stock'
                END as stock_status
            FROM tbl_product p
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
            LEFT JOIN tbl_location l ON p.location_id = l.location_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
            WHERE $where
            GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, p.status, s.supplier_name, p.expiration, l.location_name
            ORDER BY p.product_name ASC
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $rows
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
 * Delete/Archive a product
 */
function deleteProduct($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $reason = $data['reason'] ?? 'Archived';
        
        if (!$product_id) {
            echo json_encode([
                "success" => false,
                "message" => "Product ID is required"
            ]);
            return;
        }
        
        $stmt = $conn->prepare("UPDATE tbl_product SET status = 'archived' WHERE product_id = ?");
        $stmt->execute([$product_id]);
        
        echo json_encode([
            "success" => true,
            "message" => "Product archived successfully"
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
}

/**
 * Get pharmacy batch details
 */
function getPharmacyBatchDetails($conn, $data) {
    try {
        $location_id = $data['location_id'] ?? 0;
        $product_id = $data['product_id'] ?? 0;
        
        if (!$location_id || !$product_id) {
            echo json_encode([
                "success" => false,
                "message" => "Location ID and Product ID are required"
            ]);
            return;
        }
        
        $stmt = $conn->prepare("
            SELECT 
                btd.*,
                p.product_name,
                fs.srp,
                fs.expiration_date
            FROM tbl_batch_transfer_details btd
            LEFT JOIN tbl_product p ON btd.product_id = p.product_id
            LEFT JOIN tbl_fifo_stock fs ON btd.batch_id = fs.batch_id
            WHERE btd.location_id = ? AND btd.product_id = ?
            ORDER BY btd.transfer_date DESC
        ");
        $stmt->execute([$location_id, $product_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $rows
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
 * Create batch transfer with FIFO tracking
 */
function createBatchTransfer($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $product_name = $data['product_name'] ?? '';
        $total_quantity = $data['total_quantity'] ?? 0;
        $batches = $data['batches'] ?? [];
        $source_location_id = $data['source_location_id'] ?? 0;
        $destination_location_id = $data['destination_location_id'] ?? 0;
        $transfer_type = $data['transfer_type'] ?? 'batch_selection';
        $notes = $data['notes'] ?? '';
        
        if (!$product_id || !$total_quantity || empty($batches) || !$source_location_id || !$destination_location_id) {
            echo json_encode([
                "success" => false,
                "message" => "Missing required parameters for batch transfer"
            ]);
            return;
        }
        
        // Start transaction
        $conn->beginTransaction();
        
        // Create transfer header
        $headerStmt = $conn->prepare("
            INSERT INTO tbl_transfer_header (
                source_location_id, destination_location_id, status, 
                transfer_date, transfer_time, notes, created_by
            ) VALUES (?, ?, 'approved', CURDATE(), CURTIME(), ?, 'system')
        ");
        $headerStmt->execute([
            $source_location_id, 
            $destination_location_id, 
            $notes
        ]);
        $transfer_header_id = $conn->lastInsertId();
        
        // Create transfer detail
        $detailStmt = $conn->prepare("
            INSERT INTO tbl_transfer_dtl (
                transfer_header_id, product_id, qty, unit_price, srp
            ) VALUES (?, ?, ?, 0, 0)
        ");
        $detailStmt->execute([$transfer_header_id, $product_id, $total_quantity]);
        
        // Process each batch
        foreach ($batches as $batch) {
            $batch_id = $batch['batch_id'];
            $batch_quantity = $batch['quantity'];
            $unit_cost = $batch['unit_cost'] ?? 0;
            $srp = $batch['srp'] ?? 0;
            $expiration_date = $batch['expiration_date'] ?? null;
            $batch_reference = $batch['batch_reference'] ?? '';
            
            // Update FIFO stock (consume from source)
            $fifoStmt = $conn->prepare("
                UPDATE tbl_fifo_stock 
                SET available_quantity = available_quantity - ? 
                WHERE batch_id = ? AND available_quantity >= ?
            ");
            $fifoStmt->execute([$batch_quantity, $batch_id, $batch_quantity]);
            
            if ($fifoStmt->rowCount() === 0) {
                throw new Exception("Insufficient stock in batch {$batch_reference}");
            }
            
            // Create batch transfer detail
            $batchDetailStmt = $conn->prepare("
                INSERT INTO tbl_batch_transfer_details (
                    transfer_header_id, product_id, batch_id, batch_reference,
                    batch_quantity, unit_cost, batch_srp, expiration_date,
                    location_id, transfer_date, transfer_time, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), CURTIME(), 'transferred')
            ");
            $batchDetailStmt->execute([
                $transfer_header_id, $product_id, $batch_id, $batch_reference,
                $batch_quantity, $unit_cost, $srp, $expiration_date,
                $destination_location_id
            ]);
            
            // Create stock movement record
            $movementStmt = $conn->prepare("
                INSERT INTO tbl_stock_movements (
                    product_id, batch_id, movement_type, quantity, remaining_quantity,
                    srp, expiration_date, reference_no, created_by, location_id
                ) VALUES (?, ?, 'OUT', ?, 
                    (SELECT available_quantity FROM tbl_fifo_stock WHERE batch_id = ?), 
                    ?, ?, ?, 'system', ?)
            ");
            $movementStmt->execute([
                $product_id, $batch_id, $batch_quantity, $batch_id,
                $srp, $expiration_date, "TR-{$transfer_header_id}", $source_location_id
            ]);
        }
        
        // Check if product exists in destination location
        $checkStmt = $conn->prepare("
            SELECT product_id, quantity FROM tbl_product 
            WHERE product_id = ? AND location_id = ?
        ");
        $checkStmt->execute([$product_id, $destination_location_id]);
        $existingProduct = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingProduct) {
            // Update existing product quantity
            $updateStmt = $conn->prepare("
                UPDATE tbl_product 
                SET quantity = quantity + ? 
                WHERE product_id = ? AND location_id = ?
            ");
            $updateStmt->execute([$total_quantity, $product_id, $destination_location_id]);
        } else {
            // Create new product entry in destination location
            $productStmt = $conn->prepare("
                INSERT INTO tbl_product (
                    product_name, category, barcode, description, prescription, bulk,
                    expiration, date_added, quantity, unit_price, srp, brand_id, 
                    supplier_id, location_id, batch_id, status, stock_status
                ) 
                SELECT 
                    product_name, category, barcode, description, prescription, bulk,
                    expiration, CURDATE(), ?, unit_price, srp, brand_id, 
                    supplier_id, ?, batch_id, 'active', 'in stock'
                FROM tbl_product 
                WHERE product_id = ? AND location_id = ?
            ");
            $productStmt->execute([$total_quantity, $destination_location_id, $product_id, $source_location_id]);
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Batch transfer completed successfully",
            "transfer_id" => $transfer_header_id,
            "total_quantity" => $total_quantity,
            "batches_processed" => count($batches)
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction on error
        if ($conn->inTransaction()) {
            $conn->rollback();
        }
        
        echo json_encode([
            "success" => false,
            "message" => "Batch transfer failed: " . $e->getMessage()
        ]);
    }
}

?>
