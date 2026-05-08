const fs = require('fs');

const prismaDefault = require('../config/db');
const env = require('../config/env');
const { createLocalAssetStorage } = require('./assetStorage');

const assetStorage = createLocalAssetStorage({ rootDir: env.upload.storageDir });

const LOW_SCORE_THRESHOLD = 70;
const CRITICAL_SCORE_THRESHOLD = 50;
const INACTIVITY_DAYS = 7;
const TIP_TTL_DAYS = 14;
const MAX_LLM_FILE_BYTES_PER_ITEM = 20 * 1024 * 1024;
const MAX_LLM_TOTAL_FILE_BYTES = 60 * 1024 * 1024;

const toIntOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const daysSince = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
};

const maxDate = (...values) => values
  .flat()
  .filter(Boolean)
  .map((value) => new Date(value))
  .filter((value) => !Number.isNaN(value.getTime()))
  .sort((a, b) => b - a)[0] || null;

const normalizeScore = (value) => {
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
};

const truncateText = (value, maxLength = 12000) => {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n[truncated]`;
};

const extractResponseText = (responsePayload) => {
  if (typeof responsePayload?.output_text === 'string') return responsePayload.output_text;

  const message = (responsePayload?.output || [])
    .flatMap((item) => item?.content || [])
    .find((content) => content?.type === 'output_text' && typeof content.text === 'string');

  return message?.text || '';
};

const getDocumentBuffer = (doc) => {
  if (doc?.data) return Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data);
  if (doc?.storageProvider === 'local' && doc.storageKey) {
    return fs.readFileSync(assetStorage.resolvePath(doc.storageKey));
  }
  return null;
};

const getDocumentTextSnippet = (doc, maxLength = 12000) => {
  if (!doc) return '';
  const type = String(doc.type || '').toLowerCase();
  const isTextLike = type.startsWith('text/') || type.includes('json') || type.includes('xml') || type.includes('csv') || type.includes('markdown');
  if (!isTextLike) return `[${doc.name || 'file'} attached as ${doc.type || 'unknown type'}; use the attached file as source material.]`;
  try {
    const buffer = getDocumentBuffer(doc);
    return buffer ? truncateText(buffer.toString('utf8'), maxLength) : '';
  } catch (error) {
    return `[${doc.name || 'file'} could not be read from storage.]`;
  }
};

const appendDocumentInputFile = (content, doc, totalBytesRef) => {
  if (!doc?.name || !doc?.type) return;
  let buffer;
  try {
    buffer = getDocumentBuffer(doc);
  } catch (error) {
    return;
  }
  if (!buffer) return;
  const fileSize = Number.isFinite(doc.sizeBytes) && doc.sizeBytes > buffer.length ? doc.sizeBytes : buffer.length;
  if (fileSize > MAX_LLM_FILE_BYTES_PER_ITEM || totalBytesRef.value + fileSize > MAX_LLM_TOTAL_FILE_BYTES) return;
  totalBytesRef.value += fileSize;
  content.push({
    type: 'input_file',
    filename: doc.name,
    file_data: `data:${doc.type};base64,${buffer.toString('base64')}`
  });
};

const buildAiTipJsonSchema = () => ({
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'focusAreas', 'nextSteps', 'confidence'],
  properties: {
    title: { type: 'string', description: 'Short coaching title, max 90 characters.' },
    summary: { type: 'string', description: 'One or two concise sentences of personalized study guidance.' },
    focusAreas: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
    nextSteps: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] }
  }
});

const normalizeList = (value, fallback = []) => (Array.isArray(value) ? value : fallback)
  .map((item) => String(item || '').trim())
  .filter(Boolean)
  .slice(0, 5);

const normalizeLlmQuizTipPayload = (payload = {}) => {
  const focusAreas = normalizeList(payload.focusAreas);
  const nextSteps = normalizeList(payload.nextSteps);
  return {
    title: String(payload.title || 'Review this quiz').trim().slice(0, 140),
    summary: String(payload.summary || 'Review the concepts behind the missed answers before retaking the quiz.').trim().slice(0, 900),
    focusAreas: focusAreas.length ? focusAreas : ['Review the concepts behind the missed answers in the module material.'],
    nextSteps: nextSteps.length ? nextSteps : ['Revisit the module material, compare your answers with the correct answers, then retake the quiz.'],
    confidence: ['low', 'medium', 'high'].includes(payload.confidence) ? payload.confidence : 'medium'
  };
};

const buildCourseIncludeForUser = (userId) => ({
  enrollments: {
    where: { userId },
    include: {
      user: { select: { id: true, username: true, email: true, profile: { select: { displayName: true } } } }
    }
  },
  completions: { where: { userId } },
  courseModules: {
    orderBy: { orderIndex: 'asc' },
    include: {
      module: {
        include: {
          videos: {
            include: { progress: { where: { userId }, take: 1, orderBy: { updatedAt: 'desc' } } },
            orderBy: { order: 'asc' }
          },
          documents: {
            include: {
              document: { select: { id: true, name: true, type: true, data: true, storageProvider: true, storageKey: true, sizeBytes: true } },
              downloads: { where: { userId }, take: 1, orderBy: { timestamp: 'desc' } }
            },
            orderBy: { order: 'asc' }
          },
          quizzes: {
            include: {
              submissions: {
                where: { userId },
                include: {
                  answers: { include: { question: true, option: true } }
                },
                orderBy: { createdAt: 'desc' }
              },
              questions: { include: { options: true }, orderBy: { order: 'asc' } }
            },
            orderBy: { order: 'asc' }
          },
          submissions: {
            where: { userId },
            include: {
              answers: { include: { question: true, option: true } }
            },
            orderBy: { createdAt: 'desc' }
          },
          accessLogs: { where: { userId }, orderBy: { timestamp: 'desc' }, take: 5 }
        }
      },
      placement: true
    }
  }
});

const getVideoState = (video) => {
  const progress = video.progress?.[0] || null;
  const value = normalizeScore(progress?.progress) || 0;
  return {
    viewed: Boolean(progress?.completed || value >= 80),
    completed: Boolean(progress?.completed || value >= 80),
    progress: value,
    lastActivityAt: progress?.updatedAt || null
  };
};

const getDocumentState = (doc) => {
  const latest = doc.downloads?.[0] || null;
  return { viewed: Boolean(latest), lastActivityAt: latest?.timestamp || null };
};

const submissionBelongsToQuiz = (submission, quizId) => {
  if (!submission || !quizId) return false;
  if (submission.quizId === quizId) return true;
  return (submission.answers || []).some((answer) => answer.question?.quizId === quizId);
};

const mergeQuizSubmissions = (quiz, moduleSubmissions = []) => {
  const byId = new Map();
  [...(quiz.submissions || []), ...(moduleSubmissions || []).filter((submission) => submissionBelongsToQuiz(submission, quiz.id))]
    .filter(Boolean)
    .forEach((submission) => byId.set(submission.id, submission));
  return [...byId.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

const getQuizState = (quiz, moduleSubmissions = []) => {
  const submissions = mergeQuizSubmissions(quiz, moduleSubmissions);
  const latest = submissions[0] || null;
  const bestScore = submissions.length
    ? submissions.reduce((best, item) => Math.max(best, normalizeScore(item.score) || 0), 0)
    : null;
  const questionsById = new Map((quiz.questions || []).map((question) => [question.id, question]));
  const answerDetails = (latest?.answers || []).map((answer) => {
    const question = questionsById.get(answer.questionId) || answer.question || {};
    const options = question.options || [];
    const selectedOption = answer.option || options.find((option) => option.id === answer.optionId) || null;
    const correctOption = options.find((option) => option.isCorrect) || null;
    const wasCorrect = Boolean(selectedOption?.isCorrect || (correctOption && selectedOption?.id === correctOption.id));
    return {
      questionId: answer.questionId,
      question: question.text || 'Question',
      studentAnswer: selectedOption?.text || null,
      correctAnswer: correctOption?.text || null,
      wasCorrect
    };
  });
  const wrongAnswers = answerDetails
    .filter((answer) => answer.wasCorrect === false)
    .map((answer) => ({
      questionId: answer.questionId,
      question: answer.question,
      selectedOption: answer.studentAnswer,
      correctAnswer: answer.correctAnswer
    }));
  return {
    submitted: Boolean(submissions.length),
    latestScore: latest ? normalizeScore(latest.score) : null,
    bestScore,
    attemptCount: submissions.length,
    answerDetails,
    wrongAnswers,
    lastActivityAt: latest?.createdAt || null
  };
};

const createTip = ({ userId, courseId, moduleId, scope, severity = 'INFO', title, message, reason, actionLabel, actionUrl, metadata = {} }) => ({
  fingerprint: [
    userId,
    courseId || 'global',
    moduleId || 'all',
    scope,
    metadata.rule || title,
    metadata.key || ''
  ].join(':'),
  userId,
  courseId: courseId || null,
  moduleId: moduleId || null,
  scope,
  severity,
  title,
  message,
  reason: reason || null,
  actionLabel: actionLabel || null,
  actionUrl: actionUrl || null,
  metadata
});

const buildQuizTipLlmContent = ({ quiz, module, course }) => {
  const answerDiagnostics = (quiz.answerDetails || []).map((answer) => ({
    question: answer.question,
    studentAnswer: answer.studentAnswer,
    correctAnswer: answer.correctAnswer,
    wasCorrect: Boolean(answer.wasCorrect)
  }));
  const sourceDocuments = (module.documents || []).map((moduleDocument) => {
    const doc = moduleDocument.document || {};
    return {
      title: moduleDocument.title || doc.name || 'Material',
      name: doc.name || null,
      type: doc.type || null,
      content: getDocumentTextSnippet(doc)
    };
  });
  const payload = {
    course: {
      id: course?.id || null,
      title: course?.title || null
    },
    module: {
      id: module.id,
      title: module.title || null,
      description: module.description || null
    },
    quiz: {
      title: quiz.title || 'Quiz',
      latestScore: quiz.latestScore,
      bestScore: quiz.bestScore,
      attemptCount: quiz.attemptCount,
      answers: answerDiagnostics
    },
    sourceMaterial: {
      documents: sourceDocuments,
      videos: (module.videos || []).map((video) => ({ title: video.title || null, url: video.url || null }))
    }
  };

  const content = [
    {
      type: 'input_text',
      text: [
        'Create personalized learning tips for this student based on their quiz attempt and the source material.',
        'Do not merely restate missed questions. Infer conceptual gaps and convert them into concrete study focus areas.',
        'Use the student answers, true answers, score, quiz questions, module description, and source files/materials.',
        'Keep the tone encouraging, specific, and tutor-like. Write in English.',
        'Return JSON only according to the schema.',
        '',
        JSON.stringify(payload, null, 2)
      ].join('\n')
    }
  ];
  const totalBytesRef = { value: 0 };
  for (const moduleDocument of module.documents || []) {
    appendDocumentInputFile(content, moduleDocument.document, totalBytesRef);
  }

  return {
    content,
    payload
  };
};

const generateLlmQuizTip = async ({ quiz, module, course }) => {
  if (!env.openai.apiKey) return null;
  const { content } = buildQuizTipLlmContent({ quiz, module, course });
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openai.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.openai.quizModel,
      reasoning: { effort: env.openai.reasoningEffort },
      input: [
        {
          role: 'system',
          content: [{
            type: 'input_text',
            text: 'You are a concise learning coach for a training platform. Generate actionable study guidance from quiz attempts and source material. Never just list facts or repeat wrong questions.'
          }]
        },
        { role: 'user', content }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'ai_quiz_tip',
          strict: true,
          schema: buildAiTipJsonSchema()
        }
      }
    })
  });
  const responsePayload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = responsePayload?.error?.message || `OpenAI Responses API failed with status ${response.status}.`;
    throw new Error(message);
  }
  const responseText = extractResponseText(responsePayload);
  if (!responseText) throw new Error('OpenAI response did not include AI tip output.');
  return normalizeLlmQuizTipPayload(JSON.parse(responseText));
};

const buildModuleTips = async ({ userId, course, courseModule, llmTipGenerator = generateLlmQuizTip }) => {
  const module = courseModule.module;
  if (!module) return [];
  const moduleId = module.id;
  const courseId = course?.id || null;
  const tips = [];

  const videos = (module.videos || []).map((video) => ({ type: 'video', title: video.title || 'Video', ...getVideoState(video) }));
  const documents = (module.documents || []).map((doc) => ({ type: 'document', title: doc.title || doc.document?.name || 'Material', ...getDocumentState(doc) }));
  const quizzes = (module.quizzes || []).map((quiz) => ({ type: 'quiz', title: quiz.title || 'Quiz', ...getQuizState(quiz, module.submissions || []) }));
  const materialItems = [...videos, ...documents, ...quizzes.map((quiz) => ({ ...quiz, viewed: quiz.submitted }))];
  const pending = materialItems.filter((item) => !item.viewed);

  if (pending.length) {
    const pendingPreview = pending.slice(0, 3).map((item) => item.title).join(', ');
    tips.push(createTip({
      userId,
      courseId,
      moduleId,
      scope: 'MATERIALS',
      severity: pending.length >= 3 ? 'WARNING' : 'INFO',
      title: `Finish pending materials in ${module.title}`,
      message: `You still have ${pending.length} item${pending.length === 1 ? '' : 's'} pending: ${pendingPreview}${pending.length > 3 ? '...' : ''}.`,
      reason: `${pending.length}/${materialItems.length || pending.length} module materials are pending.`,
      actionLabel: 'Open module',
      actionUrl: courseId ? `/dashboard.html#courses` : '/dashboard.html',
      metadata: { rule: 'material-gap', key: moduleId, pendingCount: pending.length, totalCount: materialItems.length }
    }));
  }

  for (const quiz of quizzes) {
    if (quiz.latestScore === null) continue;
    if (quiz.latestScore < LOW_SCORE_THRESHOLD || quiz.bestScore < LOW_SCORE_THRESHOLD) {
      const wrongPreview = quiz.wrongAnswers.slice(0, 2).map((answer) => answer.question).join(' • ');
      const severity = quiz.latestScore < CRITICAL_SCORE_THRESHOLD || (quiz.attemptCount >= 2 && (quiz.bestScore || 0) < LOW_SCORE_THRESHOLD)
        ? 'CRITICAL'
        : 'WARNING';
      let llmTip = null;
      try {
        llmTip = llmTipGenerator ? await llmTipGenerator({ quiz, module, course }) : null;
      } catch (error) {
        console.warn('AI Tips LLM generation failed, using fallback:', error.message);
      }
      const message = llmTip?.summary || (wrongPreview
        ? `Your latest score was ${quiz.latestScore.toFixed(1)}%. Review the concepts behind these missed questions: ${wrongPreview}.`
        : `Your latest score was ${quiz.latestScore.toFixed(1)}%. Review this module before trying again.`);
      const reason = llmTip
        ? `LLM-generated coaching from quiz attempt, correct answers, and source material. Latest quiz score ${quiz.latestScore.toFixed(1)}%, best ${quiz.bestScore?.toFixed ? quiz.bestScore.toFixed(1) : quiz.bestScore}%, attempts ${quiz.attemptCount}.`
        : `Latest quiz score ${quiz.latestScore.toFixed(1)}%, best ${quiz.bestScore?.toFixed ? quiz.bestScore.toFixed(1) : quiz.bestScore}%, attempts ${quiz.attemptCount}.`;
      tips.push(createTip({
        userId,
        courseId,
        moduleId,
        scope: 'QUIZ',
        severity,
        title: llmTip?.title || `Review ${quiz.title}`,
        message,
        reason,
        actionLabel: 'Review quiz',
        actionUrl: courseId ? `/dashboard.html#courses` : '/dashboard.html',
        metadata: {
          rule: 'low-quiz-score',
          key: `${moduleId}-${quiz.title}`,
          latestScore: quiz.latestScore,
          bestScore: quiz.bestScore,
          attemptCount: quiz.attemptCount,
          wrongQuestions: quiz.wrongAnswers.slice(0, 5),
          answerDiagnostics: quiz.answerDetails,
          llmGenerated: Boolean(llmTip),
          focusAreas: llmTip?.focusAreas || [],
          nextSteps: llmTip?.nextSteps || [],
          confidence: llmTip?.confidence || null
        }
      }));
    }
  }

  const lastActivityAt = maxDate(
    module.accessLogs?.map((log) => log.timestamp),
    videos.map((item) => item.lastActivityAt),
    documents.map((item) => item.lastActivityAt),
    quizzes.map((item) => item.lastActivityAt)
  );
  const inactiveDays = daysSince(lastActivityAt || course?.enrollments?.[0]?.createdAt);
  const isCompleted = Boolean((course?.completions || []).some((completion) => completion.moduleId === moduleId));

  if (!isCompleted && inactiveDays !== null && inactiveDays >= INACTIVITY_DAYS) {
    tips.push(createTip({
      userId,
      courseId,
      moduleId,
      scope: 'SCHEDULE',
      severity: inactiveDays >= 14 ? 'CRITICAL' : 'WARNING',
      title: `Resume ${module.title}`,
      message: `No recent activity was detected for ${inactiveDays} days. Schedule a short study session to keep your course progress moving.`,
      reason: `Last module activity was ${inactiveDays} days ago.`,
      actionLabel: 'Resume course',
      actionUrl: courseId ? `/dashboard.html#courses` : '/dashboard.html',
      metadata: { rule: 'inactivity', key: moduleId, inactiveDays }
    }));
  }

  if (isCompleted && materialItems.length && !pending.length) {
    tips.push(createTip({
      userId,
      courseId,
      moduleId,
      scope: 'MODULE',
      severity: 'INFO',
      title: `${module.title} is complete`,
      message: 'Great work — you finished all tracked materials for this module.',
      reason: 'Module completion and all material states are complete.',
      actionLabel: 'Continue course',
      actionUrl: courseId ? `/dashboard.html#courses` : '/dashboard.html',
      metadata: { rule: 'module-complete', key: moduleId }
    }));
  }

  return tips;
};

