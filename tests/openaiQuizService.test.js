const assert = require('assert');
const {
  buildModuleInputContent,
  clampInt,
  getModuleAssetUrl,
  normalizeGeneratedQuiz
} = require('../services/openaiQuizService');

function run() {
  assert.strictEqual(clampInt('5', 1, 1, 10), 5);
  assert.strictEqual(clampInt('99', 1, 1, 10), 10);
  assert.strictEqual(clampInt('bad', 3, 1, 10), 3);

  assert.strictEqual(getModuleAssetUrl('/api/documents/download/42'), 42);
  assert.strictEqual(getModuleAssetUrl('http://localhost:3000/api/documents/download/7'), 7);
  assert.strictEqual(getModuleAssetUrl('https://youtu.be/example'), null);

  const normalized = normalizeGeneratedQuiz({
    title: 'Generated',
    questions: [
      {
        text: 'What is the goal?',
        options: [
          { text: 'Learn', isCorrect: false },
          { text: 'Ignore', isCorrect: false },
          { text: 'Practice', isCorrect: true },
          { text: 'Skip', isCorrect: true }
        ]
      },
      {
        question: 'Fallback property?',
        options: [
          { text: 'Yes', isCorrect: false },
          { text: 'No', isCorrect: false }
        ]
      }
    ]
  }, 2, 4);

  assert.strictEqual(normalized.title, 'Generated');
  assert.strictEqual(normalized.questions.length, 2);
  assert.strictEqual(normalized.questions[0].options.filter((option) => option.isCorrect).length, 1);
  assert.strictEqual(normalized.questions[1].options[0].isCorrect, true);

  const moduleInput = buildModuleInputContent({
    title: 'Module A',
    description: 'Description A',
    videos: [{ title: 'Video A', url: '/api/documents/download/12' }],
    documents: [
      {
        title: 'Doc A',
        document: {
          name: 'doc-a.txt',
          type: 'text/plain',
          data: Buffer.from('hello world')
        }
      }
    ],
    videoAssetDocuments: [
      {
        id: 12,
        name: 'video-a.mp4',
        type: 'video/mp4',
        data: Buffer.from('fake video bytes')
      }
    ]
  }, { questionCount: 6, optionsPerQuestion: 3 });

  assert.strictEqual(moduleInput.questionCount, 6);
  assert.strictEqual(moduleInput.optionsPerQuestion, 3);
  assert(moduleInput.content.some((item) => item.type === 'input_text' && item.text.includes('Module A')));
  assert.strictEqual(moduleInput.content.filter((item) => item.type === 'input_file').length, 2);

  console.log('openaiQuizService tests passed');
}

run();
