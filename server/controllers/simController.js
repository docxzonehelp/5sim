const fiveSimService = require('../services/fiveSimService');
const pool = require('../config/database');

class SimController {
  async getProfitMargin() {
    const [rows] = await pool.query(\`SELECT value FROM settings WHERE \\\`key\\\` = 'profit_margin'\`);
    const margin = parseFloat(rows[0]?.value || '20');
    return isNaN(margin) ? 20 : margin;
  }

  applyMarkup(price, margin) {
    if (!price || isNaN(price)) return 0;
    const markup = 1 + (margin / 100);
    return Math.round((price * markup) * 100) / 100;
  }

  async getCountries(req, res) {
    try {
      const countries = await fiveSimService.getCountries();
      res.json({ countries });
    } catch (error) {
      console.error('getCountries error:', error);
      res.status(500).json({ error: 'Failed to fetch countries' });
    }
  }

  async getProducts(req, res) {
    try {
      const { country = 'any', operator = 'any' } = req.query;
      const rawProducts = await fiveSimService.getProducts(country, operator);
      const margin = await this.getProfitMargin();

      const productsWithMarkup = {};
      for (const [prodKey, prodData] of Object.entries(rawProducts)) {
        productsWithMarkup[prodKey] = {
          Category: prodData.Category,
          Qty: prodData.Qty,
          OriginalPrice: prodData.Price,
          Price: this.applyMarkup(prodData.Price, margin)
        };
      }

      res.json({ products: productsWithMarkup, margin });
    } catch (error) {
      console.error('getProducts error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  async getPrices(req, res) {
    try {
      const { country, product } = req.query;
      const rawPrices = await fiveSimService.getPrices(country, product);
      const margin = await this.getProfitMargin();

      // 5SIM returns { product: { country: { operator: {...} } } } if we only query by product.
      // We must normalize it to { country: { product: { operator: {...} } } } so the frontend logic works.
      let normalizedPrices = rawPrices;
      if (product && (!country || country.toLowerCase() === 'any')) {
        const pKey = product.toLowerCase();
        if (rawPrices[pKey]) {
          normalizedPrices = {};
          for (const cKey in rawPrices[pKey]) {
            normalizedPrices[cKey] = { [pKey]: rawPrices[pKey][cKey] };
          }
        }
      }

      // Transform prices with +margin% markup
      const transformedPrices = JSON.parse(JSON.stringify(normalizedPrices));
      
      for (const cKey in transformedPrices) {
        for (const pKey in transformedPrices[cKey]) {
          for (const opKey in transformedPrices[cKey][pKey]) {
            const item = transformedPrices[cKey][pKey][opKey];
            if (item && item.cost !== undefined) {
              item.original_cost = item.cost;
              item.cost = this.applyMarkup(item.cost, margin);
            }
          }
        }
      }

      res.json({ prices: transformedPrices, margin });
    } catch (error) {
      console.error('getPrices error:', error);
      res.status(500).json({ error: 'Failed to fetch prices' });
    }
  }

  async buy(req, res) {
    try {
      const { country, operator, product } = req.body;
      const userId = req.user.id;

      if (!country || !operator || !product) {
        return res.status(400).json({ error: 'Country, operator and product are required' });
      }

      const margin = await this.getProfitMargin();

      // Fetch user profile from DB to check balance
      const [users] = await pool.query('SELECT id, balance FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = users[0];

      // Call 5sim to buy activation
      let orderData;
      try {
        orderData = await fiveSimService.buyActivation(country, operator, product);
      } catch (err) {
        let msg = err.message || 'No numbers available';
        if (msg.includes('no free phones') || msg.includes('no numbers')) {
          msg = \`No numbers currently available for \${operator.toUpperCase()} in \${country.toUpperCase()}. Please choose another carrier.\`;
        }
        return res.status(400).json({ error: msg });
      }

      if (!orderData || !orderData.phone || !orderData.id) {
        return res.status(400).json({ 
          error: \`No number available for \${operator.toUpperCase()}. Please try another operator with available stock.\` 
        });
      }

      const costFiveSim = parseFloat(orderData.price || 0);
      const priceUser = this.applyMarkup(costFiveSim, margin);

      if (user.balance < priceUser) {
        // If user balance is insufficient, cancel the order at 5sim immediately to avoid loss
        try {
          await fiveSimService.cancelOrder(orderData.id);
        } catch (e) {
          console.error('Auto-cancel failed on low balance:', e);
        }
        return res.status(400).json({
          error: \`Insufficient balance. Required: \${priceUser}, Current: \${user.balance}\`
        });
      }

      // Deduct balance and create order in a transaction
      const connection = await pool.getConnection();
      let createdOrder;
      let newBalance;

      try {
        await connection.beginTransaction();

        // Deduct user balance
        await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [priceUser, userId]);

        // Insert order record
        const [orderResult] = await connection.query(\`
          INSERT INTO orders (
            user_id, fivesim_order_id, phone, country, product, operator,
            cost_fivesim, price_user, status, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        \`, [
          userId,
          orderData.id,
          orderData.phone,
          country,
          product,
          orderData.operator || operator,
          costFiveSim,
          priceUser,
          orderData.status || 'PENDING',
          orderData.expires ? new Date(orderData.expires).toISOString().slice(0, 19).replace('T', ' ') : null // Basic MySQL datetime conversion
        ]);

        const dbOrderId = orderResult.insertId;

        // Insert transaction record
        await connection.query(\`
          INSERT INTO transactions (user_id, type, amount, status, gateway, payment_id, details)
          VALUES (?, 'purchase', ?, 'completed', 'internal', ?, ?)
        \`, [
          userId,
          priceUser,
          orderData.id.toString(),
          \`Purchased \${product.toUpperCase()} number (\${orderData.phone}) in \${country.toUpperCase()}\`
        ]);

        await connection.commit();

        const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [dbOrderId]);
        createdOrder = orders[0];

        const [updatedUsers] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);
        newBalance = updatedUsers[0].balance;

      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }

      res.status(201).json({
        message: 'Number purchased successfully',
        order: {
          ...createdOrder,
          sms: orderData.sms || []
        },
        new_balance: parseFloat(newBalance)
      });
    } catch (error) {
      console.error('Buy error:', error);
      res.status(500).json({ error: error.message || 'Failed to complete purchase' });
    }
  }

  async checkOrder(req, res) {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;

      const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
      if (orders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orders[0];

      // Check with 5SIM API
      let remoteOrder;
      try {
        remoteOrder = await fiveSimService.checkOrder(order.fivesim_order_id);
      } catch (err) {
        return res.json({ order });
      }

      let rawRemoteStatus = (remoteOrder.status || '').toUpperCase();
      let newStatus = rawRemoteStatus || order.status;
      let smsCode = order.sms_code;
      let smsText = order.sms_text;

      // Extract SMS if available
      if (remoteOrder.sms && remoteOrder.sms.length > 0) {
        const latestSms = remoteOrder.sms[remoteOrder.sms.length - 1];
        smsCode = latestSms.code || null;
        smsText = latestSms.text || null;
        newStatus = 'RECEIVED';
      } else {
        if (newStatus !== 'TIMEOUT' && newStatus !== 'CANCELED' && newStatus !== 'BANNED' && newStatus !== 'FINISHED') {
          newStatus = 'PENDING';
        }
      }

      // Handle Timeout / Cancellation from 5SIM side with automatic refund
      const isAlreadyFinal = ['CANCELED', 'TIMEOUT', 'BANNED', 'FINISHED'].includes(order.status);
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        if ((newStatus === 'TIMEOUT' || newStatus === 'CANCELED') && !isAlreadyFinal && !order.sms_code) {
          await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [order.price_user, userId]);
          await connection.query(\`
            INSERT INTO transactions (user_id, type, amount, status, gateway, payment_id, details)
            VALUES (?, 'refund', ?, 'completed', 'internal', ?, ?)
          \`, [
            userId,
            order.price_user,
            order.fivesim_order_id.toString(),
            \`Auto Refund for expired/cancelled order #\${order.id} (\${order.product})\`
          ]);
          await connection.query('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, order.id]);
        } else {
          await connection.query(\`
            UPDATE orders 
            SET status = ?, sms_code = ?, sms_text = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          \`, [newStatus, smsCode, smsText, order.id]);
        }
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }

      const [updatedOrders] = await pool.query('SELECT * FROM orders WHERE id = ?', [order.id]);
      const [users] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);

      res.json({
        order: {
          ...updatedOrders[0],
          sms: remoteOrder.sms || []
        },
        balance: parseFloat(users[0].balance)
      });
    } catch (error) {
      console.error('checkOrder error:', error);
      res.status(500).json({ error: 'Failed to check order status' });
    }
  }

  async getActiveOrders(req, res) {
    try {
      const userId = req.user.id;
      const [orders] = await pool.query(\`
        SELECT * FROM orders 
        WHERE user_id = ? AND status IN ('PENDING', 'RECEIVED')
        ORDER BY id DESC
      \`, [userId]);

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch active orders' });
    }
  }

  async getOrderHistory(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;

      const [orders] = await pool.query(\`
        SELECT * FROM orders 
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      \`, [userId, limit, offset]);

      const [counts] = await pool.query('SELECT COUNT(*) as count FROM orders WHERE user_id = ?', [userId]);
      const totalCount = counts[0].count;

      res.json({ orders, total: totalCount, page, limit });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order history' });
    }
  }

  async cancelOrder(req, res) {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;

      const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
      if (orders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orders[0];

      if (order.status === 'CANCELED' || order.status === 'TIMEOUT' || order.status === 'FINISHED' || order.status === 'BANNED') {
        return res.status(400).json({ error: \`Order is already \${order.status}\` });
      }

      if (order.sms_code) {
        return res.status(400).json({ error: 'Cannot cancel order after SMS code has already been received' });
      }

      // Call 5sim to cancel
      try {
        await fiveSimService.cancelOrder(order.fivesim_order_id);
      } catch (err) {
        console.warn('5sim cancel warning:', err.message);
      }

      // Refund user and update order
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [order.price_user, userId]);
        await connection.query(\`
          INSERT INTO transactions (user_id, type, amount, status, gateway, payment_id, details)
          VALUES (?, 'refund', ?, 'completed', 'internal', ?, ?)
        \`, [
          userId,
          order.price_user,
          order.fivesim_order_id.toString(),
          \`Refund for cancelled order #\${order.id} (\${order.product})\`
        ]);
        await connection.query("UPDATE orders SET status = 'CANCELED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [order.id]);
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }

      const [users] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);

      res.json({
        message: 'Order cancelled successfully and balance refunded',
        order_status: 'CANCELED',
        new_balance: parseFloat(users[0].balance)
      });
    } catch (error) {
      console.error('cancelOrder error:', error);
      res.status(500).json({ error: 'Failed to cancel order' });
    }
  }

  async finishOrder(req, res) {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;

      const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
      if (orders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orders[0];

      try {
        await fiveSimService.finishOrder(order.fivesim_order_id);
      } catch (err) {
        console.warn('5sim finish warning:', err.message);
      }

      await pool.query("UPDATE orders SET status = 'FINISHED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [order.id]);

      res.json({ message: 'Order finished successfully', order_status: 'FINISHED' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to finish order' });
    }
  }

  async banOrder(req, res) {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;

      const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
      if (orders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orders[0];

      if (order.status === 'BANNED' || order.status === 'CANCELED' || order.status === 'TIMEOUT') {
        return res.status(400).json({ error: \`Order is already \${order.status}\` });
      }

      try {
        await fiveSimService.banOrder(order.fivesim_order_id);
      } catch (err) {
        console.warn('5sim ban warning:', err.message);
      }

      // Refund on ban
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [order.price_user, userId]);
        await connection.query(\`
          INSERT INTO transactions (user_id, type, amount, status, gateway, payment_id, details)
          VALUES (?, 'refund', ?, 'completed', 'internal', ?, ?)
        \`, [
          userId,
          order.price_user,
          order.fivesim_order_id.toString(),
          \`Refund for banned/bad number order #\${order.id}\`
        ]);
        await connection.query("UPDATE orders SET status = 'BANNED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [order.id]);
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }

      const [users] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);

      res.json({ message: 'Number banned and balance refunded', new_balance: parseFloat(users[0].balance) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ban order' });
    }
  }
}

module.exports = new SimController();
