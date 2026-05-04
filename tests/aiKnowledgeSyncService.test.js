const assert = require('assert');

async function run() {
  const materialServicePath = require.resolve('../services/trainingKnowledgeMaterialService');
  require.cache[materialServicePath] = {
    id: materialServicePath,
    filename: materialServicePath,
    loaded: true,
    exports: {
      buildTrainingMaterialList: async () => ([{
        sourceType: 'TrainingModule',
        sourceId: '42',
        sourceHash: 'hash-v1',
        text: 'module text',
        filename: 'training-module-42.txt',
        mimeType: 'text/plain'
      }])
    }
  };

  const {
    ensureDefaultKnowledgeBaseConnection,
    refreshKnowledgeBase,
    summarizeSyncItems
  } = require('../services/aiKnowledgeSyncService');

  assert.deepStrictEqual(summarizeSyncItems([
    { status: 'PENDING' },
    { status: 'SYNCED' },
    { status: 'SYNCED' },
    { status: 'FAILED' }
  ]), { pending: 1, synced: 2, failed: 1, skipped: 0, stale: 0, total: 4 });

  const prismaCalls = [];
  const fakePrisma = {
    aiKnowledgeBaseConnection: {
      findFirst: async () => null,
      create: async (payload) => {
        prismaCalls.push(payload);
        return { id: 1, ...payload.data };
      }
    }
  };
  const eurobotCalls = [];
  const fakeEurobot = {
    getDefaultKnowledgeBaseName: () => 'training-tenant-a',
    listInternalCollections: async () => ({ items: [] }),
    createInternalCollection: async (payload) => {
      eurobotCalls.push(payload);
      return { id: 'remote-1', name: payload.name, collection_name: 'training_tenant_a' };
    }
  };

  const connection = await ensureDefaultKnowledgeBaseConnection({ prisma: fakePrisma, eurobotClient: fakeEurobot });
  assert.strictEqual(connection.remoteId, 'remote-1');
  assert.strictEqual(connection.collectionName, 'training_tenant_a');
  assert.strictEqual(eurobotCalls[0].name, 'training-tenant-a');
  assert.strictEqual(prismaCalls[0].data.isDefault, true);

  const createRefreshPrisma = (existingItem = null) => {
    let item = existingItem ? { id: 7, ...existingItem } : null;
    return {
      itemUpdates: [],
      aiKnowledgeBaseConnection: {
        findFirst: async () => ({ id: 1, remoteId: 'remote-1', collectionName: 'training_tenant_a', status: 'ACTIVE' }),
        update: async ({ data }) => ({ id: 1, remoteId: 'remote-1', collectionName: 'training_tenant_a', status: 'ACTIVE', ...data })
      },
      aiKnowledgeBaseSyncItem: {
        findUnique: async () => item,
        upsert: async ({ update, create }) => {
          item = item ? { ...item, ...update } : { id: 7, ...create };
          return item;
        },
        update: async ({ data }) => {
          item = { ...item, ...data };
          return item;
        },
        updateMany: async () => ({ count: 0 })
      }
    };
  };

  const successfulUploadPrisma = createRefreshPrisma();
  const successfulResult = await refreshKnowledgeBase({
    prisma: successfulUploadPrisma,
    eurobotClient: {
      getDefaultKnowledgeBaseName: () => 'training-tenant-a',
      listInternalCollections: async () => ({ items: [{ id: 'remote-1', name: 'training-tenant-a', collection_name: 'training_tenant_a' }] }),
      uploadFilesToInternalCollection: async () => ({
        count: 1,
        results: [{ done: true, pipeline: { doc_id: 'doc-123' }, filename: 'training-module-42.txt' }]
      })
    }
  });
  assert.strictEqual(successfulResult.summary.synced, 1);
  assert.strictEqual(successfulResult.items[0].remoteFileId, 'doc-123');

  const failedUploadPrisma = createRefreshPrisma();
  const failedResult = await refreshKnowledgeBase({
    prisma: failedUploadPrisma,
    eurobotClient: {
      getDefaultKnowledgeBaseName: () => 'training-tenant-a',
      listInternalCollections: async () => ({ items: [{ id: 'remote-1', name: 'training-tenant-a', collection_name: 'training_tenant_a' }] }),
      uploadFilesToInternalCollection: async () => ({
        count: 1,
        results: [{ done: false, error: 'pipeline unavailable', filename: 'training-module-42.txt' }]
      })
    }
  });
  assert.strictEqual(failedResult.summary.failed, 1);
  assert.match(failedResult.items[0].lastError, /pipeline unavailable/);

  let retryUploadCalls = 0;
  await refreshKnowledgeBase({
    prisma: createRefreshPrisma({
      connectionId: 1,
      sourceType: 'TrainingModule',
      sourceId: '42',
      sourceHash: 'hash-v1',
      status: 'SYNCED',
      remoteFileId: ''
    }),
    eurobotClient: {
      getDefaultKnowledgeBaseName: () => 'training-tenant-a',
      listInternalCollections: async () => ({ items: [{ id: 'remote-1', name: 'training-tenant-a', collection_name: 'training_tenant_a' }] }),
      uploadFilesToInternalCollection: async () => {
        retryUploadCalls += 1;
        return { count: 1, results: [{ done: true, pipeline: { doc_id: 'doc-retried' } }] };
      }
    }
  });
  assert.strictEqual(retryUploadCalls, 1, 'items previously marked synced without a remote file id should be retried');

  console.log('aiKnowledgeSyncService tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
