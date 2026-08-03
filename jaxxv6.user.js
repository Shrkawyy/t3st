// ==UserScript==
// @name         JaxxV6 for Senpa
// @namespace    https://github.com/Shrkawyy/jaxxv6
// @version      6.0.0
// @description  Loads the JaxxV6 client on Senpa's official web origin.
// @author       Shrkawyy
// @match        https://senpa.io/web/*
// @match        https://www.senpa.io/web/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      shrkawyy.github.io
// @noframes
// @updateURL    https://shrkawyy.github.io/jaxxv6/jaxxv6.user.js
// @downloadURL  https://shrkawyy.github.io/jaxxv6/jaxxv6.user.js
// ==/UserScript==

(function () {
  'use strict';

  const DEFAULT_BASE_URL = 'https://shrkawyy.github.io/jaxxv6/';
  const CLIENT_FILE = 'client.html';
  const VERSION = '6.0.0';

  function normalizeBaseUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return DEFAULT_BASE_URL;
      return url.href.endsWith('/') ? url.href : `${url.href}/`;
    } catch (_) {
      return DEFAULT_BASE_URL;
    }
  }

  function getBaseUrl() {
    const override = localStorage.getItem('jaxxv6:base-url');
    return normalizeBaseUrl(override || DEFAULT_BASE_URL);
  }

  function renderLoading() {
    window.stop();
    document.open();
    document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>JaxxV6</title>
      <style>
        html,body{height:100%;margin:0;background:#07090d;color:#dce7f4;font:16px system-ui,sans-serif}
        body{display:grid;place-items:center}.box{text-align:center}.spinner{width:34px;height:34px;margin:0 auto 16px;border:3px solid #263343;border-top-color:#41d9ff;border-radius:50%;animation:spin .8s linear infinite}
        small{color:#7990a8}@keyframes spin{to{transform:rotate(360deg)}}
      </style></head><body><div class="box"><div class="spinner"></div><div>Loading JaxxV6…</div><small>senpa.io · direct connection</small></div></body></html>`);
    document.close();
  }

  function renderError(message) {
    document.open();
    document.write(`<!doctype html><html><head><meta charset="utf-8"><title>JaxxV6 load error</title>
      <style>html,body{height:100%;margin:0;background:#090b10;color:#e8eef6;font:16px system-ui,sans-serif}body{display:grid;place-items:center}.box{max-width:620px;padding:30px;border:1px solid #2a3645;border-radius:14px;background:#111721}h1{margin-top:0;color:#ff647c}code{color:#72e5ff}button{padding:10px 16px;border:0;border-radius:8px;cursor:pointer}</style>
      </head><body><div class="box"><h1>JaxxV6 could not load</h1><p>${escapeHtml(message)}</p><p>Check that GitHub Pages is enabled for the <code>jaxxv6</code> repository, then reload.</p><button onclick="location.reload()">Reload</button></div></body></html>`);
    document.close();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function prepareClientHtml(source, baseUrl) {
    const bootstrap = `<base href="${baseUrl}">\n<script>window.__JAXXV6_BASE_URL=${JSON.stringify(baseUrl)};window.__JAXXV6_USERSCRIPT__=true;<\/script>`;
    if (/<head(?:\s[^>]*)?>/i.test(source)) {
      return source.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}\n${bootstrap}`);
    }
    return `${bootstrap}\n${source}`;
  }

  const baseUrl = getBaseUrl();
  renderLoading();

  GM_xmlhttpRequest({
    method: 'GET',
    url: `${baseUrl}${CLIENT_FILE}?v=${encodeURIComponent(VERSION)}`,
    timeout: 15000,
    headers: { 'Cache-Control': 'no-cache' },
    onload(response) {
      if (response.status < 200 || response.status >= 300) {
        renderError(`GitHub Pages returned HTTP ${response.status} for ${CLIENT_FILE}.`);
        return;
      }
      document.open();
      document.write(prepareClientHtml(response.responseText, baseUrl));
      document.close();
    },
    ontimeout() {
      renderError('The GitHub Pages request timed out.');
    },
    onerror() {
      renderError('The GitHub Pages request failed.');
    }
  });
})();
