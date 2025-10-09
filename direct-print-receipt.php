<?php
// DIRECT PRINT RECEIPT - BYPASS POS SYSTEM
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        exit;
    }

    // Create receipt content
    $receipt = "================================\n";
    $receipt .= "    ENGUIO'S PHARMACY RECEIPT   \n";
    $receipt .= "================================\n";
    $receipt .= "Date: " . ($input['date'] ?? date('Y-m-d')) . "\n";
    $receipt .= "Time: " . ($input['time'] ?? date('H:i:s')) . "\n";
    $receipt .= "TXN ID: " . ($input['transactionId'] ?? 'N/A') . "\n";
    $receipt .= "Cashier: " . ($input['cashier'] ?? 'Admin') . "\n";
    $receipt .= "Terminal: " . ($input['terminalName'] ?? 'POS') . "\n";
    $receipt .= "--------------------------------\n";
    
    // Items
    if (!empty($input['items'])) {
        $receipt .= "QTY  ITEM            PRICE  TOTAL\n";
        $receipt .= "--------------------------------\n";
        foreach ($input['items'] as $item) {
            $name = $item['name'] ?? 'Unknown';
            $qty = (int)($item['quantity'] ?? 1);
            $price = (float)($item['price'] ?? 0);
            $total = $qty * $price;
            
            $receipt .= sprintf("%-4d %-15s %6.2f %6.2f\n", $qty, substr($name, 0, 15), $price, $total);
        }
    }
    
    $receipt .= "--------------------------------\n";
    $receipt .= "SUBTOTAL:            " . sprintf("%6.2f", $input['subtotal'] ?? 0) . "\n";
    
    if (!empty($input['discountType']) && isset($input['discountAmount']) && (float)$input['discountAmount'] > 0) {
        $receipt .= "DISCOUNT (" . $input['discountType'] . "): " . sprintf("%6.2f", -$input['discountAmount']) . "\n";
    }
    
    $receipt .= "GRAND TOTAL:         " . sprintf("%6.2f", $input['grandTotal'] ?? 0) . "\n";
    $receipt .= "--------------------------------\n";
    $receipt .= "PAYMENT: " . strtoupper($input['paymentMethod'] ?? 'CASH') . "\n";
    $receipt .= "AMOUNT PAID:         " . sprintf("%6.2f", $input['amountPaid'] ?? 0) . "\n";
    $receipt .= "CHANGE:              " . sprintf("%6.2f", $input['change'] ?? 0) . "\n";
    $receipt .= "================================\n";
    $receipt .= "    Thank you for purchasing!   \n";
    $receipt .= "      Please come again!        \n";
    $receipt .= "  This is your official receipt \n";
    $receipt .= "\n\n\n\n";

    // Convert to Windows line endings
    $formatted = str_replace("\n", "\r\n", $receipt);
    
    // Create temp file
    $tempFile = 'C:\xampp\htdocs\caps2e2\receipt_' . time() . '.txt';
    file_put_contents($tempFile, $formatted);
    
    $printSuccess = false;
    $printMethod = '';
    $lastError = '';
    
    // METHOD 1: Direct copy to printer share
    $command1 = 'copy /b "' . $tempFile . '" "\\\\localhost\\POS-58" 2>&1';
    $output1 = shell_exec($command1);
    
    if ($output1 === null || (strpos(strtolower($output1), 'error') === false)) {
        $printSuccess = true;
        $printMethod = 'direct_copy';
    } else {
        $lastError = $output1;
        
        // METHOD 2: Write directly to printer
        try {
            $printerHandle = fopen('\\\\localhost\\POS-58', 'w');
            if ($printerHandle) {
                fwrite($printerHandle, $formatted);
                fclose($printerHandle);
                $printSuccess = true;
                $printMethod = 'direct_write';
            }
        } catch (Exception $e) {
            $lastError = $e->getMessage();
        }
    }
    
    // Clean up
    @unlink($tempFile);
    
    if ($printSuccess) {
        echo json_encode([
            'success' => true,
            'message' => 'Receipt printed successfully!',
            'data' => [
                'method' => $printMethod,
                'printer' => 'POS-58',
                'transactionId' => ($input['transactionId'] ?? null)
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Printing failed: ' . $lastError,
            'data' => [
                'method' => 'failed',
                'error' => $lastError
            ]
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>
