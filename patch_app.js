const fs = require('fs');
const file = 'client/js/app.js';
let content = fs.readFileSync(file, 'utf8');

const newApplogic = `
    let response;
    if (gateway === 'cryptomus') {
      response = await API.payment.createCryptomus(amount);
      if (response && response.payment_url) {
        window.location.href = response.payment_url;
      }
    } else if (gateway === 'nowpayments') {
      response = await API.payment.createNowPayment(amount);
      if (response && response.payment_url) {
        window.location.href = response.payment_url;
      }
    } else if (gateway === 'binance') {`;

content = content.replace(`
    let response;
    if (gateway === 'cryptomus') {
      response = await API.payment.createCryptomus(amount);
      if (response && response.payment_url) {
        window.location.href = response.payment_url;
      }
    } else if (gateway === 'binance') {`, newApplogic);
fs.writeFileSync(file, content);
console.log('App JS patched');
