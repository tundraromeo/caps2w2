<?php
/**
 * Reports Module
 * Handles all report-related functionality for the admin system
 */

class ReportsModule {
    private $conn;
    
    public function __construct($connection) {
        $this->conn = $connection;
    }
    
    /**
     * Get report data based on report type
     */
    public function getReportData($reportType, $startDate, $endDate, $checkForUpdates = false) {
        $reportData = [];
        $hasNewData = false;
        
        switch ($reportType) {
            case 'all':
                // Return all available reports for the Reports.js component
                return $this->getAllReports($startDate, $endDate);
                
            case 'stock_in':
                $reportData = $this->getStockInReport($startDate, $endDate);
                break;
                
            case 'stock_out':
                $reportData = $this->getStockOutReport($startDate, $endDate);
                break;
                
            case 'sales':
                $reportData = $this->getSalesReport($startDate, $endDate, $checkForUpdates);
                $hasNewData = $this->checkForNewSalesData($startDate, $endDate);
                break;
                
            case 'inventory_balance':
                $reportData = $this->getInventoryBalanceReport();
                break;
                
            case 'stock_adjustment':
                $reportData = $this->getStockAdjustmentReport($startDate, $endDate);
                break;
                
            case 'supplier':
                $reportData = $this->getSupplierReport();
                break;
                
            case 'cashier_performance':
                $reportData = $this->getCashierPerformanceReport($startDate, $endDate, $checkForUpdates);
                $hasNewData = $this->checkForNewCashierData($startDate, $endDate);
                break;
                
            case 'login_logs':
                $reportData = $this->getLoginLogsReport($startDate, $endDate);
                break;
                
            default:
                $reportData = [];
        }
        
        return [
            'success' => true,
            'data' => $reportData,
            'has_new_data' => $hasNewData,
            'report_type' => $reportType,
            'date_range' => "$startDate to $endDate"
        ];
    }
    
