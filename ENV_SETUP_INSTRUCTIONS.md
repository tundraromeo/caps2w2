# 🔐 Secure Database Connection Setup Guide

This guide will help you set up secure environment-based database connections for your PHP application.

---

## 📋 What's Included

- ✅ `.env` file for storing credentials securely
- ✅ `vlucas/phpdotenv` for loading environment variables
- ✅ Updated `conn.php` with secure connection handling
- ✅ Error handling for development and production
- ✅ Validation of required environment variables

---

## 🚀 Installation Steps

### Step 1: Install Composer (if not already installed)

**For Windows (XAMPP):**
1. Download Composer from [getcomposer.org](https://getcomposer.org/download/)
2. Run the installer
3. Restart your terminal/command prompt

**For Linux/macOS:**
```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### Step 2: Install Dependencies

Open terminal/command prompt in your project root and run:

```bash
composer install
```

This will install `vlucas/phpdotenv` and create a `vendor/` directory.

### Step 3: Configure Your Environment

1. A `.env` file has been created with your current database credentials
2. Update the `.env` file with your actual credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=engiuo2
DB_USERNAME=root
DB_PASSWORD=your_password_here
DB_CHARSET=utf8mb4

APP_ENV=development
APP_DEBUG=true
```

⚠️ **IMPORTANT:** The `.env` file is already in `.gitignore` and will NOT be committed to Git.

### Step 4: Verify the Connection

Test your database connection by accessing any API endpoint that uses `conn.php`.

---

## 📁 File Structure

```
caps2e2/
├── .env                          # Your actual credentials (NOT in Git)
├── .env.example                  # Template for other developers
├── .gitignore                    # Already excludes .env files
├── composer.json                 # PHP dependencies
├── vendor/                       # Composer packages (auto-generated)
│   └── vlucas/phpdotenv/
├── Api/
│   └── conn.php                  # Updated connection file
└── ENV_SETUP_INSTRUCTIONS.md     # This file
```

---

## 🌐 Production Deployment

### For cPanel Hosting:

1. **Upload Files:**
   - Upload all files EXCEPT `.env` via FTP/File Manager
   - The `vendor/` directory should be uploaded too

2. **Create .env File:**
   - In cPanel File Manager, create a new `.env` file in your root directory
   - Copy content from `.env.example` and update with production credentials:
     ```env
     DB_HOST=localhost
     DB_DATABASE=your_production_db
     DB_USERNAME=your_cpanel_user
     DB_PASSWORD=your_strong_password
     APP_ENV=production
     APP_DEBUG=false
     ```

3. **Install Composer Dependencies:**
   - Access cPanel Terminal or SSH
   - Navigate to your project directory:
     ```bash
     cd public_html/your-project
     composer install --no-dev --optimize-autoloader
     ```
   - If cPanel doesn't have composer, use:
     ```bash
     php composer.phar install --no-dev --optimize-autoloader
     ```

4. **Set Permissions:**
   ```bash
   chmod 644 .env
   chmod 755 Api/
   ```

5. **Verify:**
   - Test your API endpoints
   - Check error logs if issues occur

### For VPS (Ubuntu/Debian):

1. **SSH into your server:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Navigate to your project:**
   ```bash
   cd /var/www/html/your-project
   ```

3. **Install Composer:**
   ```bash
   sudo apt update
   sudo apt install composer
   ```

4. **Install Dependencies:**
   ```bash
   composer install --no-dev --optimize-autoloader
   ```

5. **Create .env File:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your production credentials
   ```

6. **Set Permissions:**
   ```bash
   sudo chown -R www-data:www-data .
   sudo chmod 644 .env
   sudo chmod 755 Api/
   ```

7. **Restart Web Server:**
   ```bash
   sudo systemctl restart apache2  # or nginx
   ```

---

## 🔒 Security Best Practices

### ✅ DO:
- Use strong, unique passwords in production
- Set `APP_ENV=production` and `APP_DEBUG=false` in production
- Keep `.env` file permissions restricted (644)
- Regularly update Composer dependencies: `composer update`
- Use separate databases for development and production
- Enable SSL/TLS for database connections in production

### ❌ DON'T:
- Never commit `.env` to Git (it's already in `.gitignore`)
- Never share your `.env` file
- Never display detailed errors in production
- Don't use default passwords like empty string or "password"
- Don't give database users more privileges than needed

---

## 🐛 Troubleshooting

### Error: "Composer dependencies not installed"
**Solution:** Run `composer install` in your project root.

### Error: "Environment configuration error"
**Solution:** 
- Check that `.env` file exists in project root
- Verify all required variables are set (DB_HOST, DB_DATABASE, DB_USERNAME, DB_CHARSET)

### Error: "Connection failed: Access denied"
**Solution:** 
- Verify database credentials in `.env`
- Ensure database user has proper permissions
- Test connection manually using phpMyAdmin

### Error: "Class 'Dotenv\Dotenv' not found"
**Solution:**
- Run `composer install`
- Verify `vendor/autoload.php` exists
- Check that `vendor/` is not in `.gitignore` for production servers

### Database Connection Works Locally but Not in Production
**Solution:**
- Verify `.env` file exists in production
- Check production database credentials
- Ensure `vendor/` directory is uploaded
- Verify PHP version compatibility (>=7.4)
- Check file permissions

---

## 📚 Additional Features in Updated conn.php

### 1. Enhanced Security:
- Credentials stored in environment variables
- Production mode hides detailed error messages
- Prepared statements enforced by default

### 2. Better Performance:
- Optimized PDO attributes
- Connection reuse
- Charset set at connection level

### 3. Improved Error Handling:
- Environment-aware error messages
- Secure error logging
- Validation of required variables

### 4. Development-Friendly:
- Detailed errors in development mode
- Clear error messages for missing dependencies
- Easy switching between dev/production

---

## 🔄 Migrating Team Members

When a new developer joins your team:

1. They clone the repository
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with their local database credentials
4. Run `composer install`
5. Ready to develop!

---

## 📞 Need Help?

If you encounter issues:
1. Check the PHP error log: `Api/php_errors.log`
2. Verify Composer is installed: `composer --version`
3. Test database connection manually
4. Check file permissions
5. Review this guide's troubleshooting section

---

## 📝 Summary of Changes

### Files Created:
- ✅ `composer.json` - Manages PHP dependencies
- ✅ `.env` - Your actual credentials (not in Git)
- ✅ `.env.example` - Template for other developers
- ✅ `ENV_SETUP_INSTRUCTIONS.md` - This guide

### Files Modified:
- ✅ `Api/conn.php` - Now uses environment variables

### Files Ignored:
- ✅ `.env` - Already in `.gitignore`
- ✅ `vendor/` - Already in `.gitignore`

---

**🎉 Your database connection is now secure and production-ready!**
