const env = require('../config/env');
const defaultEurobotClient = require('./eurobotClient');
const { buildTrainingMaterialList } = require('./trainingKnowledgeMaterialService');

const SYNC_STATUSES = ['PENDING', 'SYNCED', 'FAILED', 'SKIPPED', 'STALE', 'DELETED', 'DELETE_FAILED'];
const scheduledRefreshTimers = new Map();

const summarizeSyncItems = (items = []) => {
  const summary = { pending: 0, synced: 0, failed: 0, skipped: 0, stale: 0, deleted: 0, delete_failed: 0, total: items.length };
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

const getActiveConnections = async (prisma) => prisma.aiKnowledgeBaseConnection.findMany({
  where: { isDefault: true, status: { not: 'DISABLED' } },
  orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }]
});

const getActiveConnection = async (prisma) => {
  const connections = await getActiveConnections(prisma);
  return connections[0] || null;
};

const deleteRemoteFileForSyncItem = async ({ prisma, eurobotClient = defaultEurobotClient, connection, item }) => {
  const remoteFileId = String(item?.remoteFileId || '').trim();
  if (!remoteFileId) {
    return prisma.aiKnowledgeBaseSyncItem.update({
      where: { id: item.id },
      data: { status: 'DELETED', lastError: null, remoteFileId: null }
    });
  }

  try {
    await eurobotClient.deleteFileFromInternalCollection({
      collectionId: connection.remoteId,
      fileId: remoteFileId
    });
    return prisma.aiKnowledgeBaseSyncItem.update({
      where: { id: item.id },
      data: {
        status: 'DELETED',
        remoteFileId: null,
        lastError: null
      }
    });
  } catch (error) {
    return prisma.aiKnowledgeBaseSyncItem.update({
      where: { id: item.id },
      data: {
        status: 'DELETE_FAILED',
        lastError: error.message || 'Remote Eurobot file delete failed.'
      }
    });
  }
};

const getConnectionSyncSummary = async (prisma, connectionId) => {
  const items = connectionId
    ? await prisma.aiKnowledgeBaseSyncItem.findMany({ where: { connectionId } })
    : [];
  return summarizeSyncItems(items);
};

const normalizeRemoteFilename = (value) => String(value || '')
  .trim()
  .toLowerCase();

const getRemoteFileName = (file = {}) => file.file_name || file.filename || file.name || file.title || '';

const getRemoteFileId = (file = {}) => file.id || file.file_id || file.doc_id || '';

const getExpectedRemoteFilenames = (filename) => {
  const raw = normalizeRemoteFilename(filename);
  if (!raw) return [];
  const names = new Set([raw]);
  // The internal text extractor currently stores text/plain uploads as `<filename>.txt`.
  if (!raw.endsWith('.txt.txt')) names.add(`${raw}.txt`);
  return [...names];
};

const listRemoteFilesForConnection = async ({ eurobotClient = defaultEurobotClient, connection }) => {
  if (!eurobotClient?.listInternalCollectionFiles || !connection?.remoteId) return null;
  try {
    const payload = await eurobotClient.listInternalCollectionFiles({ collectionId: connection.remoteId });
    return Array.isArray(payload?.files) ? payload.files : [];
  } catch (error) {
    console.warn(`Could not list Eurobot files for KB ${connection.id}; falling back to local sync state:`, error.message || error);
    return null;
  }
};

const findRemoteFileForMaterial = (remoteFiles, material, existing) => {
  if (!Array.isArray(remoteFiles)) return null;
  const expectedNames = new Set(getExpectedRemoteFilenames(material.filename));
  const existingRemoteFileId = String(existing?.remoteFileId || '');
  return remoteFiles.find((file) => {
    const fileId = String(getRemoteFileId(file) || '');
    const fileName = normalizeRemoteFilename(getRemoteFileName(file));
    return (existingRemoteFileId && fileId === existingRemoteFileId) || expectedNames.has(fileName);
  }) || null;
};

