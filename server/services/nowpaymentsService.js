const axios = require('axios');
const crypto = require('crypto');
const pool = require('../config/database');

class NowPaymentsService {
  async getCredentials() {
    const [keyRows] = await pool.query(`SELECT value FROM settings WHERE \`key\` = 'nowpayments_api_key'`);
    const [secretRows] = await pool.query(`SELECT value FROM settings WHERE \`key\` = 'nowpayments_ipn_secret'`);

    return {
      apiKey: (keyRows[0]?.value || process.env.NOWPAYMENTS_API_KEY || '').trim(),
      ipnSecret: (secretRows[0]?.value || process.env.NOWPAYMENTS_IPN_SECRET || '').trim()
    };
  }

  async createInvoice({ orderId, amount, currency = 'USD', urlCallback, urlReturn }) {
    const { apiKey } = await this.getCredentials();

    if (!apiKey) {
      throw new Error('NowPayments credentials are not configured');
    }

    const payload = {
      price_amount: amount,
      price_currency: currency,
      order_id: orderId.toString(),
      order_description: `Deposit ${orderId}`,
      ipn_callback_url: urlCallback,
      success_url: urlReturn,
      cancel_url: urlReturn
    };

    try {
      const response = await axios.post('https://api.nowpayments.io/v1/invoice', payload, {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data && response.data.invoice_url) {
        return response.data;
      }
      throw new Error('NowPayments payment creation failed');
    } catch (error) {
      console.error('NowPayments Invoice Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'NowPayments invoice error');
    }
  }

  async verifyWebhook(payload, signature) {
    const { ipnSecret } = await this.getCredentials();
    if (!ipnSecret) return false;

    // Sort the keys alphabetically
    const keys = Object.keys(payload).sort();
    
    // Stringify payload values using the sorted keys
    // Exclude 'invoice_url' if needed? Nowpayments just sorts keys and JSON stringifies.
    // Actually, according to NowPayments docs:
    // It is stringified JSON string with keys sorted in alphabetical order. 
    // And if some fields are sent as arrays, they are not checked correctly. 
    // Usually it's better to verify the raw body if express provides it, but here's a strict approach.
    const sortedPayload = {};
    for (const key of keys) {
        sortedPayload[key] = payload[key];
    }
    const message = JSON.stringify(sortedPayload);
    
    const hmac = crypto.createHmac('sha512', ipnSecret);
    hmac.update(message);
    const calculatedSign = hmac.digest('hex');

    return signature === calculatedSign;
  }
}

module.exports = new NowPaymentsService();
