# Backend (PHP) - Deploy to Namecheap

This is the backend API part of the application.

## Setup
1. Upload `Api/` folder to your web server (e.g., `public_html/Api/`).
2. Create `.env` file in `Api/` with database credentials.
3. Ensure PHP 7.4+ with PDO enabled.

## Deployment
- Deploy to Namecheap shared hosting.
- Set CORS_ALLOWED_ORIGINS to your frontend URL.

## Testing
- Access `https://your-domain.com/Api/health.php` to check connectivity.

## Notes
- Frontend must be deployed separately.