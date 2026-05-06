/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const prisma = require('../config/db');
const { buildTrainingMaterialList } = require('../services/trainingKnowledgeMaterialService');
const eurobotClient = require('../services/eurobotClient');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function requestJson(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (env.eurobot?.serviceApiKey) {
    headers[env.eurobot.serviceApiKeyHeader || 'X-Eurobot-Service-Key'] = env.eurobot.serviceApiKey;
    headers['X-Eurobot-Service-Client'] = env.eurobot.serviceClient || 'training-diagnostic';
  }
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.json);
  }
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = text; }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${typeof payload === 'string' ? payload.slice(0, 500) : JSON.stringify(payload).slice(0, 500)}`);
    err.payload = payload;
    throw err;
  }
  return payload;
}

async function main() {
  const docs = await prisma.document.findMany({
    where: { type: { contains: 'pdf', mode: 'insensitive' } },
    orderBy: { id: 'desc' },
    take: 5
  });
  console.log('Recent PDF docs:', docs.map((d) => ({ id: d.id, name: d.name, sizeBytes: d.sizeBytes, storageKey: d.storageKey })));

  const materials = await buildTrainingMaterialList(prisma);
  for (const doc of docs) {
    const material = materials.find((m) => m.sourceType === 'Document' && String(m.sourceId) === String(doc.id));
    if (!material) {
      console.log(`DOC ${doc.id}: no material`);
      continue;
    }
    const buf = material.buffer || Buffer.from(material.text || '', 'utf8');
    console.log(`DOC ${doc.id} material:`, {
      filename: material.filename,
      mimeType: material.mimeType,
      len: buf.length,
      startsPdf: buf.slice(0, 5).toString('latin1') === '%PDF-',
      sha256: sha256(buf),
      previewLatin1: buf.slice(0, 80).toString('latin1')
    });
  }

  const target = docs[0];
  if (!target) return;
  const targetMaterial = materials.find((m) => m.sourceType === 'Document' && String(m.sourceId) === String(target.id));
  if (!targetMaterial) return;

  // Create a temporary Eurobot internal collection, upload the exact material buffer via the same client,
  // then search for the document label and PDF text markers. This does not change pipeline code.
  const collName = `training-upload-diagnostic-${Date.now()}`;
  const coll = await eurobotClient.createInternalCollection({ name: collName, description: 'Temporary diagnostic collection for Training PDF upload bytes' });
  const collId = String(coll.id || coll.remoteId || coll.collection_name || collName);
  const collectionName = coll.collection_name || coll.collectionName || collName.replace(/-/g, '_');
  console.log('Created diagnostic collection:', { collId, collectionName });

  const upload = await eurobotClient.uploadFilesToInternalCollection(collId, [{
    buffer: targetMaterial.buffer,
    filename: targetMaterial.filename,
    mimeType: targetMaterial.mimeType
  }]);
  console.log('Upload result:', JSON.stringify(upload, null, 2));

  // Wait briefly for indexing if async.
  await new Promise((resolve) => setTimeout(resolve, 3500));
  const base = (env.eurobot.apiUrl || '').replace(/\/+$/, '');
  const queries = [
    target.name,
    'AMBER-OWL threshold reviewer compliance',
    'CERULEAN-KITE compliance threshold reviewer',
    'Document linked to module'
  ];
  for (const q of queries) {
    const url = new URL(`${base}/admin/collections/${encodeURIComponent(collectionName)}/files/check`);
    // files/check only checks filename, so use pipeline search directly through local pipeline for content.
    console.log('Filename check URL available for:', q, url.toString());
  }

  const kpSearchBase = 'http://127.0.0.1:8002/search';
  for (const q of queries) {
    const url = new URL(kpSearchBase);
    url.searchParams.set('store', collectionName);
    url.searchParams.set('text', q);
    url.searchParams.set('limit', '5');
    const result = await requestJson(url.toString());
    console.log(`SEARCH ${q}:`, JSON.stringify(result, null, 2).slice(0, 2500));
  }
}

main().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
}).finally(async () => prisma.$disconnect());
