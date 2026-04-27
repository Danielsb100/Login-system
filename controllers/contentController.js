const prisma = require('../config/db');
const { notifyQuizSubmitted } = require('../services/notificationService');
const { generateQuizFromModule, getModuleAssetUrl } = require('../services/openaiQuizService');

const getEffectiveUserRoles = (user) => new Set([
    ...(Array.isArray(user?.roles) ? user.roles : []),
    user?.primaryRole,
    user?.legacyRole,
    user?.role
].filter(Boolean));

const isModuleManager = (user, module) => {
    const roles = getEffectiveUserRoles(user);
    return module?.ownerMasterId === user?.id
        || roles.has('ADMIN')
        || roles.has('MASTER')
        || roles.has('SUPER_ADMIN');
};

const normalizeQuizOptions = (options) => {
    if (!Array.isArray(options) || options.length < 2) {
        const error = new Error('At least 2 options are required.');
        error.statusCode = 400;
        throw error;
    }

    const normalized = options.map((option) => ({
        text: String(option?.text || '').trim(),
        isCorrect: Boolean(option?.isCorrect)
    })).filter((option) => option.text);

    if (normalized.length < 2) {
        const error = new Error('At least 2 non-empty options are required.');
        error.statusCode = 400;
        throw error;
    }

    if (normalized.filter((option) => option.isCorrect).length !== 1) {
        const error = new Error('Exactly one option must be marked correct.');
        error.statusCode = 400;
        throw error;
    }

    return normalized;
};

// --- Video Management ---

