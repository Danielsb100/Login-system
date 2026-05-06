/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const prisma = require('../config/db');

const BASE = 'http://127.0.0.1:3000';
const UNIQUE_CODE = `CERULEAN-KITE-${Date.now().toString().slice(-6)}`;
const THRESHOLD = '73.6 parsecs';
const REVIEWER = 'Dr. Nova Quill';
const runTag = `e2e-${Date.now()}`;
const pdfName = `training-eurobot-${runTag}.pdf`;
const pdfPath = path.join('/tmp', pdfName);

function makeSimplePdf(filePath, lines) {
  const escapedLines = lines.map((line) => String(line).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'));
  const textOps = escapedLines.map((line, index) => `BT /F1 12 Tf 72 ${740 - index * 18} Td (${line}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(textOps)} >>\nstream\n${textOps}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  fs.writeFileSync(filePath, pdf);
}

async function requestJson(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.json);
  }
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`${opts.method || 'GET'} ${url} failed ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function main() {
  makeSimplePdf(pdfPath, [
    'Training Eurobot integration verification PDF.',
    `Run tag: ${runTag}`,
    `Secret artifact code: ${UNIQUE_CODE}`,
    `Compliance threshold: exactly ${THRESHOLD}`,
    `Named reviewer: ${REVIEWER}`,
    'If asked about this document, return the secret artifact code and threshold exactly.'
  ]);

  const login = await requestJson(`${BASE}/auth/login`, {
    method: 'POST',
    json: { email: env.seed.masterUser.email, password: env.seed.masterUser.password }
  });
  const token = login?.data?.token || login?.token;
  if (!token) throw new Error('Login did not return a token');
  const auth = { Authorization: `Bearer ${token}` };

  const module = await requestJson(`${BASE}/modules`, {
    method: 'POST', headers: auth,
    json: { title: `Eurobot PDF Smoke Module ${runTag}`, description: `Module created for full PDF-to-3D assistant smoke. Unique code ${UNIQUE_CODE}.` }
  });

  const form = new FormData();
  const pdfBuffer = fs.readFileSync(pdfPath);
  form.append('document', new Blob([pdfBuffer], { type: 'application/pdf' }), pdfName);
  const uploadRes = await fetch(`${BASE}/api/documents/upload`, { method: 'POST', headers: auth, body: form });
  const uploadText = await uploadRes.text();
  let upload;
  try { upload = JSON.parse(uploadText); } catch { upload = { raw: uploadText }; }
  if (!uploadRes.ok) throw new Error(`upload failed ${uploadRes.status}: ${uploadText}`);

  const moduleDoc = await requestJson(`${BASE}/modules/${module.id}/documents`, {
    method: 'POST', headers: auth,
    json: { title: `Specific PDF ${UNIQUE_CODE}`, documentId: upload.id, order: 1 }
  });

  await requestJson(`${BASE}/modules/${module.id}/publish`, { method: 'PATCH', headers: auth, json: {} });

  const course = await requestJson(`${BASE}/courses`, {
    method: 'POST', headers: auth,
    json: { title: `Eurobot PDF Smoke Course ${runTag}`, description: `Course created for 3D assistant test; contains PDF code ${UNIQUE_CODE}.` }
  });
  const courseModule = await requestJson(`${BASE}/courses/${course.id}/modules`, {
    method: 'POST', headers: auth,
    json: { moduleId: module.id, orderIndex: 1, isRequired: false, roomLabel: 'PDF Verification Room' }
  });
  await requestJson(`${BASE}/courses/${course.id}`, { method: 'PUT', headers: auth, json: { status: 'PUBLISHED' } });

  const defaultKb = await requestJson(`${BASE}/api/ai/knowledge-base/default`, { method: 'POST', headers: auth, json: {} });
  const connectionId = defaultKb?.connection?.id;
  const refresh = await requestJson(`${BASE}/api/ai/knowledge-base/refresh`, {
    method: 'POST', headers: auth,
    json: connectionId ? { connectionId } : {}
  });

  const docItem = (refresh.items || []).find((item) => String(item.sourceType) === 'Document' && String(item.sourceId) === String(upload.id));
  if (!docItem || docItem.status !== 'SYNCED' || !docItem.remoteFileId) {
    throw new Error(`PDF sync item was not fully synced: ${JSON.stringify(docItem || null)}`);
  }

  // Give the vector side a brief moment after upload acceptance.
  await new Promise((resolve) => setTimeout(resolve, 6000));

  const question = `According to the uploaded verification PDF, what are the secret artifact code and the compliance threshold? Answer with only the code and threshold.`;
  const chat = await requestJson(`${BASE}/api/ai/chat`, {
    method: 'POST', headers: auth,
    json: { message: question, courseId: course.id, moduleId: null, conversationId: `pdf-smoke-${runTag}` }
  });

  const answer = String(chat.answer || '');
  const pass = answer.includes(UNIQUE_CODE) && answer.includes('73.6');
  const runtime = await requestJson(`${BASE}/courses/${course.id}/runtime`, { headers: auth });

  console.log(JSON.stringify({
    pass,
    runTag,
    uniqueCode: UNIQUE_CODE,
    threshold: THRESHOLD,
    reviewer: REVIEWER,
    pdfPath,
    pdfName,
    moduleId: module.id,
    documentId: upload.id,
    moduleDocumentId: moduleDoc.id,
    courseId: course.id,
    courseModuleId: courseModule.id,
    courseSceneId: course.sceneId,
    connection: refresh.connection && {
      id: refresh.connection.id,
      displayName: refresh.connection.displayName,
      remoteId: refresh.connection.remoteId,
      collectionName: refresh.connection.collectionName,
      syncSummary: refresh.connection.syncSummary
    },
    docSyncItem: { id: docItem.id, status: docItem.status, remoteFileId: docItem.remoteFileId, filename: docItem.filename },
    chatAnswer: answer,
    runtimeModules: (runtime.modules || []).map((m) => ({ moduleId: m.moduleId, courseModuleId: m.courseModuleId, title: m.title, unlocked: m.unlocked }))
  }, null, 2));
  if (!pass) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect().catch(() => {});
});
