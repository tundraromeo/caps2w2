<?php
/**
 * Dynamic Unit System
 * Generates units based on Configuration Mode inputs
 */

require_once 'Api/conn.php';

/**
 * Generate units based on configuration inputs
 */
function generateUnitsFromConfig($product_id, $config) {
    $conn = getDatabaseConnection();
    
    // Extract configuration
    $boxes = intval($config['boxes']) ?? 1;
    $strips_per_box = intval($config['strips_per_box']) ?? 10;
    $tablets_per_strip = intval($config['tablets_per_strip']) ?? 10;
    $base_price = floatval($config['base_price']) ?? 7.00; // Price per tablet
    
    // Calculate totals
    $total_tablets_per_box = $strips_per_box * $tablets_per_strip;
    $total_tablets = $boxes * $total_tablets_per_box;
    
    try {
        $conn->beginTransaction();
        
        // Clear existing units for this product
        $deleteStmt = $conn->prepare("DELETE FROM tbl_product_units WHERE product_id = ?");
        $deleteStmt->execute([$product_id]);
        
        // Generate units dynamically
        $units = [];
        
        // 1. Base unit (individual tablet)
        $units[] = [
            'unit_name' => 'tablet',
            'unit_quantity' => 1,
            'unit_price' => $base_price,
            'is_base_unit' => 1,
            'description' => 'Individual tablet'
        ];
        
        // 2. Strip unit
        $strip_price = $tablets_per_strip * $base_price * 0.9; // 10% discount
        $units[] = [
            'unit_name' => "strip ({$tablets_per_strip} tablets)",
            'unit_quantity' => $tablets_per_strip,
            'unit_price' => $strip_price,
            'is_base_unit' => 0,
            'description' => "{$tablets_per_strip} tablets per strip - Save ₱" . number_format(($tablets_per_strip * $base_price) - $strip_price, 2)
        ];
        
        // 3. Box units (different sizes if needed)
        if ($boxes >= 1) {
            // Small box (1 box)
            $box_price = $total_tablets_per_box * $base_price * 0.85; // 15% discount
            $units[] = [
                'unit_name' => "box ({$strips_per_box} strips)",
                'unit_quantity' => $total_tablets_per_box,
                'unit_price' => $box_price,
                'is_base_unit' => 0,
                'description' => "{$strips_per_box} strips = {$total_tablets_per_box} tablets - Save ₱" . number_format(($total_tablets_per_box * $base_price) - $box_price, 2)
            ];
        }
        
        // 4. Multiple box sizes (if boxes > 1)
        if ($boxes > 1) {
            // Medium box (half of total boxes)
            $medium_boxes = ceil($boxes / 2);
            $medium_total = $medium_boxes * $total_tablets_per_box;
            $medium_price = $medium_total * $base_price * 0.8; // 20% discount
            $units[] = [
                'unit_name' => "medium pack ({$medium_boxes} boxes)",
                'unit_quantity' => $medium_total,
                'unit_price' => $medium_price,
                'is_base_unit' => 0,
                'description' => "{$medium_boxes} boxes = {$medium_total} tablets - Save ₱" . number_format(($medium_total * $base_price) - $medium_price, 2)
            ];
            
            // Large box (full quantity)
            $large_price = $total_tablets * $base_price * 0.75; // 25% discount
            $units[] = [
                'unit_name' => "large pack ({$boxes} boxes)",
                'unit_quantity' => $total_tablets,
                'unit_price' => $large_price,
                'is_base_unit' => 0,
                'description' => "{$boxes} boxes = {$total_tablets} tablets - Save ₱" . number_format(($total_tablets * $base_price) - $large_price, 2)
            ];
        }
        
        // 5. Promotional units
        // Buy 2 strips get 1 free
        $promo_quantity = ($tablets_per_strip * 2) + $tablets_per_strip; // 2 strips + 1 free
        $promo_price = ($tablets_per_strip * 2) * $base_price * 0.9; // Pay for 2 strips only
        $units[] = [
            'unit_name' => "buy 2 get 1 free",
            'unit_quantity' => $promo_quantity,
            'unit_price' => $promo_price,
            'is_base_unit' => 0,
            'description' => "Buy 2 strips, get 1 free ({$promo_quantity} tablets total)"
        ];
        
        // Insert all units
        $insertStmt = $conn->prepare("
            INSERT INTO tbl_product_units 
            (product_id, unit_name, unit_quantity, unit_price, is_base_unit, unit_description) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($units as $unit) {
            $insertStmt->execute([
                $product_id,
                $unit['unit_name'],
                $unit['unit_quantity'],
                $unit['unit_price'],
                $unit['is_base_unit'],
                $unit['description']
            ]);
        }
        
        $conn->commit();
        
        return [
            'success' => true,
            'message' => 'Units generated successfully',
            'units' => $units,
            'config' => [
                'boxes' => $boxes,
                'strips_per_box' => $strips_per_box,
                'tablets_per_strip' => $tablets_per_strip,
                'total_tablets' => $total_tablets
            ]
        ];
        
    } catch (Exception $e) {
        $conn->rollBack();
        return [
            'success' => false,
            'message' => 'Error generating units: ' . $e->getMessage()
        ];
    }
}

// Example usage
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($input['action'] === 'generate_units_from_config') {
        $result = generateUnitsFromConfig(
            $input['product_id'],
            $input['config']
        );
        
        header('Content-Type: application/json');
        echo json_encode($result);
    }
}

// Test function
function testDynamicGeneration() {
    echo "=== TESTING DYNAMIC UNIT GENERATION ===\n";
    
    // Test configuration 1: Standard (10 strips, 10 tablets)
    echo "\nTest 1: Standard Configuration\n";
    $config1 = [
        'boxes' => 1,
        'strips_per_box' => 10,
        'tablets_per_strip' => 10,
        'base_price' => 7.00
    ];
    
    $result1 = generateUnitsFromConfig(155, $config1);
    if ($result1['success']) {
        echo "✅ Generated units for standard config:\n";
        foreach ($result1['units'] as $unit) {
            echo "  - {$unit['unit_name']}: {$unit['unit_quantity']} tablets = ₱{$unit['unit_price']}\n";
        }
    }
    
    // Test configuration 2: Different (9 strips, 12 tablets)
    echo "\nTest 2: Different Configuration\n";
    $config2 = [
        'boxes' => 2,
        'strips_per_box' => 9,
        'tablets_per_strip' => 12,
        'base_price' => 7.00
    ];
    
    $result2 = generateUnitsFromConfig(155, $config2);
    if ($result2['success']) {
        echo "✅ Generated units for different config:\n";
        foreach ($result2['units'] as $unit) {
            echo "  - {$unit['unit_name']}: {$unit['unit_quantity']} tablets = ₱{$unit['unit_price']}\n";
        }
    }
}

// Uncomment to test
// testDynamicGeneration();
?>

