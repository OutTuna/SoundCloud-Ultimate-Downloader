// ==UserScript==
// @name         SoundCloud Ultimate Downloader Enhanced
// @namespace    http://tampermonkey.net/
// @version      3
// @description  Download SoundCloud avatars, banners, covers, tracks, and full albums as ZIP
// @author       fellfromheaven & maple3142 (thx for downloader)
// @match        https://soundcloud.com/*
// @require      https://cdn.jsdelivr.net/npm/web-streams-polyfill@2.0.2/dist/ponyfill.min.js
// @require      https://cdn.jsdelivr.net/npm/streamsaver@2.0.3/StreamSaver.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @grant        none
// @icon         https://a-v2.sndcdn.com/assets/images/sc-icons/favicon-2cadd14bdb.ico
// ==/UserScript==

(function() {
    'use strict';

    streamSaver.mitm = 'https://maple3142.github.io/StreamSaver.js/mitm.html';

    const styles = `
        /* ---- Panel ---- */
        .sc-enhanced-download-panel {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px; padding: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            z-index: 999999; min-width: 380px; max-width: 500px;
            color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .sc-enhanced-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); z-index: 999998; backdrop-filter: blur(4px);
        }
        .sc-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .sc-panel-title { font-size: 24px; font-weight: 700; margin: 0; }
        .sc-close-btn {
            background: rgba(255,255,255,0.2); border: none; color: white;
            width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
            font-size: 20px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .sc-close-btn:hover { background: rgba(255,255,255,0.3); transform: rotate(90deg); }
        .sc-download-section { margin-bottom: 20px; }
        .sc-section-title {
            font-size: 14px; font-weight: 600; margin-bottom: 12px;
            opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .sc-button-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .sc-download-btn {
            background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3);
            color: white; padding: 12px 16px; border-radius: 10px; cursor: pointer;
            font-size: 14px; font-weight: 600; transition: all 0.2s;
            display: flex; align-items: center; gap: 8px; justify-content: center;
        }
        .sc-download-btn:hover { background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.5); transform: translateY(-2px); }
        .sc-download-btn:active { transform: translateY(0); }
        .sc-download-btn.full-width { grid-column: 1 / -1; }
        .sc-download-btn.loading { opacity: 0.6; cursor: wait; }
        .sc-progress {
            margin-top: 16px; background: rgba(255,255,255,0.15);
            border-radius: 8px; padding: 12px; display: none;
        }
        .sc-progress.active { display: block; }
        .sc-progress-text { font-size: 12px; margin-bottom: 8px; }
        .sc-progress-bar { width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden; }
        .sc-progress-fill { height: 100%; background: white; border-radius: 3px; transition: width 0.3s; width: 0%; }

        /* ---- FAB ---- */
        .sc-fab-btn {
            position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
            border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none; color: white; font-size: 24px; cursor: pointer;
            box-shadow: 0 4px 20px rgba(102,126,234,0.4); z-index: 99999;
            transition: all 0.3s; display: none; align-items: center; justify-content: center;
        }
        .sc-fab-btn.visible { display: flex; }
        .sc-fab-btn:hover { transform: scale(1.1); box-shadow: 0 6px 30px rgba(102,126,234,0.6); }

        /* ---- Overlay hover download button ---- */
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
            letter-spacing: 0.2px;
        }
        .sc-overlay-btn:hover { background: rgba(102,126,234,0.92) !important; transform: scale(1.04); }
        .sc-hover-zone:hover .sc-overlay-btn {
            opacity: 1;
            pointer-events: auto;
        }
        .sc-overlay-btn.pos-tr { top: 10px; right: 10px; }
        .sc-overlay-btn.pos-tl { top: 10px; left: 10px; }
        .sc-overlay-btn.pos-br { bottom: 10px; right: 10px; }

        /* ---- Track page buttons ---- */
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
        .sc-track-page-btn:hover { background: rgba(102,126,234,0.4); border-color: #667eea; color: #fff; transform: translateY(-1px); }
        .sc-track-page-btn:disabled { opacity: 0.5; cursor: wait; transform: none; }

        /* ---- Per-track list download buttons ---- */
        .sc-track-download-btn { min-width: 0 !important; padding: 0 !important; margin: 0 !important; }
        .sc-track-download-btn:hover { background: rgba(102,126,234,0.12) !important; }
        .sc-track-download-btn span { font-size: 18px; }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    async function downloadBlob(blob, filename) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl; link.download = filename;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
    }

    async function downloadImage(url, filename) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await downloadBlob(await response.blob(), filename);
    }

    async function fetchAsBlob(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (blob.size === 0) throw new Error('Пустой ответ');
        return blob;
    }

    function makeOverlayBtn(label, icon, posClass, onClick) {
        const btn = document.createElement('button');
        btn.className = `sc-overlay-btn ${posClass}`;
        btn.innerHTML = `<span>${icon}</span>${label}`;
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); e.preventDefault();
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span>Загрузка...';
            try { await onClick(); }
            catch (err) { console.error(err); alert('Ошибка: ' + err.message); }
            finally { btn.disabled = false; btn.innerHTML = orig; }
        });
        return btn;
    }

    function getAvatarUrl() {
        const el = document.querySelector('.profileHeaderInfo__avatar span.sc-artwork');
        if (el) {
            const m = (el.getAttribute('style') || '').match(/background-image:\s*url\((['"]?)(.*?)\1\)/);
            if (m && m[2]) return m[2].replace(/-t\d+x\d+/, '-t500x500');
        }
        return null;
    }

    function getBannerUrl() {
        const el = document.querySelector('.profileHeaderBackground__visual');
        if (el) {
            const m = window.getComputedStyle(el).backgroundImage.match(/url\((['"]?)(.*?)\1\)/);
            if (m && m[2]) return m[2].replace(/-t\d+x\d+/, '-t2480x520');
        }
        return null;
    }

    function getCoverUrlFromEl(el) {
        const m = (el.getAttribute('style') || '').match(/background-image:\s*url\((['"]?)(.*?)\1\)/);
        return (m && m[2]) ? m[2].replace(/-t\d+x\d+/, '-t500x500') : null;
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

        const btn = makeOverlayBtn('Скачать баннер', '🖼️', 'pos-tr', async () => {
            const url = getBannerUrl();
            if (!url) throw new Error('Баннер не найден');
            await downloadImage(url, 'banner.jpg');
        });

        wrapper.appendChild(btn);
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

        const btn = makeOverlayBtn('Аватар', '👤', 'pos-tr', async () => {
            const url = getAvatarUrl();
            if (!url) throw new Error('Аватар не найден');
            await downloadImage(url, 'avatar.jpg');
        });

        container.appendChild(btn);
        avatarSpan.dataset.scDlAdded = '1';
    }

    function addCoverDownloadButtons() {
        document.querySelectorAll('.sc-artwork.image__full').forEach((coverEl) => {
            if (!coverEl.closest('.sound__coverArt')) return;
            if (coverEl.dataset.scDlAdded) return;

            if (!coverEl.classList.contains('sc-hover-zone')) {
                coverEl.classList.add('sc-hover-zone');
                if (window.getComputedStyle(coverEl).position === 'static') coverEl.style.position = 'relative';
            }

            const btn = makeOverlayBtn('Обложка', '🎨', 'pos-tr', async () => {
                const url = getCoverUrlFromEl(coverEl);
                if (!url) throw new Error('Обложка не найдена');
                await downloadImage(url, 'cover.jpg');
            });

            coverEl.appendChild(btn);
            coverEl.dataset.scDlAdded = '1';
        });
    }

    function isTrackPage() {
        return /^\/[^\/]+\/[^\/]+$/.test(location.pathname) && !location.pathname.includes('/sets/');
    }

    async function resolveCurrentPage() {
        const clientId = await clientIdPromise;
        const result = await fetch(
            `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(location.href)}&client_id=${clientId}`
        ).then(r => { if (!r.ok) throw new Error('API error'); return r.json(); });
        return { result, clientId };
    }

    async function downloadCurrentTrack() {
        const { result, clientId } = await resolveCurrentPage();
        if (result.kind !== 'track') throw new Error('Это не трек');

        const progressive = (result.media?.transcodings || []).find(t => t.format.protocol === 'progressive');
        if (!progressive) throw new Error('Формат не поддерживается');

        const sd = await fetch(progressive.url + `?client_id=${clientId}`).then(r => r.json());
        if (!sd.url) throw new Error('Нет URL потока');

        await downloadBlob(await fetchAsBlob(sd.url), `${result.title.replace(/[<>:"/\\|?*]/g, '_')}.mp3`);
    }

    async function downloadCurrentCover() {
        const { result } = await resolveCurrentPage();
        let url = result.artwork_url || result.user?.avatar_url;
        if (!url) throw new Error('Обложка не найдена');
        url = url.replace(/-t\d+x\d+/, '-t500x500');
        await downloadImage(url, `${result.title.replace(/[<>:"/\\|?*]/g, '_')}_cover.jpg`);
    }

    function addTrackPageButtons() {
        if (!isTrackPage()) return;
        if (document.getElementById('sc-track-page-btns')) return;

        const actionsBlock = document.querySelector('.soundActions, .listenEngagement__actions, .listenEngagement');
        if (!actionsBlock) return;

        const wrap = document.createElement('div');
        wrap.id = 'sc-track-page-btns';
        wrap.className = 'sc-track-page-btns';

        function makeBtn(label, fn) {
            const btn = document.createElement('button');
            btn.className = 'sc-track-page-btn';
            btn.innerHTML = label;
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                const orig = btn.innerHTML;
                btn.innerHTML = '⏳ Загрузка...';
                try { await fn(); }
                catch (e) { alert('Ошибка: ' + e.message); }
                finally { btn.disabled = false; btn.innerHTML = orig; }
            });
            return btn;
        }

        wrap.appendChild(makeBtn('⬇️ Скачать трек', downloadCurrentTrack));
        wrap.appendChild(makeBtn('🎨 Скачать обложку', downloadCurrentCover));

        actionsBlock.insertAdjacentElement('afterend', wrap);
    }

    async function downloadTrackAudio(trackElement) {
        const clientId = await clientIdPromise;
        let trackUrl = null;

        const link1 = trackElement.querySelector('.soundTitle__title, .trackItem__trackTitle');
        if (link1?.href) trackUrl = link1.href;

        if (!trackUrl) {
            const link2 = trackElement.querySelector('a[href*="/"]');
            if (link2?.href && !link2.href.includes('/sets/')) trackUrl = link2.href;
        }

        if (!trackUrl) {
            const si = trackElement.closest('.sound');
            if (si) { const l = si.querySelector('a.soundTitle__title'); if (l) trackUrl = l.href; }
        }

        if (!trackUrl) throw new Error('Ссылка на трек не найдена');

        const result = await fetch(
            `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(trackUrl)}&client_id=${clientId}`
        ).then(r => { if (!r.ok) throw new Error('API error'); return r.json(); });

        if (result.kind !== 'track') throw new Error('Не трек');

        const progressive = (result.media?.transcodings || []).find(t => t.format.protocol === 'progressive');
        if (!progressive) throw new Error('Формат не поддерживается');

        const sd = await fetch(progressive.url + `?client_id=${clientId}`).then(r => r.json());
        if (!sd.url) throw new Error('Нет URL потока');

        await downloadBlob(await fetchAsBlob(sd.url), `${result.title.replace(/[<>:"/\\|?*]/g, '_')}.mp3`);
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
                btn.setAttribute('aria-label', 'Download');

                btn.addEventListener('click', async (e) => {
                    e.stopPropagation(); e.preventDefault();
                    btn.disabled = true; btn.innerHTML = '<span>⏳</span>';
                    try { await downloadTrackAudio(trackItem); }
                    catch (err) { console.error(err); alert('Ошибка: ' + err.message); }
                    finally { btn.disabled = false; btn.innerHTML = '<span>⬇️</span>'; }
                });
                bg.appendChild(btn);
            });
        });
    }

    class DownloadPanel {
        constructor() { this.overlay = null; this.panel = null; this.progressElement = null; this.progressFill = null; this.progressText = null; }

        create() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'sc-enhanced-overlay';
            this.overlay.onclick = () => this.close();

            this.panel = document.createElement('div');
            this.panel.className = 'sc-enhanced-download-panel';
            this.panel.onclick = e => e.stopPropagation();

            this.panel.innerHTML = `
                <div class="sc-panel-header">
                    <h2 class="sc-panel-title">⬇️ SoundCloud DL</h2>
                    <button class="sc-close-btn">×</button>
                </div>
                <div class="sc-download-section">
                    <div class="sc-section-title">🎵 Альбом / Плейлист</div>
                    <div class="sc-button-grid">
                        <button class="sc-download-btn full-width" data-action="album-zip">
                            <span>📁</span> Скачать альбом как ZIP
                        </button>
                    </div>
                </div>
                <div class="sc-progress">
                    <div class="sc-progress-text">Загрузка...</div>
                    <div class="sc-progress-bar"><div class="sc-progress-fill"></div></div>
                </div>`;

            document.body.appendChild(this.overlay);
            document.body.appendChild(this.panel);

            this.progressElement = this.panel.querySelector('.sc-progress');
            this.progressFill    = this.panel.querySelector('.sc-progress-fill');
            this.progressText    = this.panel.querySelector('.sc-progress-text');

            this.panel.querySelector('.sc-close-btn').onclick = () => this.close();
            this.panel.querySelectorAll('[data-action]').forEach(btn => {
                btn.onclick = e => this.handleAction(e.target.closest('[data-action]').dataset.action);
            });
        }

        async handleAction(action) {
            const btn = this.panel.querySelector(`[data-action="${action}"]`);
            btn.classList.add('loading');
            try { if (action === 'album-zip') await this.downloadAlbumZip(); }
            catch (e) { alert('Ошибка: ' + e.message); }
            finally { btn.classList.remove('loading'); this.hideProgress(); }
        }

        async downloadAlbumZip() {
            const clientId = await clientIdPromise;
            if (!clientId) throw new Error('Client ID недоступен, перезагрузите страницу');

            this.showProgress('Получение данных альбома...', 0);

            let result = await fetch(
                `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(location.href)}&client_id=${clientId}`
            ).then(r => { if (!r.ok) throw new Error('API error'); return r.json(); });

            if (result.kind !== 'playlist') throw new Error('Это не альбом/плейлист');

            let allTracks = result.tracks || [];
            if (result.track_count > allTracks.length) {
                const full = await fetch(`https://api-v2.soundcloud.com/playlists/${result.id}?client_id=${clientId}`).then(r => r.json());
                if (full.tracks) allTracks = full.tracks;
            }
            if (!allTracks.length) throw new Error('Треки не найдены');

            this.showProgress(`Подготовка: ${allTracks.length} треков...`, 5);

            const zip = new JSZip();
            const folder = zip.folder(result.title.replace(/[<>:"/\\|?*]/g, '_') || 'Album');
            let ok = 0, fail = 0;

            for (let i = 0; i < allTracks.length; i++) {
                const track = allTracks[i];
                const title = track.title || `Track ${i + 1}`;
                this.updateProgress(`${i + 1}/${allTracks.length}: ${title}`, ((i + 1) / allTracks.length) * 90);
                try {
                    let ft = track;
                    if (!track.media?.transcodings?.length) {
                        ft = await fetch(`https://api-v2.soundcloud.com/tracks/${track.id}?client_id=${clientId}`).then(r => r.json());
                    }
                    const prog = (ft.media?.transcodings || []).find(t => t.format.protocol === 'progressive');
                    if (!prog) { fail++; continue; }
                    const sd = await fetch(prog.url + `?client_id=${clientId}`).then(r => r.json());
                    if (!sd.url) { fail++; continue; }
                    folder.file(`${String(i + 1).padStart(2, '0')}. ${(ft.title || title).replace(/[<>:"/\\|?*]/g, '_')}.mp3`, await fetchAsBlob(sd.url));
                    ok++;
                } catch (e) { console.error(e); fail++; }
            }

            if (!ok) throw new Error('Ни один трек не загружен');

            this.updateProgress('Создание ZIP...', 95);
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

            await downloadBlob(zipBlob, `${result.title.replace(/[<>:"/\\|?*]/g, '_') || 'Album'}.zip`);
            this.updateProgress(`Готово! ${ok}/${allTracks.length} треков`, 100);
            if (fail) setTimeout(() => alert(`Загружено: ${ok}\nОшибок: ${fail}`), 1000);
        }

        showProgress(text, pct) { this.progressElement.classList.add('active'); this.progressText.textContent = text; this.progressFill.style.width = pct + '%'; }
        updateProgress(text, pct) {
            if (this.progressText) this.progressText.textContent = text;
            if (this.progressFill) this.progressFill.style.width = Math.min(Math.max(pct, 0), 100) + '%';
        }
        hideProgress() { setTimeout(() => this.progressElement.classList.remove('active'), 1000); }
        open() { if (!this.panel) this.create(); this.overlay.style.display = 'block'; this.panel.style.display = 'block'; }
        close() { if (this.overlay) this.overlay.style.display = 'none'; if (this.panel) this.panel.style.display = 'none'; }
    }

    const downloadPanel = new DownloadPanel();

    function isArtistPage() {
        return /^\/[^\/]+\/?$/.test(location.pathname) &&
               !location.pathname.match(/^\/(you|stations|discover|stream|upload|search|settings)/);
    }
    function isPlaylistPage() { return location.pathname.includes('/sets/'); }

    function createFabButton() {
        let fab = document.getElementById('sc-fab-download');
        if (!fab) {
            fab = document.createElement('button');
            fab.id = 'sc-fab-download';
            fab.className = 'sc-fab-btn';
            fab.innerHTML = '⬇️';
            fab.onclick = () => downloadPanel.open();
            document.body.appendChild(fab);
        }
        fab.classList.toggle('visible', isPlaylistPage());
    }

    function hook(obj, name, cb, type) {
        const fn = obj[name];
        obj[name] = function (...args) {
            if (type === 'before') cb.apply(this, args);
            fn.apply(this, args);
            if (type === 'after') cb.apply(this, args);
        };
        return () => { obj[name] = fn; };
    }

    async function getClientId() {
        return new Promise(resolve => {
            const cached = sessionStorage.getItem('sc_client_id');
            if (cached) { resolve(cached); return; }

            const restore = hook(XMLHttpRequest.prototype, 'open', async (method, url) => {
                const u = new URL(url, document.baseURI);
                const id = u.searchParams.get('client_id');
                if (id) { sessionStorage.setItem('sc_client_id', id); restore(); resolve(id); }
            }, 'after');

            const origFetch = window.fetch;
            window.fetch = function(...args) {
                const url = args[0];
                if (typeof url === 'string' && url.includes('client_id=')) {
                    const u = new URL(url, document.baseURI);
                    const id = u.searchParams.get('client_id');
                    if (id && !sessionStorage.getItem('sc_client_id')) { sessionStorage.setItem('sc_client_id', id); resolve(id); }
                }
                return origFetch.apply(this, args);
            };
        });
    }

    const clientIdPromise = getClientId();

    function runAll() {
        createFabButton();
        addCoverDownloadButtons();
        addTrackDownloadButtons();
        if (isArtistPage()) {
            addBannerDownloadButton();
            addAvatarDownloadButton();
        }
        if (isTrackPage()) {
            addTrackPageButtons();
        }
    }

    function init() {
        runAll();
        const observer = new MutationObserver(() => runAll());
        observer.observe(document.body, { childList: true, subtree: true });
        hook(history, 'pushState', () => setTimeout(runAll, 500), 'after');
        window.addEventListener('popstate', () => setTimeout(runAll, 500));
    }

    if (document.readyState === 'loading') window.addEventListener('load', init);
    else init();
})();