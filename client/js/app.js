// ==========================================
// 5SIM Reseller Portal - Main Application JS
// ==========================================

// Service Brand Logos Map (Official CDN SVG Icons)
const SERVICE_BRAND_LOGOS = {
  whatsapp: 'https://cdn.simpleicons.org/whatsapp/25D366',
  telegram: 'https://cdn.simpleicons.org/telegram/26A5E4',
  facebook: 'https://cdn.simpleicons.org/facebook/1877F2',
  instagram: 'https://cdn.simpleicons.org/instagram/E4405F',
  tiktok: 'https://cdn.simpleicons.org/tiktok/FFFFFF',
  google: 'https://cdn.simpleicons.org/google/4285F4',
  gmail: 'https://cdn.simpleicons.org/gmail/EA4335',
  openai: 'https://cdn.simpleicons.org/openai/10A37F',
  chatgpt: 'https://cdn.simpleicons.org/openai/10A37F',
  claude: 'https://cdn.simpleicons.org/anthropic/D97706',
  claudeai: 'https://cdn.simpleicons.org/anthropic/D97706',
  discord: 'https://cdn.simpleicons.org/discord/5865F2',
  twitter: 'https://cdn.simpleicons.org/x/FFFFFF',
  x: 'https://cdn.simpleicons.org/x/FFFFFF',
  steam: 'https://cdn.simpleicons.org/steam/00ADEE',
  tinder: 'https://cdn.simpleicons.org/tinder/FE3C72',
  netflix: 'https://cdn.simpleicons.org/netflix/E50914',
  spotify: 'https://cdn.simpleicons.org/spotify/1DB954',
  amazon: 'https://cdn.simpleicons.org/amazon/FF9900',
  apple: 'https://cdn.simpleicons.org/apple/FFFFFF',
  microsoft: 'https://cdn.simpleicons.org/microsoft/00A4EF',
  uber: 'https://cdn.simpleicons.org/uber/FFFFFF',
  snapchat: 'https://cdn.simpleicons.org/snapchat/FFFC00',
  linkedin: 'https://cdn.simpleicons.org/linkedin/0A66C2',
  yahoo: 'https://cdn.simpleicons.org/yahoo/6001D2',
  vkontakte: 'https://cdn.simpleicons.org/vk/0077FF',
  vk: 'https://cdn.simpleicons.org/vk/0077FF',
  viber: 'https://cdn.simpleicons.org/viber/7360F2',
  line: 'https://cdn.simpleicons.org/line/00C300',
  kakaotalk: 'https://cdn.simpleicons.org/kakaotalk/FFCD00',
  wechat: 'https://cdn.simpleicons.org/wechat/07C160',
  roblox: 'https://cdn.simpleicons.org/roblox/FFFFFF',
  twitch: 'https://cdn.simpleicons.org/twitch/9146FF',
  reddit: 'https://cdn.simpleicons.org/reddit/FF4500',
  github: 'https://cdn.simpleicons.org/github/FFFFFF',
  gitlab: 'https://cdn.simpleicons.org/gitlab/FC6D26',
  pinterest: 'https://cdn.simpleicons.org/pinterest/BD081C',
  signal: 'https://cdn.simpleicons.org/signal/3A76F0',
  proton: 'https://cdn.simpleicons.org/proton/6D4AFF',
  protonmail: 'https://cdn.simpleicons.org/proton/6D4AFF',
  alibaba: 'https://cdn.simpleicons.org/alibaba/FF6A00',
  airbnb: 'https://cdn.simpleicons.org/airbnb/FF5A5F',
  ebay: 'https://cdn.simpleicons.org/ebay/E53238',
  paypal: 'https://cdn.simpleicons.org/paypal/00457C',
  youtube: 'https://cdn.simpleicons.org/youtube/FF0000',
  binance: 'https://cdn.simpleicons.org/binance/F0B90B',
  crypto: 'https://cdn.simpleicons.org/bitcoin/F7931A',
  deliveroo: 'https://cdn.simpleicons.org/deliveroo/00CDBC'
};

const SERVICE_EMOJIS = {
  whatsapp: '💬', telegram: '✈️', google: '🔍', gmail: '📧',
  openai: '🤖', chatgpt: '🤖', claude: '🧠', facebook: '👥',
  instagram: '📸', tiktok: '🎵', twitter: '🐦', discord: '🎮',
  steam: '🕹️', tinder: '🔥', netflix: '🎬', amazon: '📦',
  apple: '🍏', microsoft: '🪟', yahoo: '🟣', uber: '🚗',
  viber: '📞', line: '🟢', kakaotalk: '🟡', vkontakte: '🔵'
};

function getServiceIcon(serviceName) {
  if (!serviceName) return '📱';
  const clean = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const logoUrl = SERVICE_BRAND_LOGOS[clean];
  const fallbackEmoji = SERVICE_EMOJIS[clean] || '📱';

  if (logoUrl) {
    return `<img src="${logoUrl}" class="service-logo-img" alt="${serviceName}" onerror="this.outerHTML='${fallbackEmoji}'" />`;
  }
  return fallbackEmoji;
}

