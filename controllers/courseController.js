const prisma = require('../config/db');

function getEffectiveUserRoles(user) {
  return new Set([
    ...(user?.roles || []),
    user?.primaryRole,
    user?.legacyRole,
    user?.role
  ].filter(Boolean));
}

function isCourseManager(user, course) {
  const roles = getEffectiveUserRoles(user);
  return course.ownerMasterId === user.id || roles.has('ADMIN') || roles.has('SUPER_ADMIN') || roles.has('MASTER');
}

function slugify(value) {
  return String(value || 'course')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'course';
}

function buildSceneId(course) {
  return course.sceneId || `course-${course.id}-${slugify(course.title)}`;
}

const COURSE_ROOM_SPACING = 14;
const DEFAULT_MINIMUM_QUIZ_SCORE = 70;

function buildRoomPosition(index) {
  return {
    x: index * COURSE_ROOM_SPACING,
    y: 0,
    z: 0
  };
}

function normalizeMinimumQuizScore(value, fallback = DEFAULT_MINIMUM_QUIZ_SCORE) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, parsed));
}

function buildProgressModuleInclude(userId) {
  return {
    placement: true,
    module: {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        quizzes: {
          select: { id: true }
        },
        submissions: {
          where: { userId },
          select: {
            id: true,
            userId: true,
            score: true,
            attemptNumber: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    }
  };
}

function buildCourseInclude(userId, { includeEnrollmentUsers = false, includeLandingPage = false } = {}) {
  return {
    enrollments: includeEnrollmentUsers
      ? {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                profile: { select: { displayName: true } }
              }
            }
          }
        }
      : true,
    completions: true,
    courseModules: {
      include: buildProgressModuleInclude(userId),
      orderBy: { orderIndex: 'asc' }
    },
    ...(includeLandingPage
      ? {
          landingPage: {
            select: { id: true, title: true, compiledHtml: true, compiledCss: true }
          }
        }
      : {})
  };
}

function getCourseModuleQuizState(courseModule, userId) {
  const hasQuiz = Boolean(courseModule.module?.quizzes?.length);
  const submissions = (courseModule.module?.submissions || [])
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const latestSubmission = submissions[0] || null;
  const bestQuizScore = submissions.length
    ? submissions.reduce((best, entry) => Math.max(best, Number(entry.score) || 0), 0)
    : null;
  const latestQuizScore = latestSubmission ? Number(latestSubmission.score) || 0 : null;
  const quizRequirementActive = Boolean(hasQuiz && courseModule.requireQuizPass);
  const minimumQuizScore = quizRequirementActive
    ? normalizeMinimumQuizScore(courseModule.minimumQuizScore)
    : null;
  const quizPassed = !quizRequirementActive || (bestQuizScore !== null && bestQuizScore >= minimumQuizScore);

  return {
    hasQuiz,
    quizRequirementActive,
    minimumQuizScore,
    bestQuizScore,
    latestQuizScore,
    latestAttemptNumber: latestSubmission?.attemptNumber || null,
    quizAttemptCount: submissions.length,
    quizPassed
  };
}

async function syncCoursePlacements(courseId, tx = prisma) {
  const course = await tx.course.findUnique({
    where: { id: courseId },
    include: {
      courseModules: {
        orderBy: { orderIndex: 'asc' },
        include: {
          module: { select: { title: true } },
          placement: true
        }
      }
    }
  });

  if (!course) {
    throw new Error('COURSE_NOT_FOUND');
  }

  const sceneId = buildSceneId(course);
  if (course.sceneId !== sceneId) {
    await tx.course.update({ where: { id: courseId }, data: { sceneId } });
  }

  const activeCourseModuleIds = [];

  for (const [index, courseModule] of course.courseModules.entries()) {
    activeCourseModuleIds.push(courseModule.id);
    const position = buildRoomPosition(index);
    const label = courseModule.roomLabel || `Module Room ${index + 1}`;

    const placementData = {
      ownerMasterId: course.ownerMasterId,
      courseId: course.id,
      courseModuleId: courseModule.id,
      moduleId: courseModule.moduleId,
      sceneId,
      objectType: 'COURSE_MODULE_ROOM',
      label,
      positionX: position.x,
      positionY: position.y,
      positionZ: position.z,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      status: 'ACTIVE'
    };

    if (courseModule.placement) {
      await tx.worldModulePlacement.update({
        where: { id: courseModule.placement.id },
        data: placementData
      });
    } else {
      await tx.worldModulePlacement.create({ data: placementData });
    }
  }

  await tx.worldModulePlacement.deleteMany({
    where: {
      courseId,
      courseModuleId: { notIn: activeCourseModuleIds.length ? activeCourseModuleIds : [-1] }
    }
  });
}

