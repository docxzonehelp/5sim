const fiveSimService = require('../services/fiveSimService');
const db = require('../config/database');

class SimController {
  getProfitMargin() {
    const row = db.prepare(`SELECT value FROM settings WHERE key = 'profit_margin'`).get();
    const margin = parseFloat(row?.value || '20');
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
      const margin = this.getProfitMargin();

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
      const margin = this.getProfitMargin();

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

      const margin = this.getProfitMargin();

      // Fetch user profile from DB to check balance
      const user = db.prepare('SELECT id, balance FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Call 5sim to buy activation
      let orderData;
      try {
        orderData = await fiveSimService.buyActivation(country, operator, product);
      } catch (err) {
        let msg = err.message || 'No numbers available';
        if (msg.includes('no free phones') || msg.includes('no numbers')) {
          msg = `No numbers currently available for ${operator.toUpperCase()} in ${country.toUpperCase()}. Please choose another carrier.`;
        }
        return res.status(400).json({ error: msg });
      }

      if (!orderData || !orderData.phone || !orderData.id) {
        return res.status(400).json({ 
          error: `No number available for ${operator.toUpperCase()}. Please try another operator with available stock.` 
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
          error: `Insufficient balance. Required: ${priceUser}, Current: ${user.balance}`
        });
      }

      // Deduct balance and create order in a transaction
      const buyTransaction = db.transaction(() => {
        // Deduct user balance
        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(priceUser, userId);

        // Insert order record
        const insertOrder = db.prepare(`
          INSERT INTO orders (
            user_id, fivesim_order_id, phone, country, product, operator,
            cost_fivesim, price_user, status, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const orderResult = insertOrder.run(
          userId,
          orderData.id,
          orderData.phone,
          country,
          product,
          orderData.operator || operator,
          costFiveSim,
          priceUser,
          orderData.status || 'PENDING',
          orderData.expires
        );

        // Insert transaction record
        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, status, gateway, payment_id, details)
          VALUES (?, 'purchase', ?, 'completed', 'internal', ?, ?)
        `).run(
          userId,
          priceUser,
          orderData.id.toString(),
          `Purchased ${product.toUpperCase()} number (${orderData.phone}) in ${country.toUpperCase()}`
        );

        return orderResult.lastInsertRowid;
      });

      const dbOrderId = buyTransaction();
      const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(dbOrderId);

      // Get updated balance
      const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

      res.status(201).json({
        message: 'Number purchased successfully',
        order: {
          ...createdOrder,
          sms: orderData.sms || []
        },
        new_balance: updatedUser.balance
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

      const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

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
      if ((newStatus === 'TIMEOUT' || newStatus === 'CANCELED') && !isAlreadyFinal && !order.sms_code) {
        db.transaction(() => {
          db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(order.price_user, userId);
          db.prepare(`
            INSERT INTO transactions (user_id, type, amount, status, gateway, payment_id, details)
            VALUES (?, 'refund', ?, 'completed', 'internal', ?, ?)
          `).run(
            userId,
            order.price_user,
            order.fivesim_order_id.toString(),
            `Auto Refund for expired/cancelled order #${order.id} (${order.product})`
          );
          db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newStatus, order.id);
        })();
      } else {
        db.prepare(`
          UPDATE orders 
          SET status = ?, sms_code = ?, sms_text = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newStatus, smsCode, smsText, order.id);
      }

      const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

      res.json({
        order: {
          ...updatedOrder,
          sms: remoteOrder.sms || []
        },
        balance: user.balance
      });
    } catch (error) {
      console.error('checkOrder error:', error);
      res.status(500).json({ error: 'Failed to check order status' });
    }
  }

  async getActiveOrders(req, res) {
    try {
      const userId = req.user.id;
      const orders = db.prepare(`
        SELECT * FROM orders 
        WHERE user_id = ? AND status IN ('PENDING', 'RECEIVED')
        ORDER BY id DESC
      `).all(userId);

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

      const orders = db.prepare(`
        SELECT * FROM orders 
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `).all(userId, limit, offset);

      const totalCount = db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?').get(userId).count;

      res.json({ orders, total: totalCount, page, limit });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order history' });
    }
  }

  async cancelOrder(req, res) {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;

      const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.status === 'CANCELED' || order.status === 'TIMEOUT' || order.status === 'FINISHED' || order.status === 'BANNED') {
        return res.status(400).json({ error: `Order is already ${order.status}` });
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
      db.transaction(() => {
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(order.price_user, userId);
        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, status, gateway, payment_id, details)
          VALUES (?, 'refund', ?, 'completed', 'internal', ?, ?)
        `).run(
          userId,
          order.price_user,
          order.fivesim_order_id.toString(),
          `Refund for cancelled order #${order.id} (${order.product})`
        );
        db.prepare("UPDATE orders SET status = 'CANCELED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);
      })();

      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

      res.json({
        message: 'Order cancelled successfully and balance refunded',
        order_status: 'CANCELED',
        new_balance: user.balance
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

      const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      try {
        await fiveSimService.finishOrder(order.fivesim_order_id);
      } catch (err) {
        console.warn('5sim finish warning:', err.message);
      }

      db.prepare("UPDATE orders SET status = 'FINISHED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);

      res.json({ message: 'Order finished successfully', order_status: 'FINISHED' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to finish order' });
    }
  }

  async banOrder(req, res) {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;

      const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.status === 'BANNED' || order.status === 'CANCELED' || order.status === 'TIMEOUT') {
        return res.status(400).json({ error: `Order is already ${order.status}` });
      }

      try {
        await fiveSimService.banOrder(order.fivesim_order_id);
      } catch (err) {
        console.warn('5sim ban warning:', err.message);
      }

      // Refund on ban
      db.transaction(() => {
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(order.price_user, userId);
        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, status, gateway, payment_id, details)
          VALUES (?, 'refund', ?, 'completed', 'internal', ?, ?)
        `).run(
          userId,
          order.price_user,
          order.fivesim_order_id.toString(),
          `Refund for banned/bad number order #${order.id}`
        );
        db.prepare("UPDATE orders SET status = 'BANNED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);
      })();

      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

      res.json({ message: 'Number banned and balance refunded', new_balance: user.balance });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ban order' });
    }
  }
}

module.exports = new SimController();