const reconcileRemoteOrphans = async ({ prisma, eurobotClient = defaultEurobotClient, connection, materials }) => {
  const remoteFiles = await listRemoteFilesForConnection({ eurobotClient, connection });
  if (!Array.isArray(remoteFiles)) return [];

  const expectedNames = new Set();
  for (const material of materials || []) {
    getExpectedRemoteFilenames(material.filename).forEach((name) => expectedNames.add(name));
  }

  const deleted = [];
  for (const file of remoteFiles) {
    const fileName = normalizeRemoteFilename(getRemoteFileName(file));
    const fileId = String(getRemoteFileId(file) || '');
    if (!fileId || expectedNames.has(fileName)) continue;
    try {
      await eurobotClient.deleteFileFromInternalCollection({ collectionId: connection.remoteId, fileId });
      deleted.push({
        id: `remote:${fileId}`,
        connectionId: connection.id,
        sourceType: 'RemoteFile',
        sourceId: fileId,
        status: 'DELETED',
        remoteFileId: fileId,
        lastError: null
      });
    } catch (error) {
      deleted.push({
        id: `remote:${fileId}`,
        connectionId: connection.id,
        sourceType: 'RemoteFile',
        sourceId: fileId,
        status: 'DELETE_FAILED',
        remoteFileId: fileId,
        lastError: error.message || 'Remote orphan delete failed.'
      });
    }
  }
  return deleted;
};

const getConnectionSyncSummaries = async (prisma, connections = []) => {
  const summaries = {};
  for (const connection of connections) {
    summaries[connection.id] = await getConnectionSyncSummary(prisma, connection.id);
  }
  return summaries;
};

const slugifyKnowledgeBaseName = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 64);

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

  const remoteCollections = normalizeCollectionList(await eurobotClient.listInternalCollections());
  if (existing?.remoteId) {
    const existingRemoteId = String(existing.remoteId);
    const remoteStillExists = remoteCollections.some((collection) => [
      collection.id,
      collection.remoteId,
      collection.collection_name,
      collection.collectionName,
      collection.name
    ].filter(Boolean).map(String).includes(existingRemoteId));
    if (remoteStillExists) return existing;
  }

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

const listKnowledgeBaseConnections = async (prisma) => {
  const connections = await prisma.aiKnowledgeBaseConnection.findMany({
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }]
  });
  const summaries = await getConnectionSyncSummaries(prisma, connections);
  return connections.map((connection) => ({ ...connection, syncSummary: summaries[connection.id] }));
};

const createKnowledgeBaseConnection = async ({ prisma, eurobotClient = defaultEurobotClient, displayName, description, tenantCode } = {}) => {
  if (!prisma) throw new Error('Prisma client is required.');
  const resolvedTenantCode = tenantCode || env.eurobot?.tenantCode || 'default';
  const trimmedName = String(displayName || '').trim();
  if (!trimmedName) {
    const error = new Error('Knowledge base name is required.');
    error.statusCode = 400;
    throw error;
  }

  const safeName = slugifyKnowledgeBaseName(trimmedName);
  const remoteName = safeName || `training-${Date.now()}`;
  const remote = await eurobotClient.createInternalCollection({
    name: remoteName,
    description: String(description || '').trim() || `Training knowledge base: ${trimmedName}`
  });

  return prisma.aiKnowledgeBaseConnection.create({
    data: {
      tenantCode: resolvedTenantCode,
      displayName: trimmedName,
      remoteType: 'internal_collection',
      remoteId: String(remote.id || remote.remoteId || remote.collection_name || remoteName),
      remoteName: remote.name || remoteName,
      collectionName: remote.collection_name || remote.collectionName || remoteName.replace(/-/g, '_'),
      isDefault: false,
      status: 'ACTIVE',
      lastRefreshAt: null,
      lastError: null
    }
  });
};

