const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const prisma = require('../config/db');
const env = require('../config/env');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../services/emailService');
const {
  DEFAULT_CONSENT_VERSION,
  IDENTITY_USER_INCLUDE,
  buildPublicUser,
  ensureUserIdentity,
  upsertConsentRecords
} = require('../services/identityService');
const { sendSuccess, sendError } = require('../utils/http');

const MIN_PASSWORD_LENGTH = 6;

function isEmailVerificationRequired() {
  return env.auth.requireEmailVerification;
}

function buildResetBaseUrl(req) {
  const configuredUrl = env.public.loginUrl?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  return `${req.protocol}://${req.get('host')}`;
}

function buildPasswordResetUrl(req, token, email) {
  const baseUrl = buildResetBaseUrl(req);
  return `${baseUrl}/index.html?resetToken=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

function buildPasswordResetTokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildRegisterConsentPayload(consents) {
  if (!consents || typeof consents !== 'object') {
    return null;
  }

  const payload = {};

  if (typeof consents.termsAndPrivacy === 'boolean') {
    payload.termsAndPrivacy = {
      granted: consents.termsAndPrivacy,
      version: consents.termsVersion || DEFAULT_CONSENT_VERSION
    };
  }

  if (typeof consents.marketingEmails === 'boolean') {
    payload.marketingEmails = {
      granted: consents.marketingEmails,
      version: consents.marketingVersion || DEFAULT_CONSENT_VERSION
    };
  }

  if (typeof consents.profileDiscovery === 'boolean') {
    payload.profileDiscovery = {
      granted: consents.profileDiscovery,
      version: consents.profileVersion || DEFAULT_CONSENT_VERSION
    };
  }

  if (typeof consents.worldProfileCard === 'boolean') {
    payload.worldProfileCard = {
      granted: consents.worldProfileCard,
      version: consents.worldProfileVersion || DEFAULT_CONSENT_VERSION
    };
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

const register = async (req, res) => {
  try {
    const username = req.body?.username?.trim();
    const email = req.body?.email?.trim();
    const password = req.body?.password;
    const consentPayload = buildRegisterConsentPayload(req.body?.consents);

    if (!username || !email || !password) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_REGISTER_VALIDATION_ERROR',
        message: 'Username, email and password are required.'
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_REGISTER_PASSWORD_TOO_SHORT',
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_IDENTIFIER_CONFLICT',
        message: 'Username or email already exists.'
      });
    }

    const shouldRequireEmailVerification = isEmailVerificationRequired();
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const passwordHash = await bcrypt.hash(password, 10);

    const createdUser = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          password_hash: passwordHash,
          verificationCode
        }
      });

      await ensureUserIdentity(newUser.id, tx);

      if (consentPayload) {
        await upsertConsentRecords(newUser.id, consentPayload, 'register', tx);
      }

      return tx.user.findUnique({
        where: { id: newUser.id },
        include: IDENTITY_USER_INCLUDE
      });
    });

    if (shouldRequireEmailVerification) {
      await sendVerificationEmail(email, username, verificationCode);
    }

    return sendSuccess(res, {
      status: 201,
      message: shouldRequireEmailVerification
        ? 'User registered successfully. Please check your email for the verification code.'
        : 'User registered successfully. Email verification is temporarily disabled. You can log in now.',
      data: {
        needsVerification: shouldRequireEmailVerification,
        user: buildPublicUser(createdUser),
        ...(shouldRequireEmailVerification && env.nodeEnv !== 'production' && !env.mail.enabled
          ? { debugVerificationCode: verificationCode }
          : {})
      }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'AUTH_REGISTER_FAILED',
      message: 'Internal server error during registration.'
    });
  }
};

const login = async (req, res) => {
  try {
    const email = req.body?.email?.trim();
    const password = req.body?.password;

    if (!email || !password) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_LOGIN_VALIDATION_ERROR',
        message: 'Email and password are required.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return sendError(res, {
        status: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return sendError(res, {
        status: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    if (isEmailVerificationRequired() && !user.isVerified) {
      return sendError(res, {
        status: 403,
        code: 'AUTH_ACCOUNT_NOT_VERIFIED',
        message: 'Account not verified. Please check your email.',
        extra: {
          needsVerification: true,
          email: user.email
        }
      });
    }

    const fullUser = await ensureUserIdentity(user.id);
    const publicUser = buildPublicUser(fullUser);
    const token = jwt.sign(
      {
        id: fullUser.id,
        username: fullUser.username,
        email: fullUser.email,
        role: fullUser.role,
        legacyRole: fullUser.role,
        roles: publicUser.roles,
        primaryRole: publicUser.primaryRole
      },
      env.auth.jwtSecret,
      { expiresIn: env.auth.tokenExpiresIn }
    );

    return sendSuccess(res, {
      message: 'Login successful',
      data: {
        token,
        user: publicUser
      }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'AUTH_LOGIN_FAILED',
      message: 'Internal server error during login.'
    });
  }
};

const verify = async (req, res) => {
  try {
    const user = await ensureUserIdentity(req.user.id);

    if (!user) {
      return sendError(res, {
        status: 404,
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (isEmailVerificationRequired() && !user.isVerified) {
      return sendError(res, {
        status: 403,
        code: 'AUTH_ACCOUNT_NOT_VERIFIED',
        message: 'Account not verified'
      });
    }

    return sendSuccess(res, {
      message: 'Token is valid',
      data: { user: buildPublicUser(user) }
    });
  } catch (err) {
    console.error(err);
    return sendError(res, {
      status: 500,
      code: 'AUTH_VERIFY_FAILED',
      message: 'Error verifying token user'
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const email = req.body?.email?.trim();
    const code = req.body?.code?.trim();

    if (!email || !code) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_VERIFY_EMAIL_VALIDATION_ERROR',
        message: 'Email and code are required'
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, {
        status: 404,
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (user.verificationCode !== code) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_INVALID_VERIFICATION_CODE',
        message: 'Invalid verification code'
      });
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true, verificationCode: null }
    });

    return sendSuccess(res, {
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (err) {
    console.error(err);
    return sendError(res, {
      status: 500,
      code: 'AUTH_VERIFY_EMAIL_FAILED',
      message: 'Error during email verification'
    });
  }
};

const resendCode = async (req, res) => {
  try {
    const email = req.body?.email?.trim();

    if (!email) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_RESEND_CODE_VALIDATION_ERROR',
        message: 'Email is required'
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, {
        status: 404,
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return sendError(res, {
        status: 409,
        code: 'AUTH_ACCOUNT_ALREADY_VERIFIED',
        message: 'Account is already verified.'
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.user.update({
      where: { email },
      data: { verificationCode }
    });

    await sendVerificationEmail(email, user.username, verificationCode);

    return sendSuccess(res, {
      message: 'Verification code resent!',
      data:
        env.nodeEnv !== 'production' && !env.mail.enabled
          ? { debugVerificationCode: verificationCode }
          : undefined
    });
  } catch (err) {
    console.error(err);
    return sendError(res, {
      status: 500,
      code: 'AUTH_RESEND_CODE_FAILED',
      message: 'Error resending code'
    });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const email = req.body?.email?.trim();

    if (!email) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_PASSWORD_RESET_REQUEST_VALIDATION_ERROR',
        message: 'Email is required.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return sendSuccess(res, {
        message: 'If the email exists, password reset instructions have been sent.'
      });
    }

    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = buildPasswordResetTokenHash(plainToken);
    const expiresAt = new Date(Date.now() + env.auth.passwordResetTokenTtlMinutes * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: { userId: user.id }
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      });
    });

    const resetUrl = buildPasswordResetUrl(req, plainToken, user.email);
    const emailSent = await sendPasswordResetEmail(user.email, user.username, resetUrl);

    return sendSuccess(res, {
      message: 'If the email exists, password reset instructions have been sent.',
      data:
        env.nodeEnv !== 'production' && !emailSent
          ? {
              debugResetToken: plainToken,
              debugResetUrl: resetUrl,
              expiresAt
            }
          : undefined
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'AUTH_PASSWORD_RESET_REQUEST_FAILED',
      message: 'Error requesting password reset.'
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = req.body?.token?.trim();
    const password = req.body?.password;

    if (!token || !password) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_PASSWORD_RESET_VALIDATION_ERROR',
        message: 'Token and new password are required.'
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_PASSWORD_RESET_PASSWORD_TOO_SHORT',
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
      });
    }

    const tokenHash = buildPasswordResetTokenHash(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: true
      }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
        message: 'Password reset token is invalid or expired.'
      });
    }

    const newPasswordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { password_hash: newPasswordHash }
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null
        },
        data: {
          usedAt: new Date()
        }
      });
    });

    return sendSuccess(res, {
      message: 'Password updated successfully. You can now log in.'
    });
  } catch (error) {
    console.error(error);
    return sendError(res, {
      status: 500,
      code: 'AUTH_PASSWORD_RESET_FAILED',
      message: 'Error resetting password.'
    });
  }
};

module.exports = {
  register,
  login,
  verify,
  verifyEmail,
  resendCode,
  requestPasswordReset,
  resetPassword
};
