const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'fivesim_reseller_super_secret_jwt_key_2026_x89a102';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, account_id, email, role, balance, created_at FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional Auth (for public price browsing with optional user context)
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, email, role, balance FROM users WHERE id = ?').get(decoded.id);
      if (user) req.user = user;
    } catch (e) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

module.exports = { authMiddleware, optionalAuthMiddleware, JWT_SECRET };
