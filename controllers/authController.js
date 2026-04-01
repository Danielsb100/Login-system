const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { sendVerificationEmail } = require('../services/emailService');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password_hash,
        verificationCode
      }
    });

    // Send the email (don't await to avoid slowing down registration response)
    sendVerificationEmail(email, username, verificationCode);

    res.status(201).json({
      message: 'User registered successfully. Please check your email for the verification code.',
      needsVerification: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        profilePicture: newUser.profilePicture,
        isVerified: newUser.isVerified
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if user is verified
    if (!user.isVerified) {
        return res.status(403).json({ 
            error: 'Account not verified. Please check your email.',
            needsVerification: true,
            email: user.email 
        });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
};

const verify = async (req, res) => {
  // If the request reaches here, the authMiddleware has already validated the token
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true, profilePicture: true, isVerified: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Extra check for multiplayer world or other clients
    if (!user.isVerified) {
        return res.status(403).json({ error: 'Account not verified' });
    }

    res.status(200).json({ 
      message: 'Token is valid', 
      user 
    });
  } catch (err) {
    res.status(500).json({ error: 'Error verifying token user' });
  }
};

const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.verificationCode !== code) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Mark as verified and clear the code
        await prisma.user.update({
            where: { email },
            data: { isVerified: true, verificationCode: null }
        });

        res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error during email verification' });
    }
};

const resendCode = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.user.update({
            where: { email },
            data: { verificationCode }
        });

        sendVerificationEmail(email, user.username, verificationCode);
        res.status(200).json({ message: 'Verification code resent!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error resending code' });
    }
};

module.exports = {
  register,
  login,
  verify,
  verifyEmail,
  resendCode
};
