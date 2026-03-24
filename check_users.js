const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    const users = await prisma.user.findMany({
        select: { id: true, username: true }
    });
    console.log("Current Users in DB:");
    users.forEach(u => {
        console.log(`ID: ${u.id} | username: '${u.username}' | length: ${u.username.length}`);
    });
    process.exit(0);
}

checkUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
