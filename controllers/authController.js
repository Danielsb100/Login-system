const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const env = require('../config/env');
const { sendVerificationEmail } = require('../services/emailService');
const { sendSuccess, sendError } = require('../utils/http');

const buildPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  profilePicture: user.profilePicture,
  isVerified: user.isVerified
});

const register = async (req, res) => {
  try {
    const username = req.body?.username?.trim();
    const email = req.body?.email?.trim();
    const password = req.body?.password;

    if (!username || !email || !password) {
      return sendError(res, {
        status: 400,
        code: 'AUTH_REGISTER_VALIDATION_ERROR',
        message: 'Username, email and password are required.'
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

    const password_hash = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password_hash,
        verificationCode
      }
    });

    sendVerificationEmail(email, username, verificationCode);

    return sendSuccess(res, {
      status: 201,
      message: 'User registered successfully. Please check your email for the verification code.',
      data: {
        needsVerification: true,
        user: buildPublicUser(newUser)
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

    if (!user.isVerified) {
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

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      env.auth.jwtSecret,
      { expiresIn: env.auth.tokenExpiresIn }
    );

    return sendSuccess(res, {
      message: 'Login successful',
      data: {
        token,
        user: buildPublicUser(user)
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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        profilePicture: true,
        isVerified: true
      }
    });

    if (!user) {
      return sendError(res, {
        status: 404,
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (!user.isVerified) {
      return sendError(res, {
        status: 403,
        code: 'AUTH_ACCOUNT_NOT_VERIFIED',
        message: 'Account not verified'
      });
    }

    return sendSuccess(res, {
      message: 'Token is valid',
      data: { user }
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

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.user.update({
      where: { email },
      data: { verificationCode }
    });

    sendVerificationEmail(email, user.username, verificationCode);

    return sendSuccess(res, {
      message: 'Verification code resent!'
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

module.exports = {
  register,
  login,
  verify,
  verifyEmail,
  resendCode
};
