# Caps2E2 - Separated Frontend and Backend

This repository contains the separated codebase for deployment.

## Structure
- `frontend/`: Next.js application for Vercel deployment.
- `backend/`: PHP API for Namecheap deployment.

## Deployment
1. Deploy `frontend/` to Vercel.
2. Deploy `backend/Api/` to Namecheap.
3. Set environment variables as per each README.

## Development
- For local dev, run frontend and backend separately.
- Ensure backend is accessible for frontend API calls.