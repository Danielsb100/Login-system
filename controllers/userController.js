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

const searchUsers = async (req, res) => {
  try {
    const query = String(req.query?.q || '').trim();
    const limit = Math.min(Math.max(Number.parseInt(req.query?.limit, 10) || 10, 1), 25);

    if (!query || query.length < 2) {
      return sendSuccess(res, { data: { users: [] } });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        profile: true,
        roleAssignments: {
          where: { active: true },
          orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }]
        }
      },
      orderBy: [{ username: 'asc' }],
      take: limit
    });

    return sendSuccess(res, {
      data: {
        users: users.map((user) => buildPublicUser(user))
      }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'USER_SEARCH_FAILED',
      message: 'Failed to search users.'
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
    // Since we are running on an ephemeral filesystem (like Railway/Heroku), 
    // saving images to disk means they will be deleted on every new deploy.
    // To fix this, we read the temp file, convert it to Base64, and save it directly in the database!
    let fileBuffer;
    if (req.file.path) {
      fileBuffer = fs.readFileSync(req.file.path);
      try {
        fs.unlinkSync(req.file.path); // Limpa o arquivo temporário
      } catch (e) {
        console.warn('Failed to cleanup temp file:', e);
      }
    } else if (req.file.buffer) {
      fileBuffer = req.file.buffer;
    } else {
      throw new Error('File data is missing from upload request.');
    }

    const base64Data = fileBuffer.toString('base64');
    // The cropper always sends a PNG blob
    const fileUrl = `data:image/png;base64,${base64Data}`;

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
  searchUsers,
  updateUserRoles,
  resetDatabase,
  deleteUser,
  uploadProfilePicture
};
