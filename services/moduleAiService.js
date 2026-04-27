const env = require('../config/env');
const { buildModuleContextContent } = require('./openaiQuizService');

const extractResponseText = (responsePayload) => {
  if (typeof responsePayload?.output_text === 'string') return responsePayload.output_text;

  const message = (responsePayload?.output || [])
    .flatMap((item) => item?.content || [])
    .find((content) => content?.type === 'output_text' && typeof content.text === 'string');

  return message?.text || '';
};

const buildAssistantInputContent = (module, message) => [
  ...buildModuleContextContent(module, {
    instructionLines: [
      'You are a helpful learning assistant for this training module.',
      'Answer using only the module title, description, videos, linked documents/files, and supplied file contents as source material when possible.',
      'If the answer is not in the module materials, say so and offer a brief general explanation only when it is clearly marked as general guidance.',
      'Do not reveal, identify, or imply correct quiz answers. You may explain concepts and guide the learner to review relevant material.',
      'Keep responses concise, educational, and actionable.'
    ]
  }),
  {
    type: 'input_text',
    text: `Learner message: ${String(message || '').trim()}`
  }
];

const generateModuleAssistantResponse = async (module, message) => {
  if (!env.openai.apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const trimmedMessage = String(message || '').trim();
  if (!trimmedMessage) {
    const error = new Error('Message is required.');
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openai.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.openai.quizModel,
      reasoning: {
        effort: env.openai.reasoningEffort
      },
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'You assist learners with training module content. Never disclose correct quiz answers or answer keys.'
            }
          ]
        },
        { role: 'user', content: buildAssistantInputContent(module, trimmedMessage) }
      ]
    })
  });

  const responsePayload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messageText = responsePayload?.error?.message || `OpenAI Responses API failed with status ${response.status}.`;
    const error = new Error(messageText);
    error.statusCode = response.status;
    throw error;
  }

  const answer = extractResponseText(responsePayload).trim();
  if (!answer) {
    throw new Error('OpenAI response did not include assistant output.');
  }

  return answer;
};

module.exports = {
  buildAssistantInputContent,
  generateModuleAssistantResponse
};
