# 🪟 Windows/XAMPP Setup Guide - Secure Database Connection

## 📋 Quick Summary

Your database connection has been refactored to use environment variables for security. Follow these steps to complete the setup.

---

## ✅ Step 1: Install Composer on Windows

### Option A: Using Composer-Setup.exe (Recommended)

1. **Download Composer:**
   - Visit: https://getcomposer.org/Composer-Setup.exe
   - Or go to: https://getcomposer.org/download/ and click "Composer-Setup.exe"

2. **Run the Installer:**
   - Double-click `Composer-Setup.exe`
   - It will detect your PHP installation (should find XAMPP's PHP)
   - If it asks for PHP path, use: `C:\xampp\php\php.exe`
   - Click through the installation

3. **Verify Installation:**
   - Open a NEW Command Prompt or PowerShell
   - Run:
     ```powershell
     composer --version
     ```
   - You should see something like: `Composer version 2.x.x`

### Option B: Manual Installation (if installer doesn't work)

1. **Download composer.phar:**
   - Open PowerShell in your project directory
   - Run:
     ```powershell
     cd C:\xampp\htdocs\caps2e2
     php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
     php composer-setup.php
     php -r "unlink('composer-setup.php');"
     ```

2. **Use it with:**
   ```powershell
   php composer.phar install
   ```

---

## ✅ Step 2: Create .env Files

You need to create two files in your project root: `.env.example` and `.env`

### Method 1: Using PowerShell (Fastest)

Open PowerShell in `C:\xampp\htdocs\caps2e2` and run:

```powershell
# Create .env.example
@"
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
"@ | Out-File -FilePath .env.example -Encoding UTF8

# Create .env with your actual credentials
@"
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
"@ | Out-File -FilePath .env -Encoding UTF8
```

### Method 2: Using Notepad

1. Open Notepad
2. Paste the `.env` content (see below)
3. Click File → Save As
4. In the "File name" field, type: `".env"` (include the quotes!)
5. Set "Save as type" to "All Files (*.*)"
6. Save in `C:\xampp\htdocs\caps2e2`
7. Repeat for `.env.example`

**Content for .env:**
```env
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
```

**Content for .env.example:**
```env
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
```

---

## ✅ Step 3: Install PHP Dependencies

Open PowerShell or Command Prompt in `C:\xampp\htdocs\caps2e2` and run:

```powershell
composer install
```

This will:
- Download `vlucas/phpdotenv` library
- Create a `vendor/` directory
- Set up autoloading

You should see output like:
```
Loading composer repositories with package information
Installing dependencies from lock file (including require-dev)
Package operations: X installs, 0 updates, 0 removals
  - Installing vlucas/phpdotenv (vX.X.X): Downloading (100%)
...
Generating autoload files
```

---

## ✅ Step 4: Verify the Setup

### Test 1: Check Files Exist

Verify these files are in your project root:
- ✅ `.env`
- ✅ `.env.example`
- ✅ `composer.json`
- ✅ `vendor/` directory
- ✅ `vendor/autoload.php`

### Test 2: Test Database Connection

1. Start XAMPP (Apache + MySQL)
2. Open your browser
3. Navigate to any API endpoint, for example:
   ```
   http://localhost/caps2e2/Api/test_database.php
   ```
   Or create a simple test file:

```php
<?php
// test_env_connection.php
require_once 'Api/conn.php';

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'message' => 'Database connection successful!',
    'database' => $_ENV['DB_DATABASE'] ?? 'Unknown'
]);
?>
```

Save this as `test_env_connection.php` in your root directory and visit:
```
http://localhost/caps2e2/test_env_connection.php
```

---

## 🔧 Troubleshooting

### Problem: "composer: command not found"

**Solution:**
- Close and reopen your terminal after installing Composer
- Or use full path: `C:\ProgramData\ComposerSetup\bin\composer install`
- Or use: `php composer.phar install` (if manually installed)

### Problem: ".env file not loading"

**Solution:**
- Make sure the file is named exactly `.env` (not `.env.txt`)
- In Windows, enable "File name extensions" in File Explorer
- Check that the file is in the project root (`C:\xampp\htdocs\caps2e2`)

### Problem: "Composer dependencies not installed"

**Solution:**
- Make sure you ran `composer install`
- Check that `vendor/` directory exists
- Verify `vendor/autoload.php` exists

### Problem: "Environment configuration error"

**Solution:**
- Check that your `.env` file has all required fields:
  - DB_HOST
  - DB_DATABASE
  - DB_USERNAME
  - DB_CHARSET
- No extra spaces or quotes around values

### Problem: "Access denied for user"

**Solution:**
- Check your database credentials in `.env`
- Verify your MySQL user has permissions
- Test connection in phpMyAdmin

---

## 🔒 Security Reminders

✅ **GOOD:**
- `.env` file is in `.gitignore` (already done!)
- Using strong passwords in production
- Setting `APP_DEBUG=false` in production

❌ **BAD:**
- Committing `.env` to Git
- Sharing `.env` file with others
- Using empty passwords in production

---

## 📁 What Changed

### Files Created:
1. `composer.json` - PHP dependency management
2. `.env` - Your actual database credentials (NOT in Git)
3. `.env.example` - Template for other developers
4. `ENV_SETUP_INSTRUCTIONS.md` - Detailed deployment guide
5. `WINDOWS_SETUP_GUIDE.md` - This file
6. `create_env_files.txt` - Quick reference

### Files Modified:
1. `Api/conn.php` - Now uses environment variables

### Files Ignored (in .gitignore):
1. `.env` - Already excluded
2. `vendor/` - Already excluded

---

## 🎯 Quick Start Checklist

- [ ] Install Composer
- [ ] Create `.env` file
- [ ] Create `.env.example` file
- [ ] Run `composer install`
- [ ] Verify `vendor/` directory exists
- [ ] Test database connection
- [ ] Delete test files (if any)

---

## 🚀 Next Steps

1. **For Your Team:**
   - Share `.env.example` (not `.env`!)
   - They copy it to `.env` and update with their credentials
   - They run `composer install`

2. **For Production:**
   - Read `ENV_SETUP_INSTRUCTIONS.md` for cPanel/VPS deployment
   - Create production `.env` with secure credentials
   - Set `APP_ENV=production` and `APP_DEBUG=false`

---

## 📞 Still Need Help?

If you're stuck:
1. Check the error log: `Api/php_errors.log`
2. Verify XAMPP is running (Apache + MySQL)
3. Try accessing phpMyAdmin: `http://localhost/phpmyadmin`
4. Review `ENV_SETUP_INSTRUCTIONS.md` for detailed troubleshooting

---

**✨ Once complete, your database credentials will be secure and not exposed in your code!**
