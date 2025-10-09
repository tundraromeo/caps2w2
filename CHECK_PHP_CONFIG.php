<?php
/**
 * PHP Configuration Checker for Printing
 * Run this file in browser to check if PHP is configured correctly for printing
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP Printer Configuration Checker</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
            font-size: 28px;
        }
        .check-item {
            padding: 15px;
            margin: 15px 0;
            border-radius: 8px;
            border-left: 4px solid #ddd;
        }
        .check-item.success {
            background: #d4edda;
            border-left-color: #28a745;
        }
        .check-item.error {
            background: #f8d7da;
            border-left-color: #dc3545;
        }
        .check-item.warning {
            background: #fff3cd;
            border-left-color: #ffc107;
        }
        .check-item h3 {
            margin-bottom: 8px;
            font-size: 18px;
        }
        .check-item p {
            color: #555;
            line-height: 1.6;
        }
        .status {
            font-weight: bold;
            font-size: 20px;
            margin-right: 10px;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }
        .info-box {
            background: #e7f3ff;
            border: 1px solid #bee5eb;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .printer-list {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-top: 10px;
        }
        .printer-list pre {
            margin: 0;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖨️ PHP Printer Configuration Checker</h1>
        
        <?php
        // Check 1: shell_exec enabled
        $shell_exec_enabled = function_exists('shell_exec') && !in_array('shell_exec', array_map('trim', explode(',', ini_get('disable_functions'))));
        ?>
        
        <div class="check-item <?php echo $shell_exec_enabled ? 'success' : 'error'; ?>">
            <h3>
                <span class="status"><?php echo $shell_exec_enabled ? '✅' : '❌'; ?></span>
                shell_exec() Function
            </h3>
            <p>
                <?php if ($shell_exec_enabled): ?>
                    <strong>ENABLED:</strong> PHP can execute shell commands for printing.
                <?php else: ?>
                    <strong>DISABLED:</strong> Kailangan i-enable ang <code>shell_exec()</code> sa php.ini.
                    <br><br>
                    <strong>How to fix:</strong>
                    <br>1. Open <code><?php echo php_ini_loaded_file(); ?></code>
                    <br>2. Find <code>disable_functions</code>
                    <br>3. Remove <code>shell_exec</code> from the list
                    <br>4. Restart Apache
                <?php endif; ?>
            </p>
        </div>

        <?php
        // Check 2: Test shell_exec
        $can_run_commands = false;
        $test_output = '';
        if ($shell_exec_enabled) {
            $test_output = shell_exec('echo test 2>&1');
            $can_run_commands = !empty($test_output);
        }
        ?>
        
        <div class="check-item <?php echo $can_run_commands ? 'success' : 'error'; ?>">
            <h3>
                <span class="status"><?php echo $can_run_commands ? '✅' : '❌'; ?></span>
                Shell Command Execution
            </h3>
            <p>
                <?php if ($can_run_commands): ?>
                    <strong>WORKING:</strong> PHP can execute shell commands successfully.
                    <br>Test output: <code><?php echo htmlspecialchars(trim($test_output)); ?></code>
                <?php else: ?>
                    <strong>NOT WORKING:</strong> Hindi maka-execute ng shell commands.
                    <br><br>
                    <strong>Possible causes:</strong>
                    <br>• Apache not running as Administrator
                    <br>• Windows security blocking commands
                    <br>• Antivirus blocking PHP
                <?php endif; ?>
            </p>
        </div>

        <?php
        // Check 3: Detect printers
        $printers = [];
        if ($shell_exec_enabled && $can_run_commands) {
            $printer_output = shell_exec('wmic printer get name 2>&1');
            if ($printer_output && !stripos($printer_output, 'error')) {
                $lines = explode("\n", $printer_output);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (!empty($line) && $line != 'Name' && strlen($line) > 2) {
                        $printers[] = $line;
                    }
                }
            }
        }
        ?>
        
        <div class="check-item <?php echo count($printers) > 0 ? 'success' : 'warning'; ?>">
            <h3>
                <span class="status"><?php echo count($printers) > 0 ? '✅' : '⚠️'; ?></span>
                Detected Printers
            </h3>
            <p>
                <?php if (count($printers) > 0): ?>
                    <strong>FOUND <?php echo count($printers); ?> PRINTER(S):</strong>
                    <div class="printer-list">
                        <pre><?php echo htmlspecialchars(implode("\n", $printers)); ?></pre>
                    </div>
                    <br>
                    <strong>⚠️ Important:</strong> Copy ang EXACT printer name at i-paste sa <code>print-receipt-fixed-width.php</code> line 149:
                    <br><code>$printerName = 'YOUR_PRINTER_NAME';</code>
                <?php else: ?>
                    <strong>NO PRINTERS DETECTED</strong>
                    <br><br>
                    Possible reasons:
                    <br>• No printers installed
                    <br>• Printer not shared
                    <br>• Need to run XAMPP as Administrator
                    <br><br>
                    <strong>Manual check:</strong> Open Control Panel > Devices and Printers
                <?php endif; ?>
            </p>
        </div>

        <?php
        // Check 4: PHP Version
        $php_version = phpversion();
        $php_ok = version_compare($php_version, '7.0', '>=');
        ?>
        
        <div class="check-item success">
            <h3>
                <span class="status">✅</span>
                PHP Version
            </h3>
            <p>
                <strong>Version:</strong> <?php echo $php_version; ?>
                <?php if (!$php_ok): ?>
                    <br>⚠️ Warning: Consider upgrading to PHP 7.0 or higher
                <?php endif; ?>
            </p>
        </div>

        <?php
        // Check 5: php.ini location
        $php_ini = php_ini_loaded_file();
        ?>
        
        <div class="check-item success">
            <h3>
                <span class="status">ℹ️</span>
                PHP Configuration File
            </h3>
            <p>
                <strong>Location:</strong> <code><?php echo $php_ini ? $php_ini : 'Not found'; ?></code>
                <br><br>
                <strong>Disabled Functions:</strong> 
                <code><?php 
                    $disabled = ini_get('disable_functions');
                    echo !empty($disabled) ? $disabled : 'None (All functions enabled)';
                ?></code>
            </p>
        </div>

        <div class="info-box">
            <h3 style="margin-bottom: 10px;">📋 Next Steps:</h3>
            <?php if ($shell_exec_enabled && $can_run_commands && count($printers) > 0): ?>
                <strong style="color: #28a745;">✅ YOUR SYSTEM IS READY FOR PRINTING!</strong>
                <br><br>
                Make sure:
                <br>1. Update printer name sa <code>print-receipt-fixed-width.php</code>
                <br>2. Printer is turned ON and has paper
                <br>3. Test printing sa POS system
            <?php else: ?>
                <strong style="color: #dc3545;">❌ CONFIGURATION NEEDED</strong>
                <br><br>
                Follow these steps:
                <br>1. Enable <code>shell_exec()</code> sa php.ini
                <br>2. Restart Apache
                <br>3. Run XAMPP as Administrator
                <br>4. Reload this page
                <br><br>
                📖 Read <code>PRINTER_TROUBLESHOOTING_GUIDE.md</code> for detailed instructions.
            <?php endif; ?>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <button onclick="location.reload()" style="background: #667eea; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 16px; cursor: pointer;">
                🔄 Reload Check
            </button>
        </div>
    </div>
</body>
</html>

