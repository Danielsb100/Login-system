const env = require('../config/env');

const DEFAULT_QUESTION_COUNT = 5;
const DEFAULT_OPTIONS_PER_QUESTION = 4;
const MAX_FILE_BYTES_PER_ITEM = 20 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 60 * 1024 * 1024;

const clampInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const getModuleAssetUrl = (url = '') => {
  const match = String(url).match(/\/api\/documents\/download\/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
};

const normalizeGeneratedQuiz = (payload, questionCount, optionsPerQuestion) => {
  const rawQuestions = Array.isArray(payload?.questions) ? payload.questions : [];
  const questions = rawQuestions.slice(0, questionCount).map((question, questionIndex) => {
    const rawOptions = Array.isArray(question.options) ? question.options : [];
    const options = rawOptions
      .slice(0, optionsPerQuestion)
      .map((option, optionIndex) => ({
        text: String(option?.text || '').trim(),
        isCorrect: Boolean(option?.isCorrect) || Number(question.correctOptionIndex) === optionIndex
      }))
      .filter((option) => option.text);

    if (!options.some((option) => option.isCorrect) && options.length > 0) {
      options[0].isCorrect = true;
    }

    const firstCorrectIndex = options.findIndex((option) => option.isCorrect);
    options.forEach((option, optionIndex) => {
      option.isCorrect = optionIndex === firstCorrectIndex;
    });

    return {
      text: String(question?.text || question?.question || '').trim(),
      order: questionIndex,
      options
    };
  }).filter((question) => question.text && question.options.length >= 2);

  return {
    title: String(payload?.title || 'AI Generated Quiz').trim().slice(0, 160),
    questions
  };
};

const buildQuizJsonSchema = (questionCount, optionsPerQuestion) => ({
  type: 'object',
  additionalProperties: false,
  required: ['title', 'questions'],
  properties: {
    title: {
      type: 'string',
      description: 'Short title for the generated quiz/test.'
    },
    questions: {
      type: 'array',
      minItems: questionCount,
      maxItems: questionCount,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'options'],
        properties: {
          text: {
            type: 'string',
            description: 'Question text.'
          },
          options: {
            type: 'array',
            minItems: optionsPerQuestion,
            maxItems: optionsPerQuestion,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'isCorrect'],
              properties: {
                text: { type: 'string' },
                isCorrect: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }
});

const extractResponseText = (responsePayload) => {
  if (typeof responsePayload?.output_text === 'string') return responsePayload.output_text;

  const message = (responsePayload?.output || [])
    .flatMap((item) => item?.content || [])
    .find((content) => content?.type === 'output_text' && typeof content.text === 'string');

  return message?.text || '';
};

const buildModuleContextContent = (module, options = {}) => {
  const instructionLines = Array.isArray(options.instructionLines) ? options.instructionLines : [];
  const content = [];

  content.push({
    type: 'input_text',
    text: [
      ...instructionLines,
      instructionLines.length ? '' : null,
      '',
      `Module title: ${module.title || 'Untitled module'}`,
      `Module description: ${module.description || 'No description provided.'}`,
      '',
      'Videos:',
      ...(module.videos || []).map((video, index) => `${index + 1}. ${video.title || 'Untitled video'} — ${video.url || 'No URL'}`),
      '',
      'Documents/files:',
      ...(module.documents || []).map((moduleDocument, index) => {
        const doc = moduleDocument.document;
        return `${index + 1}. ${moduleDocument.title || doc?.name || 'Untitled file'} (${doc?.type || 'unknown type'})`;
      }),
      '',
      ...(module.quizzes || []).length ? ['Quiz questions (correct answers intentionally omitted):'] : [],
      ...(module.quizzes || []).flatMap((quiz, quizIndex) => [
        `${quizIndex + 1}. ${quiz.title || 'Untitled quiz'}`,
        ...(quiz.questions || []).map((question, questionIndex) => {
          const optionsText = (question.options || [])
            .map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option.text || ''}`)
            .join(' | ');
          return `   Q${questionIndex + 1}. ${question.text || ''}${optionsText ? ` Options: ${optionsText}` : ''}`;
        })
      ])
    ].filter((line) => line !== null).join('\n')
  });

  let totalBytes = 0;
  for (const moduleDocument of module.documents || []) {
    const doc = moduleDocument.document;
    if (!doc?.data || !doc?.name || !doc?.type) continue;

    const buffer = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data);
    if (buffer.length > MAX_FILE_BYTES_PER_ITEM || totalBytes + buffer.length > MAX_TOTAL_FILE_BYTES) {
      content.push({
        type: 'input_text',
        text: `Skipped file ${doc.name}: size ${buffer.length} bytes exceeds AI context upload limits.`
      });
      continue;
    }

    totalBytes += buffer.length;
    content.push({
      type: 'input_file',
      filename: doc.name,
      file_data: `data:${doc.type};base64,${buffer.toString('base64')}`
    });
  }

  for (const video of module.videos || []) {
    const documentId = getModuleAssetUrl(video.url);
    const doc = documentId
      ? (module.videoAssetDocuments || []).find((candidate) => candidate.id === documentId)
      : null;

    if (!doc?.data || !doc?.name || !doc?.type) continue;
    const buffer = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data);
    if (buffer.length > MAX_FILE_BYTES_PER_ITEM || totalBytes + buffer.length > MAX_TOTAL_FILE_BYTES) {
      content.push({
        type: 'input_text',
        text: `Skipped video asset ${doc.name}: size ${buffer.length} bytes exceeds AI context upload limits.`
      });
      continue;
    }

    totalBytes += buffer.length;
    content.push({
      type: 'input_file',
      filename: doc.name,
      file_data: `data:${doc.type};base64,${buffer.toString('base64')}`
    });
  }

  return content;
};

const buildModuleInputContent = (module, options = {}) => {
  const questionCount = clampInt(options.questionCount, DEFAULT_QUESTION_COUNT, 1, 30);
  const optionsPerQuestion = clampInt(options.optionsPerQuestion, DEFAULT_OPTIONS_PER_QUESTION, 2, 8);
  const content = buildModuleContextContent(module, {
    instructionLines: [
      `Create a ${questionCount}-question test/quiz for this training module.`,
      'Write the quiz title, questions, and answer options in English.',
      `Each question must have exactly ${optionsPerQuestion} options and exactly one correct option.`,
      'Use the module title, description, videos, linked documents/files, and any supplied file contents as source material.',
      'Avoid questions that depend on external knowledge not present in the module materials.'
    ]
  });

  return { content, questionCount, optionsPerQuestion };
};

const generateQuizFromModule = async (module, options = {}) => {
  if (!env.openai.apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const { content, questionCount, optionsPerQuestion } = buildModuleInputContent(module, options);
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
              text: 'You generate pedagogically useful multiple-choice tests from training module materials. Return only data that conforms to the requested schema.'
            }
          ]
        },
        { role: 'user', content }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'module_quiz',
          strict: true,
          schema: buildQuizJsonSchema(questionCount, optionsPerQuestion)
        }
      }
    })
  });

  const responsePayload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = responsePayload?.error?.message || `OpenAI Responses API failed with status ${response.status}.`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  const responseText = extractResponseText(responsePayload);
  if (!responseText) {
    throw new Error('OpenAI response did not include structured quiz output.');
  }

  return normalizeGeneratedQuiz(JSON.parse(responseText), questionCount, optionsPerQuestion);
};

module.exports = {
  DEFAULT_QUESTION_COUNT,
  DEFAULT_OPTIONS_PER_QUESTION,
  buildModuleContextContent,
  buildModuleInputContent,
  buildQuizJsonSchema,
  clampInt,
  generateQuizFromModule,
  getModuleAssetUrl,
  normalizeGeneratedQuiz
};
