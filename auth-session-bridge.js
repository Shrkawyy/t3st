/*
 * Senpa OAuth session bridge.
 * The provider popup performs the actual login and any CAPTCHA challenge.
 * This page only accepts a token from the trusted Senpa API origin.
 */
(function () {
  'use strict';

  var AUTH_ORIGIN = 'https://api.senpa.io';
  var SESSION_KEY = 'senpaio:session';
  var ACCOUNT_KEY = 'senpaio:account';

  function isJwt(token) {
    if (typeof token !== 'string' || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return false;
    try {
      var payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      payload += '='.repeat((4 - payload.length % 4) % 4);
      var data = JSON.parse(atob(payload));
      return !data.exp || data.exp * 1000 > Date.now();
    } catch (_) {
      return false;
    }
  }

  function saveAccount(token) {
    fetch(AUTH_ORIGIN + '/account/', {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token }
    }).then(function (response) {
      return response.ok ? response.json() : null;
    }).then(function (account) {
      if (account) {
        try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); } catch (_) {}
      }
    }).catch(function () {});
  }

  function acceptToken(token, source) {
    if (!isJwt(token)) return false;
    try { localStorage.setItem(SESSION_KEY, token); } catch (_) {}
    saveAccount(token);
    try {
      if (source && source.postMessage) source.postMessage({ type: 'senpa-auth-done' }, AUTH_ORIGIN);
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('senpa-auth-updated'));
    return true;
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== AUTH_ORIGIN) return;
    var data = event.data || {};
    if (data.type === 'senpa-auth-ready') {
      try { event.source && event.source.postMessage({ type: 'senpa-auth-hello' }, AUTH_ORIGIN); } catch (_) {}
      return;
    }
    if (acceptToken(data.access_token, event.source)) {
      window.setTimeout(function () { location.reload(); }, 250);
    }
  });

  window.__JAXXV6_OPEN_AUTH__ = function (provider) {
    var endpoint = provider === 'facebook' ? '/auth/facebook' : '/auth/discord';
    var title = provider === 'facebook' ? 'Senpa Facebook Login' : 'Senpa Discord Login';
    var features = 'toolbar=no,menubar=no,width=600,height=700,top=100,left=100';
    var popup = window.open(AUTH_ORIGIN + endpoint, title, features);
    if (!popup) {
      window.dispatchEvent(new CustomEvent('senpa-auth-popup-blocked'));
      return false;
    }
    try { popup.focus(); } catch (_) {}
    return true;
  };
})();
