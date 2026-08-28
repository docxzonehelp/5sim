const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

class AuthController {
  async register(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check existing email
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email is already registered' });
      }

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      const newAccountId = Math.floor(1000000 + Math.random() * 9000000).toString();

      const [result] = await pool.query(`
        INSERT INTO users (account_id, email, password_hash, role, balance)
        VALUES (?, ?, ?, 'user', 0.00)
      `, [newAccountId, email.toLowerCase(), hash]);

      const token = jwt.sign(
        { id: result.insertId, email: email.toLowerCase(), role: 'user' },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: result.insertId,
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

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const user = users[0];

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
          account_id: user.account_id,
          email: user.email,
          role: user.role,
          balance: parseFloat(user.balance)
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  }

  async getProfile(req, res) {
    try {
      const [users] = await pool.query('SELECT id, account_id, email, role, balance, created_at FROM users WHERE id = ?', [req.user.id]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = users[0];
      user.balance = parseFloat(user.balance);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  async updatePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Valid old and new password (min 6 chars) required' });
      }

      const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
      const user = users[0];
      
      const isMatch = bcrypt.compareSync(oldPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(newPassword, salt);

      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update password' });
    }
  }

  async setPassword(req, res) {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [req.user.id]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = users[0];

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(newPassword, salt);

      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
      res.json({ message: 'Password set successfully. You can now login with this password.' });
    } catch (error) {
      console.error('Set password error:', error);
      res.status(500).json({ error: 'Failed to set password' });
    }
  }

  async getTradeHistory(req, res) {
    try {
      // Get all deposits for this user
      const [depositRows] = await pool.query(`
        SELECT id, amount as price, type, gateway, status, created_at
        FROM transactions
        WHERE user_id = ? AND type = 'deposit'
        ORDER BY created_at DESC
      `, [req.user.id]);
      
      const deposits = depositRows.map(t => ({
        id: 'T-' + t.id,
        type: 'deposit',
        description: \`Deposit via \${t.gateway}\`,
        amount: '+' + parseFloat(t.price).toFixed(2),
        status: t.status,
        date: t.created_at
      }));

      // Get all orders for this user
      const [orderRows] = await pool.query(`
        SELECT id, product, country, price_user, status, created_at
        FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [req.user.id]);
      
      const orders = orderRows.map(o => ({
        id: 'O-' + o.id,
        type: 'order',
        description: \`Ordered \${o.product.toUpperCase()} (\${o.country.toUpperCase()})\`,
        amount: '-' + parseFloat(o.price_user).toFixed(2),
        status: o.status,
        date: o.created_at
      }));

      // Combine and sort by date descending
      const history = [...deposits, ...orders].sort((a, b) => new Date(b.date) - new Date(a.date));

      res.json({ history });
    } catch (error) {
      console.error('Trade history error:', error);
      res.status(500).json({ error: 'Failed to fetch trade history' });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const [users] = await pool.query('SELECT id, email FROM users WHERE email = ?', [cleanEmail]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'No account found with this email address' });
      }

      // Generate secure 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Expire old codes and insert new one (valid for 15 mins)
      await pool.query(\`UPDATE password_resets SET used = 1 WHERE email = ?\`, [cleanEmail]);
      await pool.query(\`
        INSERT INTO password_resets (email, code, expires_at, used)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0)
      \`, [cleanEmail, code]);

      console.log(\`🔑 [PASSWORD RESET] Email: \${cleanEmail} | OTP Code: \${code}\`);

      // Send the email using Nodemailer
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 465,
          secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: \`"5SIM Reseller" <\${process.env.SMTP_USER}>\`,
          to: cleanEmail,
          subject: "Password Reset Verification Code",
          html: \`<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                  <h2 style="color: #1e293b; text-align: center;">Password Reset Request</h2>
                  <p style="color: #475569; font-size: 16px;">We received a request to reset your password. Here is your 6-digit verification code:</p>
                  <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #3b82f6;">\${code}</span>
                  </div>
                  <p style="color: #475569; font-size: 14px;">This code will expire in 15 minutes. If you did not request a password reset, please ignore this email.</p>
                </div>\`
        });
      } else {
        console.warn('⚠️ SMTP settings not configured. Email was not sent.');
      }

      res.json({
        message: 'Password reset code sent to your email address successfully!',
        email: cleanEmail
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to process forgot password request' });
    }
  }

  async resetPassword(req, res) {
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

      const [resetRecords] = await pool.query(\`
        SELECT * FROM password_resets 
        WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW()
        ORDER BY id DESC LIMIT 1
      \`, [cleanEmail, cleanCode]);

      if (resetRecords.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired reset code. Please request a new code.' });
      }
      const resetRecord = resetRecords[0];

      const [users] = await pool.query('SELECT id, email, role, balance FROM users WHERE email = ?', [cleanEmail]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User account not found' });
      }
      const user = users[0];

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(newPassword, salt);

      const connection = await pool.getConnection();
      await connection.beginTransaction();
      try {
        await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
        await connection.query('UPDATE password_resets SET used = 1 WHERE id = ?', [resetRecord.id]);
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }

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
          balance: parseFloat(user.balance)
        }
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  async googleAuth(req, res) {
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
      const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [userEmail]);
      let user = users.length > 0 ? users[0] : null;

      if (!user) {
        // Auto-register user with random password hash
        const salt = bcrypt.genSaltSync(10);
        const randomPass = Math.random().toString(36).slice(-10) + '!A1';
        const hash = bcrypt.hashSync(randomPass, salt);
        const newAccountId = Math.floor(1000000 + Math.random() * 9000000).toString();

        const [result] = await pool.query(\`
          INSERT INTO users (account_id, email, password_hash, role, balance)
          VALUES (?, ?, ?, 'user', 0.00)
        \`, [newAccountId, userEmail, hash]);

        user = {
          id: result.insertId,
          account_id: newAccountId,
          email: userEmail,
          role: 'user',
          balance: 0.0
        };

        console.log(\`👤 New user registered via Google: \${userEmail}\`);
      } else {
        console.log(\`👤 User logged in via Google: \${userEmail}\`);
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
          balance: parseFloat(user.balance || 0)
        }
      });
    } catch (error) {
      console.error('Google Auth error:', error);
      res.status(500).json({ error: 'Google authentication failed' });
    }
  }
}

module.exports = new AuthController();
