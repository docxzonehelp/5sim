const AdminManager = {
  currentTab: 'overview',

  async openAdminModal() {
    if (!State.user || State.user.role !== 'admin') {
      showToast('Unauthorized: Admin access only', 'error');
      return;
    }

    const modal = document.getElementById('adminModal');
    if (modal) {
      modal.classList.add('active');
      this.switchTab('overview');
    }
  },

  closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) modal.classList.remove('active');
  },

  async switchTab(tab) {
    this.currentTab = tab;
    
    // Update tab UI
    document.querySelectorAll('.admin-nav-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    const content = document.getElementById('adminModalContent');
    content.innerHTML = '<div style="text-align: center; padding: 2rem; color: #94a3b8;">Loading data...</div>';

    if (tab === 'overview') await this.renderOverview(content);
    else if (tab === 'users') await this.renderUsers(content);
    else if (tab === 'orders') await this.renderOrders(content);
    else if (tab === 'settings') await this.renderSettings(content);
  },

  async renderOverview(container) {
    try {
      const data = await API.admin.getStats();
      const m = data.metrics;
      const master = data.master;

      container.innerHTML = `
        <div class="admin-grid">
          <div class="stat-card" style="border-left: 4px solid #3b82f6;">
            <span class="stat-label">5SIM Real Master Balance</span>
            <span class="stat-val" style="color: #38bdf8;">${master.balance !== undefined ? '$' + master.balance : 'N/A'}</span>
            <span style="font-size: 0.72rem; color: #94a3b8;">Account: ${master.email || 'N/A'}</span>
          </div>
          <div class="stat-card" style="border-left: 4px solid #10b981;">
            <span class="stat-label">Total Resell Profit</span>
            <span class="stat-val" style="color: #10b981;">+$${m.totalProfit}</span>
            <span style="font-size: 0.72rem; color: #94a3b8;">From completed orders</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Registered Users</span>
            <span class="stat-val">${m.totalUsers}</span>
            <span style="font-size: 0.72rem; color: #94a3b8;">Total customer accounts</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Platform Orders</span>
            <span class="stat-val">${m.totalOrders}</span>
            <span style="font-size: 0.72rem; color: #94a3b8;">Active: ${m.activeOrders}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">User Balances Total</span>
            <span class="stat-val">$${m.userBalanceSum}</span>
            <span style="font-size: 0.72rem; color: #94a3b8;">Unspent user funds</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Deposits Processed</span>
            <span class="stat-val">$${m.totalDeposits}</span>
            <span style="font-size: 0.72rem; color: #94a3b8;">Via Gateways</span>
          </div>
        </div>

        <h4 style="margin: 1.5rem 0 0.75rem; font-family: var(--font-heading);">Recent Orders</h4>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Service</th>
                <th>Country</th>
                <th>Phone</th>
                <th>Cost / Price</th>
                <th>Profit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${(data.recentOrders || []).map(o => `
                <tr>
                  <td>#${o.id}</td>
                  <td>${o.user_email}</td>
                  <td style="text-transform: capitalize;">${o.product}</td>
                  <td style="text-transform: capitalize;">${o.country}</td>
                  <td style="font-family: var(--font-mono);">${o.phone}</td>
                  <td>$${o.cost_fivesim} / $${o.price_user}</td>
                  <td style="color: #10b981; font-weight: 600;">+$${(o.price_user - o.cost_fivesim).toFixed(2)}</td>
                  <td><span class="order-status-badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: #ef4444;">Failed to load stats: ${e.message}</div>`;
    }
  },

  async renderUsers(container) {
    try {
      const data = await API.admin.getUsers();
      const users = data.users || [];

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h4 style="font-family: var(--font-heading);">All Registered Users (${users.length})</h4>
        </div>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Balance</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>#${u.id}</td>
                  <td><b>${u.email}</b></td>
                  <td><span style="padding: 0.15rem 0.4rem; background: ${u.role === 'admin' ? '#3b82f6' : '#334155'}; border-radius: 4px; font-size: 0.72rem;">${u.role}</span></td>
                  <td style="font-family: var(--font-heading); font-weight: 700; color: #38bdf8;">$${u.balance}</td>
                  <td>${u.order_count}</td>
                  <td>$${u.total_spent}</td>
                  <td style="font-size: 0.75rem; color: #94a3b8;">${new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button class="btn-copy-sm" style="background: #3b82f6; color: white;" onclick="AdminManager.promptBalance(${u.id}, '${u.email}')">
                      💰 Adjust Balance
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: #ef4444;">Failed to load users: ${e.message}</div>`;
    }
  },

  async renderOrders(container) {
    try {
      const data = await API.admin.getAllOrders(100);
      const orders = data.orders || [];

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h4 style="font-family: var(--font-heading);">All System Orders (${orders.length})</h4>
        </div>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Product</th>
                <th>Country</th>
                <th>Phone</th>
                <th>SMS Code</th>
                <th>5SIM Cost</th>
                <th>User Price</th>
                <th>Profit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => `
                <tr>
                  <td>#${o.id}</td>
                  <td>${o.user_email}</td>
                  <td style="text-transform: capitalize;">${o.product}</td>
                  <td style="text-transform: capitalize;">${o.country}</td>
                  <td style="font-family: var(--font-mono);">${o.phone}</td>
                  <td style="font-family: var(--font-mono); font-weight: 700; color: #10b981;">${o.sms_code || '-'}</td>
                  <td>$${o.cost_fivesim}</td>
                  <td>$${o.price_user}</td>
                  <td style="color: #10b981; font-weight: 600;">+$${(o.price_user - o.cost_fivesim).toFixed(2)}</td>
                  <td><span class="order-status-badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: #ef4444;">Failed to load orders: ${e.message}</div>`;
    }
  },

  async renderSettings(container) {
    try {
      const res = await API.admin.getSettings();
      const s = res.settings || {};

      container.innerHTML = `
        <form id="adminSettingsForm" onsubmit="AdminManager.handleSaveSettings(event)" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: var(--radius-md); padding: 1rem;">
            <h5 style="margin-bottom: 0.5rem; color: #93c5fd;">📈 Profit Margin Configuration</h5>
            <div class="form-group">
              <label class="form-label">Profit Markup Percentage (%)</label>
              <input type="number" step="1" name="profit_margin" class="form-control" value="${s.profit_margin || '20'}" required />
              <span style="font-size: 0.75rem; color: #94a3b8;">Set to 20 for +20% profit on top of original 5sim prices.</span>
            </div>
          </div>

          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid #10b981; border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem;">
            <h5 style="color: #6ee7b7;">💎 Cryptomus Payment Gateway</h5>
            <div class="form-group">
              <label class="form-label">Cryptomus Merchant ID</label>
              <input type="text" name="cryptomus_merchant_id" class="form-control" value="${s.cryptomus_merchant_id || ''}" placeholder="e.g. 5b1...4c9" />
            </div>
            <div class="form-group">
              <label class="form-label">Cryptomus Payment API Key</label>
              <input type="password" name="cryptomus_api_key" class="form-control" value="${s.cryptomus_api_key || ''}" placeholder="Enter Payment API Key" />
            </div>
          </div>

          <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid #f59e0b; border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem;">
            <h5 style="color: #fcd34d;">🟡 Binance Pay Gateway</h5>
            <div class="form-group">
              <label class="form-label">Binance Pay API Key (Certificate SN)</label>
              <input type="text" name="binance_api_key" class="form-control" value="${s.binance_api_key || ''}" placeholder="Binance API Key" />
            </div>
            <div class="form-group">
              <label class="form-label">Binance Pay Secret Key</label>
              <input type="password" name="binance_secret_key" class="form-control" value="${s.binance_secret_key || ''}" placeholder="Binance Secret Key" />
            </div>
          </div>

          <button type="submit" class="btn-primary" style="margin-top: 0.5rem;">
            💾 Save All Settings
          </button>
        </form>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: #ef4444;">Failed to load settings: ${e.message}</div>`;
    }
  },

  async handleSaveSettings(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const settings = Object.fromEntries(formData.entries());

    try {
      const res = await API.admin.updateSettings(settings);
      showToast(res.message || 'Settings saved successfully', 'success');
      // Refresh products cache on UI if profit margin changed
      App.loadProducts();
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    }
  },

  async promptBalance(userId, email) {
    const amountStr = prompt(`Enter amount to ADD for ${email} (in $):`, '10');
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      showToast('Invalid amount', 'error');
      return;
    }

    try {
      const res = await API.admin.updateUserBalance(userId, amount, 'add', 'Admin Manual Credit');
      showToast(res.message || 'Balance updated', 'success');
      this.renderUsers(document.getElementById('adminModalContent'));
      // If current user modified own balance, update state
      if (State.user && State.user.id === userId) {
        State.updateBalance(res.newBalance);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update balance', 'error');
    }
  }
};
