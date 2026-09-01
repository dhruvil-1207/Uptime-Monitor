import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import authRateLimiter from '../middleware/rateLimiter.js';
const router = express.Router();

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth'
};


// REGISTER

router.post('/register',authRateLimiter, async (req, res) => {
  let { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      message: 'Email and password are required'
    });
  }


  if (!email) {
    return res.status(400).json({
      message: 'Email is required'
    });
  }
  email = email.trim().toLowerCase();

  if (email.length > 254) {
    return res.status(400).json({
      message: 'Email is too long'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: 'Please provide a valid email address'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long'
    });
  }

  if (password.length > 64) {
    return res.status(400).json({
      message: 'Password must not exceed 64 characters'
    });
  }

  if (password.trim().length === 0) {
    return res.status(400).json({
      message: 'Password cannot contain only whitespace'
    });
  }

  if (!/\d/.test(password)) {
    return res.status(400).json({
      message: 'Password must contain at least one number'
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id, email, created_at`,
      [email, hashedPassword]
    );

    return res.status(201).json({
      message: 'Registration successful',
      user: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        message: 'Email is already registered'
      });
    }

    console.error('Registration error:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
});


// LOGIN

router.post('/login',authRateLimiter, async (req, res) => {
  let { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      message: 'Email and password are required'
    });
  }

  email = email.trim().toLowerCase();

  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required'
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash
             FROM users
             WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await pool.query(
      `INSERT INTO refresh_tokens
             (user_id, token_hash, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshTokenHash]
    );

    res.cookie(
      'refresh_token',
      refreshToken,
      REFRESH_COOKIE_OPTIONS
    );

    return res.status(200).json({
      message: 'Login successful',
      accessToken
    });

  } catch (err) {
    console.error('Login error:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
});



// REFRESH ACCESS TOKEN


router.post('/refresh',authRateLimiter, async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({
      message: 'Refresh token is required'
    });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const result = await pool.query(
      `SELECT id, user_id
             FROM refresh_tokens
             WHERE token_hash = $1
               AND revoked_at IS NULL
               AND expires_at > NOW()`,
      [refreshTokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid or expired refresh token'
      });
    }

    const storedToken = result.rows[0];

    // Revoke old refresh token
    await pool.query(
      `UPDATE refresh_tokens
             SET revoked_at = NOW()
             WHERE id = $1`,
      [storedToken.id]
    );

    // Create new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Rotate refresh token
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    const newRefreshTokenHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    await pool.query(
      `INSERT INTO refresh_tokens
             (user_id, token_hash, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [decoded.userId, newRefreshTokenHash]
    );

    res.cookie(
      'refresh_token',
      newRefreshToken,
      REFRESH_COOKIE_OPTIONS
    );

    return res.status(200).json({
      accessToken
    });

  } catch (err) {
    if (err.name === 'TokenExpiredError' ||
      err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid or expired refresh token'
      });
    }

    console.error('Refresh token error:', err);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
});



// LOGOUT


router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (refreshToken) {
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    try {
      await pool.query(
        `UPDATE refresh_tokens
                 SET revoked_at = NOW()
                 WHERE token_hash = $1`,
        [refreshTokenHash]
      );
    } catch (err) {
      console.error('Logout error:', err);

      return res.status(500).json({
        message: 'Internal server error'
      });
    }
  }

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth'
  });

  return res.status(200).json({
    message: 'Logout successful'
  });
});


export default router;