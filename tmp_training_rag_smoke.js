const prisma = require('./config/db');
const { refreshKnowledgeBase, ensureDefaultKnowledgeBaseConnection } = require('./services/aiKnowledgeSyncService');
const { chatWithTrainingAi } = require('./services/trainingAiService');
const eurobotClient = require('./services/eurobotClient');

const stamp = Date.now();
const docPhrase = `SILVER PELICAN ${stamp}`;
const modulePhrase = `GOLDEN ANCHOR ${stamp}`;
const email = `friday-smoke-${stamp}@example.test`;
const username = `friday_smoke_${stamp}`;
const fetchJson = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${url} -> ${res.status}: ${text.slice(0,500)}`);
  return body;
};
const pipelineFiles = (collectionName) => fetchJson(`http://127.0.0.1:8002/collections/${encodeURIComponent(collectionName)}/files`);
const pipelineSearch = (collectionName, text) => fetchJson(`http://127.0.0.1:8002/search?store=${encodeURIComponent(collectionName)}&text=${encodeURIComponent(text)}&limit=5`);
const result = { stamp, docPhrase, modulePhrase };
(async () => {
  const user = await prisma.user.create({ data: { username, email, password_hash: 'local-smoke-no-login', role: 'MASTER', isVerified: true } });
  const mod = await prisma.trainingModule.create({ data: { ownerMasterId: user.id, title: `Friday RAG smoke ${stamp}`, description: `Module metadata contains ${modulePhrase}`, status: 'PUBLISHED' } });
  const doc = await prisma.document.create({ data: { userId: user.id, name: `friday-rag-smoke-${stamp}.txt`, type: 'text/plain', data: Buffer.from(`This disposable Training document contains the exact secret phrase ${docPhrase}. It should disappear from RAG after file deletion.`, 'utf8'), storageProvider: 'database', sizeBytes: 140 } });
  const moduleDoc = await prisma.moduleDocument.create({ data: { moduleId: mod.id, documentId: doc.id, title: `Disposable document ${stamp}`, order: 1 } });
  result.created = { userId: user.id, moduleId: mod.id, documentId: doc.id, moduleDocumentId: moduleDoc.id };

  const connection = await ensureDefaultKnowledgeBaseConnection({ prisma, eurobotClient });
  result.connection = { id: connection.id, remoteId: connection.remoteId, collectionName: connection.collectionName, displayName: connection.displayName };
  const sync1 = await refreshKnowledgeBase({ prisma, eurobotClient, connectionId: connection.id });
  result.syncBeforeDelete = sync1.summary;
  const sourceIds = [String(mod.id), String(moduleDoc.id), String(doc.id)];
  const itemsBefore = await prisma.aiKnowledgeBaseSyncItem.findMany({ where: { connectionId: connection.id, sourceId: { in: sourceIds } }, orderBy: { id: 'asc' } });
  result.itemsBefore = itemsBefore.map(i => ({ id: i.id, sourceType: i.sourceType, sourceId: i.sourceId, status: i.status, remoteFileId: i.remoteFileId, lastError: i.lastError }));
  result.filesBefore = await pipelineFiles(connection.collectionName);
  result.searchDocBefore = await pipelineSearch(connection.collectionName, docPhrase);
  result.searchModuleBefore = await pipelineSearch(connection.collectionName, modulePhrase);
  try {
    const aiBefore = await chatWithTrainingAi({ prisma, eurobotClient, message: `What is the exact SILVER PELICAN code? Answer with the code only.`, conversationId: `smoke-before-${stamp}`, knowledgeBaseId: connection.remoteId });
    result.aiBefore = aiBefore.answer;
  } catch (e) { result.aiBeforeError = e.message; }

  await prisma.moduleDocument.delete({ where: { id: moduleDoc.id } });
  await prisma.document.delete({ where: { id: doc.id } });
  const sync2 = await refreshKnowledgeBase({ prisma, eurobotClient, connectionId: connection.id });
  result.syncAfterFileDelete = sync2.summary;
  const itemsAfter = await prisma.aiKnowledgeBaseSyncItem.findMany({ where: { connectionId: connection.id, sourceId: { in: sourceIds } }, orderBy: { id: 'asc' } });
  result.itemsAfter = itemsAfter.map(i => ({ id: i.id, sourceType: i.sourceType, sourceId: i.sourceId, status: i.status, remoteFileId: i.remoteFileId, lastError: i.lastError }));
  result.filesAfterFileDelete = await pipelineFiles(connection.collectionName);
  result.searchDocAfter = await pipelineSearch(connection.collectionName, docPhrase);
  result.searchModuleAfter = await pipelineSearch(connection.collectionName, modulePhrase);
  try {
    const aiAfter = await chatWithTrainingAi({ prisma, eurobotClient, message: `What is the exact SILVER PELICAN code? If it is not in the knowledge base, say NOT FOUND.`, conversationId: `smoke-after-${stamp}`, knowledgeBaseId: connection.remoteId });
    result.aiAfter = aiAfter.answer;
  } catch (e) { result.aiAfterError = e.message; }

  await prisma.trainingModule.delete({ where: { id: mod.id } });
  await prisma.user.delete({ where: { id: user.id } }).catch(()=>{});
  console.log(JSON.stringify(result, null, 2));
})().catch(e => { console.error(JSON.stringify({ error: e.message, stack: e.stack }, null, 2)); process.exit(1); }).finally(() => prisma.$disconnect());
