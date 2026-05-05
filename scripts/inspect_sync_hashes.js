const prisma=require('../config/db');
const {buildTrainingMaterialList}=require('../services/trainingKnowledgeMaterialService');
(async()=>{
 const materials=await buildTrainingMaterialList(prisma);
 for(const docId of [9,8]){
  const m=materials.find(x=>x.sourceType==='Document'&&String(x.sourceId)===String(docId));
  const items=await prisma.aiKnowledgeBaseSyncItem.findMany({where:{sourceType:'Document',sourceId:String(docId)},include:{connection:true},orderBy:{id:'desc'}});
  console.log('DOC',docId,'materialHash',m?.sourceHash,'bufferLen',m?.buffer?.length,'startsPdf',m?.buffer?.slice(0,5).toString('latin1'));
  console.log(items.map(i=>({id:i.id,connectionId:i.connectionId,collectionName:i.connection?.collectionName,status:i.status,excluded:i.excluded,sourceHash:i.sourceHash,hashMatches:m?.sourceHash===i.sourceHash,remoteFileId:i.remoteFileId,lastSyncedAt:i.lastSyncedAt,lastError:i.lastError})));
 }
 await prisma.$disconnect();
})().catch(async e=>{console.error(e); await prisma.$disconnect(); process.exit(1);});
