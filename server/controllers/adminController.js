const db = require('../config/database');
const fiveSimService = require('../services/fiveSimService');

class AdminController {
  async getStats(req, res) {
    try {
      // 5SIM Master Account Status
      let masterProfile = { balance: 0, rating: 0, email: 'N/A' };
      try {
        masterProfile = await fiveSimService.getProfile();
      } catch (e) {
        console.warn('Could not fetch 5sim master profile:', e.message);
      }

      // Local Stats
      const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
      const activeOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('PENDING', 'RECEIVED')").get().count;
      
      const userBalanceSum = db.prepare('SELECT SUM(balance) as sum FROM users').get().sum || 0;
      
      // Calculate total profit from non-cancelled orders
      const profitRow = db.prepare(`
        SELECT 
          SUM(price_user - cost_fivesim) as total_profit,
          SUM(price_user) as total_sales,
          SUM(cost_fivesim) as total_cost
        FROM orders 
        WHERE status IN ('RECEIVED', 'FINISHED')
      `).get();

      const totalDeposits = db.prepare(`
        SELECT SUM(amount) as sum FROM transactions 
        WHERE type = 'deposit' AND status = 'completed'
      `).get().sum || 0;

      // Recent 10 orders
      const recentOrders = db.prepare(`
        SELECT o.*, u.email as user_email 
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.id DESC
        LIMIT 10
      `).all();

      res.json({
        master: masterProfile,
        metrics: {
          totalUsers,
          totalOrders,
          activeOrders,
          userBalanceSum: Math.round(userBalanceSum * 100) / 100,
          totalProfit: Math.round((profitRow.total_profit || 0) * 100) / 100,
          totalSales: Math.round((profitRow.total_sales || 0) * 100) / 100,
          totalCost: Math.round((profitRow.total_cost || 0) * 100) / 100,
          totalDeposits: Math.round(totalDeposits * 100) / 100
        },
        recentOrders
      });
    } catch (error) {
      console.error('Admin getStats error:', error);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  }

  getUsers(req, res) {
    try {
      const users = db.prepare(`
        SELECT 
          u.id, u.email, u.role, u.balance, u.created_at,
          COUNT(o.id) as order_count,
          COALESCE(SUM(CASE WHEN o.status IN ('RECEIVED', 'FINISHED') THEN o.price_user ELSE 0 END), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        GROUP BY u.id
        ORDER BY u.id DESC
      `).all();

      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  updateUserBalance(req, res) {
    try {
      const { userId, amount, action = 'add', note = '' } = req.body;
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      const user = db.prepare('SELECT id, balance, email FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let newBalance = user.balance;
      let transAmount = numAmount;

      if (action === 'add') {
        newBalance += numAmount;
      } else if (action === 'deduct') {
        newBalance = Math.max(0, newBalance - numAmount);
      } else if (action === 'set') {
        transAmount = Math.abs(numAmount - user.balance);
        newBalance = numAmount;
      }

      newBalance = Math.round(newBalance * 100) / 100;

      db.transaction(() => {
        db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, userId);
        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, status, gateway, details)
          VALUES (?, 'admin_adjustment', ?, 'completed', 'admin', ?)
        `).run(userId, transAmount, `Admin adjustment (${action}): ${note || 'Manual adjustment'}`);
      })();

      res.json({
        message: `Balance updated for ${user.email}`,
        newBalance
      });
    } catch (error) {
      console.error('Update balance error:', error);
      res.status(500).json({ error: 'Failed to update user balance' });
    }
  }

  getAllOrders(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const orders = db.prepare(`
        SELECT o.*, u.email as user_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.id DESC
        LIMIT ?
      `).all(limit);

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch all orders' });
    }
  }

  getAllTransactions(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const transactions = db.prepare(`
        SELECT t.*, u.email as user_email
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.id DESC
        LIMIT ?
      `).all(limit);

      res.json({ transactions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  getSettings(req, res) {
    try {
      const rows = db.prepare('SELECT key, value FROM settings').all();
      const settings = {};
      rows.forEach(r => {
        settings[r.key] = r.value;
      });
      res.json({ settings });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  updateSettings(req, res) {
    try {
      const settings = req.body;
      const upsert = db.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);

      const updateMany = db.transaction((entries) => {
        for (const [key, value] of Object.entries(entries)) {
          upsert.run(key, String(value));
        }
      });

      updateMany(settings);
      res.json({ message: 'Settings saved successfully' });
    } catch (error) {
      console.error('updateSettings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
}

module.exports = new AdminController();
