const env = require('../config/env');
const defaultEurobotClient = require('./eurobotClient');
const { buildTrainingMaterialList } = require('./trainingKnowledgeMaterialService');

const SYNC_STATUSES = ['PENDING', 'SYNCED', 'FAILED', 'SKIPPED', 'STALE'];

const summarizeSyncItems = (items = []) => {
  const summary = { pending: 0, synced: 0, failed: 0, skipped: 0, stale: 0, total: items.length };
  for (const item of items || []) {
    const key = String(item.status || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(summary, key)) summary[key] += 1;
  }
  return summary;
};

const normalizeCollectionList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.collections)) return payload.collections;
  if (Array.isArray(payload?.knowledge_bases)) return payload.knowledge_bases;
  return [];
};

const collectionNameMatches = (collection, defaultName) => {
  const candidates = [collection.name, collection.collection_name, collection.remoteName]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  const normalizedDefault = String(defaultName || '').toLowerCase();
  return candidates.includes(normalizedDefault) || candidates.includes(normalizedDefault.replace(/-/g, '_'));
};

const extractUploadResult = (upload) => {
  const results = Array.isArray(upload?.results) ? upload.results : [];
  const failed = results.find((result) => result && result.done === false);
  if (failed) {
    throw new Error(failed.error || failed.detail || `Eurobot upload failed for ${failed.filename || 'file'}.`);
  }

  const first = results[0] || upload || {};
  const pipeline = first.pipeline || {};
  return {
    remoteFileId: String(
      first.file_id ||
      first.id ||
      first.job_id ||
      pipeline.doc_id ||
      pipeline.unique_id ||
      pipeline.job_id ||
      upload?.file_id ||
      upload?.id ||
      upload?.job_id ||
      ''
    )
  };
};

const getActiveConnection = async (prisma) => prisma.aiKnowledgeBaseConnection.findFirst({
  where: { isDefault: true, status: { not: 'DISABLED' } },
  orderBy: { updatedAt: 'desc' }
});

const getConnectionSyncSummary = async (prisma, connectionId) => {
  const items = connectionId
    ? await prisma.aiKnowledgeBaseSyncItem.findMany({ where: { connectionId } })
    : [];
  return summarizeSyncItems(items);
};

const ensureDefaultKnowledgeBaseConnection = async ({ prisma, eurobotClient = defaultEurobotClient } = {}) => {
  if (!prisma) throw new Error('Prisma client is required.');
  const tenantCode = env.eurobot?.tenantCode || 'default';
  const defaultName = eurobotClient.getDefaultKnowledgeBaseName
    ? eurobotClient.getDefaultKnowledgeBaseName()
    : `${env.eurobot?.defaultKbPrefix || 'training'}-${tenantCode}`;

  const existing = await prisma.aiKnowledgeBaseConnection.findFirst({
    where: { tenantCode, isDefault: true },
    orderBy: { updatedAt: 'desc' }
  });
  if (existing?.remoteId) return existing;

  const remoteCollections = normalizeCollectionList(await eurobotClient.listInternalCollections());
  let remote = remoteCollections.find((collection) => collectionNameMatches(collection, defaultName));
  if (!remote) {
    remote = await eurobotClient.createInternalCollection({
      name: defaultName,
      description: `Default Training knowledge base for tenant ${tenantCode}`
    });
  }

  const data = {
    tenantCode,
    displayName: remote.name || defaultName,
    remoteType: 'internal_collection',
    remoteId: String(remote.id || remote.remoteId || remote.collection_name || defaultName),
    remoteName: remote.name || defaultName,
    collectionName: remote.collection_name || remote.collectionName || defaultName.replace(/-/g, '_'),
    isDefault: true,
    status: 'ACTIVE',
    lastRefreshAt: new Date(),
    lastError: null
  };

  if (existing?.id) {
    return prisma.aiKnowledgeBaseConnection.update({ where: { id: existing.id }, data });
  }

  return prisma.aiKnowledgeBaseConnection.create({ data });
};

const refreshKnowledgeBase = async ({ prisma, eurobotClient = defaultEurobotClient, connectionId } = {}) => {
  const connection = connectionId
    ? await prisma.aiKnowledgeBaseConnection.findUnique({ where: { id: Number(connectionId) } })
    : await ensureDefaultKnowledgeBaseConnection({ prisma, eurobotClient });

  if (!connection) {
    const error = new Error('AI knowledge base connection is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const materials = await buildTrainingMaterialList(prisma);
  const results = [];

  for (const material of materials) {
    const where = {
      connectionId_sourceType_sourceId: {
        connectionId: connection.id,
        sourceType: material.sourceType,
        sourceId: String(material.sourceId)
      }
    };

    const existing = await prisma.aiKnowledgeBaseSyncItem.findUnique({ where }).catch(() => null);
    if (existing?.status === 'SYNCED' && existing.sourceHash === material.sourceHash && existing.remoteFileId) {
      results.push(existing);
      continue;
    }

    const pending = await prisma.aiKnowledgeBaseSyncItem.upsert({
      where,
      update: { status: 'PENDING', sourceHash: material.sourceHash, lastError: null },
      create: {
        connectionId: connection.id,
        sourceType: material.sourceType,
        sourceId: String(material.sourceId),
        sourceHash: material.sourceHash,
        status: 'PENDING'
      }
    });

    try {
      const upload = await eurobotClient.uploadFilesToInternalCollection(connection.remoteId, [{
        buffer: material.buffer || Buffer.from(material.text || '', 'utf8'),
        filename: material.filename,
        mimeType: material.mimeType || 'text/plain'
      }]);
      const uploadResult = extractUploadResult(upload);
      const synced = await prisma.aiKnowledgeBaseSyncItem.update({
        where: { id: pending.id },
        data: {
          status: 'SYNCED',
          remoteFileId: uploadResult.remoteFileId,
          lastSyncedAt: new Date(),
          lastError: null
        }
      });
      results.push(synced);
    } catch (error) {
      const failed = await prisma.aiKnowledgeBaseSyncItem.update({
        where: { id: pending.id },
        data: { status: 'FAILED', lastError: error.message || 'Upload failed.' }
      });
      results.push(failed);
    }
  }

  for (const sourceType of [...new Set(materials.map((material) => material.sourceType))]) {
    await prisma.aiKnowledgeBaseSyncItem.updateMany({
      where: {
        connectionId: connection.id,
        sourceType,
        sourceId: {
          notIn: materials
            .filter((material) => material.sourceType === sourceType)
            .map((material) => String(material.sourceId))
        },
        status: { in: ['PENDING', 'SYNCED', 'FAILED'] }
      },
      data: { status: 'STALE' }
    }).catch(() => null);
  }

  const updatedConnection = await prisma.aiKnowledgeBaseConnection.update({
    where: { id: connection.id },
    data: { lastRefreshAt: new Date(), lastError: null }
  }).catch(() => connection);

  return { connection: updatedConnection, summary: summarizeSyncItems(results), items: results };
};

module.exports = {
  SYNC_STATUSES,
  ensureDefaultKnowledgeBaseConnection,
  getActiveConnection,
  getConnectionSyncSummary,
  normalizeCollectionList,
  refreshKnowledgeBase,
  summarizeSyncItems
};
