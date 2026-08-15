/*
 * Senpa FFA chat bridge.
 *
 * The addon previously created a separate private Ably chat. That chat is
 * removed completely. Senpa's bundled client already owns the FFA chat
 * socket, protocol, message list, input, shortcuts, and emoji picker.
 * This file only reveals the native chat container.
 */
(function () {
  'use strict';

  var started = false;

  function ready() {
    return !!(
      window.app &&
      window.app.chatBox &&
      document.getElementById('chat-container') &&
      document.getElementById('chat-input')
    );
  }

  function showNativeChat() {
    var container = document.getElementById('chat-container');
    if (!container) return false;

    container.style.display = 'flex';
    container.setAttribute('data-chat-owner', 'senpa-ffa');
    return true;
  }

  function install() {
    if (started || !ready()) return false;
    started = true;

    var style = document.createElement('style');
    style.id = 'senpa-ffa-chat-only-style';
    style.textContent = `
      /* The addon chat no longer has a DOM or a network connection. */
      html body #chat-container[data-chat-owner="senpa-ffa"] {
        display: flex !important;
        z-index: 9999999;
      }
    `;
    document.head.appendChild(style);
    showNativeChat();

    // The native ChatBox may reapply its HUD visibility after reconnects.
    window.setInterval(function () {
      if (!document.hidden && ready()) showNativeChat();
    }, 1000);

    return true;
  }

  function init() {
    var tryInstall = function () {
      if (install()) return;
      var observer = new MutationObserver(function () {
        if (install()) observer.disconnect();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      window.setTimeout(function () {
        if (!started) observer.disconnect();
      }, 15000);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryInstall, { once: true });
    } else {
      tryInstall();
    }
  }

  init();
})();
