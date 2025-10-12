<?php
// Inventory Management Functions
// This file contains all inventory-related backend functions

function get_pos_inventory($conn, $data) {
    try {
        $location_id = $data['location_id'] ?? 0;
        $location_name = $data['location_name'] ?? '';
        $search = $data['search'] ?? '';
        
        // If location_id is not provided, try to get it from location_name
        if (!$location_id && !empty($location_name)) {
            $locStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name = ? LIMIT 1");
            $locStmt->execute([$location_name]);
            $location_id = $locStmt->fetchColumn();
        }
        
        if (!$location_id) {
            echo json_encode([
                "success" => false,
                "message" => "Location ID or Location Name is required"
            ]);
            return;
        }
        
        // Build the query to get all products with stock from transfer batch details
        $sql = "
            SELECT 
                p.product_id as id,
                p.product_name as name,
                c.category_name,
                p.barcode,
                p.description,
                COALESCE(SUM(tbd.quantity), 0) as quantity,
                COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as unit_price,
                COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp,
                p.prescription,
                p.bulk,
                p.expiration,
                p.status,
                ? as location_id,
                ? as location_name,
                COALESCE(b.brand, '') as brand,
                COALESCE(s.supplier_name, '') as supplier_name,
                CASE 
                    WHEN COALESCE(SUM(tbd.quantity), 0) <= 0 THEN 'out of stock'
                    WHEN COALESCE(SUM(tbd.quantity), 0) <= 10 THEN 'low stock'
                    ELSE 'in stock'
                END as stock_status
            FROM tbl_product p
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            LEFT JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id
            WHERE p.status = 'active' AND (tbd.location_id = ? OR tbd.location_id IS NULL)
        ";
        
        $params = [$location_id, $location_name, $location_id];
        
        // Add search filter if provided
        if (!empty($search)) {
            $sql .= " AND (p.product_name LIKE ? OR p.description LIKE ? OR c.category_name LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        $sql .= " GROUP BY p.product_id, p.product_name, c.category_name, p.barcode, p.description, p.prescription, p.bulk, p.expiration, p.status, b.brand, s.supplier_name";
        $sql .= " HAVING COALESCE(SUM(tbd.quantity), 0) > 0"; // Only show products that have stock in this location
        $sql .= " ORDER BY p.product_name ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $products,
            "count" => count($products),
            "location_id" => $location_id,
            "location_name" => $location_name
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error fetching inventory: " . $e->getMessage()
        ]);
    }
}

