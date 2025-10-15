# Deployment Guide

This guide covers deploying the Enguio Inventory Management System with:
- **Frontend**: Vercel
- **Backend**: Namecheap Shared Hosting

## Pre-Deployment Checklist

### ✅ Frontend (Vercel)
- [x] Build passes without errors (`npm run build`)
- [ ] Environment variables configured
- [ ] API base URL points to production backend

### ✅ Backend (Namecheap)
- [ ] Database created on hosting
- [ ] Environment variables configured (.env file)
- [ ] CORS configured for production domain
- [ ] File permissions set correctly

---

## Frontend Deployment (Vercel)

### 1. Prepare Environment Variables

Create a `.env.local` file (or set in Vercel dashboard):

```env
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/backend/Api
```

Replace `yourdomain.com` with your actual Namecheap domain.

### 2. Build Configuration

The project is already configured with:
- Next.js 15.3.5
- Build command: `npm run build`
- Output directory: `.next`
- Node version: 18.x or higher

### 3. Deploy to Vercel

**Option A: Via Vercel CLI**
```bash
cd frontend
npm install -g vercel
vercel --prod
```

**Option B: Via Vercel Dashboard**
1. Go to https://vercel.com
2. Import your GitHub/GitLab repository
3. Set the root directory to `frontend`
4. Add environment variable: `NEXT_PUBLIC_API_BASE_URL`
5. Deploy

### 4. Important Notes

- The build uses `--legacy-peer-deps` flag due to React 19 compatibility
- If deploying via Git, add this to your `package.json`:
  ```json
  "engines": {
    "node": ">=18.0.0"
  }
  ```
- For Vercel, you may need to set the install command to: `npm install --legacy-peer-deps`

---

## Backend Deployment (Namecheap Shared Hosting)

### 1. Database Setup

1. **Create MySQL Database** via cPanel:
   - Go to MySQL Databases
   - Create database: `yourusername_enguio2`
   - Create user: `yourusername_enguio`
   - Grant ALL PRIVILEGES to user
   - Note down the credentials

2. **Import Database Schema**:
   - Export your local database
   - Import via phpMyAdmin in cPanel
   - Or use MySQL command line if available

### 2. File Upload

Upload the `backend` folder to your hosting:

```
public_html/
  └── backend/
      ├── Api/
      ├── sessions/
      ├── simple_dotenv.php
      └── .env (create this)
```

**Recommended structure**:
- If main domain: `public_html/backend/`
- If subdomain: `public_html/subdomain/backend/`

### 3. Environment Configuration

Create `.env` file in `/backend/` directory:

```env
# Database Configuration (FROM CPANEL)
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=yourusername_enguio2
DB_USER=yourusername_enguio
DB_PASS=your_secure_password
DB_CHARSET=utf8mb4

# Application Environment
APP_ENV=production
APP_DEBUG=false

# API Configuration (YOUR VERCEL DOMAIN)
API_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app

# Session Configuration
SESSION_LIFETIME=3600
SESSION_NAME=ENGUIO_SESSION

# Logging
LOG_ERRORS=true
ERROR_LOG_PATH=../php_errors.log
```

**Important**: 
- Use actual database credentials from cPanel
- Set `CORS_ORIGIN` to your Vercel domain
- Set `APP_DEBUG=false` for production

### 4. File Permissions

Set correct permissions via cPanel File Manager or FTP:

```bash
# Directories
chmod 755 backend/
chmod 755 backend/Api/
chmod 777 backend/sessions/  # Must be writable

# Files
chmod 644 backend/.env
chmod 644 backend/Api/*.php
```

### 5. Configure CORS

The backend uses `cors.php` which reads from `.env`. Ensure:

1. `CORS_ORIGIN` in `.env` matches your Vercel domain
2. If you need multiple origins, modify `backend/Api/cors.php`:

```php
$allowedOrigins = [
    'https://your-vercel-app.vercel.app',
    'https://yourdomain.com',
];
```

### 6. Test Backend Endpoints

Test these URLs in your browser:

1. **Health Check**: `https://yourdomain.com/backend/Api/health.php`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Database Connection**: `https://yourdomain.com/backend/Api/backend.php?action=test_connection`
   - Should return success if DB is connected

3. **Login API**: `https://yourdomain.com/backend/Api/login.php`
   - POST test to verify it's accessible

### 7. Common Namecheap Issues & Fixes

**Issue**: "500 Internal Server Error"
- Check `.env` file exists and is readable
- Check PHP version (should be 7.4 or 8.x)
- Check error logs in cPanel

**Issue**: "Database connection failed"
- Verify database name includes cPanel username prefix
- Check if database user has privileges
- Verify `DB_HOST` is `localhost` (not 127.0.0.1)

**Issue**: "CORS errors"
- Ensure `CORS_ORIGIN` matches your Vercel domain exactly
- Check if `cors.php` is included in all API files
- Test with browser console open to see exact error

**Issue**: "Session not working"
- Ensure `sessions/` directory has 777 permissions
- Check if `session.save_path` is writable
- Verify `SESSION_NAME` is set in `.env`

### 8. PHP Configuration (if needed)

If you have access to `php.ini` or `.htaccess`:

```ini
# Increase limits if needed
memory_limit = 256M
upload_max_filesize = 20M
post_max_size = 25M
max_execution_time = 300

# Session configuration
session.gc_maxlifetime = 3600
session.cookie_httponly = 1
session.cookie_secure = 1  # Only if using HTTPS
```

