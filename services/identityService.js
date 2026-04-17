const prisma = require('../config/db');

const DEFAULT_CONSENT_VERSION = '2026-04-identity-v1';

const LEGACY_ROLE_TO_ASSIGNED_ROLES = Object.freeze({
  USER: ['STUDENT'],
  ADMIN: ['ADMIN'],
  MASTER: ['TEACHER']
});

const ASSIGNED_ROLE_PRIORITY = Object.freeze([
  'SUPER_ADMIN',
  'ADMIN',
  'COORDINATOR',
  'TEACHER',
  'BUSINESS_MENTOR',
  'TUTOR',
  'STUDENT',
  'GUEST'
]);

const CONSENT_KEY_TO_KIND = Object.freeze({
  termsAndPrivacy: 'TERMS_AND_PRIVACY',
  marketingEmails: 'MARKETING_EMAILS',
  profileDiscovery: 'PROFILE_DISCOVERY',
  worldProfileCard: 'WORLD_PROFILE_CARD'
});

const IDENTITY_USER_INCLUDE = Object.freeze({
  profile: true,
  preferences: true,
  roleAssignments: {
    where: { active: true },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }]
  },
  consentRecords: {
    orderBy: { createdAt: 'desc' }
  },
  portfolioItems: {
    orderBy: [{ highlight: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }]
  }
});

const PROFILE_DEFAULTS = Object.freeze({
  displayName: null,
  headline: '',
  bio: '',
  interests: [],
  skills: [],
  spokenLanguages: [],
  timezone: '',
  location: '',
  organization: '',
  course: '',
  websiteUrl: '',
  linkedinUrl: '',
  githubUrl: ''
});

const PREFERENCE_DEFAULTS = Object.freeze({
  language: 'pt-BR',
  theme: 'system',
  emailNotifications: true,
  marketingEmails: false,
  allowProfileDiscovery: true,
  showProfileInWorld: true,
  allowDirectMessages: true,
  reduceMotion: false,
  highContrast: false
});

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))];
  }

  if (typeof value === 'string') {
    return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))];
  }

  return [];
}

function sortAssignedRoles(roles) {
  return [...new Set(roles)].sort((left, right) => {
    const leftIndex = ASSIGNED_ROLE_PRIORITY.indexOf(left);
    const rightIndex = ASSIGNED_ROLE_PRIORITY.indexOf(right);
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
}

function deriveAssignedRolesFromLegacyRole(legacyRole) {
  return LEGACY_ROLE_TO_ASSIGNED_ROLES[legacyRole] || ['STUDENT'];
}

function inferLegacyRoleFromAssignedRoles(roles) {
  const set = new Set(roles);

  if (set.has('SUPER_ADMIN') || set.has('ADMIN')) {
    return 'ADMIN';
  }

  if (set.has('TEACHER') || set.has('COORDINATOR')) {
    return 'MASTER';
  }

  return 'USER';
}

function getAssignedRoles(user) {
  const assignedRoles = (user.roleAssignments || [])
    .filter((assignment) => assignment.active !== false)
    .map((assignment) => assignment.role);

  if (assignedRoles.length > 0) {
    return sortAssignedRoles(assignedRoles);
  }

  return deriveAssignedRolesFromLegacyRole(user.role);
}

function getPrimaryAssignedRole(user) {
  const explicitPrimary = (user.roleAssignments || []).find(
    (assignment) => assignment.active !== false && assignment.isPrimary
  );

  if (explicitPrimary) {
    return explicitPrimary.role;
  }

  return getAssignedRoles(user)[0];
}

function buildConsentState(consentRecords = []) {
  const state = {};

  consentRecords.forEach((record) => {
    const key = Object.entries(CONSENT_KEY_TO_KIND).find(([, kind]) => kind === record.kind)?.[0];
    if (!key || state[key]) {
      return;
    }

    state[key] = {
      granted: Boolean(record.granted),
      version: record.version,
      source: record.source,
      recordedAt: record.createdAt
    };
  });

  return {
    termsAndPrivacy: state.termsAndPrivacy || null,
    marketingEmails: state.marketingEmails || null,
    profileDiscovery: state.profileDiscovery || null,
    worldProfileCard: state.worldProfileCard || null
  };
}

function buildProfileSnapshot(profile, fallbackDisplayName) {
  return {
    ...PROFILE_DEFAULTS,
    ...(profile || {}),
    displayName: profile?.displayName || fallbackDisplayName
  };
}

function buildPreferenceSnapshot(preferences) {
  return {
    ...PREFERENCE_DEFAULTS,
    ...(preferences || {})
  };
}

function buildPublicUser(user) {
  const roles = getAssignedRoles(user);
  const primaryRole = getPrimaryAssignedRole(user);
  const profile = buildProfileSnapshot(user.profile, user.username);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    legacyRole: user.role,
    primaryRole,
    roles,
    profilePicture: user.profilePicture,
    isVerified: user.isVerified,
    displayName: profile.displayName,
    headline: profile.headline || null
  };
}

function buildSelfProfilePayload(user) {
  return {
    user: buildPublicUser(user),
    profile: buildProfileSnapshot(user.profile, user.username),
    preferences: buildPreferenceSnapshot(user.preferences),
    consents: buildConsentState(user.consentRecords),
    portfolio: (user.portfolioItems || []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      url: item.url,
      itemType: item.itemType,
      highlight: item.highlight,
      order: item.order,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }))
  };
}

