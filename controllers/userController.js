const fs = require('fs');
const path = require('path');

const prisma = require('../config/db');
const { buildPublicUser, ensureUserIdentity, setUserAssignedRoles } = require('../services/identityService');
const { sendSuccess, sendError } = require('../utils/http');

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        roleAssignments: {
          where: { active: true },
          orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }]
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return sendSuccess(res, {
      data: {
        users: users.map((user) => ({
          ...buildPublicUser(user),
          createdAt: user.createdAt
        }))
      }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'USER_FETCH_FAILED',
      message: 'Failed to fetch users.'
    });
  }
};

const updateUserRoles = async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const roles = Array.isArray(req.body?.roles) ? req.body.roles : [];

    if (!Number.isFinite(userId) || roles.length === 0) {
      return sendError(res, {
        status: 400,
        code: 'USER_ROLE_UPDATE_VALIDATION_ERROR',
        message: 'User id and at least one assigned role are required.'
      });
    }

    const updatedUser = await setUserAssignedRoles(userId, roles);
    return sendSuccess(res, {
      message: 'User roles updated successfully.',
      data: {
        user: buildPublicUser(updatedUser)
      }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'USER_ROLE_UPDATE_FAILED',
      message: error.message || 'Failed to update user roles.'
    });
  }
};

const resetDatabase = async (req, res) => {
  try {
    await prisma.user.deleteMany({
      where: {
        id: { not: req.user.id }
      }
    });

    return sendSuccess(res, {
      message: 'Todos os usuários comuns foram limpos do banco!'
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'USER_RESET_FAILED',
      message: 'Falha ao tentar resetar os usuários.'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(userId)) {
      return sendError(res, {
        status: 400,
        code: 'USER_DELETE_VALIDATION_ERROR',
        message: 'Invalid user id.'
      });
    }

    if (userId === req.user.id) {
      return sendError(res, {
        status: 400,
        code: 'USER_DELETE_SELF_FORBIDDEN',
        message: 'Você não pode excluir a si mesmo.'
      });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return sendSuccess(res, {
      message: 'Usuário deletado com sucesso!'
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'USER_DELETE_FAILED',
      message: 'Falha ao tentar deletar o usuário.'
    });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, {
        status: 400,
        code: 'PROFILE_PICTURE_MISSING',
        message: 'Nenhuma imagem enviada.'
      });
    }

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

    await prisma.user.update({
      where: { id: user.id },
      data: { profilePicture: fileUrl }
    });

    const updatedUser = await ensureUserIdentity(user.id);

    return sendSuccess(res, {
      message: 'Foto de perfil atualizada!',
      data: {
        url: fileUrl,
        user: buildPublicUser(updatedUser)
      }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'PROFILE_PICTURE_UPLOAD_FAILED',
      message: 'Falha ao salvar a foto de perfil.'
    });
  }
};

module.exports = {
  getAllUsers,
  updateUserRoles,
  resetDatabase,
  deleteUser,
  uploadProfilePicture
};
