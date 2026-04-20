const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');

const env = require('./config/env');
const prisma = require('./config/db');
const { buildClientRuntimeConfig } = require('./config/runtime');
const { backfillAllUserIdentities } = require('./services/identityService');
const { sendSuccess, sendError } = require('./utils/http');

const authController = require('./controllers/authController');
const authenticateToken = require('./middleware/authMiddleware');
const userController = require('./controllers/userController');
const profileController = require('./controllers/profileController');
const roleMiddleware = require('./middleware/roleMiddleware');
const documentController = require('./controllers/documentController');
const moduleController = require('./controllers/moduleController');
const contentController = require('./controllers/contentController');
const forumController = require('./controllers/forumController');
const analyticsController = require('./controllers/analyticsController');
const placementController = require('./controllers/placementController');
const reportController = require('./controllers/reportController');
const notificationController = require('./controllers/notificationController');
const courseController = require('./controllers/courseController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.upload.maxFileSizeBytes }
});

const app = express();
const PORT = env.port;

const corsOptions = env.cors.origins.length
  ? {
      origin(origin, callback) {
        if (!origin || env.cors.origins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Origin not allowed by CORS.'));
      }
    }
  : undefined;

app.use(cors(corsOptions));
app.use(express.json());

app.get('/app-config.js', (req, res) => {
  res.type('application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`window.__APP_CONFIG__ = Object.freeze(${JSON.stringify(buildClientRuntimeConfig(req))});`);
});

app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  })
);

app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);
app.post('/auth/verify-email', authController.verifyEmail);
app.post('/auth/resend-code', authController.resendCode);
app.post('/auth/password/request', authController.requestPasswordReset);
app.post('/auth/password/reset', authController.resetPassword);
app.get('/auth/verify', authenticateToken, authController.verify);

app.get('/api/users', authenticateToken, roleMiddleware(['ADMIN', 'MASTER']), userController.getAllUsers);
app.get('/api/users/search', authenticateToken, roleMiddleware(['MASTER']), userController.searchUsers);
app.patch('/api/users/:id/roles', authenticateToken, roleMiddleware(['ADMIN', 'MASTER', 'SUPER_ADMIN']), userController.updateUserRoles);
app.post('/api/users/reset', authenticateToken, roleMiddleware(['MASTER']), userController.resetDatabase);
app.delete('/api/users/:id', authenticateToken, roleMiddleware(['MASTER']), userController.deleteUser);
app.post(
  '/api/users/profile-picture',
  authenticateToken,
  upload.single('profilePicture'),
  userController.uploadProfilePicture
);
app.get('/api/users/:id/profile-card', authenticateToken, profileController.getUserProfileCard);

app.get('/api/profile/me', authenticateToken, profileController.getMyProfile);
app.put('/api/profile/me', authenticateToken, profileController.updateMyProfile);
app.put('/api/profile/preferences', authenticateToken, profileController.updateMyPreferences);
app.put('/api/profile/consents', authenticateToken, profileController.updateMyConsents);
app.post('/api/profile/portfolio', authenticateToken, profileController.createPortfolioItem);
app.put('/api/profile/portfolio/:id', authenticateToken, profileController.updatePortfolioItem);
app.delete('/api/profile/portfolio/:id', authenticateToken, profileController.deletePortfolioItem);

app.get('/api/notifications/summary', authenticateToken, notificationController.getSummary);
app.patch('/api/notifications/read-all', authenticateToken, notificationController.setAllNotificationsRead);
app.patch('/api/notifications/:id/read', authenticateToken, notificationController.setNotificationRead);
app.patch('/api/tasks/:id', authenticateToken, notificationController.updateTaskStatus);
app.patch('/api/reminders/:id', authenticateToken, notificationController.updateReminder);