function buildCourseProgress(course, userId, isManagerView = false) {
  const completions = new Set(
    (course.completions || [])
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.moduleId)
  );

  let requiredGateOpen = true;
  const modules = (course.courseModules || []).map((courseModule, index) => {
    const completed = completions.has(courseModule.moduleId);
    const unlocked = isManagerView || requiredGateOpen;
    const roomPosition = buildRoomPosition(index);
    const quizState = getCourseModuleQuizState(courseModule, userId);
    const completionBlockedByQuiz = !isManagerView && quizState.quizRequirementActive && !quizState.quizPassed;

    const payload = {
      courseModuleId: courseModule.id,
      moduleId: courseModule.moduleId,
      title: courseModule.module?.title || 'Untitled module',
      description: courseModule.module?.description || '',
      moduleStatus: courseModule.module?.status || 'DRAFT',
      orderIndex: courseModule.orderIndex,
      isRequired: courseModule.isRequired,
      requireQuizPass: Boolean(courseModule.requireQuizPass),
      minimumQuizScore: quizState.minimumQuizScore,
      hasQuiz: quizState.hasQuiz,
      quizRequirementActive: quizState.quizRequirementActive,
      quizPassed: quizState.quizPassed,
      bestQuizScore: quizState.bestQuizScore,
      latestQuizScore: quizState.latestQuizScore,
      quizAttemptCount: quizState.quizAttemptCount,
      latestQuizAttemptNumber: quizState.latestAttemptNumber,
      canMarkComplete: isManagerView || !completionBlockedByQuiz,
      completionBlockedReason: completionBlockedByQuiz
        ? `Pass the module quiz with at least ${quizState.minimumQuizScore}% before marking this room as done.`
        : null,
      roomLabel: courseModule.roomLabel || courseModule.placement?.label || `Module Room ${courseModule.orderIndex + 1}`,
      completed,
      unlocked,
      placement: courseModule.placement
        ? {
            id: courseModule.placement.id,
            label: courseModule.placement.label,
            position: roomPosition,
            rotation: {
              x: courseModule.placement.rotationX,
              y: courseModule.placement.rotationY,
              z: courseModule.placement.rotationZ
            }
          }
        : null
    };

    const requiredGateSatisfied = completed && (!quizState.quizRequirementActive || quizState.quizPassed);
    if (courseModule.isRequired && !requiredGateSatisfied) {
      requiredGateOpen = false;
    }

    return payload;
  });

  const completedCount = modules.filter((module) => module.completed).length;
  const progressPercent = modules.length ? Math.round((completedCount / modules.length) * 100) : 0;
  return { modules, completedCount, progressPercent };
}

async function assertCourseAccess(courseId, user) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: buildCourseInclude(user.id, { includeEnrollmentUsers: true, includeLandingPage: true })
  });

  if (!course) {
    throw new Error('COURSE_NOT_FOUND');
  }

  const managerView = isCourseManager(user, course);
  const enrollment = course.enrollments.find((item) => item.userId === user.id && item.status !== 'CANCELLED');

  if (!managerView && !enrollment) {
    throw new Error('COURSE_ACCESS_DENIED');
  }

  return { course, managerView, enrollment };
}

