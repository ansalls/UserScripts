// ==UserScript==
// @name         Auto-Authorize Claude OAuth
// @namespace    http://tampermonkey.net/
// @version      2026-02-26
// @description  Auto-clicks the "Authorize" button on Claude OAuth authorize page.
// @author       You
// @match        https://claude.ai/oauth/authorize*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=claude.ai
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Guard: only run on the exact flow you want
  const url = new URL(window.location.href);
  if (url.pathname !== '/oauth/authorize') return;
  if (url.searchParams.get('code') !== 'true') return;
  if (!url.searchParams.get('client_id')) return;

  const TARGET_TEXT = 'Authorize';

  function findAuthorizeButton() {
    // Prefer real <button> first
    const buttons = Array.from(document.querySelectorAll('button'));
    const byText = buttons.find(b => (b.textContent || '').trim() === TARGET_TEXT);
    if (byText) return byText;

    // Fallbacks: role=button / input buttons
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

    // Avoid clicking disabled / inert buttons
    const disabled =
      btn.disabled === true ||
      btn.getAttribute('aria-disabled') === 'true' ||
      btn.matches('[disabled]') ||
      getComputedStyle(btn).pointerEvents === 'none';

    if (disabled) return false;

    btn.click();
    return true;
  }

  // Try immediately, then retry briefly (SPA / late render)
  if (clickIfReady()) return;

  let tries = 0;
  const maxTries = 40; // ~10s at 250ms
  const timer = setInterval(() => {
    tries += 1;
    if (clickIfReady() || tries >= maxTries) clearInterval(timer);
  }, 250);
})();
