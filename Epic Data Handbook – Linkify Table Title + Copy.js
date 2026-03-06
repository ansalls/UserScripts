// ==UserScript==
// @name         Epic Data Handbook – Linkify Table Title + Copy
// @namespace    http://tampermonkey.net/
// @version      2025-09-01
// @description  Linkify Clarity Dictionary table names with a clean-copy button and copy override
// @match        https://datahandbook.epic.com/ClarityDictionary/Details*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const here = () => location.href;

  /* ---------- Styles ---------- */
  const style = document.createElement('style');
  style.textContent = `
    .dh-copy-btn {
      display:inline-block;
      margin-right:8px;
      cursor:pointer;
      user-select:none;
    }
    .dh-copy-btn:focus { outline:none; }
  `;
  document.head.appendChild(style);

  /* ---------- Helpers ---------- */
  function qsAll(sel) { return Array.from(document.querySelectorAll(sel)); }

  function findTitleCell() {
    // Prefer td text that matches the tblName query parameter
    const param = new URLSearchParams(location.search).get('tblName') || '';
    const want = param.trim().toUpperCase();

    // Gather likely candidates in priority order
    const candidates = [
      ...qsAll('#contentHeader td:first-child'),   // some pages
      ...qsAll('#contentheader td:first-child'),   // others use lowercase id
      ...qsAll('table.Header2 td:first-child')     // generic fallback (works on your screenshot)
    ];

    // 1) Exact match to tblName (case-insensitive)
    for (const td of candidates) {
      const text = td.textContent?.trim() || '';