const addVideo = async (req, res) => {
    try {
        const { id } = req.params; // moduleId
        const { title, url, order } = req.body;

        const module = await prisma.trainingModule.findUnique({ where: { id: parseInt(id) } });
        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (!isModuleManager(req.user, module)) {
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
        if (!isModuleManager(req.user, module)) {
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
        if (!isModuleManager(req.user, module)) {
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
        const moduleId = parseInt(req.params.id, 10);
        const quizId = parseInt(req.params.quizId, 10);

        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { module: true }
        });

        if (!quiz || quiz.moduleId !== moduleId) return res.status(404).json({ error: 'Quiz not found' });
        if (!isModuleManager(req.user, quiz.module)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.quiz.delete({
            where: { id: quizId }
        });

        res.json({ message: 'Quiz deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete quiz' });
    }
};

const updateQuiz = async (req, res) => {
    try {
        const moduleId = parseInt(req.params.id, 10);
        const quizId = parseInt(req.params.quizId, 10);
        const { title, order } = req.body || {};

        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { module: true }
        });

        if (!quiz || quiz.moduleId !== moduleId) return res.status(404).json({ error: 'Quiz not found' });
        if (!isModuleManager(req.user, quiz.module)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const data = {};
        if (title !== undefined) {
            const trimmedTitle = String(title).trim();
            if (!trimmedTitle) return res.status(400).json({ error: 'Quiz title is required' });
            data.title = trimmedTitle;
        }
        if (order !== undefined) {
            const parsedOrder = parseInt(order, 10);
            if (!Number.isFinite(parsedOrder)) return res.status(400).json({ error: 'Quiz order must be a number' });
            data.order = parsedOrder;
        }

        const updated = await prisma.quiz.update({
            where: { id: quizId },
            data,
            include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update quiz' });
    }
};

const createAiGeneratedQuiz = async (req, res) => {
    try {
        const moduleId = parseInt(req.params.id, 10);
        const { questionCount, optionsPerQuestion, title } = req.body || {};

        const module = await prisma.trainingModule.findUnique({
            where: { id: moduleId },
            include: {
                videos: true,
                documents: { include: { document: true } }
            }
        });

        if (!module) return res.status(404).json({ error: 'Module not found' });
        if (!isModuleManager(req.user, module)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const videoAssetIds = [...new Set((module.videos || [])
            .map((video) => getModuleAssetUrl(video.url))
            .filter(Boolean))];

        const videoAssetDocuments = videoAssetIds.length
            ? await prisma.document.findMany({ where: { id: { in: videoAssetIds } } })
            : [];

        const generated = await generateQuizFromModule({ ...module, videoAssetDocuments }, {
            questionCount,
            optionsPerQuestion
        });

        if (!generated.questions.length) {
            return res.status(502).json({ error: 'AI did not return enough valid quiz questions.' });
        }

        const order = await prisma.quiz.count({ where: { moduleId } });
        const quiz = await prisma.quiz.create({
            data: {
                moduleId,
                title: title || generated.title || 'AI Generated Quiz',
                order,
                questions: {
                    create: generated.questions.map((question, questionIndex) => ({
                        text: question.text,
                        order: questionIndex,
                        options: {
                            create: question.options.map((option) => ({
                                text: option.text,
                                isCorrect: option.isCorrect
                            }))
                        }
                    }))
                }
            },
            include: { questions: { include: { options: true } } }
        });

        res.status(201).json(quiz);
    } catch (error) {
        console.error('AI quiz generation failed:', error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to generate AI quiz' });
    }
};

const addQuizQuestion = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { text, order, options } = req.body;

        const quiz = await prisma.quiz.findUnique({ where: { id: parseInt(quizId) }, include: { module: true } });
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        if (!isModuleManager(req.user, quiz.module)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const normalizedOptions = normalizeQuizOptions(options);

        console.log(`[DEBUG] Adding question to quiz ${quizId}: "${text}" - options count: ${normalizedOptions.length}`);
        const question = await prisma.quizQuestion.create({
            data: {
                quizId: parseInt(quizId),
                text,
                order: parseInt(order) || 0,
                options: {
                    create: normalizedOptions
                }
            },
            include: { options: true }
        });
        console.log(`[DEBUG] Question created:`, question.id);
        res.status(201).json(question);
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to add quiz question' });
    }
};

const updateQuizQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { text, order, options } = req.body;
        const parsedQuestionId = parseInt(questionId, 10);

        const question = await prisma.quizQuestion.findUnique({ 
            where: { id: parsedQuestionId },
            include: { quiz: { include: { module: true } } }
        });

        if (!question) return res.status(404).json({ error: 'Question not found' });
        if (!isModuleManager(req.user, question.quiz.module)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const data = {};
        if (text !== undefined) {
            const trimmedText = String(text).trim();
            if (!trimmedText) return res.status(400).json({ error: 'Question text is required' });
            data.text = trimmedText;
        }
        if (order !== undefined) {
            const parsedOrder = parseInt(order, 10);
            if (!Number.isFinite(parsedOrder)) return res.status(400).json({ error: 'Question order must be a number' });
            data.order = parsedOrder;
        }

        const normalizedOptions = options === undefined ? null : normalizeQuizOptions(options);

        const updated = await prisma.$transaction(async (tx) => {
            await tx.quizQuestion.update({
                where: { id: parsedQuestionId },
                data
            });

            if (normalizedOptions) {
                await tx.quizOption.deleteMany({ where: { questionId: parsedQuestionId } });
                await tx.quizOption.createMany({
                    data: normalizedOptions.map((option) => ({
                        questionId: parsedQuestionId,
                        text: option.text,
                        isCorrect: option.isCorrect
                    }))
                });
            }

            return tx.quizQuestion.findUnique({
                where: { id: parsedQuestionId },
                include: { options: true }
            });
        });

        res.json(updated);
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update quiz question' });
    }
};

const deleteQuizQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const question = await prisma.quizQuestion.findUnique({ 
            where: { id: parseInt(questionId) },
            include: { quiz: { include: { module: true } } }
        });

        if (!question) return res.status(404).json({ error: 'Question not found' });
        if (!isModuleManager(req.user, question.quiz.module)) {
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
        const { answers, courseId } = req.body; // array of { questionId, optionId }
        const userId = req.user.id;
        const moduleId = parseInt(id);
        const parsedCourseId = courseId ? parseInt(courseId) : null;

        const module = await prisma.trainingModule.findUnique({ 
            where: { id: moduleId },
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
            where: { moduleId, userId },
            orderBy: { attemptNumber: 'desc' }
        });
        const attemptNumber = lastSubmission ? lastSubmission.attemptNumber + 1 : 1;

        const submission = await prisma.$transaction(async (tx) => {
            const createdSubmission = await tx.quizSubmission.create({
                data: {
                    moduleId,
                    userId,
                    score,
                    attemptNumber,
                    answers: {
                        create: resultAnswers
                    }
                }
            });

            await notifyQuizSubmitted({
                module,
                submission: createdSubmission,
                actorUserId: userId
            }, tx);

            return createdSubmission;
        });

        res.status(201).json({
            message: 'Quiz submitted successfully',
            submissionId: submission.id,
            score,
            attemptNumber,
            courseId: parsedCourseId
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
    createQuiz, updateQuiz, deleteQuiz, createAiGeneratedQuiz, addQuizQuestion, updateQuizQuestion, deleteQuizQuestion,
    submitQuiz, getQuizzesSubmissions
};
