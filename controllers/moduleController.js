const prisma = require('../config/db');
const { notifyModulePublished } = require('../services/notificationService');
const { scheduleKnowledgeBaseRefresh } = require('../services/aiKnowledgeSyncService');

const queueAiKnowledgeRefresh = (reason) => {
    scheduleKnowledgeBaseRefresh({ prisma, reason }).catch((error) => {
        console.error(`Failed to queue AI KB refresh (${reason}):`, error);
    });
};

/**
 * Helper to format module based on target (Edit vs Runtime)
 */
const formatModuleData = (module, format = 'runtime', userRole = 'USER', userId = null) => {
    const isOwner = userId === module.ownerMasterId;
    
    // Base data
    const formatted = {
        id: module.id,
        title: module.title,
        description: module.description,
        coverImage: module.coverImage,
        status: module.status,
        createdAt: module.createdAt,
        updatedAt: module.updatedAt,
        videos: (module.videos || []).map(v => {
            const progressEntry = Array.isArray(v.progress) ? v.progress[0] : null;
            const progressValue = Number(progressEntry?.progress || 0);
            const completed = Boolean(progressEntry?.completed || progressValue >= 80);
            return {
                id: v.id,
                title: v.title,
                url: v.url,
                order: v.order,
                progress: progressValue,
                completed,
                viewed: completed
            };
        }).sort((a, b) => a.order - b.order),
        documents: (module.documents || []).map(d => {
            const viewed = Boolean(Array.isArray(d.downloads) && d.downloads.length);
            return {
                id: d.id,
                title: d.title,
                order: d.order,
                documentId: d.documentId,
                type: d.document ? d.document.type : 'application/octet-stream',
                viewed
            };
        }).sort((a, b) => a.order - b.order),
        quizzes: (module.quizzes || []).map(qz => ({
            id: qz.id,
            title: qz.title,
            order: qz.order,
            submitted: Boolean(Array.isArray(qz.submissions) && qz.submissions.length),
            bestScore: Array.isArray(qz.submissions) && qz.submissions.length
                ? qz.submissions.reduce((best, item) => Math.max(best, Number(item.score) || 0), 0)
                : null,
            questions: (qz.questions || []).map(q => ({
                id: q.id,
                text: q.text,
                order: q.order,
                options: (q.options || []).map(o => ({
                    id: o.id,
                    text: o.text,
                    ...(format === 'edit' && (userRole === 'MASTER' || userRole === 'ADMIN') ? { isCorrect: o.isCorrect } : {})
                }))
            })).sort((a, b) => a.order - b.order)
        })).sort((a, b) => a.order - b.order)
    };
    console.log(`[DEBUG] Formatted module ${module.id}: v=${formatted.videos.length}, d=${formatted.documents.length}, q=${formatted.quizzes.length}`);

    if (format === 'edit') {
        formatted.ownerMasterId = module.ownerMasterId;
    }

    return formatted;
};

// --- Module CRUD ---

