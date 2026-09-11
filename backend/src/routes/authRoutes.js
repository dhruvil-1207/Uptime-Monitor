import express from 'express';
import authRateLimiter from '../middleware/rateLimiter.js';
import {
  register,
  login,
  verifyEmail,
  refresh,
  logout
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/verify-email', verifyEmail);
router.post('/refresh', authRateLimiter, refresh);
router.post('/logout', logout);

export default router;