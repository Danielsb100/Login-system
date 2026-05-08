const prisma = require('../config/db');
const {
  dismissTip,
  getActiveTipsForUser,
  regenerateTipsForUser,
  summarizeSeverityCounts
} = require('../services/aiTipsService');

const getEffectiveUserRoles = (user) => new Set([
  ...(Array.isArray(user?.roles) ? user.roles : []),
  user?.primaryRole,
  user?.legacyRole,
  user?.role
].filter(Boolean));

const isCourseManager = (user, course) => {
  const roles = getEffectiveUserRoles(user);
  return course?.ownerMasterId === user?.id
    || roles.has('ADMIN')
    || roles.has('SUPER_ADMIN')
    || roles.has('MASTER')
    || roles.has('TEACHER')
    || roles.has('TUTOR')
    || roles.has('COORDINATOR');
};

const serializeTip = (tip) => ({
  id: tip.id,
  scope: tip.scope,
  severity: tip.severity,
  title: tip.title,
  message: tip.message,
  reason: tip.reason,
  actionLabel: tip.actionLabel,
  actionUrl: tip.actionUrl,
  courseId: tip.courseId,
  moduleId: tip.moduleId,
  metadata: tip.metadata,
  generatedAt: tip.generatedAt,
  expiresAt: tip.expiresAt
});

const getMyTips = async (req, res) => {
  try {
    const tips = await getActiveTipsForUser({
      prisma,
      userId: req.user.id,
      courseId: req.query.courseId,
      moduleId: req.query.moduleId,
      refresh: req.query.refresh !== 'false'
    });

    return res.json({
      tips: tips.map(serializeTip),
      severityCounts: summarizeSeverityCounts(tips)
    });
  } catch (error) {
    console.error('Failed to load AI tips:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load AI tips.' });
  }
};

const dismissMyTip = async (req, res) => {
  try {
    const tip = await dismissTip({ prisma, userId: req.user.id, tipId: req.params.id });
    return res.json({ message: 'AI tip dismissed.', tip: serializeTip(tip) });
  } catch (error) {
    console.error('Failed to dismiss AI tip:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to dismiss AI tip.' });
  }
};

const getCourseStudentTips = async (req, res) => {
  try {
    const courseId = Number.parseInt(req.params.courseId, 10);
    if (!Number.isFinite(courseId)) return res.status(400).json({ error: 'Invalid course id.' });

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            user: { select: { id: true, username: true, email: true, profile: { select: { displayName: true } } } }
          },
          orderBy: { updatedAt: 'desc' }
        }
      }
    });

    if (!course) return res.status(404).json({ error: 'Course not found.' });
    if (!isCourseManager(req.user, course)) return res.status(403).json({ error: 'Unauthorized' });

    const students = [];
    for (const enrollment of course.enrollments || []) {
      await regenerateTipsForUser({ prisma, userId: enrollment.userId, courseId });
      const tips = await getActiveTipsForUser({ prisma, userId: enrollment.userId, courseId, refresh: false });
      students.push({
        userId: enrollment.userId,
        username: enrollment.user?.username,
        email: enrollment.user?.email,
        displayName: enrollment.user?.profile?.displayName || enrollment.user?.username,
        status: enrollment.status,
        progressPercent: enrollment.progressPercent,
        updatedAt: enrollment.updatedAt,
        severityCounts: summarizeSeverityCounts(tips),
        tips: tips.slice(0, 3).map(serializeTip)
      });
    }

    students.sort((a, b) => {
      const aScore = (a.severityCounts.CRITICAL || 0) * 3 + (a.severityCounts.WARNING || 0) * 2 + (a.severityCounts.INFO || 0);
      const bScore = (b.severityCounts.CRITICAL || 0) * 3 + (b.severityCounts.WARNING || 0) * 2 + (b.severityCounts.INFO || 0);
      return bScore - aScore;
    });

    return res.json({ courseId, students });
  } catch (error) {
    console.error('Failed to load course student AI tips:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load student AI tips.' });
  }
};

module.exports = {
  dismissMyTip,
  getCourseStudentTips,
  getMyTips
};
