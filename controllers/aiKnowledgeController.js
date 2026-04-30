const prisma = require('../config/db');
const eurobotClient = require('../services/eurobotClient');
const {
  ensureDefaultKnowledgeBaseConnection,
  getActiveConnection,
  getConnectionSyncSummary,
  normalizeCollectionList,
  refreshKnowledgeBase
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
  syncSummary: summary
}) : null;

const getConfig = async (req, res) => {
  try {
    const connection = await getActiveConnection(prisma);
    const summary = await getConnectionSyncSummary(prisma, connection?.id);
    res.json({ connection: serializeConnection(connection, summary), syncSummary: summary });
  } catch (error) {
    console.error('AI KB config failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load AI knowledge base config.' });
  }
};

const ensureDefault = async (req, res) => {
  try {
    const connection = await ensureDefaultKnowledgeBaseConnection({ prisma, eurobotClient });
    const summary = await getConnectionSyncSummary(prisma, connection.id);
    res.status(201).json({ connection: serializeConnection(connection, summary), syncSummary: summary });
  } catch (error) {
    console.error('AI KB ensure default failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to ensure default AI knowledge base.' });
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
    const connection = await getActiveConnection(prisma);
    if (!connection) return res.status(404).json({ error: 'AI knowledge base connection is not configured.' });

    const data = {};
    if (req.body?.displayName !== undefined) data.displayName = String(req.body.displayName || '').trim() || connection.displayName;
    if (req.body?.remoteId !== undefined) data.remoteId = String(req.body.remoteId || '').trim() || connection.remoteId;
    if (req.body?.remoteName !== undefined) data.remoteName = String(req.body.remoteName || '').trim() || null;
    if (req.body?.collectionName !== undefined) data.collectionName = String(req.body.collectionName || '').trim() || null;
    if (req.body?.status !== undefined) {
      const nextStatus = String(req.body.status || connection.status).toUpperCase();
      if (!['ACTIVE', 'DISABLED', 'ERROR'].includes(nextStatus)) {
        return res.status(400).json({ error: 'Invalid AI knowledge base status.' });
      }
      data.status = nextStatus;
    }

    const updated = await prisma.aiKnowledgeBaseConnection.update({ where: { id: connection.id }, data });
    const summary = await getConnectionSyncSummary(prisma, updated.id);
    res.json({ connection: serializeConnection(updated, summary), syncSummary: summary });
  } catch (error) {
    console.error('AI KB config update failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update AI knowledge base config.' });
  }
};

const refresh = async (req, res) => {
  try {
    const result = await refreshKnowledgeBase({ prisma, eurobotClient });
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
    const connection = await getActiveConnection(prisma);
    const items = connection
      ? await prisma.aiKnowledgeBaseSyncItem.findMany({
          where: { connectionId: connection.id },
          orderBy: { updatedAt: 'desc' },
          take: 200
        })
      : [];
    res.json({ items });
  } catch (error) {
    console.error('AI KB sync item list failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to list AI sync items.' });
  }
};

module.exports = {
  ensureDefault,
  getConfig,
  listRemote,
  listSyncItems,
  refresh,
  updateConfig
};
