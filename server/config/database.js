const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '5sim_reseller',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true // Required for multiple queries in one string
});

async function initDatabase() {
  try {
    // Check connection first
    await pool.query('SELECT 1');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        balance DECIMAL(10, 2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Add account_id to existing users table if it doesn't exist
    try {
      const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'account_id'");
      const hasAccountId = columns.length > 0;
      
      if (!hasAccountId) {
        await pool.query(`ALTER TABLE users ADD COLUMN account_id VARCHAR(255) UNIQUE;`);
        console.log('o. Added account_id column to users table');
      }

      // Backfill account_id for existing users
      const [usersWithoutId] = await pool.query('SELECT id FROM users WHERE account_id IS NULL');
      if (usersWithoutId.length > 0) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
          for (const user of usersWithoutId) {
            const newId = Math.floor(1000000 + Math.random() * 9000000).toString();
            await connection.query('UPDATE users SET account_id = ? WHERE id = ?', [newId, user.id]);
          }
          await connection.commit();
          console.log(`o. Generated account_id for ${usersWithoutId.length} existing users`);
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }
      }
    } catch (e) {
      console.error('Migration error for account_id:', e);
    }

    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        fivesim_order_id INT,
        phone VARCHAR(255) NOT NULL,
        country VARCHAR(255) NOT NULL,
        product VARCHAR(255) NOT NULL,
        operator VARCHAR(255) NOT NULL,
        cost_fivesim DECIMAL(10, 2) NOT NULL,
        price_user DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        sms_code VARCHAR(255),
        sms_text TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL, -- 'deposit', 'purchase', 'refund', 'admin_adjustment'
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
        gateway VARCHAR(50) DEFAULT 'internal', -- 'cryptomus', 'binance', 'internal', 'admin'
        payment_id VARCHAR(255),
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Password Resets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Insert default settings if not exist
    const insertSetting = async (key, value) => {
      await pool.query(
        'INSERT IGNORE INTO settings (`key`, value) VALUES (?, ?)',
        [key, value]
      );
    };

    await insertSetting('profit_margin', process.env.DEFAULT_PROFIT_MARGIN || '20');
    await insertSetting('site_name', '5SIM Verification Portal');
    await insertSetting('currency_symbol', '$');
    await insertSetting('currency_code', 'USD');
    await insertSetting('cryptomus_merchant_id', process.env.CRYPTOMUS_MERCHANT_ID || '');
    await insertSetting('cryptomus_api_key', process.env.CRYPTOMUS_API_KEY || '');
    await insertSetting('binance_api_key', process.env.BINANCE_PAY_API_KEY || '');
    await insertSetting('binance_secret_key', process.env.BINANCE_PAY_SECRET_KEY || '');

    // Check if admin user exists, if not create default admin
    const [adminCheck] = await pool.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
    if (adminCheck.length === 0) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('Admin@123456', salt);
      await pool.query(`
        INSERT INTO users (email, password_hash, role, balance)
        VALUES (?, ?, 'admin', 100.0)
      `, ['admin@5sim.local', hash]);
      console.log('✅ Default admin created: admin@5sim.local / Admin@123456');
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
  }
}

initDatabase();

module.exports = pool;
