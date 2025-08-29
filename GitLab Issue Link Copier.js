// ==UserScript==
// @name         GitLab Issue Link Copier
// @namespace    https://gitlab.*.com/
// @version      1.4
// @description  Use a Unicode “🔗” icon sized like the H1; copy a fully-formatted HTML link with breadcrumb + title.
// @match        https://gitlab.*.com/*/*/-/issues/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const issueMatch = window.location.pathname.match(/^\/[^\/]+\/[^\/]+\/-\/issues\/(\d+)$/);
    if (!issueMatch) return;
    const issueNumber = issueMatch[1];

    // Poll until the <h1> is present (GitLab injects it asynchronously)
    function waitForElement(selector, callback, interval = 300, timeout = 10000) {
        const start = Date.now();
        const handle = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(handle);
                callback(el);
            } else if (Date.now() - start > timeout) {
                clearInterval(handle);
                console.warn('[Issue Link Copier] Timed out waiting for selector:', selector);
            }
        }, interval);
    }

    waitForElement('h1', (titleElement) => {
        const rawTitleText = titleElement.textContent.trim();

        // Grab any “breadcrumb” links (<nav aria-label="Breadcrumb"> or class*="breadcrumb">)
        const breadcrumbLinks = Array.from(
            document.querySelectorAll(`
                nav[aria-label="Breadcrumb"] a,
                nav[class*="breadcrumb"] a,
                .breadcrumbs a,
                .breadcrumb a
            `)
        );

        // Filter out the “#456” crumb (text starting with “#”)
        const filteredCrumbs = breadcrumbLinks
            .map(a => a.textContent.trim())
            .filter(txt => txt && !txt.startsWith('#'));

        // Join with “ / ” if any crumbs exist
        const breadcrumbText = filteredCrumbs.join(' / ');

        // Build linkUrl and finalLinkText
        const linkUrl = window.location.origin + window.location.pathname;
        const finalLinkText = breadcrumbText
            ? `#${issueNumber} – ${breadcrumbText} / ${rawTitleText}`
            : `#${issueNumber} – ${rawTitleText}`;

        // 3f) Create a <span> with the link button
        const unicodeSpan = document.createElement('span');
        unicodeSpan.textContent = '🔗';
        unicodeSpan.title = 'Copy issue link as formatted HTML';
        unicodeSpan.style.fontSize = '0.5em';
        unicodeSpan.style.marginLeft = '0.3em';
        unicodeSpan.style.cursor = 'pointer';
        unicodeSpan.style.lineHeight = '1';


        function copyHtmlToClipboard(htmlString) {
            const tempDiv = document.createElement('div');
            tempDiv.contentEditable = 'true';
            tempDiv.style.position = 'fixed';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '-9999px';
            tempDiv.innerHTML = htmlString;
            document.body.appendChild(tempDiv);

            const range = document.createRange();
            range.selectNodeContents(tempDiv);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            let success = false;
            try {
                success = document.execCommand('copy');
            } catch (err) {
                console.error('[Issue Link Copier] execCommand(copy) failed:', err);
            }

            sel.removeAllRanges();
            document.body.removeChild(tempDiv);

            if (!success) {
                console.warn('[Issue Link Copier] document.execCommand("copy") reported failure.');
            }
        }

        // Click handler: build HTML <a> and copy it
        unicodeSpan.addEventListener('click', () => {
            const htmlLink = `<a href="${linkUrl}">${finalLinkText}</a>`;
            copyHtmlToClipboard(htmlLink);

            unicodeSpan.style.opacity = '0.5';
            setTimeout(() => unicodeSpan.style.opacity = '1', 150);
        });
        titleElement.appendChild(unicodeSpan);
    });
})();
