const prisma = require('../config/db');
const {
  DEFAULT_CONSENT_VERSION,
  PREFERENCE_DEFAULTS,
  PROFILE_DEFAULTS,
  loadUserIdentity,
  loadWorldProfileCard,
  normalizeStringList,
  upsertConsentRecords
} = require('../services/identityService');
const { sendSuccess, sendError } = require('../utils/http');

const PROFILE_STRING_FIELDS = [
  'displayName',
  'headline',
  'bio',
  'timezone',
  'location',
  'organization',
  'course',
  'websiteUrl',
  'linkedinUrl',
  'githubUrl'
];

const PROFILE_LIST_FIELDS = ['interests', 'skills', 'spokenLanguages'];

const PREFERENCE_BOOLEAN_FIELDS = [
  'emailNotifications',
  'marketingEmails',
  'allowProfileDiscovery',
  'showProfileInWorld',
  'allowDirectMessages',
  'reduceMotion',
  'highContrast'
];

const PREFERENCE_STRING_FIELDS = ['language', 'theme'];

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function buildProfileUpdateData(body) {
  const data = {};

  PROFILE_STRING_FIELDS.forEach((field) => {
    const normalized = normalizeOptionalString(body?.[field]);
    if (normalized !== undefined) {
      data[field] = normalized;
    }
  });

  PROFILE_LIST_FIELDS.forEach((field) => {
    if (body && Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = normalizeStringList(body[field]);
    }
  });

  return data;
}

function buildPreferenceUpdateData(body) {
  const data = {};

  PREFERENCE_STRING_FIELDS.forEach((field) => {
    if (body && Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = normalizeOptionalString(body[field]) || PREFERENCE_DEFAULTS[field];
    }
  });

  PREFERENCE_BOOLEAN_FIELDS.forEach((field) => {
    if (body && Object.prototype.hasOwnProperty.call(body, field) && typeof body[field] === 'boolean') {
      data[field] = body[field];
    }
  });

  return data;
}

function buildConsentPayload(consents) {
  if (!consents || typeof consents !== 'object') {
    return {};
  }

  const payload = {};
  Object.entries(consents).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      payload[key] = {
        granted: value,
        version: DEFAULT_CONSENT_VERSION
      };
      return;
    }

    if (value && typeof value === 'object' && typeof value.granted === 'boolean') {
      payload[key] = {
        granted: value.granted,
        version: value.version || DEFAULT_CONSENT_VERSION,
        metadata: value.metadata || null
      };
    }
  });

  return payload;
}

