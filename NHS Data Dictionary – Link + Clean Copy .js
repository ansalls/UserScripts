// ==UserScript==
// @name         NHS Data Dictionary – Link + Clean Copy
// @namespace    http://tampermonkey.net/
// @version      2025-08-31
// @description  Link the page title and provide clean copy (Title Case, minimal HTML).
// @match        https://www.datadictionary.nhs.uk/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  /** ---------- Styles (scoped) ---------- */
  const style = document.createElement('style');
  style.textContent = `
    .ndd-copy-btn { display:inline-block; margin-right:8px; cursor:pointer; user-select:none; }
    .ndd-copy-btn:focus { outline: none; }
  `;
  document.head.appendChild(style);

  /** ---------- Selectors / utils ---------- */
  const TITLE_SEL = 'main h1[id^="ariaid-title"], main h1[aria-labelledby], main h1'; // robust fallbacks
  const here = () => location.href;

  /** Title-case that’s sane for headings (keeps acronyms; handles hyphenation) */
  function toTitleCase(s) {
    if (!s) return s;
    const small = new Set(['a','an','the','and','but','or','nor','as','at','by','for','in','of','on','per','to','vs','via','with','from','into','onto','over','upon','than']);
    const tokens = s.trim().replace(/\s+/g,' ').split(' ');
    const fixWord = (w, i, last) => {
      // preserve acronyms/initialisms (NHS, A&E, ICD-10, GP, etc.)
      if ((/[A-Z].*[A-Z]/.test(w) && !/[a-z]/.test(w)) || /[0-9&]/.test(w)) return w;
      // hyphenated words: Title-Case each side respecting small words
      if (w.includes('-')) return w.split('-').map((part, k, arr) => fixWord(part, i, last)).join('-');
      const lower = w.toLowerCase();
      if (i !== 0 && i !== last && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    };
    return tokens.map((w,i) => fixWord(w,i,tokens.length-1)).join(' ');
  }

  /** Build clean HTML/plain for the clipboard */
  const makeHTML = title => `<a href="${here()}">${title}</a>`;
  const makeText = title => title;

  /** Button inject */
  function addButton(h1, titleCase) {
    if (h1.querySelector('.ndd-copy-btn')) return;
    const btn = document.createElement('span');
    btn.className = 'ndd-copy-btn';
    btn.setAttribute('data-nocopy','1');           // never included in manual copy
    btn.textContent = '🔗';
    btn.title = 'Copy clean title';
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => {
      copyBoth(makeHTML(titleCase), makeText(titleCase));
    });
    h1.insertBefore(btn, h1.firstChild);
  }

  /** Minimal clipboard writer (HTML + plain) */
  function copyBoth(html, text) {
    const onCopy = e => {
      e.clipboardData.setData('text/html', html);
      e.clipboardData.setData('text/plain', text);
      e.preventDefault();
    };
    document.addEventListener('copy', onCopy, { once:true, capture:true });
    document.execCommand('copy');
  }

  /** Clean manual copy of the title */
  function cleanCopy(e) {
    const sel = getSelection();
    if (!sel || sel.isCollapsed) return;
    const h1 = document.querySelector(TITLE_SEL);
    if (!h1 || !sel.containsNode?.(h1, true)) return;

    const raw = getTitleText(h1);
    if (!raw) return;
    const tc = toTitleCase(raw);
    e.clipboardData.setData('text/plain', tc);
    e.clipboardData.setData('text/html',  makeHTML(tc));
    e.preventDefault();
  }

  /** Read the visible title text, excluding our button */
  function getTitleText(h1) {
    const clone = h1.cloneNode(true);
    clone.querySelectorAll('[data-nocopy]').forEach(n => n.remove());
    return clone.innerText.replace(/\s+/g,' ').trim();
  }

  /** Linkify the title (idempotent, minimal DOM churn) */
  function linkifyTitle(h1) {
    if (h1.dataset.nddLinked === '1') return;

    const raw = getTitleText(h1);
    if (!raw) { h1.dataset.nddLinked = '1'; return; }

    const titleCase = toTitleCase(raw);

    // If there is already an <a>, just replace its text and href
    const aExisting = h1.querySelector('a');
    if (aExisting && aExisting.textContent.trim()) {
      addButton(h1, titleCase);
      aExisting.textContent = titleCase;
      aExisting.href = here();
      h1.dataset.nddLinked = '1';
      return;
    }

    // Otherwise rebuild: [button][<a>Title Case</a>]
    // Keep any trailing nodes (e.g., decorative pseudo content) out of the way.
    h1.textContent = '';
    addButton(h1, titleCase);
    const a = document.createElement('a');
    a.href = here();
    a.textContent = titleCase;
    h1.appendChild(a);

    h1.dataset.nddLinked = '1';
  }

  function run() {
    const h1 = document.querySelector(TITLE_SEL);
    if (!h1) return;
    linkifyTitle(h1);
    // Retry once in case the site paints the header a bit late
    setTimeout(() => linkifyTitle(h1), 300);
    document.addEventListener('copy', cleanCopy, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
