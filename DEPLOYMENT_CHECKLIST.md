# 🚀 Deployment Checklist

## Pre-Deployment Status

### ✅ Frontend (Vercel) - READY
- [x] **Build Status**: `npm run build` completes successfully
- [x] **Dependencies**: All dependencies install with `--legacy-peer-deps`
- [x] **Build Output**: Static pages generated successfully
- [x] **Font Configuration**: Fallback fonts configured for Google Fonts
- [x] **ESLint**: All critical errors fixed (only warnings remain)
- [x] **Build Time**: ~3 minutes
- [x] **Next.js Version**: 15.3.5
- [ ] **Environment Variables**: Need to configure `NEXT_PUBLIC_API_BASE_URL`
- [ ] **Vercel Project**: Need to create/configure

**Frontend Deployment Notes**:
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm run build`
- Output directory: `.next`
- Framework: Next.js
- Node version: >=18.0.0

---

### ✅ Backend (Namecheap) - READY (with configuration needed)
- [x] **PHP Version**: Requires PHP 7.4 or higher
- [x] **Database**: Uses PDO and MySQLi (both supported on shared hosting)
- [x] **CORS Configuration**: Properly configured with environment variables
- [x] **Error Handling**: Production-ready with error logging
- [x] **Session Management**: Configured with custom session directory
- [x] **.htaccess**: Created with security configurations
- [x] **Environment Variables**: `.env.example` file created
- [ ] **Database**: Need to create and import schema
- [ ] **.env File**: Need to configure with production credentials
- [ ] **File Upload**: Need to upload files to hosting
- [ ] **Permissions**: Need to set correct file permissions

**Backend Deployment Notes**:
- Upload location: `public_html/backend/`
- Session directory: `backend/sessions/` (needs 777 permissions)
- Database: MySQL 5.7+ or MariaDB
- Composer dependencies: Optional (using SimpleDotEnv as fallback)

---

## Deployment Steps

### 📦 Step 1: Prepare Backend Files

#### 1.1 Upload Files to Namecheap
```bash
# Via FTP or cPanel File Manager, upload:
backend/
├── Api/          (all PHP files and subdirectories)
├── sessions/     (ensure this is writable)
├── simple_dotenv.php
└── .env          (create from .env.example)
```

#### 1.2 Create .env File
Location: `/public_html/backend/.env`

```env
# Database Configuration (FROM CPANEL)
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=username_enguio2
DB_USER=username_enguio
DB_PASS=your_secure_password_here
DB_CHARSET=utf8mb4

# Application Environment
APP_ENV=production
APP_DEBUG=false

# API Configuration
API_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app

# CORS Allowed Origins (comma-separated)
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://yourdomain.com

# Session Configuration
SESSION_LIFETIME=3600
SESSION_NAME=ENGUIO_SESSION

# Logging
LOG_ERRORS=true
ERROR_LOG_PATH=../php_errors.log
```

**Important**: Replace:
- `username_enguio2` with your actual cPanel database name
- `username_enguio` with your actual database user
- `your_secure_password_here` with your database password
- `your-vercel-app.vercel.app` with your actual Vercel domain
- `yourdomain.com` with your Namecheap domain

#### 1.3 Set File Permissions
Via cPanel File Manager or FTP:
```bash
# Directories
chmod 755 backend/
chmod 755 backend/Api/
chmod 777 backend/sessions/  # Must be writable for PHP sessions

