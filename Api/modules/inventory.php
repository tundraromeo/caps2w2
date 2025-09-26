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
        
        // Build the query to get all products in the specified location
        $sql = "
            SELECT 
                p.product_id as id,
                p.product_name as name,
                p.category,
                p.barcode,
                p.description,
                p.quantity,
                p.unit_price,
                p.srp,
                p.prescription,
                p.bulk,
                p.expiration,
                p.status,
                p.location_id,
                l.location_name,
                COALESCE(b.brand, '') as brand,
                COALESCE(s.supplier_name, '') as supplier_name,
                CASE 
                    WHEN p.quantity <= 0 THEN 'out of stock'
                    WHEN p.quantity <= 10 THEN 'low stock'
                    ELSE 'in stock'
                END as stock_status
            FROM tbl_product p
            LEFT JOIN tbl_location l ON p.location_id = l.location_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            WHERE p.location_id = ? AND p.status = 'active'
        ";
        
        $params = [$location_id];
        
        // Add search filter if provided
        if (!empty($search)) {
            $sql .= " AND (p.product_name LIKE ? OR p.description LIKE ? OR p.category LIKE ?)";
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
            SELECT product_name, quantity, location_id, location_name 
            FROM tbl_product p
            LEFT JOIN tbl_location l ON p.location_id = l.location_id
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
        
        $current_qty = $product['quantity'];
        $new_qty = max(0, $current_qty - $quantity_to_reduce);
        
        // Update product quantity
        $updateStmt = $conn->prepare("UPDATE tbl_product SET quantity = ? WHERE product_id = ?");
        $updateStmt->execute([$new_qty, $product_id]);
        
        // Log stock movement
        $logStmt = $conn->prepare("
            INSERT INTO tbl_stock_movements 
            (product_id, batch_id, movement_type, quantity, remaining_quantity, unit_cost, 
             expiration_date, reference_no, notes, created_by)
            VALUES (?, 0, 'OUT', ?, ?, 0.00, NULL, ?, ?, ?)
        ");
        $logStmt->execute([
            $product_id,
            $quantity_to_reduce,
            $new_qty,
            $transaction_id,
            "POS Sale - Reduced by $quantity_to_reduce units",
            $entry_by
        ]);
        
        echo json_encode([
            "success" => true,
            "message" => "Stock updated successfully",
            "data" => [
                "product_id" => $product_id,
                "product_name" => $product['product_name'],
                "old_quantity" => $current_qty,
                "new_quantity" => $new_qty,
                "reduced_by" => $quantity_to_reduce,
                "stock_type" => "POS Sale",
                "location_name" => $product['location_name']
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
        
        if (!$product_id || $new_quantity < 0) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID or quantity"
            ]);
            return;
        }
        
        // Get current product details
        $productStmt = $conn->prepare("SELECT product_name, quantity FROM tbl_product WHERE product_id = ?");
        $productStmt->execute([$product_id]);
        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode([
                "success" => false,
                "message" => "Product not found"
            ]);
            return;
        }
        
        $old_quantity = $product['quantity'];
        $quantity_change = $new_quantity - $old_quantity;
        
        // Update product quantity
        $updateStmt = $conn->prepare("UPDATE tbl_product SET quantity = ? WHERE product_id = ?");
        $updateStmt->execute([$new_quantity, $product_id]);
        
        // Log stock movement
        $movement_type = $quantity_change > 0 ? 'IN' : 'OUT';
        $logStmt = $conn->prepare("
            INSERT INTO tbl_stock_movements 
            (product_id, batch_id, movement_type, quantity, remaining_quantity, unit_cost, 
             expiration_date, reference_no, notes, created_by)
            VALUES (?, 0, ?, ?, ?, 0.00, ?, ?, ?, ?)
        ");
        $logStmt->execute([
            $product_id,
            $movement_type,
            abs($quantity_change),
            $new_quantity,
            $expiration_date,
            $batch_reference,
            "Manual stock adjustment: $old_quantity -> $new_quantity",
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
?>
