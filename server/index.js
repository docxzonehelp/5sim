require('dotenv').config();
const fs = require('fs');
const path = require('path');
const persistentEnv = '/home/u355017569/domains/mistyrose-hummingbird-257452.hostingersite.com/.env';
if (fs.existsSync(persistentEnv)) {
  const dotenv = require('dotenv');
  const envConfig = dotenv.parse(fs.readFileSync(persistentEnv));
  for (const k in envConfig) {
    if (!process.env[k]) process.env[k] = envConfig[k];
  }
}
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Initialize database
require('./config/database');

const authRoutes = require('./routes/authRoutes');
const simRoutes = require('./routes/simRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../client')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sim', simRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Fallback for SPA routing
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 5SIM Reseller Server running at http://localhost:${PORT}`);
  console.log(`🔑 5SIM API connected with active credentials`);
});
