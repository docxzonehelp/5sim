const fs = require('fs');
const file = 'client/js/api.js';
let content = fs.readFileSync(file, 'utf8');

const newApi = `createCryptomus: (amount) => API.request('/payment/cryptomus/create', {
      method: 'POST',
      body: JSON.stringify({ amount })
    }),
    createNowPayment: (amount) => API.request('/payment/nowpayment/create', {
      method: 'POST',
      body: JSON.stringify({ amount })
    }),`;

content = content.replace("createCryptomus: (amount) => API.request('/payment/cryptomus/create', {\n      method: 'POST',\n      body: JSON.stringify({ amount })\n    }),", newApi);
fs.writeFileSync(file, content);
console.log('API client patched');
