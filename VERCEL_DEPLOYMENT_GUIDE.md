# Vercel Deployment Guide - Fixing Production Errors

## Current Issue
The production app on `enguiostore.vercel.app` is crashing because:
1. It's trying to call `http://localhost/caps2w2/backend/Api` (which doesn't exist online)
2. Missing environment variable `NEXT_PUBLIC_API_BASE_URL` in Vercel

## How to Fix

### Step 1: Add Environment Variable in Vercel

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your project (`enguiostore` or similar)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add these variables:

```
Name: NEXT_PUBLIC_API_BASE_URL
Value: https://your-namecheap-domain.com/backend/Api
```

**Replace `your-namecheap-domain.com` with your actual backend domain**

### Step 2: Check Your Backend is Deployed

Your backend should be deployed to Namecheap at:
- URL: `https://your-namecheap-domain.com/backend/Api`
- Ensure it's accessible and returns JSON responses
- Ensure CORS is configured to allow `https://enguiostore.vercel.app`

### Step 3: Redeploy

1. In Vercel, go to **Deployments**
2. Click the **•••** menu on the latest deployment
3. Click **Redeploy**

OR

1. Just push a new commit to trigger a new deployment

### Step 4: Verify

After redeploying, check the browser console:
- Should see: `✅ Using configured API URL: https://your-domain.com/backend/Api`
- Should NOT see: `❌ CRITICAL: NEXT_PUBLIC_API_BASE_URL not set`

## Troubleshooting

### If you don't have a backend URL yet:
You need to deploy the backend first. The backend folder contains PHP files that need to be uploaded to your Namecheap hosting.

### Common Errors:

**Error: "toFixed is not a function"**
- This is fixed by the latest code (safety checks added)
- Will be resolved after redeploy

**Error: "CORS policy" blocks requests**
- Check that your backend CORS settings allow `https://enguiostore.vercel.app`
- Check the `backend/Api/cors.php` file

**Error: "MISSING-BACKEND-URL"**
- Add the environment variable as described above
- Redeploy

## Environment Variables Checklist

Before deploying to Vercel, ensure these are set:

- [ ] `NEXT_PUBLIC_API_BASE_URL` - Your backend API URL

Optional but recommended:
- [ ] Any other API keys or secrets
- [ ] Database connection strings (if needed by frontend)

## Testing Locally vs Production

- **Localhost**: Uses `http://localhost/caps2w2/backend/Api` (your XAMPP)
- **Vercel Production**: Uses environment variable (needs to be configured)

Both should work the same way, just different URLs!