app.post('/courses', authenticateToken, roleMiddleware(['MASTER']), courseController.createCourse);
app.get('/courses/my', authenticateToken, roleMiddleware(['MASTER']), courseController.getMyCourses);
app.get('/courses/accessible', authenticateToken, courseController.getAccessibleCourses);
app.get('/courses/:id', authenticateToken, courseController.getCourseDetail);
app.put('/courses/:id', authenticateToken, roleMiddleware(['MASTER']), courseController.updateCourse);
app.post('/courses/:id/modules', authenticateToken, roleMiddleware(['MASTER']), courseController.addModuleToCourse);
app.patch('/courses/:id/modules/reorder', authenticateToken, roleMiddleware(['MASTER']), courseController.reorderCourseModules);
app.patch('/courses/:id/modules/:courseModuleId', authenticateToken, roleMiddleware(['MASTER']), courseController.updateCourseModule);
app.delete('/courses/:id/modules/:courseModuleId', authenticateToken, roleMiddleware(['MASTER']), courseController.removeCourseModule);
app.post('/courses/:id/enrollments', authenticateToken, roleMiddleware(['MASTER']), courseController.enrollUser);
app.get('/courses/:id/runtime', authenticateToken, courseController.getCourseRuntime);
app.post('/courses/:id/modules/:moduleId/complete', authenticateToken, courseController.completeCourseModule);

app.post('/modules', authenticateToken, roleMiddleware(['MASTER']), moduleController.createModule);
app.get('/modules/my', authenticateToken, roleMiddleware(['MASTER']), moduleController.getMyModules);
app.get(
  '/modules/my/assignable',
  authenticateToken,
  roleMiddleware(['MASTER']),
  moduleController.getMyAssignableModules
);
app.get('/modules', authenticateToken, moduleController.getAllPublishedModules);
app.get('/modules/:id', authenticateToken, moduleController.getModuleById);
app.put('/modules/:id', authenticateToken, roleMiddleware(['MASTER']), moduleController.updateModule);
app.patch('/modules/:id/publish', authenticateToken, roleMiddleware(['MASTER']), (req, res) =>
  moduleController.patchStatus(req, res, 'PUBLISHED')
);
app.patch('/modules/:id/archive', authenticateToken, roleMiddleware(['MASTER']), (req, res) =>
  moduleController.patchStatus(req, res, 'ARCHIVED')
);
app.delete('/modules/:id', authenticateToken, roleMiddleware(['MASTER', 'ADMIN']), moduleController.deleteModule);

app.get('/modules/:id/edit-format', authenticateToken, roleMiddleware(['MASTER', 'ADMIN']), moduleController.getEditFormat);
app.get('/runtime/modules/:id', authenticateToken, moduleController.getRuntimeFormat);

app.post('/modules/:id/videos', authenticateToken, roleMiddleware(['MASTER']), contentController.addVideo);
app.put('/modules/:id/videos/:videoId', authenticateToken, roleMiddleware(['MASTER']), contentController.updateVideo);
app.delete(
  '/modules/:id/videos/:videoId',
  authenticateToken,
  roleMiddleware(['MASTER']),
  contentController.deleteVideo
);

app.post('/modules/:id/documents', authenticateToken, roleMiddleware(['MASTER']), contentController.addDocument);
app.put(
  '/modules/:id/documents/:documentId',
  authenticateToken,
  roleMiddleware(['MASTER']),
  contentController.updateDocument
);
app.delete(
  '/modules/:id/documents/:documentId',
  authenticateToken,
  roleMiddleware(['MASTER']),
  contentController.deleteDocument
);

app.post('/modules/:id/quizzes', authenticateToken, roleMiddleware(['MASTER']), contentController.createQuiz);
app.delete('/modules/:id/quizzes/:quizId', authenticateToken, roleMiddleware(['MASTER']), contentController.deleteQuiz);
app.post('/quizzes/:quizId/questions', authenticateToken, roleMiddleware(['MASTER']), contentController.addQuizQuestion);
app.delete(
  '/modules/:id/quiz/questions/:questionId',
  authenticateToken,
  roleMiddleware(['MASTER']),
  contentController.deleteQuizQuestion
);
app.post('/modules/:id/quiz/submit', authenticateToken, contentController.submitQuiz);
app.get('/modules/:id/quiz/submissions', authenticateToken, contentController.getQuizzesSubmissions);

app.post('/modules/:id/forum/threads', authenticateToken, forumController.createThread);
app.get('/modules/:id/forum/threads', authenticateToken, forumController.getThreadsByModule);
app.post('/forum/threads/:threadId/replies', authenticateToken, forumController.createReply);
app.get('/forum/threads/:threadId', authenticateToken, forumController.getThreadById);

