import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const registerUser = async (email, password) => {
  if (!email || !password) {
    throw new AuthError(400, 'Email and password are required');
  }

  email = email.trim().toLowerCase();

  if (email.length > 254) {
    throw new AuthError(400, 'Email is too long');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AuthError(400, 'Please provide a valid email address');
  }

  if (password.length < 8) {
    throw new AuthError(400, 'Password must be at least 8 characters long');
  }

  if (password.length > 64) {
    throw new AuthError(400, 'Password must not exceed 64 characters');
  }

  if (password.trim().length === 0) {
    throw new AuthError(400, 'Password cannot contain only whitespace');
  }

  if (!/\d/.test(password)) {
    throw new AuthError(400, 'Password must contain at least one number');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, is_verified)
       VALUES ($1, $2, TRUE)
       RETURNING id, email, created_at`,
      [email, hashedPassword]
    );

    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new AuthError(409, 'Email is already registered');
    }
    throw err;
  }
};

const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new AuthError(400, 'Email and password are required');
  }

  email = email.trim().toLowerCase();

  const result = await pool.query(
    `SELECT id, email, password_hash, is_verified
     FROM users
     WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new AuthError(401, 'Invalid email or password');
  }

  const user = result.rows[0];

  if (!user.is_verified) {
    throw new AuthError(401, 'Please verify your email before logging in.');
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    throw new AuthError(401, 'Invalid email or password');
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
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [user.id, refreshTokenHash]
  );

  return { accessToken, refreshToken };
};

const verifyEmailToken = async (token) => {
  if (!token) {
    throw new AuthError(400, 'Verification token is missing');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const result = await pool.query(
    `SELECT id FROM users 
     WHERE verification_token_hash = $1 
       AND verification_token_expires_at > NOW()`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    throw new AuthError(400, 'Invalid or expired verification token');
  }

  const userId = result.rows[0].id;

  await pool.query(
    `UPDATE users 
     SET is_verified = TRUE, 
         verification_token_hash = NULL, 
         verification_token_expires_at = NULL 
     WHERE id = $1`,
    [userId]
  );
};

const refreshTokens = async (refreshToken) => {
  if (!refreshToken) {
    throw new AuthError(401, 'Refresh token is required');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

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
      throw new AuthError(401, 'Invalid or expired refresh token');
    }

    const storedToken = result.rows[0];

    // Revoke old
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [storedToken.id]
    );

    // Create new
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

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
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [decoded.userId, newRefreshTokenHash]
    );

    return { accessToken, newRefreshToken };

  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      throw new AuthError(401, 'Invalid or expired refresh token');
    }
    throw err;
  }
};

const revokeToken = async (refreshToken) => {
  if (!refreshToken) return;
  
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
    [refreshTokenHash]
  );
};

export {
  AuthError,
  registerUser,
  loginUser,
  verifyEmailToken,
  refreshTokens,
  revokeToken
};
