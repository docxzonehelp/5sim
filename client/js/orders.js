const OrdersManager = {
  activePollers: {},
  timers: {},

  init() {
    State.on('userChange', (user) => {
      if (user) {
        this.fetchActiveOrders();
        this.startGlobalPoller();
      } else {
        this.stopAllPollers();
        this.renderActiveOrders([]);
      }
    });

    State.on('ordersChange', (orders) => {
      this.renderActiveOrders(orders);
    });
  },

  async fetchActiveOrders() {
    if (!State.user) return;
    try {
      const res = await API.sim.getActiveOrders();
      State.setActiveOrders(res.orders || []);
    } catch (e) {
      console.warn('Failed to load active orders:', e);
    }
  },

  startGlobalPoller() {
    if (this.globalInterval) clearInterval(this.globalInterval);
    this.globalInterval = setInterval(() => {
      if (State.user && State.activeOrders.length > 0) {
        this.pollOrders();
      }
    }, 4000);
  },

  stopAllPollers() {
    if (this.globalInterval) clearInterval(this.globalInterval);
    Object.values(this.timers).forEach(t => clearInterval(t));
    this.timers = {};
  },

  async pollOrders() {
    for (const order of State.activeOrders) {
      if (order.status === 'PENDING' || order.status === 'RECEIVED') {
        try {
          const res = await API.sim.checkOrder(order.id);
          if (res.order) {
            // Check if status changed or SMS arrived
            if (!order.sms_code && res.order.sms_code) {
              this.playNotificationSound();
              showToast(`🎉 SMS Code Received for ${order.product.toUpperCase()}: ${res.order.sms_code}`, 'success');
            }

            // Update balance if changed due to auto-refund
            if (res.balance !== undefined && State.user) {
              State.updateBalance(res.balance);
            }

            // Update local order
            const updated = State.activeOrders.map(o => o.id === order.id ? res.order : o);
            // If order completed or cancelled, filter it out if no longer active
            const filtered = updated.filter(o => o.status === 'PENDING' || o.status === 'RECEIVED');
            State.setActiveOrders(filtered);
          }
        } catch (e) {
          console.warn(`Error polling order #${order.id}:`, e);
        }
      }
    }
  },

  renderActiveOrders(orders) {
    const container = document.getElementById('activeOrdersContainer');
    if (!container) return;

    if (!orders || orders.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = orders.map(order => {
      const icon = getServiceIcon(order.product);
      const isReceived = !!order.sms_code;

      return `
        <div class="active-order-card" id="order_card_${order.id}">
          <div class="order-main-info">
            <div class="order-service-badge">${icon}</div>
            <div class="order-details">
              <div class="order-number-row">
                <span class="order-phone">${order.phone}</span>
                <button class="btn-copy-sm" onclick="copyToClipboard('${order.phone}', 'Phone number')">
                  📋 Copy
                </button>
              </div>
              <div class="order-meta">
                <span>${order.country.toUpperCase()}</span> • 
                <span>${order.product.toUpperCase()}</span> • 
                <span>${order.operator}</span> • 
                <span class="order-status-badge ${isReceived ? 'badge-received' : 'badge-pending'}">
                  ${order.status}
                </span>
              </div>
            </div>
          </div>

          <div class="order-sms-box">
            ${isReceived ? `
              <div class="sms-code-received">
                <div>
                  <div style="font-size: 0.72rem; color: #10b981; font-weight: 700; text-transform: uppercase;">SMS Code</div>
                  <div class="sms-otp-display">${order.sms_code}</div>
                </div>
                <button class="btn-copy-sm" style="background: #10b981; color: white;" onclick="copyToClipboard('${order.sms_code}', 'SMS Code')">
                  📋 Copy Code
                </button>
              </div>
            ` : `
              <div class="sms-waiting-text">
                <div class="status-dot"></div>
                <span>Waiting for incoming SMS code...</span>
              </div>
            `}
            <div class="order-timer" id="timer_${order.id}" style="font-family: var(--font-mono); font-size: 0.95rem; color: #94a3b8;">
              --:--
            </div>
          </div>

          <div class="order-actions">
            ${!isReceived ? `
              <button class="btn-cancel-order" onclick="OrdersManager.handleCancel(${order.id})">
                ✕ Cancel & Refund
              </button>
            ` : `
              <button class="btn-finish-order" onclick="OrdersManager.handleFinish(${order.id})">
                ✓ Done / Finish
              </button>
            `}
            <button class="btn-cancel-order" style="background: transparent; border-color: #64748b; color: #94a3b8;" onclick="OrdersManager.handleBan(${order.id})" title="Mark number as already used / bad">
              🚫 Ban
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Start countdown timers
    orders.forEach(order => this.startTimer(order));
  },

  startTimer(order) {
    if (this.timers[order.id]) clearInterval(this.timers[order.id]);

    const el = document.getElementById(`timer_${order.id}`);
    if (!el) return;

    const expiresAt = order.expires_at ? new Date(order.expires_at).getTime() : (Date.now() + 15 * 60 * 1000);

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;

      el.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      if (remaining <= 0) {
        clearInterval(this.timers[order.id]);
        el.innerText = '00:00';
      }
    };

    updateTimer();
    this.timers[order.id] = setInterval(updateTimer, 1000);
  },

  async handleCancel(orderId) {
    try {
      const card = document.getElementById(`order_card_${orderId}`);
      if (card) {
        const cancelBtn = card.querySelector('.btn-cancel-order');
        if (cancelBtn) {
          cancelBtn.disabled = true;
          cancelBtn.innerText = '⏳ Cancelling...';
        }
      }

      const res = await API.sim.cancelOrder(orderId);
      showToast(res.message || 'Order cancelled and balance refunded!', 'success');
      if (res.new_balance !== undefined) {
        State.updateBalance(res.new_balance);
      }
      // Immediately remove from active orders
      const remaining = State.activeOrders.filter(o => o.id !== orderId);
      State.setActiveOrders(remaining);
      await this.fetchActiveOrders();
    } catch (e) {
      showToast(e.message || 'Failed to cancel order', 'error');
      const card = document.getElementById(`order_card_${orderId}`);
      if (card) {
        const cancelBtn = card.querySelector('.btn-cancel-order');
        if (cancelBtn) {
          cancelBtn.disabled = false;
          cancelBtn.innerText = '✕ Cancel & Refund';
        }
      }
    }
  },

  async handleFinish(orderId) {
    try {
      const res = await API.sim.finishOrder(orderId);
      showToast(res.message || 'Order marked as finished', 'success');
      const remaining = State.activeOrders.filter(o => o.id !== orderId);
      State.setActiveOrders(remaining);
      await this.fetchActiveOrders();
    } catch (e) {
      showToast(e.message || 'Failed to finish order', 'error');
    }
  },

  async handleBan(orderId) {
    try {
      const card = document.getElementById(`order_card_${orderId}`);
      if (card) {
        const banBtn = card.querySelector('button[title*="bad"]');
        if (banBtn) {
          banBtn.disabled = true;
          banBtn.innerText = '⏳ Banning...';
        }
      }

      const res = await API.sim.banOrder(orderId);
      showToast(res.message || 'Number banned and balance refunded!', 'success');
      if (res.new_balance !== undefined) {
        State.updateBalance(res.new_balance);
      }
      const remaining = State.activeOrders.filter(o => o.id !== orderId);
      State.setActiveOrders(remaining);
      await this.fetchActiveOrders();
    } catch (e) {
      showToast(e.message || 'Failed to ban order', 'error');
      const card = document.getElementById(`order_card_${orderId}`);
      if (card) {
        const banBtn = card.querySelector('button[title*="bad"]');
        if (banBtn) {
          banBtn.disabled = false;
          banBtn.innerText = '🚫 Ban';
        }
      }
    }
  },

  playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  }
};
