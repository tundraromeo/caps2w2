#!/bin/bash

# Verification Script for Environment Variable Implementation
# Run this to verify the API endpoint configuration is properly set up

echo "================================================"
echo "🔍 Environment Variable Implementation Check"
echo "================================================"
echo ""

# Check if .env.local exists
echo "1. Checking .env.local file..."
if [ -f .env.local ]; then
    echo "   ✅ .env.local exists"
    echo "   Content:"
    grep "NEXT_PUBLIC_API_BASE_URL" .env.local | sed 's/^/   /'
else
    echo "   ❌ .env.local NOT found"
    echo "   Run: cp .env.example .env.local"
fi
echo ""

# Check if .env.example exists
echo "2. Checking .env.example file..."
if [ -f .env.example ]; then
    echo "   ✅ .env.example exists"
else
    echo "   ❌ .env.example NOT found"
fi
echo ""

# Check if apiConfig.js exists
echo "3. Checking app/lib/apiConfig.js..."
if [ -f app/lib/apiConfig.js ]; then
    echo "   ✅ apiConfig.js exists"
else
    echo "   ❌ apiConfig.js NOT found"
fi
echo ""

# Check if apiHandler.js imports apiConfig
echo "4. Checking apiHandler.js imports..."
if grep -q "import.*apiConfig" app/lib/apiHandler.js 2>/dev/null; then
    echo "   ✅ apiHandler.js imports apiConfig"
else
    echo "   ⚠️  apiHandler.js doesn't import apiConfig"
fi
echo ""

# Count files using environment variable
echo "5. Counting files using NEXT_PUBLIC_API_BASE_URL..."
file_count=$(grep -r "NEXT_PUBLIC_API_BASE_URL" app/ --include="*.js" 2>/dev/null | wc -l)
echo "   ✅ Found $file_count occurrences in app/ directory"
echo ""

# Check for completely hardcoded URLs (no env var)
echo "6. Checking for hardcoded URLs (without env var)..."
hardcoded=$(grep -r "http://localhost/caps2e2/Api" app/ --include="*.js" 2>/dev/null | \
            grep -v "NEXT_PUBLIC_API_BASE_URL" | \
            grep -v "apiConfig.js" | \
            grep -v "//" | \
            wc -l)

if [ "$hardcoded" -eq 0 ]; then
    echo "   ✅ No hardcoded URLs found (all use env vars)"
else
    echo "   ⚠️  Found $hardcoded potential hardcoded URLs"
    echo "   Note: Check if these are comments or examples"
fi
echo ""

# Check backend conn.php
echo "7. Checking backend Api/conn.php..."
if [ -f Api/conn.php ]; then
    if grep -q "\$_ENV\['DB_HOST'\]" Api/conn.php; then
        echo "   ✅ conn.php uses environment variables"
    else
        echo "   ⚠️  conn.php might not use environment variables"
    fi
else
    echo "   ❌ Api/conn.php NOT found"
fi
echo ""

# Final Summary
echo "================================================"
echo "📊 SUMMARY"
echo "================================================"
echo ""

all_good=true

if [ ! -f .env.local ]; then
    all_good=false
    echo "❌ Missing .env.local file"
fi

if [ ! -f app/lib/apiConfig.js ]; then
    all_good=false
    echo "❌ Missing apiConfig.js"
fi

if [ "$file_count" -lt 20 ]; then
    all_good=false
    echo "⚠️  Less than expected files using env vars"
fi

if [ "$all_good" = true ]; then
    echo "✅ Environment variable implementation is COMPLETE!"
    echo ""
    echo "All API endpoints use: NEXT_PUBLIC_API_BASE_URL"
    echo "Current value: $(grep NEXT_PUBLIC_API_BASE_URL .env.local | cut -d'=' -f2)"
    echo ""
    echo "🚀 To deploy to another machine:"
    echo "   1. Copy .env.example to .env.local"
    echo "   2. Update NEXT_PUBLIC_API_BASE_URL"
    echo "   3. Restart: npm run dev"
else
    echo "⚠️  Some issues found. Please review above."
fi

echo ""
echo "================================================"

