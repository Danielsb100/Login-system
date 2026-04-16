const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const connectionString = env.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to initialize Prisma.');
}

let prisma;

if (connectionString.startsWith('prisma')) {
  // Prisma Postgres or Accelerate URL
  prisma = new PrismaClient({ accelerateUrl: connectionString });
} else {
  // Standard direct database connection
  const { Pool } = require('pg');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

module.exports = prisma;
