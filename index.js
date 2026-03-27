require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authController = require('./controllers/authController');
const authenticateToken = require('./middleware/authMiddleware');
const userController = require('./controllers/userController');
const roleMiddleware = require('./middleware/roleMiddleware');
const path = require('path');
const bcrypt = require('bcrypt');
const prisma = require('./config/db');
const multer = require('multer');
const documentController = require('./controllers/documentController');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// New Controllers
const moduleController = require('./controllers/moduleController');
const contentController = require('./controllers/contentController');
const forumController = require('./controllers/forumController');
const analyticsController = require('./controllers/analyticsController');
const placementController = require('./controllers/placementController');
const reportController = require('./controllers/reportController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);

// Protected route example / token verification
app.get('/auth/verify', authenticateToken, authController.verify);

// Admin / Master route to fetch all users
app.get('/api/users', authenticateToken, roleMiddleware(['ADMIN', 'MASTER']), userController.getAllUsers);

// Rota exclusiva para o MASTER resetar a database
app.post('/api/users/reset', authenticateToken, roleMiddleware(['MASTER']), userController.resetDatabase);

// --- Teaching Modules Routes ---

// Module CRUD
app.post('/modules', authenticateToken, roleMiddleware(['MASTER']), moduleController.createModule);
app.get('/modules/my', authenticateToken, roleMiddleware(['MASTER']), moduleController.getMyModules);
app.get('/modules/my/assignable', authenticateToken, roleMiddleware(['MASTER']), moduleController.getMyAssignableModules);
app.get('/modules', authenticateToken, moduleController.getAllPublishedModules);
app.get('/modules/:id', authenticateToken, moduleController.getModuleById);
app.put('/modules/:id', authenticateToken, roleMiddleware(['MASTER']), moduleController.updateModule);
app.patch('/modules/:id/publish', authenticateToken, roleMiddleware(['MASTER']), (req, res) => moduleController.patchStatus(req, res, 'PUBLISHED'));
app.patch('/modules/:id/archive', authenticateToken, roleMiddleware(['MASTER']), (req, res) => moduleController.patchStatus(req, res, 'ARCHIVED'));
app.delete('/modules/:id', authenticateToken, roleMiddleware(['MASTER', 'ADMIN']), moduleController.deleteModule);

// Modules Formats
app.get('/modules/:id/edit-format', authenticateToken, roleMiddleware(['MASTER', 'ADMIN']), moduleController.getEditFormat);
app.get('/runtime/modules/:id', authenticateToken, moduleController.getRuntimeFormat);

// Video Management
app.post('/modules/:id/videos', authenticateToken, roleMiddleware(['MASTER']), contentController.addVideo);
app.put('/modules/:id/videos/:videoId', authenticateToken, roleMiddleware(['MASTER']), contentController.updateVideo);
app.delete('/modules/:id/videos/:videoId', authenticateToken, roleMiddleware(['MASTER']), contentController.deleteVideo);

// Document Management
app.post('/modules/:id/documents', authenticateToken, roleMiddleware(['MASTER']), contentController.addDocument);
app.put('/modules/:id/documents/:documentId', authenticateToken, roleMiddleware(['MASTER']), contentController.updateDocument);
app.delete('/modules/:id/documents/:documentId', authenticateToken, roleMiddleware(['MASTER']), contentController.deleteDocument);

// Quiz Management
app.post('/modules/:id/quizzes', authenticateToken, roleMiddleware(['MASTER']), contentController.createQuiz);
app.delete('/modules/:id/quizzes/:quizId', authenticateToken, roleMiddleware(['MASTER']), contentController.deleteQuiz);
app.post('/quizzes/:quizId/questions', authenticateToken, roleMiddleware(['MASTER']), contentController.addQuizQuestion);
app.delete('/modules/:id/quiz/questions/:questionId', authenticateToken, roleMiddleware(['MASTER']), contentController.deleteQuizQuestion);
app.post('/modules/:id/quiz/submit', authenticateToken, contentController.submitQuiz);
app.get('/modules/:id/quiz/submissions', authenticateToken, contentController.getQuizzesSubmissions);

// Forum Management
app.post('/modules/:id/forum/threads', authenticateToken, forumController.createThread);
app.get('/modules/:id/forum/threads', authenticateToken, forumController.getThreadsByModule);
app.post('/forum/threads/:threadId/replies', authenticateToken, forumController.createReply);
app.get('/forum/threads/:threadId', authenticateToken, forumController.getThreadById);

// Analytics Logging
app.post('/modules/:id/access', authenticateToken, analyticsController.logAccess);
app.post('/modules/:id/videos/:videoId/progress', authenticateToken, analyticsController.logVideoProgress);
app.post('/modules/:id/documents/:documentId/download', authenticateToken, analyticsController.logDocumentDownload);

// World Placements
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
app.patch('/world/placements/:id/model', authenticateToken, roleMiddleware(['MASTER']), upload.single('model'), placementController.uploadModel);
app.get('/world/placements/:id/model', placementController.serveModel);

// Reporting
app.get('/modules/:id/reports/overview', authenticateToken, roleMiddleware(['MASTER', 'ADMIN']), reportController.getModuleOverview);
app.get('/modules/:id/reports/users', authenticateToken, roleMiddleware(['MASTER', 'ADMIN']), reportController.getModuleUsers);
app.get('/modules/:id/reports/users/:userId', authenticateToken, roleMiddleware(['MASTER', 'ADMIN']), reportController.getUserDetailedReport);

// Document routes (Existing)
app.post('/api/documents/upload', authenticateToken, upload.single('document'), documentController.uploadDocument);
app.get('/api/documents', authenticateToken, (req, res) => {
    // Wrap to pass username
    req.params.username = req.user.username;
    documentController.getUserDocuments(req, res);
});
app.get('/api/documents/user/:username', documentController.getUserDocuments);
app.get('/api/documents/download/:id', documentController.downloadDocument);
app.delete('/api/documents/:id', authenticateToken, documentController.deleteDocument);

// Root endpoint test
app.get('/', (req, res) => {
  res.send('Authentication API is running.');
});

// Start server
const seedMasterUser = async () => {
  try {
      // Se não houver variáveis, usa o padrão abaixo:
      const username = process.env.MASTER_USERNAME || 'admin';
      const email = process.env.MASTER_EMAIL || 'admin@master.com';
      const password = process.env.MASTER_PASSWORD || 'master123';

      const existingMaster = await prisma.user.findFirst({
          where: { OR: [{ email }, { username }] }
      });

      if (!existingMaster) {
          const password_hash = await bcrypt.hash(password, 10);
          await prisma.user.create({
              data: { username, email, password_hash, role: 'MASTER' }
          });
          console.log(`✅ [Automático] Master user criado: ${username} / ${password}`);
      } else if (existingMaster.role !== 'MASTER') {
          await prisma.user.update({
              where: { id: existingMaster.id },
              data: { role: 'MASTER' }
          });
          console.log(`✅ [Automático] Conta de ${username} convertida para MASTER.`);
      }
  } catch (err) {
      console.error('Falha ao criar o Master User automaticamente:', err);
  }
};

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await seedMasterUser();
});
