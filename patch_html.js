const fs = require('fs');
const file = 'client/index.html';
let content = fs.readFileSync(file, 'utf8');

const newHtml = `              <div class="gateway-tab active" data-gateway="cryptomus">
                <i class="fas fa-cube"></i> Cryptomus (Crypto)
              </div>
              <div class="gateway-tab" data-gateway="nowpayments">
                <i class="fas fa-coins"></i> NowPayments (Crypto)
              </div>`;

content = content.replace(`              <div class="gateway-tab active" data-gateway="cryptomus">
                <i class="fas fa-cube"></i> Cryptomus (Crypto)
              </div>`, newHtml);
fs.writeFileSync(file, content);
console.log('Index HTML patched');
