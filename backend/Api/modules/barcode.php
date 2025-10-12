<?php
// Barcode Management Functions
// This file contains all barcode-related backend functions

function check_barcode($conn, $data) {
    try {
        $barcode = $data['barcode'] ?? '';
        $location_id = $data['location_id'] ?? null;
        $location_name = $data['location_name'] ?? '';
        
        if (empty($barcode)) {
            return [
                "success" => false,
                "message" => "Barcode is required"
            ];
        }
        
        // Build the query to find product by barcode
        $sql = "
            SELECT 
                p.product_id,
                p.product_name,
                p.category_id,
                c.category_name as category,
                p.barcode,
                p.description,
                COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
                COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp,
                p.prescription,
                p.bulk,
                p.expiration,
                p.status,
                p.location_id,
                l.location_name,
                p.brand_id,
                COALESCE(b.brand, '') as brand,
                p.supplier_id,
                COALESCE(s.supplier_name, '') as supplier_name
            FROM tbl_product p
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
            LEFT JOIN tbl_location l ON p.location_id = l.location_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            WHERE p.barcode = ? AND p.status = 'active'
        ";
        
        $params = [$barcode];
        
        // Add location filter if provided
        if ($location_id) {
            $sql .= " AND p.location_id = ?";
            $params[] = $location_id;
        } elseif (!empty($location_name)) {
            $sql .= " AND l.location_name = ?";
            $params[] = $location_name;
        }
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($product) {
            return [
                "success" => true,
                "found" => true,
                "product" => $product,
                "message" => "Product found"
            ];
        } else {
            return [
                "success" => false,
                "found" => false,
                "product" => null,
                "message" => "Product not found with barcode: $barcode"
            ];
        }
        
    } catch (Exception $e) {
        return [
            "success" => false,
            "message" => "Error checking barcode: " . $e->getMessage()
        ];
    }
}
?>
