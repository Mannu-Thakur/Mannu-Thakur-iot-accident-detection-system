/**
 * Application Configuration
 * Loads and validates environment variables
 */
require('dotenv').config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/perseva',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Device Authentication
  device: {
    apiKeySalt: process.env.DEVICE_API_KEY_SALT || 'dev-salt',
  },

  // Live Access
  liveAccess: {
    windowSeconds: parseInt(process.env.LIVE_ACCESS_WINDOW_SECONDS, 10) || 60,
    streamTokenExpiresSeconds: parseInt(process.env.STREAM_TOKEN_EXPIRES_SECONDS, 10) || 300,
  },

  // AI Service
  ai: {
    enabled: process.env.AI_ENABLED === 'true',
    serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:5000/analyze',
  },

  // SMS (Twilio)
  sms: {
    enabled: process.env.SMS_ENABLED === 'true',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // Email
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Heartbeat
  heartbeat: {
    intervalSeconds: parseInt(process.env.HEARTBEAT_INTERVAL_SECONDS, 10) || 30,
    staleThresholdMultiplier: parseInt(process.env.HEARTBEAT_STALE_THRESHOLD_MULTIPLIER, 10) || 3,
  },

  // Severity
  severity: {
    autoDispatchThreshold: parseInt(process.env.AUTO_DISPATCH_SEVERITY_THRESHOLD, 10) || 4,
  },

  // File Upload
  upload: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
    dir: process.env.UPLOAD_DIR || './uploads',
  },
};

// Validate critical config in production
if (config.env === 'production') {
  const requiredVars = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = config;
