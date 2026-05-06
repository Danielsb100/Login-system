const prisma = require('../config/db');
const eurobotClient = require('../services/eurobotClient');
const { buildTrainingMaterialList } = require('../services/trainingKnowledgeMaterialService');
const {
  createKnowledgeBaseConnection,
  deleteKnowledgeBaseConnection,
  ensureDefaultKnowledgeBaseConnection,
  getActiveConnection,
  getConnectionSyncSummary,
  listKnowledgeBaseConnections,
  normalizeCollectionList,
  refreshKnowledgeBase,
  setActiveKnowledgeBaseConnections,
  updateKnowledgeBaseConnection
} = require('../services/aiKnowledgeSyncService');

const serializeConnection = (connection, summary = null) => connection ? ({
  id: connection.id,
  tenantCode: connection.tenantCode,
  displayName: connection.displayName,
  remoteType: connection.remoteType,
  remoteId: connection.remoteId,
  remoteName: connection.remoteName,
  collectionName: connection.collectionName,
  isDefault: connection.isDefault,
  status: connection.status,
  lastRefreshAt: connection.lastRefreshAt,
  lastError: connection.lastError,
  syncSummary: summary || connection.syncSummary || null
}) : null;

const serializeConnections = (connections = []) => connections.map((connection) => serializeConnection(connection, connection.syncSummary));

const getConfig = async (req, res) => {
  try {
    const connections = await listKnowledgeBaseConnections(prisma);
    const activeConnections = connections.filter((connection) => connection.isDefault && connection.status !== 'DISABLED');
    const connection = activeConnections[0] || null;
    const summary = connection?.syncSummary || await getConnectionSyncSummary(prisma, connection?.id);
    res.json({
      connection: serializeConnection(connection, summary),
      connections: serializeConnections(connections),
      activeConnectionIds: activeConnections.map((item) => item.id),
      syncSummary: summary
    });
  } catch (error) {
    console.error('AI KB config failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load AI knowledge base config.' });
  }
};

const ensureDefault = async (req, res) => {
  try {
    const connection = await ensureDefaultKnowledgeBaseConnection({ prisma, eurobotClient });
    const connections = await listKnowledgeBaseConnections(prisma);
    const summary = await getConnectionSyncSummary(prisma, connection.id);
    res.status(201).json({
      connection: serializeConnection(connection, summary),
      connections: serializeConnections(connections),
      activeConnectionIds: connections.filter((item) => item.isDefault && item.status !== 'DISABLED').map((item) => item.id),
      syncSummary: summary
    });
  } catch (error) {
    console.error('AI KB ensure default failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to ensure default AI knowledge base.' });
  }
};

const listConnections = async (req, res) => {
  try {
    const connections = await listKnowledgeBaseConnections(prisma);
    res.json({
      connections: serializeConnections(connections),
      activeConnectionIds: connections.filter((item) => item.isDefault && item.status !== 'DISABLED').map((item) => item.id)
    });
  } catch (error) {
    console.error('AI KB connection list failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to list AI knowledge bases.' });
  }
};

const createConnection = async (req, res) => {
  try {
    const connection = await createKnowledgeBaseConnection({
      prisma,
      eurobotClient,
      displayName: req.body?.displayName,
      description: req.body?.description
    });
    const summary = await getConnectionSyncSummary(prisma, connection.id);
    res.status(201).json({ connection: serializeConnection(connection, summary) });
  } catch (error) {
    console.error('AI KB create failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create AI knowledge base.' });
  }
};

const deleteConnection = async (req, res) => {
  try {
    const result = await deleteKnowledgeBaseConnection({ prisma, eurobotClient, id: req.params.id });
    res.json(result);
  } catch (error) {
    console.error('AI KB delete failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to delete AI knowledge base.' });
  }
};

const updateConnection = async (req, res) => {
  try {
    const connection = await updateKnowledgeBaseConnection({ prisma, id: req.params.id, data: req.body || {} });
    const summary = await getConnectionSyncSummary(prisma, connection.id);
    res.json({ connection: serializeConnection(connection, summary) });
  } catch (error) {
    console.error('AI KB update failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update AI knowledge base.' });
  }
};

