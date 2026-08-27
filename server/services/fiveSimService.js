const axios = require('axios');
const NodeCache = require('node-cache');

// In-memory cache: TTL 600s (10 mins) for static data, 60s for prices
const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

const API_BASE = 'https://5sim.net/v1';

class FiveSimService {
  constructor() {
    this.token = process.env.FIVESIM_API_KEY;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/json',
      'User-Agent': '5SIM-Reseller-Portal/1.0'
    };
  }

  async getProfile() {
    try {
      const response = await axios.get(`${API_BASE}/user/profile`, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('5SIM Profile Error:', error.response?.data || error.message);
      throw new Error(error.response?.data || 'Failed to fetch 5sim profile');
    }
  }

  async getCountries() {
    const cacheKey = 'countries_list';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${API_BASE}/guest/countries`, {
        headers: { 'Accept': 'application/json' },
        timeout: 10000
      });
      
      const countries = response.data;
      cache.set(cacheKey, countries, 600); // 10 minutes cache
      return countries;
    } catch (error) {
      console.error('5SIM Countries Error:', error.message);
      throw new Error('Failed to fetch countries');
    }
  }

  async getProducts(country = 'any', operator = 'any') {
    const cacheKey = `products_${country}_${operator}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${API_BASE}/guest/products/${country}/${operator}`, {
        headers: { 'Accept': 'application/json' },
        timeout: 10000
      });

      const products = response.data;
      cache.set(cacheKey, products, 60); // 1 minute cache
      return products;
    } catch (error) {
      console.error(`5SIM Products Error (${country}/${operator}):`, error.message);
      return {};
    }
  }

  async getPrices(country, product) {
    let url = `${API_BASE}/guest/prices`;
    const params = [];
    if (country && country.toLowerCase() !== 'any') params.push(`country=${country}`);
    if (product) params.push(`product=${product}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const cacheKey = `prices_${country || 'all'}_${product || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(url, {
        headers: { 'Accept': 'application/json' },
        timeout: 10000
      });

      const prices = response.data;
      cache.set(cacheKey, prices, 45); // 45 seconds cache
      return prices;
    } catch (error) {
      console.error('5SIM Prices Error:', error.message);
      throw new Error('Failed to fetch prices');
    }
  }

  async buyActivation(country, operator, product) {
    try {
      const url = `${API_BASE}/user/buy/activation/${country}/${operator}/${product}`;
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      const data = response.data;
      if (typeof data === 'string') {
        throw new Error(data);
      }
      if (!data || !data.phone || !data.id) {
        throw new Error(data?.message || 'No numbers available for this operator');
      }
      return data;
    } catch (error) {
      console.error('5SIM Buy Error:', error.response?.data || error.message);
      const errMsg = typeof error.response?.data === 'string' 
        ? error.response.data 
        : (error.response?.data?.message || error.message || '5SIM buy request failed');
      throw new Error(errMsg);
    }
  }

  async checkOrder(orderId) {
    try {
      const url = `${API_BASE}/user/check/${orderId}`;
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`5SIM Check Order (${orderId}) Error:`, error.response?.data || error.message);
      throw new Error('Failed to check order status');
    }
  }

  async finishOrder(orderId) {
    try {
      const url = `${API_BASE}/user/finish/${orderId}`;
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`5SIM Finish Order (${orderId}) Error:`, error.response?.data || error.message);
      throw new Error(error.response?.data || 'Failed to finish order');
    }
  }

  async cancelOrder(orderId) {
    try {
      const url = `${API_BASE}/user/cancel/${orderId}`;
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`5SIM Cancel Order (${orderId}) Error:`, error.response?.data || error.message);
      throw new Error(error.response?.data || 'Failed to cancel order');
    }
  }

  async banOrder(orderId) {
    try {
      const url = `${API_BASE}/user/ban/${orderId}`;
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`5SIM Ban Order (${orderId}) Error:`, error.response?.data || error.message);
      throw new Error(error.response?.data || 'Failed to ban order');
    }
  }
}

module.exports = new FiveSimService();
