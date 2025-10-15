# 📚 Deployment Documentation

This directory contains all the documentation and configuration files needed to deploy your Enguio Inventory Management System.

---

## 📄 Available Documentation

### 1. **DEPLOYMENT_SUMMARY.md** - START HERE! ⭐
**Quick executive summary of deployment readiness**
- Current status of the codebase
- What was checked and fixed
- Quick start guide
- Key configuration requirements

**Read this first** to understand if you're ready to deploy.

---

### 2. **DEPLOYMENT_GUIDE.md** - Complete Reference 📖
**Comprehensive deployment instructions**
- Detailed step-by-step instructions
- Troubleshooting guide for common issues
- Security considerations
- Performance optimization tips
- Environment variables reference
- Support resources

**Use this** when actually performing the deployment.

---

### 3. **DEPLOYMENT_CHECKLIST.md** - Step-by-Step Tasks ✅
**Interactive checklist for deployment process**
- Pre-deployment verification
- Step-by-step deployment tasks
- Testing procedures
- Security hardening
- Post-deployment monitoring
- Rollback plans

**Follow this** to ensure you don't miss any critical steps.

---

## 🔧 Configuration Files

### Backend Configuration
- **backend/.env.example** - Template for backend environment variables
  - Database credentials
  - CORS configuration
  - Application settings
  - Copy to `.env` and customize

- **backend/Api/.htaccess** - Apache configuration
  - Security headers
  - File protection
  - PHP settings
  - HTTPS redirect (optional)

### Frontend Configuration
- **frontend/.env.local.example** - Template for frontend environment variables
  - API base URL configuration
  - Copy to `.env.local` for local development
  - Set in Vercel dashboard for production

---

## 🚀 Quick Deployment Path

### For Experienced Users (TL;DR)
```bash
# 1. Frontend (Vercel)
cd frontend
npm install --legacy-peer-deps
npm run build  # Verify build works
# Deploy to Vercel with env: NEXT_PUBLIC_API_BASE_URL

# 2. Backend (Namecheap)
# Upload backend/ folder to public_html/
# Create .env from .env.example
# Set sessions/ to 777 permissions
# Import database schema
```

### For First-Time Deployers
1. Read **DEPLOYMENT_SUMMARY.md** (5 min)
2. Follow **DEPLOYMENT_CHECKLIST.md** (30-45 min)
3. Refer to **DEPLOYMENT_GUIDE.md** for detailed help

---

## ✅ Pre-Deployment Verification

Before you start deploying, verify:

### Frontend
- [ ] `npm run build` completes successfully
- [ ] You have a Vercel account
- [ ] You know your backend domain URL

### Backend
- [ ] You have cPanel access to Namecheap hosting
- [ ] You have created a MySQL database
- [ ] You have database credentials ready
- [ ] You have FTP or File Manager access

---

## 🎯 Deployment Target Summary

| Component | Platform | Requirements | Estimated Time |
|-----------|----------|--------------|----------------|
| Frontend | Vercel | Vercel account, GitHub repo (optional) | 5-10 min |
| Backend | Namecheap Shared Hosting | cPanel access, MySQL database | 10-15 min |
| Testing | Both | Access to deployed URLs | 10-15 min |
| **Total** | | | **30-45 min** |

---

## 🔒 Critical Security Steps

**Do not skip these:**

1. ✅ Set `APP_DEBUG=false` in production .env
2. ✅ Use strong, unique database password
3. ✅ Limit CORS to only your actual domains
4. ✅ Verify .env files are NOT web-accessible
5. ✅ Enable HTTPS on both frontend and backend
6. ✅ Set proper file permissions (sessions/ = 777)

---

## 📊 What Was Fixed for Deployment

### Frontend Build Issues (All Fixed ✅)
- React Hook call order issues
- Duplicate JSX props
- Unescaped HTML entities
- Google Fonts configuration
- ESLint critical errors

### Backend Configuration (All Ready ✅)
- Environment variable templates created
- .htaccess security configuration
- CORS properly configured
- Session management ready
- Error logging configured

---

## 🧪 Testing Endpoints

After deployment, test these URLs:

### Backend Health Check
```
https://yourdomain.com/backend/Api/health.php
Expected: {"status":"ok","timestamp":"..."}
```

### Frontend Access
```
https://your-app.vercel.app
Expected: Login page loads
```

### CORS Test
```bash
curl -I -X OPTIONS https://yourdomain.com/backend/Api/backend.php \
  -H "Origin: https://your-app.vercel.app"
Expected: Access-Control-Allow-Origin header present
```

---

## 🆘 Troubleshooting Quick Reference

### Issue: Frontend build fails
**Solution**: Use `npm install --legacy-peer-deps`

### Issue: Backend 500 error
**Check**: 
1. .env file exists and is readable
2. Database credentials are correct
3. PHP version is 7.4 or higher

### Issue: CORS errors
**Check**: 
1. CORS_ALLOWED_ORIGINS in .env includes your Vercel domain
2. Domain includes https:// prefix
3. No trailing slashes

### Issue: Database connection fails
**Check**: 
1. Database name includes cPanel username prefix
2. User has privileges on database
3. Credentials match exactly

For detailed troubleshooting, see **DEPLOYMENT_GUIDE.md**.

---

## 📞 Support Resources

### Documentation
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Namecheap KB: https://www.namecheap.com/support/

### Get Help
- Vercel Support: https://vercel.com/support
- Namecheap Support: Live chat 24/7 via cPanel
- PHP Issues: Check cPanel error logs

---

## 🔄 Update Process

### Updating Frontend
```bash
# Make changes locally
npm run build  # Test locally
git push       # If using Git-based deployment
# Or use: vercel --prod
```

### Updating Backend
```bash
# Upload changed files via FTP/cPanel
# Clear PHP opcache if available
# Monitor error logs after update
```

---

## 📝 Environment Variables Reference

### Required Frontend Variables
```env
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/backend/Api
```

### Required Backend Variables
```env
DB_HOST=localhost
DB_DATABASE=username_enguio2
DB_USER=username_enguio
DB_PASS=your_secure_password
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
APP_ENV=production
APP_DEBUG=false
```

See `.env.example` files for complete list.

---

## 🎓 Best Practices

### Before Deployment
- ✅ Test build locally
- ✅ Backup current data
- ✅ Document any custom changes
- ✅ Have rollback plan ready

### During Deployment
- ✅ Deploy during low-traffic period
- ✅ Test each step before proceeding
- ✅ Keep original files as backup
- ✅ Monitor error logs

### After Deployment
- ✅ Verify all functionality works
- ✅ Monitor logs for first 24-48 hours
- ✅ Schedule regular backups
- ✅ Document any issues encountered

---

## 🎯 Success Criteria

Your deployment is successful when:

- [ ] Frontend loads without errors
- [ ] Backend health check returns OK
- [ ] Login works correctly
- [ ] Dashboard displays data
- [ ] All API calls succeed
- [ ] No CORS errors in console
- [ ] Sessions persist correctly
- [ ] All features functional

---

## 📅 Maintenance Schedule

### Daily (First Week)
- Check error logs
- Monitor performance
- Verify all features working

### Weekly
- Review error logs
- Check disk space
- Verify backups

### Monthly
- Security updates
- Database optimization
- Performance review

---

## 🏁 Ready to Deploy?

1. **Read** DEPLOYMENT_SUMMARY.md (if you haven't)
2. **Prepare** your credentials and access
3. **Follow** DEPLOYMENT_CHECKLIST.md
4. **Refer** to DEPLOYMENT_GUIDE.md when needed
5. **Test** thoroughly after deployment
6. **Monitor** for the first week

---

## 📌 Quick Links

- [Deployment Summary](./DEPLOYMENT_SUMMARY.md) - Quick overview
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Detailed instructions
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Step-by-step tasks
- [Backend .env Example](./backend/.env.example) - Backend configuration
- [Frontend .env Example](./frontend/.env.local.example) - Frontend configuration

---

**Everything is ready for deployment. Good luck! 🚀**

*Need help? Start with DEPLOYMENT_SUMMARY.md, then follow DEPLOYMENT_CHECKLIST.md*

---

*Last Updated: October 15, 2025*

