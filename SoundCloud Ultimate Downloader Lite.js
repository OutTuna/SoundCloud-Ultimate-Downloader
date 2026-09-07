// ==UserScript==
// @name         SoundCloud Ultimate Downloader Lite
// @namespace    http://tampermonkey.net/
// @version      3.0-lite
// @description  Lightweight version: avatars, banners, covers and single-track download
// @author       fellfromheaven
// @match        https://soundcloud.com/*
// @grant        none
// @icon         https://a-v2.sndcdn.com/assets/images/sc-icons/favicon-2cadd14bdb.ico
// ==/UserScript==

(function() {
    'use strict';

    const styles = `
        .sc-hover-zone { position: relative; }
        .sc-overlay-btn {
            position: absolute;
            background: rgba(15, 15, 15, 0.78);
            backdrop-filter: blur(6px);
            color: #fff;
            border: none;
            border-radius: 8px;
            padding: 6px 11px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 5px;
            opacity: 0;
            transition: opacity 0.18s, background 0.18s, transform 0.18s;
            pointer-events: none;
            z-index: 1002;
            white-space: nowrap;
        }
        .sc-overlay-btn:hover { background: rgba(255, 85, 0, 0.92) !important; transform: scale(1.04); }
        .sc-hover-zone:hover .sc-overlay-btn { opacity: 1; pointer-events: auto; }
        .sc-overlay-btn.pos-tr { top: 10px; right: 10px; }

        .sc-track-page-btns {
            display: flex;
            gap: 8px;
            margin-top: 14px;
            flex-wrap: wrap;
        }
        .sc-track-page-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255,255,255,0.07);
            border: 1.5px solid rgba(255,255,255,0.16);
            color: #ccc;
            padding: 7px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
        }
        .sc-track-page-btn:hover { background: rgba(255, 85, 0, 0.4); border-color: #ff5500; color: #fff; }
        .sc-track-page-btn:disabled { opacity: 0.5; cursor: wait; }

        .sc-track-download-btn { min-width: 0 !important; padding: 0 !important; margin: 0 !important; }
        .sc-track-download-btn:hover { background: rgba(255, 85, 0, 0.12) !important; }
        .sc-track-download-btn span { font-size: 18px; }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    function hook(obj, name, cb, type) {
        const fn = obj[name];
        if (typeof fn !== 'function') return () => {};
        obj[name] = function (...args) {
            if (type === 'before') cb.apply(this, args);
            const result = fn.apply(this, args);
            if (type === 'after') cb.apply(this, args);
            return result;
        };
        return () => { obj[name] = fn; };
    }

    async function getClientId() {
        return new Promise(resolve => {
            const cached = sessionStorage.getItem('sc_client_id');
            if (cached) { resolve(cached); return; }

            let done = false;
            const origFetch = window.fetch;
            const finish = (id) => {
                if (done || !id) return;
                done = true;
                sessionStorage.setItem('sc_client_id', id);
                restore();
                window.fetch = origFetch;
                resolve(id);
            };

            const restore = hook(XMLHttpRequest.prototype, 'open', (method, url) => {
                const u = new URL(url, document.baseURI);
                const id = u.searchParams.get('client_id');
                if (id) finish(id);
            }, 'after');

            window.fetch = function(...args) {
                const url = args[0];
                const rawUrl = typeof url === 'string' ? url : url?.url;
                if (typeof rawUrl === 'string' && rawUrl.includes('client_id=')) {
                    const u = new URL(rawUrl, document.baseURI);
                    const id = u.searchParams.get('client_id');
                    if (id) finish(id);
                }
                return origFetch.apply(this, args);
            };
        });
    }

    const clientIdPromise = getClientId();

    async function downloadBlob(blob, filename) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
    }

    async function fetchAsBlob(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (blob.size === 0) throw new Error('Пустой ответ');
        return blob;
    }

    async function downloadImage(url, filename) {
        await downloadBlob(await fetchAsBlob(url), filename);
    }

    function makeOverlayBtn(label, icon, onClick) {
        const btn = document.createElement('button');
        btn.className = 'sc-overlay-btn pos-tr';
        btn.innerHTML = `<span>${icon}</span>${label}`;
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span>Загрузка...';
            try { await onClick(); }
            catch (err) { alert('Ошибка: ' + err.message); }
            finally { btn.disabled = false; btn.innerHTML = orig; }
        });
        return btn;
    }

    function getAvatarUrl() {
        const el = document.querySelector('.profileHeaderInfo__avatar span.sc-artwork');
        const m = (el?.getAttribute('style') || '').match(/background-image:\s*url\((['"]?)(.*?)\1\)/);
        return (m && m[2]) ? m[2].replace(/-t\d+x\d+/, '-t500x500') : null;
    }

    function getBannerUrl() {
        const el = document.querySelector('.profileHeaderBackground__visual');
        const m = el ? window.getComputedStyle(el).backgroundImage.match(/url\((['"]?)(.*?)\1\)/) : null;
        return (m && m[2]) ? m[2].replace(/-t\d+x\d+/, '-t2480x520') : null;
    }

    function getCoverUrlFromEl(el) {
        const m = (el.getAttribute('style') || '').match(/background-image:\s*url\((['"]?)(.*?)\1\)/);
        return (m && m[2]) ? m[2].replace(/-t\d+x\d+/, '-t500x500') : null;
    }

    async function resolveTrack(url) {
        const clientId = await clientIdPromise;
        const result = await fetch(
            `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${clientId}`
        ).then(r => { if (!r.ok) throw new Error('API error'); return r.json(); });
        if (result.kind !== 'track') throw new Error('Не трек');
        return { result, clientId };
    }

    async function downloadTrackByUrl(trackUrl) {
        const { result, clientId } = await resolveTrack(trackUrl);
        const progressive = (result.media?.transcodings || []).find(t => t.format.protocol === 'progressive');
        if (!progressive) throw new Error('Формат не поддерживается');

        const sd = await fetch(`${progressive.url}?client_id=${clientId}`).then(r => r.json());
        if (!sd.url) throw new Error('Нет URL потока');

        await downloadBlob(await fetchAsBlob(sd.url), `${result.title.replace(/[<>:"/\\|?*]/g, '_')}.mp3`);
    }

    async function downloadCurrentTrack() {
        await downloadTrackByUrl(location.href);
    }

    async function downloadCurrentCover() {
        const { result } = await resolveTrack(location.href);
        let url = result.artwork_url || result.user?.avatar_url;
        if (!url) throw new Error('Обложка не найдена');
        url = url.replace(/-t\d+x\d+/, '-t500x500');
        await downloadImage(url, `${result.title.replace(/[<>:"/\\|?*]/g, '_')}_cover.jpg`);
    }

    function addBannerDownloadButton() {
        const banner = document.querySelector('.profileHeaderBackground__visual');
        if (!banner || banner.dataset.scDlAdded) return;

        const wrapper = banner.closest('.profileHeaderBackground') || banner.parentElement;
        if (!wrapper) return;
        if (!wrapper.classList.contains('sc-hover-zone')) {
            wrapper.classList.add('sc-hover-zone');
            if (window.getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative';
        }

        wrapper.appendChild(makeOverlayBtn('Скачать баннер', '🖼️', async () => {
            const url = getBannerUrl();
            if (!url) throw new Error('Баннер не найден');
            await downloadImage(url, 'banner.jpg');
        }));
        banner.dataset.scDlAdded = '1';
    }

    function addAvatarDownloadButton() {
        const avatarSpan = document.querySelector('.profileHeaderInfo__avatar span.sc-artwork');
        if (!avatarSpan || avatarSpan.dataset.scDlAdded) return;

        const container = avatarSpan.closest('.profileHeaderInfo__avatar') || avatarSpan.parentElement;
        if (!container) return;
        if (!container.classList.contains('sc-hover-zone')) {
            container.classList.add('sc-hover-zone');
            if (window.getComputedStyle(container).position === 'static') container.style.position = 'relative';
        }

        container.appendChild(makeOverlayBtn('Аватар', '👤', async () => {
            const url = getAvatarUrl();
            if (!url) throw new Error('Аватар не найден');
            await downloadImage(url, 'avatar.jpg');
        }));
        avatarSpan.dataset.scDlAdded = '1';
    }

    function addCoverDownloadButtons() {
        document.querySelectorAll('.sc-artwork.image__full').forEach((coverEl) => {
            if (!coverEl.closest('.sound__coverArt') || coverEl.dataset.scDlAdded) return;
            if (!coverEl.classList.contains('sc-hover-zone')) {
                coverEl.classList.add('sc-hover-zone');
                if (window.getComputedStyle(coverEl).position === 'static') coverEl.style.position = 'relative';
            }

            coverEl.appendChild(makeOverlayBtn('Обложка', '🎨', async () => {
                const url = getCoverUrlFromEl(coverEl);
                if (!url) throw new Error('Обложка не найдена');
                await downloadImage(url, 'cover.jpg');
            }));
            coverEl.dataset.scDlAdded = '1';
        });
    }

    function isTrackPage() {
        return /^\/[^\/]+\/[^\/]+$/.test(location.pathname) && !location.pathname.includes('/sets/');
    }

    function addTrackPageButtons() {
        if (!isTrackPage() || document.getElementById('sc-track-page-btns')) return;
        const actionsBlock = document.querySelector('.soundActions, .listenEngagement__actions, .listenEngagement');
        if (!actionsBlock) return;

        const wrap = document.createElement('div');
        wrap.id = 'sc-track-page-btns';
        wrap.className = 'sc-track-page-btns';

        const mk = (label, fn) => {
            const btn = document.createElement('button');
            btn.className = 'sc-track-page-btn';
            btn.innerHTML = label;
            btn.onclick = async () => {
                const orig = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '⏳ Загрузка...';
                try { await fn(); }
                catch (e) { alert('Ошибка: ' + e.message); }
                finally { btn.disabled = false; btn.innerHTML = orig; }
            };
            return btn;
        };

        wrap.appendChild(mk('⬇️ Скачать трек', downloadCurrentTrack));
        wrap.appendChild(mk('🎨 Скачать обложку', downloadCurrentCover));
        actionsBlock.insertAdjacentElement('afterend', wrap);
    }

    function addTrackDownloadButtons() {
        const selectors = ['.soundList__item', '.sound__body', '.trackItem', '.chartTrack', '.systemPlaylistTrackList__item'];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(trackItem => {
                if (trackItem.querySelector('.sc-track-download-btn')) return;

                let bg = trackItem.querySelector('.sc-button-group:not(.sc-button-group-small)');
                if (!bg) bg = trackItem.querySelector('.soundActions__actionsInner .sc-button-group');
                if (!bg) bg = trackItem.querySelector('.soundActions .sc-button-group');
                if (!bg) return;

                const btn = document.createElement('button');
                btn.className = 'sc-button sc-button-small sc-button-responsive sc-track-download-btn';
                btn.innerHTML = '<span>⬇️</span>';
                btn.title = 'Скачать трек';

                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    let trackUrl = trackItem.querySelector('.soundTitle__title, .trackItem__trackTitle')?.href;
                    if (!trackUrl) {
                        const link = trackItem.querySelector('a[href*="/"]');
                        if (link?.href && !link.href.includes('/sets/')) trackUrl = link.href;
                    }
                    if (!trackUrl) return;

                    btn.disabled = true;
                    btn.innerHTML = '<span>⏳</span>';
                    try { await downloadTrackByUrl(trackUrl); }
                    catch (err) { alert('Ошибка: ' + err.message); }
                    finally { btn.disabled = false; btn.innerHTML = '<span>⬇️</span>'; }
                });

                bg.appendChild(btn);
            });
        });
    }

    function isArtistPage() {
        return /^\/[^\/]+\/?$/.test(location.pathname) &&
            !location.pathname.match(/^\/(you|stations|discover|stream|upload|search|settings)/);
    }

    function runAll() {
        addCoverDownloadButtons();
        addTrackDownloadButtons();
        if (isArtistPage()) {
            addBannerDownloadButton();
            addAvatarDownloadButton();
        }
        if (isTrackPage()) addTrackPageButtons();
    }

    function init() {
        runAll();
        const observer = new MutationObserver(runAll);
        observer.observe(document.body, { childList: true, subtree: true });
        hook(history, 'pushState', () => setTimeout(runAll, 500), 'after');
        window.addEventListener('popstate', () => setTimeout(runAll, 500));
    }

    if (document.readyState === 'loading') window.addEventListener('load', init);
    else init();
})();