const loadCoursesForUser = async ({ prisma, userId, courseId = null, moduleId = null }) => {
  const where = courseId
    ? { id: courseId }
    : {
        enrollments: { some: { userId, status: { not: 'CANCELLED' } } }
      };
  const courses = await prisma.course.findMany({
    where,
    include: buildCourseIncludeForUser(userId),
    orderBy: { updatedAt: 'desc' },
    take: courseId ? undefined : 8
  });

  return courses.map((course) => ({
    ...course,
    courseModules: moduleId
      ? (course.courseModules || []).filter((courseModule) => courseModule.moduleId === moduleId)
      : (course.courseModules || [])
  })).filter((course) => course.courseModules.length || !moduleId);
};

const buildTipsForUser = async ({ prisma = prismaDefault, userId, courseId = null, moduleId = null, llmTipGenerator = generateLlmQuizTip } = {}) => {
  const parsedCourseId = toIntOrNull(courseId);
  const parsedModuleId = toIntOrNull(moduleId);
  const courses = await loadCoursesForUser({ prisma, userId, courseId: parsedCourseId, moduleId: parsedModuleId });
  const moduleTipGroups = await Promise.all(courses.flatMap((course) => (course.courseModules || []).map((courseModule) => buildModuleTips({ userId, course, courseModule, llmTipGenerator }))));
  const tips = moduleTipGroups.flat();

  const courseLevelTips = courses.flatMap((course) => {
    const enrollment = course.enrollments?.[0] || null;
    if (!enrollment) return [];
    const progress = Number(enrollment.progressPercent || 0);
    const courseTips = [];
    if (progress >= 75 && progress < 100) {
      courseTips.push(createTip({
        userId,
        courseId: course.id,
        scope: 'COURSE',
        severity: 'INFO',
        title: `${course.title} is almost done`,
        message: `You are at ${Math.round(progress)}% progress. Finish the remaining modules to complete the course.`,
        reason: `Enrollment progress is ${progress}%.`,
        actionLabel: 'Open course',
        actionUrl: '/dashboard.html#courses',
        metadata: { rule: 'course-near-complete', key: course.id, progress }
      }));
    }
    if (progress === 100 || enrollment.status === 'COMPLETED') {
      courseTips.push(createTip({
        userId,
        courseId: course.id,
        scope: 'COURSE',
        severity: 'INFO',
        title: `${course.title} completed`,
        message: 'Excellent progress — this course is complete.',
        reason: 'Enrollment status/progress indicates completion.',
        actionLabel: 'Review course',
        actionUrl: '/dashboard.html#courses',
        metadata: { rule: 'course-complete', key: course.id, progress }
      }));
    }
    return courseTips;
  });

  return [...tips, ...courseLevelTips];
};

