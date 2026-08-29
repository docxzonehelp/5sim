const fs = require('fs');
const file = 'server/controllers/paymentController.js';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  "const cryptomusService = require('../services/cryptomusService');",
  "const cryptomusService = require('../services/cryptomusService');\nconst nowPaymentsService = require('../services/nowpaymentsService');"
);

// Add NowPayments methods before getUserTransactions
const nowPaymentsMethods = `
  async createNowPayments(req, res) {
    try {
      const { amount } = req.body;
      const userId = req.user.id;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Valid deposit amount is required' });
      }

      const [transResult] = await pool.query(\`
        INSERT INTO transactions (user_id, type, amount, status, gateway, details)
        VALUES (?, 'deposit', ?, 'pending', 'nowpayments', ?)
      \`, [userId, numAmount, \`NowPayments deposit initiated for user #\${userId}\`]);

      const transId = transResult.insertId;
      const baseUrl = 'https://mistyrose-hummingbird-257452.hostingersite.com';

      let invoice;
      try {
        invoice = await nowPaymentsService.createInvoice({
          orderId: \`NP_\${transId}_\${Date.now()}\`,
          amount: numAmount,
          currency: 'USD',
          urlCallback: \`\${baseUrl}/api/payment/nowpayment/webhook\`,
          urlReturn: \`\${baseUrl}/?payment=success\`
        });
      } catch (err) {
        await pool.query("UPDATE transactions SET status = 'failed' WHERE id = ?", [transId]);
        return res.status(400).json({ error: err.message || 'Failed to generate NowPayments invoice' });
      }

      await pool.query("UPDATE transactions SET payment_id = ? WHERE id = ?", [invoice.invoice_id || invoice.order_id, transId]);

      res.json({
        message: 'Invoice created successfully',
        payment_url: invoice.invoice_url,
        invoice
      });
    } catch (error) {
      console.error('NowPayments create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleNowPaymentsWebhook(req, res) {
    try {
      const sign = req.headers['x-nowpayments-sig'];
      const payload = req.body;

      if (!sign || !payload) {
        return res.status(400).send('Invalid signature or payload');
      }

      const isValid = await nowPaymentsService.verifyWebhook(payload, sign);
      if (!isValid) {
        console.warn('Invalid NowPayments webhook signature received');
        return res.status(400).send('Signature mismatch');
      }

      const { order_id, payment_status, actually_paid, price_amount } = payload;
      
      if (!order_id || !order_id.startsWith('NP_')) {
        return res.status(200).send('Ignored: non-matching order_id');
      }

      const transId = parseInt(order_id.replace('NP_', '').split('_')[0]);
      const [transactions] = await pool.query('SELECT * FROM transactions WHERE id = ?', [transId]);

      if (transactions.length === 0) {
        return res.status(404).send('Transaction not found');
      }
      const transaction = transactions[0];

      if (transaction.status === 'completed') {
        return res.status(200).send('Already processed');
      }

      if (payment_status === 'finished' || payment_status === 'finished_early' || payment_status === 'partially_paid') {
        // usually we credit the original requested amount if status is finished
        const creditAmount = parseFloat(price_amount || transaction.amount);

        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [creditAmount, transaction.user_id]);
          await connection.query("UPDATE transactions SET status = 'completed', details = ? WHERE id = ?", 
            [\`NowPayments payment verified: status=\${payment_status}, amount=\${creditAmount}\`, transId]);
          await connection.commit();
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }

        console.log(\`✅ NowPayments deposit completed: User #\${transaction.user_id} credited +\${creditAmount}\`);
      } else if (payment_status === 'failed' || payment_status === 'refunded' || payment_status === 'expired') {
        await pool.query("UPDATE transactions SET status = 'failed', details = ? WHERE id = ?", 
            [\`NowPayments payment status: \${payment_status}\`, transId]);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('NowPayments webhook error:', error);
      res.status(500).send('Error processing webhook');
    }
  }

  async getUserTransactions(req, res) {
`;

content = content.replace("  async getUserTransactions(req, res) {", nowPaymentsMethods);

fs.writeFileSync(file, content);
console.log('PaymentController patched');
