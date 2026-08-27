const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../data.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & speed
db.pragma('journal_mode = WAL');

function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      balance REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fivesim_order_id INTEGER,
      phone TEXT NOT NULL,
      country TEXT NOT NULL,
      product TEXT NOT NULL,
      operator TEXT NOT NULL,
      cost_fivesim REAL NOT NULL,
      price_user REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      sms_code TEXT,
      sms_text TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'deposit', 'purchase', 'refund', 'admin_adjustment'
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
      gateway TEXT DEFAULT 'internal', -- 'cryptomus', 'binance', 'internal', 'admin'
      payment_id TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Password Resets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default settings if not exist
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  insertSetting.run('profit_margin', process.env.DEFAULT_PROFIT_MARGIN || '20');
  insertSetting.run('site_name', '5SIM Verification Portal');
  insertSetting.run('currency_symbol', '$');
  insertSetting.run('currency_code', 'USD');
  insertSetting.run('cryptomus_merchant_id', process.env.CRYPTOMUS_MERCHANT_ID || '');
  insertSetting.run('cryptomus_api_key', process.env.CRYPTOMUS_API_KEY || '');
  insertSetting.run('binance_api_key', process.env.BINANCE_PAY_API_KEY || '');
  insertSetting.run('binance_secret_key', process.env.BINANCE_PAY_SECRET_KEY || '');

  // Check if admin user exists, if not create default admin
  const adminCheck = db.prepare(`SELECT * FROM users WHERE role = 'admin' LIMIT 1`).get();
  if (!adminCheck) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('Admin@123456', salt);
    db.prepare(`
      INSERT INTO users (email, password_hash, role, balance)
      VALUES (?, ?, 'admin', 100.0)
    `).run('admin@5sim.local', hash);
    console.log('✅ Default admin created: admin@5sim.local / Admin@123456');
  }

  console.log('✅ Database initialized successfully');
}

initDatabase();

module.exports = db;