const getMyProfile = async (req, res) => {
  try {
    const identity = await loadUserIdentity(req.user.id);

    if (!identity) {
      return sendError(res, {
        status: 404,
        code: 'PROFILE_NOT_FOUND',
        message: 'User profile not found.'
      });
    }

    return sendSuccess(res, {
      data: identity
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'PROFILE_FETCH_FAILED',
      message: 'Failed to load profile.'
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const data = buildProfileUpdateData(req.body);
    if (Object.keys(data).length === 0) {
      return sendError(res, {
        status: 400,
        code: 'PROFILE_UPDATE_VALIDATION_ERROR',
        message: 'No profile fields were provided.'
      });
    }

    await prisma.userProfile.upsert({
      where: { userId: req.user.id },
      update: data,
      create: {
        userId: req.user.id,
        ...PROFILE_DEFAULTS,
        displayName: req.user.username,
        ...data
      }
    });

    const identity = await loadUserIdentity(req.user.id);
    return sendSuccess(res, {
      message: 'Profile updated successfully.',
      data: identity
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'PROFILE_UPDATE_FAILED',
      message: 'Failed to update profile.'
    });
  }
};

const updateMyPreferences = async (req, res) => {
  try {
    const data = buildPreferenceUpdateData(req.body);
    if (Object.keys(data).length === 0) {
      return sendError(res, {
        status: 400,
        code: 'PREFERENCE_UPDATE_VALIDATION_ERROR',
        message: 'No preference fields were provided.'
      });
    }

    await prisma.userPreference.upsert({
      where: { userId: req.user.id },
      update: data,
      create: {
        userId: req.user.id,
        ...PREFERENCE_DEFAULTS,
        ...data
      }
    });

    const identity = await loadUserIdentity(req.user.id);
    return sendSuccess(res, {
      message: 'Preferences updated successfully.',
      data: identity
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'PREFERENCE_UPDATE_FAILED',
      message: 'Failed to update preferences.'
    });
  }
};

const updateMyConsents = async (req, res) => {
  try {
    const payload = buildConsentPayload(req.body?.consents);
    if (Object.keys(payload).length === 0) {
      return sendError(res, {
        status: 400,
        code: 'CONSENT_UPDATE_VALIDATION_ERROR',
        message: 'No consent updates were provided.'
      });
    }

    const consents = await upsertConsentRecords(req.user.id, payload, 'dashboard');
    const identity = await loadUserIdentity(req.user.id);

    return sendSuccess(res, {
      message: 'Consents updated successfully.',
      data: {
        consents,
        preferences: identity.preferences,
        user: identity.user
      }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'CONSENT_UPDATE_FAILED',
      message: 'Failed to update consents.'
    });
  }
};

const createPortfolioItem = async (req, res) => {
  try {
    const title = normalizeOptionalString(req.body?.title);
    const itemType = normalizeOptionalString(req.body?.itemType) || 'LINK';
    const description = normalizeOptionalString(req.body?.description);
    const url = normalizeOptionalString(req.body?.url);
    const highlight = Boolean(req.body?.highlight);
    const order = Number.isFinite(Number(req.body?.order)) ? Number(req.body.order) : 0;

    if (!title) {
      return sendError(res, {
        status: 400,
        code: 'PORTFOLIO_CREATE_VALIDATION_ERROR',
        message: 'Title is required.'
      });
    }

    const item = await prisma.portfolioItem.create({
      data: {
        userId: req.user.id,
        title,
        description,
        url,
        itemType,
        highlight,
        order
      }
    });

    return sendSuccess(res, {
      status: 201,
      message: 'Portfolio item created successfully.',
      data: { item }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'PORTFOLIO_CREATE_FAILED',
      message: 'Failed to create portfolio item.'
    });
  }
};

const updatePortfolioItem = async (req, res) => {
  try {
    const itemId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(itemId)) {
      return sendError(res, {
        status: 400,
        code: 'PORTFOLIO_UPDATE_VALIDATION_ERROR',
        message: 'Invalid portfolio item id.'
      });
    }

    const existingItem = await prisma.portfolioItem.findFirst({
      where: {
        id: itemId,
        userId: req.user.id
      }
    });

    if (!existingItem) {
      return sendError(res, {
        status: 404,
        code: 'PORTFOLIO_ITEM_NOT_FOUND',
        message: 'Portfolio item not found.'
      });
    }

    const data = {};
    ['title', 'description', 'url', 'itemType'].forEach((field) => {
      const normalized = normalizeOptionalString(req.body?.[field]);
      if (normalized !== undefined) {
        data[field] = normalized;
      }
    });

    if (typeof req.body?.highlight === 'boolean') {
      data.highlight = req.body.highlight;
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'order') && Number.isFinite(Number(req.body.order))) {
      data.order = Number(req.body.order);
    }

    const item = await prisma.portfolioItem.update({
      where: { id: itemId },
      data
    });

    return sendSuccess(res, {
      message: 'Portfolio item updated successfully.',
      data: { item }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'PORTFOLIO_UPDATE_FAILED',
      message: 'Failed to update portfolio item.'
    });
  }
};

const deletePortfolioItem = async (req, res) => {
  try {
    const itemId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(itemId)) {
      return sendError(res, {
        status: 400,
        code: 'PORTFOLIO_DELETE_VALIDATION_ERROR',
        message: 'Invalid portfolio item id.'
      });
    }

    const existingItem = await prisma.portfolioItem.findFirst({
      where: {
        id: itemId,
        userId: req.user.id
      }
    });

    if (!existingItem) {
      return sendError(res, {
        status: 404,
        code: 'PORTFOLIO_ITEM_NOT_FOUND',
        message: 'Portfolio item not found.'
      });
    }

    await prisma.portfolioItem.delete({
      where: { id: itemId }
    });

    return sendSuccess(res, {
      message: 'Portfolio item deleted successfully.'
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'PORTFOLIO_DELETE_FAILED',
      message: 'Failed to delete portfolio item.'
    });
  }
};

const getUserProfileCard = async (req, res) => {
  try {
    const targetUserId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(targetUserId)) {
      return sendError(res, {
        status: 400,
        code: 'PROFILE_CARD_VALIDATION_ERROR',
        message: 'Invalid user id.'
      });
    }

    const profileCard = await loadWorldProfileCard(targetUserId, req.user.id);
    if (!profileCard) {
      return sendError(res, {
        status: 404,
        code: 'PROFILE_CARD_NOT_FOUND',
        message: 'User profile card not found.'
      });
    }

    return sendSuccess(res, {
      data: { profileCard }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'PROFILE_CARD_FETCH_FAILED',
      message: 'Failed to load profile card.'
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  updateMyPreferences,
  updateMyConsents,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  getUserProfileCard
};
