const fs = require('fs');
const file = 'server/routes/paymentRoutes.js';
let content = fs.readFileSync(file, 'utf8');

const newRoutes = `
// NowPayments endpoints
router.post('/nowpayment/create', authMiddleware, (req, res) => paymentController.createNowPayments(req, res));
router.post('/nowpayment/webhook', express.json(), (req, res) => paymentController.handleNowPaymentsWebhook(req, res));

// Binance endpoints
`;

content = content.replace("// Binance endpoints", newRoutes);
fs.writeFileSync(file, content);
console.log('Payment routes patched');
