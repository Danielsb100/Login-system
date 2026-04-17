const { sendError } = require('../utils/http');

const LEGACY_ROLE_COMPATIBILITY = Object.freeze({
  USER: ['USER', 'STUDENT', 'TUTOR', 'BUSINESS_MENTOR', 'GUEST'],
  MASTER: ['MASTER', 'TEACHER', 'COORDINATOR', 'SUPER_ADMIN'],
  ADMIN: ['ADMIN', 'SUPER_ADMIN']
});

function expandAllowedRoles(allowedRoles) {
  return [...new Set(
    allowedRoles.flatMap((role) => LEGACY_ROLE_COMPATIBILITY[role] || [role])
  )];
}

function getEffectiveUserRoles(user) {
  const roles = new Set();

  if (Array.isArray(user?.roles)) {
    user.roles.forEach((role) => roles.add(role));
  }

  if (user?.primaryRole) {
    roles.add(user.primaryRole);
  }

  if (user?.legacyRole) {
    roles.add(user.legacyRole);
  }

  if (user?.role) {
    roles.add(user.role);
  }

  return roles;
}

const roleMiddleware = (allowedRoles) => {
  const expandedAllowedRoles = expandAllowedRoles(allowedRoles);

  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        status: 401,
        code: 'AUTH_ROLE_UNAUTHORIZED',
        message: 'Unauthorized: no authenticated user found.'
      });
    }

    const userRoles = getEffectiveUserRoles(req.user);
    const hasRequiredRole = expandedAllowedRoles.some((role) => userRoles.has(role));

    if (!hasRequiredRole) {
      return sendError(res, {
        status: 403,
        code: 'AUTH_ROLE_FORBIDDEN',
        message: 'Forbidden: you do not have the required role.'
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
