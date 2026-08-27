const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/database');

class BinancePayService {
  getCredentials() {
    const keyRow = db.prepare(`SELECT value FROM settings WHERE key = 'binance_api_key'`).get();
    const secretRow = db.prepare(`SELECT value FROM settings WHERE key = 'binance_secret_key'`).get();

    return {
      apiKey: keyRow?.value || process.env.BINANCE_PAY_API_KEY || '',
      secretKey: secretRow?.value || process.env.BINANCE_PAY_SECRET_KEY || ''
    };
  }

  generateNonce(length = 32) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateSignature(timestamp, nonce, bodyStr, secretKey) {
    const payload = `${timestamp}\n${nonce}\n${bodyStr}\n`;
    return crypto.createHmac('sha512', secretKey).update(payload).digest('hex').toUpperCase();
  }

  async createOrder({ tradeNo, amount, currency = 'USDT', description = 'Wallet Topup' }) {
    const { apiKey, secretKey } = this.getCredentials();

    if (!apiKey || !secretKey) {
      throw new Error('Binance Pay API keys are not configured in Admin settings');
    }

    const endpoint = 'https://bpay.binanceapi.com/binancepay/openapi/v2/order';
    const timestamp = Date.now().toString();
    const nonce = this.generateNonce(32);

    const body = {
      env: {
        terminalType: 'WEB'
      },
      merchantTradeNo: tradeNo.toString(),
      orderAmount: parseFloat(amount).toFixed(2),
      currency: currency,
      goods: {
        goodsType: '02', // Virtual goods
        goodsCategory: '7000',
        referenceGoodsId: 'topup_' + tradeNo,
        goodsName: description,
        goodsDetail: 'Balance Topup for 5SIM Verification'
      }
    };

    const bodyStr = JSON.stringify(body);
    const signature = this.generateSignature(timestamp, nonce, bodyStr, secretKey);

    try {
      const response = await axios.post(endpoint, body, {
        headers: {
          'Content-Type': 'application/json',
          'BinancePay-Timestamp': timestamp,
          'BinancePay-Nonce': nonce,
          'BinancePay-Certificate-SN': apiKey,
          'BinancePay-Signature': signature
        },
        timeout: 15000
      });

      if (response.data && response.data.status === 'SUCCESS') {
        return response.data.data;
      }
      throw new Error(response.data?.errorMessage || 'Binance Pay order creation failed');
    } catch (error) {
      console.error('Binance Pay Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || error.message || 'Binance Pay order error');
    }
  }

  verifyWebhook(timestamp, nonce, bodyStr, signature) {
    const { secretKey } = this.getCredentials();
    if (!secretKey) return false;

    const calculatedSig = this.generateSignature(timestamp, nonce, bodyStr, secretKey);
    return signature === calculatedSig;
  }
}

module.exports = new BinancePayService();
