# 🚨 CRITICAL: Deploy This NOW

## Current Problem:
Production Vercel app is calling `http://localhost/` which causes CORS errors.

## Solution - Add Environment Variable:

### Step 1: Open Vercel
1. Go to: https://vercel.com/dashboard
2. Click on `enguio.store` project
3. Go to **Settings** tab
4. Click **Environment Variables** on the left menu

### Step 2: Add Variable
Click **Add New** and add:

**Key:** `NEXT_PUBLIC_API_BASE_URL`  
**Value:** `https://enguio.shop/backend/Api`  
**Environment:** Select **Production, Preview, Development** (all)

Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click **•••** on the latest deployment
3. Click **Redeploy**

**OR** just push the code changes to git:
```bash
cd frontend
git add .
git commit -m "Fix production API URL"
git push
```

---

## Alternative: Update Code Directly

If you want to hardcode it (simpler, pero hindi best practice):

Open: `frontend/app/lib/apiConfig.js` line 50

Change:
```javascript
// OLD:
const backendUrl = 'http://your-namecheap-domain.com/backend/Api';

// NEW:
const backendUrl = 'https://enguio.shop/backend/Api';
```

Already done in latest code! Just need to deploy.

