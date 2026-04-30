const assert = require('assert');

async function run() {
  const { ensureDefaultKnowledgeBaseConnection, summarizeSyncItems } = require('../services/aiKnowledgeSyncService');

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

  console.log('aiKnowledgeSyncService tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
