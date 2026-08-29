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

    // Cryptomus webhook validation requires parsing the payload JSON string, sorting keys is not needed,
    // they just use the raw body json string base64 encoded.
    // Since we receive the rawBody properly through express now:
    
    let base64Str = "";
    if (rawBody) {
        // Parse it and remove 'sign' if it exists in the raw body text
        let jsonStr = rawBody;
        try {
            const parsed = JSON.parse(rawBody);
            // Cryptomus puts 'sign' in body. 
            // WAIT! Actually, according to Cryptomus API docs, 'sign' is in headers for API,
            // But in Webhooks, some users say it's in the body, others say headers. 
            // In the screenshot, the body itself contains the 'sign' field at the very end 
            // (I can see "sign": "..." in the screenshot log).
            // So we MUST definitely parsed body -> delete sign -> JSON.stringify with NO spaces,
            // OR use the raw body and replace the string. Let's do the precise hash they want.
            
            // The standard cryptomus webhook validation:
            // hash = md5(base64(json_encode(payload, JSON_UNESCAPED_UNICODE)) + API_KEY)
            // where payload does NOT include 'sign'
            
            const dataCopy = { ...payload };
            delete dataCopy.sign; // Very important!
            
            // Ensure proper serialization (no spaces between keys/values usually)
            // Actually they use json_encode which in PHP has no spaces. javascript JSON.stringify does exactly this.
            jsonStr = JSON.stringify(dataCopy);
            
            // Sometimes they escape slashes. PHP json_encode escapes slashes by default unless JSON_UNESCAPED_SLASHES is used.
            // Let's replace forward slashes with escaped slashes just in case? Usually stringify removes need.
            jsonStr = jsonStr.replace(///g, '\/');
            
        } catch(e) {}
    } else {
        const dataCopy = { ...payload };
        delete dataCopy.sign;
        jsonStr = JSON.stringify(dataCopy).replace(///g, '\/');
    }

    base64Str = Buffer.from(jsonStr).toString('base64');
    let calculatedSign = crypto.createHash('md5').update(base64Str + apiKey).digest('hex');

    if (calculatedSign === signature || calculatedSign === payload.sign) return true;
    
    // PHP json_encode without slash escaping
    const jsonStrNoEscapes = JSON.stringify({ ...payload, sign: undefined }).replace(/"sign":undefined,?/, '');
    const dataCopy2 = { ...payload };
    delete dataCopy2.sign;
    base64Str = Buffer.from(JSON.stringify(dataCopy2)).toString('base64');
    calculatedSign = crypto.createHash('md5').update(base64Str + apiKey).digest('hex');
    
    if (calculatedSign === signature || calculatedSign === payload.sign) return true;

    // Direct Cryptomus raw body method if they send it without sign modifying the body text
    if (rawBody && typeof rawBody === 'string') {
        const hash = crypto.createHash('md5').update(Buffer.from(rawBody).toString('base64') + apiKey).digest('hex');
        if (hash === signature) return true;
    }

    return false;
  }
}

module.exports = new CryptomusService();
