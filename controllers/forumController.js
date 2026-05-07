const prisma = require('../config/db');
const { notifyForumReply } = require('../services/notificationService');
const {
    buildCourseInclude,
    buildCourseProgress,
    getEffectiveUserRoles,
    isCourseManager
} = require('./courseController');

const DEFAULT_MINIMUM_QUIZ_SCORE = 70;

function normalizeTextField(value) {
    return String(value || '').trim();
}

function parseOptionalCourseId(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getRequestedCourseId(req) {
    return parseOptionalCourseId(req.query?.courseId ?? req.body?.courseId);
}

function buildForumAccessError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

function normalizeMinimumQuizScore(value, fallback = DEFAULT_MINIMUM_QUIZ_SCORE) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(100, Math.max(0, parsed));
}

function isGlobalForumAdmin(user) {
    const roles = getEffectiveUserRoles(user);
    return roles.has('ADMIN') || roles.has('SUPER_ADMIN');
}

function isModuleOwner(module, user) {
    return Boolean(module && user && module.ownerMasterId === user.id);
}

function isEnrollmentActive(enrollment) {
    return Boolean(enrollment && enrollment.status !== 'CANCELLED');
}

function getModuleStatusAccessError(module, user) {
    if (!module) {
        return 'MODULE_NOT_FOUND';
    }

    if (isGlobalForumAdmin(user) || isModuleOwner(module, user)) {
        return null;
    }

    if (module.status === 'ARCHIVED') {
        return 'MODULE_ARCHIVED';
    }

    if (module.status === 'DRAFT') {
        return 'MODULE_DRAFT';
    }

    return null;
}

function findEnrollment(course, userId) {
    return (course.enrollments || []).find((item) => item.userId === userId && item.status !== 'CANCELLED') || null;
}

function canAccessModuleThroughCourse(course, moduleId, user) {
    const managerView = isCourseManager(user, course);
    const enrollment = findEnrollment(course, user.id);

    if (!managerView && !isEnrollmentActive(enrollment)) {
        return {
            allowed: false,
            reason: 'COURSE_ACCESS_DENIED'
        };
    }

    const progress = buildCourseProgress(course, user.id, managerView);
    const targetModule = progress.modules.find((entry) => entry.moduleId === moduleId);

    if (!targetModule) {
        return {
            allowed: false,
            reason: 'MODULE_NOT_IN_COURSE'
        };
    }

    if (managerView || targetModule.unlocked) {
        return {
            allowed: true,
            course,
            managerView,
            enrollment,
            targetModule
        };
    }

    return {
        allowed: false,
        reason: 'MODULE_LOCKED_IN_COURSE'
    };
}

function sendForumAccessError(res, errorCode) {
    switch (errorCode) {
        case 'MODULE_NOT_FOUND':
            return res.status(404).json({ error: 'Module not found.' });
        case 'THREAD_NOT_FOUND':
            return res.status(404).json({ error: 'Thread not found.' });
        case 'MODULE_ARCHIVED':
            return res.status(403).json({ error: 'This module has been archived and is no longer available.' });
        case 'MODULE_DRAFT':
            return res.status(403).json({ error: 'This module is still in draft and has not been published yet.' });
        case 'COURSE_ACCESS_DENIED':
            return res.status(403).json({ error: 'You do not have access to this course forum.' });
        case 'MODULE_NOT_IN_COURSE':
            return res.status(403).json({ error: 'This module does not belong to the selected course.' });
        case 'MODULE_LOCKED_IN_COURSE':
            return res.status(403).json({ error: 'This module forum is locked until the module becomes available in your course trail.' });
        case 'MODULE_ACCESS_DENIED':
        default:
            return res.status(403).json({ error: 'You do not have access to this module forum.' });
    }
}