function reduce_product_stock($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $quantity_to_reduce = $data['quantity'] ?? 0;
        $transaction_id = $data['transaction_id'] ?? '';
        $location_name = $data['location_name'] ?? '';
        $location_id = $data['location_id'] ?? 0;
        $entry_by = $data['entry_by'] ?? 'POS System';
        
        if (!$product_id || $quantity_to_reduce <= 0) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID or quantity"
            ]);
            return;
        }
        
        // Get current product details
        $productStmt = $conn->prepare("
            SELECT product_name 
            FROM tbl_product 
            WHERE product_id = ?
        ");
        $productStmt->execute([$product_id]);
        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode([
                "success" => false,
                "message" => "Product not found"
            ]);
            return;
        }
        
        // Get current stock from transfer batch details
        $stockStmt = $conn->prepare("
            SELECT 
                COALESCE(SUM(tbd.quantity), 0) as current_stock
            FROM tbl_transfer_batch_details tbd
            WHERE tbd.product_id = ? AND tbd.location_id = ?
        ");
        $stockStmt->execute([$product_id, $location_id]);
        $current_stock = $stockStmt->fetchColumn();
        
        if ($current_stock < $quantity_to_reduce) {
            echo json_encode([
                "success" => false,
                "message" => "Insufficient stock. Available: $current_stock, Requested: $quantity_to_reduce"
            ]);
            return;
        }
        
        // Reduce stock from transfer batch details (FIFO - First In, First Out)
        $remaining_to_reduce = $quantity_to_reduce;
        
        // Get batches ordered by oldest first (FIFO)
        $batchStmt = $conn->prepare("
            SELECT 
                tbd.id,
                tbd.batch_id,
                tbd.batch_reference,
                tbd.quantity,
                tbd.srp,
                tbd.expiration_date
            FROM tbl_transfer_batch_details tbd
            WHERE tbd.product_id = ? AND tbd.location_id = ? AND tbd.quantity > 0
            ORDER BY tbd.id ASC, tbd.expiration_date ASC
        ");
        $batchStmt->execute([$product_id, $location_id]);
        $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($batches as $batch) {
            if ($remaining_to_reduce <= 0) break;
            
            $batch_quantity = $batch['quantity'];
            $reduce_from_batch = min($remaining_to_reduce, $batch_quantity);
            
            // Update batch quantity
            $updateBatchStmt = $conn->prepare("
                UPDATE tbl_transfer_batch_details 
                SET quantity = quantity - ? 
                WHERE id = ?
            ");
            $updateBatchStmt->execute([$reduce_from_batch, $batch['id']]);
            
            // Log stock movement for this batch
            $logStmt = $conn->prepare("
                INSERT INTO tbl_stock_movements 
                (product_id, batch_id, movement_type, quantity, remaining_quantity, srp, 
                 expiration_date, reference_no, notes, created_by)
                VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?, ?, ?)
            ");
            $logStmt->execute([
                $product_id,
                $batch['batch_id'],
                $reduce_from_batch,
                $batch_quantity - $reduce_from_batch,
                $batch['srp'],
                $batch['expiration_date'],
                $transaction_id,
                "POS Sale - Reduced by $reduce_from_batch units from batch {$batch['batch_reference']}",
                $entry_by
            ]);
            
            $remaining_to_reduce -= $reduce_from_batch;
        }
        
        // Log POS transaction
        $posTransactionStmt = $conn->prepare("
            INSERT INTO tbl_pos_transaction 
            (transaction_id, product_id, quantity, unit_price, total_amount, location_name, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $posTransactionStmt->execute([
            $transaction_id,
            $product_id,
            $quantity_to_reduce,
            $batches[0]['srp'] ?? 0,
            ($batches[0]['srp'] ?? 0) * $quantity_to_reduce,
            $location_name,
            $entry_by
        ]);
        
        echo json_encode([
            "success" => true,
            "message" => "Stock updated successfully",
            "data" => [
                "product_id" => $product_id,
                "product_name" => $product['product_name'],
                "old_quantity" => $current_stock,
                "new_quantity" => $current_stock - $quantity_to_reduce,
                "reduced_by" => $quantity_to_reduce,
                "stock_type" => "POS Sale",
                "location_name" => $location_name
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error reducing stock: " . $e->getMessage()
        ]);
    }
}

function update_product_stock($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $new_quantity = $data['new_quantity'] ?? 0;
        $batch_reference = $data['batch_reference'] ?? '';
        $expiration_date = $data['expiration_date'] ?? null;
        $entry_by = $data['entry_by'] ?? 'admin';
        $new_srp = $data['new_srp'] ?? $data['srp'] ?? 0;
        
        if (!$product_id || $new_quantity < 0) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID or quantity"
            ]);
            return;
        }
        
        // Validate SRP - REQUIRED for FIFO
        if (!$new_srp || $new_srp <= 0) {
            echo json_encode([
                "success" => false,
                "message" => "SRP is required for FIFO stock tracking"
            ]);
            return;
        }
        
        // Validate expiration - REQUIRED for FIFO
        if (!$expiration_date) {
            echo json_encode([
                "success" => false,
                "message" => "Expiration date is required for FIFO stock tracking"
            ]);
            return;
        }
        
        // Get current product details (NO quantity column)
        $productStmt = $conn->prepare("SELECT product_name FROM tbl_product WHERE product_id = ?");
        $productStmt->execute([$product_id]);
        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode([
                "success" => false,
                "message" => "Product not found"
            ]);
            return;
        }
        
        // Get old quantity from tbl_fifo_stock instead
        $oldQtyStmt = $conn->prepare("
            SELECT COALESCE(SUM(available_quantity), 0) as total_quantity
            FROM tbl_fifo_stock
            WHERE product_id = ?
        ");
        $oldQtyStmt->execute([$product_id]);
        $old_quantity = $oldQtyStmt->fetchColumn();
        $quantity_change = $new_quantity - $old_quantity;
        
        // NO LONGER UPDATE tbl_product.quantity - it doesn't exist anymore!
        // Instead, create NEW FIFO batch entry if quantity is being added
        
        if ($quantity_change > 0) {
            // Creating/adding quantity - create new FIFO batch
            $batch_ref = $batch_reference ?: "MANUAL-ADD-" . time();
            
            // Create batch record
            $createBatchStmt = $conn->prepare("
                INSERT INTO tbl_batch (batch, batch_reference, expiration_date, location_id, entry_date, entry_by)
                VALUES (?, ?, ?, (SELECT location_id FROM tbl_product WHERE product_id = ? LIMIT 1), CURDATE(), ?)
            ");
            $createBatchStmt->execute([$batch_ref, $batch_ref, $expiration_date, $product_id, $entry_by]);
            $batch_id_for_movement = $conn->lastInsertId();
            
            // Create FIFO stock entry
            $fifoStmt = $conn->prepare("
                INSERT INTO tbl_fifo_stock (
                    product_id, batch_id, batch_reference, quantity, available_quantity,
                    srp, expiration_date, entry_date, entry_by, location_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, (SELECT location_id FROM tbl_product WHERE product_id = ? LIMIT 1))
            ");
            $fifoStmt->execute([
                $product_id, 
                $batch_id_for_movement, 
                $batch_ref, 
                $quantity_change, 
                $quantity_change,
                $new_srp, 
                $expiration_date, 
                $entry_by,
                $product_id
            ]);
        } else {
            // Reducing quantity - use existing batch
            $batchStmt = $conn->prepare("
                SELECT batch_id FROM tbl_batch 
                WHERE batch_id IN (
                    SELECT DISTINCT batch_id FROM tbl_fifo_stock WHERE product_id = ?
                )
                LIMIT 1
            ");
            $batchStmt->execute([$product_id]);
            $batch_id_for_movement = $batchStmt->fetchColumn();
            
            if (!$batch_id_for_movement) {
                echo json_encode([
                    "success" => false,
                    "message" => "Cannot reduce stock - no FIFO batches found"
                ]);
                return;
            }
        }
        
        // Log stock movement
        $movement_type = $quantity_change > 0 ? 'IN' : 'OUT';
        $logStmt = $conn->prepare("
            INSERT INTO tbl_stock_movements 
            (product_id, batch_id, movement_type, quantity, remaining_quantity, srp, 
             expiration_date, reference_no, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $logStmt->execute([
            $product_id,
            $batch_id_for_movement,
            $movement_type,
            abs($quantity_change),
            $new_quantity,
            $new_srp,
            $expiration_date,
            $batch_reference,
            "Manual stock adjustment: $old_quantity -> $new_quantity (change: $quantity_change)",
            $entry_by
        ]);
        
        echo json_encode([
            "success" => true,
            "message" => "Stock updated successfully",
            "data" => [
                "product_id" => $product_id,
                "product_name" => $product['product_name'],
                "old_quantity" => $old_quantity,
                "new_quantity" => $new_quantity,
                "change" => $quantity_change,
                "movement_type" => $movement_type
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error updating stock: " . $e->getMessage()
        ]);
    }
}

// Get all products
function get_products($conn, $data) {
    try {
        $location_id = $data['location_id'] ?? 0;
        $search = $data['search'] ?? '';
        
        $sql = "
            SELECT 
                p.product_id as id,
                p.product_name as name,
                c.category_name,
                p.barcode,
                p.description,
                COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
                COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as unit_price,
                COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp,
                p.prescription,
                p.bulk,
                p.expiration,
                p.status,
                p.location_id,
                l.location_name,
                COALESCE(b.brand, '') as brand,
                COALESCE(s.supplier_name, '') as supplier_name
            FROM tbl_product p
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            WHERE p.status = 'active'
        ";
        
        $params = [];
        
        if ($location_id > 0) {
            $sql .= " AND p.location_id = ?";
            $params[] = $location_id;
        }
        
        if (!empty($search)) {
            $sql .= " AND (p.product_name LIKE ? OR p.description LIKE ? OR c.category_name LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        $sql .= " ORDER BY p.product_name ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $products,
            "count" => count($products)
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error fetching products: " . $e->getMessage()
        ]);
    }
}

// Get product quantities
function get_product_quantities($conn, $data) {
    try {
        $location_id = $data['location_id'] ?? 0;
        
        $sql = "
            SELECT 
                p.product_id as id,
                p.product_name as name,
                COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
                c.category_name,
                p.barcode,
                CASE 
                    WHEN (SELECT COALESCE(SUM(fs.available_quantity), 0) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id) <= 0 THEN 'out of stock'
                    WHEN (SELECT COALESCE(SUM(fs.available_quantity), 0) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id) <= 10 THEN 'low stock'
                    ELSE 'in stock'
                END as stock_status
            FROM tbl_product p
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
                WHERE p.status = 'active'
        ";
        
        $params = [];
        
        if ($location_id > 0) {
            $sql .= " AND p.location_id = ?";
            $params[] = $location_id;
        }
        
        $sql .= " ORDER BY p.product_name ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $products,
            "count" => count($products)
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error fetching product quantities: " . $e->getMessage()
        ]);
    }
}

// Get expiring products
function get_expiring_products($conn, $data) {
    try {
        $days_threshold = $data['days_threshold'] ?? 30;
        $location_id = $data['location_id'] ?? 0;
        
        $sql = "
            SELECT 
                p.product_id as id,
                p.product_name as name,
                COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
                p.expiration,
                c.category_name,
                p.barcode,
                DATEDIFF(p.expiration, CURDATE()) as days_until_expiry
            FROM tbl_product p
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
                WHERE p.status = 'active' 
            AND p.expiration IS NOT NULL 
            AND DATEDIFF(p.expiration, CURDATE()) <= ?
            AND DATEDIFF(p.expiration, CURDATE()) >= 0
        ";
        
        $params = [$days_threshold];
        
        if ($location_id > 0) {
            $sql .= " AND p.location_id = ?";
            $params[] = $location_id;
        }
        
        $sql .= " ORDER BY p.expiration ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $products,
            "count" => count($products),
            "days_threshold" => $days_threshold
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error fetching expiring products: " . $e->getMessage()
        ]);
    }
}

// Get quantity history
function get_quantity_history($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        
        if (!$product_id) {
            echo json_encode([
                "success" => false,
                "message" => "Product ID is required"
            ]);
            return;
        }
        
        $sql = "
            SELECT 
                sm.id,
                sm.movement_type,
                sm.quantity,
                sm.remaining_quantity,
                sm.srp,
                sm.expiration_date,
                sm.reference_no,
                sm.notes,
                sm.created_by,
                sm.created_at,
                p.product_name
            FROM tbl_stock_movements sm
            LEFT JOIN tbl_product p ON sm.product_id = p.product_id
            WHERE sm.product_id = ?
            ORDER BY sm.created_at DESC
            LIMIT 50
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([$product_id]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $history,
            "count" => count($history)
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error fetching quantity history: " . $e->getMessage()
        ]);
    }
}

