const assert = require('assert');

async function run() {
  const calls = [];
  const fakePrisma = {
    aiKnowledgeBaseConnection: {
      findMany: async () => ([
        { id: 7, remoteId: 'kb-remote-1', remoteName: 'training-default', collectionName: 'training_default', isDefault: true, status: 'ACTIVE' },
        { id: 8, remoteId: 'kb-remote-2', remoteName: 'training-extra', collectionName: 'training_extra', isDefault: true, status: 'ACTIVE' }
      ])
    }
  };
  const fakeEurobot = {
    chat: async (payload) => {
      calls.push(payload);
      return { answer: 'training ok', citations: [{ title: 'Source' }] };
    }
  };

  const { chatWithTrainingAi, extractTrainingAiAnswer } = require('../services/trainingAiService');

  assert.strictEqual(extractTrainingAiAnswer({ output_text: 'hello' }), 'hello');
  assert.strictEqual(extractTrainingAiAnswer({ answer: 'answer text' }), 'answer text');

  const response = await chatWithTrainingAi({
    prisma: fakePrisma,
    eurobotClient: fakeEurobot,
    message: 'What should I study?',
    conversationId: 'conv-1',
    moduleContext: { title: 'Intro', description: 'Basics' }
  });

  assert.deepStrictEqual(response, {
    answer: 'training ok',
    citations: [{ title: 'Source' }],
    audioBase64: null,
    audioFormat: null
  });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].conversationId, 'conv-1');
  assert.deepStrictEqual(calls[0].knowledgeBaseIds, ['kb-remote-1', 'kb-remote-2']);
  assert.match(calls[0].message, /What should I study\?/);
  assert.match(calls[0].message, /Current module: Intro/);
  assert.match(calls[0].message, /Factual questions about course material/);
  assert.doesNotMatch(calls[0].message, /quiz|answer key|correct option/i);

  await assert.rejects(
    () => chatWithTrainingAi({
      prisma: { aiKnowledgeBaseConnection: { findMany: async () => [] } },
      eurobotClient: fakeEurobot,
      message: 'hello'
    }),
    (error) => error.statusCode === 503 && /AI knowledge base/.test(error.message)
  );

  console.log('trainingAiService tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