app.post('/modules/:id/access', authenticateToken, analyticsController.logAccess);
app.post('/modules/:id/videos/:videoId/progress', authenticateToken, analyticsController.logVideoProgress);
app.post('/modules/:id/documents/:documentId/download', authenticateToken, analyticsController.logDocumentDownload);

app.post('/world/placements', authenticateToken, roleMiddleware(['MASTER']), placementController.createPlacement);
app.get('/world/placements', authenticateToken, placementController.getPlacementsByScene);
app.get('/world/placements/:id', authenticateToken, placementController.getPlacementById);
app.put('/world/placements/:id', authenticateToken, roleMiddleware(['MASTER']), placementController.updatePlacement);
app.delete('/world/placements/:id', authenticateToken, roleMiddleware(['MASTER']), placementController.deletePlacement);
app.patch('/world/placements/:id/assign-module', authenticateToken, roleMiddleware(['MASTER']), placementController.assignModule);
app.patch('/world/placements/:id/unassign-module', authenticateToken, roleMiddleware(['MASTER']), (req, res) => {
  req.body.moduleId = null;
  placementController.assignModule(req, res);
});
app.patch(
  '/world/placements/:id/model',
  authenticateToken,
  roleMiddleware(['MASTER']),
  upload.single('model'),
  placementController.uploadModel
);
app.get('/world/placements/:id/model', placementController.serveModel);

app.get(
  '/modules/:id/reports/overview',
  authenticateToken,
  roleMiddleware(['MASTER', 'ADMIN']),
  reportController.getModuleOverview
);
app.get(
  '/modules/:id/reports/users',
  authenticateToken,
  roleMiddleware(['MASTER', 'ADMIN']),
  reportController.getModuleUsers
);
app.get(
  '/modules/:id/reports/users/:userId',
  authenticateToken,
  roleMiddleware(['MASTER', 'ADMIN']),
  reportController.getUserDetailedReport
);

app.post('/api/documents/upload', authenticateToken, upload.single('document'), documentController.uploadDocument);
app.get('/api/documents', authenticateToken, (req, res) => {
  req.params.username = req.user.username;
  documentController.getUserDocuments(req, res);
});
app.get('/api/documents/user/:username', documentController.getUserDocuments);
app.get('/api/documents/download/:id', documentController.downloadDocument);
app.delete('/api/documents/:id', authenticateToken, documentController.deleteDocument);

app.get('/', (req, res) => {
  return sendSuccess(res, { message: 'Authentication API is running.' });
});

const seedMasterUser = async () => {
  if (!env.seed.autoSeedMaster) {
    return;
  }

  try {
    const { username, email, password } = env.seed.masterUser;

    const existingMaster = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (!existingMaster) {
      const password_hash = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { username, email, password_hash, role: 'MASTER' }
      });
      console.log(`[seed] Master user created automatically: ${username}`);
    } else if (existingMaster.role !== 'MASTER') {
      await prisma.user.update({
        where: { id: existingMaster.id },
        data: { role: 'MASTER' }
      });
      console.log(`[seed] Account ${username} converted to MASTER.`);
    }
  } catch (err) {
    console.error('Falha ao criar o Master User automaticamente:', err);
  }
};

app.use((req, res) => {
  return sendError(res, {
    status: 404,
    code: 'ROUTE_NOT_FOUND',
    message: 'Route not found.',
    extra: { path: req.originalUrl }
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, {
        status: 400,
        code: 'UPLOAD_FILE_TOO_LARGE',
        message: `Arquivo muito grande. Limite de ${env.upload.maxFileSizeMb}MB.`
      });
    }

    return sendError(res, {
      status: 400,
      code: 'UPLOAD_ERROR',
      message: `Erro no upload: ${err.message}`
    });
  }

  if (err && err.message === 'Origin not allowed by CORS.') {
    return sendError(res, {
      status: 403,
      code: 'CORS_ORIGIN_DENIED',
      message: 'Origin not allowed by CORS.'
    });
  }

  console.error(err);
  return sendError(res, {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error.'
  });
});

env.meta.warnings.forEach((warning) => {
  console.warn(`[config] ${warning}`);
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await seedMasterUser();
  await backfillAllUserIdentities();
});
