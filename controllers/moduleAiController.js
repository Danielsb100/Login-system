const prisma = require('../config/db');
const { getModuleAssetUrl } = require('../services/openaiQuizService');
const { generateModuleAssistantResponse } = require('../services/moduleAiService');

const MANAGER_ROLES = new Set(['ADMIN', 'MASTER', 'SUPER_ADMIN']);

const getEffectiveUserRoles = (user) => new Set([
  ...(Array.isArray(user?.roles) ? user.roles : []),
  user?.primaryRole,
  user?.legacyRole,
  user?.role
].filter(Boolean));

const isManagerForModule = (user, module) => {
  const roles = getEffectiveUserRoles(user);
  return module?.ownerMasterId === user?.id || [...MANAGER_ROLES].some((role) => roles.has(role));
};

const getBestQuizScore = (submissions = []) => {
  if (!submissions.length) return null;
  return submissions.reduce((best, entry) => Math.max(best, Number(entry.score) || 0), 0);
};

const isCourseModuleUnlockedForUser = async ({ userId, module, courseId, courseModuleId }) => {
  const courseModuleWhere = {
    moduleId: module.id,
    ...(courseId ? { courseId } : {}),
    ...(courseModuleId ? { id: courseModuleId } : {})
  };

  const targetCourseModule = await prisma.courseModule.findFirst({
    where: courseModuleWhere,
    include: {
      course: {
        include: {
          completions: { where: { userId } },
          courseModules: {
            orderBy: { orderIndex: 'asc' },
            include: {
              module: {
                select: {
                  id: true,
                  submissions: {
                    where: { userId },
                    select: { score: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!targetCourseModule || targetCourseModule.course.status !== 'PUBLISHED') return false;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      courseId_userId: {
        courseId: targetCourseModule.courseId,
        userId
      }
    }
  });

  if (!enrollment || enrollment.status === 'CANCELLED') return false;

  const completedModuleIds = new Set((targetCourseModule.course.completions || []).map((entry) => entry.moduleId));
  let requiredGateOpen = true;

  for (const courseModule of targetCourseModule.course.courseModules || []) {
    const unlocked = requiredGateOpen;
    if (courseModule.id === targetCourseModule.id) return unlocked;

    const bestQuizScore = getBestQuizScore(courseModule.module?.submissions || []);
    const quizRequirementMet = !courseModule.requireQuizPass
      || (bestQuizScore !== null && bestQuizScore >= Number(courseModule.minimumQuizScore || 0));
    const requiredGateSatisfied = completedModuleIds.has(courseModule.moduleId) && quizRequirementMet;

    if (courseModule.isRequired && !requiredGateSatisfied) {
      requiredGateOpen = false;
    }
  }

  return false;
};

const hasLearnerModuleAccess = async ({ userId, module, courseId, courseModuleId }) => {
  if (module.status !== 'PUBLISHED') return false;

  if (!courseId && !courseModuleId) return false;

  return isCourseModuleUnlockedForUser({ userId, module, courseId, courseModuleId });
};

const loadModuleForAi = async (moduleId) => {
  const module = await prisma.trainingModule.findUnique({
    where: { id: moduleId },
    include: {
      videos: { orderBy: { order: 'asc' } },
      documents: { include: { document: true }, orderBy: { order: 'asc' } },
      quizzes: {
        orderBy: { order: 'asc' },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { options: true }
          }
        }
      }
    }
  });

  if (!module) return null;

  const videoAssetIds = [...new Set((module.videos || [])
    .map((video) => getModuleAssetUrl(video.url))
    .filter(Boolean))];

  const videoAssetDocuments = videoAssetIds.length
    ? await prisma.document.findMany({ where: { id: { in: videoAssetIds } } })
    : [];

  return { ...module, videoAssetDocuments };
};

const chatWithModuleAssistant = async (req, res) => {
  try {
    const moduleId = parseInt(req.params.id, 10);
    const { message, courseId, courseModuleId } = req.body || {};
    const parsedCourseId = courseId === undefined || courseId === null || courseId === ''
      ? null
      : parseInt(courseId, 10);
    const parsedCourseModuleId = courseModuleId === undefined || courseModuleId === null || courseModuleId === ''
      ? null
      : parseInt(courseModuleId, 10);

    if (!Number.isFinite(moduleId)) return res.status(400).json({ error: 'Invalid module id' });
    if (!String(message || '').trim()) return res.status(400).json({ error: 'Message is required' });
    if (courseId !== undefined && courseId !== null && courseId !== '' && !Number.isFinite(parsedCourseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }
    if (courseModuleId !== undefined && courseModuleId !== null && courseModuleId !== '' && !Number.isFinite(parsedCourseModuleId)) {
      return res.status(400).json({ error: 'Invalid course module id' });
    }

    const module = await loadModuleForAi(moduleId);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const isManager = isManagerForModule(req.user, module);
    const hasAccess = isManager || await hasLearnerModuleAccess({
      userId: req.user.id,
      module,
      courseId: parsedCourseId,
      courseModuleId: parsedCourseModuleId
    });

    if (!hasAccess) return res.status(403).json({ error: 'Unauthorized' });

    const answer = await generateModuleAssistantResponse(module, message);
    res.json({ answer });
  } catch (error) {
    console.error('Module assistant chat failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to generate assistant response' });
  }
};

module.exports = {
  chatWithModuleAssistant,
  hasLearnerModuleAccess,
  isManagerForModule
};
