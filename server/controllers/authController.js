const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

class AuthController {
  register(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check existing email
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: 'Email is already registered' });
      }

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);

      const result = db.prepare(`
        INSERT INTO users (email, password_hash, role, balance)
        VALUES (?, ?, 'user', 0.0)
      `).run(email.toLowerCase(), hash);

      const token = jwt.sign(
        { id: result.lastInsertRowid, email: email.toLowerCase(), role: 'user' },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: result.lastInsertRowid,
          email: email.toLowerCase(),
          role: 'user',
          balance: 0.0
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error during registration' });
    }
  }

  login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          balance: user.balance
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  }

  getProfile(req, res) {
    try {
      const user = db.prepare('SELECT id, email, role, balance, created_at FROM users WHERE id = ?').get(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  updatePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Valid old and new password (min 6 chars) required' });
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      const isMatch = bcrypt.compareSync(oldPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(newPassword, salt);

      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update password' });
    }
  }

  forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(cleanEmail);
      if (!user) {
        return res.status(404).json({ error: 'No account found with this email address' });
      }

      // Generate secure 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Expire old codes and insert new one (valid for 15 mins)
      db.prepare(`UPDATE password_resets SET used = 1 WHERE email = ?`).run(cleanEmail);
      db.prepare(`
        INSERT INTO password_resets (email, code, expires_at, used)
        VALUES (?, ?, datetime('now', '+15 minutes'), 0)
      `).run(cleanEmail, code);

      console.log(`🔑 [PASSWORD RESET] Email: ${cleanEmail} | OTP Code: ${code}`);

      res.json({
        message: 'Password reset code generated successfully! Enter the code below to set your new password.',
        email: cleanEmail,
        code: code // For easy self-service & demonstration
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to process forgot password request' });
    }
  }

  resetPassword(req, res) {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Email, reset code, and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const cleanCode = code.toString().trim();

      const resetRecord = db.prepare(`
        SELECT * FROM password_resets 
        WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
        ORDER BY id DESC LIMIT 1
      `).get(cleanEmail, cleanCode);

      if (!resetRecord) {
        return res.status(400).json({ error: 'Invalid or expired reset code. Please request a new code.' });
      }

      const user = db.prepare('SELECT id, email, role, balance FROM users WHERE email = ?').get(cleanEmail);
      if (!user) {
        return res.status(404).json({ error: 'User account not found' });
      }

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(newPassword, salt);

      db.transaction(() => {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
        db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);
      })();

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        message: 'Password has been reset successfully! You are now logged in.',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          balance: user.balance
        }
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  googleAuth(req, res) {
    try {
      const { credential, email, name } = req.body;

      let userEmail = (email || '').toLowerCase().trim();

      // If a Google JWT ID Token is passed, decode payload
      if (credential) {
        try {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload.email) {
              userEmail = payload.email.toLowerCase().trim();
            }
          }
        } catch (e) {
          console.error('Failed to parse Google ID Token:', e);
        }
      }

      if (!userEmail || !userEmail.includes('@')) {
        return res.status(400).json({ error: 'Valid Google email is required' });
      }

      // Check if user already exists
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(userEmail);

      if (!user) {
        // Auto-register user with random password hash
        const salt = bcrypt.genSaltSync(10);
        const randomPass = Math.random().toString(36).slice(-10) + '!A1';
        const hash = bcrypt.hashSync(randomPass, salt);

        const result = db.prepare(`
          INSERT INTO users (email, password_hash, role, balance)
          VALUES (?, ?, 'user', 0.0)
        `).run(userEmail, hash);

        user = {
          id: result.lastInsertRowid,
          email: userEmail,
          role: 'user',
          balance: 0.0
        };

        console.log(`👤 New user registered via Google: ${userEmail}`);
      } else {
        console.log(`👤 User logged in via Google: ${userEmail}`);
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        message: 'Google Sign-In successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          balance: user.balance
        }
      });
    } catch (error) {
      console.error('Google Auth error:', error);
      res.status(500).json({ error: 'Google authentication failed' });
    }
  }
}

module.exports = new AuthController();
