# ENGUIO System - Setup Instructions

## Quick Start Guide

### Step 1: Create Environment Configuration File

1. **Copy the example environment file:**
   ```bash
   cp env.example.txt .env
   ```

2. **Edit the `.env` file with your actual configuration:**
   ```bash
   nano .env
   # or use your preferred text editor
   ```

3. **Update the following values:**
   ```env
   # Database Configuration
   DB_HOST=localhost          # Your database host
   DB_USERNAME=root           # Your database username
   DB_PASSWORD=               # Your database password
   DB_NAME=enguio2           # Your database name
   
   # API Configuration
   CORS_ORIGIN=http://localhost:3000  # Your frontend URL
   
   # Environment
   APP_ENV=development        # development or production
   APP_DEBUG=true            # true for development, false for production
   ```

### Step 2: Verify Database Connection

Test your database connection:
```bash
cd Api
php connection_test.php
```

Expected output:
```
✓ Database connection successful
```

### Step 3: Set Proper Permissions

Make sure the `.env` file is readable by your web server:
```bash
chmod 644 .env
```

⚠️ **Security Warning:** Never commit the `.env` file to version control!

### Step 4: Configure Your Web Server

#### For Apache:
Ensure the `.htaccess` file allows PHP execution in the `Api/` directory.

#### For Nginx:
Add this to your server block:
```nginx
location /Api/ {
    try_files $uri $uri/ /Api/$uri.php?$query_string;
}
```

### Step 5: Test Your API

Test a simple API endpoint:
```bash
curl -X POST http://localhost/Api/test_database.php
```

Or open in your browser:
```
http://localhost/Api/connection_test.php
```

## What Changed?

### ✅ Security Improvements
- ❌ **Before:** Database credentials hardcoded in every file
- ✅ **After:** Credentials stored in `.env` file (not in version control)

### ✅ Maintainability Improvements
- ❌ **Before:** Need to update credentials in 15+ files
- ✅ **After:** Update once in `.env` file

### ✅ Standardization
- ✅ All API files now use `require_once` instead of `include`
- ✅ Consistent CORS configuration across all endpoints
- ✅ Centralized configuration management

### ✅ Environment-Aware
- ✅ Different configurations for development and production
- ✅ Debug mode controlled by environment variable
- ✅ Error messages adapt to environment (detailed in dev, generic in prod)

## New Files Created

1. **`Api/config.php`** - Configuration loader
2. **`Api/cors.php`** - CORS headers configuration
3. **`env.example.txt`** - Environment configuration template
4. **`Api/README.md`** - API documentation and best practices

## Modified Files

All API files were updated to:
1. Load configuration from `.env` via `config.php`
2. Use `require_once` for database connections
3. Use centralized CORS configuration

### Files Updated:
- ✅ `Api/conn.php`
- ✅ `Api/conn_mysqli.php`
- ✅ `Api/Database.php`
- ✅ `Api/modules/helpers.php`
- ✅ `Api/sales_api.php`
- ✅ `Api/convenience_store_api.php`
- ✅ `Api/pharmacy_api.php`
- ✅ `Api/stock_summary_api.php`
- ✅ `Api/dashboard_sales_api.php`
- ✅ `Api/dashboard_return_api.php`
- ✅ `Api/combined_reports_api.php`
- ✅ `Api/backend.php`
- ✅ `Api/backend_modular.php`
- ✅ `Api/batch_stock_adjustment_api.php`

## Troubleshooting

### Problem: "Config class not found"
**Solution:** Make sure `config.php` is in the `Api/` directory

### Problem: "Database connection failed"
**Solution:** 
1. Check `.env` file exists in project root
2. Verify database credentials in `.env` are correct
3. Ensure MySQL server is running

### Problem: CORS errors in browser console
**Solution:**
1. Update `CORS_ORIGIN` in `.env` to match your frontend URL
2. Clear browser cache
3. Restart your PHP server

### Problem: ".env file not found"
**Solution:**
```bash
cp env.example.txt .env
```
Then edit `.env` with your actual configuration

## Production Deployment Checklist

When deploying to production:

- [ ] Copy `.env.example` to `.env` on production server
- [ ] Update `.env` with production database credentials
- [ ] Set `APP_ENV=production` in `.env`
- [ ] Set `APP_DEBUG=false` in `.env`
- [ ] Update `CORS_ORIGIN` to production frontend URL
- [ ] Verify `.env` is not accessible via web browser
- [ ] Test database connection: `php Api/connection_test.php`
- [ ] Check file permissions: `.env` should be readable by web server only
- [ ] Verify `.env` is in `.gitignore`

## Support

For detailed API documentation, see: `Api/README.md`

For questions or issues:
1. Check `php_errors.log` in the project root
2. Review the API README for best practices
3. Contact the development team

---
**Version:** 2.0
**Last Updated:** October 2025
