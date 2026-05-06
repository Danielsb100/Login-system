const env = require('../config/env');

const DEFAULT_TIMEOUT_MS = 60_000;

const trimSlashes = (value = '') => String(value || '').replace(/\/+$/, '');

const getEurobotBaseUrl = () => trimSlashes(env.eurobot?.apiUrl || '');

const buildEurobotUrl = (path, params) => {
  const baseUrl = getEurobotBaseUrl();
  if (!baseUrl) {
    const error = new Error('EUROBOT_API_URL is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const url = new URL(path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url;
};

const serviceHeaders = (extraHeaders = {}) => {
  const headers = { ...extraHeaders };
  if (env.eurobot?.serviceApiKey) {
    headers[env.eurobot.serviceApiKeyHeader || 'X-Eurobot-Service-Key'] = env.eurobot.serviceApiKey;
    headers['X-Eurobot-Service-Client'] = env.eurobot.serviceClient || 'training';
  }
  return headers;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Eurobot request timed out after ${timeoutMs}ms.`);
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const parseEurobotResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload.detail || payload.error || payload.message || `Eurobot request failed with status ${response.status}.`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const eurobotJsonRequest = async (path, { method = 'GET', body, params, timeoutMs } = {}) => {
  const response = await fetchWithTimeout(buildEurobotUrl(path, params), {
    method,
    headers: serviceHeaders({ 'Content-Type': 'application/json' }),
    body: body === undefined ? undefined : JSON.stringify(body)
  }, timeoutMs);
  return parseEurobotResponse(response);
};

const listInternalCollections = () => eurobotJsonRequest('/admin/internal-collections');

const createInternalCollection = ({ name, description, sourceApp = env.eurobot?.serviceClient || 'training' }) => eurobotJsonRequest('/admin/internal-collections', {
  method: 'POST',
  body: { name, description: description || null, source_app: sourceApp || null }
});

const updateInternalCollection = (collectionId, { name, description }) => eurobotJsonRequest(`/admin/internal-collections/${encodeURIComponent(collectionId)}`, {
  method: 'PUT',
  body: { name: name || null, description: description || null }
});

const deleteInternalCollection = (collectionId) => eurobotJsonRequest(`/admin/internal-collections/${encodeURIComponent(collectionId)}`, {
  method: 'DELETE'
});

const deleteFileFromInternalCollection = ({ collectionId, fileId }) => eurobotJsonRequest(
  `/admin/internal-collections/${encodeURIComponent(collectionId)}/files/${encodeURIComponent(fileId)}`,
  { method: 'DELETE' }
);

const listInternalCollectionFiles = ({ collectionId }) => eurobotJsonRequest(
  `/admin/internal-collections/${encodeURIComponent(collectionId)}/files`
);

const checkFileExists = ({ collectionName, filename }) => eurobotJsonRequest(
  `/admin/collections/${encodeURIComponent(collectionName)}/files/check`,
  { params: { filename } }
);

const chat = ({ message, conversationId, knowledgeBaseIds = [], returnAudio = false, useWebSearch = false }) => {
  const path = env.eurobot?.chatBackend === 'route-query' ? '/route-query/' : '/responses/chat';
  if (path === '/route-query/') {
    return eurobotJsonRequest(path, {
      method: 'GET',
      params: {
        query: message,
        conversation_id: conversationId || 'training',
        knowledge_base_ids: Array.isArray(knowledgeBaseIds) ? knowledgeBaseIds.join(',') : knowledgeBaseIds
      },
      timeoutMs: 120_000
    });
  }

  return eurobotJsonRequest(path, {
    method: 'POST',
    body: {
      query: message,
      conversation_id: conversationId || 'training',
      knowledge_base_ids: Array.isArray(knowledgeBaseIds) ? knowledgeBaseIds.join(',') : knowledgeBaseIds,
      return_audio: returnAudio,
      use_web_search: useWebSearch
    },
    timeoutMs: 120_000
  });
};

const transcribe = async ({ fileBuffer, filename = 'audio.webm', mimeType = 'audio/webm' }) => {
  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  form.append('audio', blob, filename);
  const response = await fetchWithTimeout(buildEurobotUrl('/transcribe'), {
    method: 'POST',
    headers: serviceHeaders(),
    body: form
  }, 120_000);
  return parseEurobotResponse(response);
};

const tts = ({ text }) => eurobotJsonRequest('/tts', {
  method: 'POST',
  body: { text },
  timeoutMs: 120_000
});

const uploadFilesToInternalCollection = async (collectionId, files, { baseUrl } = {}) => {
  const form = new FormData();
  for (const file of files || []) {
    const blob = new Blob([file.buffer], { type: file.mimeType || 'application/octet-stream' });
    form.append('files', blob, file.filename || 'document');
  }
  const response = await fetchWithTimeout(buildEurobotUrl(`/admin/internal-collections/${encodeURIComponent(collectionId)}/upload`, { base_url: baseUrl }), {
    method: 'POST',
    headers: serviceHeaders(),
    body: form
  }, 300_000);
  return parseEurobotResponse(response);
};

const getDefaultKnowledgeBaseName = () => `${env.eurobot.defaultKbPrefix}-${env.eurobot.tenantCode}`;

module.exports = {
  buildEurobotUrl,
  chat,
  checkFileExists,
  createInternalCollection,
  deleteFileFromInternalCollection,
  deleteInternalCollection,
  getDefaultKnowledgeBaseName,
  listInternalCollectionFiles,
  listInternalCollections,
  serviceHeaders,
  transcribe,
  tts,
  updateInternalCollection,
  uploadFilesToInternalCollection
};
