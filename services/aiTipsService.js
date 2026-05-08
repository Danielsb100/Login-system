const prismaDefault = require('../config/db');

const LOW_SCORE_THRESHOLD = 70;
const CRITICAL_SCORE_THRESHOLD = 50;
const INACTIVITY_DAYS = 7;
const TIP_TTL_DAYS = 14;

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
              document: { select: { id: true, name: true, type: true } },
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

const getQuizState = (quiz) => {
  const submissions = quiz.submissions || [];
  const latest = submissions[0] || null;
  const bestScore = submissions.length
    ? submissions.reduce((best, item) => Math.max(best, normalizeScore(item.score) || 0), 0)
    : null;
  const wrongAnswers = (latest?.answers || [])
    .filter((answer) => answer.option && answer.option.isCorrect === false)
    .map((answer) => ({
      questionId: answer.questionId,
      question: answer.question?.text || 'Question',
      selectedOption: answer.option?.text || null
    }));
  return {
    submitted: Boolean(submissions.length),
    latestScore: latest ? normalizeScore(latest.score) : null,
    bestScore,
    attemptCount: submissions.length,
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

const buildModuleTips = ({ userId, course, courseModule }) => {
  const module = courseModule.module;
  if (!module) return [];
  const moduleId = module.id;
  const courseId = course?.id || null;
  const tips = [];

  const videos = (module.videos || []).map((video) => ({ type: 'video', title: video.title || 'Video', ...getVideoState(video) }));
  const documents = (module.documents || []).map((doc) => ({ type: 'document', title: doc.title || doc.document?.name || 'Material', ...getDocumentState(doc) }));
  const quizzes = (module.quizzes || []).map((quiz) => ({ type: 'quiz', title: quiz.title || 'Quiz', ...getQuizState(quiz) }));
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

  quizzes.forEach((quiz) => {
    if (quiz.latestScore === null) return;
    if (quiz.latestScore < LOW_SCORE_THRESHOLD || quiz.bestScore < LOW_SCORE_THRESHOLD) {
      const wrongPreview = quiz.wrongAnswers.slice(0, 2).map((answer) => answer.question).join(' • ');
      const severity = quiz.latestScore < CRITICAL_SCORE_THRESHOLD || (quiz.attemptCount >= 2 && (quiz.bestScore || 0) < LOW_SCORE_THRESHOLD)
        ? 'CRITICAL'
        : 'WARNING';
      tips.push(createTip({
        userId,
        courseId,
        moduleId,
        scope: 'QUIZ',
        severity,
        title: `Review ${quiz.title}`,
        message: wrongPreview
          ? `Your latest score was ${quiz.latestScore.toFixed(1)}%. Focus on: ${wrongPreview}.`
          : `Your latest score was ${quiz.latestScore.toFixed(1)}%. Review this module before trying again.`,
        reason: `Latest quiz score ${quiz.latestScore.toFixed(1)}%, best ${quiz.bestScore?.toFixed ? quiz.bestScore.toFixed(1) : quiz.bestScore}%, attempts ${quiz.attemptCount}.`,
        actionLabel: 'Review quiz',
        actionUrl: courseId ? `/dashboard.html#courses` : '/dashboard.html',
        metadata: {
          rule: 'low-quiz-score',
          key: `${moduleId}-${quiz.title}`,
          latestScore: quiz.latestScore,
          bestScore: quiz.bestScore,
          attemptCount: quiz.attemptCount,
          wrongQuestions: quiz.wrongAnswers.slice(0, 5)
        }
      }));
    }
  });

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

const buildTipsForUser = async ({ prisma = prismaDefault, userId, courseId = null, moduleId = null } = {}) => {
  const parsedCourseId = toIntOrNull(courseId);
  const parsedModuleId = toIntOrNull(moduleId);
  const courses = await loadCoursesForUser({ prisma, userId, courseId: parsedCourseId, moduleId: parsedModuleId });
  const tips = courses.flatMap((course) => (course.courseModules || []).flatMap((courseModule) => buildModuleTips({ userId, course, courseModule })));

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
  buildTipsForUser,
  dismissTip,
  getActiveTipsForUser,
  refreshAiTipsForUser,
  regenerateTipsForUser,
  summarizeSeverityCounts
};