    /**
     * Get all reports for the Reports.js component
     */
    private function getAllReports($startDate, $endDate) {
        try {
            // Get stock movements as reports
            $stmt = $this->conn->prepare("
                SELECT 
                    sm.movement_id,
                    CONCAT('Stock ', 
                        CASE sm.movement_type 
                            WHEN 'IN' THEN 'In Report'
                            WHEN 'OUT' THEN 'Out Report'
                            WHEN 'ADJUSTMENT' THEN 'Adjustment Report'
                            WHEN 'TRANSFER' THEN 'Transfer Report'
                            ELSE CONCAT(sm.movement_type, ' Report')
                        END
                    ) as title,
                    CASE sm.movement_type 
                        WHEN 'IN' THEN 'Stock In Report'
                        WHEN 'OUT' THEN 'Stock Out Report'
                        WHEN 'ADJUSTMENT' THEN 'Stock Adjustment Report'
                        WHEN 'TRANSFER' THEN 'Transfer Report'
                        ELSE CONCAT(sm.movement_type, ' Report')
                    END as type,
                    CONCAT('Report for ', p.product_name, ' - ', sm.movement_type, ' movement') as description,
                    COALESCE(sm.created_by, 'System') as generatedBy,
                    DATE(sm.movement_date) as date,
                    TIME(sm.movement_date) as time,
                    'Completed' as status,
                    'PDF' as format,
                    '2.5 MB' as fileSize
                FROM tbl_stock_movements sm
                JOIN tbl_product p ON sm.product_id = p.product_id
                WHERE DATE(sm.movement_date) BETWEEN ? AND ?
                ORDER BY sm.movement_date DESC
                LIMIT 50
            ");
            $stmt->execute([$startDate, $endDate]);
            $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get analytics data
            $analytics = $this->getAnalyticsData();
            
            // Get top categories
            $topCategories = $this->getTopCategories();
            
            return [
                'success' => true,
                'reports' => $reports,
                'analytics' => $analytics,
                'topCategories' => $topCategories,
                'has_new_data' => false,
                'report_type' => 'all',
                'date_range' => "$startDate to $endDate"
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching reports: ' . $e->getMessage(),
                'reports' => [],
                'analytics' => [
                    'totalProducts' => 0,
                    'lowStockItems' => 0,
                    'outOfStockItems' => 0,
                    'totalValue' => 0
                ],
                'topCategories' => []
            ];
        }
    }
    
    /**
     * Get analytics data for the dashboard
     */
    private function getAnalyticsData() {
        try {
            // Total products
            $stmt = $this->conn->prepare("SELECT COUNT(*) as total FROM tbl_product WHERE status IS NULL OR status <> 'archived'");
            $stmt->execute();
            $totalProducts = $stmt->fetch()['total'];
            
            // Low stock items (quantity <= 10)
            $stmt = $this->conn->prepare("SELECT COUNT(*) as total FROM tbl_product WHERE quantity <= 10 AND (status IS NULL OR status <> 'archived')");
            $stmt->execute();
            $lowStockItems = $stmt->fetch()['total'];
            
            // Out of stock items
            $stmt = $this->conn->prepare("SELECT COUNT(*) as total FROM tbl_product WHERE quantity = 0 AND (status IS NULL OR status <> 'archived')");
            $stmt->execute();
            $outOfStockItems = $stmt->fetch()['total'];
            
            // Total inventory value
            $stmt = $this->conn->prepare("SELECT COALESCE(SUM(quantity * unit_price), 0) as total FROM tbl_product WHERE status IS NULL OR status <> 'archived'");
            $stmt->execute();
            $totalValue = $stmt->fetch()['total'];
            
            return [
                'totalProducts' => (int)$totalProducts,
                'lowStockItems' => (int)$lowStockItems,
                'outOfStockItems' => (int)$outOfStockItems,
                'totalValue' => (float)$totalValue
            ];
            
        } catch (Exception $e) {
            return [
                'totalProducts' => 0,
                'lowStockItems' => 0,
                'outOfStockItems' => 0,
                'totalValue' => 0
            ];
        }
    }
    
    /**
     * Get top categories for the dashboard
     */
    private function getTopCategories() {
        try {
            $stmt = $this->conn->prepare("
                SELECT 
                    p.category as category_name,
                    COUNT(*) as product_count,
                    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbl_product WHERE status IS NULL OR status <> 'archived')), 1) as percentage
                FROM tbl_product p
                WHERE p.status IS NULL OR p.status <> 'archived'
                AND p.category IS NOT NULL AND p.category <> ''
                GROUP BY p.category
                ORDER BY product_count DESC
                LIMIT 6
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Get Stock In Report Data
     */
    private function getStockInReport($startDate, $endDate) {
        $stmt = $this->conn->prepare("
            SELECT 
                DATE(sm.movement_date) as date,
                TIME(sm.movement_date) as time,
                p.product_name,
                p.barcode,
                sm.quantity,
                sm.unit_cost as unit_price,
                (sm.quantity * sm.unit_cost) as total_value,
                s.supplier_name,
                sm.reference_no,
                sm.notes,
                sm.created_by as received_by
            FROM tbl_stock_movements sm
            JOIN tbl_product p ON sm.product_id = p.product_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            WHERE sm.movement_type = 'IN'
            AND DATE(sm.movement_date) BETWEEN ? AND ?
            ORDER BY sm.movement_date DESC
        ");
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get Stock Out Report Data
     */
    private function getStockOutReport($startDate, $endDate) {
        $stmt = $this->conn->prepare("
            SELECT 
                DATE(sm.movement_date) as date,
                TIME(sm.movement_date) as time,
                p.product_name,
                p.barcode,
                sm.quantity,
                sm.unit_cost as unit_price,
                (sm.quantity * sm.unit_cost) as total_value,
                sm.created_by as cashier,
                sm.reference_no,
                sm.notes as customer_info
            FROM tbl_stock_movements sm
            JOIN tbl_product p ON sm.product_id = p.product_id
            WHERE sm.movement_type = 'OUT'
            AND DATE(sm.movement_date) BETWEEN ? AND ?
            ORDER BY sm.movement_date DESC
        ");
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get Sales Report Data
     */
    private function getSalesReport($startDate, $endDate, $checkForUpdates = false) {
        // Check for new data if requested
        if ($checkForUpdates) {
            $this->checkForNewSalesData($startDate, $endDate);
        }
        
        // First, let's check if there's any data at all
        $countStmt = $this->conn->prepare("SELECT COUNT(*) as total FROM tbl_pos_sales_header");
        $countStmt->execute();
        $result = $countStmt->fetch();
        $totalSales = $result['total'];
        
        if ($totalSales == 0) {
            return [];
        }
        
        $stmt = $this->conn->prepare("
            SELECT 
                pt.date,
                pt.time,
                psh.transaction_id,
                psh.total_amount,
                psh.reference_number as reference_no,
                COUNT(psd.product_id) as items_sold,
                GROUP_CONCAT(CONCAT(COALESCE(p.product_name, CONCAT('Product ID: ', psd.product_id)), ' (', psd.quantity, 'x ₱', psd.price, ')') SEPARATOR ', ') as products,
                COALESCE(t.terminal_name, CONCAT('Terminal ', psh.terminal_id)) as terminal,
                pt.payment_type,
                CONCAT(COALESCE(e.Fname, ''), ' ', COALESCE(e.Lname, '')) as cashier_name,
                COALESCE(e.username, 'System') as cashier_username,
                e.emp_id,
                psh.sales_header_id,
                CONCAT(pt.date, ' ', pt.time) as transaction_timestamp
            FROM tbl_pos_sales_header psh
            LEFT JOIN tbl_pos_transaction pt ON psh.transaction_id = pt.transaction_id
            LEFT JOIN tbl_pos_sales_details psd ON psh.sales_header_id = psd.sales_header_id
            LEFT JOIN tbl_product p ON psd.product_id = p.product_id
            LEFT JOIN tbl_employee e ON pt.emp_id = e.emp_id
            LEFT JOIN tbl_pos_terminal t ON psh.terminal_id = t.terminal_id
            WHERE pt.date BETWEEN ? AND ?
            GROUP BY psh.sales_header_id, pt.date, pt.time, psh.transaction_id, psh.total_amount, psh.reference_number, psh.terminal_id, pt.payment_type, e.emp_id, t.terminal_name
            ORDER BY pt.date DESC, pt.time DESC
        ");
        $stmt->execute([$startDate, $endDate]);
        $reportData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // If no data for the specific date range, try to get recent data
        if (empty($reportData)) {
            $recentStmt = $this->conn->prepare("
                SELECT 
                    pt.date,
                    pt.time,
                    psh.transaction_id,
                    psh.total_amount,
                    psh.reference_number as reference_no,
                    COUNT(psd.product_id) as items_sold,
                    GROUP_CONCAT(CONCAT(COALESCE(p.product_name, CONCAT('Product ID: ', psd.product_id)), ' (', psd.quantity, 'x ₱', psd.price, ')') SEPARATOR ', ') as products,
                    COALESCE(t.terminal_name, CONCAT('Terminal ', psh.terminal_id)) as terminal,
                    pt.payment_type,
                    CONCAT(COALESCE(e.Fname, ''), ' ', COALESCE(e.Lname, '')) as cashier_name,
                    COALESCE(e.username, 'System') as cashier_username,
                    e.emp_id,
                    psh.sales_header_id,
                    CONCAT(pt.date, ' ', pt.time) as transaction_timestamp
                FROM tbl_pos_sales_header psh
                LEFT JOIN tbl_pos_transaction pt ON psh.transaction_id = pt.transaction_id
                LEFT JOIN tbl_pos_sales_details psd ON psh.sales_header_id = psd.sales_header_id
                LEFT JOIN tbl_product p ON psd.product_id = p.product_id
                LEFT JOIN tbl_employee e ON pt.emp_id = e.emp_id
                LEFT JOIN tbl_pos_terminal t ON psh.terminal_id = t.terminal_id
                WHERE pt.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY psh.sales_header_id, pt.date, pt.time, psh.transaction_id, psh.total_amount, psh.reference_number, psh.terminal_id, pt.payment_type, e.emp_id, t.terminal_name
                ORDER BY pt.date DESC, pt.time DESC
                LIMIT 10
            ");
            $recentStmt->execute();
            $reportData = $recentStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        return $reportData;
    }
    
    /**
     * Get Inventory Balance Report Data
     */
    private function getInventoryBalanceReport() {
        $stmt = $this->conn->prepare("
            SELECT 
                p.product_name,
                p.barcode,
                p.category,
                p.quantity as current_stock,
                p.unit_price,
                (p.quantity * p.unit_price) as total_value,
                COALESCE(l.location_name, 'Warehouse') as location,
                COALESCE(s.supplier_name, 'Unknown Supplier') as supplier,
                COALESCE(b.brand, 'Generic') as brand,
                p.expiration,
                CASE 
                    WHEN p.quantity <= 10 THEN 'Low Stock'
                    WHEN p.quantity = 0 THEN 'Out of Stock'
                    ELSE 'In Stock'
                END as status
            FROM tbl_product p
            LEFT JOIN tbl_location l ON p.location_id = l.location_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            WHERE (p.status IS NULL OR p.status <> 'archived')
            ORDER BY p.product_name
        ");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get Stock Adjustment Report Data
     */
    private function getStockAdjustmentReport($startDate, $endDate) {
        $stmt = $this->conn->prepare("
            SELECT 
                DATE(sm.movement_date) as date,
                TIME(sm.movement_date) as time,
                p.product_name,
                p.barcode,
                sm.quantity,
                sm.movement_type,
                sm.notes as reason,
                sm.created_by as adjusted_by,
                sm.reference_no
            FROM tbl_stock_movements sm
            JOIN tbl_product p ON sm.product_id = p.product_id
            WHERE sm.movement_type IN ('ADJUSTMENT', 'CORRECTION')
            AND DATE(sm.movement_date) BETWEEN ? AND ?
            ORDER BY sm.movement_date DESC
        ");
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get Supplier Report Data
     */
    private function getSupplierReport() {
        $stmt = $this->conn->prepare("
            SELECT 
                s.supplier_name,
                s.contact_person,
                s.email,
                COUNT(p.product_id) as products_supplied,
                COALESCE(SUM(p.quantity), 0) as total_stock,
                COALESCE(SUM(p.quantity * p.unit_price), 0) as total_value,
                COUNT(DISTINCT si.stock_in_id) as deliveries_count
            FROM tbl_supplier s
            LEFT JOIN tbl_product p ON s.supplier_id = p.supplier_id
            LEFT JOIN tbl_stock_in si ON s.supplier_id = si.supplier_id
            WHERE s.status = 'active'
            GROUP BY s.supplier_id, s.supplier_name, s.contact_person, s.email
            ORDER BY s.supplier_name
        ");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get Cashier Performance Report Data
     */
    private function getCashierPerformanceReport($startDate, $endDate, $checkForUpdates = false) {
        // Check for new data if requested
        if ($checkForUpdates) {
            $this->checkForNewCashierData($startDate, $endDate);
        }
        
        // First, let's check if there's any data at all
        $countStmt = $this->conn->prepare("SELECT COUNT(*) as total FROM tbl_pos_sales_header");
        $countStmt->execute();
        $result = $countStmt->fetch();
        $totalSales = $result['total'];
        
        if ($totalSales == 0) {
            return [];
        }
        
        $stmt = $this->conn->prepare("
            SELECT 
                e.emp_id,
                CONCAT(COALESCE(e.Fname, ''), ' ', COALESCE(e.Lname, '')) as cashier_name,
                COALESCE(e.username, 'Unknown') as cashier_username,
                e.email,
                e.contact_num,
                COUNT(DISTINCT psh.sales_header_id) as transactions_count,
                COALESCE(SUM(psh.total_amount), 0) as total_sales,
                COALESCE(AVG(psh.total_amount), 0) as average_transaction,
                COUNT(DISTINCT psd.product_id) as unique_products_sold,
                MIN(pt.date) as first_sale_date,
                MAX(pt.date) as last_sale_date
            FROM tbl_employee e
            LEFT JOIN tbl_pos_transaction pt ON e.emp_id = pt.emp_id
            LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
            LEFT JOIN tbl_pos_sales_details psd ON psh.sales_header_id = psd.sales_header_id
            WHERE e.role_id = 3 AND pt.date BETWEEN ? AND ?
            GROUP BY e.emp_id, e.Fname, e.Lname, e.username, e.email, e.contact_num
            ORDER BY total_sales DESC
        ");
        $stmt->execute([$startDate, $endDate]);
        $reportData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // If no data for the specific date range, try to get recent data
        if (empty($reportData)) {
            $recentStmt = $this->conn->prepare("
                SELECT 
                    e.emp_id,
                    CONCAT(COALESCE(e.Fname, ''), ' ', COALESCE(e.Lname, '')) as cashier_name,
                    COALESCE(e.username, 'Unknown') as cashier_username,
                    e.email,
                    e.contact_num,
                    COUNT(DISTINCT psh.sales_header_id) as transactions_count,
                    COALESCE(SUM(psh.total_amount), 0) as total_sales,
                    COALESCE(AVG(psh.total_amount), 0) as average_transaction,
                    COUNT(DISTINCT psd.product_id) as unique_products_sold,
                    MIN(pt.date) as first_sale_date,
                    MAX(pt.date) as last_sale_date
                FROM tbl_employee e
                LEFT JOIN tbl_pos_transaction pt ON e.emp_id = pt.emp_id
                LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
                LEFT JOIN tbl_pos_sales_details psd ON psh.sales_header_id = psd.sales_header_id
                WHERE e.role_id = 3 AND pt.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY e.emp_id, e.Fname, e.Lname, e.username, e.email, e.contact_num
                ORDER BY total_sales DESC
                LIMIT 10
            ");
            $recentStmt->execute();
            $reportData = $recentStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        return $reportData;
    }
    
    /**
     * Get Login Logs Report Data
     */
    private function getLoginLogsReport($startDate, $endDate) {
        $stmt = $this->conn->prepare("
            SELECT 
                DATE(al.date_created) as date,
                TIME(al.time_created) as time,
                al.username,
                al.role,
                al.activity_type as action,
                al.activity_description as description
            FROM tbl_activity_log al
            WHERE al.activity_type IN ('LOGIN', 'LOGOUT', 'NAVIGATION', 'PAGE_VIEW')
            AND DATE(al.date_created) BETWEEN ? AND ?
            ORDER BY al.date_created DESC, al.time_created DESC
        ");
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Check for new sales data
     */
    private function checkForNewSalesData($startDate, $endDate) {
        // Check for sales created in the last 5 minutes for better real-time detection
        $checkStmt = $this->conn->prepare("
            SELECT COUNT(*) as new_count 
            FROM tbl_pos_sales_header psh
            LEFT JOIN tbl_pos_transaction pt ON psh.transaction_id = pt.transaction_id
            WHERE pt.date BETWEEN ? AND ?
            AND (
                pt.date >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                OR psh.sales_header_id >= (
                    SELECT COALESCE(MAX(sales_header_id), 0) - 10 
                    FROM tbl_pos_sales_header
                )
            )
        ");
        $checkStmt->execute([$startDate, $endDate]);
        $result = $checkStmt->fetch();
        return $result['new_count'] > 0;
    }
    
    /**
     * Check for new cashier data
     */
    private function checkForNewCashierData($startDate, $endDate) {
        // Check for cashier activity in the last 5 minutes for better real-time detection
        $checkStmt = $this->conn->prepare("
            SELECT COUNT(DISTINCT pt.emp_id) as new_count 
            FROM tbl_pos_sales_header psh
            LEFT JOIN tbl_pos_transaction pt ON psh.transaction_id = pt.transaction_id
            WHERE pt.date BETWEEN ? AND ?
            AND pt.emp_id IS NOT NULL
            AND (
                pt.date >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                OR psh.sales_header_id >= (
                    SELECT COALESCE(MAX(sales_header_id), 0) - 10 
                    FROM tbl_pos_sales_header
                )
            )
        ");
        $checkStmt->execute([$startDate, $endDate]);
        $result = $checkStmt->fetch();
        return $result['new_count'] > 0;
    }
    
    /**
     * Check for new sales (for real-time notifications)
     */
    public function checkNewSales($since) {
        // Check for new sales since the given time
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as new_sales_count
            FROM tbl_pos_sales_header psh
            LEFT JOIN tbl_pos_transaction pt ON psh.transaction_id = pt.transaction_id
            WHERE pt.date >= ?
        ");
        $stmt->execute([$since]);
        $result = $stmt->fetch();
        $newSales = $result['new_sales_count'];
        
        // Check for new cashier activity
        $stmt2 = $this->conn->prepare("
            SELECT COUNT(DISTINCT pt.emp_id) as new_cashier_activity
            FROM tbl_pos_sales_header psh
            LEFT JOIN tbl_pos_transaction pt ON psh.transaction_id = pt.transaction_id
            WHERE pt.date >= ?
            AND pt.emp_id IS NOT NULL
        ");
        $stmt2->execute([$since]);
        $result2 = $stmt2->fetch();
        $newCashierActivity = $result2['new_cashier_activity'];
        
        return [
            "success" => true,
            "data" => [
                "newSales" => (int)$newSales,
                "newCashierActivity" => (int)$newCashierActivity,
                "checkTime" => date('Y-m-d H:i:s')
            ]
        ];
    }
    
    /**
     * Get latest sales activity for real-time updates
     */
    public function getLatestSalesActivity($minutes = 5) {
        $stmt = $this->conn->prepare("
            SELECT 
                psh.sales_header_id,
                psh.reference_number,
                psh.total_amount,
                pt.date,
                pt.time,
                pt.payment_type,
                CONCAT(COALESCE(e.Fname, ''), ' ', COALESCE(e.Lname, '')) as cashier_name,
                COALESCE(t.terminal_name, CONCAT('Terminal ', psh.terminal_id)) as terminal_name,
                COUNT(psd.product_id) as items_count
            FROM tbl_pos_sales_header psh
            LEFT JOIN tbl_pos_transaction pt ON psh.transaction_id = pt.transaction_id
            LEFT JOIN tbl_pos_sales_details psd ON psh.sales_header_id = psd.sales_header_id
            LEFT JOIN tbl_employee e ON pt.emp_id = e.emp_id
            LEFT JOIN tbl_pos_terminal t ON psh.terminal_id = t.terminal_id
            WHERE pt.date >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
            GROUP BY psh.sales_header_id, pt.date, pt.time, psh.reference_number, psh.total_amount, pt.payment_type, e.emp_id, t.terminal_name
            ORDER BY pt.date DESC, pt.time DESC
            LIMIT 20
        ");
        $stmt->execute([$minutes]);
        $recentSales = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            "success" => true,
            "data" => [
                "recentSales" => $recentSales,
                "count" => count($recentSales),
                "checkTime" => date('Y-m-d H:i:s'),
                "minutesChecked" => $minutes
            ]
        ];
    }
    
    /**
     * Generate report (placeholder for future functionality)
     */
    public function generateReport($reportType, $generatedBy, $parameters) {
        // This can be extended to create PDF reports, Excel exports, etc.
        return [
            'success' => true,
            'message' => 'Report generated successfully',
            'report_type' => $reportType,
            'generated_by' => $generatedBy,
            'parameters' => $parameters
        ];
    }
    
    /**
     * Get cashier details for performance report
     */
    public function getCashierDetails($cashierId, $startDate, $endDate) {
        // Get cashier info
        $cashierStmt = $this->conn->prepare("
            SELECT 
                emp_id,
                CONCAT(COALESCE(Fname, ''), ' ', COALESCE(Lname, '')) as cashier_name,
                username as cashier_username,
                email
            FROM tbl_employee 
            WHERE emp_id = ?
        ");
        $cashierStmt->execute([$cashierId]);
        $cashierInfo = $cashierStmt->fetch();
        
        // Get summary data
        $summaryStmt = $this->conn->prepare("
            SELECT 
                COUNT(DISTINCT psh.sales_header_id) as total_transactions,
                COALESCE(SUM(psh.total_amount), 0) as total_sales,
                COUNT(DISTINCT psd.product_id) as total_items
            FROM tbl_pos_transaction pt
            LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
            LEFT JOIN tbl_pos_sales_details psd ON psh.sales_header_id = psd.sales_header_id
            WHERE pt.emp_id = ? AND pt.date BETWEEN ? AND ?
        ");
        $summaryStmt->execute([$cashierId, $startDate, $endDate]);
        $summary = $summaryStmt->fetch();
        
        // Get detailed sales data
        $salesStmt = $this->conn->prepare("
            SELECT 
                pt.date,
                pt.time,
                psh.reference_number as reference_no,
                psh.total_amount,
                COUNT(psd.product_id) as items_sold,
                pt.payment_type,
                GROUP_CONCAT(CONCAT(COALESCE(p.product_name, CONCAT('Product ID: ', psd.product_id)), ' (', psd.quantity, 'x ₱', psd.price, ')') SEPARATOR ', ') as products
            FROM tbl_pos_transaction pt
            LEFT JOIN tbl_pos_sales_header psh ON pt.transaction_id = psh.transaction_id
            LEFT JOIN tbl_pos_sales_details psd ON psh.sales_header_id = psd.sales_header_id
            LEFT JOIN tbl_product p ON psd.product_id = p.product_id
            WHERE pt.emp_id = ? AND pt.date BETWEEN ? AND ?
            GROUP BY psh.sales_header_id, pt.date, pt.time, psh.reference_number, psh.total_amount, pt.payment_type
            ORDER BY pt.date DESC, pt.time DESC
        ");
        $salesStmt->execute([$cashierId, $startDate, $endDate]);
        $salesData = $salesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'cashier_info' => $cashierInfo,
            'summary' => $summary,
            'sales_data' => $salesData
        ];
    }
}
?>
