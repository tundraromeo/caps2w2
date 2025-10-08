# Automated Setup Script for Secure Database Connection
# Run this in PowerShell: .\setup.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🔐 Secure Database Connection Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Composer is installed
Write-Host "📦 Checking for Composer..." -ForegroundColor Yellow
$composerInstalled = $null -ne (Get-Command composer -ErrorAction SilentlyContinue)

if (-not $composerInstalled) {
    Write-Host "❌ Composer is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Composer first:" -ForegroundColor Yellow
    Write-Host "  1. Download: https://getcomposer.org/Composer-Setup.exe" -ForegroundColor White
    Write-Host "  2. Run the installer" -ForegroundColor White
    Write-Host "  3. Restart PowerShell and run this script again" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Composer found!" -ForegroundColor Green
Write-Host ""

# Create .env file
Write-Host "📝 Creating .env file..." -ForegroundColor Yellow

$envContent = @"
# Database Configuration
# This file contains your actual credentials - NEVER commit this to Git

DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=engiuo2
DB_USERNAME=root
DB_PASSWORD=
DB_CHARSET=utf8mb4

# Application Environment
APP_ENV=development
APP_DEBUG=true

# Optional: Timezone
APP_TIMEZONE=UTC
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8 -Force
Write-Host "✅ Created .env file" -ForegroundColor Green

# Create .env.example file
Write-Host "📝 Creating .env.example file..." -ForegroundColor Yellow

$envExampleContent = @"
# Database Configuration
# Copy this file to .env and update with your actual credentials
# NEVER commit the .env file to version control

DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password
DB_CHARSET=utf8mb4

# Application Environment
APP_ENV=production
APP_DEBUG=false

# Optional: Timezone
APP_TIMEZONE=UTC
"@

$envExampleContent | Out-File -FilePath ".env.example" -Encoding UTF8 -Force
Write-Host "✅ Created .env.example file" -ForegroundColor Green
Write-Host ""

# Install Composer dependencies
Write-Host "📦 Installing Composer dependencies..." -ForegroundColor Yellow
Write-Host "   This may take a minute..." -ForegroundColor Gray
Write-Host ""

try {
    composer install
    Write-Host ""
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verify setup
Write-Host "📋 Verifying setup..." -ForegroundColor Yellow
Write-Host ""

$allGood = $true

# Check .env
if (Test-Path ".env") {
    Write-Host "  ✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ .env file missing" -ForegroundColor Red
    $allGood = $false
}

# Check .env.example
if (Test-Path ".env.example") {
    Write-Host "  ✅ .env.example file exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ .env.example file missing" -ForegroundColor Red
    $allGood = $false
}

# Check composer.json
if (Test-Path "composer.json") {
    Write-Host "  ✅ composer.json exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ composer.json missing" -ForegroundColor Red
    $allGood = $false
}

# Check vendor directory
if (Test-Path "vendor") {
    Write-Host "  ✅ vendor/ directory exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ vendor/ directory missing" -ForegroundColor Red
    $allGood = $false
}

# Check autoload.php
if (Test-Path "vendor/autoload.php") {
    Write-Host "  ✅ vendor/autoload.php exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ vendor/autoload.php missing" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

if ($allGood) {
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "✨ All checks passed!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🧪 Next Steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Start XAMPP (Apache + MySQL)" -ForegroundColor White
    Write-Host ""
    Write-Host "  2. Test the connection by visiting:" -ForegroundColor White
    Write-Host "     http://localhost/caps2e2/test_env_connection.php" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. If successful, you'll see a JSON response with:" -ForegroundColor White
    Write-Host "     'success': true" -ForegroundColor Green
    Write-Host ""
    Write-Host "  4. Read SETUP_SUMMARY.md for more information" -ForegroundColor White
    Write-Host ""
    Write-Host "🔒 Security Reminder:" -ForegroundColor Yellow
    Write-Host "  - Your .env file is NOT committed to Git" -ForegroundColor White
    Write-Host "  - Database credentials are now secure!" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "⚠️  Some checks failed" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please see WINDOWS_SETUP_GUIDE.md for troubleshooting" -ForegroundColor White
    Write-Host ""
}

Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "  - SETUP_SUMMARY.md - Quick overview" -ForegroundColor White
Write-Host "  - WINDOWS_SETUP_GUIDE.md - Detailed Windows setup" -ForegroundColor White
Write-Host "  - ENV_SETUP_INSTRUCTIONS.md - Production deployment" -ForegroundColor White
Write-Host ""
