const pool = require('../config/database');
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
      const [userCountRows] = await pool.query('SELECT COUNT(*) as count FROM users');
      const totalUsers = userCountRows[0].count;

      const [orderCountRows] = await pool.query('SELECT COUNT(*) as count FROM orders');
      const totalOrders = orderCountRows[0].count;

      const [activeOrderRows] = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status IN ('PENDING', 'RECEIVED')");
      const activeOrders = activeOrderRows[0].count;
      
      const [balanceRows] = await pool.query('SELECT SUM(balance) as sum FROM users');
      const userBalanceSum = balanceRows[0].sum || 0;
      
      // Calculate total profit from non-cancelled orders
      const [profitRows] = await pool.query(`
        SELECT 
          SUM(price_user - cost_fivesim) as total_profit,
          SUM(price_user) as total_sales,
          SUM(cost_fivesim) as total_cost
        FROM orders 
        WHERE status IN ('RECEIVED', 'FINISHED')
      `);
      const profitRow = profitRows[0];

      const [depositRows] = await pool.query(`
        SELECT SUM(amount) as sum FROM transactions 
        WHERE type = 'deposit' AND status = 'completed'
      `);
      const totalDeposits = depositRows[0].sum || 0;

      // Recent 10 orders
      const [recentOrders] = await pool.query(`
        SELECT o.*, u.email as user_email 
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.id DESC
        LIMIT 10
      `);

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

  async getUsers(req, res) {
    try {
      const [users] = await pool.query(`
        SELECT 
          u.id, u.email, u.role, u.balance, u.created_at,
          COUNT(o.id) as order_count,
          COALESCE(SUM(CASE WHEN o.status IN ('RECEIVED', 'FINISHED') THEN o.price_user ELSE 0 END), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        GROUP BY u.id
        ORDER BY u.id DESC
      `);

      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async updateUserBalance(req, res) {
    try {
      const { userId, amount, action = 'add', note = '' } = req.body;
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      const [users] = await pool.query('SELECT id, balance, email FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = users[0];

      let newBalance = parseFloat(user.balance);
      let transAmount = numAmount;

      if (action === 'add') {
        newBalance += numAmount;
      } else if (action === 'deduct') {
        newBalance = Math.max(0, newBalance - numAmount);
      } else if (action === 'set') {
        transAmount = Math.abs(numAmount - parseFloat(user.balance));
        newBalance = numAmount;
      }

      newBalance = Math.round(newBalance * 100) / 100;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);
        await connection.query(`
          INSERT INTO transactions (user_id, type, amount, status, gateway, details)
          VALUES (?, 'admin_adjustment', ?, 'completed', 'admin', ?)
        `, [userId, transAmount, `Admin adjustment (\${action}): \${note || 'Manual adjustment'}`]);
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }

      res.json({
        message: `Balance updated for \${user.email}`,
        newBalance
      });
    } catch (error) {
      console.error('Update balance error:', error);
      res.status(500).json({ error: 'Failed to update user balance' });
    }
  }

  async getAllOrders(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const [orders] = await pool.query(`
        SELECT o.*, u.email as user_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.id DESC
        LIMIT ?
      `, [limit]);

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch all orders' });
    }
  }

  async getAllTransactions(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const [transactions] = await pool.query(`
        SELECT t.*, u.email as user_email
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.id DESC
        LIMIT ?
      `, [limit]);

      res.json({ transactions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  async getSettings(req, res) {
    try {
      const [rows] = await pool.query('SELECT \`key\`, value FROM settings');
      const settings = {};
      rows.forEach(r => {
        settings[r.key] = r.value;
      });
      res.json({ settings });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  async updateSettings(req, res) {
    try {
      const settings = req.body;
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        for (const [key, value] of Object.entries(settings)) {
          await connection.query(`
            INSERT INTO settings (\`key\`, value, updated_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP
          `, [key, String(value)]);
        }
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }

      res.json({ message: 'Settings saved successfully' });
    } catch (error) {
      console.error('updateSettings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
}

module.exports = new AdminController();
