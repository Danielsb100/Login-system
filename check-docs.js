const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const docs = await prisma.document.findMany({ select: { id: true, fileName: true, type: true } });
    console.log("Documents in DB:");
    docs.forEach(d => console.log(`- ID: ${d.id}, File: ${d.fileName}, Type: ${d.type}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
