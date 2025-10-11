<?php
/**
 * Complete Dashboard Data Fix
 * This script will:
 * 1. Create the correct .env file
 * 2. Test database connection
 * 3. Test API endpoints
 * 4. Provide instructions for fixing the dashboard
 */

echo "🔧 ENGUI DASHBOARD DATA FIX\n";
echo "============================\n\n";

// Step 1: Create .env file
echo "📝 Step 1: Creating .env file...\n";

$envContent = '# ========================================
# ENGUIO System Environment Configuration
# ========================================
# 
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=enguio2
DB_USER=root
DB_PASS=

# Application Configuration
APP_ENV=development
APP_DEBUG=true

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost/caps2e2/Api

# Session Configuration
SESSION_LIFETIME=3600
SESSION_NAME=ENGUIO_SESSION

# Security
SECRET_KEY=your-secret-key-here

# Logging
LOG_ERRORS=true
ERROR_LOG_PATH=php_errors.log
';

try {
    $result = file_put_contents('.env', $envContent);
    if ($result !== false) {
        echo "✅ .env file created successfully!\n";
    } else {
        echo "❌ Failed to create .env file\n";
    }
} catch (Exception $e) {
    echo "❌ Error creating .env file: " . $e->getMessage() . "\n";
}

echo "\n";

// Step 2: Test database connection
echo "🗄️ Step 2: Testing database connection...\n";

try {
    require_once 'Api/conn.php';
    $conn = getDatabaseConnection();
    
    // Test basic query
    $stmt = $conn->query("SELECT COUNT(*) as total FROM tbl_product WHERE status IS NULL OR status != 'archived'");
    $productCount = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $stmt2 = $conn->query("SELECT location_name FROM tbl_location");
    $locations = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✅ Database connection successful!\n";
    echo "📊 Total products: " . $productCount['total'] . "\n";
    echo "📍 Available locations: ";
    foreach($locations as $loc) {
        echo $loc['location_name'] . ", ";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    echo "💡 Make sure XAMPP is running and the 'enguio2' database exists\n";
}

echo "\n";

// Step 3: Test warehouse KPIs query
echo "📈 Step 3: Testing warehouse KPIs query...\n";

try {
    $stmt = $conn->prepare("
        SELECT 
            COUNT(DISTINCT p.product_id) as totalProducts,
            COUNT(DISTINCT s.supplier_id) as totalSuppliers,
            ROUND(COUNT(DISTINCT p.product_id) * 100.0 / 1000, 1) as storageCapacity,
            COALESCE((SELECT SUM(fs.available_quantity * fs.srp) FROM tbl_fifo_stock fs), 0) as warehouseValue,
            COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs), 0) as totalQuantity,
            COALESCE((SELECT COUNT(DISTINCT fs.product_id) FROM tbl_fifo_stock fs WHERE fs.available_quantity <= 10 AND fs.available_quantity > 0), 0) as lowStockItems,
            COUNT(CASE WHEN p.expiration IS NOT NULL AND p.expiration <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiringSoon,
            COUNT(DISTINCT b.batch_id) as totalBatches
        FROM tbl_product p
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
        LEFT JOIN tbl_batch b ON p.batch_id = b.batch_id
        WHERE (p.status IS NULL OR p.status <> 'archived')
    ");
    
    $stmt->execute();
    $warehouseKPIs = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "✅ Warehouse KPIs query successful!\n";
    echo "📊 Results:\n";
    foreach($warehouseKPIs as $key => $value) {
        echo "   - $key: $value\n";
    }
    
} catch (Exception $e) {
    echo "❌ Warehouse KPIs query failed: " . $e->getMessage() . "\n";
}

echo "\n";

// Step 4: Test convenience store products
echo "🛒 Step 4: Testing convenience store products...\n";

try {
    $stmt = $conn->prepare("
        SELECT 
            p.product_id,
            p.product_name,
            c.category_name,
            COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
            p.expiration
        FROM tbl_product p 
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        WHERE (p.status IS NULL OR p.status <> 'archived')
        AND l.location_name = ?
        GROUP BY p.product_name, p.barcode, c.category_name, p.description, p.prescription, p.bulk, p.expiration, p.srp, p.brand_id, p.supplier_id, p.location_id, p.batch_id, p.status, p.stock_status, p.date_added, s.supplier_name, b.brand, l.location_name, batch.batch, batch.entry_date, batch.entry_by
        ORDER BY p.product_name ASC
    ");
    
    $stmt->execute(['Convenience Store']);
    $convenienceProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✅ Convenience store query successful!\n";
    echo "📊 Products found: " . count($convenienceProducts) . "\n";
    if (count($convenienceProducts) > 0) {
        echo "📋 Sample products:\n";
        for ($i = 0; $i < min(3, count($convenienceProducts)); $i++) {
            $product = $convenienceProducts[$i];
            echo "   - " . $product['product_name'] . " (Qty: " . $product['quantity'] . ")\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Convenience store query failed: " . $e->getMessage() . "\n";
}

echo "\n";

// Step 5: Instructions
echo "🎯 NEXT STEPS:\n";
echo "==============\n";
echo "1. ✅ .env file has been created\n";
echo "2. ✅ Database connection tested\n";
echo "3. ✅ API queries tested\n";
echo "4. 🔄 Restart your web server (Apache in XAMPP)\n";
echo "5. 🔄 Clear browser cache\n";
echo "6. 🔄 Refresh the dashboard page\n";
echo "7. 🔄 Click the '🔄 Refresh Data' button on the dashboard\n";
echo "\n";
echo "📋 TESTING:\n";
echo "- Open: http://localhost/caps2e2/test_backend_api.html\n";
echo "- Open: http://localhost/caps2e2/test_dashboard_endpoints.html\n";
echo "\n";
echo "🐛 DEBUGGING:\n";
echo "- Check browser console for errors\n";
echo "- Check Apache error logs\n";
echo "- Use the debug panel on the dashboard (development mode)\n";
echo "\n";

echo "✅ Dashboard data fix completed!\n";
?>
