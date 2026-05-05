const assert = require('assert');

async function run() {
  const { buildMaterialFilename, buildTrainingMaterialList, stripQuizAnswerKeys } = require('../services/trainingKnowledgeMaterialService');
  const fs = require('fs');
  const path = require('path');
  const env = require('../config/env');

  assert.strictEqual(buildMaterialFilename('TrainingModule', 42, 'metadata'), 'trainingmodule-42-metadata.txt');

  const quiz = {
    title: 'Safety Quiz',
    questions: [
      {
        text: 'What is safe?',
        options: [
          { text: 'Correct option', isCorrect: true },
          { text: 'Wrong option', isCorrect: false }
        ]
      }
    ]
  };
  const stripped = stripQuizAnswerKeys([quiz]);
  assert.deepStrictEqual(stripped[0].questions[0].options, ['Correct option', 'Wrong option']);
  assert.strictEqual(JSON.stringify(stripped).includes('isCorrect'), false);

  const fakePrisma = {
    trainingModule: {
      findMany: async () => ([{
        id: 3,
        title: 'Module A',
        description: 'Description A',
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        documents: [{ title: 'Doc A', document: { id: 9, name: 'doc.txt', type: 'text/plain', data: Buffer.from('Document body'), sizeBytes: 13, updatedAt: new Date('2026-01-02T00:00:00Z') } }],
        videos: [{ id: 5, title: 'Video A', url: 'https://example.com/video', updatedAt: new Date('2026-01-03T00:00:00Z') }],
        quizzes: [quiz]
      }])
    },
    course: { findMany: async () => [] }
  };

  const materials = await buildTrainingMaterialList(fakePrisma);
  assert(materials.some((item) => item.sourceType === 'TrainingModule' && item.sourceId === 3));
  assert(materials.some((item) => item.sourceType === 'Document' && item.sourceId === 9 && Buffer.isBuffer(item.buffer)));
  const combined = materials.map((item) => item.text || item.buffer?.toString('utf8') || '').join('\n');
  assert.match(combined, /Module A/);
  assert.match(combined, /Video A/);
  assert.strictEqual(combined.includes('isCorrect'), false);

  console.log('trainingKnowledgeMaterialService tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
