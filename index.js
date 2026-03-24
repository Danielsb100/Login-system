require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authController = require('./controllers/authController');
const authenticateToken = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);

// Protected route example / token verification
app.get('/auth/verify', authenticateToken, authController.verify);

// Root endpoint test
app.get('/', (req, res) => {
  res.send('Authentication API is running.');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
