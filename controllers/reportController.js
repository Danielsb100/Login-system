const prisma = require('../config/db');

const getModuleOverview = async (req, res) => {
    try {
        const { id } = req.params;
        const moduleId = parseInt(id);

        const module = await prisma.trainingModule.findUnique({
            where: { id: moduleId },
            include: {
                _count: {
                    select: {
                        accessLogs: true,
                        submissions: true,
                        placements: true
                    }
                }
            }
        });

        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Stats
        const uniqueUsers = await prisma.moduleAccessLog.groupBy({
            by: ['userId'],
            where: { moduleId }
        });

        const avgScore = await prisma.quizSubmission.aggregate({
            _avg: { score: true },
            where: { moduleId }
        });

        res.json({
            title: module.title,
            totalAccesses: module._count.accessLogs,
            uniqueUsers: uniqueUsers.length,
            totalSubmissions: module._count.submissions,
            averageScore: avgScore._avg.score || 0,
            placementsCount: module._count.placements
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch overview' });
    }
};

const getModuleUsers = async (req, res) => {
    try {
        const { id } = req.params;
        const moduleId = parseInt(id);

        // Fetch users who accessed the module
        const activeUsers = await prisma.user.findMany({
            where: {
                accessLogs: { some: { moduleId } }
            },
            select: {
                id: true,
                username: true,
                email: true,
                videoProgress: { where: { video: { moduleId } } },
                submissions: { where: { moduleId }, orderBy: { createdAt: 'desc' }, take: 1 }
            }
        });

        res.json(activeUsers.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            videoProgress: user.videoProgress.length,
            lastScore: user.submissions.length > 0 ? user.submissions[0].score : null
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user reports' });
    }
};

const getUserDetailedReport = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const moduleId = parseInt(id);
        const targetUserId = parseInt(userId);

        const logs = await prisma.moduleAccessLog.findMany({
            where: { moduleId, userId: targetUserId },
            orderBy: { timestamp: 'desc' }
        });

        const videoProgress = await prisma.moduleVideoProgress.findMany({
            where: { userId: targetUserId, video: { moduleId } },
            include: { video: { select: { title: true } } }
        });

        const submissions = await prisma.quizSubmission.findMany({
            where: { moduleId, userId: targetUserId },
            include: { answers: { include: { question: true, option: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const downloads = await prisma.moduleDocumentDownload.findMany({
            where: { userId: targetUserId, moduleDoc: { moduleId } },
            include: { moduleDoc: { select: { title: true } } }
        });

        res.json({
            accessLogs: logs,
            videoProgress,
            quizSubmissions: submissions,
            documentDownloads: downloads
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch detailed report' });
    }
};

module.exports = {
    getModuleOverview,
    getModuleUsers,
    getUserDetailedReport
};
