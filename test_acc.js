require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

try {
  console.log("Testing with accelerateUrl:", process.env.DATABASE_URL);
  const prisma = new PrismaClient({ accelerateUrl: process.env.DATABASE_URL });
  
  prisma.user.findFirst()
    .then(() => {
        console.log("Success with accelerateUrl");
        process.exit(0);
    })
    .catch((err) => {
        console.error("Error with accelerateUrl:", err.message);
        process.exit(1);
    });
} catch (err) {
  console.error("Sync error:", err.message);
}
