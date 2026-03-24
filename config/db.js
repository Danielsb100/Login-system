const { PrismaClient } = require('@prisma/client');
const connectionString = process.env.DATABASE_URL || '';

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