async function createCourse(req, res) {
  try {
    const { title, description, coverImage } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Course title is required.' });
    }

    const created = await prisma.$transaction(async (tx) => {
      const initialSceneId = `course-draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const course = await tx.course.create({
        data: {
          ownerMasterId: req.user.id,
          title: String(title).trim(),
          description: description || null,
          coverImage: coverImage || null,
          sceneId: initialSceneId
        }
      });

      const sceneId = buildSceneId(course);
      const updatedCourse = await tx.course.update({
        where: { id: course.id },
        data: { sceneId }
      });

      await tx.enrollment.upsert({
        where: { courseId_userId: { courseId: course.id, userId: req.user.id } },
        update: { status: 'ENROLLED' },
        create: { courseId: course.id, userId: req.user.id, status: 'ENROLLED' }
      });

      return updatedCourse;
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create course.' });
  }
}

async function getMyCourses(req, res) {
  try {
    const courses = await prisma.course.findMany({
      where: { ownerMasterId: req.user.id },
      include: buildCourseInclude(req.user.id),
      orderBy: { updatedAt: 'desc' }
    });

    const result = courses.map((course) => {
      const progress = buildCourseProgress(course, req.user.id, true);
      return {
        ...course,
        moduleCount: course.courseModules.length,
        enrollmentCount: course.enrollments.length,
        progressPercent: progress.progressPercent,
        modules: progress.modules
      };
    });

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load courses.' });
  }
}

async function getAccessibleCourses(req, res) {
  try {
    const roles = getEffectiveUserRoles(req.user);
    const canManage = roles.has('MASTER') || roles.has('ADMIN') || roles.has('SUPER_ADMIN') || roles.has('TEACHER') || roles.has('COORDINATOR');

    const courses = await prisma.course.findMany({
      where: canManage
        ? {
            OR: [
              { ownerMasterId: req.user.id },
              { enrollments: { some: { userId: req.user.id, status: { not: 'CANCELLED' } } } }
            ]
          }
        : { enrollments: { some: { userId: req.user.id, status: { not: 'CANCELLED' } } } },
      include: {
        ...buildCourseInclude(req.user.id),
        landingPage: {
          select: { id: true, title: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const result = courses.map((course) => {
      const managerView = isCourseManager(req.user, course);
      const progress = buildCourseProgress(course, req.user.id, managerView);
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        coverImage: course.coverImage,
        sceneId: course.sceneId,
        status: course.status,
        moduleCount: course.courseModules.length,
        progressPercent: progress.progressPercent,
        completedCount: progress.completedCount,
        modules: progress.modules,
        canManage: managerView,
        landingPage: course.landingPage
      };
    });

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load accessible courses.' });
  }
}

async function getCourseDetail(req, res) {
  try {
    const courseId = Number(req.params.id);
    const { course, managerView, enrollment } = await assertCourseAccess(courseId, req.user);
    const progress = buildCourseProgress(course, req.user.id, managerView);

    return res.json({
      id: course.id,
      title: course.title,
      description: course.description,
      coverImage: course.coverImage,
      status: course.status,
      sceneId: course.sceneId,
      canManage: managerView,
      enrollment,
      progressPercent: progress.progressPercent,
      completedCount: progress.completedCount,
      modules: progress.modules,
      landingPage: course.landingPage,
      enrollments: managerView
        ? course.enrollments.map((item) => ({
            id: item.id,
            userId: item.userId,
            username: item.user?.username,
            email: item.user?.email,
            displayName: item.user?.profile?.displayName || item.user?.username,
            status: item.status,
            progressPercent: item.progressPercent
          }))
        : undefined
    });
  } catch (error) {
    if (error.message === 'COURSE_NOT_FOUND') {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (error.message === 'COURSE_ACCESS_DENIED') {
      return res.status(403).json({ error: 'You do not have access to this course.' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Failed to load course.' });
  }
}

async function updateCourse(req, res) {
  try {
    const courseId = Number(req.params.id);
    const existing = await prisma.course.findUnique({ where: { id: courseId } });
    if (!existing) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (!isCourseManager(req.user, existing)) {
      return res.status(403).json({ error: 'Not authorized to update this course.' });
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        title: req.body.title || existing.title,
        description: req.body.description === undefined ? existing.description : req.body.description,
        coverImage: req.body.coverImage === undefined ? existing.coverImage : req.body.coverImage,
        status: req.body.status || existing.status
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update course.' });
  }
}

async function addModuleToCourse(req, res) {
  try {
    const courseId = Number(req.params.id);
    const moduleId = Number(req.body.moduleId);
    const requireQuizPass = Boolean(req.body.requireQuizPass);
    const minimumQuizScore = requireQuizPass ? normalizeMinimumQuizScore(req.body.minimumQuizScore) : null;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (!isCourseManager(req.user, course)) {
      return res.status(403).json({ error: 'Not authorized to manage this course.' });
    }

    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        _count: {
          select: { quizzes: true }
        }
      }
    });
    if (!module) {
      return res.status(404).json({ error: 'Module not found.' });
    }
    if (module.ownerMasterId !== req.user.id && !getEffectiveUserRoles(req.user).has('ADMIN') && !getEffectiveUserRoles(req.user).has('SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Only the module owner can attach this module to the course.' });
    }
    if (requireQuizPass && module._count.quizzes === 0) {
      return res.status(400).json({ error: 'This module does not have a quiz to require for course progression.' });
    }

    const lastModule = await prisma.courseModule.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' }
    });

    const courseModule = await prisma.$transaction(async (tx) => {
      const created = await tx.courseModule.create({
        data: {
          courseId,
          moduleId,
          orderIndex: typeof req.body.orderIndex === 'number' ? req.body.orderIndex : (lastModule?.orderIndex || 0) + 1,
          isRequired: req.body.isRequired !== false,
          requireQuizPass,
          minimumQuizScore,
          roomLabel: req.body.roomLabel || null
        }
      });

      await syncCoursePlacements(courseId, tx);
      return created;
    });

    return res.status(201).json(courseModule);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'This module is already attached to the course.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Failed to attach module to course.' });
  }
}

async function updateCourseModule(req, res) {
  try {
    const courseModuleId = Number(req.params.courseModuleId);
    const current = await prisma.courseModule.findUnique({
      where: { id: courseModuleId },
      include: {
        course: true,
        module: {
          include: {
            _count: {
              select: { quizzes: true }
            }
          }
        }
      }
    });
    if (!current) {
      return res.status(404).json({ error: 'Course module not found.' });
    }
    if (!isCourseManager(req.user, current.course)) {
      return res.status(403).json({ error: 'Not authorized to update this course module.' });
    }

    const nextRequireQuizPass = req.body.requireQuizPass === undefined
      ? current.requireQuizPass
      : Boolean(req.body.requireQuizPass);
    if (nextRequireQuizPass && current.module?._count?.quizzes === 0) {
      return res.status(400).json({ error: 'This module does not have a quiz to require for course progression.' });
    }

    let nextMinimumQuizScore = current.minimumQuizScore;
    if (nextRequireQuizPass) {
      if (req.body.minimumQuizScore !== undefined || req.body.requireQuizPass !== undefined || nextMinimumQuizScore == null) {
        nextMinimumQuizScore = normalizeMinimumQuizScore(
          req.body.minimumQuizScore === undefined ? nextMinimumQuizScore : req.body.minimumQuizScore
        );
      }
    } else if (req.body.requireQuizPass !== undefined || req.body.minimumQuizScore !== undefined) {
      nextMinimumQuizScore = null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const entity = await tx.courseModule.update({
        where: { id: courseModuleId },
        data: {
          isRequired: req.body.isRequired === undefined ? current.isRequired : Boolean(req.body.isRequired),
          requireQuizPass: nextRequireQuizPass,
          minimumQuizScore: nextMinimumQuizScore,
          roomLabel: req.body.roomLabel === undefined ? current.roomLabel : req.body.roomLabel
        }
      });
      await syncCoursePlacements(current.courseId, tx);
      return entity;
    });

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update course module.' });
  }
}

async function reorderCourseModules(req, res) {
  try {
    const courseId = Number(req.params.id);
    const orderedIds = Array.isArray(req.body.orderedCourseModuleIds) ? req.body.orderedCourseModuleIds.map(Number) : [];
    const course = await prisma.course.findUnique({ where: { id: courseId }, include: { courseModules: true } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (!isCourseManager(req.user, course)) {
      return res.status(403).json({ error: 'Not authorized to reorder modules in this course.' });
    }

    const currentIds = course.courseModules.map((item) => item.id).sort((a, b) => a - b);
    const nextIds = [...orderedIds].sort((a, b) => a - b);
    if (currentIds.length !== nextIds.length || currentIds.some((value, index) => value !== nextIds[index])) {
      return res.status(400).json({ error: 'The provided order does not match the current course modules.' });
    }

    await prisma.$transaction(async (tx) => {
      for (const [index, courseModuleId] of orderedIds.entries()) {
        await tx.courseModule.update({ where: { id: courseModuleId }, data: { orderIndex: index + 1 } });
      }
      await syncCoursePlacements(courseId, tx);
    });

    return res.json({ message: 'Course modules reordered successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to reorder course modules.' });
  }
}

async function removeCourseModule(req, res) {
  try {
    const courseModuleId = Number(req.params.courseModuleId);
    const current = await prisma.courseModule.findUnique({
      where: { id: courseModuleId },
      include: { course: true }
    });
    if (!current) {
      return res.status(404).json({ error: 'Course module not found.' });
    }
    if (!isCourseManager(req.user, current.course)) {
      return res.status(403).json({ error: 'Not authorized to remove this module.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.courseModule.delete({ where: { id: courseModuleId } });
      await syncCoursePlacements(current.courseId, tx);
    });

    return res.json({ message: 'Module removed from course.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to remove module from course.' });
  }
}

async function enrollUser(req, res) {
  try {
    const courseId = Number(req.params.id);
    const userId = Number(req.body.userId);
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (!isCourseManager(req.user, course)) {
      return res.status(403).json({ error: 'Not authorized to enroll users in this course.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const enrollment = await prisma.enrollment.upsert({
      where: { courseId_userId: { courseId, userId } },
      update: { status: 'ENROLLED' },
      create: { courseId, userId, status: 'ENROLLED' }
    });

    return res.status(201).json(enrollment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to enroll user.' });
  }
}

async function getCourseRuntime(req, res) {
  try {
    const courseId = Number(req.params.id);
    const { course, managerView, enrollment } = await assertCourseAccess(courseId, req.user);
    const progress = buildCourseProgress(course, req.user.id, managerView);

    return res.json({
      id: course.id,
      title: course.title,
      description: course.description,
      coverImage: course.coverImage,
      status: course.status,
      sceneId: course.sceneId,
      canManage: managerView,
      enrollment,
      progressPercent: progress.progressPercent,
      completedCount: progress.completedCount,
      modules: progress.modules,
      landingPage: course.landingPage
    });
  } catch (error) {
    if (error.message === 'COURSE_NOT_FOUND') {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (error.message === 'COURSE_ACCESS_DENIED') {
      return res.status(403).json({ error: 'You do not have access to this course.' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Failed to load course runtime.' });
  }
}

async function completeCourseModule(req, res) {
  try {
    const courseId = Number(req.params.id);
    const moduleId = Number(req.params.moduleId);
    const { course, managerView, enrollment } = await assertCourseAccess(courseId, req.user);
    const progress = buildCourseProgress(course, req.user.id, managerView);
    const target = progress.modules.find((item) => item.moduleId === moduleId);

    if (!target) {
      return res.status(404).json({ error: 'Module is not part of this course.' });
    }
    if (!target.unlocked && !managerView) {
      return res.status(403).json({ error: 'This module is still locked by the course path.' });
    }
    if (!target.canMarkComplete && !managerView) {
      return res.status(403).json({ error: target.completionBlockedReason || 'Pass the required quiz before marking this module as done.' });
    }

    await prisma.moduleCompletion.upsert({
      where: { courseId_moduleId_userId: { courseId, moduleId, userId: req.user.id } },
      update: { source: req.body.source || 'DASHBOARD', completedAt: new Date() },
      create: { courseId, moduleId, userId: req.user.id, source: req.body.source || 'DASHBOARD' }
    });

    const refreshed = await prisma.course.findUnique({
      where: { id: courseId },
      include: buildCourseInclude(req.user.id)
    });
    const refreshedProgress = buildCourseProgress(refreshed, req.user.id, managerView);

    if (enrollment) {
      await prisma.enrollment.update({
        where: { courseId_userId: { courseId, userId: req.user.id } },
        data: {
          progressPercent: refreshedProgress.progressPercent,
          status: refreshedProgress.completedCount === refreshedProgress.modules.length && refreshedProgress.modules.length > 0
            ? 'COMPLETED'
            : 'ENROLLED'
        }
      });
    }

    return res.json({
      message: 'Module marked as completed.',
      progressPercent: refreshedProgress.progressPercent,
      completedCount: refreshedProgress.completedCount
    });
  } catch (error) {
    if (error.message === 'COURSE_NOT_FOUND') {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (error.message === 'COURSE_ACCESS_DENIED') {
      return res.status(403).json({ error: 'You do not have access to this course.' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Failed to complete course module.' });
  }
}

module.exports = {
  getEffectiveUserRoles,
  isCourseManager,
  buildCourseInclude,
  buildCourseProgress,
  assertCourseAccess,
  createCourse,
  getMyCourses,
  getAccessibleCourses,
  getCourseDetail,
  updateCourse,
  addModuleToCourse,
  updateCourseModule,
  reorderCourseModules,
  removeCourseModule,
  enrollUser,
  getCourseRuntime,
  completeCourseModule,
  syncCoursePlacements
};
