const cryptomusService = require('../services/cryptomusService');
const binancePayService = require('../services/binancePayService');
const db = require('../config/database');

class PaymentController {
  async createCryptomus(req, res) {
    try {
      const { amount } = req.body;
      const userId = req.user.id;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Valid deposit amount is required' });
      }

      // Generate unique local transaction
      const transResult = db.prepare(`
        INSERT INTO transactions (user_id, type, amount, status, gateway, details)
        VALUES (?, 'deposit', ?, 'pending', 'cryptomus', ?)
      `).run(userId, numAmount, `Cryptomus deposit initiated for user #${userId}`);

      const transId = transResult.lastInsertRowid;
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      let invoice;
      try {
        invoice = await cryptomusService.createInvoice({
          orderId: `DEP_${transId}`,
          amount: numAmount,
          currency: 'USD',
          urlCallback: `${baseUrl}/api/payment/cryptomus/webhook`,
          urlReturn: `${baseUrl}/?payment=success`
        });
      } catch (err) {
        db.prepare("UPDATE transactions SET status = 'failed' WHERE id = ?").run(transId);
        return res.status(400).json({ error: err.message || 'Failed to generate Cryptomus invoice' });
      }

      db.prepare("UPDATE transactions SET payment_id = ? WHERE id = ?").run(invoice.uuid || invoice.order_id, transId);

      res.json({
        message: 'Invoice created successfully',
        payment_url: invoice.url,
        invoice
      });
    } catch (error) {
      console.error('Cryptomus create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleCryptomusWebhook(req, res) {
    try {
      const sign = req.headers['sign'];
      const payload = req.body;

      if (!sign || !payload) {
        return res.status(400).send('Invalid signature or payload');
      }

      const isValid = cryptomusService.verifyWebhook(payload, sign);
      if (!isValid) {
        console.warn('Invalid Cryptomus webhook signature received');
        return res.status(400).send('Signature mismatch');
      }

      const { order_id, status, merchant_amount } = payload;
      
      // order_id format: DEP_123
      if (!order_id || !order_id.startsWith('DEP_')) {
        return res.status(200).send('Ignored: non-matching order_id');
      }

      const transId = parseInt(order_id.replace('DEP_', ''));
      const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transId);

      if (!transaction) {
        return res.status(404).send('Transaction not found');
      }

      if (transaction.status === 'completed') {
        return res.status(200).send('Already processed');
      }

      if (status === 'paid' || status === 'paid_over') {
        const creditAmount = parseFloat(merchant_amount || transaction.amount);

        db.transaction(() => {
          db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(creditAmount, transaction.user_id);
          db.prepare("UPDATE transactions SET status = 'completed', details = ? WHERE id = ?")
            .run(`Cryptomus payment verified: status=${status}, amount=${creditAmount}`, transId);
        })();

        console.log(`✅ Cryptomus deposit completed: User #${transaction.user_id} credited +${creditAmount}`);
      } else if (status === 'cancel' || status === 'fail') {
        db.prepare("UPDATE transactions SET status = 'failed' WHERE id = ?").run(transId);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Cryptomus webhook error:', error);
      res.status(500).send('Error processing webhook');
    }
  }

  async createBinance(req, res) {
    try {
      const { amount } = req.body;
      const userId = req.user.id;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Valid deposit amount is required' });
      }

      const transResult = db.prepare(`
        INSERT INTO transactions (user_id, type, amount, status, gateway, details)
        VALUES (?, 'deposit', ?, 'pending', 'binance', ?)
      `).run(userId, numAmount, `Binance Pay deposit for user #${userId}`);

      const transId = transResult.lastInsertRowid;

      let binanceOrder;
      try {
        binanceOrder = await binancePayService.createOrder({
          tradeNo: `BN_${transId}_${Date.now()}`,
          amount: numAmount,
          currency: 'USDT',
          description: `Deposit #${transId}`
        });
      } catch (err) {
        db.prepare("UPDATE transactions SET status = 'failed' WHERE id = ?").run(transId);
        return res.status(400).json({ error: err.message || 'Failed to initiate Binance Pay' });
      }

      db.prepare("UPDATE transactions SET payment_id = ? WHERE id = ?")
        .run(binanceOrder.prepayId || binanceOrder.checkoutUrl, transId);

      res.json({
        message: 'Binance Pay order created',
        checkoutUrl: binanceOrder.checkoutUrl || binanceOrder.universalUrl,
        qrContent: binanceOrder.qrContent || binanceOrder.qrcodeLink,
        data: binanceOrder
      });
    } catch (error) {
      console.error('Binance Pay create error:', error);
      res.status(500).json({ error: 'Failed to create Binance Pay order' });
    }
  }

  async handleBinanceWebhook(req, res) {
    try {
      const timestamp = req.headers['binancepay-timestamp'];
      const nonce = req.headers['binancepay-nonce'];
      const signature = req.headers['binancepay-signature'];
      const rawBody = JSON.stringify(req.body);

      const isValid = binancePayService.verifyWebhook(timestamp, nonce, rawBody, signature);
      if (!isValid) {
        return res.status(400).json({ returnCode: 'FAIL', returnMessage: 'Invalid signature' });
      }

      const { data, bizStatus } = req.body;
      if (bizStatus === 'PAY_SUCCESS' && data) {
        const tradeNo = data.merchantTradeNo;
        if (tradeNo && tradeNo.startsWith('BN_')) {
          const parts = tradeNo.split('_');
          const transId = parseInt(parts[1]);

          const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transId);
          if (transaction && transaction.status !== 'completed') {
            const amount = parseFloat(data.orderAmount || transaction.amount);
            db.transaction(() => {
              db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, transaction.user_id);
              db.prepare("UPDATE transactions SET status = 'completed', details = ? WHERE id = ?")
                .run(`Binance Pay payment success: ${tradeNo}`, transId);
            })();
          }
        }
      }

      res.json({ returnCode: 'SUCCESS', returnMessage: null });
    } catch (error) {
      console.error('Binance webhook error:', error);
      res.status(500).json({ returnCode: 'FAIL', returnMessage: 'Webhook processing error' });
    }
  }

  getUserTransactions(req, res) {
    try {
      const userId = req.user.id;
      const transactions = db.prepare(`
        SELECT * FROM transactions
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 50
      `).all(userId);

      res.json({ transactions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }
}

module.exports = new PaymentController();
