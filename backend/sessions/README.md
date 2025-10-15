# PHP Session Storage

This directory is used to store PHP session files.

## Why This Directory?

XAMPP's default session storage path (`C:\xampp\tmp`) sometimes has permission issues on Windows. This directory provides a reliable alternative with proper write permissions.

## Configuration

Sessions are configured in `backend/Api/backend.php`:
```php
$sessionPath = __DIR__ . '/../../sessions';
session_save_path($sessionPath);
```

## Security

- Session files contain sensitive user data
- This directory is **NOT** committed to git (see `.gitignore`)
- Ensure proper file permissions are set (folder should be writable by the web server)

## Cleanup

Session files are automatically cleaned up by PHP's garbage collection. Old session files (older than `session.gc_maxlifetime` in php.ini) are removed automatically.

## Troubleshooting

If you see session-related errors:
1. Verify this directory exists
2. Check that it's writable by the web server
3. Check PHP error logs for details

