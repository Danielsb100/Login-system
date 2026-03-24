const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    // req.user is set by authMiddleware
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized: No role found' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have the required role' });
    }

    next();
  };
};

module.exports = roleMiddleware;