const createModule = async (req, res) => {
    try {
        const { title, description, coverImage } = req.body || {};
        const normalizedTitle = typeof title === 'string' ? title.trim() : '';
        if (!normalizedTitle) {
            return res.status(400).json({ error: 'Module title is required.' });
        }

        const ownerMasterId = req.user.id;

        const newModule = await prisma.trainingModule.create({
            data: {
                title: normalizedTitle,
                description,
                coverImage,
                ownerMasterId
            }
        });

        queueAiKnowledgeRefresh('module created');
        res.status(201).json({ ...newModule, aiKnowledgeSyncQueued: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create module' });
    }
};

const getMyModules = async (req, res) => {
    try {
        const modules = await prisma.trainingModule.findMany({
            where: { ownerMasterId: req.user.id },
            include: {
                _count: {
                    select: { videos: true, documents: true, quizzes: true, placements: true }
                }
            }
        });
        res.json(modules);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch your modules' });
    }
};

const getAllPublishedModules = async (req, res) => {
    try {
        const modules = await prisma.trainingModule.findMany({
            where: { status: 'PUBLISHED' },
            select: {
                id: true,
                title: true,
                description: true,
                coverImage: true,
                updatedAt: true
            }
        });
        res.json(modules);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch modules' });
    }
};

const getModuleById = async (req, res) => {
    try {
        const { id } = req.params;
        const viewerUserId = req.user.id;
        const module = await prisma.trainingModule.findUnique({
            where: { id: parseInt(id) },
            include: {
                videos: {
                    include: {
                        progress: {
                            where: { userId: viewerUserId },
                            orderBy: { updatedAt: 'desc' },
                            take: 1
                        }
                    }
                },
                documents: {
                    include: {
                        document: true,
                        downloads: {
                            where: { userId: viewerUserId },
                            orderBy: { timestamp: 'desc' },
                            take: 1
                        }
                    }
                },
                quizzes: {
                    include: {
                        submissions: {
                            where: { userId: viewerUserId },
                            orderBy: { createdAt: 'desc' }
                        },
                        questions: { include: { options: true } }
                    }
                }
            }
        });

        if (!module) return res.status(404).json({ error: 'Module not found' });
        
        const isOwner = module.ownerMasterId === req.user.id || req.user.role === 'ADMIN';

        // Logic check: Status rules
        if (module.status === 'ARCHIVED') {
            if (!isOwner) {
                return res.status(403).json({ error: 'Este módulo foi arquivado e não está mais disponível.' });
            }
        } else if (module.status === 'DRAFT') {
            if (!isOwner) {
                return res.status(403).json({ error: 'Este módulo ainda está em rascunho e não foi publicado.' });
            }
        }

        const format = req.query.format || 'runtime';
        const formatted = formatModuleData(module, format, req.user.role, req.user.id);
        
        // Add preview flag if it's draft and viewed by owner
        if (module.status === 'DRAFT') {
            formatted.isPreview = true;
        }

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch module' });
    }
};

const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, coverImage } = req.body || {};
        if (!req.body) {
            return res.status(400).json({ error: 'Request body is required.' });
        }

        const module = await prisma.trainingModule.findUnique({ where: { id: parseInt(id) } });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only the owner can edit this module.' });
        }

        const updated = await prisma.trainingModule.update({
            where: { id: parseInt(id) },
            data: { title, description, coverImage }
        });

        queueAiKnowledgeRefresh('module updated');
        res.json({ ...updated, aiKnowledgeSyncQueued: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update module' });
    }
};

const patchStatus = async (req, res, status) => {
    try {
        const { id } = req.params;
        const moduleId = parseInt(id);
        const module = await prisma.trainingModule.findUnique({ where: { id: moduleId } });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const nextModule = await tx.trainingModule.update({
                where: { id: moduleId },
                data: { status }
            });

            if (status === 'PUBLISHED' && module.status !== 'PUBLISHED') {
                await notifyModulePublished({
                    module: nextModule,
                    actorUserId: req.user.id
                }, tx);
            }

            return nextModule;
        });

        queueAiKnowledgeRefresh(`module ${String(status).toLowerCase()}`);
        res.json({ ...updated, aiKnowledgeSyncQueued: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update status' });
    }
};

const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;
        const module = await prisma.trainingModule.findUnique({ where: { id: parseInt(id) } });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await prisma.trainingModule.delete({ where: { id: parseInt(id) } });
        queueAiKnowledgeRefresh('module deleted');
        res.json({ message: 'Module deleted successfully', aiKnowledgeSyncQueued: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete module' });
    }
};

// --- Specific Format Endpoints ---

const getEditFormat = async (req, res) => {
    req.query.format = 'edit';
    return getModuleById(req, res);
};

const getRuntimeFormat = async (req, res) => {
    req.query.format = 'runtime';
    // Potential bypass for masters to preview their own modules even if drafted
    return getModuleById(req, res);
};

// --- Assignability ---

const getMyAssignableModules = async (req, res) => {
    try {
        const modules = await prisma.trainingModule.findMany({
            where: { ownerMasterId: req.user.id },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                _count: {
                    select: { quizzes: true }
                }
            }
        });
        res.json(modules.map((module) => ({
            id: module.id,
            title: module.title,
            description: module.description,
            status: module.status,
            quizCount: module._count?.quizzes || 0
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch assignable modules' });
    }
};

module.exports = {
    createModule,
    getMyModules,
    getAllPublishedModules,
    getModuleById,
    updateModule,
    patchStatus,
    deleteModule,
    getEditFormat,
    getRuntimeFormat,
    getMyAssignableModules
};
