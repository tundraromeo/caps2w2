<?php
// CLOUD PRINT RECEIPT - FOR LINUX HOSTING
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
    $tempFile = '/tmp/receipt_' . time() . '.txt';
    file_put_contents($tempFile, $formatted);
    
    $printSuccess = false;
    $printMethod = '';
    $lastError = '';
    
    // METHOD 1: Send to cloud print service
    $cloudPrintResult = sendToCloudPrint($formatted, $input);
    if ($cloudPrintResult['success']) {
        $printSuccess = true;
        $printMethod = 'cloud_print';
    } else {
        $lastError = $cloudPrintResult['error'];
        
        // METHOD 2: Send to email
        $emailResult = sendEmailReceipt($formatted, $input);
        if ($emailResult['success']) {
            $printSuccess = true;
            $printMethod = 'email_receipt';
        } else {
            $lastError = $emailResult['error'];
        }
    }
    
    // Clean up
    @unlink($tempFile);
    
    if ($printSuccess) {
        echo json_encode([
            'success' => true,
            'message' => 'Receipt sent successfully!',
            'data' => [
                'method' => $printMethod,
                'transactionId' => ($input['transactionId'] ?? null),
                'details' => $printMethod === 'cloud_print' ? 'Sent to cloud printer' : 'Sent via email'
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

function sendToCloudPrint($receipt, $input) {
    // OPTION 1: Google Cloud Print (deprecated but still works)
    // OPTION 2: Custom cloud print service
    // OPTION 3: Webhook to local printer
    
    try {
        // For now, we'll use a webhook approach
        $webhookUrl = 'https://your-local-server.com/print-webhook.php';
        
        $data = [
            'receipt' => $receipt,
            'transactionId' => $input['transactionId'] ?? null,
            'printer' => 'POS-58'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $webhookUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            return ['success' => true];
        } else {
            return ['success' => false, 'error' => 'Webhook failed: HTTP ' . $httpCode];
        }
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function sendEmailReceipt($receipt, $input) {
    try {
        $to = 'receipts@yourstore.com'; // Change this to your email
        $subject = 'Receipt - ' . ($input['transactionId'] ?? 'N/A');
        $message = "Receipt for transaction: " . ($input['transactionId'] ?? 'N/A') . "\n\n";
        $message .= $receipt;
        
        $headers = "From: noreply@yourstore.com\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        
        if (mail($to, $subject, $message, $headers)) {
            return ['success' => true];
        } else {
            return ['success' => false, 'error' => 'Email sending failed'];
        }
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}
?>
