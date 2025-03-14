module.exports = {
    apps: [{
      name: 'planejador-frontend',
      script: 'node',
      args: '/usr/bin/serve build -s -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html'
      },
      error_file: 'logs/frontend-err.log',
      out_file: 'logs/frontend-out.log',
      log_file: 'logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }]
  };
  