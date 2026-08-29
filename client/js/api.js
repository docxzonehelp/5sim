const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('5sim_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('5sim_token', token);
    } else {
      localStorage.removeItem('5sim_token');
    }
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // If unauthorized, clear token
          // this.setToken(null);
        }
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  },

  // Auth endpoints
  auth: {
    login: (email, password) => API.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    register: (email, password) => API.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    google: (data) => API.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(typeof data === 'string' ? { credential: data } : data)
    }),
    getProfile: () => API.request('/auth/profile'),
    updatePassword: (oldPassword, newPassword) => API.request('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    }),
    forgotPassword: (email) => API.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
    resetPassword: (email, code, newPassword) => API.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword })
    })
  },

  // 5SIM Endpoints
  sim: {
    getCountries: () => API.request('/sim/countries'),
    getProducts: (country = 'any', operator = 'any') => 
      API.request(`/sim/products?country=${encodeURIComponent(country)}&operator=${encodeURIComponent(operator)}`),
    getPrices: (country, product) => {
      let query = [];
      if (country) query.push(`country=${encodeURIComponent(country)}`);
      if (product) query.push(`product=${encodeURIComponent(product)}`);
      return API.request(`/sim/prices?${query.join('&')}`);
    },
    buy: (country, operator, product) => API.request('/sim/buy', {
      method: 'POST',
      body: JSON.stringify({ country, operator, product })
    }),
    checkOrder: (id) => API.request(`/sim/order/${id}`),
    getActiveOrders: () => API.request('/sim/orders/active'),
    getOrderHistory: (page = 1) => API.request(`/sim/orders/history?page=${page}`),
    cancelOrder: (id) => API.request(`/sim/order/${id}/cancel`, { method: 'POST' }),
    finishOrder: (id) => API.request(`/sim/order/${id}/finish`, { method: 'POST' }),
    banOrder: (id) => API.request(`/sim/order/${id}/ban`, { method: 'POST' })
  },

  // Payment Endpoints
  payment: {
    createCryptomus: (amount) => API.request('/payment/cryptomus/create', {
      method: 'POST',
      body: JSON.stringify({ amount })
    }),
    createNowPayment: (amount) => API.request('/payment/nowpayment/create', {
      method: 'POST',
      body: JSON.stringify({ amount })
    }),
    createBinance: (amount) => API.request('/payment/binance/create', {
      method: 'POST',
      body: JSON.stringify({ amount })
    }),
    getTransactions: () => API.request('/payment/transactions')
  },

  // Admin Endpoints
  admin: {
    getStats: () => API.request('/admin/stats'),
    getUsers: () => API.request('/admin/users'),
    updateUserBalance: (userId, amount, action = 'add', note = '') => API.request('/admin/users/balance', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, action, note })
    }),
    getAllOrders: (limit = 100) => API.request(`/admin/orders?limit=${limit}`),
    getAllTransactions: (limit = 100) => API.request(`/admin/transactions?limit=${limit}`),
    getSettings: () => API.request('/admin/settings'),
    updateSettings: (settings) => API.request('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    })
  }
};
