const prismaDefault = require('../config/db');
const eurobotClientDefault = require('./eurobotClient');
const { getActiveConnections } = require('./aiKnowledgeSyncService');

const extractTrainingAiAnswer = (payload) => {
  if (typeof payload === 'string') return payload;
  if (typeof payload?.answer === 'string') return payload.answer;
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const outputText = (payload?.output || [])
    .flatMap((item) => item?.content || [])
    .find((content) => content?.type === 'output_text' && typeof content.text === 'string');
  return outputText?.text || '';
};

const buildTrainingAiPrompt = ({ message, moduleContext, courseContext }) => [
  'You are a helpful AI assistant for the Training platform.',
  'Use the configured Training knowledge base when possible and answer directly from retrieved course/material facts.',
  'Factual questions about course material, documents, naming conventions, rules, concepts, or procedures are allowed and should be answered from the knowledge base.',
  'If the knowledge base does not contain the answer, say so clearly and give only concise general guidance.',
  moduleContext?.title ? `Current module: ${moduleContext.title}` : null,
  moduleContext?.description ? `Module description: ${moduleContext.description}` : null,
  courseContext?.title ? `Current course: ${courseContext.title}` : null,
  courseContext?.description ? `Course description: ${courseContext.description}` : null,
  '',
  `Learner message: ${String(message || '').trim()}`
].filter(Boolean).join('\n');

const normalizeRequestedKnowledgeBaseIds = (knowledgeBaseId) => {
  if (Array.isArray(knowledgeBaseId)) return knowledgeBaseId.map(String).filter(Boolean);
  if (knowledgeBaseId) return [String(knowledgeBaseId)];
  return [];
};

const resolveKnowledgeBaseIds = async ({ prisma, knowledgeBaseId, eurobotClient }) => {
  const requested = normalizeRequestedKnowledgeBaseIds(knowledgeBaseId);
  if (requested.length) return requested;

  const connections = await getActiveConnections(prisma);
  const ids = connections
    .map((connection) => connection.remoteId || connection.collectionName || connection.remoteName)
    .filter(Boolean)
    .map(String);

  if (!ids.length) {
    const error = new Error('AI knowledge base is not configured. Ask a manager to create or select one or more Training knowledge bases.');
    error.statusCode = 503;
    throw error;
  }
  return ids;
};

const chatWithTrainingAi = async ({
  prisma = prismaDefault,
  eurobotClient = eurobotClientDefault,
  message,
  conversationId,
  knowledgeBaseId,
  moduleContext,
  courseContext,
  returnAudio = false
} = {}) => {
  const trimmed = String(message || '').trim();
  if (!trimmed) {
    const error = new Error('Message is required.');
    error.statusCode = 400;
    throw error;
  }

  const knowledgeBaseIds = await resolveKnowledgeBaseIds({ prisma, knowledgeBaseId, eurobotClient });
  const payload = await eurobotClient.chat({
    message: buildTrainingAiPrompt({ message: trimmed, moduleContext, courseContext }),
    conversationId: conversationId || 'training-ai',
    knowledgeBaseIds,
    returnAudio,
    useWebSearch: false
  });

  const answer = extractTrainingAiAnswer(payload).trim();
  if (!answer) {
    const error = new Error('Eurobot response did not include assistant output.');
    error.statusCode = 502;
    throw error;
  }

  return {
    answer,
    citations: payload?.citations || [],
    audioBase64: payload?.audio_base64 || payload?.audioBase64 || null,
    audioFormat: payload?.audio_format || payload?.audioFormat || null
  };
};

module.exports = {
  buildTrainingAiPrompt,
  chatWithTrainingAi,
  extractTrainingAiAnswer,
  resolveKnowledgeBaseIds
};
