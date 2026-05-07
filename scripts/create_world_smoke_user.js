const bcrypt=require('bcrypt');
const prisma=require('../config/db');
(async()=>{
 const email='friday-world-smoke@example.local';
 const password='SmokeTest123!';
 const password_hash=await bcrypt.hash(password,10);
 let user=await prisma.user.findUnique({where:{email}}).catch(()=>null);
 if(user){
   user=await prisma.user.update({where:{email},data:{password_hash,isVerified:true,role:'USER'}});
 } else {
   user=await prisma.user.create({data:{username:'Friday World Smoke',email,password_hash,isVerified:true,role:'USER',verificationCode:'000000'}});
 }
 console.log(JSON.stringify({email,password,user:{id:user.id,username:user.username,email:user.email,role:user.role,isVerified:user.isVerified}},null,2));
 await prisma.$disconnect();
})().catch(async e=>{console.error(e.stack||e.message); await prisma.$disconnect(); process.exit(1);});
