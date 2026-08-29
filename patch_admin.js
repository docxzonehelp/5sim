const fs = require('fs');
const file = 'client/js/admin.js';
let content = fs.readFileSync(file, 'utf8');

const newAdminHtml = `
            <div class="card bg-gray-800 p-4 mb-4">
              <h3 class="text-xl mb-3"><i class="fas fa-coins text-yellow-400"></i> NowPayments Settings</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm text-gray-400 mb-1">API Key</label>
                  <input type="password" name="nowpayments_api_key" class="form-control" value="\${s.nowpayments_api_key || ''}" placeholder="Enter API Key" />
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-1">IPN Secret</label>
                  <input type="password" name="nowpayments_ipn_secret" class="form-control" value="\${s.nowpayments_ipn_secret || ''}" placeholder="Enter IPN Secret" />
                </div>
              </div>
            </div>

            <div class="card bg-gray-800 p-4 mb-4">
              <h3 class="text-xl mb-3"><i class="fas fa-bolt text-yellow-500"></i> Binance Pay Settings</h3>`;

content = content.replace(`
            <div class="card bg-gray-800 p-4 mb-4">
              <h3 class="text-xl mb-3"><i class="fas fa-bolt text-yellow-500"></i> Binance Pay Settings</h3>`, newAdminHtml);
fs.writeFileSync(file, content);
console.log('Admin JS patched');
