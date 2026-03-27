const prisma = require('../config/db');

// --- Video Management ---

const addVideo = async (req, res) => {
    try {
        const { id } = req.params; // moduleId
        const { title, url, order } = req.body;

        const module = await prisma.trainingModule.findUnique({ where: { id: parseInt(id) } });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        console.log(`[DEBUG] Adding video to module ${id}:`, { title, url, order });
        const video = await prisma.moduleVideo.create({
            data: {
                moduleId: parseInt(id),
                title,
                url,
                order: parseInt(order) || 0
            }
        });
        console.log(`[DEBUG] Video created:`, video.id);
        res.status(201).json(video);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add video' });
    }
};

const updateVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { title, url, order } = req.body;

        const video = await prisma.moduleVideo.findUnique({ 
            where: { id: parseInt(videoId) },
            include: { module: true }
        });

        if (!video) return res.status(404).json({ error: 'Video not found' });
        if (video.module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updated = await prisma.moduleVideo.update({
            where: { id: parseInt(videoId) },
            data: { title, url, order: parseInt(order) }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update video' });
    }
};

const deleteVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = await prisma.moduleVideo.findUnique({ 
            where: { id: parseInt(videoId) },
            include: { module: true }
        });

        if (!video) return res.status(404).json({ error: 'Video not found' });
        if (video.module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.moduleVideo.delete({ where: { id: parseInt(videoId) } });
        res.json({ message: 'Video deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete video' });
    }
};

// --- Document Management (Linking to existing Document model) ---

const addDocument = async (req, res) => {
    try {
        const { id } = req.params; // moduleId
        const { title, documentId, order } = req.body;

        const module = await prisma.trainingModule.findUnique({ where: { id: parseInt(id) } });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        console.log(`[DEBUG] Linking document ${documentId} to module ${id} as "${title}"`);
        const doc = await prisma.moduleDocument.create({
            data: {
                moduleId: parseInt(id),
                documentId: parseInt(documentId),
                title,
                order: parseInt(order) || 0
            }
        });
        console.log(`[DEBUG] ModuleDocument created:`, doc.id);
        res.status(201).json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add document' });
    }
};

