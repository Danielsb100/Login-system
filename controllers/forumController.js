const prisma = require('../config/db');

const createThread = async (req, res) => {
    try {
        const { id } = req.params; // moduleId
        const { title, content } = req.body;
        const userId = req.user.id;

        const module = await prisma.trainingModule.findUnique({ where: { id: parseInt(id) } });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        
        // Check if module is published or user is owner
        if (module.status !== 'PUBLISHED' && module.ownerMasterId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const thread = await prisma.forumThread.create({
            data: {
                moduleId: parseInt(id),
                userId,
                title,
                content
            }
        });
        res.status(201).json(thread);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create thread' });
    }
};

const getThreadsByModule = async (req, res) => {
    try {
        const { id } = req.params;
        const threads = await prisma.forumThread.findMany({
            where: { moduleId: parseInt(id) },
            include: {
                user: { select: { username: true } },
                _count: { select: { replies: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(threads);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch threads' });
    }
};

const createReply = async (req, res) => {
    try {
        const { threadId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const thread = await prisma.forumThread.findUnique({ where: { id: parseInt(threadId) } });
        if (!thread) return res.status(404).json({ error: 'Thread not found' });

        const reply = await prisma.forumReply.create({
            data: {
                threadId: parseInt(threadId),
                userId,
                content
            }
        });
        res.status(201).json(reply);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create reply' });
    }
};

const getThreadById = async (req, res) => {
    try {
        const { threadId } = req.params;
        const thread = await prisma.forumThread.findUnique({
            where: { id: parseInt(threadId) },
            include: {
                user: { select: { username: true } },
                replies: {
                    include: { user: { select: { username: true } } },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        if (!thread) return res.status(404).json({ error: 'Thread not found' });
        res.json(thread);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch thread' });
    }
};

module.exports = {
    createThread,
    getThreadsByModule,
    createReply,
    getThreadById
};
