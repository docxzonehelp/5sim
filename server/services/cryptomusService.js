const axios = require('axios');
const crypto = require('crypto');
const pool = require('../config/database');

class CryptomusService {
  async getCredentials() {
    const [merchantRows] = await pool.query(`SELECT value FROM settings WHERE \`key\` = 'cryptomus_merchant_id'`);
    const [keyRows] = await pool.query(`SELECT value FROM settings WHERE \`key\` = 'cryptomus_api_key'`);

    return {
      merchantId: (merchantRows[0]?.value || process.env.CRYPTOMUS_MERCHANT_ID || '').trim(),
      apiKey: (keyRows[0]?.value || process.env.CRYPTOMUS_API_KEY || '').trim()
    };
  }

  generateSignature(data, apiKey) {
    const jsonStr = JSON.stringify(data);
    const base64Str = Buffer.from(jsonStr).toString('base64');
    return crypto.createHash('md5').update(base64Str + apiKey).digest('hex');
  }

  async createInvoice({ orderId, amount, currency = 'USD', urlCallback, urlReturn }) {
    const { merchantId, apiKey } = await this.getCredentials();

    if (!merchantId || !apiKey) {
      throw new Error('Cryptomus credentials are not configured in Admin settings');
    }

    const payload = {
      amount: amount.toString(),
      currency: currency,
      order_id: orderId.toString(),
      url_callback: urlCallback,
      url_return: urlReturn,
      is_payment_multiple: false,
      lifetime: 3600 // 1 hour
    };

    const signature = this.generateSignature(payload, apiKey);

    try {
      const response = await axios.post('https://api.cryptomus.com/v1/payment', payload, {
        headers: {
          'merchant': merchantId,
          'sign': signature,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data && response.data.result) {
        return response.data.result;
      }
      throw new Error(response.data?.message || 'Cryptomus payment creation failed');
    } catch (error) {
      console.error('Cryptomus Invoice Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Cryptomus invoice error');
    }
  }

  async verifyWebhook(payload, signature, rawBody = null) {
    const { apiKey } = await this.getCredentials();
    if (!apiKey) return false;

    // Cryptomus calculates hash: md5(base64(raw_body) + apiKey)
    // The safest way is using the exact raw string received from the request
    let jsonStr;
    if (rawBody && typeof rawBody === 'string') {
      jsonStr = rawBody;
    } else {
      // Fallback if rawBody isn't available
      const dataCopy = { ...payload };
      delete dataCopy.sign; // sign shouldn't be in the body hash usually, though cryptomus sends it in header
      jsonStr = typeof payload === 'string' ? payload : JSON.stringify(dataCopy);
    }

    const base64Str = Buffer.from(jsonStr).toString('base64');
    const calculatedSign = crypto.createHash('md5').update(base64Str + apiKey).digest('hex');

    if (signature === calculatedSign) return true;

    // Second fallback: Sometimes JSON.stringify removes spaces that were in the original payload
    if (!rawBody) {
      const altJsonStr = JSON.stringify(payload);
      const altBase64 = Buffer.from(altJsonStr).toString('base64');
      const altSign = crypto.createHash('md5').update(altBase64 + apiKey).digest('hex');
      return signature === altSign;
    }

    return false;
  }
}

module.exports = new CryptomusService();