async function assertModuleForumAccess(moduleId, user, options = {}, client = prisma) {
    const module = await client.trainingModule.findUnique({
        where: { id: moduleId },
        select: {
            id: true,
            status: true,
            ownerMasterId: true,
            courseModules: {
                select: {
                    courseId: true
                }
            }
        }
    });

    const statusError = getModuleStatusAccessError(module, user);
    if (statusError) {
        throw buildForumAccessError(statusError);
    }

    if (isGlobalForumAdmin(user) || isModuleOwner(module, user)) {
        return { module, scope: 'global' };
    }

    const linkedCourseIds = [...new Set(
        (module.courseModules || [])
            .map((entry) => entry.courseId)
            .filter((entry) => Number.isFinite(entry))
    )];

    if (!linkedCourseIds.length) {
        return { module, scope: 'standalone' };
    }

    const requestedCourseId = parseOptionalCourseId(options.courseId);
    const candidateCourses = await client.course.findMany({
        where: requestedCourseId
            ? {
                id: requestedCourseId,
                courseModules: { some: { moduleId } }
            }
            : {
                id: { in: linkedCourseIds }
            },
        include: buildCourseInclude(user.id),
        orderBy: { updatedAt: 'desc' }
    });

    if (requestedCourseId && !candidateCourses.length) {
        throw buildForumAccessError('MODULE_NOT_IN_COURSE');
    }

    let lastDeniedReason = requestedCourseId ? 'COURSE_ACCESS_DENIED' : 'MODULE_ACCESS_DENIED';
    for (const course of candidateCourses) {
        const result = canAccessModuleThroughCourse(course, moduleId, user);
        if (result.allowed) {
            return {
                module,
                scope: 'course',
                course: result.course,
                managerView: result.managerView,
                enrollment: result.enrollment,
                targetModule: result.targetModule
            };
        }

        lastDeniedReason = result.reason || lastDeniedReason;
    }

    throw buildForumAccessError(lastDeniedReason);
}

async function createThread(req, res) {
    try {
        const moduleId = Number(req.params.id);
        const title = normalizeTextField(req.body.title);
        const content = normalizeTextField(req.body.content);
        const courseId = getRequestedCourseId(req);

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required.' });
        }

        await assertModuleForumAccess(moduleId, req.user, { courseId });

        const thread = await prisma.forumThread.create({
            data: {
                moduleId,
                userId: req.user.id,
                title,
                content
            },
            include: {
                user: { select: { username: true } },
                _count: { select: { replies: true } }
            }
        });

        return res.status(201).json(thread);
    } catch (error) {
        if (error.code) {
            return sendForumAccessError(res, error.code);
        }

        console.error(error);
        return res.status(500).json({ error: 'Failed to create thread.' });
    }
}

async function getThreadsByModule(req, res) {
    try {
        const moduleId = Number(req.params.id);
        const courseId = getRequestedCourseId(req);

        await assertModuleForumAccess(moduleId, req.user, { courseId });

        const threads = await prisma.forumThread.findMany({
            where: { moduleId },
            include: {
                user: { select: { username: true } },
                _count: { select: { replies: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json(threads);
    } catch (error) {
        if (error.code) {
            return sendForumAccessError(res, error.code);
        }

        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch threads.' });
    }
}

async function createReply(req, res) {
    try {
        const threadId = Number(req.params.threadId);
        const content = normalizeTextField(req.body.content);
        const courseId = getRequestedCourseId(req);

        if (!content) {
            return res.status(400).json({ error: 'Reply content is required.' });
        }

        const reply = await prisma.$transaction(async (tx) => {
            const thread = await tx.forumThread.findUnique({
                where: { id: threadId },
                include: {
                    module: {
                        select: {
                            id: true,
                            status: true,
                            ownerMasterId: true,
                            courseModules: {
                                select: {
                                    courseId: true
                                }
                            }
                        }
                    }
                }
            });

            if (!thread) {
                throw buildForumAccessError('THREAD_NOT_FOUND');
            }

            await assertModuleForumAccess(thread.module.id, req.user, { courseId }, tx);

            const createdReply = await tx.forumReply.create({
                data: {
                    threadId,
                    userId: req.user.id,
                    content
                }
            });

            await notifyForumReply({
                thread,
                reply: createdReply,
                actorUserId: req.user.id
            }, tx);

            return createdReply;
        });

        return res.status(201).json(reply);
    } catch (error) {
        if (error.code) {
            return sendForumAccessError(res, error.code);
        }

        console.error(error);
        return res.status(500).json({ error: 'Failed to create reply.' });
    }
}

async function getThreadById(req, res) {
    try {
        const threadId = Number(req.params.threadId);
        const courseId = getRequestedCourseId(req);

        const thread = await prisma.forumThread.findUnique({
            where: { id: threadId },
            include: {
                module: {
                    select: {
                        id: true,
                        status: true,
                        ownerMasterId: true,
                        courseModules: {
                            select: {
                                courseId: true
                            }
                        }
                    }
                },
                user: { select: { username: true } },
                replies: {
                    include: { user: { select: { username: true } } },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!thread) {
            return sendForumAccessError(res, 'THREAD_NOT_FOUND');
        }

        await assertModuleForumAccess(thread.module.id, req.user, { courseId });

        return res.json(thread);
    } catch (error) {
        if (error.code) {
            return sendForumAccessError(res, error.code);
        }

        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch thread.' });
    }
}

module.exports = {
    createThread,
    getThreadsByModule,
    createReply,
    getThreadById
};