const updateDocument = async (req, res) => {
    try {
        const { documentId } = req.params; // In this context, it's the bridge model's ID
        const { title, order } = req.body;

        const modDoc = await prisma.moduleDocument.findUnique({ 
            where: { id: parseInt(documentId) },
            include: { module: true }
        });

        if (!modDoc) return res.status(404).json({ error: 'Module document link not found' });
        if (modDoc.module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updated = await prisma.moduleDocument.update({
            where: { id: parseInt(documentId) },
            data: { title, order: parseInt(order) }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update document' });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const modDoc = await prisma.moduleDocument.findUnique({ 
            where: { id: parseInt(documentId) },
            include: { module: true }
        });

        if (!modDoc) return res.status(404).json({ error: 'Module document link not found' });
        if (modDoc.module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.moduleDocument.delete({ where: { id: parseInt(documentId) } });
        res.json({ message: 'Document removed from module' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete document' });
    }
};

// --- Quiz Management ---

const createQuiz = async (req, res) => {
    try {
        const { id } = req.params; // moduleId
        const { title, order } = req.body;

        const module = await prisma.trainingModule.findUnique({ where: { id: parseInt(id) } });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        console.log(`[DEBUG] Creating quiz for module ${id}: "${title}"`);
        const quiz = await prisma.quiz.create({
            data: {
                moduleId: parseInt(id),
                title,
                order: parseInt(order) || 0
            }
        });
        console.log(`[DEBUG] Quiz created:`, quiz.id);
        res.status(201).json(quiz);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create quiz' });
    }
};

const deleteQuiz = async (req, res) => {
    try {
        const { id, quizId } = req.params;
        const userId = req.user.id;

        const module = await prisma.trainingModule.findUnique({ where: { id: parseInt(id) } });
        if (!module || (module.ownerMasterId !== userId && req.user.role !== 'ADMIN')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.quiz.delete({
            where: { id: parseInt(quizId) }
        });

        res.json({ message: 'Quiz deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete quiz' });
    }
};

const addQuizQuestion = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { text, order, options } = req.body;

        const quiz = await prisma.quiz.findUnique({ where: { id: parseInt(quizId) }, include: { module: true } });
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        if (quiz.module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        console.log(`[DEBUG] Adding question to quiz ${quizId}: "${text}" - options count: ${options?.length}`);
        const question = await prisma.quizQuestion.create({
            data: {
                quizId: parseInt(quizId),
                text,
                order: parseInt(order) || 0,
                options: {
                    create: options
                }
            },
            include: { options: true }
        });
        console.log(`[DEBUG] Question created:`, question.id);
        res.status(201).json(question);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add quiz question' });
    }
};

const updateQuizQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { text, order, options } = req.body;

        const question = await prisma.quizQuestion.findUnique({ 
            where: { id: parseInt(questionId) },
            include: { module: true }
        });

        if (!question) return res.status(404).json({ error: 'Question not found' });
        if (question.module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Complex update: replace options or update them?
        // Simpler: Delete existing options and recreation if needed, or handle individually.
        // For simplicity in this initial version: update text/order.
        const updated = await prisma.quizQuestion.update({
            where: { id: parseInt(questionId) },
            data: { 
                text, 
                order: parseInt(order),
                // To keep it simple, we expect options to be managed via separate endpoints or full replacement logic
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update quiz question' });
    }
};

const deleteQuizQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const question = await prisma.quizQuestion.findUnique({ 
            where: { id: parseInt(questionId) },
            include: { module: true }
        });

        if (!question) return res.status(404).json({ error: 'Question not found' });
        if (question.module.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Cascading delete handles options if configured in Prisma, otherwise handle manually
        await prisma.quizQuestion.delete({ where: { id: parseInt(questionId) } });
        res.json({ message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete question' });
    }
};

const submitQuiz = async (req, res) => {
    try {
        const { id } = req.params; // moduleId
        const { answers } = req.body; // array of { questionId, optionId }
        const userId = req.user.id;

        const module = await prisma.trainingModule.findUnique({ 
            where: { id: parseInt(id) },
            include: { quizzes: { include: { questions: { include: { options: true } } } } }
        });

        if (!module) return res.status(404).json({ error: 'Module not found' });

        // Flat list of all questions in the module for easy lookup
        const allQuestions = module.quizzes.flatMap(qz => qz.questions);

        // Calculate score
        let correctCount = 0;
        const resultAnswers = [];

        for (const answer of answers) {
            const question = allQuestions.find(q => q.id === answer.questionId);
            if (!question) continue;

            const selectedOption = question.options.find(o => o.id === answer.optionId);
            if (selectedOption && selectedOption.isCorrect) {
                correctCount++;
            }
            resultAnswers.push({
                questionId: answer.questionId,
                optionId: answer.optionId
            });
        }

        const totalQuestions = allQuestions.length || 1;
        const score = (correctCount / totalQuestions) * 100;

        // Get attempt number
        const lastSubmission = await prisma.quizSubmission.findFirst({
            where: { moduleId: parseInt(id), userId },
            orderBy: { attemptNumber: 'desc' }
        });
        const attemptNumber = lastSubmission ? lastSubmission.attemptNumber + 1 : 1;

        const submission = await prisma.quizSubmission.create({
            data: {
                moduleId: parseInt(id),
                userId,
                score,
                attemptNumber,
                answers: {
                    create: resultAnswers
                }
            }
        });

        res.status(201).json({
            message: 'Quiz submitted successfully',
            submissionId: submission.id,
            score,
            attemptNumber
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit quiz' });
    }
};

const getQuizzesSubmissions = async (req, res) => {
    try {
        const { id } = req.params; // moduleId
        const submissions = await prisma.quizSubmission.findMany({
            where: { moduleId: parseInt(id) },
            include: { user: { select: { id: true, username: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
};

module.exports = {
    addVideo, updateVideo, deleteVideo,
    addDocument, updateDocument, deleteDocument,
    createQuiz, deleteQuiz, addQuizQuestion, updateQuizQuestion, deleteQuizQuestion,
    submitQuiz, getQuizzesSubmissions
};
