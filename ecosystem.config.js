module.exports = {
  apps: [{
    name: 'currenttimecontrol',
    script: 'server/server.js',
    cwd: '/root/currentTimeControl',
    env: {
      PORT: 3002,
      JWT_SECRET: 'patriciadmin-timecontrol-secret-key-2025',
      DATABASE_PATH: './production.sqlite',
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://patriciadmin.site',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION: 15
    }
  }]
};