// Country ISO Map for FlagCDN
const COUNTRY_ISO_MAP = {
  usa: 'us', russia: 'ru', england: 'gb', uk: 'gb', india: 'in', indonesia: 'id',
  germany: 'de', france: 'fr', vietnam: 'vn', brazil: 'br', canada: 'ca',
  netherlands: 'nl', spain: 'es', philippines: 'ph', bangladesh: 'bd', pakistan: 'pk',
  poland: 'pl', ukraine: 'ua', kazakhstan: 'kz', nigeria: 'ng', turkey: 'tr',
  thailand: 'th', mexico: 'mx', colombia: 'co', argentina: 'ar', egypt: 'eg',
  southafrica: 'za', kenya: 'ke', morocco: 'ma', algeria: 'dz', malaysia: 'my',
  italy: 'it', sweden: 'se', romania: 'ro', japan: 'jp', china: 'cn', singapore: 'sg',
  australia: 'au', afghanistan: 'af', albania: 'al', angola: 'ao', austria: 'at',
  armenia: 'am', azerbaijan: 'az', bahrain: 'bh', belarus: 'by', belgium: 'be',
  bolivia: 'bo', bosnia: 'ba', bulgaria: 'bg', cambodia: 'kh', cameroon: 'cm',
  chile: 'cl', cyprus: 'cy', czech: 'cz', denmark: 'dk', ecuador: 'ec', estonia: 'ee',
  ethiopia: 'et', finland: 'fi', georgia: 'ge', ghana: 'gh', greece: 'gr',
  guatemala: 'gt', hongkong: 'hk', hungary: 'hu', iceland: 'is', iraq: 'iq',
  ireland: 'ie', israel: 'il', ivorycoast: 'ci', jordan: 'jo', kuwait: 'kw',
  kyrgyzstan: 'kg', laos: 'la', latvia: 'lv', lebanon: 'lb', lithuania: 'lt',
  luxembourg: 'lu', madagascar: 'mg', moldova: 'md', mongolia: 'mn', montenegro: 'me',
  myanmar: 'mm', nepal: 'np', newzealand: 'nz', nicaragua: 'ni', norway: 'no',
  oman: 'om', panama: 'pa', paraguay: 'py', peru: 'pe', portugal: 'pt', qatar: 'qa',
  saudiarabia: 'sa', senegal: 'sn', serbia: 'rs', slovakia: 'sk', slovenia: 'si',
  southkorea: 'kr', srilanka: 'lk', switzerland: 'ch', taiwan: 'tw', tajikistan: 'tj',
  tanzania: 'tz', tunisia: 'tn', uae: 'ae', uganda: 'ug', uruguay: 'uy',
  uzbekistan: 'uz', venezuela: 've', yemen: 'ye', zambia: 'zm', zimbabwe: 'zw'
};

function getCountryFlagHtml(countryName, isoRaw) {
  if (!countryName || countryName.toLowerCase() === 'any') {
    return `<span style="font-size: 1.25rem;">🌐</span>`;
  }
  const clean = countryName.toLowerCase().replace(/[^a-z0-9]/g, '');
  let iso = COUNTRY_ISO_MAP[clean];

  if (!iso && isoRaw) {
    iso = (typeof isoRaw === 'object') ? Object.keys(isoRaw)[0] : (typeof isoRaw === 'string' ? isoRaw : '');
  }
  iso = (iso || 'un').toLowerCase();

  return `<img src="https://flagcdn.com/w40/${iso}.png" class="country-flag-img" alt="${countryName}" onerror="this.outerHTML='🌐'" />`;
}

// Country-Specific Favorites (Featured ❤️) Manager
const Favorites = {
  getCountries() {
    try {
      return JSON.parse(localStorage.getItem('5sim_fav_countries') || '[]');
    } catch (e) {
      return [];
    }
  },
  toggleCountry(key) {
    const list = this.getCountries();
    const cleanKey = key.toLowerCase();
    const idx = list.indexOf(cleanKey);
    if (idx !== -1) list.splice(idx, 1);
    else list.push(cleanKey);
    localStorage.setItem('5sim_fav_countries', JSON.stringify(list));
    return idx === -1;
  },

  // Map of { "country_code": ["service1", "service2"] }
  getCountryProducts(country = 'any') {
    try {
      const map = JSON.parse(localStorage.getItem('5sim_fav_country_products_map') || '{}');
      return map[country.toLowerCase()] || [];
    } catch (e) {
      return [];
    }
  },
  isProductFav(country = 'any', product) {
    const list = this.getCountryProducts(country);
    return list.includes(product.toLowerCase());
  },
  toggleCountryProduct(country = 'any', product) {
    try {
      const map = JSON.parse(localStorage.getItem('5sim_fav_country_products_map') || '{}');
      const cKey = country.toLowerCase();
      const pKey = product.toLowerCase();
      if (!map[cKey]) map[cKey] = [];
      const idx = map[cKey].indexOf(pKey);
      if (idx !== -1) {
        map[cKey].splice(idx, 1);
      } else {
        map[cKey].push(pKey);
      }
      localStorage.setItem('5sim_fav_country_products_map', JSON.stringify(map));
      return idx === -1; // true if added
    } catch (e) {
      return false;
    }
  }
};

