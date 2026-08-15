/*
 * HSLO-style Senpa UI
 *
 * Original UI reimplementation for the Senpa client. It intentionally does
 * not copy the external bundle or create a WebSocket. All gameplay actions are
 * delegated to Senpa's existing DOM controls and app state.
 */
(function () {
  'use strict';

  var STORE = 'hslo-senpa-ui-settings';
  var state = readState();
  var root = null;
  var menuVisible = true;
  var settingsVisible = false;
  var inputsVisible = true;
  var themeVisible = false;
  var activeSkin = 1;
  var updateTimer = null;

  function readState() {
    var defaults = {
      showChat: true,
      showLeaderboard: true,
      showMinimap: true,
      showTargeting: true,
      showTeamList: true,
      compactHUD: false,
      darkMode: true,
      pinkAccent: true,
      reducedMotion: false,
      opacity: 86,
      cursor: 'crosshair'
    };
    try { return Object.assign(defaults, JSON.parse(localStorage.getItem(STORE) || '{}')); }
    catch (_) { return defaults; }
  }

  function saveState() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (_) {}
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>\"']/g, function (c) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' })[c];
    });
  }

  function id(name) { return document.getElementById(name); }
  function q(selector) { return document.querySelector(selector); }

  function native(selector) { return q(selector); }

  function nativeClick(selectors) {
    selectors = Array.isArray(selectors) ? selectors : [selectors];
    for (var i = 0; i < selectors.length; i++) {
      var el = typeof selectors[i] === 'string' ? q(selectors[i]) : selectors[i];
      if (!el) continue;
      try { el.click(); return true; } catch (_) {}
    }
    return false;
  }

  function nativeInput(selector, value) {
    var el = native(selector);
    if (!el) return;
    try { el.value = value || ''; } catch (_) {}
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
  }

  function profile() {
    return {
      nick1: (native('.input-nick1') || {}).value || '',
      nick2: (native('.input-nick2') || {}).value || '',
      tag: (native('.input-tag') || {}).value || '',
      skin1: (native('.input-skin1') || {}).value || '',
      skin2: (native('.input-skin2') || {}).value || ''
    };
  }

  function syncProfileToSenpa() {
    nativeInput('.input-nick1', id('hslo-nick1').value);
    nativeInput('.input-nick2', id('hslo-nick2').value);
    nativeInput('.input-tag', id('hslo-tag').value);
    nativeInput('.input-skin1', id('hslo-skin1').value);
    nativeInput('.input-skin2', id('hslo-skin2').value);
    if (typeof window.__jaxApplySkinsToGame === 'function') {
      try { window.__jaxApplySkinsToGame(); } catch (_) {}
    }
  }

  function refreshProfileForm() {
    var p = profile();
    [['hslo-nick1', p.nick1], ['hslo-nick2', p.nick2], ['hslo-tag', p.tag], ['hslo-skin1', p.skin1], ['hslo-skin2', p.skin2]].forEach(function (item) {
      var el = id(item[0]); if (el) el.value = item[1];
    });
    refreshSkinPreview();
  }

  function refreshSkinPreview() {
    var p = profile();
    var url = activeSkin === 2 ? (p.skin2 || p.skin1) : p.skin1;
    var preview = id('hslo-skin-preview');
    if (!preview) return;
    if (url) {
      try { if (window.proxyUrl) url = window.proxyUrl(url); } catch (_) {}
      preview.style.backgroundImage = 'url("' + String(url).replace(/\"/g, '') + '")';
    } else {
      preview.style.backgroundImage = 'radial-gradient(circle at 35% 28%,#fff 0 8%,#9da3aa 11%,#30353b 42%,#090b0e 76%)';
    }
  }

  function accountName() {
    try {
      var session = JSON.parse(localStorage.getItem('senpaio:session') || 'null');
      return session && (session.username || session.name || (session.user && (session.user.username || session.user.name))) || 'Guest';
    } catch (_) { return 'Guest'; }
  }

  function auth(provider) {
    if (typeof window.__JAXXV6_OPEN_AUTH__ === 'function') {
      window.__JAXXV6_OPEN_AUTH__(provider);
      return;
    }
    var url = provider === 'facebook' ? 'https://api.senpa.io/auth/facebook' : 'https://api.senpa.io/auth/discord';
    window.open(url, 'senpa-auth', 'width=600,height=700');
  }

  function serverState() {
    try {
      var h = window.app && window.app.dualConnectionHandler;
      if (h && h.totalPlaying > 0) return 'PLAYING';
      if (h && h.length > 0) return 'CONNECTED';
      if (window.app && window.app.player && window.app.player.pendingConnections && window.app.player.pendingConnections.length) return 'CONNECTING';
    } catch (_) {}
    return 'READY';
  }

  function toggleNativeSetting(key, value) {
    try {
      if (window.app && window.app.settings && typeof window.app.settings.set === 'function') window.app.settings.set(key, value);
    } catch (_) {}
  }

  function applyState() {
    if (!document.body) return;
    document.body.classList.toggle('hslo-senpa-ui', true);
    document.body.classList.toggle('hslo-reduced-motion', !!state.reducedMotion);
    document.body.classList.toggle('hslo-compact-hud', !!state.compactHUD);
    document.body.classList.toggle('hslo-no-chat', !state.showChat);
    document.body.classList.toggle('hslo-no-leaderboard', !state.showLeaderboard);
    document.body.classList.toggle('hslo-no-minimap', !state.showMinimap);
    document.body.classList.toggle('hslo-no-targeting', !state.showTargeting);
    document.body.classList.toggle('hslo-no-teamlist', !state.showTeamList);
    document.body.classList.toggle('hslo-pink-accent', !!state.pinkAccent);
    document.documentElement.style.setProperty('--hslo-opacity', String(Math.max(35, Math.min(100, Number(state.opacity) || 86)) / 100));
    document.documentElement.dataset.hsloCursor = state.cursor || 'crosshair';
    toggleNativeSetting('showChat', !!state.showChat);
    toggleNativeSetting('showMinimap', !!state.showMinimap);
    toggleNativeSetting('showHUD', !!state.showLeaderboard);
  }

  function injectStyle() {
    if (id('hslo-senpa-ui-style')) return;
    var s = document.createElement('style');
    s.id = 'hslo-senpa-ui-style';
    s.textContent = `
      :root { --hslo-bg:#080a0d; --hslo-panel:rgba(13,16,20,var(--hslo-opacity,.86)); --hslo-line:rgba(255,255,255,.14); --hslo-text:rgba(255,255,255,.92); --hslo-muted:rgba(255,255,255,.48); --hslo-accent:#e9e9e9; --hslo-hot:#ff5c91; }
      body.hslo-senpa-ui .lobby-overlay, body.hslo-senpa-ui #settingsOverlay, body.hslo-senpa-ui #skinsOverlay, body.hslo-senpa-ui #ryuten-full-ui { display:none !important; }
      body.hslo-senpa-ui .hud-overlay { font-family:'Ubuntu','Titillium Web',sans-serif; }
      body.hslo-senpa-ui #hud-leaderboard { top:18px !important; right:18px !important; width:224px !important; padding:10px 12px !important; background:rgba(8,10,13,.72) !important; border:1px solid var(--hslo-line) !important; border-radius:2px !important; box-shadow:0 10px 30px rgba(0,0,0,.30) !important; }
      body.hslo-senpa-ui #hud-leaderboard .og-private-label { color:rgba(255,255,255,.40) !important; letter-spacing:2px !important; text-shadow:none !important; font-weight:400 !important; }
      body.hslo-senpa-ui #chat-container { left:18px !important; bottom:18px !important; width:310px !important; background:rgba(8,10,13,.74) !important; border:1px solid var(--hslo-line) !important; border-radius:2px !important; }
      body.hslo-senpa-ui #chat-messages { max-height:184px !important; }
      body.hslo-senpa-ui #minimap-container { right:18px !important; bottom:18px !important; border:1px solid var(--hslo-line) !important; background:rgba(8,10,13,.72) !important; }
      body.hslo-no-chat #chat-container, body.hslo-no-minimap #minimap-container, body.hslo-no-leaderboard #hud-leaderboard { display:none !important; }
      body.hslo-senpa-ui .hud-overlay::after { content:'SENPA NETWORK'; position:fixed; right:18px; bottom:6px; font:9px 'Ubuntu',sans-serif; letter-spacing:3px; color:rgba(255,255,255,.24); pointer-events:none; }
      body.hslo-reduced-motion *, body.hslo-reduced-motion *::before, body.hslo-reduced-motion *::after { animation-duration:.001ms !important; transition-duration:.001ms !important; }
      #hslo-senpa-ui, #hslo-senpa-ui * { box-sizing:border-box; }
      #hslo-senpa-ui { position:fixed; inset:0; z-index:3900; color:var(--hslo-text); font:400 14px 'Ubuntu','Titillium Web',sans-serif; pointer-events:none; opacity:0; transition:opacity .22s ease; }
      #hslo-senpa-ui.hslo-menu-open { opacity:1; }
      #hslo-senpa-ui .hslo-menu-overlay { position:absolute; inset:0; background:radial-gradient(circle at 50% 42%,rgba(40,44,51,.30),rgba(4,5,7,.96) 72%),linear-gradient(120deg,rgba(255,255,255,.025),transparent 42%); pointer-events:auto; }
      #hslo-senpa-ui .hslo-menu-overlay::after { content:''; position:absolute; inset:0; opacity:.055; background-image:radial-gradient(rgba(255,255,255,.5) .5px,transparent .7px); background-size:5px 5px; pointer-events:none; }
      #hslo-senpa-ui .hslo-topbar { position:absolute; z-index:2; left:22px; top:17px; right:22px; display:flex; align-items:center; justify-content:space-between; }
      #hslo-senpa-ui .hslo-brand { font-size:21px; letter-spacing:7px; font-weight:600; }
      #hslo-senpa-ui .hslo-brand small { display:block; margin-top:4px; font-size:8px; letter-spacing:3px; color:var(--hslo-muted); font-weight:400; }
      #hslo-senpa-ui .hslo-menu-bar { display:flex; align-items:center; gap:5px; }
      #hslo-senpa-ui .hslo-menu-button { min-width:34px; height:29px; padding:0 10px; border:1px solid var(--hslo-line); background:rgba(255,255,255,.035); color:var(--hslo-muted); cursor:pointer; font-size:10px; letter-spacing:1px; }
      #hslo-senpa-ui .hslo-menu-button:hover { background:rgba(255,255,255,.14); color:#fff; border-color:rgba(255,255,255,.4); }
      #hslo-senpa-ui .hslo-server-state { margin-left:8px; padding:7px 10px; font-size:9px; letter-spacing:1px; color:var(--hslo-muted); border:1px solid var(--hslo-line); background:rgba(0,0,0,.25); }
      #hslo-senpa-ui .hslo-server-state b { color:#9be9bd; font-weight:400; }
      #hslo-senpa-ui .hslo-player-data { position:absolute; z-index:2; right:30px; top:94px; width:250px; padding:14px; background:var(--hslo-panel); border:1px solid var(--hslo-line); box-shadow:0 15px 42px rgba(0,0,0,.28); transition:opacity .15s,transform .15s; }
      #hslo-senpa-ui .hslo-player-data.hslo-hidden { opacity:0; pointer-events:none; transform:translateY(-8px); }
      #hslo-senpa-ui .hslo-section-label { color:var(--hslo-muted); font-size:9px; letter-spacing:3px; text-transform:uppercase; margin-bottom:10px; }
      #hslo-senpa-ui input, #hslo-senpa-ui select { width:100%; height:32px; margin-bottom:7px; padding:0 9px; border:1px solid var(--hslo-line); background:rgba(255,255,255,.045); color:#fff; outline:none; font:400 11px 'Ubuntu',sans-serif; }
      #hslo-senpa-ui input:focus, #hslo-senpa-ui select:focus { border-color:rgba(255,255,255,.5); background:rgba(255,255,255,.09); }
      #hslo-senpa-ui input::placeholder { color:rgba(255,255,255,.35); }
      #hslo-senpa-ui .hslo-input-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
      #hslo-senpa-ui .hslo-input-grid input { margin-bottom:0; }
      #hslo-senpa-ui .hslo-party-row { display:grid; grid-template-columns:1fr auto; gap:6px; margin-top:7px; }
      #hslo-senpa-ui .hslo-party-row input { margin:0; }
      #hslo-senpa-ui .hslo-small-button, #hslo-senpa-ui .hslo-action { border:1px solid var(--hslo-line); background:rgba(255,255,255,.05); color:var(--hslo-text); cursor:pointer; font:400 10px 'Ubuntu',sans-serif; letter-spacing:1px; }
      #hslo-senpa-ui .hslo-small-button { padding:0 9px; }
      #hslo-senpa-ui .hslo-action { padding:10px 12px; }
      #hslo-senpa-ui .hslo-action:hover, #hslo-senpa-ui .hslo-small-button:hover { border-color:rgba(255,255,255,.45); background:rgba(255,255,255,.12); }
      #hslo-senpa-ui .hslo-skin-stage { position:absolute; z-index:1; left:50%; top:43%; transform:translate(-50%,-50%); text-align:center; }
      #hslo-senpa-ui .hslo-skin-preview { width:158px; height:158px; border-radius:50%; border:1px solid rgba(255,255,255,.27); box-shadow:0 0 0 8px rgba(255,255,255,.035),0 0 55px rgba(255,255,255,.08); background:radial-gradient(circle at 35% 28%,#fff 0 8%,#9da3aa 11%,#30353b 42%,#090b0e 76%); background-position:center; background-size:cover; margin:0 auto 9px; }
      #hslo-senpa-ui .hslo-skin-caption { color:var(--hslo-muted); font-size:9px; letter-spacing:3px; }
      #hslo-senpa-ui .hslo-skin-wheel { display:flex; justify-content:center; gap:5px; margin-top:13px; }
      #hslo-senpa-ui .hslo-skin-dot { width:20px; height:20px; border-radius:50%; border:1px solid var(--hslo-line); background:rgba(255,255,255,.08); cursor:pointer; }
      #hslo-senpa-ui .hslo-skin-dot.active, #hslo-senpa-ui .hslo-skin-dot:hover { border-color:#fff; background:#fff; }
      #hslo-senpa-ui .hslo-control-bar { position:absolute; z-index:2; left:50%; bottom:27px; transform:translateX(-50%); display:flex; align-items:flex-end; gap:4px; }
      #hslo-senpa-ui .hslo-control { min-width:78px; height:50px; padding:6px 10px; border:1px solid var(--hslo-line); background:rgba(13,16,20,.86); color:var(--hslo-muted); cursor:pointer; font-size:10px; letter-spacing:1.3px; }
      #hslo-senpa-ui .hslo-control:first-child { border-left:2px solid rgba(255,255,255,.72); }
      #hslo-senpa-ui .hslo-control:hover, #hslo-senpa-ui .hslo-control.active { color:#fff; border-color:rgba(255,255,255,.5); background:rgba(255,255,255,.11); }
      #hslo-senpa-ui .hslo-control b { display:block; font-size:17px; line-height:20px; font-weight:400; }
      #hslo-senpa-ui .hslo-menu-footer { position:absolute; z-index:2; left:22px; right:22px; bottom:9px; display:flex; justify-content:space-between; color:rgba(255,255,255,.25); font-size:8px; letter-spacing:2px; }
      #hslo-senpa-ui .hslo-panel { position:fixed; inset:0; z-index:4; display:flex; align-items:center; justify-content:center; background:rgba(3,4,6,.78); opacity:0; pointer-events:none; transition:opacity .16s; }
      #hslo-senpa-ui .hslo-panel.open { opacity:1; pointer-events:auto; }
      #hslo-senpa-ui .hslo-panel-box { width:min(760px,calc(100vw - 28px)); max-height:min(680px,calc(100vh - 28px)); overflow:auto; background:#111419; border:1px solid var(--hslo-line); box-shadow:0 25px 90px rgba(0,0,0,.6); }
      #hslo-senpa-ui .hslo-panel-header { display:flex; justify-content:space-between; align-items:center; padding:17px 19px; border-bottom:1px solid var(--hslo-line); }
      #hslo-senpa-ui .hslo-panel-header strong { letter-spacing:4px; font-size:12px; }
      #hslo-senpa-ui .hslo-close { border:0; background:transparent; color:var(--hslo-muted); cursor:pointer; font-size:21px; }
      #hslo-senpa-ui .hslo-settings-body { padding:18px 20px; }
      #hslo-senpa-ui .hslo-row { display:flex; align-items:center; justify-content:space-between; gap:15px; padding:13px 0; border-bottom:1px solid rgba(255,255,255,.07); }
      #hslo-senpa-ui .hslo-row span { color:rgba(255,255,255,.82); font-size:12px; }
      #hslo-senpa-ui .hslo-row small { display:block; color:var(--hslo-muted); font-size:10px; margin-top:3px; }
      #hslo-senpa-ui .hslo-toggle { border:1px solid var(--hslo-line); background:rgba(255,255,255,.04); color:var(--hslo-muted); padding:7px 10px; cursor:pointer; font-size:10px; letter-spacing:1px; }
      #hslo-senpa-ui .hslo-toggle.on { color:#111; background:#fff; border-color:#fff; }
      #hslo-senpa-ui .hslo-panel-footer { display:flex; justify-content:flex-end; gap:6px; padding:12px 18px; border-top:1px solid var(--hslo-line); }
      #hslo-senpa-ui .hslo-accent-card { margin-top:14px; padding:13px; border:1px solid rgba(255,92,145,.25); background:rgba(255,92,145,.04); display:flex; gap:12px; align-items:center; }
      #hslo-senpa-ui .hslo-accent-card img { width:58px; height:63px; object-fit:contain; filter:drop-shadow(0 0 10px rgba(255,92,145,.45)); }
      #hslo-senpa-ui .hslo-accent-card strong { color:#ff8eae; font-size:10px; letter-spacing:2px; }
      #hslo-senpa-ui .hslo-accent-card small { display:block; color:var(--hslo-muted); font-size:9px; margin-top:3px; }
      #hslo-senpa-targeting { position:fixed; z-index:3500; top:50%; right:18px; transform:translateY(-50%); width:190px; padding:9px 11px; color:var(--hslo-muted); background:rgba(8,10,13,.65); border:1px solid var(--hslo-line); font:10px 'Ubuntu',sans-serif; pointer-events:none; }
      #hslo-senpa-targeting .hslo-target-title { color:#fff; letter-spacing:2px; margin-bottom:8px; }
      #hslo-senpa-targeting .hslo-target-line { padding:5px 0; border-top:1px solid rgba(255,255,255,.07); display:flex; justify-content:space-between; }
      #hslo-senpa-targeting.hslo-hidden { display:none; }
      @media (max-width:800px) { #hslo-senpa-ui .hslo-player-data { left:14px; right:14px; top:76px; width:auto; } #hslo-senpa-ui .hslo-skin-stage { top:39%; } #hslo-senpa-ui .hslo-control { min-width:56px; padding:5px; } #hslo-senpa-ui .hslo-control .hslo-label { font-size:8px; letter-spacing:.5px; } #hslo-senpa-ui .hslo-server-state { display:none; } }
    `;
    document.head.appendChild(s);
  }

  function html() {
    var p = profile();
    return `
      <div class="hslo-menu-overlay"></div>
      <div class="hslo-topbar"><div class="hslo-brand">HSLO<small>SENPA COMPATIBILITY CLIENT</small></div><div class="hslo-menu-bar"><button class="hslo-menu-button" data-auth="discord">DISCORD</button><button class="hslo-menu-button" data-auth="facebook">FACEBOOK</button><button class="hslo-menu-button" id="hslo-refresh">↻</button><div class="hslo-server-state">EU1 · <b id="hslo-state">READY</b></div></div></div>
      <div class="hslo-player-data" id="hslo-player-data"><div class="hslo-section-label">PLAYER DATA</div><div class="hslo-input-grid"><input id="hslo-tag" maxlength="10" placeholder="TAG" value="${esc(p.tag)}"><input id="hslo-tag2" maxlength="10" placeholder="TAG 2"></div><div class="hslo-input-grid" style="margin-top:7px"><input id="hslo-nick1" maxlength="32" placeholder="NICK 1" value="${esc(p.nick1)}"><input id="hslo-nick2" maxlength="32" placeholder="NICK 2" value="${esc(p.nick2)}"></div><input id="hslo-skin1" placeholder="SKIN URL 1" value="${esc(p.skin1)}"><input id="hslo-skin2" placeholder="SKIN URL 2" value="${esc(p.skin2)}"><div class="hslo-party-row"><input id="hslo-party" maxlength="8" placeholder="ROOM CODE"><button class="hslo-small-button" id="hslo-join">JOIN</button></div><div class="hslo-input-grid" style="margin-top:7px"><select id="hslo-mode"><option value="ffa">FFA</option><option value="team">TEAMS</option><option value="party">PARTY</option></select><select id="hslo-region"><option value="eu">EUROPE</option></select></div></div>
      <div class="hslo-skin-stage"><div class="hslo-skin-preview" id="hslo-skin-preview"></div><div class="hslo-skin-caption">SENPA SKIN <span id="hslo-skin-number">1</span></div><div class="hslo-skin-wheel"><button class="hslo-skin-dot active" data-skin="1"></button><button class="hslo-skin-dot" data-skin="2"></button><button class="hslo-skin-dot" data-skin="3"></button><button class="hslo-skin-dot" data-skin="4"></button><button class="hslo-skin-dot" data-skin="5"></button></div></div>
      <div class="hslo-control-bar"><button class="hslo-control" data-action="settings"><b>⚙</b><span class="hslo-label">SETTINGS</span></button><button class="hslo-control" data-action="play"><b>▶</b><span class="hslo-label">PLAY</span></button><button class="hslo-control" data-action="spectate"><b>◉</b><span class="hslo-label">SPECTATE</span></button><button class="hslo-control" data-action="inputs"><b>⌨</b><span class="hslo-label">INPUTS</span></button><button class="hslo-control" data-action="theme"><b>◈</b><span class="hslo-label">THEME</span></button></div>
      <div class="hslo-menu-footer"><span>ORIGINAL HSLO-STYLE UI · SENPA TRANSPORT</span><span>AUTH: OFFICIAL · CAPTCHA: NATIVE ONLY</span></div>
      <div class="hslo-panel" id="hslo-settings"><div class="hslo-panel-box"><div class="hslo-panel-header"><strong>SETTINGS</strong><button class="hslo-close" data-close="settings">×</button></div><div class="hslo-settings-body" id="hslo-settings-body"></div><div class="hslo-panel-footer"><button class="hslo-action" id="hslo-reset">RESET</button><button class="hslo-action" data-close="settings">DONE</button></div></div></div>
      <div class="hslo-panel" id="hslo-theme"><div class="hslo-panel-box"><div class="hslo-panel-header"><strong>THEME</strong><button class="hslo-close" data-close="theme">×</button></div><div class="hslo-settings-body" id="hslo-theme-body"></div></div></div>
    `;
  }

  function settingRow(key, label, note) {
    return '<div class="hslo-row"><div><span>' + label + '</span><small>' + note + '</small></div><button class="hslo-toggle ' + (state[key] ? 'on' : '') + '" data-setting="' + key + '">' + (state[key] ? 'ON' : 'OFF') + '</button></div>';
  }

  function renderSettings() {
    var host = id('hslo-settings-body');
    if (!host) return;
    host.innerHTML = settingRow('showChat','Chat','Use the native Senpa chat panel.') + settingRow('showLeaderboard','Leaderboard','Use the native Senpa leaderboard state.') + settingRow('showMinimap','Minimap','Use the native Senpa minimap state.') + settingRow('showTargeting','Targeting panel','Local visual helper only.') + settingRow('showTeamList','Team list','Local visual helper only.') + settingRow('compactHUD','Compact HUD','Reduce overlay spacing.') + '<div class="hslo-row"><div><span>Opacity</span><small>Local panel opacity.</small></div><input id="hslo-opacity" type="range" min="35" max="100" value="' + Number(state.opacity) + '" style="max-width:180px;margin:0"></div>';
    host.querySelectorAll('[data-setting]').forEach(function (button) { button.addEventListener('click', function () { var key = button.getAttribute('data-setting'); state[key] = !state[key]; saveState(); applyState(); renderSettings(); }); });
    var op = id('hslo-opacity'); if (op) op.addEventListener('input', function () { state.opacity = Number(op.value); saveState(); applyState(); });
  }

  function renderTheme() {
    var host = id('hslo-theme-body');
    if (!host) return;
    host.innerHTML = settingRow('darkMode','Dark mode','Keep the high-contrast dark presentation.') + settingRow('pinkAccent','Pink accent','Use the local accent color for highlights.') + settingRow('reducedMotion','Reduced motion','Reduce local CSS transitions.') + '<div class="hslo-accent-card"><img src="assets/ryuten-theme/virus-new.png" alt="Local virus visual"><div><strong>LOCAL VIRUS VISUAL</strong><small>This is a local asset preview. Senpa transport remains unchanged.</small></div></div>';
    host.querySelectorAll('[data-setting]').forEach(function (button) { button.addEventListener('click', function () { var key = button.getAttribute('data-setting'); state[key] = !state[key]; saveState(); applyState(); renderTheme(); }); });
  }

  function ensureTargeting() {
    if (id('hslo-senpa-targeting')) return;
    var target = document.createElement('div');
    target.id = 'hslo-senpa-targeting';
    target.innerHTML = '<div class="hslo-target-title">TARGETING</div><div class="hslo-target-line"><span>MODE</span><b id="hslo-target-mode">FOLLOW</b></div><div class="hslo-target-line"><span>TARGET 1</span><b>—</b></div><div class="hslo-target-line"><span>TARGET 2</span><b>—</b></div><div class="hslo-target-line"><span>TOTAL MASS</span><b>0</b></div>';
    document.body.appendChild(target);
  }

  function bind() {
    root.querySelectorAll('[data-auth]').forEach(function (button) { button.addEventListener('click', function () { auth(button.getAttribute('data-auth')); }); });
    root.querySelectorAll('[data-skin]').forEach(function (button) { button.addEventListener('click', function () { activeSkin = Number(button.getAttribute('data-skin')) === 2 ? 2 : 1; root.querySelectorAll('[data-skin]').forEach(function (b) { b.classList.toggle('active', b === button); }); id('hslo-skin-number').textContent = String(activeSkin); refreshSkinPreview(); }); });
    root.querySelectorAll('[data-action]').forEach(function (button) { button.addEventListener('click', function () { var action = button.getAttribute('data-action'); if (action === 'play') play(); else if (action === 'spectate') spectate(); else if (action === 'settings') openPanel('settings'); else if (action === 'theme') openPanel('theme'); else if (action === 'inputs') { inputsVisible = !inputsVisible; id('hslo-player-data').classList.toggle('hslo-hidden', !inputsVisible); } }); });
    root.querySelectorAll('[data-close]').forEach(function (button) { button.addEventListener('click', function () { closePanel(button.getAttribute('data-close')); }); });
    ['hslo-nick1','hslo-nick2','hslo-tag','hslo-skin1','hslo-skin2'].forEach(function (field) { id(field).addEventListener('input', function () { syncProfileToSenpa(); refreshSkinPreview(); }); });
    id('hslo-refresh').addEventListener('click', function () { nativeClick(['#btnReconnectNow','.btn-reconnect-menu']); });
    id('hslo-join').addEventListener('click', function () { var party = id('hslo-party').value.trim(); if (party) { nativeInput('.input-tag', party); nativeClick('#btnMenu'); } });
    id('hslo-reset').addEventListener('click', function () { state = readState(); localStorage.removeItem(STORE); applyState(); renderSettings(); renderTheme(); });
    var overlay = root.querySelector('.hslo-menu-overlay'); overlay.addEventListener('click', function () { if (!settingsVisible && !themeVisible) setMenu(false); });
  }

  function play() { syncProfileToSenpa(); nativeClick(['#btnMenu','.btn-play']); setMenu(false); }
  function spectate() { syncProfileToSenpa(); nativeClick(['#btnSpectate','.btn-spectate']); setMenu(false); }
  function setMenu(open) { menuVisible = !!open; if (root) root.classList.toggle('hslo-menu-open', menuVisible); }
  function openPanel(which) { settingsVisible = which === 'settings'; themeVisible = which === 'theme'; id('hslo-settings').classList.toggle('open', settingsVisible); id('hslo-theme').classList.toggle('open', themeVisible); if (settingsVisible) renderSettings(); if (themeVisible) renderTheme(); }
  function closePanel(which) { if (!which || which === 'settings') settingsVisible = false; if (!which || which === 'theme') themeVisible = false; if (id('hslo-settings')) id('hslo-settings').classList.toggle('open', settingsVisible); if (id('hslo-theme')) id('hslo-theme').classList.toggle('open', themeVisible); }

  function syncVisibility() {
    var legacy = q('.lobby-overlay');
    if (!legacy || settingsVisible || themeVisible) return;
    var isHidden = legacy.style.display === 'none';
    if (isHidden) setMenu(false); else if (!menuVisible) setMenu(true);
    var stateEl = id('hslo-state'); if (stateEl) stateEl.textContent = serverState();
    var target = id('hslo-senpa-targeting'); if (target) target.classList.toggle('hslo-hidden', !state.showTargeting);
  }

  function init() {
    if (!document.body || !q('#gameCanvas')) return;
    injectStyle();
    document.body.classList.add('hslo-senpa-ui');
    var old = id('hslo-senpa-ui'); if (old) old.remove();
    root = document.createElement('div'); root.id = 'hslo-senpa-ui'; root.innerHTML = html(); document.body.appendChild(root);
    bind(); ensureTargeting(); refreshProfileForm(); applyState(); setMenu(true);
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(syncVisibility, 700);
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') { if (settingsVisible || themeVisible) closePanel(); else if (menuVisible) setMenu(false); else if (q('.lobby-overlay') && q('.lobby-overlay').style.display !== 'none') setMenu(true); } }, true);
    window.HsloSenpaUI = { openSettings: function () { openPanel('settings'); }, openTheme: function () { openPanel('theme'); }, play: play, spectate: spectate, showMenu: function () { setMenu(true); } };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 80); }); else setTimeout(init, 80);
})();
