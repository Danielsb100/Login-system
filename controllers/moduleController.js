const prisma = require('../config/db');

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
        videos: module.videos.map(v => ({
            id: v.id,
            title: v.title,
            url: v.url,
            order: v.order
        })).sort((a, b) => a.order - b.order),
        documents: module.documents.map(d => ({
            id: d.id,
            title: d.title,
            order: d.order,
            documentId: d.documentId
        })).sort((a, b) => a.order - b.order),
        questions: module.questions.map(q => {
            const questionData = {
                id: q.id,
                text: q.text,
                order: q.order,
                options: q.options.map(o => ({
                    id: o.id,
                    text: o.text,
                    // Hide isCorrect in runtime unless it's the owner/admin in edit mode
                    ...(format === 'edit' && (userRole === 'MASTER' || userRole === 'ADMIN') ? { isCorrect: o.isCorrect } : {})
                }))
            };
            return questionData;
        }).sort((a, b) => a.order - b.order)
    };

    if (format === 'edit') {
        formatted.ownerMasterId = module.ownerMasterId;
    }

    return formatted;
};

// --- Module CRUD ---

const createModule = async (req, res) => {
    try {
        const { title, description, coverImage } = req.body;
        const ownerMasterId = req.user.id;

        // Check limit of 5 modules
        const moduleCount = await prisma.trainingModule.count({
            where: { ownerMasterId }
        });

        if (moduleCount >= 5) {
            return res.status(400).json({ error: 'Limit reached: Each MASTER can create at most 5 modules.' });
        }

        const newModule = await prisma.trainingModule.create({
            data: {
                title,
                description,
                coverImage,
                ownerMasterId
            }
        });

        res.status(201).json(newModule);
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
                    select: { videos: true, documents: true, questions: true, placements: true }
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
        const module = await prisma.trainingModule.findUnique({
            where: { id: parseInt(id) },
            include: {
                videos: true,
                documents: true,
                questions: {
                    include: { options: true }
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
        const { title, description, coverImage } = req.body;

        const module = await prisma.trainingModule.findUnique({ where: { id: parseInt(id) } });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only the owner can edit this module.' });
        }

        const updated = await prisma.trainingModule.update({
            where: { id: parseInt(id) },
            data: { title, description, coverImage }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update module' });
    }
};

const patchStatus = async (req, res, status) => {
    try {
        const { id } = req.params;
        const module = await prisma.trainingModule.findUnique({ where: { id: parseInt(id) } });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updated = await prisma.trainingModule.update({
            where: { id: parseInt(id) },
            data: { status }
        });
        res.json(updated);
    } catch (error) {
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
        res.json({ message: 'Module deleted successfully' });
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
                status: true
            }
        });
        res.json(modules);
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
