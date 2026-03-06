// ==UserScript==
// @name         Auto-Authorize Claude OAuth + Copy Code
// @namespace    http://tampermonkey.net/
// @version      2026-02-26
// @description  Auto-clicks Claude OAuth "Authorize", copies auth code on callback, closes success pages.
// @author       You
// @match        https://claude.ai/oauth/authorize*
// @match        https://platform.claude.com/oauth/code/callback*
// @match        https://platform.claude.com/oauth/code/success*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=claude.ai
// @grant        window.close
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const url = new URL(window.location.href);

  // -----------------------------
  // Part 1: claude.ai authorize
  // -----------------------------
  if (url.hostname === 'claude.ai' && url.pathname === '/oauth/authorize') {
    if (url.searchParams.get('code') !== 'true') return;
    if (!url.searchParams.get('client_id')) return;

    const TARGET_TEXT = 'Authorize';

    function findAuthorizeButton() {
      const buttons = Array.from(document.querySelectorAll('button'));
      const byText = buttons.find(b => (b.textContent || '').trim() === TARGET_TEXT);
      if (byText) return byText;

      const roleButtons = Array.from(document.querySelectorAll('[role="button"]'));
      const roleByText = roleButtons.find(b => (b.textContent || '').trim() === TARGET_TEXT);
      if (roleByText) return roleByText;

      const inputs = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
      const inputByValue = inputs.find(i => (i.value || '').trim() === TARGET_TEXT);
      if (inputByValue) return inputByValue;

      return null;
    }

    function clickIfReady() {
      const btn = findAuthorizeButton();
      if (!btn) return false;

      const disabled =
        btn.disabled === true ||
        btn.getAttribute('aria-disabled') === 'true' ||
        btn.matches('[disabled]') ||
        getComputedStyle(btn).pointerEvents === 'none';

      if (disabled) return false;

      btn.click();
      return true;
    }

    if (clickIfReady()) return;

    let tries = 0;
    const maxTries = 40; // ~10s
    const timer = setInterval(() => {
      tries += 1;
      if (clickIfReady() || tries >= maxTries) clearInterval(timer);
    }, 250);

    return;
  }

  // ----------------------------------------
  // Part 2: platform.claude.com callback page
  // ----------------------------------------
  if (url.hostname === 'platform.claude.com' && url.pathname === '/oauth/code/callback') {
    const codeFromUrl = url.searchParams.get('code');

    function getCodeFromPage() {
      const pre = document.querySelector('pre');
      if (pre && pre.textContent && pre.textContent.trim()) {
        return pre.textContent.trim();
      }

      const candidates = Array.from(
        document.querySelectorAll('pre, code, kbd, input, textarea')
      );

      for (const el of candidates) {
        const t = (el.value || el.textContent || '').trim();
        if (t.length >= 20 && /^[A-Za-z0-9_\-]+$/.test(t)) {
          return t;
        }
      }
      return null;
    }

    const code = (codeFromUrl && codeFromUrl.trim()) || getCodeFromPage();
    if (!code) return;

    GM_setClipboard(code, { type: 'text', mimetype: 'text/plain' });

    const copyBtn = Array.from(document.querySelectorAll('button'))
      .find(b => (b.textContent || '').trim().toLowerCase() === 'copy code');
    if (copyBtn) copyBtn.click();

    setTimeout(() => window.close(), 400);
    return;
  }

  // ----------------------------------------
  // Part 3: success page — just close
  // ----------------------------------------
  if (url.hostname === 'platform.claude.com' && url.pathname === '/oauth/code/success') {
    setTimeout(() => window.close(), 300);
    return;
  }
})();