// Add quantity to existing product
function add_quantity_to_product($conn, $data) {
    try {
        $product_name = $data['product_name'] ?? '';
        $category = $data['category'] ?? '';
        $quantity = $data['quantity'] ?? 0;
        $unit_cost = $data['unit_cost'] ?? 0;
        $srp = $data['srp'] ?? 0;
        $expiration = $data['expiration'] ?? null;
        $batch_reference = $data['batch_reference'] ?? '';
        $entry_by = $data['entry_by'] ?? 'admin';
        
        if (empty($product_name) || $quantity <= 0) {
            echo json_encode([
                "success" => false,
                "message" => "Product name and valid quantity are required"
            ]);
            return;
        }
        
        // Find the product by name and category (NO quantity column)
        $productStmt = $conn->prepare("
            SELECT product_id, category_id
            FROM tbl_product 
            WHERE product_name = ? AND status = 'active'
            LIMIT 1
        ");
        $productStmt->execute([$product_name]);
        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode([
                "success" => false,
                "message" => "Product not found: $product_name"
            ]);
            return;
        }
        
        $product_id = $product['product_id'];
        
        // Get old quantity from tbl_fifo_stock instead
        $oldQtyStmt = $conn->prepare("
            SELECT COALESCE(SUM(available_quantity), 0) as total_quantity
            FROM tbl_fifo_stock
            WHERE product_id = ?
        ");
        $oldQtyStmt->execute([$product_id]);
        $old_quantity = $oldQtyStmt->fetchColumn();
        $new_quantity = $old_quantity + $quantity;
        
        // NO LONGER UPDATE tbl_product.quantity - create FIFO entry instead
        $batch_ref = $batch_reference ?: "STOCK-ADD-" . time();
        
        // Create batch record
        $createBatchStmt = $conn->prepare("
            INSERT INTO tbl_batch (batch, batch_reference, expiration_date, location_id, entry_date, entry_by)
            VALUES (?, ?, ?, (SELECT location_id FROM tbl_product WHERE product_id = ? LIMIT 1), CURDATE(), ?)
        ");
        $createBatchStmt->execute([$batch_ref, $batch_ref, $expiration, $product_id, $entry_by]);
        $batch_id_for_add = $conn->lastInsertId();
        
        // Create FIFO stock entry
        $fifoStmt = $conn->prepare("
            INSERT INTO tbl_fifo_stock (
                product_id, batch_id, batch_reference, quantity, available_quantity,
                srp, expiration_date, entry_date, entry_by, location_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, (SELECT location_id FROM tbl_product WHERE product_id = ? LIMIT 1))
        ");
        $fifoStmt->execute([
            $product_id, 
            $batch_id_for_add, 
            $batch_ref, 
            $quantity, 
            $quantity,
            $srp, 
            $expiration, 
            $entry_by,
            $product_id
        ]);
        
        // Log stock movement
        $logStmt = $conn->prepare("
            INSERT INTO tbl_stock_movements 
            (product_id, batch_id, movement_type, quantity, remaining_quantity, srp, 
             expiration_date, reference_no, notes, created_by)
            VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?)
        ");
        $logStmt->execute([
            $product_id,
            $batch_id_for_add,
            $quantity,
            $new_quantity,
            $srp,
            $expiration,
            $batch_reference,
            "Quantity added: $old_quantity -> $new_quantity",
            $entry_by
        ]);
        
        echo json_encode([
            "success" => true,
            "message" => "Quantity added successfully",
            "data" => [
                "product_id" => $product_id,
                "product_name" => $product_name,
                "old_quantity" => $old_quantity,
                "new_quantity" => $new_quantity,
                "added_quantity" => $quantity
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error adding quantity: " . $e->getMessage()
        ]);
    }
}

// Get suppliers
function get_suppliers($conn, $data) {
    try {
        $sql = "SELECT supplier_id, supplier_name, contact_person, phone, email, address, status FROM tbl_supplier WHERE status = 'active' ORDER BY supplier_name ASC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $suppliers,
            "count" => count($suppliers)
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error fetching suppliers: " . $e->getMessage()
        ]);
    }
}

// Add supplier
function add_supplier($conn, $data) {
    try {
        $supplier_name = $data['supplier_name'] ?? '';
        $contact_person = $data['contact_person'] ?? '';
        $phone = $data['phone'] ?? '';
        $email = $data['email'] ?? '';
        $address = $data['address'] ?? '';
        
        if (empty($supplier_name)) {
            echo json_encode([
                "success" => false,
                "message" => "Supplier name is required"
            ]);
            return;
        }
        // Check for duplicate supplier name
        $checkStmt = $conn->prepare("SELECT supplier_id FROM tbl_supplier WHERE supplier_name = ? AND status = 'active' LIMIT 1");
        $checkStmt->execute([$supplier_name]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            echo json_encode([
                "success" => false,
                "message" => "Supplier name already exists."
            ]);
            return;
        }
        $stmt = $conn->prepare("
            INSERT INTO tbl_supplier (supplier_name, contact_person, phone, email, address, status) 
            VALUES (?, ?, ?, ?, ?, 'active')
        ");
        $stmt->execute([$supplier_name, $contact_person, $phone, $email, $address]);
        
        $supplier_id = $conn->lastInsertId();
        
        echo json_encode([
            "success" => true,
            "message" => "Supplier added successfully",
            "data" => [
                "supplier_id" => $supplier_id,
                "supplier_name" => $supplier_name
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error adding supplier: " . $e->getMessage()
        ]);
    }
}

// Update supplier
function update_supplier($conn, $data) {
    try {
        $supplier_id = $data['supplier_id'] ?? 0;
        $supplier_name = $data['supplier_name'] ?? '';
        $contact_person = $data['contact_person'] ?? '';
        $phone = $data['phone'] ?? '';
        $email = $data['email'] ?? '';
        $address = $data['address'] ?? '';
        
        if (!$supplier_id || empty($supplier_name)) {
            echo json_encode([
                "success" => false,
                "message" => "Supplier ID and name are required"
            ]);
            return;
        }
        
        $stmt = $conn->prepare("
            UPDATE tbl_supplier 
            SET supplier_name = ?, contact_person = ?, phone = ?, email = ?, address = ?
            WHERE supplier_id = ?
        ");
        $stmt->execute([$supplier_name, $contact_person, $phone, $email, $address, $supplier_id]);
        
        echo json_encode([
            "success" => true,
            "message" => "Supplier updated successfully"
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error updating supplier: " . $e->getMessage()
        ]);
    }
}

// Delete supplier
function delete_supplier($conn, $data) {
    try {
        $supplier_id = $data['supplier_id'] ?? 0;
        $reason = $data['reason'] ?? 'Deleted from warehouse management';
        
        if (!$supplier_id) {
            echo json_encode([
                "success" => false,
                "message" => "Supplier ID is required"
            ]);
            return;
        }
        
        $stmt = $conn->prepare("UPDATE tbl_supplier SET status = 'inactive' WHERE supplier_id = ?");
        $stmt->execute([$supplier_id]);
        
        echo json_encode([
            "success" => true,
            "message" => "Supplier deleted successfully"
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error deleting supplier: " . $e->getMessage()
        ]);
    }
}

// Get brands
function get_brands($conn, $data) {
    try {
        $sql = "SELECT brand_id, brand FROM tbl_brand ORDER BY brand ASC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $brands = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $brands,
            "count" => count($brands)
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error fetching brands: " . $e->getMessage()
        ]);
    }
}

// Add brand
function add_brand($conn, $data) {
    try {
        $brand_name = $data['brand_name'] ?? '';
        
        if (empty($brand_name)) {
            echo json_encode([
                "success" => false,
                "message" => "Brand name is required"
            ]);
            return;
        }
        
        // Check if brand already exists
        $checkStmt = $conn->prepare("SELECT brand_id FROM tbl_brand WHERE brand = ?");
        $checkStmt->execute([$brand_name]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            echo json_encode([
                "success" => true,
                "message" => "Brand already exists",
                "data" => [
                    "brand_id" => $existing['brand_id'],
                    "brand_name" => $brand_name,
                    "exists" => true
                ]
            ]);
            return;
        }
        
        $stmt = $conn->prepare("INSERT INTO tbl_brand (brand) VALUES (?)");
        $stmt->execute([$brand_name]);
        
        $brand_id = $conn->lastInsertId();
        
        echo json_encode([
            "success" => true,
            "message" => "Brand added successfully",
            "data" => [
                "brand_id" => $brand_id,
                "brand_name" => $brand_name,
                "exists" => false
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error adding brand: " . $e->getMessage()
        ]);
    }
}

// Get categories
function get_categories($conn, $data) {
    try {
        $sql = "SELECT DISTINCT category FROM tbl_product WHERE status = 'active' AND category IS NOT NULL AND category != '' ORDER BY category ASC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo json_encode([
            "success" => true,
            "data" => $categories,
            "count" => count($categories)
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error fetching categories: " . $e->getMessage()
        ]);
    }
}

// Add product
function add_product($conn, $data) {
    try {
        $product_name = $data['product_name'] ?? '';
        $category = $data['category'] ?? '';
        $barcode = $data['barcode'] ?? '';
        $description = $data['description'] ?? '';
        $quantity = $data['quantity'] ?? 0;
        $unit_price = $data['unit_price'] ?? 0;
        $srp = $data['srp'] ?? 0;
        $location_id = $data['location_id'] ?? 1;
        $brand_id = $data['brand_id'] ?? null;
        $supplier_id = $data['supplier_id'] ?? null;
        $expiration = $data['expiration'] ?? null;
        $prescription = $data['prescription'] ?? 'no';
        $bulk = $data['bulk'] ?? 'no';
        
        if (empty($product_name)) {
            echo json_encode([
                "success" => false,
                "message" => "Product name is required"
            ]);
            return;
        }
        
        $stmt = $conn->prepare("
            INSERT INTO tbl_product 
            (product_name, category, barcode, description, quantity, unit_price, srp, 
             location_id, brand_id, supplier_id, expiration, prescription, bulk, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ");
        $stmt->execute([
            $product_name, $category, $barcode, $description, $quantity, $unit_price, $srp,
            $location_id, $brand_id, $supplier_id, $expiration, $prescription, $bulk
        ]);
        
        $product_id = $conn->lastInsertId();
        
        echo json_encode([
            "success" => true,
            "message" => "Product added successfully",
            "data" => [
                "product_id" => $product_id,
                "product_name" => $product_name
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error adding product: " . $e->getMessage()
        ]);
    }
}

// Update product
function update_product($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $product_name = $data['product_name'] ?? '';
        $category = $data['category'] ?? '';
        $barcode = $data['barcode'] ?? '';
        $description = $data['description'] ?? '';
        $unit_price = $data['unit_price'] ?? 0;
        $srp = $data['srp'] ?? 0;
        $brand_id = $data['brand_id'] ?? null;
        $supplier_id = $data['supplier_id'] ?? null;
        $expiration = $data['expiration'] ?? null;
        $prescription = $data['prescription'] ?? 'no';
        $bulk = $data['bulk'] ?? 'no';
        
        if (!$product_id || empty($product_name)) {
            echo json_encode([
                "success" => false,
                "message" => "Product ID and name are required"
            ]);
            return;
        }
        
        $stmt = $conn->prepare("
            UPDATE tbl_product 
            SET product_name = ?, category = ?, barcode = ?, description = ?, 
                unit_price = ?, srp = ?, brand_id = ?, supplier_id = ?, 
                expiration = ?, prescription = ?, bulk = ?
            WHERE product_id = ?
        ");
        $stmt->execute([
            $product_name, $category, $barcode, $description, $unit_price, $srp,
            $brand_id, $supplier_id, $expiration, $prescription, $bulk, $product_id
        ]);
        
        echo json_encode([
            "success" => true,
            "message" => "Product updated successfully"
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error updating product: " . $e->getMessage()
        ]);
    }
}

// Delete product
function delete_product($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $reason = $data['reason'] ?? 'Deleted from warehouse management';
        
        if (!$product_id) {
            echo json_encode([
                "success" => false,
                "message" => "Product ID is required"
            ]);
            return;
        }
        
        $stmt = $conn->prepare("UPDATE tbl_product SET status = 'inactive' WHERE product_id = ?");
        $stmt->execute([$product_id]);
        
        echo json_encode([
            "success" => true,
            "message" => "Product deleted successfully"
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error deleting product: " . $e->getMessage()
        ]);
    }
}

// Log activity
function log_activity($conn, $data) {
    try {
        $activity_type = $data['activity_type'] ?? '';
        $description = $data['description'] ?? '';
        $user_id = $data['user_id'] ?? 0;
        $created_by = $data['created_by'] ?? 'system';
        
        if (empty($activity_type) || empty($description)) {
            echo json_encode([
                "success" => false,
                "message" => "Activity type and description are required"
            ]);
            return;
        }
        
        // Check if activity log table exists, if not create it
        $createTableStmt = $conn->prepare("
            CREATE TABLE IF NOT EXISTS tbl_activity_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                activity_type VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                user_id INT DEFAULT 0,
                created_by VARCHAR(100) DEFAULT 'system',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");
        $createTableStmt->execute();
        
        $stmt = $conn->prepare("
            INSERT INTO tbl_activity_log (activity_type, description, user_id, created_by) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$activity_type, $description, $user_id, $created_by]);
        
        echo json_encode([
            "success" => true,
            "message" => "Activity logged successfully"
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error logging activity: " . $e->getMessage()
        ]);
    }
}
// Inventory KPIs handler
function handle_get_inventory_kpis($conn, $data) {
    try {
        // Optionally filter by location
        $location_id = $data['location_id'] ?? null;
        $where = "WHERE status = 'active'";
        $params = [];
        if ($location_id) {
            $where .= " AND location_id = ?";
            $params[] = $location_id;
        }

        // Total products
        $stmtTotal = $conn->prepare("SELECT COUNT(*) as total_products FROM tbl_product $where");
        $stmtTotal->execute($params);
        $total_products = $stmtTotal->fetchColumn();

        // Out-of-stock products using FIFO stock
        $stmtOut = $conn->prepare("
            SELECT COUNT(DISTINCT p.product_id) as out_of_stock 
            FROM tbl_product p 
            $where 
            AND p.product_id NOT IN (
                SELECT DISTINCT product_id 
                FROM tbl_fifo_stock 
                WHERE available_quantity > 0
            )
        ");
        $stmtOut->execute($params);
        $out_of_stock = $stmtOut->fetchColumn();

        // Low-stock products using FIFO stock
        $stmtLow = $conn->prepare("
            SELECT COUNT(DISTINCT p.product_id) as low_stock 
            FROM tbl_product p 
            $where 
            AND (
                SELECT COALESCE(SUM(available_quantity), 0) 
                FROM tbl_fifo_stock fs 
                WHERE fs.product_id = p.product_id
            ) BETWEEN 1 AND 10
        ");
        $stmtLow->execute($params);
        $low_stock = $stmtLow->fetchColumn();

        // Total quantity from FIFO stock
        $stmtQty = $conn->prepare("
            SELECT COALESCE(SUM(fs.available_quantity), 0) as total_quantity 
            FROM tbl_product p
            LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
            $where
        ");
        $stmtQty->execute($params);
        $total_quantity = $stmtQty->fetchColumn();

        echo json_encode([
            "success" => true,
            "kpis" => [
                "total_products" => (int)$total_products,
                "out_of_stock" => (int)$out_of_stock,
                "low_stock" => (int)$low_stock,
                "total_quantity" => (int)$total_quantity
            ]
        ]);
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error fetching inventory KPIs: " . $e->getMessage()
        ]);
    }
}

// Wrapper for backend_new.php compatibility
function handle_add_product($conn, $data) {
    add_product($conn, $data);
}

?>
