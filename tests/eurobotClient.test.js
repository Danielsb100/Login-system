const assert = require('assert');

function loadClient(env = {}) {
  Object.assign(process.env, env);
  delete require.cache[require.resolve('../config/env')];
  delete require.cache[require.resolve('../services/eurobotClient')];
  return require('../services/eurobotClient');
}

async function run() {
  const client = loadClient({
    EUROBOT_API_URL: 'https://eurobot.example.com/',
    EUROBOT_SERVICE_API_KEY: 'secret',
    EUROBOT_SERVICE_CLIENT: 'training',
    EUROBOT_SERVICE_API_KEY_HEADER: 'X-Eurobot-Service-Key',
    EUROBOT_DEFAULT_KB_PREFIX: 'training',
    TRAINING_TENANT_CODE: 'tenant-a'
  });

  assert.strictEqual(String(client.buildEurobotUrl('/responses/chat')), 'https://eurobot.example.com/responses/chat');
  assert.deepStrictEqual(client.serviceHeaders(), {
    'X-Eurobot-Service-Key': 'secret',
    'X-Eurobot-Service-Client': 'training'
  });
  assert.strictEqual(client.getDefaultKnowledgeBaseName(), 'training-tenant-a');

  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ answer: 'ok' })
    };
  };

  const response = await client.chat({
    message: 'Hello',
    conversationId: 'conv-1',
    knowledgeBaseIds: ['kb-1'],
    returnAudio: false
  });

  assert.deepStrictEqual(response, { answer: 'ok' });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, 'https://eurobot.example.com/responses/chat');
  assert.strictEqual(calls[0].options.headers['X-Eurobot-Service-Key'], 'secret');
  assert.strictEqual(calls[0].options.headers['X-Eurobot-Service-Client'], 'training');
  assert.strictEqual(calls[0].options.headers['Content-Type'], 'application/json');
  assert.deepStrictEqual(JSON.parse(calls[0].options.body), {
    query: 'Hello',
    conversation_id: 'conv-1',
    knowledge_base_ids: 'kb-1',
    return_audio: false,
    use_web_search: false
  });

  global.fetch = async () => ({
    ok: false,
    status: 401,
    headers: { get: () => 'application/json' },
    json: async () => ({ detail: 'Missing authentication' })
  });

  await assert.rejects(
    () => client.listInternalCollections(),
    (error) => error.statusCode === 401 && error.message === 'Missing authentication'
  );

  console.log('eurobotClient tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
