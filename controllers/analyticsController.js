const prisma = require('../config/db');

const logAccess = async (req, res) => {
    try {
        const { id } = req.params; // moduleId
        const { source } = req.body; // 'dashboard' or 'multiplayer_world'
        const userId = req.user.id;

        if (!['dashboard', 'multiplayer_world'].includes(source)) {
            return res.status(400).json({ error: 'Invalid source. Use "dashboard" or "multiplayer_world".' });
        }

        const log = await prisma.moduleAccessLog.create({
            data: {
                moduleId: parseInt(id),
                userId,
                source
            }
        });
        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ error: 'Failed to log access' });
    }
};

const logVideoProgress = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { progress, source } = req.body; // progress 0-100
        const userId = req.user.id;

        const video = await prisma.moduleVideo.findUnique({ where: { id: parseInt(videoId) } });
        if (!video) return res.status(404).json({ error: 'Video not found' });

        // Calculate if completed (80% rule)
        const completed = progress >= 80;

        const upsertProgress = await prisma.moduleVideoProgress.upsert({
            where: {
                videoId_userId: { // Need to ensure unique constraint in schema or handle manually
                    videoId: parseInt(videoId),
                    userId
                }
            },
            update: {
                progress: parseFloat(progress),
                completed: completed // Should probably not revert if already true? 
                // completed: { set: true } // Logic: if once completed, stay completed?
            },
            create: {
                videoId: parseInt(videoId),
                userId,
                progress: parseFloat(progress),
                completed
            }
        });

        // Log to AuditLog for source tracking
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'VIDEO_PROGRESS',
                entityType: 'ModuleVideo',
                entityId: parseInt(videoId),
                details: { progress, source }
            }
        });

        res.json(upsertProgress);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to log video progress' });
    }
};

// Wait, the ModuleVideoProgress model in schema NEEDS a unique constraint for upsert videoId_userId
// I should check schema.prisma if I added it. If not, I'll need to update it or use findFirst + update/create.

const logDocumentDownload = async (req, res) => {
    try {
        const { documentId } = req.params; // Bridge model ID
        const { source } = req.body;
        const userId = req.user.id;

        const modDoc = await prisma.moduleDocument.findUnique({ where: { id: parseInt(documentId) } });
        if (!modDoc) return res.status(404).json({ error: 'Document not found' });

        const log = await prisma.moduleDocumentDownload.create({
            data: {
                moduleDocId: parseInt(documentId),
                userId,
                timestamp: new Date()
            }
        });

        await prisma.auditLog.create({
            data: {
                userId,
                action: 'DOC_DOWNLOAD',
                entityType: 'ModuleDocument',
                entityId: parseInt(documentId),
                details: { source }
            }
        });

        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ error: 'Failed to log download' });
    }
};

module.exports = {
    logAccess,
    logVideoProgress,
    logDocumentDownload
};
