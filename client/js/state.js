const State = {
  user: null,
  currencySymbol: '$',
  selectedCountry: 'any',
  selectedProduct: null,
  selectedOperator: 'any',
  countries: {},
  products: {},
  activeOrders: [],
  pollingInterval: null,
  listeners: {},

  init() {
    // Check saved country
    const savedCountry = localStorage.getItem('5sim_country');
    if (savedCountry) {
      this.selectedCountry = savedCountry;
    } else {
      this.selectedCountry = 'any';
    }
  },

  setUser(user) {
    this.user = user;
    this.emit('userChange', user);
  },

  updateBalance(newBalance) {
    if (this.user) {
      this.user.balance = newBalance;
      this.emit('balanceChange', newBalance);
    }
  },

  setSelectedCountry(country) {
    this.selectedCountry = country;
    localStorage.setItem('5sim_country', country);
    this.emit('countryChange', country);
  },

  setSelectedProduct(product) {
    this.selectedProduct = product;
    this.emit('productChange', product);
  },

  setSelectedOperator(operator) {
    this.selectedOperator = operator;
    this.emit('operatorChange', operator);
  },

  setActiveOrders(orders) {
    this.activeOrders = orders;
    this.emit('ordersChange', orders);
  },

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
};

State.init();
