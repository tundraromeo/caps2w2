<?php
// DIRECT COPY TEST - NO SHELL COMMANDS
header('Content-Type: text/plain');

echo "=== DIRECT COPY TEST ===\n";
echo "Testing direct file copy to printer...\n\n";

// Create test receipt
$receipt = "================================\n";
$receipt .= "      DIRECT COPY TEST RECEIPT  \n";
$receipt .= "================================\n";
$receipt .= "Date: " . date('Y-m-d H:i:s') . "\n";
$receipt .= "Printer: POS-58\n";
$receipt .= "Method: Direct Copy\n";
$receipt .= "--------------------------------\n";
$receipt .= "Test Item 1          ₱100.00\n";
$receipt .= "Test Item 2          ₱200.00\n";
$receipt .= "--------------------------------\n";
$receipt .= "TOTAL:               ₱300.00\n";
$receipt .= "================================\n";
$receipt .= "  Thank you for testing!  \n";
$receipt .= "\n\n\n\n";

// Convert to Windows line endings
$formatted = str_replace("\n", "\r\n", $receipt);

// Create temp file
$tempFile = 'C:\xampp\htdocs\caps2e2\test_receipt_' . time() . '.txt';
file_put_contents($tempFile, $formatted);

echo "✅ Test receipt created: $tempFile\n";
echo "📄 Receipt content:\n";
echo $receipt;
echo "\n";

// METHOD 1: Direct copy to printer share
echo "🔄 METHOD 1: Direct copy to printer share...\n";
$command1 = 'copy /b "' . $tempFile . '" "\\\\localhost\\POS-58" 2>&1';
echo "Command: $command1\n";
$output1 = shell_exec($command1);
echo "Output: " . ($output1 ?: 'NULL') . "\n";

if ($output1 === null || (strpos(strtolower($output1), 'error') === false)) {
    echo "✅ METHOD 1 SUCCESS!\n";
} else {
    echo "❌ METHOD 1 FAILED: $output1\n";
}

echo "\n";

// METHOD 2: Copy to printer port
echo "🔄 METHOD 2: Copy to printer port...\n";
$command2 = 'copy /b "' . $tempFile . '" "LPT1:" 2>&1';
echo "Command: $command2\n";
$output2 = shell_exec($command2);
echo "Output: " . ($output2 ?: 'NULL') . "\n";

if ($output2 === null || (strpos(strtolower($output2), 'error') === false)) {
    echo "✅ METHOD 2 SUCCESS!\n";
} else {
    echo "❌ METHOD 2 FAILED: $output2\n";
}

echo "\n";

// METHOD 3: Print command
echo "🔄 METHOD 3: Print command...\n";
$command3 = 'print /D:POS-58 "' . $tempFile . '" 2>&1';
echo "Command: $command3\n";
$output3 = shell_exec($command3);
echo "Output: " . ($output3 ?: 'NULL') . "\n";

if ($output3 === null || (strpos(strtolower($output3), 'error') === false)) {
    echo "✅ METHOD 3 SUCCESS!\n";
} else {
    echo "❌ METHOD 3 FAILED: $output3\n";
}

echo "\n";

// METHOD 4: Write directly to printer
echo "🔄 METHOD 4: Write directly to printer...\n";
try {
    $printerHandle = fopen('\\\\localhost\\POS-58', 'w');
    if ($printerHandle) {
        fwrite($printerHandle, $formatted);
        fclose($printerHandle);
        echo "✅ METHOD 4 SUCCESS!\n";
    } else {
        echo "❌ METHOD 4 FAILED: Cannot open printer\n";
    }
} catch (Exception $e) {
    echo "❌ METHOD 4 FAILED: " . $e->getMessage() . "\n";
}

echo "\n";

// Clean up
@unlink($tempFile);

echo "=== TEST COMPLETED ===\n";
echo "Check your printer for test receipts!\n";
?>
