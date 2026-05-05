const prisma=require('../config/db');
const {refreshKnowledgeBase}=require('../services/aiKnowledgeSyncService');
(async()=>{
 const result=await refreshKnowledgeBase({prisma,connectionId:3});
 console.log(JSON.stringify({summary:result.summary, connection:{id:result.connection.id, collectionName:result.connection.collectionName,lastRefreshAt:result.connection.lastRefreshAt,lastError:result.connection.lastError}, pdfItems: result.items.filter(i=>i.sourceType==='Document' && ['8','9'].includes(String(i.sourceId))).map(i=>({id:i.id,sourceId:i.sourceId,status:i.status,remoteFileId:i.remoteFileId,sourceHash:i.sourceHash,lastSyncedAt:i.lastSyncedAt,lastError:i.lastError}))}, null, 2));
 await prisma.$disconnect();
})().catch(async e=>{console.error(e.stack||e.message); await prisma.$disconnect(); process.exit(1);});
