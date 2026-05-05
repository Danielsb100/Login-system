const env=require('../config/env');
const prisma=require('../config/db');
(async()=>{
 const conn=await prisma.aiKnowledgeBaseConnection.findFirst({where:{isDefault:true,status:{not:'DISABLED'}},orderBy:[{updatedAt:'desc'},{id:'desc'}]});
 const base=(env.eurobot.apiUrl||'').replace(/\/+$/,'');
 const headers={'Content-Type':'application/json'};
 if(env.eurobot.serviceApiKey){headers[env.eurobot.serviceApiKeyHeader||'X-Eurobot-Service-Key']=env.eurobot.serviceApiKey; headers['X-Eurobot-Service-Client']=env.eurobot.serviceClient||'training';}
 const body={
   query:'Using only the Training knowledge base, answer exactly: what are the artifact code, compliance threshold, and named reviewer in the uploaded Training Eurobot Integration Verification PDF?',
   conversation_id:'training-e2e-final-check',
   knowledge_base_ids: conn?.remoteId || conn?.collectionName,
   return_audio:false,
   use_web_search:false
 };
 const res=await fetch(`${base}/responses/chat`,{method:'POST',headers,body:JSON.stringify(body)});
 const text=await res.text();
 console.log('status',res.status);
 console.log(text);
 await prisma.$disconnect();
})().catch(async e=>{console.error(e.stack||e.message); await prisma.$disconnect(); process.exit(1);});
