export const config = {
  port: Number(process.env.PORT || process.env.API_PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
};
