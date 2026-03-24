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

// Document routes
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
