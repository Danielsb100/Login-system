require('dotenv').config();
const path = require('path');

const DEFAULT_UPLOAD_MAX_FILE_SIZE_MB = 500;
const LEGACY_DEFAULT_JWT_SECRET = 'supersecretkey';
const LEGACY_DEFAULT_MASTER_PASSWORD = 'master123';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parseCsv = (value) => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const maxFileSizeMb = parsePositiveInt(
  process.env.UPLOAD_MAX_FILE_SIZE_MB,
  DEFAULT_UPLOAD_MAX_FILE_SIZE_MB
);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePositiveInt(process.env.PORT, 3000),
  database: {
    url: process.env.DATABASE_URL || ''
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || LEGACY_DEFAULT_JWT_SECRET,
    tokenExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    passwordResetTokenTtlMinutes: parsePositiveInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 30),
    requireEmailVerification: parseBoolean(process.env.REQUIRE_EMAIL_VERIFICATION, true)
  },
  mail: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'Support Team',
    enabled: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)
  },
  cors: {
    origins: parseCsv(process.env.CORS_ORIGIN)
  },
  public: {
    apiBaseUrl: process.env.PUBLIC_API_BASE_URL || '',
    multiplayerUrl: process.env.PUBLIC_MULTIPLAYER_URL || '',
    loginUrl: process.env.PUBLIC_LOGIN_URL || ''
  },
  upload: {
    maxFileSizeMb,
    maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
    storageProvider: process.env.UPLOAD_STORAGE_PROVIDER || 'local',
    storageDir: process.env.UPLOAD_STORAGE_DIR || path.join(__dirname, '..', 'var', 'storage', 'uploads'),
    tempDir: process.env.UPLOAD_TEMP_DIR || path.join(__dirname, '..', 'var', 'storage', 'tmp')
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    quizModel: process.env.OPENAI_QUIZ_MODEL || 'gpt-5.4',
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT || 'low'
  },
  seed: {
    autoSeedMaster: parseBoolean(process.env.ENABLE_AUTO_SEED_MASTER, true),
    masterUser: {
      username: process.env.MASTER_USERNAME || 'admin',
      email: process.env.MASTER_EMAIL || 'admin@master.com',
      password: process.env.MASTER_PASSWORD || LEGACY_DEFAULT_MASTER_PASSWORD
    }
  }
};

const warnings = [];

if (!env.database.url) {
  warnings.push('DATABASE_URL is not set. Database-dependent routes will fail until it is configured.');
}

if (env.auth.jwtSecret === LEGACY_DEFAULT_JWT_SECRET) {
  warnings.push('JWT_SECRET is using the legacy default. Configure a strong secret before production.');
}

if (!env.mail.enabled) {
  warnings.push('EMAIL_USER/EMAIL_PASS are not configured. Verification emails are currently disabled.');
}

if (!env.auth.requireEmailVerification) {
  warnings.push('REQUIRE_EMAIL_VERIFICATION is disabled. Unverified users can access the platform.');
}

if (env.seed.autoSeedMaster && env.seed.masterUser.password === LEGACY_DEFAULT_MASTER_PASSWORD) {
  warnings.push('MASTER_PASSWORD is using the default seed credential.');
}

env.meta = { warnings };

module.exports = Object.freeze(env);
