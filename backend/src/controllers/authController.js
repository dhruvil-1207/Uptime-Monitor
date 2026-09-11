import {
  AuthError,
  registerUser,
  loginUser,
  verifyEmailToken,
  refreshTokens,
  revokeToken
} from '../services/authService.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth'
};

const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await registerUser(email, password);
    
    return res.status(201).json({
      message: 'Registration successful.',
      user
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken } = await loginUser(email, password);

    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      message: 'Login successful',
      accessToken
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token;
    await verifyEmailToken(token);
    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Verify email error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const refresh = async (req, res) => {
  try {
    const token = req.cookies.refresh_token;
    const { accessToken, newRefreshToken } = await refreshTokens(token);

    res.cookie('refresh_token', newRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({ accessToken });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Refresh token error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.cookies.refresh_token;
    await revokeToken(token);

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/auth'
    });

    return res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export {
  register,
  login,
  verifyEmail,
  refresh,
  logout
};
