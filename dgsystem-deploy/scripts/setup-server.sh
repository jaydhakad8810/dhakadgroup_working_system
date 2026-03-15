#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# DGSystem — One-Time VPS Setup Script for Hostinger
# Run as root: bash setup-server.sh
# ═══════════════════════════════════════════════════════════════

set -e
echo "🚀 Starting DGSystem VPS Setup..."

# ── 1. Update system ───────────────────────────────────────────
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git unzip nginx certbot python3-certbot-nginx

# ── 2. Install Node.js 18 ──────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node -v && npm -v
echo "✅ Node.js installed"

# ── 3. Install PostgreSQL 15 ───────────────────────────────────
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Create database and user
sudo -u postgres psql << 'SQL'
CREATE DATABASE dhakadgroup;
ALTER USER postgres WITH PASSWORD 'admin123';
\q
SQL
echo "✅ PostgreSQL setup done"

# ── 4. Install PM2 ─────────────────────────────────────────────
npm install -g pm2
pm2 startup systemd -u root --hp /root
echo "✅ PM2 installed"

# ── 5. Create directories ──────────────────────────────────────
mkdir -p /var/www/dgsystem/{admin/dist,supervisor/dist,driver/dist,server}
mkdir -p /var/www/html
mkdir -p /var/log/dgsystem
chown -R www-data:www-data /var/www/dgsystem
chmod -R 755 /var/www/dgsystem
echo "✅ Directories created"

# ── 6. Configure Nginx ─────────────────────────────────────────
cp /tmp/dgsystem.conf /etc/nginx/sites-available/dgsystem
ln -sf /etc/nginx/sites-available/dgsystem /etc/nginx/sites-enabled/dgsystem
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "✅ Nginx configured"

# ── 7. Setup firewall ──────────────────────────────────────────
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "✅ Firewall configured"

# ── 8. Get SSL certificates ────────────────────────────────────
echo "Getting SSL certificates..."
certbot --nginx -d dhakadgroup.in -d www.dhakadgroup.in --non-interactive --agree-tos -m dgsystem8810@gmail.com
certbot --nginx -d admin.dhakadgroup.in --non-interactive --agree-tos -m dgsystem8810@gmail.com
certbot --nginx -d supervisor.dhakadgroup.in --non-interactive --agree-tos -m dgsystem8810@gmail.com
certbot --nginx -d driver.dhakadgroup.in --non-interactive --agree-tos -m dgsystem8810@gmail.com
certbot --nginx -d api.dhakadgroup.in --non-interactive --agree-tos -m dgsystem8810@gmail.com
echo "✅ SSL certificates obtained"

# Auto-renew SSL
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
echo "✅ SSL auto-renewal configured"

echo ""
echo "═══════════════════════════════════════════"
echo "✅ VPS SETUP COMPLETE!"
echo "═══════════════════════════════════════════"
echo "Next: Upload your code and run deploy.sh"
