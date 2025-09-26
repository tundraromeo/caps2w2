<?php
// Simple test script to generate a report and populate tbl_report_dtl
require_once 'Api/conn_mysqli.php';

echo "Starting report generation test...\n";

// Test data
$report_type = 'inventory_summary';
$generated_by = 'admin';
$parameters = [];

// Create report header
$report_title = ucwords(str_replace('_', ' ', $report_type)) . ' Report';
$file_format = 'PDF';
$file_size = round(rand(10, 50) / 10, 1); // Random file size between 1.0-5.0 MB

$stmt = $conn->prepare("
    INSERT INTO tbl_report_header 
    (report_title, report_type, generated_by, generation_date, generation_time, 
     status, file_format, file_size, description, parameters)
    VALUES (?, ?, ?, CURDATE(), CURTIME(), 'Completed', ?, ?, ?, ?)
");

if ($stmt) {
    $stmt->bind_param("ssssss", 
        $report_title,
        $report_type,
        $generated_by,
        $file_format,
        $file_size,
        "Generated " . $report_type . " report on " . date('Y-m-d H:i:s'),
        json_encode($parameters)
    );
    
    if ($stmt->execute()) {
        $report_id = $conn->insert_id;
        echo "Created report header with ID: " . $report_id . "\n";
        
        // Generate report details - get some products from tbl_product
        $detail_stmt = $conn->prepare("
            SELECT 
                p.product_id, p.product_name, p.barcode, p.category,
                p.quantity, p.unit_price, (p.quantity * p.unit_price) as total_value,
                l.location_name, s.supplier_name, b.brand, p.expiration
            FROM tbl_product p
            LEFT JOIN tbl_location l ON p.location_id = l.location_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            WHERE (p.status IS NULL OR p.status <> 'archived')
            ORDER BY p.product_name
            LIMIT 10
        ");
        
        if ($detail_stmt) {
            $detail_stmt->execute();
            $result = $detail_stmt->get_result();
            $report_details = $result->fetch_all(MYSQLI_ASSOC);
            
            echo "Found " . count($report_details) . " products for report\n";
            
            // Insert report details
            if (!empty($report_details)) {
                $insert_stmt = $conn->prepare("
                    INSERT INTO tbl_report_dtl 
                    (report_id, product_id, product_name, barcode, category, quantity, 
                     unit_price, total_value, movement_type, reference_no, date, time, 
                     location_name, supplier_name, brand, expiration_date, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                if ($insert_stmt) {
                    $insert_stmt->bind_param("iisisddsssssssss", 
                        $report_id,
                        $product_id,
                        $product_name,
                        $barcode,
                        $category,
                        $quantity,
                        $unit_price,
                        $total_value,
                        $movement_type,
                        $reference_no,
                        $date,
                        $time,
                        $location_name,
                        $supplier_name,
                        $brand,
                        $expiration_date,
                        $notes
                    );
                    
                    $count = 0;
                    foreach ($report_details as $detail) {
                        $product_id = $detail['product_id'] ?? null;
                        $product_name = $detail['product_name'] ?? null;
                        $barcode = $detail['barcode'] ?? null;
                        $category = $detail['category'] ?? null;
                        $quantity = $detail['quantity'] ?? null;
                        $unit_price = $detail['unit_price'] ?? null;
                        $total_value = $detail['total_value'] ?? null;
                        $movement_type = 'IN';
                        $reference_no = 'TEST-' . date('Ymd-His');
                        $date = date('Y-m-d');
                        $time = date('H:i:s');
                        $location_name = $detail['location_name'] ?? null;
                        $supplier_name = $detail['supplier_name'] ?? null;
                        $brand = $detail['brand'] ?? null;
                        $expiration_date = $detail['expiration'] ?? null;
                        $notes = 'Test report generated';
                        
                        if ($insert_stmt->execute()) {
                            $count++;
                        }
                    }
                    
                    echo "Inserted " . $count . " report details\n";
                } else {
                    echo "Error preparing insert statement: " . $conn->error . "\n";
                }
            }
        } else {
            echo "Error preparing detail query: " . $conn->error . "\n";
        }
        
        echo "Report generated successfully!\n";
        echo "Report ID: " . $report_id . "\n";
        echo "Total details: " . count($report_details) . "\n";
        
    } else {
        echo "Error executing header insert: " . $stmt->error . "\n";
    }
} else {
    echo "Error preparing header statement: " . $conn->error . "\n";
}

// Check final count
$count_stmt = $conn->prepare("SELECT COUNT(*) as total FROM tbl_report_dtl");
if ($count_stmt) {
    $count_stmt->execute();
    $result = $count_stmt->get_result();
    $row = $result->fetch_assoc();
    echo "Total records in tbl_report_dtl: " . $row['total'] . "\n";
}

$conn->close();
?>
