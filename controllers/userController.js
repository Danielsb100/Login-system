const prisma = require('../config/db');

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

const resetDatabase = async (req, res) => {
  try {
    // Exclui todos do banco de dados, MENOS o MASTER que chamou a função!
    await prisma.user.deleteMany({
      where: {
        id: { not: req.user.id }
      }
    });
    res.status(200).json({ message: 'Todos os usuários comuns foram limpos do banco!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao tentar resetar os usuários.' });
  }
};

const fs = require('fs');
const path = require('path');

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });

    const user = req.user;
    const fileExt = path.extname(req.file.originalname) || '.png';
    const filename = `profile_${user.id}_${Date.now()}${fileExt}`;
    const uploadDir = path.join(__dirname, '../public/uploads/profiles');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    const fileUrl = `/uploads/profiles/${filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { profilePicture: fileUrl }
    });

    res.status(200).json({ message: 'Foto de perfil atualizada!', url: fileUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao salvar a foto de perfil.' });
  }
};

module.exports = {
  getAllUsers,
  resetDatabase,
  uploadProfilePicture
};
