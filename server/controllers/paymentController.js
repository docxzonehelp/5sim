const cryptomusService = require('../services/cryptomusService');
const binancePayService = require('../services/binancePayService');
const pool = require('../config/database');

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
      const [transResult] = await pool.query(`
        INSERT INTO transactions (user_id, type, amount, status, gateway, details)
        VALUES (?, 'deposit', ?, 'pending', 'cryptomus', ?)
      `, [userId, numAmount, `Cryptomus deposit initiated for user #\${userId}`]);

      const transId = transResult.insertId;
      const baseUrl = 'https://mistyrose-hummingbird-257452.hostingersite.com';

      let invoice;
      try {
        invoice = await cryptomusService.createInvoice({
          orderId: `DEP_${transId}_${Date.now()}`,
          amount: numAmount,
          currency: 'USD',
          urlCallback: `\${baseUrl}/api/payment/cryptomus/webhook`,
          urlReturn: `\${baseUrl}/?payment=success`
        });
      } catch (err) {
        await pool.query("UPDATE transactions SET status = 'failed' WHERE id = ?", [transId]);
        return res.status(400).json({ error: err.message || 'Failed to generate Cryptomus invoice' });
      }

      await pool.query("UPDATE transactions SET payment_id = ? WHERE id = ?", [invoice.uuid || invoice.order_id, transId]);

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

      const isValid = await cryptomusService.verifyWebhook(payload, sign);
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
      const [transactions] = await pool.query('SELECT * FROM transactions WHERE id = ?', [transId]);

      if (transactions.length === 0) {
        return res.status(404).send('Transaction not found');
      }
      const transaction = transactions[0];

      if (transaction.status === 'completed') {
        return res.status(200).send('Already processed');
      }

      if (status === 'paid' || status === 'paid_over') {
        const creditAmount = parseFloat(merchant_amount || transaction.amount);

        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [creditAmount, transaction.user_id]);
          await connection.query("UPDATE transactions SET status = 'completed', details = ? WHERE id = ?", 
            [`Cryptomus payment verified: status=\${status}, amount=\${creditAmount}`, transId]);
          await connection.commit();
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }

        console.log(`✅ Cryptomus deposit completed: User #\${transaction.user_id} credited +\${creditAmount}`);
      } else if (status === 'cancel' || status === 'fail') {
        await pool.query("UPDATE transactions SET status = 'failed' WHERE id = ?", [transId]);
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

      const [transResult] = await pool.query(`
        INSERT INTO transactions (user_id, type, amount, status, gateway, details)
        VALUES (?, 'deposit', ?, 'pending', 'binance', ?)
      `, [userId, numAmount, `Binance Pay deposit for user #\${userId}`]);

      const transId = transResult.insertId;

      let binanceOrder;
      try {
        binanceOrder = await binancePayService.createOrder({
          tradeNo: `BN_\${transId}_\${Date.now()}`,
          amount: numAmount,
          currency: 'USDT',
          description: `Deposit #\${transId}`
        });
      } catch (err) {
        await pool.query("UPDATE transactions SET status = 'failed' WHERE id = ?", [transId]);
        return res.status(400).json({ error: err.message || 'Failed to initiate Binance Pay' });
      }

      await pool.query("UPDATE transactions SET payment_id = ? WHERE id = ?", 
        [binanceOrder.prepayId || binanceOrder.checkoutUrl, transId]);

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

      const isValid = await binancePayService.verifyWebhook(timestamp, nonce, rawBody, signature);
      if (!isValid) {
        return res.status(400).json({ returnCode: 'FAIL', returnMessage: 'Invalid signature' });
      }

      const { data, bizStatus } = req.body;
      if (bizStatus === 'PAY_SUCCESS' && data) {
        const tradeNo = data.merchantTradeNo;
        if (tradeNo && tradeNo.startsWith('BN_')) {
          const parts = tradeNo.split('_');
          const transId = parseInt(parts[1]);

          const [transactions] = await pool.query('SELECT * FROM transactions WHERE id = ?', [transId]);
          const transaction = transactions.length > 0 ? transactions[0] : null;

          if (transaction && transaction.status !== 'completed') {
            const amount = parseFloat(data.orderAmount || transaction.amount);
            
            const connection = await pool.getConnection();
            try {
              await connection.beginTransaction();
              await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, transaction.user_id]);
              await connection.query("UPDATE transactions SET status = 'completed', details = ? WHERE id = ?",
                [`Binance Pay payment success: \${tradeNo}`, transId]);
              await connection.commit();
            } catch (err) {
              await connection.rollback();
              throw err;
            } finally {
              connection.release();
            }
          }
        }
      }

      res.json({ returnCode: 'SUCCESS', returnMessage: null });
    } catch (error) {
      console.error('Binance webhook error:', error);
      res.status(500).json({ returnCode: 'FAIL', returnMessage: 'Webhook processing error' });
    }
  }

  async getUserTransactions(req, res) {
    try {
      const userId = req.user.id;
      const [transactions] = await pool.query(`
        SELECT * FROM transactions
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 50
      `, [userId]);

      res.json({ transactions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }
}

module.exports = new PaymentController();