# Files
chmod 644 backend/.env
chmod 644 backend/Api/*.php
chmod 644 backend/Api/.htaccess
```

#### 1.4 Create Database
1. Login to cPanel
2. Go to MySQL Databases
3. Create database: `username_enguio2`
4. Create user: `username_enguio` with strong password
5. Add user to database with ALL PRIVILEGES
6. Import your database schema via phpMyAdmin

---

### 🌐 Step 2: Deploy Frontend to Vercel

#### 2.1 Option A: Deploy via GitHub
1. Push code to GitHub repository
2. Go to https://vercel.com/new
3. Import your repository
4. Configure project:
   - **Framework**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install --legacy-peer-deps`
   - **Output Directory**: `.next`

5. Add Environment Variable:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/backend/Api
   ```

6. Deploy!

#### 2.2 Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to frontend directory
cd frontend

# Create .env.local file
echo "NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/backend/Api" > .env.local

# Deploy to production
vercel --prod
```

---

### 🧪 Step 3: Test Deployment

#### 3.1 Backend Tests
Run these tests in order:

**Test 1: Health Check**
```bash
curl https://yourdomain.com/backend/Api/health.php
```
Expected: `{"status":"ok","timestamp":"..."}`

**Test 2: Database Connection**
```bash
curl -X POST https://yourdomain.com/backend/Api/backend.php \
  -H "Content-Type: application/json" \
  -d '{"action":"test_connection"}'
```
Expected: `{"success":true, ...}`

**Test 3: CORS Headers**
```bash
curl -I -X OPTIONS https://yourdomain.com/backend/Api/backend.php \
  -H "Origin: https://your-vercel-app.vercel.app"
```
Expected: Should see `Access-Control-Allow-Origin` header

**Test 4: Login Endpoint**
Visit: `https://yourdomain.com/backend/Api/login.php`
Expected: Should return JSON (not 404)

#### 3.2 Frontend Tests
1. Visit your Vercel URL: `https://your-vercel-app.vercel.app`
2. Check browser console for errors
3. Try to login (should connect to backend)
4. Check Network tab for API calls
5. Verify data loads correctly

---

### 🔒 Step 4: Security Hardening

#### 4.1 Backend Security
- [ ] Verify `.env` file is NOT web-accessible (try accessing directly)
- [ ] Set `APP_DEBUG=false` in production `.env`
- [ ] Verify `display_errors=Off` in PHP configuration
- [ ] Check error logs location is outside web root
- [ ] Enable HTTPS redirect in `.htaccess` (uncomment lines)
- [ ] Review and limit CORS_ALLOWED_ORIGINS to only your domains

#### 4.2 Database Security
- [ ] Use strong database password (16+ characters)
- [ ] Database user has only necessary privileges
- [ ] Regular backups configured (via cPanel)
- [ ] Remove any test/demo accounts

#### 4.3 Session Security
- [ ] Session cookies set to `httponly` and `secure`
- [ ] Session lifetime appropriate (default: 3600 seconds)
- [ ] Session storage directory not web-accessible

---

## Post-Deployment Monitoring

### Daily Checks (First Week)
- [ ] Check error logs: `public_html/php_errors.log`
- [ ] Monitor application performance
- [ ] Verify all features working
- [ ] Check for any CORS errors
- [ ] Monitor database performance

### Weekly Maintenance
- [ ] Review error logs
- [ ] Check disk space usage
- [ ] Verify backups are working
- [ ] Test critical user flows

### Monthly Tasks
- [ ] Security updates check
- [ ] Database optimization
- [ ] Performance review
- [ ] Backup verification

---

## Troubleshooting Guide

### Issue: Build fails on Vercel
**Solution**:
```bash
# Test build locally first
cd frontend
npm install --legacy-peer-deps
npm run build

# If successful locally, set Vercel install command to:
npm install --legacy-peer-deps
```

### Issue: 500 Internal Server Error on Backend
**Possible Causes**:
1. `.env` file missing or incorrect
2. Database credentials wrong
3. PHP version incompatible (need 7.4+)
4. File permissions incorrect

**Debug Steps**:
1. Check cPanel error logs
2. Verify `.env` file exists and is readable
3. Test database connection via phpMyAdmin
4. Check PHP version in cPanel (Select PHP Options)

### Issue: CORS Errors
**Solution**:
1. Verify `CORS_ALLOWED_ORIGINS` in backend `.env` includes your Vercel domain
2. Check if domain has `https://` prefix
3. Test CORS headers with curl (see Step 3.1, Test 3)
4. Verify no trailing slashes in URLs

### Issue: Database Connection Failed
**Possible Causes**:
1. Wrong database credentials
2. Database name doesn't include username prefix
3. User not granted privileges
4. Database server not running

**Debug Steps**:
1. Go to phpMyAdmin and try to login with credentials
2. Verify database name format: `username_databasename`
3. Check user privileges in MySQL Databases panel
4. Contact hosting support if persists

### Issue: Session Not Persisting
**Solution**:
1. Check `sessions/` directory has 777 permissions
2. Verify `session.save_path` in PHP configuration
3. Check if `SESSION_NAME` is set in `.env`
4. Clear browser cookies and try again

---

## Rollback Plan

### If Frontend Deployment Fails
1. Revert to previous Vercel deployment in dashboard
2. Check deployment logs for errors
3. Fix issues and redeploy

### If Backend Deployment Fails
1. Keep backup of original files
2. Restore `.env` file from backup
3. Check database backup if needed
4. Review error logs to identify issue

---

## Performance Optimization

### Backend Optimization
- Enable OPcache if available (cPanel PHP Options)
- Optimize database queries
- Enable compression in `.htaccess`
- Monitor slow query log

### Frontend Optimization
- Vercel automatically optimizes:
  - Image optimization
  - CDN distribution
  - Caching
  - Compression

---

## Support Resources

### Vercel Support
- Documentation: https://vercel.com/docs
- Community: https://github.com/vercel/next.js/discussions
- Support: support@vercel.com (paid plans)

### Namecheap Support
- Knowledge Base: https://www.namecheap.com/support/
- Live Chat: Available 24/7
- Ticket System: Via cPanel

---

## Quick Reference

### Frontend URLs
- Development: `http://localhost:3000`
- Production: `https://your-vercel-app.vercel.app`

### Backend URLs
- Development: `http://localhost/caps2w2/backend/Api`
- Production: `https://yourdomain.com/backend/Api`

### Important Files
- Frontend env: `frontend/.env.local`
- Backend env: `backend/.env`
- Backend htaccess: `backend/Api/.htaccess`
- Error logs: `php_errors.log`

### Key Commands
```bash
# Frontend build test
cd frontend && npm run build

# Backend health check
curl https://yourdomain.com/backend/Api/health.php

# Vercel deployment
cd frontend && vercel --prod
```

---

## ✅ Final Checklist Before Going Live

- [ ] All backend files uploaded
- [ ] Database created and schema imported
- [ ] `.env` file configured with production values
- [ ] File permissions set correctly (especially sessions/)
- [ ] Backend health check passes
- [ ] Database connection test passes
- [ ] Frontend deployed to Vercel
- [ ] Frontend environment variable set
- [ ] Frontend can reach backend API
- [ ] Login works end-to-end
- [ ] CORS configured correctly
- [ ] Error logging working
- [ ] Sessions working
- [ ] HTTPS enabled on both frontend and backend
- [ ] Security headers configured
- [ ] Backups scheduled
- [ ] Monitoring set up

---

## 🎉 Congratulations!

Your Enguio Inventory Management System should now be deployed and running!

**Next Steps**:
1. Inform your team of the new URLs
2. Update any bookmarks
3. Monitor for the first few days
4. Schedule regular maintenance

For issues or questions, refer to the DEPLOYMENT_GUIDE.md for detailed instructions.

