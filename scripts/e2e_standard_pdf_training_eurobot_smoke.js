/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const env = require('../config/env');
const prisma = require('../config/db');

const BASE = 'http://127.0.0.1:3000';
const UNIQUE_CODE = `AMBER-OWL-${Date.now().toString().slice(-6)}`;
const THRESHOLD = '91.4 lumens';
const REVIEWER = 'Professor Iris Vale';
const runTag = `e2e-stdpdf-${Date.now()}`;
const windowsTempDir = '/mnt/c/Users/andre/AppData/Local/Temp';
const htmlPath = path.join(windowsTempDir, `${runTag}.html`);
const pdfName = `training-eurobot-${runTag}.pdf`;
const pdfPath = path.join(windowsTempDir, pdfName);

function makePdf() {
  const py = `
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
c = canvas.Canvas(${JSON.stringify(pdfPath)}, pagesize=letter)
y = 740
lines = ${JSON.stringify([
    'Training Eurobot Integration Verification PDF',
    'This PDF was created for a complete Training to Eurobot to 3D assistant smoke test.',
    `Run tag: ${runTag}`,
    `Artifact code: ${UNIQUE_CODE}`,
    `Compliance threshold: exactly ${THRESHOLD}`,
    `Named reviewer: ${REVIEWER}`,
    'When asked, the assistant should identify the artifact code, threshold, and named reviewer from this uploaded PDF.'
  ])}
for line in lines:
    c.drawString(72, y, line)
    y -= 22
c.save()
`;
  execFileSync('python3', ['-c', py], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size < 1000) throw new Error(`ReportLab did not create a valid PDF at ${pdfPath}`);
}
async function requestJson(url, opts = {}) { const headers = { ...(opts.headers || {}) }; if (opts.json !== undefined) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.json); } const res = await fetch(url, { ...opts, headers }); const text = await res.text(); let body; try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; } if (!res.ok) throw new Error(`${opts.method || 'GET'} ${url} failed ${res.status}: ${text.slice(0, 700)}`); return body; }
async function loginAuth(){ const login=await requestJson(`${BASE}/auth/login`,{method:'POST',json:{email:env.seed.masterUser.email,password:env.seed.masterUser.password}}); const token=login?.data?.token||login?.token; if(!token) throw new Error('No token'); return {Authorization:`Bearer ${token}`}; }
async function main(){
  makePdf();
  const auth=await loginAuth();
  const module=await requestJson(`${BASE}/modules`,{method:'POST',headers:auth,json:{title:`Eurobot Standard PDF Module ${runTag}`,description:`Standard PDF extraction test module. Artifact label ${UNIQUE_CODE}.`}});
  const form=new FormData(); form.append('document', new Blob([fs.readFileSync(pdfPath)],{type:'application/pdf'}), pdfName);
  const upRes=await fetch(`${BASE}/api/documents/upload`,{method:'POST',headers:auth,body:form}); const upText=await upRes.text(); const upload=JSON.parse(upText); if(!upRes.ok) throw new Error(upText);
  const modDoc=await requestJson(`${BASE}/modules/${module.id}/documents`,{method:'POST',headers:auth,json:{title:`Standard PDF ${UNIQUE_CODE}`,documentId:upload.id,order:1}});
  await requestJson(`${BASE}/modules/${module.id}/publish`,{method:'PATCH',headers:auth,json:{}});
  const course=await requestJson(`${BASE}/courses`,{method:'POST',headers:auth,json:{title:`Eurobot Standard PDF Course ${runTag}`,description:`3D assistant test course. The uploaded PDF contains artifact ${UNIQUE_CODE}.`}});
  const courseModule=await requestJson(`${BASE}/courses/${course.id}/modules`,{method:'POST',headers:auth,json:{moduleId:module.id,orderIndex:1,isRequired:false,roomLabel:'Standard PDF Room'}});
  await requestJson(`${BASE}/courses/${course.id}`,{method:'PUT',headers:auth,json:{status:'PUBLISHED'}});
  const cfg=await requestJson(`${BASE}/api/ai/knowledge-base/default`,{method:'POST',headers:auth,json:{}});
  const refresh=await requestJson(`${BASE}/api/ai/knowledge-base/refresh`,{method:'POST',headers:auth,json:{connectionId:cfg.connection.id}});
  const docItem=(refresh.items||[]).find(it=>String(it.sourceType)==='Document'&&String(it.sourceId)===String(upload.id));
  if(!docItem || docItem.status!=='SYNCED' || !docItem.remoteFileId) throw new Error(`doc not synced ${JSON.stringify(docItem)}`);
  await new Promise(r=>setTimeout(r,8000));
  const qs=[
    `What compliance threshold is stated in the uploaded PDF for artifact ${UNIQUE_CODE}? Answer with the threshold only.`,
    `From the uploaded Training PDF for artifact ${UNIQUE_CODE}, list the artifact code, compliance threshold, and named reviewer.`
  ];
  const answers=[];
  for (const [i,message] of qs.entries()) answers.push(await requestJson(`${BASE}/api/ai/chat`,{method:'POST',headers:auth,json:{message,courseId:course.id,moduleId:null,conversationId:`stdpdf-${runTag}-${i}`}}));
  const combined=answers.map(a=>a.answer||'').join('\n');
  const pass=combined.includes(UNIQUE_CODE)&&combined.includes('91.4')&&combined.includes('Iris');
  const runtime=await requestJson(`${BASE}/courses/${course.id}/runtime`,{headers:auth});
  console.log(JSON.stringify({pass,runTag,uniqueCode:UNIQUE_CODE,threshold:THRESHOLD,reviewer:REVIEWER,pdfPath,pdfSize:fs.statSync(pdfPath).size,moduleId:module.id,documentId:upload.id,moduleDocumentId:modDoc.id,courseId:course.id,courseModuleId:courseModule.id,connection:{id:refresh.connection.id,remoteId:refresh.connection.remoteId,collectionName:refresh.connection.collectionName,syncSummary:refresh.connection.syncSummary},docSyncItem:{id:docItem.id,status:docItem.status,remoteFileId:docItem.remoteFileId,filename:docItem.filename},answers:answers.map(a=>a.answer),runtimeModules:(runtime.modules||[]).map(m=>({moduleId:m.moduleId,courseModuleId:m.courseModuleId,title:m.title,unlocked:m.unlocked}))},null,2));
  if(!pass) process.exitCode=2;
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>prisma.$disconnect().catch(()=>{}));
