const axios = require('axios');

async function testApp() {
  try {
    const api = axios.create({
      baseURL: 'https://mistyrose-hummingbird-257452.hostingersite.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Logging in as admin@5sim.local...');
    const loginRes = await api.post('/api/auth/login', {
      email: 'admin@5sim.local',
      password: 'admin' // Assuming default admin password is admin
    });
    
    const token = loginRes.data.token;
    console.log('Got token:', token.substring(0, 20) + '...');
    
    console.log('Creating Cryptomus deposit for $5...');
    const depositRes = await api.post('/api/payment/cryptomus/create', { amount: 5 }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Deposit success:', depositRes.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testApp();
