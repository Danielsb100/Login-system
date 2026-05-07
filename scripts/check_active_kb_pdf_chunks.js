const env=require('../config/env');
const prisma=require('../config/db');
async function requestJson(url){const res=await fetch(url); const text=await res.text(); let payload; try{payload=JSON.parse(text)}catch{payload=text} if(!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,400)}`); return payload;}
(async()=>{
 const conns=await prisma.aiKnowledgeBaseConnection.findMany({where:{isDefault:true,status:{not:'DISABLED'}},orderBy:[{updatedAt:'desc'},{id:'desc'}]});
 console.log('active connections', conns.map(c=>({id:c.id,displayName:c.displayName,remoteId:c.remoteId,collectionName:c.collectionName,status:c.status,lastRefreshAt:c.lastRefreshAt,lastError:c.lastError})));
 for(const c of conns){
   const store=c.collectionName || String(c.remoteId||'').replace(/-/g,'_');
   for(const q of ['AMBER-OWL threshold reviewer compliance','Artifact code AMBER-OWL-474614','Document linked to module 22 Standard PDF']){
     const url=new URL('http://127.0.0.1:8002/search'); url.searchParams.set('store',store); url.searchParams.set('text',q); url.searchParams.set('limit','8');
     const r=await requestJson(url.toString()).catch(e=>({error:e.message}));
     console.log('SEARCH', {store,q,result: typeof r==='object' ? JSON.stringify(r,null,2).slice(0,2200): r});
   }
 }
 await prisma.$disconnect();
})().catch(async e=>{console.error(e.stack||e.message); await prisma.$disconnect(); process.exit(1);});
