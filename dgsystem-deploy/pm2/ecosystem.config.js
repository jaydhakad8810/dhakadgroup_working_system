// PM2 Ecosystem Config
// File: /var/www/dgsystem/ecosystem.config.js
// Run: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'dgsystem-api',
      script: './server/src/index.js',
      cwd: '/var/www/dgsystem',
      instances: 'max',          // Use all CPU cores
      exec_mode: 'cluster',      // Cluster mode for load balancing
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Logging
      error_file: '/var/log/dgsystem/error.log',
      out_file:   '/var/log/dgsystem/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Auto-restart on crash
      autorestart: true,
      restart_delay: 4000,
      max_restarts: 10,
    }
  ]
}
