<?php
/**
 * Date Filter Helper
 * Provides consistent date filtering functions for all dashboard APIs
 */

class DateFilterHelper {
    
    /**
     * Get date range conditions based on period
     * @param string $period - today, week, month, all
     * @param string $dateColumn - the column name to filter (default: 'date')
     * @return array - ['condition' => string, 'params' => array]
     */
    public static function getDateCondition($period, $dateColumn = 'date') {
        switch ($period) {
            case 'today':
                return [
                    'condition' => "AND DATE($dateColumn) = CURDATE()",
                    'params' => []
                ];
                
            case 'week':
                return [
                    'condition' => "AND $dateColumn >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
                    'params' => []
                ];
                
            case 'month':
                return [
                    'condition' => "AND $dateColumn >= DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY)",
                    'params' => []
                ];
                
            default: // 'all'
                return [
                    'condition' => '',
                    'params' => []
                ];
        }
    }
    
    /**
     * Get date range for returns table (uses created_at column)
     * @param string $period - today, week, month, all
     * @return array - ['condition' => string, 'params' => array]
     */
    public static function getReturnDateCondition($period) {
        switch ($period) {
            case 'today':
                return [
                    'condition' => "AND DATE(created_at) = CURDATE()",
                    'params' => []
                ];
                
            case 'week':
                return [
                    'condition' => "AND created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
                    'params' => []
                ];
                
            case 'month':
                return [
                    'condition' => "AND created_at >= DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY)",
                    'params' => []
                ];
                
            default: // 'all'
                return [
                    'condition' => '',
                    'params' => []
                ];
        }
    }
    
    /**
     * Get date range for transactions table
     * @param string $period - today, week, month, all
     * @return array - ['condition' => string, 'params' => array]
     */
    public static function getTransactionDateCondition($period) {
        switch ($period) {
            case 'today':
                return [
                    'condition' => "AND DATE(pt.date) = CURDATE()",
                    'params' => []
                ];
                
            case 'week':
                return [
                    'condition' => "AND pt.date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
                    'params' => []
                ];
                
            case 'month':
                return [
                    'condition' => "AND pt.date >= DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY)",
                    'params' => []
                ];
                
            default: // 'all'
                return [
                    'condition' => '',
                    'params' => []
                ];
        }
    }
    
    /**
     * Debug function to show what date ranges are being used
     * @param string $period - today, week, month, all
     * @return array - debug information
     */
    public static function getDebugInfo($period) {
        $info = [
            'period' => $period,
            'current_date' => date('Y-m-d'),
            'current_time' => date('Y-m-d H:i:s')
        ];
        
        switch ($period) {
            case 'today':
                $info['start_date'] = date('Y-m-d');
                $info['end_date'] = date('Y-m-d');
                $info['description'] = 'Current day only';
                break;
                
            case 'week':
                $info['start_date'] = date('Y-m-d', strtotime('monday this week'));
                $info['end_date'] = date('Y-m-d');
                $info['description'] = 'From Monday of current week to today';
                break;
                
            case 'month':
                $info['start_date'] = date('Y-m-01');
                $info['end_date'] = date('Y-m-d');
                $info['description'] = 'From 1st of current month to today';
                break;
                
            default:
                $info['start_date'] = 'all';
                $info['end_date'] = 'all';
                $info['description'] = 'All time - no date filtering';
                break;
        }
        
        return $info;
    }
}
?>