function buildWorldProfileCard(user, viewerUserId) {
  const profile = buildProfileSnapshot(user.profile, user.username);
  const preferences = buildPreferenceSnapshot(user.preferences);
  const isSelf = user.id === viewerUserId;
  const isVisible = isSelf || (preferences.allowProfileDiscovery && preferences.showProfileInWorld);

  const baseCard = {
    id: user.id,
    username: user.username,
    displayName: profile.displayName,
    profilePicture: user.profilePicture,
    primaryRole: getPrimaryAssignedRole(user),
    roles: getAssignedRoles(user),
    headline: profile.headline || null,
    isSelf,
    isVisible
  };

  if (!isVisible) {
    return {
      ...baseCard,
      bio: '',
      interests: [],
      organization: '',
      course: '',
      location: '',
      links: {},
      portfolio: [],
      message: 'Este perfil prefere não exibir detalhes no mundo 3D.'
    };
  }

  return {
    ...baseCard,
    bio: profile.bio,
    interests: profile.interests,
    organization: profile.organization,
    course: profile.course,
    location: profile.location,
    links: {
      websiteUrl: profile.websiteUrl,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl
    },
    portfolio: (user.portfolioItems || []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      url: item.url,
      itemType: item.itemType,
      highlight: item.highlight
    }))
  };
}

async function ensureUserIdentity(userId, prismaClient = prisma) {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      preferences: true,
      roleAssignments: true
    }
  });

  if (!user) {
    return null;
  }

  await prismaClient.userProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      displayName: user.username
    }
  });

  await prismaClient.userPreference.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });

  const fallbackRoles = deriveAssignedRolesFromLegacyRole(user.role);
  const existingAssignments = user.roleAssignments || [];

  if (fallbackRoles.length > 0) {
    await prismaClient.userRoleAssignment.createMany({
      data: fallbackRoles.map((role, index) => ({
        userId,
        role,
        active: true,
        isPrimary: index === 0
      })),
      skipDuplicates: true
    });

    await prismaClient.userRoleAssignment.updateMany({
      where: {
        userId,
        role: { in: fallbackRoles },
        active: false
      },
      data: { active: true }
    });
  }

  const refreshedAssignments = await prismaClient.userRoleAssignment.findMany({
    where: { userId, active: true },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }]
  });

  if (refreshedAssignments.length > 0) {
    const primaryAssignments = refreshedAssignments.filter((assignment) => assignment.isPrimary);

    if (primaryAssignments.length !== 1) {
      await prismaClient.userRoleAssignment.updateMany({
        where: { userId, active: true },
        data: { isPrimary: false }
      });

      await prismaClient.userRoleAssignment.update({
        where: { id: refreshedAssignments[0].id },
        data: { isPrimary: true }
      });
    }
  } else if (existingAssignments.length === 0) {
    await prismaClient.userRoleAssignment.create({
      data: {
        userId,
        role: 'STUDENT',
        active: true,
        isPrimary: true
      }
    });
  }

  return prismaClient.user.findUnique({
    where: { id: userId },
    include: IDENTITY_USER_INCLUDE
  });
}

async function backfillAllUserIdentities(prismaClient = prisma) {
  const users = await prismaClient.user.findMany({
    select: { id: true }
  });

  for (const user of users) {
    await ensureUserIdentity(user.id, prismaClient);
  }
}