const setActiveConnections = async (req, res) => {
  try {
    const connections = await setActiveKnowledgeBaseConnections({ prisma, connectionIds: req.body?.connectionIds || [] });
    res.json({
      connections: serializeConnections(connections),
      activeConnectionIds: connections.filter((item) => item.isDefault && item.status !== 'DISABLED').map((item) => item.id)
    });
  } catch (error) {
    console.error('AI KB active selection failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update AI knowledge base selection.' });
  }
};

const listRemote = async (req, res) => {
  try {
    const payload = await eurobotClient.listInternalCollections();
    res.json({ items: normalizeCollectionList(payload) });
  } catch (error) {
    console.error('AI KB remote list failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to list remote knowledge bases.' });
  }
};

const updateConfig = async (req, res) => {
  try {
    const connectionId = req.body?.id || req.body?.connectionId;
    const connection = connectionId
      ? await updateKnowledgeBaseConnection({ prisma, id: connectionId, data: req.body || {} })
      : await getActiveConnection(prisma);
    if (!connection) return res.status(404).json({ error: 'AI knowledge base connection is not configured.' });

    const summary = await getConnectionSyncSummary(prisma, connection.id);
    res.json({ connection: serializeConnection(connection, summary), syncSummary: summary });
  } catch (error) {
    console.error('AI KB config update failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update AI knowledge base config.' });
  }
};

const refresh = async (req, res) => {
  try {
    const result = await refreshKnowledgeBase({ prisma, eurobotClient, connectionId: req.body?.connectionId || req.params?.id });
    res.json({
      connection: serializeConnection(result.connection, result.summary),
      syncSummary: result.summary,
      items: result.items.slice(0, 100)
    });
  } catch (error) {
    console.error('AI KB refresh failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to refresh AI knowledge base.' });
  }
};

const listSyncItems = async (req, res) => {
  try {
    const connectionId = req.query?.connectionId ? Number(req.query.connectionId) : null;
    const connection = connectionId
      ? await prisma.aiKnowledgeBaseConnection.findUnique({ where: { id: connectionId } })
      : await getActiveConnection(prisma);
    const items = connection
      ? await prisma.aiKnowledgeBaseSyncItem.findMany({
          where: { connectionId: connection.id },
          orderBy: { updatedAt: 'desc' },
          take: 200
        })
      : [];
    const materials = await buildTrainingMaterialList(prisma).catch(() => []);
    const materialMap = new Map(materials.map((material) => [`${material.sourceType}:${String(material.sourceId)}`, material]));
    res.json({
      connection: serializeConnection(connection),
      items: items.map((item) => {
        const material = materialMap.get(`${item.sourceType}:${String(item.sourceId)}`) || {};
        return {
          ...item,
          filename: material.filename || null,
          mimeType: material.mimeType || null,
          materialExists: Boolean(material.filename || material.sourceHash),
          sourceHashCurrent: material.sourceHash || null,
          isStale: Boolean(material.sourceHash && item.sourceHash && material.sourceHash !== item.sourceHash)
        };
      })
    });
  } catch (error) {
    console.error('AI KB sync item list failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to list AI sync items.' });
  }
};

const updateSyncItem = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid sync item id.' });
    const data = {};
    if (req.body?.excluded !== undefined) {
      data.excluded = Boolean(req.body.excluded);
      data.status = data.excluded ? 'SKIPPED' : 'PENDING';
      data.lastError = null;
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: 'No sync item changes supplied.' });
    const item = await prisma.aiKnowledgeBaseSyncItem.update({ where: { id }, data });
    res.json({ item });
  } catch (error) {
    console.error('AI KB sync item update failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update AI sync item.' });
  }
};

module.exports = {
  createConnection,
  deleteConnection,
  ensureDefault,
  getConfig,
  listConnections,
  listRemote,
  listSyncItems,
  refresh,
  setActiveConnections,
  updateConnection,
  updateConfig,
  updateSyncItem
};
