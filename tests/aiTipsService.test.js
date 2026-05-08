const assert = require('assert');

const { buildTipsForUser, buildQuizTipLlmContent, normalizeLlmQuizTipPayload } = require('../services/aiTipsService');
const { inferSubmittedQuizId } = require('../controllers/contentController');

const makeCourse = () => ({
  id: 11,
  title: 'Portfolio Course',
  enrollments: [{ userId: 77, status: 'ENROLLED', progressPercent: 20, createdAt: new Date('2026-05-01T00:00:00Z') }],
  completions: [],
  courseModules: [{
    moduleId: 30,
    orderIndex: 1,
    module: {
      id: 30,
      title: 'ASL Dev Portfolio',
      videos: [],
      documents: [{
        id: 901,
        title: 'Portfolio source material',
        document: {
          id: 901,
          name: 'portfolio-source.txt',
          type: 'text/plain',
          data: Buffer.from('Source material: André focuses on AI systems, intelligent process automation, and deployable portfolio products.')
        },
        downloads: [{ timestamp: new Date('2026-05-08T16:00:00Z') }]
      }],
      accessLogs: [],
      submissions: [{
        id: 501,
        userId: 77,
        moduleId: 30,
        quizId: null,
        score: 60,
        attemptNumber: 1,
        createdAt: new Date('2026-05-08T16:23:27Z'),
        answers: [
          {
            questionId: 37,
            optionId: 3702,
            question: { id: 37, quizId: 8, text: 'Which portfolio detail should be improved?' },
            option: { id: 3702, text: 'Wrong detail', isCorrect: false }
          },
          {
            questionId: 38,
            optionId: 3801,
            question: { id: 38, quizId: 8, text: 'Which repo hosts the project?' },
            option: { id: 3801, text: 'Correct repo', isCorrect: true }
          },
          {
            questionId: 39,
            optionId: 3902,
            question: { id: 39, quizId: 8, text: 'Which deployment step was missing?' },
            option: { id: 3902, text: 'Wrong deployment step', isCorrect: false }
          }
        ]
      }],
      quizzes: [{
        id: 8,
        title: 'ASL Dev Portfolio Quiz',
        submissions: [],
        questions: [
          {
            id: 37,
            quizId: 8,
            text: 'Which portfolio detail should be improved?',
            order: 1,
            options: [
              { id: 3701, text: 'AI systems and intelligent process automation', isCorrect: true },
              { id: 3702, text: 'Wrong detail', isCorrect: false }
            ]
          },
          {
            id: 38,
            quizId: 8,
            text: 'Which repo hosts the project?',
            order: 2,
            options: [
              { id: 3801, text: 'Correct repo', isCorrect: true },
              { id: 3802, text: 'Wrong repo', isCorrect: false }
            ]
          },
          {
            id: 39,
            quizId: 8,
            text: 'Which deployment step was missing?',
            order: 3,
            options: [
              { id: 3901, text: 'Restart and smoke-test the local services', isCorrect: true },
              { id: 3902, text: 'Wrong deployment step', isCorrect: false }
            ]
          }
        ]
      }]
    }
  }]
});

async function run() {
  const fakePrisma = {
    course: {
      findMany: async () => [makeCourse()]
    }
  };

  let llmContext;
  const fakeLlmTipGenerator = async ({ quiz, module, course }) => {
    const built = buildQuizTipLlmContent({ quiz, module, course });
    llmContext = built.content;
    return normalizeLlmQuizTipPayload({
      title: 'Review portfolio positioning and deployment workflow',
      summary: 'You scored 60%, so focus on the concepts behind your missed answers rather than memorizing the question text.',
      focusAreas: [
        'Clarify the professional positioning around AI systems and intelligent process automation.',
        'Review the deployment/restart workflow used to make local services testable.'
      ],
      nextSteps: [
        'Re-read the portfolio source material.',
        'Compare each missed answer with the correct answer before retaking the quiz.'
      ],
      confidence: 'high'
    });
  };

  const tips = await buildTipsForUser({ prisma: fakePrisma, userId: 77, llmTipGenerator: fakeLlmTipGenerator });
  const quizTip = tips.find((tip) => tip.scope === 'QUIZ' && tip.metadata?.rule === 'low-quiz-score');
  assert(quizTip, 'expected low-score quiz tip for legacy null-quizId submission');
  assert.strictEqual(quizTip.severity, 'WARNING');
  assert.match(quizTip.message, /concepts behind your missed answers/);
  assert.strictEqual(quizTip.metadata.llmGenerated, true);
  assert.deepStrictEqual(quizTip.metadata.focusAreas, [
    'Clarify the professional positioning around AI systems and intelligent process automation.',
    'Review the deployment/restart workflow used to make local services testable.'
  ]);
  assert.deepStrictEqual(quizTip.metadata.nextSteps, [
    'Re-read the portfolio source material.',
    'Compare each missed answer with the correct answer before retaking the quiz.'
  ]);
  assert.strictEqual(quizTip.metadata.latestScore, 60);
  assert.strictEqual(quizTip.metadata.wrongQuestions.length, 2);
  const llmText = llmContext.map((part) => part.text || part.filename || '').join('\n');
  assert.match(llmText, /studentAnswer/);
  assert.match(llmText, /correctAnswer/);
  assert.match(llmText, /Wrong detail/);
  assert.match(llmText, /AI systems and intelligent process automation/);
  assert.match(llmText, /portfolio-source\.txt/);
  assert.match(llmText, /Source material: André focuses on AI systems/);

  const materialTip = tips.find((tip) => tip.scope === 'MATERIALS' && tip.metadata?.rule === 'material-gap');
  assert(!materialTip, 'submitted legacy null-quizId quiz should not remain pending material');

  assert.strictEqual(
    inferSubmittedQuizId({
      quizzes: [
        { id: 8, questions: [{ id: 37 }, { id: 38 }] },
        { id: 9, questions: [{ id: 99 }] }
      ]
    }, [{ questionId: 37 }, { questionId: 38 }]),
    8
  );

  assert.strictEqual(
    inferSubmittedQuizId({
      quizzes: [
        { id: 8, questions: [{ id: 37 }] },
        { id: 9, questions: [{ id: 99 }] }
      ]
    }, [{ questionId: 37 }, { questionId: 99 }]),
    null,
    'mixed answers across quizzes should not guess a quizId'
  );

  console.log('aiTipsService tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