const staleActiveTips = async ({ prisma, userId, courseId = null, moduleId = null }) => {
  const where = { userId, status: 'ACTIVE' };
  if (courseId) where.courseId = courseId;
  if (moduleId) where.moduleId = moduleId;
  await prisma.aiTip.updateMany({ where, data: { status: 'STALE' } });
};

const persistTips = async ({ prisma, tips }) => {
  const now = new Date();
  const expiresAt = addDays(now, TIP_TTL_DAYS);
  const saved = [];

  for (const tip of tips) {
    const existing = await prisma.aiTip.findUnique({ where: { fingerprint: tip.fingerprint } });
    if (existing?.status === 'DISMISSED') continue;
    const record = existing
      ? await prisma.aiTip.update({
          where: { id: existing.id },
          data: {
            ...tip,
            status: 'ACTIVE',
            generatedAt: now,
            dismissedAt: null,
            expiresAt
          }
        })
      : await prisma.aiTip.create({
          data: {
            ...tip,
            status: 'ACTIVE',
            generatedAt: now,
            expiresAt
          }
        });
    saved.push(record);
  }

  return saved;
};

const regenerateTipsForUser = async ({ prisma = prismaDefault, userId, courseId = null, moduleId = null } = {}) => {
  const parsedCourseId = toIntOrNull(courseId);
  const parsedModuleId = toIntOrNull(moduleId);
  if (!userId) return [];
  const tips = await buildTipsForUser({ prisma, userId, courseId: parsedCourseId, moduleId: parsedModuleId });
  await staleActiveTips({ prisma, userId, courseId: parsedCourseId, moduleId: parsedModuleId });
  return persistTips({ prisma, tips });
};