async function loadUserIdentity(userId, prismaClient = prisma) {
  const user = await ensureUserIdentity(userId, prismaClient);
  return user ? buildSelfProfilePayload(user) : null;
}

async function loadWorldProfileCard(targetUserId, viewerUserId, prismaClient = prisma) {
  const user = await prismaClient.user.findUnique({
    where: { id: targetUserId },
    include: IDENTITY_USER_INCLUDE
  });

  if (!user) {
    return null;
  }

  return buildWorldProfileCard(user, viewerUserId);
}

async function upsertConsentRecords(userId, consentInput, source = 'dashboard', prismaClient = prisma) {
  const entries = Object.entries(consentInput || {})
    .filter(([key, value]) => key in CONSENT_KEY_TO_KIND && typeof value?.granted === 'boolean')
    .map(([key, value]) => ({
      userId,
      kind: CONSENT_KEY_TO_KIND[key],
      granted: value.granted,
      version: value.version || DEFAULT_CONSENT_VERSION,
      source,
      metadata: value.metadata || null
    }));

  if (entries.length === 0) {
    return buildConsentState([]);
  }

  await prismaClient.consentRecord.createMany({
    data: entries
  });

  const preferencePatch = {};
  entries.forEach((entry) => {
    if (entry.kind === 'MARKETING_EMAILS') {
      preferencePatch.marketingEmails = entry.granted;
    }
    if (entry.kind === 'PROFILE_DISCOVERY') {
      preferencePatch.allowProfileDiscovery = entry.granted;
    }
    if (entry.kind === 'WORLD_PROFILE_CARD') {
      preferencePatch.showProfileInWorld = entry.granted;
    }
  });

  if (Object.keys(preferencePatch).length > 0) {
    await prismaClient.userPreference.upsert({
      where: { userId },
      update: preferencePatch,
      create: {
        userId,
        ...preferencePatch
      }
    });
  }

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    include: {
      consentRecords: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  return buildConsentState(user?.consentRecords || []);
}

async function setUserAssignedRoles(userId, roles, prismaClient = prisma) {
  const normalizedRoles = sortAssignedRoles(
    Array.isArray(roles) ? roles.map((role) => String(role).trim()).filter(Boolean) : []
  );

  if (normalizedRoles.length === 0) {
    throw new Error('At least one assigned role is required.');
  }

  const existingAssignments = await prismaClient.userRoleAssignment.findMany({
    where: { userId }
  });

  for (const role of normalizedRoles) {
    const existing = existingAssignments.find((assignment) => assignment.role === role);
    if (existing) {
      await prismaClient.userRoleAssignment.update({
        where: { id: existing.id },
        data: { active: true }
      });
    } else {
      await prismaClient.userRoleAssignment.create({
        data: {
          userId,
          role,
          active: true
        }
      });
    }
  }

  await prismaClient.userRoleAssignment.updateMany({
    where: {
      userId,
      role: {
        notIn: normalizedRoles
      }
    },
    data: {
      active: false,
      isPrimary: false
    }
  });

  await prismaClient.userRoleAssignment.updateMany({
    where: { userId, active: true },
    data: { isPrimary: false }
  });

  const primaryAssignment = await prismaClient.userRoleAssignment.findFirst({
    where: {
      userId,
      role: normalizedRoles[0]
    }
  });

  if (primaryAssignment) {
    await prismaClient.userRoleAssignment.update({
      where: { id: primaryAssignment.id },
      data: { isPrimary: true }
    });
  }

  await prismaClient.user.update({
    where: { id: userId },
    data: {
      role: inferLegacyRoleFromAssignedRoles(normalizedRoles)
    }
  });

  return ensureUserIdentity(userId, prismaClient);
}

module.exports = {
  CONSENT_KEY_TO_KIND,
  DEFAULT_CONSENT_VERSION,
  IDENTITY_USER_INCLUDE,
  PREFERENCE_DEFAULTS,
  PROFILE_DEFAULTS,
  buildConsentState,
  buildPublicUser,
  buildSelfProfilePayload,
  buildWorldProfileCard,
  deriveAssignedRolesFromLegacyRole,
  ensureUserIdentity,
  backfillAllUserIdentities,
  getAssignedRoles,
  getPrimaryAssignedRole,
  inferLegacyRoleFromAssignedRoles,
  loadUserIdentity,
  loadWorldProfileCard,
  normalizeStringList,
  setUserAssignedRoles,
  upsertConsentRecords
};