const App = {
  allCountries: {},
  allProducts: {},
  currentPrices: {},
  serviceSortMode: 'popular', // 'popular', 'featured', 'price_low', 'price_high'
  countryFilterMode: 'all',   // 'all', 'fav'

  async init() {
    this.setupEventListeners();
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('userDropdownMenu');
      const toggleBtn = document.getElementById('userMenuDropdownBtn');
      if (dropdown && dropdown.classList.contains('show')) {
        if (!dropdown.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
          dropdown.classList.remove('show');
        }
      }
    });

    // Set initial mobile view to services
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) mainContainer.classList.add('tab-services');

    // Listen to state changes first
    State.on('userChange', (user) => this.renderUserUI(user));
    State.on('balanceChange', (bal) => this.renderBalanceUI(bal));
    State.on('countryChange', (country) => {
      const isAny = !country || country.toLowerCase() === 'any';
      const flag = getCountryFlagHtml(country);
      const title = isAny ? 'Global (Any Country)' : country.toUpperCase();
      document.getElementById('selectedCountryBadge').innerHTML = `${flag} <span style="margin-left: 5px;">${title}</span>`;
      this.loadProducts();
    });

    OrdersManager.init();

    // Check Auth session & render state
    await this.checkAuth();
    this.renderUserUI(State.user);

    // Load Countries & Products
    await this.loadCountries();
    await this.loadProducts();
  },

  // Mobile Tab Switching
  switchMobileTab(tab) {
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
      mainContainer.classList.remove('tab-services', 'tab-countries');
      mainContainer.classList.add(`tab-${tab}`);
    }

    document.getElementById('tabBtnServices')?.classList.toggle('active', tab === 'services');
    document.getElementById('tabBtnCountries')?.classList.toggle('active', tab === 'countries');
    document.getElementById('mBarServices')?.classList.toggle('active', tab === 'services');
    document.getElementById('mBarCountries')?.classList.toggle('active', tab === 'countries');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  handleMobileAuthClick() {
    if (State.user) {
      if (confirm(`Logged in as ${State.user.email}\nDo you want to log out?`)) {
        this.handleLogout();
      }
    } else {
      this.openModal('authModal');
    }
  },

  copyText(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Copied: ' + text, 'success');
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.showToast('Failed to copy', 'error');
    });
  },

  setupEventListeners() {
    // Country search filter
    const countrySearch = document.getElementById('countrySearch');
    if (countrySearch) {
      countrySearch.addEventListener('input', (e) => this.filterCountries(e.target.value));
    }

    // Service search filter
    const serviceSearch = document.getElementById('serviceSearch');
    if (serviceSearch) {
      serviceSearch.addEventListener('input', (e) => this.filterServices(e.target.value));
    }

    // Deposit Amount Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const input = document.getElementById('depositAmountInput');
        if (input) input.value = btn.dataset.amount;
      });
    });

    // Payment Gateway tabs in deposit modal
    document.querySelectorAll('.gateway-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.gateway-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const gateway = tab.dataset.gateway;
        document.getElementById('selectedGatewayInput').value = gateway;
      });
    });
  },

  async checkAuth() {
    const token = API.getToken();
    if (token) {
      try {
        const res = await API.auth.getProfile();
        if (res.user) {
          State.setUser(res.user);
        }
      } catch (e) {
        API.setToken(null);
        State.setUser(null);
      }
    } else {
      State.setUser(null);
    }
  },

  renderUserUI(user) {
    const authActions = document.getElementById('authActions');
    const userActions = document.getElementById('userActions');
    const adminNavItem = document.getElementById('adminNavItem');
    const mBarAdmin = document.getElementById('mBarAdmin');
    const mBarAuthText = document.getElementById('mBarAuthText');

    if (user) {
      authActions.style.display = 'none';
      userActions.style.display = 'flex';
      document.getElementById('userEmailDisplay').innerText = user.email;
      document.getElementById('userAvatarInitial').innerText = user.email.charAt(0).toUpperCase();
      if (document.getElementById('dropdownAccountId')) {
        document.getElementById('dropdownAccountId').innerText = `ID: ${user.account_id || '-------'}`;
      }
      this.renderBalanceUI(user.balance);

      if (user.role === 'admin') {
        adminNavItem.style.display = 'block';
        if (mBarAdmin) mBarAdmin.style.display = 'flex';
      } else {
        adminNavItem.style.display = 'none';
        if (mBarAdmin) mBarAdmin.style.display = 'none';
      }

      if (mBarAuthText) mBarAuthText.innerText = 'Logout';
    } else {
      authActions.style.display = 'flex';
      userActions.style.display = 'none';
      adminNavItem.style.display = 'none';
      if (mBarAdmin) mBarAdmin.style.display = 'none';
      if (mBarAuthText) mBarAuthText.innerText = 'Login';
      this.renderBalanceUI(0);
    }
  },

  renderBalanceUI(balance) {
    const el = document.getElementById('walletBalanceDisplay');
    if (el) {
      el.innerText = `$${(balance || 0).toFixed(2)}`;
    }
  },

  async loadCountries() {
    try {
      const res = await API.sim.getCountries();
      this.allCountries = res.countries || {};
      this.renderCountryList(this.allCountries);
    } catch (e) {
      console.error('Failed to load countries:', e);
    }
  },

  setCountryFilter(mode) {
    this.countryFilterMode = mode;
    document.getElementById('btnAllCountries')?.classList.toggle('active', mode === 'all');
    document.getElementById('btnFavCountries')?.classList.toggle('active', mode === 'fav');
    this.renderCountryList(this.allCountries);
  },

  toggleFavCountry(key, event) {
    if (event) event.stopPropagation();
    Favorites.toggleCountry(key);
    this.renderCountryList(this.allCountries);
  },

  renderCountryList(countriesObj) {
    const container = document.getElementById('countryListContainer');
    if (!container) return;

    let entries = Object.entries(countriesObj);
    const favs = Favorites.getCountries();
    const isGlobalSelected = !State.selectedCountry || State.selectedCountry === 'any';
    const isGlobalFav = favs.includes('any');

    let html = '';

    // If 'all' mode, always prepend the Global (Any) Country option
    if (this.countryFilterMode === 'all' || (this.countryFilterMode === 'fav' && isGlobalFav)) {
      html += `
        <div class="country-item global-country-item ${isGlobalSelected ? 'active' : ''}" onclick="App.selectCountry('any')">
          <div class="country-info">
            <span class="country-flag" style="font-size: 1.25rem;">🌐</span>
            <span class="country-name" style="font-weight: 700;">Global (Any Country)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="country-qty" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-weight: 700;">ALL</span>
            <button class="btn-fav-icon ${isGlobalFav ? 'active' : ''}" onclick="App.toggleFavCountry('any', event)" title="${isGlobalFav ? 'Remove from favorites' : 'Add to favorites'}">
              ${isGlobalFav ? '❤️' : '🤍'}
            </button>
          </div>
        </div>
      `;
    }

    // Filter if fav mode
    if (this.countryFilterMode === 'fav') {
      entries = entries.filter(([k]) => favs.includes(k.toLowerCase()));
      if (entries.length === 0 && !isGlobalFav) {
        container.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: #94a3b8; font-size: 0.85rem;">No favorite countries yet.<br>Click ❤️ on any country to add!</div>';
        return;
      }
    }

    // Sort: Favorites first, then alphabetical
    entries.sort((a, b) => {
      const aFav = favs.includes(a[0].toLowerCase());
      const bFav = favs.includes(b[0].toLowerCase());
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a[0].localeCompare(b[0]);
    });

    html += entries.map(([key, data]) => {
      const isSelected = key.toLowerCase() === State.selectedCountry.toLowerCase();
      const flagHtml = getCountryFlagHtml(key, data.iso);
      const isFav = favs.includes(key.toLowerCase());
      const isoVal = (data && data.iso && typeof data.iso === 'object') 
        ? Object.keys(data.iso)[0] 
        : (typeof data?.iso === 'string' ? data.iso : '');

      return `
        <div class="country-item ${isSelected ? 'active' : ''}" onclick="App.selectCountry('${key}')">
          <div class="country-info">
            <span class="country-flag">${flagHtml}</span>
            <span class="country-name">${key}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="country-qty">${isoVal ? isoVal.toUpperCase() : ''}</span>
            <button class="btn-fav-icon ${isFav ? 'active' : ''}" onclick="App.toggleFavCountry('${key}', event)" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  },

  filterCountries(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.renderCountryList(this.allCountries);
      return;
    }

    const filtered = {};
    for (const [key, data] of Object.entries(this.allCountries)) {
      const isoVal = (data && data.iso && typeof data.iso === 'object') 
        ? Object.keys(data.iso)[0] 
        : (typeof data?.iso === 'string' ? data.iso : '');
      if (key.toLowerCase().includes(q) || (isoVal && isoVal.toLowerCase().includes(q))) {
        filtered[key] = data;
      }
    }
    this.renderCountryList(filtered);
  },

  selectCountry(country) {
    State.setSelectedCountry(country);
    document.querySelectorAll('.country-item').forEach(el => {
      if (country === 'any') {
        el.classList.toggle('active', el.classList.contains('global-country-item'));
      } else {
        el.classList.toggle('active', !el.classList.contains('global-country-item') && el.innerText.toLowerCase().includes(country.toLowerCase()));
      }
    });

    // On mobile devices, auto switch to services tab after country selection
    if (window.innerWidth <= 900) {
      this.switchMobileTab('services');
    }
  },

  setServiceSort(mode) {
    this.serviceSortMode = mode;
    this.renderServices(this.allProducts);
  },

  toggleFavProduct(productKey, event) {
    if (event) event.stopPropagation();
    Favorites.toggleCountryProduct(State.selectedCountry, productKey);
    this.renderServices(this.allProducts);
  },

  async loadProducts() {
    const container = document.getElementById('servicesGrid');
    if (container) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94a3b8;">Loading available services & rates...</div>';
    }

    try {
      const countryParam = State.selectedCountry || 'any';
      const res = await API.sim.getProducts(countryParam, 'any');
      this.allProducts = res.products || {};
      this.renderServices(this.allProducts);
    } catch (e) {
      if (container) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444;">Failed to load services: ${e.message}</div>`;
      }
    }
  },

  renderServices(productsObj) {
    const container = document.getElementById('servicesGrid');
    if (!container) return;

    let entries = Object.entries(productsObj);
    const countryKey = State.selectedCountry || 'any';
    const countryLabel = countryKey === 'any' ? 'Global' : countryKey.toUpperCase();

    if (entries.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94a3b8;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <div>No numbers currently available in <b>${countryLabel}</b>.</div>
          <div style="font-size: 0.8rem; margin-top: 0.3rem;">Please choose another country from the left list.</div>
        </div>
      `;
      return;
    }

    const popularKeys = ['whatsapp', 'telegram', 'google', 'gmail', 'openai', 'chatgpt', 'tiktok', 'instagram', 'facebook', 'discord', 'steam', 'twitter', 'tinder', 'netflix', 'spotify'];

    // 1. Featured Filter: If mode is "featured", ONLY show favorited services for the selected country!
    if (this.serviceSortMode === 'featured') {
      entries = entries.filter(([k]) => Favorites.isProductFav(countryKey, k));
      if (entries.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1.5rem; color: #94a3b8;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">❤️</div>
            <h3 style="font-family: var(--font-heading); color: #f8fafc; margin-bottom: 0.35rem;">No Featured Services in ${countryLabel}</h3>
            <p style="font-size: 0.85rem; color: #94a3b8; max-width: 420px; margin: 0 auto;">
              You have not favorited any services for <b>${countryLabel}</b> yet. Click the <b>❤️ Love icon</b> on any service to add it as featured!
            </p>
          </div>
        `;
        return;
      }
    } else if (this.serviceSortMode === 'popular') {
      entries.sort((a, b) => {
        const aPop = popularKeys.includes(a[0].toLowerCase()) ? -1 : 1;
        const bPop = popularKeys.includes(b[0].toLowerCase()) ? -1 : 1;
        if (aPop !== bPop) return aPop - bPop;
        return a[0].localeCompare(b[0]);
      });
    } else if (this.serviceSortMode === 'price_low') {
      entries.sort((a, b) => {
        const pA = a[1].Price !== undefined ? a[1].Price : 999999;
        const pB = b[1].Price !== undefined ? b[1].Price : 999999;
        return pA - pB;
      });
    } else if (this.serviceSortMode === 'price_high') {
      entries.sort((a, b) => {
        const pA = a[1].Price !== undefined ? a[1].Price : 0;
        const pB = b[1].Price !== undefined ? b[1].Price : 0;
        return pB - pA;
      });
    }

    container.innerHTML = entries.map(([key, data]) => {
      const icon = getServiceIcon(key);
      const isSelected = State.selectedProduct === key;
      const isFav = Favorites.isProductFav(countryKey, key);

      return `
        <div class="service-card ${isSelected ? 'selected' : ''}" onclick="App.openBuyDrawer('${key}')">
          <div class="service-header">
            <div class="service-header-left">
              <div class="service-icon">${icon}</div>
              <div class="service-name" title="${key}">${key}</div>
            </div>
            <button class="btn-fav-icon ${isFav ? 'active' : ''}" onclick="App.toggleFavProduct('${key}', event)" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>
          <div class="service-footer">
            <span class="service-qty">${data.Qty !== undefined ? data.Qty + ' pcs' : 'Available'}</span>
            <span class="service-price">${data.Price ? '$' + data.Price : 'Check'}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  filterServices(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.renderServices(this.allProducts);
      return;
    }

    const filtered = {};
    for (const [key, data] of Object.entries(this.allProducts)) {
      if (key.toLowerCase().includes(q)) {
        filtered[key] = data;
      }
    }
    this.renderServices(filtered);
  },

  async openBuyDrawer(product) {
    State.setSelectedProduct(product);
    this.renderServices(this.allProducts);

    const drawer = document.getElementById('buyModal');
    const title = document.getElementById('buyModalTitle');
    const body = document.getElementById('buyModalBody');

    const countryKey = State.selectedCountry || 'any';
    const countryTitle = countryKey === 'any' ? 'GLOBAL' : countryKey.toUpperCase();

    title.innerText = `Buy ${product.toUpperCase()} Number (${countryTitle})`;
    body.innerHTML = '<div style="text-align: center; padding: 2rem; color: #94a3b8;">Fetching available operators and live pricing...</div>';
    drawer.classList.add('active');

    try {
      const res = await API.sim.getPrices(countryKey, product);
      const prices = res.prices || {};
      
      // Look for country prices or fallback to first available country in prices matrix
      let countryPrices = prices[countryKey] && prices[countryKey][product];
      let resolvedCountry = countryKey;

      if (!countryPrices) {
        // If in global mode or not directly under countryKey, find the country with the cheapest available price
        let minPrice = Infinity;
        let bestCountry = null;
        
        for (const [cName, cData] of Object.entries(prices)) {
          if (cData && cData[product]) {
            // Find minimum cost among operators with stock > 0
            for (const [opName, opData] of Object.entries(cData[product])) {
              if ((opData.count || 0) > 0 && opData.cost < minPrice) {
                minPrice = opData.cost;
                bestCountry = cName;
              }
            }
          }
        }
        
        // Fallback if no stock found anywhere, just find absolute minimum cost
        if (!bestCountry) {
          for (const [cName, cData] of Object.entries(prices)) {
            if (cData && cData[product]) {
              for (const [opName, opData] of Object.entries(cData[product])) {
                if (opData.cost < minPrice) {
                  minPrice = opData.cost;
                  bestCountry = cName;
                }
              }
            }
          }
        }
        
        // If still nothing, just pick first country alphabetically (fallback)
        if (!bestCountry) {
            bestCountry = Object.keys(prices)[0];
        }

        if (bestCountry && prices[bestCountry] && prices[bestCountry][product]) {
          countryPrices = prices[bestCountry][product];
          resolvedCountry = bestCountry;
        }
      }

      if (!countryPrices || Object.keys(countryPrices).length === 0) {
        body.innerHTML = `
          <div style="text-align: center; padding: 1.5rem; color: #94a3b8;">
            <p>No active operators found for this service right now.</p>
            <p style="font-size: 0.8rem; margin-top: 0.5rem;">Please check back soon or try another country from the left sidebar.</p>
          </div>
        `;
        return;
      }

      const operators = Object.entries(countryPrices);
      // Sort so available stock comes first
      operators.sort((a, b) => {
        const aCount = a[1].count || 0;
        const bCount = b[1].count || 0;
        return bCount - aCount;
      });

      // Find first operator with stock > 0, else first operator
      const initialOpIndex = operators.findIndex(op => (op[1].count || 0) > 0);
      const activeIndex = initialOpIndex !== -1 ? initialOpIndex : 0;
      const initialOp = operators[activeIndex];
      const initialStock = initialOp[1].count || 0;

      body.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; background: var(--bg-input); padding: 1rem; border-radius: var(--radius-md);">
          <div class="service-icon" style="width: 48px; height: 48px; font-size: 1.8rem;">${getServiceIcon(product)}</div>
          <div>
            <h3 style="font-family: var(--font-heading); text-transform: uppercase;">${product}</h3>
            <p style="font-size: 0.82rem; color: #94a3b8; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
              Country: <b>${resolvedCountry.toUpperCase()}</b> ${getCountryFlagHtml(resolvedCountry)}
            </p>
          </div>
        </div>

        <label class="form-label">Select Carrier / Operator:</label>
        <div class="operator-grid" id="operatorGrid">
          ${operators.map(([opName, opData], index) => {
            const hasStock = (opData.count || 0) > 0;
            const isSelected = index === activeIndex;
            return `
              <div class="operator-item ${isSelected ? 'active' : ''}" 
                   style="${!hasStock ? 'opacity: 0.55; border-color: rgba(239, 68, 68, 0.3);' : ''}"
                   data-operator="${opName}" 
                   data-cost="${opData.cost}" 
                   data-stock="${opData.count || 0}"
                   onclick="App.selectOperator('${opName}', ${opData.cost}, ${opData.count || 0}, '${resolvedCountry}')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 700; text-transform: uppercase;">${opName}</span>
                  <span style="font-size: 0.72rem; color: #10b981; font-weight: 600;">${opData.rate ? opData.rate + '%' : '99%'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.3rem;">
                  <span style="font-size: 0.75rem; color: ${hasStock ? '#94a3b8' : '#ef4444'}; font-weight: ${hasStock ? 'normal' : '600'};">
                    ${hasStock ? opData.count + ' in stock' : 'Out of Stock'}
                  </span>
                  <span style="font-family: var(--font-heading); font-weight: 800; color: #38bdf8; font-size: 1.1rem;">$${opData.cost}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="margin-top: 1.5rem; background: rgba(59, 130, 246, 0.08); border: 1px dashed #3b82f6; border-radius: var(--radius-md); padding: 0.85rem 1rem; font-size: 0.82rem; color: #93c5fd;">
          💡 <b>Guarantee:</b> If SMS does not arrive within 15 minutes or you cancel the number, your balance is <b>100% refunded instantly</b>.
        </div>

        <button id="confirmBuyBtn" class="btn-buy-now" 
                ${initialStock <= 0 ? 'disabled' : ''}
                onclick="App.confirmPurchase('${resolvedCountry}', '${initialOp[0]}', '${product}')">
          ${initialStock > 0 ? `⚡ Buy Number for $${initialOp[1].cost}` : '⚠️ Out of Stock (Choose another carrier)'}
        </button>
      `;
    } catch (e) {
      body.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 1.5rem;">Failed to load operators: ${e.message}</div>`;
    }
  },

  selectOperator(opName, cost, stock = 1, country = 'any') {
    document.querySelectorAll('.operator-item').forEach(el => {
      el.classList.toggle('active', el.dataset.operator === opName);
    });

    const btn = document.getElementById('confirmBuyBtn');
    if (btn) {
      if (stock <= 0) {
        btn.disabled = true;
        btn.innerText = '⚠️ Out of Stock (Choose another carrier)';
      } else {
        btn.disabled = false;
        btn.innerText = `⚡ Buy Number for $${cost}`;
        btn.setAttribute('onclick', `App.confirmPurchase('${country}', '${opName}', '${State.selectedProduct}')`);
      }
    }
  },

  async confirmPurchase(country, operator, product) {
    if (!State.user) {
      this.closeModal('buyModal');
      this.openModal('authModal');
      showToast('Please login or register to buy numbers', 'info');
      return;
    }

    const btn = document.getElementById('confirmBuyBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerText = '⏳ Reserving Number...';
    }

    try {
      const res = await API.sim.buy(country, operator, product);
      showToast('🎉 Number purchased successfully! SMS poller started.', 'success');
      this.closeModal('buyModal');

      // Update balance
      if (res.new_balance !== undefined) {
        State.updateBalance(res.new_balance);
      }

      // Add to active orders
      const currentOrders = State.activeOrders || [];
      State.setActiveOrders([res.order, ...currentOrders]);

      // Scroll to active order
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      showToast(e.message || 'Purchase failed', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerText = '⚡ Try Again';
      }
    }
  },

  // Modals management
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  // Dropdown Management
  toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdownMenu');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  },

  closeUserDropdown() {
    const dropdown = document.getElementById('userDropdownMenu');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  },

  // Settings Modal Management
  openSettingsModal() {
    this.openModal('settingsModal');
    this.switchSettingsTab('security');
  },

  closeSettingsModal() {
    this.closeModal('settingsModal');
  },

  switchSettingsTab(tab) {
    document.getElementById('tabBtnSecurity').classList.toggle('active', tab === 'security');
    document.getElementById('tabBtnHistory').classList.toggle('active', tab === 'history');
    document.getElementById('settingsTabSecurity').style.display = tab === 'security' ? 'block' : 'none';
    document.getElementById('settingsTabHistory').style.display = tab === 'history' ? 'block' : 'none';

    if (tab === 'history') {
      this.loadTradeHistory();
    }
  },

  async handleSetPassword(e) {
    e.preventDefault();
    const oldPasswordInput = document.getElementById('settingsOldPassword').value;
    const newPassword = document.getElementById('settingsNewPassword').value;
    const confirmPassword = document.getElementById('settingsConfirmPassword').value;

    if (newPassword !== confirmPassword) {
      this.showToast('Passwords do not match', 'error');
      return;
    }

    try {
      const payload = { newPassword };
      // If we decide to use oldPassword later for regular users:
      if (oldPasswordInput) payload.oldPassword = oldPasswordInput;
      
      const res = await API.request('/auth/set-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      this.showToast(res.message, 'success');
      document.getElementById('setPasswordForm').reset();
    } catch (e) {
      this.showToast(e.message || 'Failed to update password', 'error');
    }
  },

  async loadTradeHistory() {
    const list = document.getElementById('tradeHistoryList');
    list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">Loading history...</div>';
    
    try {
      const res = await API.request('/auth/trade-history');
      if (res.history && res.history.length > 0) {
        list.innerHTML = res.history.map(item => `
          <div class="history-item">
            <div class="history-item-left">
              <span class="history-title">${item.description}</span>
              <span class="history-date">${new Date(item.date).toLocaleString()}</span>
            </div>
            <div class="history-item-right">
              <span class="history-amount ${item.type === 'deposit' ? 'amount-positive' : 'amount-negative'}">${item.amount}</span>
              <span class="status-pill status-${item.status.toLowerCase()}">${item.status}</span>
            </div>
          </div>
        `).join('');
      } else {
        list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No trade history found.</div>';
      }
    } catch (e) {
      list.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load history</div>';
    }
  },

  switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotContainer = document.getElementById('forgotPasswordContainer');
    const googleBtn = document.getElementById('btnGoogleAuth');
    const authDivider = document.getElementById('authDivider');
    const authTabs = document.getElementById('authTabsContainer');
    const title = document.getElementById('authModalTitle');

    if (tab === 'login') {
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
      if (forgotContainer) forgotContainer.style.display = 'none';
      if (googleBtn) googleBtn.style.display = 'flex';
      if (authDivider) authDivider.style.display = 'flex';
      if (authTabs) authTabs.style.display = 'grid';
      title.innerText = 'Login to your Account';
    } else if (tab === 'register') {
      loginForm.style.display = 'none';
      registerForm.style.display = 'flex';
      if (forgotContainer) forgotContainer.style.display = 'none';
      if (googleBtn) googleBtn.style.display = 'flex';
      if (authDivider) authDivider.style.display = 'flex';
      if (authTabs) authTabs.style.display = 'grid';
      title.innerText = 'Create a New Account';
    } else if (tab === 'forgot') {
      loginForm.style.display = 'none';
      registerForm.style.display = 'none';
      if (googleBtn) googleBtn.style.display = 'none';
      if (authDivider) authDivider.style.display = 'none';
      if (authTabs) authTabs.style.display = 'none';
      if (forgotContainer) {
        forgotContainer.style.display = 'flex';
        document.getElementById('forgotRequestForm').style.display = 'flex';
        document.getElementById('forgotResetForm').style.display = 'none';
      }
      title.innerText = 'Reset Forgotten Password';
    }
  },

  handleGoogleSignIn() {
    if (!window.google || !window.google.accounts) {
      return showToast('Google Sign-In is loading, please try again in a moment.', 'error');
    }

    // This opens the REAL Google "Choose an account" popup
    const client = google.accounts.oauth2.initTokenClient({
      // ⚠️ IMPORTANT: You must replace this with your real Google Client ID from Google Cloud Console
      client_id: '401135041757-hcj9c3rduefapilad4k2nn1s011kedi8.apps.googleusercontent.com',
      scope: 'email profile openid',
      callback: async (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          const btn = document.getElementById('btnGoogleAuth');
          if (btn) {
            btn.innerHTML = '⏳ Authenticating...';
            btn.disabled = true;
          }

          try {
            // Fetch user's email and profile from Google using the access token
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            const profile = await res.json();
            
            if (profile.email) {
              await this.processGoogleAuth({ 
                email: profile.email, 
                name: profile.name || profile.email.split('@')[0], 
                credential: tokenResponse.access_token 
              });
            } else {
              showToast('Could not retrieve email from Google.', 'error');
            }
          } catch (error) {
            console.error('Google Auth Fetch Error:', error);
            showToast('Failed to verify Google account.', 'error');
          } finally {
            if (btn) {
              btn.innerHTML = '<img src="https://cdn.simpleicons.org/google/4285F4" width="18" style="margin-right:8px;"> Continue with Google';
              btn.disabled = false;
            }
          }
        }
      },
    });
    
    // Trigger the popup
    client.requestAccessToken();
  },

  async processGoogleAuth(payload) {
    try {
      const res = await API.auth.google(payload);
      API.setToken(res.token);
      State.setUser(res.user);
      this.closeModal('authModal');
      showToast(`🎉 Signed in with Google as ${res.user.email}!`, 'success');
    } catch (err) {
      showToast(err.message || 'Google Sign-In failed', 'error');
    }
  },

  async handleForgotPasswordRequest(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    const btn = document.getElementById('btnGetResetCode');
    btn.disabled = true;
    btn.innerText = '⏳ Generating Code...';

    try {
      const res = await API.auth.forgotPassword(email);
      showToast('Verification code generated!', 'success');

      // Switch to Step 2
      document.getElementById('forgotRequestForm').style.display = 'none';
      document.getElementById('forgotResetForm').style.display = 'flex';
      
      const codeInput = document.getElementById('resetOtpCode');
      if (codeInput) {
        codeInput.value = ''; // clear any old code
        codeInput.focus();
      }
    } catch (err) {
      showToast(err.message || 'Failed to request reset code', 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Send Reset Code';
    }
  },

  async handlePasswordResetSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    const code = document.getElementById('resetOtpCode').value;
    const newPass = document.getElementById('resetNewPassword').value;
    const newPassConfirm = document.getElementById('resetNewPasswordConfirm').value;

    if (newPass !== newPassConfirm) {
      showToast('Passwords do not match', 'error');
      return;
    }

    const btn = document.getElementById('btnSubmitNewPassword');
    btn.disabled = true;
    btn.innerText = '⏳ Resetting Password...';

    try {
      const res = await API.auth.resetPassword(email, code, newPass);
      API.setToken(res.token);
      State.setUser(res.user);
      this.closeModal('authModal');
      showToast('🎉 Password reset successfully! You are now logged in.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '🔒 Reset & Login';
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;

    try {
      const res = await API.auth.login(email, pass);
      API.setToken(res.token);
      State.setUser(res.user);
      this.closeModal('authModal');
      showToast(`Welcome back, ${res.user.email}!`, 'success');
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    const passConfirm = document.getElementById('regPasswordConfirm').value;

    if (pass !== passConfirm) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      const res = await API.auth.register(email, pass);
      API.setToken(res.token);
      State.setUser(res.user);
      this.closeModal('authModal');
      showToast('Registration successful! Welcome.', 'success');
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    }
  },

  handleLogout() {
    API.setToken(null);
    State.setUser(null);
    showToast('Logged out successfully', 'info');
  },

  // Deposit checkout
  async handleDepositSubmit(e) {
    e.preventDefault();
    if (!State.user) {
      this.closeModal('depositModal');
      this.openModal('authModal');
      return;
    }

    const amount = document.getElementById('depositAmountInput').value;
    const gateway = document.getElementById('selectedGatewayInput').value;

    const btn = document.getElementById('depositSubmitBtn');
    btn.disabled = true;
    btn.innerText = 'Creating Checkout Invoice...';

    try {
      if (gateway === 'cryptomus') {
        const res = await API.payment.createCryptomus(amount);
        if (res.payment_url) {
          window.location.href = res.payment_url;
        } else {
          showToast('Failed to get Cryptomus invoice URL', 'error');
        }
      } else if (gateway === 'nowpayments') {
      response = await API.payment.createNowPayment(amount);
      if (response && response.payment_url) {
        window.location.href = response.payment_url;
      }
    } else if (gateway === 'binance') {
        const res = await API.payment.createBinance(amount);
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          showToast('Failed to get Binance checkout link', 'error');
        }
      }
    } catch (err) {
      showToast(err.message || 'Payment initiation failed', 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Proceed to Payment';
    }
  }
};

// Global Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span style="flex: 1;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Copy to clipboard helper
function copyToClipboard(text, label = 'Text') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${label} copied to clipboard!`, 'success');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    showToast(`${label} copied to clipboard!`, 'success');
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
