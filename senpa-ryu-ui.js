(function () {
  'use strict';

  var UI_ID = 'senpa-ryu-ui';
  var PROFILE_ID = 'senpa-ryu-profile-pop';
  var STORE_KEY = 'senpaRyuUi';
  var DEFAULTS = {
    profile: 1,
    pin: '',
    nick1: '',
    nick2: '',
    skin1: '',
    skin2: ''
  };

  function q(selector, root) { return (root || document).querySelector(selector); }
  function qa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function click(selector) { var el = q(selector); if (el) { el.click(); return true; } return false; }
  function text(selector, fallback) {
    var el = q(selector);
    return el ? (el.textContent || '').trim() : (fallback || '');
  }

  function loadState() {
    var state = Object.assign({}, DEFAULTS);
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      Object.keys(state).forEach(function (key) {
        if (raw[key] !== undefined) state[key] = raw[key];
      });
    } catch (_) {}
    return state;
  }

  var state = loadState();

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function cleanSkin(value) {
    value = String(value || '').trim();
    try { return window.rawSkinUrl ? window.rawSkinUrl(value) : value; } catch (_) { return value; }
  }

  function skinUrl(value) {
    value = cleanSkin(value);
    if (!value) return '';
    try { return window.proxyUrl ? window.proxyUrl(value) : value; } catch (_) { return value; }
  }

  function setNativeValue(selector, value) {
    var el = q(selector);
    if (!el) return;
    try {
      var descriptor = Object.getOwnPropertyDescriptor(el, 'value');
      if (descriptor && descriptor.writable === false) {
        Object.defineProperty(el, 'value', { value: value, writable: true, configurable: true });
      }
    } catch (_) {}
    try { el.value = value; } catch (_) { return; }
    ['input', 'change', 'blur'].forEach(function (type) {
      try { el.dispatchEvent(new Event(type, { bubbles: true })); } catch (_) {}
    });
  }

  function getNativeState() {
    var p = window.app && window.app.player;
    var n1 = q('.input-p1');
    var n2 = q('.input-p2');
    var s1 = q('.input-skin1');
    var s2 = q('.input-skin2');
    var tag = q('.input-tag');
    return {
      nick1: (n1 && n1.value) || (p && p.nickname1) || state.nick1 || '',
      nick2: (n2 && n2.value) || (p && p.nickname2) || state.nick2 || '',
      skin1: cleanSkin((s1 && s1.value) || (p && p.skin1) || state.skin1),
      skin2: cleanSkin((s2 && s2.value) || (p && p.skin2) || state.skin2),
      tag: (tag && tag.value) || (p && p.tag) || ''
    };
  }

  function syncToNative() {
    var p = window.app && window.app.player;
    setNativeValue('.input-p1', state.nick1);
    setNativeValue('.input-p2', state.nick2);
    setNativeValue('.input-skin1', cleanSkin(state.skin1));
    setNativeValue('.input-skin2', cleanSkin(state.skin2));
    if (p) {
      try {
        p.nickname1 = state.nick1;
        p.nickname2 = state.nick2;
        p.skin1 = skinUrl(state.skin1);
        p.skin2 = skinUrl(state.skin2);
      } catch (_) {}
    }
  }

  function addStyle() {
    if (q('#senpa-ryu-style')) return;
    var style = document.createElement('style');
    style.id = 'senpa-ryu-style';
    style.textContent = `
      /* Keep the original Senpa engine and its lobby controls alive but invisible. */
      .lobby-overlay { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
      .lobby-overlay.fade-out { opacity: 0 !important; }
      #senpa-ryu-ui { position: fixed; inset: 0; z-index: 9500; pointer-events: none; font-family: 'Titillium Web', sans-serif; color: rgba(255,255,255,.88); }
      #senpa-ryu-ui.sryu-hidden { display: none; }
      #senpa-ryu-ui .sryu-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -53%); width: min(850px, 90vw); min-height: 470px; display: grid; grid-template-columns: 1.12fr .92fr 1fr; background: rgba(13,17,23,.94); border: 1px solid rgba(255,255,255,.08); box-shadow: 0 24px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.025) inset; pointer-events: all; }
      #senpa-ryu-ui .sryu-col { min-width: 0; padding: 16px 12px 14px; border-right: 1px solid rgba(255,255,255,.06); }
      #senpa-ryu-ui .sryu-col:last-child { border-right: 0; }
      #senpa-ryu-ui .sryu-label { color: rgba(255,255,255,.34); font-size: 8px; letter-spacing: 2.4px; text-transform: uppercase; margin: 0 0 8px 2px; }
      #senpa-ryu-ui .sryu-region-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; margin-bottom: 20px; }
      #senpa-ryu-ui .sryu-region { height: 31px; background: rgba(255,255,255,.018); border: 1px solid rgba(255,255,255,.05); border-radius: 6px; color: rgba(255,255,255,.25); font: 9px 'Titillium Web', sans-serif; letter-spacing: 1.4px; }
      #senpa-ryu-ui .sryu-region.active { color: rgba(255,255,255,.82); border-color: rgba(255,255,255,.4); background: rgba(255,255,255,.08); }
      #senpa-ryu-ui .sryu-region.disabled { opacity: .4; cursor: not-allowed; }
      #senpa-ryu-ui .sryu-mode-list { border-left: 1px solid rgba(255,255,255,.12); }
      #senpa-ryu-ui .sryu-mode { height: 64px; display: flex; align-items: center; padding: 0 10px; border-bottom: 1px solid rgba(255,255,255,.04); color: rgba(255,255,255,.36); font-size: 10px; letter-spacing: .3px; }
      #senpa-ryu-ui .sryu-mode.active { color: rgba(255,255,255,.92); background: rgba(255,255,255,.055); border-left: 2px solid rgba(177,87,255,.92); }
      #senpa-ryu-ui .sryu-mode.disabled { opacity: .38; }
      #senpa-ryu-ui .sryu-mode-name { flex: 1; }
      #senpa-ryu-ui .sryu-mode-count { font-size: 9px; color: rgba(255,255,255,.48); white-space: nowrap; }
      #senpa-ryu-ui .sryu-profile { width: 90px; margin: 0 auto 16px; height: 24px; display:flex; align-items:center; justify-content:center; gap:8px; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.025); color:rgba(255,255,255,.75); font-size:8px; letter-spacing:2px; cursor:pointer; }
      #senpa-ryu-ui .sryu-profile-dot { width:4px; height:4px; border-radius:50%; background:#fff; box-shadow:0 0 8px #fff; }
      #senpa-ryu-ui .sryu-orbs { display:flex; justify-content:center; gap:24px; margin: 8px -10px 10px; }
      #senpa-ryu-ui .sryu-orb-wrap { text-align:center; min-width:0; }
      #senpa-ryu-ui .sryu-orb-label { margin-bottom:6px; color:rgba(255,255,255,.7); font-size:9px; letter-spacing:1.8px; }
      #senpa-ryu-ui .sryu-orb { width:162px; height:162px; max-width:18vw; max-height:18vw; border-radius:50%; background:#505050 center/cover no-repeat; border:1px solid rgba(255,255,255,.08); box-shadow: inset 0 0 0 26px rgba(0,0,0,.06), 0 10px 22px rgba(0,0,0,.2); }
      #senpa-ryu-ui .sryu-orb.empty::after { content:'■  ■  ■'; display:grid; place-items:center; height:100%; color:rgba(255,255,255,.38); font-size:19px; letter-spacing:3px; }
      #senpa-ryu-ui .sryu-change { display:block; margin:8px auto 18px; height:32px; padding:0 28px; border:1px solid rgba(255,255,255,.2); border-radius:6px; background:rgba(255,255,255,.05); color:rgba(255,255,255,.78); font:9px 'Titillium Web',sans-serif; letter-spacing:1.8px; cursor:pointer; }
      #senpa-ryu-ui .sryu-inputs { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      #senpa-ryu-ui .sryu-field { width:100%; height:31px; padding:0 10px; border:1px solid rgba(255,255,255,.07); border-radius:6px; outline:none; background:rgba(255,255,255,.025); color:rgba(255,255,255,.72); font:10px 'Titillium Web',sans-serif; box-sizing:border-box; }
      #senpa-ryu-ui .sryu-field::placeholder { color:rgba(255,255,255,.24); }
      #senpa-ryu-ui .sryu-actions { display:grid; grid-template-columns:1fr 35px; gap:8px; margin-top:8px; }
      #senpa-ryu-ui button { cursor:pointer; }
      #senpa-ryu-ui .sryu-play, #senpa-ryu-ui .sryu-spec, #senpa-ryu-ui .sryu-settings { height:35px; border:1px solid rgba(255,255,255,.12); border-radius:6px; font:10px 'Titillium Web',sans-serif; letter-spacing:1.2px; }
      #senpa-ryu-ui .sryu-play { background:#f5f5f5; color:#111; }
      #senpa-ryu-ui .sryu-spec { background:rgba(255,255,255,.03); color:rgba(255,255,255,.5); }
      #senpa-ryu-ui .sryu-settings { grid-column:1 / -1; background:rgba(255,255,255,.025); color:rgba(255,255,255,.68); text-align:right; padding-right:13px; }
      #senpa-ryu-ui .sryu-acct-hero { display:flex; align-items:center; gap:12px; padding:8px 10px 13px; border-bottom:1px solid rgba(255,255,255,.05); }
      #senpa-ryu-ui .sryu-avatar { width:52px; height:52px; display:grid; place-items:center; flex:none; border:1px solid rgba(255,255,255,.28); border-radius:50%; color:#fff; font-size:25px; background:rgba(255,255,255,.06); overflow:hidden; }
      #senpa-ryu-ui .sryu-avatar img { width:100%; height:100%; object-fit:cover; }
      #senpa-ryu-ui .sryu-account-name { color:rgba(255,255,255,.92); font-size:13px; }
      #senpa-ryu-ui .sryu-account-type { color:rgba(255,255,255,.4); font-size:8px; letter-spacing:1.8px; margin-top:3px; }
      #senpa-ryu-ui .sryu-stats { display:grid; grid-template-columns:1fr 1fr; margin-bottom:12px; }
      #senpa-ryu-ui .sryu-stat { min-height:54px; padding:8px 10px; border-right:1px solid rgba(255,255,255,.04); border-bottom:1px solid rgba(255,255,255,.04); }
      #senpa-ryu-ui .sryu-stat-label { color:rgba(255,255,255,.34); font-size:7px; letter-spacing:1.6px; text-transform:uppercase; }
      #senpa-ryu-ui .sryu-stat-value { margin-top:5px; color:rgba(255,255,255,.78); font-size:11px; }
      #senpa-ryu-ui .sryu-account-actions { display:grid; gap:7px; }
      #senpa-ryu-ui .sryu-account-actions button { height:33px; border:1px solid rgba(255,255,255,.1); border-radius:6px; background:rgba(255,255,255,.025); color:rgba(255,255,255,.58); font:9px 'Titillium Web',sans-serif; letter-spacing:1px; }
      #senpa-ryu-ui .sryu-account-actions button.primary { background:#f4f4f4; color:#161616; }
      #senpa-ryu-ui .sryu-build { margin-top:auto; padding-top:16px; text-align:right; color:rgba(255,255,255,.17); font-size:7px; letter-spacing:1.2px; }
      #senpa-ryu-ui .sryu-team { position:absolute; left:50%; bottom:30px; transform:translateX(-50%); width:min(1080px,86vw); height:74px; display:flex; align-items:stretch; background:rgba(13,17,23,.94); border:1px solid rgba(255,255,255,.06); box-shadow:0 12px 40px rgba(0,0,0,.45); pointer-events:all; }
      #senpa-ryu-ui .sryu-team-title { width:90px; display:grid; place-items:center; color:rgba(255,255,255,.7); font-size:11px; letter-spacing:2px; border-right:1px solid rgba(255,255,255,.06); }
      #senpa-ryu-ui .sryu-team-slots { flex:1; display:grid; grid-template-columns:repeat(5,1fr); }
      #senpa-ryu-ui .sryu-team-slot { display:flex; align-items:center; gap:10px; padding:0 12px; border-right:1px solid rgba(255,255,255,.04); }
      #senpa-ryu-ui .sryu-team-orb { width:38px; height:38px; flex:none; border:1px dashed rgba(255,255,255,.12); border-radius:50%; background:center/cover no-repeat; }
      #senpa-ryu-ui .sryu-team-slot-name { min-width:0; color:rgba(255,255,255,.4); font-size:8px; letter-spacing:1.1px; }
      #senpa-ryu-ui .sryu-team-slot-name b { display:block; margin-top:3px; color:rgba(255,255,255,.26); font-weight:300; letter-spacing:0; overflow:hidden; text-overflow:ellipsis; }
      #senpa-ryu-profile-pop { position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:9600; width:min(520px,88vw); display:none; padding:18px; background:#0d1117; border:1px solid rgba(255,255,255,.16); box-shadow:0 25px 90px #000b; pointer-events:all; }
      #senpa-ryu-profile-pop.open { display:block; }
      #senpa-ryu-profile-pop .sryu-pop-title { display:flex; justify-content:space-between; color:rgba(255,255,255,.7); font-size:10px; letter-spacing:2px; margin-bottom:12px; }
      #senpa-ryu-profile-pop .sryu-profile-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin-bottom:14px; }
      #senpa-ryu-profile-pop .sryu-profile-slot { height:28px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.025); color:rgba(255,255,255,.5); font:10px 'Titillium Web',sans-serif; }
      #senpa-ryu-profile-pop .sryu-profile-slot.active { border-color:rgba(255,255,255,.45); color:#fff; }
      #senpa-ryu-profile-pop .sryu-edit-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
      #senpa-ryu-profile-pop .sryu-edit-grid input { height:30px; padding:0 9px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03); color:#fff; outline:none; font:10px 'Titillium Web',sans-serif; }
      #senpa-ryu-profile-pop .sryu-pop-close { margin-top:12px; width:100%; height:29px; border:1px solid rgba(255,255,255,.1); background:transparent; color:rgba(255,255,255,.48); font:9px 'Titillium Web',sans-serif; letter-spacing:1px; }
      @media (max-width: 860px) { #senpa-ryu-ui .sryu-panel { width:96vw; min-height:420px; } #senpa-ryu-ui .sryu-orb { width:125px; height:125px; } #senpa-ryu-ui .sryu-team { width:96vw; } #senpa-ryu-ui .sryu-team-slot { padding:0 5px; gap:5px; } #senpa-ryu-ui .sryu-team-title { width:60px; } }
      @media (max-width: 600px) { #senpa-ryu-ui .sryu-panel { grid-template-columns:1fr; max-height:82vh; overflow:auto; } #senpa-ryu-ui .sryu-col { border-right:0; border-bottom:1px solid rgba(255,255,255,.06); } #senpa-ryu-ui .sryu-team { bottom:5px; height:55px; } #senpa-ryu-ui .sryu-team-title { width:45px; font-size:8px; } #senpa-ryu-ui .sryu-team-slot-name { display:none; } }
    `;
    document.head.appendChild(style);
  }

  function buildUI() {
    if (q('#' + UI_ID)) return q('#' + UI_ID);
    var root = document.createElement('div');
    root.id = UI_ID;
    root.className = 'sryu-hidden';
    root.innerHTML = `
      <div class="sryu-panel">
        <section class="sryu-col sryu-left">
          <div class="sryu-label">Select Region</div>
          <div class="sryu-region-row"><button class="sryu-region disabled">NA</button><button class="sryu-region active">EU</button><button class="sryu-region disabled">AS</button></div>
          <div class="sryu-label">Select Mode</div>
          <div class="sryu-mode-list"><div class="sryu-mode active"><span class="sryu-mode-name">› &nbsp; FFA — EUROPE</span><span class="sryu-mode-count" id="sryu-server-count">FFA</span></div><div class="sryu-mode disabled"><span class="sryu-mode-name">› &nbsp; TRAINING</span><span class="sryu-mode-count">Unavailable</span></div><div class="sryu-mode disabled"><span class="sryu-mode-name">› &nbsp; ARENA</span><span class="sryu-mode-count">Unavailable</span></div><div class="sryu-mode disabled"><span class="sryu-mode-name">› &nbsp; SANDBOX</span><span class="sryu-mode-count">Unavailable</span></div></div>
        </section>
        <section class="sryu-col sryu-center">
          <button class="sryu-profile" id="sryu-profile-btn"><span class="sryu-profile-dot"></span><span id="sryu-profile-label">PROFILE 1</span></button>
          <div class="sryu-orbs"><div class="sryu-orb-wrap"><div class="sryu-orb-label">SKIN 1</div><div class="sryu-orb empty" id="sryu-orb1"></div></div><div class="sryu-orb-wrap"><div class="sryu-orb-label">SKIN 2</div><div class="sryu-orb empty" id="sryu-orb2"></div></div></div>
          <button class="sryu-change" id="sryu-change-skins">CHANGE SKINS</button>
          <div class="sryu-inputs"><input class="sryu-field" id="sryu-tag" placeholder="Tag" maxlength="5"><input class="sryu-field" id="sryu-pin" placeholder="Pin" maxlength="5"></div>
          <div class="sryu-actions"><button class="sryu-play" id="sryu-play">▶ &nbsp; PLAY NOW</button><button class="sryu-spec" id="sryu-spectate">◉</button><button class="sryu-settings" id="sryu-settings">⚙ &nbsp; SETTINGS</button></div>
        </section>
        <section class="sryu-col sryu-right"><div class="sryu-label">Account</div><div class="sryu-acct-hero"><div class="sryu-avatar" id="sryu-avatar">G</div><div><div class="sryu-account-name" id="sryu-account-name">Guest</div><div class="sryu-account-type" id="sryu-account-type">GUEST ACCOUNT</div></div></div><div class="sryu-stats"><div class="sryu-stat"><div class="sryu-stat-label">Level</div><div class="sryu-stat-value" id="sryu-level">LEVEL 0</div></div><div class="sryu-stat"><div class="sryu-stat-label">Rank</div><div class="sryu-stat-value" id="sryu-rank">UNRANKED</div></div><div class="sryu-stat"><div class="sryu-stat-label">RC</div><div class="sryu-stat-value" id="sryu-rc">0 RC</div></div><div class="sryu-stat"><div class="sryu-stat-label">RP</div><div class="sryu-stat-value" id="sryu-rp">0 RP</div></div></div><div class="sryu-account-actions"><button class="primary" id="sryu-login">LOGIN WITH DISCORD</button><button id="sryu-facebook">LOGIN WITH FACEBOOK</button><button id="sryu-shop">SHOP</button><button id="sryu-inventory">INVENTORY</button><button id="sryu-replays">▶ REPLAYS</button></div><div class="sryu-build">BUILD 6.1.9 · SENPA FFA</div></section>
      </div>
      <div class="sryu-team"><div class="sryu-team-title">TEAM</div><div class="sryu-team-slots" id="sryu-team-slots"></div></div>`;
    document.body.appendChild(root);
    buildTeamSlots();
    buildProfilePopup();
    wireUI(root);
    return root;
  }

  function buildTeamSlots() {
    var host = q('#sryu-team-slots');
    if (!host) return;
    host.innerHTML = '';
    for (var i = 1; i <= 5; i++) {
      var slot = document.createElement('div');
      slot.className = 'sryu-team-slot';
      slot.innerHTML = '<div class="sryu-team-orb"></div><div class="sryu-team-slot-name">PLAYER ' + i + '<b>-</b></div>';
      host.appendChild(slot);
    }
  }

  function getInventory() {
    try {
      var list = JSON.parse(localStorage.getItem('senpaRyuInventory') || '[]');
      return Array.isArray(list) ? list.filter(function(item) { return item && item.url; }) : [];
    } catch (_) { return []; }
  }

  function saveInventory(list) {
    try { localStorage.setItem('senpaRyuInventory', JSON.stringify(list)); } catch (_) {}
  }

  function buildInventoryPanel() {
    var existing = q('#senpa-ryu-inventory');
    if (existing) return existing;
    var panel = document.createElement('div');
    panel.id = 'senpa-ryu-inventory';
    panel.innerHTML = '<div class="sryu-inv-box"><div class="sryu-inv-header"><div class="sryu-inv-title">INVENTORY</div><button class="sryu-inv-close">✕</button></div><div class="sryu-inv-toolbar"><button class="sryu-inv-tab active" data-view="all">ALL ITEMS</button><button class="sryu-inv-tab" data-view="favorites">FAVORITES</button><button class="sryu-inv-add">＋ ADD SKIN</button></div><div class="sryu-inv-add-panel"><input placeholder="Paste a skin URL to save it locally"><button>ADD TO INVENTORY</button></div><div class="sryu-inv-grid"></div></div>';
    document.body.appendChild(panel);
    q('.sryu-inv-close', panel).addEventListener('click', function() { panel.classList.remove('open'); });
    panel.addEventListener('click', function(e) { if (e.target === panel) panel.classList.remove('open'); });
    q('.sryu-inv-add', panel).addEventListener('click', function() { q('.sryu-inv-add-panel', panel).classList.toggle('open'); });
    q('.sryu-inv-add-panel button', panel).addEventListener('click', function() {
      var input = q('.sryu-inv-add-panel input', panel);
      var url = cleanSkin(input.value);
      if (!url) return;
      var list = getInventory();
      list.unshift({ id: String(Date.now()), url: url, name: 'Custom Skin', favorite: false });
      saveInventory(list); input.value = ''; q('.sryu-inv-add-panel', panel).classList.remove('open'); renderInventory(panel);
    });
    qa('.sryu-inv-tab', panel).forEach(function(tab) { tab.addEventListener('click', function() { qa('.sryu-inv-tab', panel).forEach(function(t) { t.classList.remove('active'); }); tab.classList.add('active'); renderInventory(panel, tab.dataset.view); }); });
    return panel;
  }

  function equipInventorySkin(item, slot) {
    var key = slot === 2 ? 'skin2' : 'skin1';
    state[key] = item.url; saveState(); syncToNative(); updateUI();
  }

  function renderInventory(panel, view) {
    var grid = q('.sryu-inv-grid', panel);
    if (!grid) return;
    var list = getInventory();
    if (view === 'favorites') list = list.filter(function(item) { return !!item.favorite; });
    grid.innerHTML = '';
    if (!list.length) { grid.innerHTML = '<div class="sryu-inv-empty">NO LOCAL ITEMS YET — USE ＋ ADD SKIN TO BUILD YOUR INVENTORY</div>'; return; }
    list.forEach(function(item) {
      var card = document.createElement('div'); card.className = 'sryu-inv-card';
      var preview = document.createElement('div'); preview.className = 'sryu-inv-preview';
      var img = document.createElement('img'); img.alt = ''; img.src = skinUrl(item.url); img.onerror = function() { img.remove(); var empty = document.createElement('div'); empty.className = 'sryu-inv-empty-preview'; empty.textContent = 'NO PREVIEW'; preview.appendChild(empty); }; preview.appendChild(img); card.appendChild(preview);
      var info = document.createElement('div'); info.className = 'sryu-inv-info'; info.innerHTML = '<div class="sryu-inv-name"></div><div class="sryu-inv-meta">LOCAL ITEM</div>'; q('.sryu-inv-name', info).textContent = item.name || 'Custom Skin'; card.appendChild(info);
      var actions = document.createElement('div'); actions.className = 'sryu-inv-actions';
      [1,2].forEach(function(slot) { var btn = document.createElement('button'); btn.textContent = 'EQUIP ' + slot; btn.addEventListener('click', function() { equipInventorySkin(item, slot); }); actions.appendChild(btn); });
      var fav = document.createElement('button'); fav.textContent = item.favorite ? '★' : '☆'; fav.title = 'Favorite'; fav.addEventListener('click', function() { var all = getInventory(); var found = all.find(function(x) { return x.id === item.id; }); if (found) found.favorite = !found.favorite; saveInventory(all); renderInventory(panel, view); }); actions.appendChild(fav);
      card.appendChild(actions); grid.appendChild(card);
    });
  }

  function openInventoryPanel() {
    var panel = buildInventoryPanel();
    panel.classList.add('open');
    renderInventory(panel, 'all');
    return true;
  }

  function buildProfilePopup() {
    if (q('#' + PROFILE_ID)) return;
    var pop = document.createElement('div');
    pop.id = PROFILE_ID;
    pop.innerHTML = '<div class="sryu-pop-title"><span>PROFILE SELECTOR</span><span>10 SLOTS</span></div><div class="sryu-profile-grid"></div><div class="sryu-edit-grid"><input id="sryu-nick1" placeholder="NICKNAME 1"><input id="sryu-nick2" placeholder="NICKNAME 2"><input id="sryu-skin1" placeholder="SKIN 1 URL"><input id="sryu-skin2" placeholder="SKIN 2 URL"></div><button class="sryu-pop-close" id="sryu-profile-close">CLOSE</button>';
    document.body.appendChild(pop);
    var grid = q('.sryu-profile-grid', pop);
    for (var i = 1; i <= 10; i++) {
      var b = document.createElement('button');
      b.className = 'sryu-profile-slot';
      b.dataset.slot = String(i);
      b.textContent = 'PROFILE ' + i;
      b.addEventListener('click', function () { selectProfile(parseInt(this.dataset.slot, 10)); });
      grid.appendChild(b);
    }
    ['nick1', 'nick2', 'skin1', 'skin2'].forEach(function (key) {
      var input = q('#sryu-' + key, pop);
      input.addEventListener('input', function () {
        state[key] = key.indexOf('skin') === 0 ? cleanSkin(input.value) : input.value;
        saveState();
        syncToNative();
        updateUI();
      });
    });
    q('#sryu-profile-close', pop).addEventListener('click', function () { pop.classList.remove('open'); });
  }

  function selectProfile(number) {
    state.profile = Math.max(1, Math.min(10, number));
    saveState();
    var native = q('.profile-slot[data-slot="' + state.profile + '"]');
    if (native) native.click();
    q('#sryu-profile-label').textContent = 'PROFILE ' + state.profile;
    qa('.sryu-profile-slot', q('#' + PROFILE_ID)).forEach(function (b) { b.classList.toggle('active', parseInt(b.dataset.slot, 10) === state.profile); });
    updateProfileInputs();
  }

  function updateProfileInputs() {
    var current = getNativeState();
    ['nick1', 'nick2', 'skin1', 'skin2'].forEach(function (key) {
      var input = q('#sryu-' + key);
      if (input) input.value = state[key] || current[key] || '';
    });
  }

  function openSettings() { click('.menu-btn.btn-settings'); }
  function openSenpaSkinManager() {
    try {
      var lobby = window.app && window.app.lobby;
      if (lobby && lobby.skinsMenu && typeof lobby.skinsMenu.show === 'function') {
        lobby.skinsMenu.show();
        return true;
      }
    } catch (_) {}
    return click('.menu-btn.btn-skins');
  }
  function openSkins() { return openSenpaSkinManager(); }
  function openSenpaReplay() {
    if (typeof window.ryuToggleReplayRecording === 'function') {
      window.ryuToggleReplayRecording();
      return true;
    }
    return click('#btnRecordingNav');
  }
  function play() { syncToNative(); click('.menu-btn.btn-play'); }
  function spectate() { click('.menu-btn.btn-spectate'); }

  // Compatibility hooks used by the existing navigation wiring in client.html.
  // They intentionally map Ryuten-style actions to Senpa-owned services.
  window.__ryuOpenShop = openSenpaSkinManager;
  window.__ryuOpenInventory = openSenpaSkinManager;
  window.__ryuOpenRecordings = openSenpaReplay;
  window.__ryuOpenReplays = openSenpaReplay;

  function getSenpaSetting(key, fallback) {
    try {
      if (window.app && window.app.settings && typeof window.app.settings.get === 'function') {
        var value = window.app.settings.get(key);
        return value === undefined ? fallback : value;
      }
    } catch (_) {}
    return fallback;
  }

  function setSenpaSetting(key, value) {
    try {
      if (window.app && window.app.settings && typeof window.app.settings.set === 'function') {
        window.app.settings.set(key, value);
      }
    } catch (_) {}
    try { localStorage.setItem('ryuCompat:' + key, JSON.stringify(value)); } catch (_) {}
  }

  function addBridgeStyle() {
    if (q('#sryu-settings-bridge-style')) return;
    var style = document.createElement('style');
    style.id = 'sryu-settings-bridge-style';
    style.textContent = `
      #settingsOverlay.sryu-settings-active { background:rgba(7,11,17,.96) !important; }
      #settingsOverlay.sryu-settings-active .settings-heading { color:rgba(255,255,255,.8); font-size:34px; letter-spacing:4px; }
      #settingsOverlay.sryu-settings-active .settings-content { max-width:760px; }
      #settingsOverlay.sryu-settings-active .settings-tabs { border-bottom:1px solid rgba(255,255,255,.08); }
      #settingsOverlay.sryu-settings-active .tab-btn { color:rgba(255,255,255,.38); }
      #settingsOverlay.sryu-settings-active .tab-btn.active { color:#fff; border-bottom-color:rgba(255,255,255,.7); }
      .sryu-bridge-section { margin:10px 0 18px; color:rgba(255,255,255,.28); font-size:9px; letter-spacing:2.5px; }
      .sryu-bridge-row { min-height:42px; display:flex; align-items:center; justify-content:space-between; gap:18px; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,.055); }
      .sryu-bridge-label { color:rgba(255,255,255,.78); font-size:11px; letter-spacing:.4px; }
      .sryu-bridge-desc { margin-top:2px; color:rgba(255,255,255,.3); font-size:9px; }
      .sryu-bridge-control { flex:none; display:flex; align-items:center; gap:8px; }
      .sryu-bridge-toggle { min-width:44px; height:22px; border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.35); color:rgba(255,255,255,.42); font:9px 'Titillium Web',sans-serif; letter-spacing:.5px; cursor:pointer; }
      .sryu-bridge-toggle.on { border-color:rgba(34,211,238,.55); background:rgba(34,211,238,.12); color:#22d3ee; }
      .sryu-bridge-range { width:145px; accent-color:#22d3ee; }
      .sryu-bridge-value { min-width:32px; color:rgba(255,255,255,.52); font-size:10px; text-align:right; }
      .sryu-bridge-action { height:28px; padding:0 12px; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.04); color:rgba(255,255,255,.65); font:9px 'Titillium Web',sans-serif; letter-spacing:1px; cursor:pointer; }
      .sryu-bridge-action:hover { border-color:rgba(34,211,238,.45); color:#22d3ee; }
      #senpa-ryu-inventory { position:fixed; inset:0; z-index:9800; display:none; align-items:center; justify-content:center; background:rgba(3,6,10,.82); backdrop-filter:blur(3px); pointer-events:all; }
      #senpa-ryu-inventory.open { display:flex; }
      #senpa-ryu-inventory .sryu-inv-box { width:min(920px,90vw); height:min(640px,86vh); display:flex; flex-direction:column; background:#0c1017; border:1px solid rgba(255,255,255,.12); box-shadow:0 24px 90px rgba(0,0,0,.72); }
      #senpa-ryu-inventory .sryu-inv-header { height:58px; flex:none; display:flex; align-items:center; justify-content:space-between; padding:0 20px; border-bottom:1px solid rgba(255,255,255,.07); }
      #senpa-ryu-inventory .sryu-inv-title { color:rgba(255,255,255,.82); font-size:13px; letter-spacing:3px; }
      #senpa-ryu-inventory .sryu-inv-close { width:30px; height:26px; border:1px solid rgba(255,255,255,.12); background:transparent; color:rgba(255,255,255,.45); cursor:pointer; }
      #senpa-ryu-inventory .sryu-inv-toolbar { display:flex; align-items:center; gap:8px; padding:12px 20px; border-bottom:1px solid rgba(255,255,255,.05); }
      #senpa-ryu-inventory .sryu-inv-tab { height:28px; padding:0 12px; border:1px solid rgba(255,255,255,.08); background:transparent; color:rgba(255,255,255,.42); font:9px 'Titillium Web',sans-serif; letter-spacing:1px; cursor:pointer; }
      #senpa-ryu-inventory .sryu-inv-tab.active { border-color:rgba(34,211,238,.45); background:rgba(34,211,238,.1); color:#22d3ee; }
      #senpa-ryu-inventory .sryu-inv-add { margin-left:auto; height:28px; padding:0 12px; border:1px solid rgba(34,211,238,.32); background:rgba(34,211,238,.07); color:#22d3ee; font:9px 'Titillium Web',sans-serif; letter-spacing:1px; cursor:pointer; }
      #senpa-ryu-inventory .sryu-inv-grid { flex:1; min-height:0; overflow:auto; padding:18px 20px; display:grid; grid-template-columns:repeat(auto-fill,minmax(175px,1fr)); align-content:start; gap:10px; }
      #senpa-ryu-inventory .sryu-inv-card { min-height:190px; display:flex; flex-direction:column; border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.025); }
      #senpa-ryu-inventory .sryu-inv-preview { height:115px; display:grid; place-items:center; border-bottom:1px solid rgba(255,255,255,.06); background:radial-gradient(circle,rgba(255,255,255,.1),transparent 62%); }
      #senpa-ryu-inventory .sryu-inv-preview img { width:88px; height:88px; border-radius:50%; object-fit:cover; }
      #senpa-ryu-inventory .sryu-inv-empty-preview { width:70px; height:70px; border:1px dashed rgba(255,255,255,.18); border-radius:50%; display:grid; place-items:center; color:rgba(255,255,255,.25); font-size:10px; }
      #senpa-ryu-inventory .sryu-inv-info { padding:9px 10px 4px; min-height:38px; }
      #senpa-ryu-inventory .sryu-inv-name { color:rgba(255,255,255,.78); font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #senpa-ryu-inventory .sryu-inv-meta { color:rgba(255,255,255,.28); font-size:8px; margin-top:3px; }
      #senpa-ryu-inventory .sryu-inv-actions { display:flex; gap:5px; padding:7px 10px 10px; margin-top:auto; }
      #senpa-ryu-inventory .sryu-inv-actions button { flex:1; height:25px; border:1px solid rgba(255,255,255,.1); background:transparent; color:rgba(255,255,255,.48); font:8px 'Titillium Web',sans-serif; cursor:pointer; }
      #senpa-ryu-inventory .sryu-inv-actions button:hover { color:#22d3ee; border-color:rgba(34,211,238,.4); }
      #senpa-ryu-inventory .sryu-inv-add-panel { display:none; padding:14px 20px; border-bottom:1px solid rgba(255,255,255,.06); gap:8px; }
      #senpa-ryu-inventory .sryu-inv-add-panel.open { display:flex; }
      #senpa-ryu-inventory .sryu-inv-add-panel input { flex:1; height:30px; padding:0 10px; border:1px solid rgba(255,255,255,.1); background:rgba(0,0,0,.25); color:#fff; outline:none; font:10px 'Titillium Web',sans-serif; }
      #senpa-ryu-inventory .sryu-inv-add-panel button { height:30px; padding:0 13px; border:1px solid rgba(34,211,238,.35); background:rgba(34,211,238,.08); color:#22d3ee; font:9px 'Titillium Web',sans-serif; cursor:pointer; }
      #senpa-ryu-inventory .sryu-inv-empty { grid-column:1/-1; padding:80px 20px; text-align:center; color:rgba(255,255,255,.32); font-size:11px; letter-spacing:1px; }
    `;
    document.head.appendChild(style);
  }

  function bridgeRow(label, description, control) {
    var row = document.createElement('div');
    row.className = 'sryu-bridge-row';
    var copy = document.createElement('div');
    var title = document.createElement('div');
    title.className = 'sryu-bridge-label';
    title.textContent = label;
    copy.appendChild(title);
    if (description) {
      var desc = document.createElement('div');
      desc.className = 'sryu-bridge-desc';
      desc.textContent = description;
      copy.appendChild(desc);
    }
    row.appendChild(copy);
    var wrap = document.createElement('div');
    wrap.className = 'sryu-bridge-control';
    wrap.appendChild(control);
    row.appendChild(wrap);
    return row;
  }

  function makeBridgeToggle(key, label, description, fallback) {
    var btn = document.createElement('button');
    btn.className = 'sryu-bridge-toggle';
    function render() {
      var on = !!getSenpaSetting(key, fallback);
      btn.textContent = on ? 'ON' : 'OFF';
      btn.classList.toggle('on', on);
    }
    btn.addEventListener('click', function() { setSenpaSetting(key, !getSenpaSetting(key, fallback)); render(); });
    render();
    return bridgeRow(label, description, btn);
  }

  function makeBridgeRange(key, label, description, min, max, step, fallback, display) {
    var input = document.createElement('input');
    input.type = 'range'; input.min = min; input.max = max; input.step = step; input.className = 'sryu-bridge-range';
    var value = document.createElement('span'); value.className = 'sryu-bridge-value';
    function render() {
      var v = Number(getSenpaSetting(key, fallback));
      if (!isFinite(v)) v = fallback;
      input.value = v; value.textContent = display ? display(v) : String(v);
    }
    input.addEventListener('input', function() { var v = Number(input.value); setSenpaSetting(key, v); value.textContent = display ? display(v) : String(v); });
    render();
    var wrap = document.createElement('div'); wrap.appendChild(input); wrap.appendChild(value);
    return bridgeRow(label, description, wrap);
  }

  function renderRyuThemeBridge() {
    var overlay = q('#settingsOverlay');
    var content = q('#settingsContent');
    if (!overlay || !content) return;
    overlay.classList.add('sryu-settings-active');
    content.innerHTML = '';
    var title = document.createElement('div'); title.className = 'sryu-bridge-section'; title.textContent = 'RYUTHEME COMPATIBILITY'; content.appendChild(title);
    content.appendChild(makeBridgeToggle('showHUD', 'Show HUD', 'Keep Senpa HUD elements visible.', true));
    content.appendChild(makeBridgeToggle('showMinimap', 'Show Minimap', 'Display the minimap while using the Senpa engine.', true));
    content.appendChild(makeBridgeToggle('showLeaderboard', 'Show Leaderboard', 'Display the live leaderboard.', true));
    content.appendChild(makeBridgeToggle('showStats', 'Show Stats', 'Display live performance and status badges.', true));
    content.appendChild(makeBridgeToggle('showGrid', 'Show Grid', 'Draw the world grid behind cells.', false));
    content.appendChild(makeBridgeToggle('showBorder', 'Show Border', 'Draw the world border.', true));
    content.appendChild(makeBridgeToggle('showCursorLines', 'Cursor Lines', 'Draw lines from cells to the cursor.', false));
    var render = document.createElement('div'); render.className = 'sryu-bridge-section'; render.textContent = 'RENDERING'; content.appendChild(render);
    content.appendChild(makeBridgeRange('cellOpacity', 'Cell Opacity', 'Transparency of cells.', 1, 100, 1, 100));
    content.appendChild(makeBridgeRange('nickSize', 'Nick Size', 'Nickname scale on cells.', .5, 3, .1, 1.9, function(v) { return Number(v).toFixed(1); }));
    content.appendChild(makeBridgeRange('massSize', 'Mass Size', 'Mass text scale on cells.', .5, 3, .1, 2.4, function(v) { return Number(v).toFixed(1); }));
    content.appendChild(makeBridgeRange('cellAnimationSpeed', 'Animation Speed', 'Senpa cell animation timing.', 30, 300, 1, 145));
    var skins = document.createElement('div'); skins.className = 'sryu-bridge-section'; skins.textContent = 'SKINS'; content.appendChild(skins);
    content.appendChild(makeBridgeToggle('showGlobalSkins', 'Show All Skins', 'Master switch for custom and server skins.', true));
    content.appendChild(makeBridgeToggle('showSkins', 'Custom Skins', 'Enable custom player skins.', true));
    content.appendChild(makeBridgeToggle('showVanillaSkins', 'Server Skins', 'Enable server-provided skins.', true));
    content.appendChild(makeBridgeToggle('showGifSkins', 'Animated Skins', 'Allow animated GIF skins.', false));
    var actions = document.createElement('div'); actions.className = 'sryu-bridge-section'; actions.textContent = 'TOOLS'; content.appendChild(actions);
    var actionRow = document.createElement('div'); actionRow.className = 'sryu-bridge-row';
    var replay = document.createElement('button'); replay.className = 'sryu-bridge-action'; replay.textContent = 'TOGGLE RECORDING'; replay.addEventListener('click', openSenpaReplay); actionRow.appendChild(replay);
    var exportBtn = document.createElement('button'); exportBtn.className = 'sryu-bridge-action'; exportBtn.textContent = 'EXPORT'; exportBtn.addEventListener('click', function() { var b = q('#btnExport'); if (b) b.click(); }); actionRow.appendChild(exportBtn);
    var importBtn = document.createElement('button'); importBtn.className = 'sryu-bridge-action'; importBtn.textContent = 'IMPORT'; importBtn.addEventListener('click', function() { var b = q('#btnImport'); if (b) b.click(); }); actionRow.appendChild(importBtn);
    content.appendChild(actionRow);
  }

  function installRyuThemeTab() {
    var tabs = q('.settings-tabs');
    if (!tabs || q('.tab-btn[data-tab="ryutheme"]', tabs)) return;
    var btn = document.createElement('button');
    btn.className = 'tab-btn'; btn.dataset.tab = 'ryutheme'; btn.textContent = 'RYUTHEME';
    btn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      qa('.settings-tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderRyuThemeBridge();
    });
    tabs.appendChild(btn);
  }

  function wireUI(root) {
    q('#sryu-profile-btn', root).addEventListener('click', function () { updateProfileInputs(); q('#' + PROFILE_ID).classList.add('open'); });
    q('#sryu-change-skins', root).addEventListener('click', openSkins);
    q('#sryu-settings', root).addEventListener('click', openSettings);
    q('#sryu-play', root).addEventListener('click', play);
    q('#sryu-spectate', root).addEventListener('click', spectate);
    q('#sryu-tag', root).addEventListener('input', function () { setNativeValue('.input-tag', this.value); });
    q('#sryu-pin', root).addEventListener('input', function () { state.pin = this.value; saveState(); });
    q('#sryu-login', root).addEventListener('click', function () {
      if (click('.account-login-btn')) return;
      if (typeof window.__JAXXV6_OPEN_AUTH__ === 'function') return window.__JAXXV6_OPEN_AUTH__('discord');
      window.open('https://api.senpa.io/auth/discord', '_blank', 'width=600,height=700');
    });
    q('#sryu-facebook', root).addEventListener('click', function () {
      if (click('.account-login-btn.facebook')) return;
      if (typeof window.__JAXXV6_OPEN_AUTH__ === 'function') return window.__JAXXV6_OPEN_AUTH__('facebook');
      window.open('https://api.senpa.io/auth/facebook', '_blank', 'width=600,height=700');
    });
    q('#sryu-shop', root).addEventListener('click', openSenpaSkinManager);
    q('#sryu-inventory', root).addEventListener('click', openInventoryPanel);
    q('#sryu-replays', root).addEventListener('click', openSenpaReplay);
    selectProfile(state.profile);
    if (state.tag) setNativeValue('.input-tag', state.tag);
    if (state.pin) q('#sryu-pin', root).value = state.pin;
    syncToNative();
  }

  function syncTeam() {
    var host = q('#sryu-team-slots');
    if (!host) return;
    var native = qa('.mame-brb-team-player');
    var localClients = [];
    try {
      var handler = window.app && window.app.dualConnectionHandler;
      if (handler && Array.isArray(handler.list)) localClients = handler.list;
      else if (handler && Array.isArray(handler.clients)) localClients = handler.clients;
    } catch (_) {}
    qa('.sryu-team-slot', host).forEach(function (slot, index) {
      var name = '';
      var skin = '';
      var n = native[index];
      if (n) {
        var nameEl = q('.mame-brb-team-player-username', n);
        name = nameEl ? (nameEl.textContent || '').trim() : '';
        var preview = q('.mame-brb-team-player-preview[style*="background"]', n);
        if (preview) skin = preview.style.backgroundImage || '';
      }
      if (!name && localClients[index]) name = localClients[index].name || localClients[index].nickname || '';
      var orb = q('.sryu-team-orb', slot);
      var label = q('.sryu-team-slot-name', slot);
      if (orb) orb.style.backgroundImage = skin || 'none';
      if (label && label.lastElementChild) label.lastElementChild.textContent = name || '-';
    });
  }

  function updateUI() {
    var root = q('#' + UI_ID);
    if (!root) return;
    var nativeState = getNativeState();
    var s1 = skinUrl(nativeState.skin1);
    var s2 = skinUrl(nativeState.skin2 || nativeState.skin1);
    [ ['#sryu-orb1', s1], ['#sryu-orb2', s2] ].forEach(function (pair) {
      var el = q(pair[0]);
      if (!el) return;
      el.style.backgroundImage = pair[1] ? 'url("' + pair[1].replace(/"/g, '') + '")' : 'none';
      el.classList.toggle('empty', !pair[1]);
    });
    var player = window.app && window.app.player;
    var name = (player && (player.nickname1 || player.nickname2)) || nativeState.nick1 || 'Guest';
    q('#sryu-account-name').textContent = name;
    q('#sryu-avatar').textContent = name.charAt(0).toUpperCase();
    q('#sryu-tag').value = nativeState.tag || '';
    var stats = { level: text('#statLevel', 'LEVEL 0'), rank: text('#statRank', 'UNRANKED'), rc: text('#statRC', '0 RC'), rp: text('#statRP', '0 RP') };
    q('#sryu-level').textContent = stats.level;
    q('#sryu-rank').textContent = stats.rank;
    q('#sryu-rc').textContent = stats.rc;
    q('#sryu-rp').textContent = stats.rp;
    syncTeam();
  }

  function isLobbyVisible() {
    try {
      if (window.app && window.app.lobby) return !!window.app.lobby.isVisible;
    } catch (_) {}
    var old = q('.lobby-overlay');
    if (!old) return true;
    var style = getComputedStyle(old);
    return style.display !== 'none' && !old.classList.contains('fade-out');
  }

  function syncVisibility() {
    var root = q('#' + UI_ID);
    if (root) root.classList.toggle('sryu-hidden', !isLobbyVisible());
  }

  function init() {
    if (!window.app || !window.app.player) return setTimeout(init, 250);
    addStyle();
    addBridgeStyle();
    installRyuThemeTab();
    var root = buildUI();
    root.classList.remove('sryu-hidden');
    syncVisibility();
    syncToNative();
    updateUI();
    setInterval(function () { syncVisibility(); updateUI(); }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