const deleteKnowledgeBaseConnection = async ({ prisma, eurobotClient = defaultEurobotClient, id } = {}) => {
  const connectionId = Number(id);
  if (!Number.isInteger(connectionId)) {
    const error = new Error('Invalid knowledge base id.');
    error.statusCode = 400;
    throw error;
  }
  const connection = await prisma.aiKnowledgeBaseConnection.findUnique({ where: { id: connectionId } });
  if (!connection) {
    const error = new Error('AI knowledge base connection not found.');
    error.statusCode = 404;
    throw error;
  }

  await eurobotClient.deleteInternalCollection(connection.remoteId);
  await prisma.aiKnowledgeBaseConnection.delete({ where: { id: connectionId } });
  return { ok: true, deleted: true, id: connectionId };
};

const updateKnowledgeBaseConnection = async ({ prisma, id, data = {} } = {}) => {
  const connectionId = Number(id);
  if (!Number.isInteger(connectionId)) {
    const error = new Error('Invalid knowledge base id.');
    error.statusCode = 400;
    throw error;
  }

  const update = {};
  if (data.displayName !== undefined) {
    const displayName = String(data.displayName || '').trim();
    if (!displayName) {
      const error = new Error('Knowledge base name cannot be empty.');
      error.statusCode = 400;
      throw error;
    }
    update.displayName = displayName;
  }
  if (data.status !== undefined) {
    const status = String(data.status || '').toUpperCase();
    if (!['ACTIVE', 'DISABLED', 'ERROR'].includes(status)) {
      const error = new Error('Invalid AI knowledge base status.');
      error.statusCode = 400;
      throw error;
    }
    update.status = status;
    if (status === 'DISABLED') update.isDefault = false;
  }

  return prisma.aiKnowledgeBaseConnection.update({ where: { id: connectionId }, data: update });
};

const setActiveKnowledgeBaseConnections = async ({ prisma, connectionIds = [] } = {}) => {
  const ids = [...new Set((connectionIds || []).map(Number).filter(Number.isInteger))];
  await prisma.aiKnowledgeBaseConnection.updateMany({ data: { isDefault: false } });
  if (ids.length) {
    await prisma.aiKnowledgeBaseConnection.updateMany({
      where: { id: { in: ids }, status: { not: 'DISABLED' } },
      data: { isDefault: true, status: 'ACTIVE' }
    });
  }
  return listKnowledgeBaseConnections(prisma);
};

