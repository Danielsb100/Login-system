const prisma = require('../config/db');
const { chatWithTrainingAi } = require('../services/trainingAiService');
const { hasLearnerModuleAccess, isManagerForModule } = require('./moduleAiController');

const loadModuleContext = async (moduleId) => {
  if (!moduleId) return null;
  return prisma.trainingModule.findUnique({
    where: { id: Number(moduleId) },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      ownerMasterId: true
    }
  });
};

const loadCourseContext = async (courseId) => {
  if (!courseId) return null;
  return prisma.course.findUnique({
    where: { id: Number(courseId) },
    select: { id: true, title: true, description: true, status: true }
  });
};

const MANAGER_ROLES = new Set(['MASTER', 'ADMIN', 'SUPER_ADMIN', 'TEACHER', 'COORDINATOR', 'TUTOR']);

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const getEffectiveUserRoles = (user) => new Set([
  ...(Array.isArray(user?.roles) ? user.roles : []),
  user?.primaryRole,
  user?.legacyRole,
  user?.role
].filter(Boolean));

const isTrainingAiManager = (user) => [...getEffectiveUserRoles(user)].some((role) => MANAGER_ROLES.has(role));

const chat = async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    const moduleId = parseOptionalInt(req.body?.moduleId);
    const courseId = parseOptionalInt(req.body?.courseId);
    const courseModuleId = parseOptionalInt(req.body?.courseModuleId);
    if (Number.isNaN(moduleId) || Number.isNaN(courseId) || Number.isNaN(courseModuleId)) {
      return res.status(400).json({ error: 'Invalid course or module context.' });
    }

    const [moduleContext, courseContext] = await Promise.all([
      loadModuleContext(moduleId),
      loadCourseContext(courseId)
    ]);

    if (moduleId && !moduleContext) return res.status(404).json({ error: 'Module not found.' });
    if (courseId && !courseContext) return res.status(404).json({ error: 'Course not found.' });

    if (moduleContext) {
      const isManager = isManagerForModule(req.user, moduleContext);
      const hasAccess = isManager || await hasLearnerModuleAccess({
        userId: req.user.id,
        module: moduleContext,
        courseId,
        courseModuleId
      });
      if (!hasAccess) return res.status(403).json({ error: 'Unauthorized' });
    } else if (courseContext && courseContext.status !== 'PUBLISHED' && !isTrainingAiManager(req.user)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await chatWithTrainingAi({
      prisma,
      message,
      conversationId: req.body?.conversationId || (moduleId ? `training-module-${moduleId}` : `training-user-${req.user.id}`),
      moduleContext,
      courseContext,
      returnAudio: Boolean(req.body?.returnAudio)
    });

    res.json(result);
  } catch (error) {
    console.error('Training AI chat failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to generate AI response.' });
  }
};

module.exports = { chat, isTrainingAiManager };