const getActiveTipsForUser = async ({ prisma = prismaDefault, userId, courseId = null, moduleId = null, refresh = true } = {}) => {
  const parsedCourseId = toIntOrNull(courseId);
  const parsedModuleId = toIntOrNull(moduleId);
  if (refresh) {
    await regenerateTipsForUser({ prisma, userId, courseId: parsedCourseId, moduleId: parsedModuleId });
  }
  const where = {
    userId,
    status: 'ACTIVE',
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
  };
  if (parsedCourseId) where.courseId = parsedCourseId;
  if (parsedModuleId) where.moduleId = parsedModuleId;
  return prisma.aiTip.findMany({
    where,
    orderBy: [{ severity: 'desc' }, { generatedAt: 'desc' }],
    take: 20
  });
};

const dismissTip = async ({ prisma = prismaDefault, userId, tipId } = {}) => {
  const id = toIntOrNull(tipId);
  if (!id) {
    const error = new Error('Invalid AI tip id.');
    error.statusCode = 400;
    throw error;
  }
  const tip = await prisma.aiTip.findUnique({ where: { id } });
  if (!tip || tip.userId !== userId) {
    const error = new Error('AI tip not found.');
    error.statusCode = 404;
    throw error;
  }
  return prisma.aiTip.update({ where: { id }, data: { status: 'DISMISSED', dismissedAt: new Date() } });
};

const refreshAiTipsForUser = ({ prisma = prismaDefault, userId, courseId = null, moduleId = null, reason = 'activity' } = {}) => {
  regenerateTipsForUser({ prisma, userId, courseId, moduleId }).catch((error) => {
    console.error(`Failed to refresh AI tips (${reason}):`, error);
  });
};

const summarizeSeverityCounts = (tips = []) => tips.reduce((counts, tip) => {
  counts[tip.severity] = (counts[tip.severity] || 0) + 1;
  return counts;
}, { INFO: 0, WARNING: 0, CRITICAL: 0 });

module.exports = {
  buildAiTipJsonSchema,
  buildQuizTipLlmContent,
  buildTipsForUser,
  dismissTip,
  generateLlmQuizTip,
  getActiveTipsForUser,
  normalizeLlmQuizTipPayload,
  refreshAiTipsForUser,
  regenerateTipsForUser,
  summarizeSeverityCounts
};