---

## Post-Deployment Verification

### Frontend Checklist
- [ ] Site loads without errors
- [ ] Can navigate to all pages
- [ ] No console errors related to API calls
- [ ] Fonts load correctly
- [ ] Images display properly

### Backend Checklist
- [ ] Health endpoint responds
- [ ] Database connection works
- [ ] Login system works
- [ ] CORS allows requests from frontend
- [ ] Sessions persist correctly
- [ ] API endpoints return expected data

### Full System Test
- [ ] Can log in successfully
- [ ] Dashboard loads with data
- [ ] Can perform CRUD operations
- [ ] POS system works
- [ ] Reports generate correctly
- [ ] Inventory transfers work

---

## Security Considerations

### Production Security
1. ✅ Set `APP_DEBUG=false` in backend `.env`
2. ✅ Use strong database passwords
3. ✅ Keep `.env` files secure (not web-accessible)
4. ✅ Enable HTTPS on both frontend and backend
5. ✅ Regularly update dependencies
6. ✅ Monitor error logs
7. ✅ Implement rate limiting if possible
8. ✅ Regular database backups

### Namecheap Specific
- Keep cPanel password secure
- Enable 2FA on cPanel if available
- Regular backups via cPanel
- Monitor disk space usage
- Check PHP error logs regularly

---

## Maintenance

### Regular Tasks
- **Weekly**: Check error logs
- **Monthly**: Update dependencies (security patches)
- **Quarterly**: Review and optimize database
- **As needed**: Database backups before major changes

### Updating Code

**Frontend (Vercel)**:
1. Push changes to Git repository
2. Vercel auto-deploys (if connected to Git)
3. Or manually deploy via Vercel CLI

**Backend (Namecheap)**:
1. Upload changed files via FTP/cPanel File Manager
2. Clear any PHP opcache if available
3. Test endpoints after update

---

## Troubleshooting

### Build Errors (Frontend)

**Error**: `npm install fails`
```bash
# Solution: Use legacy peer deps
npm install --legacy-peer-deps
```

**Error**: `Google Fonts timeout`
- Already fixed in layout.js with fallback fonts
- Build should succeed even if fonts temporarily fail

**Error**: `ESLint errors preventing build`
- Check specific error messages
- Warnings won't prevent build, only errors

### API Connection Errors

**Error**: `CORS policy blocking requests`
```
Solution:
1. Check CORS_ORIGIN in backend/.env
2. Ensure it matches your Vercel domain exactly
3. Check cors.php is included in API files
```

**Error**: `API returns 404`
```
Solution:
1. Verify backend file structure on hosting
2. Check file permissions (644 for PHP files)
3. Test direct URL access to API files
```

**Error**: `Database connection failed`
```
Solution:
1. Verify credentials in .env
2. Check database name has username prefix
3. Ensure user has privileges
4. Test connection via phpMyAdmin
```

---

## Environment Variables Reference

### Frontend (Vercel)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend API URL | `https://domain.com/backend/Api` |

### Backend (Namecheap)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DB_HOST` | Yes | Database host | `localhost` |
| `DB_PORT` | Yes | Database port | `3306` |
| `DB_DATABASE` | Yes | Database name | `username_enguio2` |
| `DB_USER` | Yes | Database user | `username_enguio` |
| `DB_PASS` | Yes | Database password | `securepass123` |
| `DB_CHARSET` | Yes | Character set | `utf8mb4` |
| `APP_ENV` | Yes | Environment | `production` |
| `APP_DEBUG` | Yes | Debug mode | `false` |
| `API_URL` | Yes | Frontend URL | `https://app.vercel.app` |
| `CORS_ORIGIN` | Yes | Allowed origin | `https://app.vercel.app` |
| `SESSION_LIFETIME` | No | Session timeout | `3600` |
| `SESSION_NAME` | No | Session cookie name | `ENGUIO_SESSION` |
| `LOG_ERRORS` | No | Enable logging | `true` |
| `ERROR_LOG_PATH` | No | Log file path | `php_errors.log` |

---

## Support & Resources

### Vercel Documentation
- [Vercel Deployment](https://vercel.com/docs)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)

### Namecheap Documentation
- [cPanel File Manager](https://www.namecheap.com/support/knowledgebase/article.aspx/1098/29/how-to-use-file-manager/)
- [MySQL Databases](https://www.namecheap.com/support/knowledgebase/article.aspx/1115/29/how-to-create-a-mysql-database/)
- [PHP Configuration](https://www.namecheap.com/support/knowledgebase/article.aspx/310/11/how-to-change-php-version/)

---

## Quick Reference Commands

```bash
# Frontend - Local Build Test
cd frontend
npm install --legacy-peer-deps
npm run build

# Frontend - Deploy to Vercel
vercel --prod

# Backend - Create .env from example
cp backend/.env.example backend/.env
# Then edit with your credentials

# Test Backend Health
curl https://yourdomain.com/backend/Api/health.php

# Test Backend API
curl -X POST https://yourdomain.com/backend/Api/backend.php \
  -H "Content-Type: application/json" \
  -d '{"action":"test"}'
```

---

## Final Notes

1. **Test thoroughly** in a staging environment before production
2. **Keep backups** of both database and files
3. **Monitor logs** regularly for errors
4. **Document** any custom changes you make
5. **Update** this guide if you make infrastructure changes

Good luck with your deployment! 🚀

