#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# DGSystem Manual Deploy Script
# Run on your VPS: bash deploy.sh
# ═══════════════════════════════════════════════════════════════

set -e
APP_DIR="/var/www/dgsystem"
echo "🚀 Deploying DGSystem..."

# ── Pull latest code ───────────────────────────────────────────
cd $APP_DIR
git pull origin main
echo "✅ Code updated"

# ── Deploy Backend ─────────────────────────────────────────────
echo "📦 Installing backend dependencies..."
cd $APP_DIR/server
npm install --production

echo "🔄 Restarting API server..."
pm2 restart dgsystem-api --update-env || pm2 start ecosystem.config.js --env production
pm2 save
echo "✅ Backend deployed on port 5000"

# ── Build & Deploy Admin Panel ─────────────────────────────────
echo "🏗️ Building Admin Panel..."
cd $APP_DIR/admin-panel
npm install
npm run build
rm -rf /var/www/dgsystem/admin/dist
cp -r dist /var/www/dgsystem/admin/
echo "✅ Admin Panel deployed → admin.dhakadgroup.in"

# ── Build & Deploy Supervisor PWA ─────────────────────────────
echo "🏗️ Building Supervisor PWA..."
cd $APP_DIR/supervisor-pwa
npm install
npm run build
rm -rf /var/www/dgsystem/supervisor/dist
cp -r dist /var/www/dgsystem/supervisor/
echo "✅ Supervisor PWA deployed → supervisor.dhakadgroup.in"

# ── Build & Deploy Driver PWA ──────────────────────────────────
echo "🏗️ Building Driver PWA..."
cd $APP_DIR/driver-pwa
npm install
npm run build
rm -rf /var/www/dgsystem/driver/dist
cp -r dist /var/www/dgsystem/driver/
echo "✅ Driver PWA deployed → driver.dhakadgroup.in"

# ── Deploy Landing Page ────────────────────────────────────────
cp $APP_DIR/landing/index.html /var/www/html/index.html
echo "✅ Landing page deployed → dhakadgroup.in"

# ── Reload Nginx ───────────────────────────────────────────────
nginx -t && systemctl reload nginx
echo "✅ Nginx reloaded"

echo ""
echo "═══════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════"
echo "  🌐 Landing:    https://dhakadgroup.in"
echo "  👑 Admin:      https://admin.dhakadgroup.in"
echo "  👷 Supervisor: https://supervisor.dhakadgroup.in"
echo "  🚛 Driver:     https://driver.dhakadgroup.in"
echo "  🔌 API:        https://api.dhakadgroup.in"
echo ""
pm2 status
