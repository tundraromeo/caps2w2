<?php
// PRINT WEBHOOK - RECEIVES PRINT REQUESTS FROM CLOUD
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

    $receipt = $input['receipt'] ?? '';
    $transactionId = $input['transactionId'] ?? 'N/A';
    $printer = $input['printer'] ?? 'POS-58';
    
    if (empty($receipt)) {
        echo json_encode(['success' => false, 'message' => 'No receipt data']);
        exit;
    }
    
    // Create temp file
    $tempFile = 'C:\xampp\htdocs\caps2e2\webhook_receipt_' . time() . '.txt';
    file_put_contents($tempFile, $receipt);
    
    $printSuccess = false;
    $printMethod = '';
    $lastError = '';
    
    // METHOD 1: Direct copy to printer share
    $command1 = 'copy /b "' . $tempFile . '" "\\\\localhost\\' . $printer . '" 2>&1';
    $output1 = shell_exec($command1);
    
    if ($output1 === null || (strpos(strtolower($output1), 'error') === false)) {
        $printSuccess = true;
        $printMethod = 'direct_copy';
    } else {
        $lastError = $output1;
        
        // METHOD 2: Write directly to printer
        try {
            $printerHandle = fopen('\\\\localhost\\' . $printer, 'w');
            if ($printerHandle) {
                fwrite($printerHandle, $receipt);
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
                'printer' => $printer,
                'transactionId' => $transactionId
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
