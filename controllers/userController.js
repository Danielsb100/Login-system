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

module.exports = {
  getAllUsers,
  resetDatabase
};
