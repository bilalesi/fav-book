// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'social-bookmarks-api',
      script: 'dist/index.js',
      cwd: '/opt/social-bookmarks',
      instances: 1,
      exec_mode: 'cluster',
      interpreter: 'bun',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Logging
      error_file: '/var/log/social-bookmarks/error.log',
      out_file: '/var/log/social-bookmarks/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Advanced features
      instance_var: 'INSTANCE_ID',
      
      // Cron restart (optional - restart daily at 3 AM)
      // cron_restart: '0 3 * * *',
    },
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy-user',
      host: 'api.yourdomain.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/social-bookmarks.git',
      path: '/opt/social-bookmarks',
      'post-deploy': 'bun install --production && pm2 reload ecosystem.config.js --env production',
    },
  },
};