const scheduleKnowledgeBaseRefresh = async ({
  prisma,
  eurobotClient = defaultEurobotClient,
  connectionIds,
  delayMs = 1500,
  reason = 'training material changed'
} = {}) => {
  if (!prisma) throw new Error('Prisma client is required.');
  const connections = Array.isArray(connectionIds) && connectionIds.length
    ? await prisma.aiKnowledgeBaseConnection.findMany({
        where: { id: { in: connectionIds.map(Number).filter(Number.isInteger) }, status: { not: 'DISABLED' } }
      })
    : await getActiveConnections(prisma);

  for (const connection of connections) {
    const existingTimer = scheduledRefreshTimers.get(connection.id);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
      scheduledRefreshTimers.delete(connection.id);
      try {
        await refreshKnowledgeBase({ prisma, eurobotClient, connectionId: connection.id });
      } catch (error) {
        console.error(`Scheduled AI KB refresh failed for connection ${connection.id} (${reason}):`, error);
        await prisma.aiKnowledgeBaseConnection.update({
          where: { id: connection.id },
          data: { status: 'ERROR', lastError: error.message || 'Scheduled KB refresh failed.' }
        }).catch(() => null);
      }
    }, delayMs);
    if (typeof timer.unref === 'function') timer.unref();
    scheduledRefreshTimers.set(connection.id, timer);
  }

  return { scheduled: connections.length };
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
  const remoteFilesAtStart = await listRemoteFilesForConnection({ eurobotClient, connection });
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
    const remoteFile = findRemoteFileForMaterial(remoteFilesAtStart, material, existing);
    if (existing?.excluded) {
      const skipped = await prisma.aiKnowledgeBaseSyncItem.update({
        where: { id: existing.id },
        data: {
          status: 'SKIPPED',
          sourceHash: material.sourceHash,
          lastError: null
        }
      });
      results.push(skipped);
      continue;
    }
    if (existing?.status === 'SYNCED' && existing.sourceHash === material.sourceHash && existing.remoteFileId && (!Array.isArray(remoteFilesAtStart) || remoteFile)) {
      if (remoteFile) {
        const remoteFileId = String(getRemoteFileId(remoteFile) || existing.remoteFileId || '');
        if (remoteFileId && remoteFileId !== existing.remoteFileId) {
          const repaired = await prisma.aiKnowledgeBaseSyncItem.update({
            where: { id: existing.id },
            data: { remoteFileId, lastError: null }
          });
          results.push(repaired);
          continue;
        }
      }
      results.push(existing);
      continue;
    }

    const pending = await prisma.aiKnowledgeBaseSyncItem.upsert({
      where,
      update: { status: 'PENDING', excluded: false, sourceHash: material.sourceHash, lastError: null },
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
      const previousRemoteFileId = existing?.remoteFileId && existing.sourceHash !== material.sourceHash
        ? String(existing.remoteFileId)
        : '';
      const synced = await prisma.aiKnowledgeBaseSyncItem.update({
        where: { id: pending.id },
        data: {
          status: 'SYNCED',
          remoteFileId: uploadResult.remoteFileId,
          lastSyncedAt: new Date(),
          lastError: null
        }
      });
      if (previousRemoteFileId && previousRemoteFileId !== uploadResult.remoteFileId) {
        await eurobotClient.deleteFileFromInternalCollection({
          collectionId: connection.remoteId,
          fileId: previousRemoteFileId
        }).catch((error) => {
          console.warn(`Failed to delete replaced Eurobot file ${previousRemoteFileId}:`, error.message || error);
        });
      }
      results.push(synced);
    } catch (error) {
      const failed = await prisma.aiKnowledgeBaseSyncItem.update({
        where: { id: pending.id },
        data: { status: 'FAILED', lastError: error.message || 'Upload failed.' }
      });
      results.push(failed);
    }
  }

  const currentKeys = new Set(materials.map((material) => `${material.sourceType}:${String(material.sourceId)}`));
  const potentiallyRemovedItems = await prisma.aiKnowledgeBaseSyncItem.findMany({
    where: {
      connectionId: connection.id,
      status: { in: ['PENDING', 'SYNCED', 'FAILED', 'STALE', 'DELETE_FAILED'] }
    }
  });

  for (const item of potentiallyRemovedItems) {
    const key = `${item.sourceType}:${String(item.sourceId)}`;
    if (currentKeys.has(key)) continue;
    const deleted = await deleteRemoteFileForSyncItem({ prisma, eurobotClient, connection, item });
    results.push(deleted);
  }

  const reconciledRemoteFiles = await reconcileRemoteOrphans({ prisma, eurobotClient, connection, materials });
  results.push(...reconciledRemoteFiles);

  const updatedConnection = await prisma.aiKnowledgeBaseConnection.update({
    where: { id: connection.id },
    data: { lastRefreshAt: new Date(), lastError: null }
  }).catch(() => connection);

  return { connection: updatedConnection, summary: summarizeSyncItems(results), items: results };
};

module.exports = {
  SYNC_STATUSES,
  createKnowledgeBaseConnection,
  deleteKnowledgeBaseConnection,
  ensureDefaultKnowledgeBaseConnection,
  getActiveConnection,
  getActiveConnections,
  getConnectionSyncSummaries,
  getConnectionSyncSummary,
  listKnowledgeBaseConnections,
  normalizeCollectionList,
  refreshKnowledgeBase,
  scheduleKnowledgeBaseRefresh,
  setActiveKnowledgeBaseConnections,
  summarizeSyncItems,
  updateKnowledgeBaseConnection
};
