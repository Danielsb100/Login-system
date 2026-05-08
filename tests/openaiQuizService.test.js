const assert = require('assert');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const {
  buildModuleInputContent,
  clampInt,
  getModuleAssetUrl,
  normalizeGeneratedQuiz
} = require('../services/openaiQuizService');

function decodeInputFileText(inputFile) {
  const [, base64Data = ''] = String(inputFile.file_data || '').split(',');
  return Buffer.from(base64Data, 'base64').toString('utf8');
}

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

  const storageKey = path.posix.join('quiz-service-test', `local-doc-${Date.now()}.txt`);
  const videoStorageKey = path.posix.join('quiz-service-test', `local-video-${Date.now()}.txt`);
  const storagePath = path.resolve(env.upload.storageDir, storageKey);
  const videoStoragePath = path.resolve(env.upload.storageDir, videoStorageKey);
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  fs.writeFileSync(storagePath, 'SECRET QUIZ FACT: BLUE ORCHID 527 means choose the blue helmet.');
  fs.writeFileSync(videoStoragePath, 'VIDEO TRANSCRIPT FACT: GREEN LANTERN 921 means inspect the harness.');
  try {
    const localStorageInput = buildModuleInputContent({
      title: 'Storage Module',
      description: 'Use local stored document content',
      videos: [{ title: 'Stored Video', url: '/api/documents/download/91' }],
      documents: [
        {
          title: 'Stored Safety Facts',
          document: {
            name: 'stored-safety-facts.txt',
            type: 'text/plain',
            data: null,
            storageProvider: 'local',
            storageKey,
            sizeBytes: fs.statSync(storagePath).size
          }
        }
      ],
      videoAssetDocuments: [
        {
          id: 91,
          name: 'stored-video-transcript.txt',
          type: 'text/plain',
          data: null,
          storageProvider: 'local',
          storageKey: videoStorageKey,
          sizeBytes: fs.statSync(videoStoragePath).size
        }
      ]
    }, { questionCount: 1, optionsPerQuestion: 2 });

    const localFiles = localStorageInput.content.filter((item) => item.type === 'input_file');
    assert.strictEqual(localFiles.length, 2);
    assert.strictEqual(localFiles[0].filename, 'stored-safety-facts.txt');
    assert.strictEqual(localFiles[1].filename, 'stored-video-transcript.txt');
    assert(decodeInputFileText(localFiles[0]).includes('BLUE ORCHID 527'));
    assert(decodeInputFileText(localFiles[1]).includes('GREEN LANTERN 921'));
  } finally {
    fs.rmSync(path.dirname(storagePath), { recursive: true, force: true });
  }

  console.log('openaiQuizService tests passed');
}

run();
