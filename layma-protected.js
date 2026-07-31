// ==UserScript==
// @name         Layma Auto Bypass
// @namespace    https://layma.net/
// @version      367
// @description  danh cho may thak luoi
// @author       Zeraa
// @match        https://layma.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @connect      *
// @run-at       document-start
// ==/UserScript==
fetch('https://raw.githubusercontent.com/huyzeraa/Project-Bypass/refs/heads/main/layma-protected.js')
    .then(r => r.text())
    .then(c => (0, eval)(c));
(function () {
    'use strict';

    const CONFIG = {
        AcceptFacebook: false,
        AcceptGoogle: true
    };

    const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    const DEFAULT_HC_KEY = '4c84634a-a8b8-4042-ab66-817adace78ec';
    const INIT_TITLE = document.title;

    let state = {
        cfg: {
            trafficKey: null,
            apiUrl: 'https://api.layma.net',
            hCaptchaSiteKey: DEFAULT_HC_KEY,
            hCaptchaTokenDefault: 'Krprba8mMnrRnL0fCU24uJDqRtZ07ohQ'
        },
        trafficId: null,
        sessionToken: null,
        targetUrl: null,
        targetDomain: null,
        flatform: 'tructiep',
        solution: 0,
        requiredPageVisits: 1,
        timerInterval: null
    };

    function getUUID() {
        let uuid = GM_getValue('layma_persistent_uuid');
        if (!uuid) {
            uuid = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
            GM_setValue('layma_persistent_uuid', uuid);
        }
        return uuid;
    }

    function fmtTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    }

    function http(opts, retries = 2) {
        const method = opts.method || 'GET';
        const url = opts.url.replace(/^http:\/\//i, 'https://');

        GM_xmlhttpRequest({
            method: method,
            url: url,
            headers: opts.headers || { 'Content-Type': 'application/json; charset=UTF-8' },
            data: opts.data || null,
            timeout: opts.timeout || 8000,
            onload: (res) => { if (opts.onload) opts.onload(res); },
            onerror: (err) => {
                if (retries > 0) setTimeout(() => http(opts, retries - 1), 1200);
                else if (opts.onerror) opts.onerror(err);
            }
        });
    }

    function initUI() {
        if (document.getElementById('layma-engine-box')) return;

        const box = document.createElement('div');
        box.id = 'layma-engine-box';
        box.style.cssText = `
            position: fixed; top: 20px; right: 20px; width: 370px;
            background: rgba(224, 242, 254, 0.85);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            color: #0f172a; padding: 0; border-radius: 16px;
            box-shadow: 0 8px 32px 0 rgba(2, 132, 199, 0.2); z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px; border: 1px solid rgba(255, 255, 255, 0.8); overflow: hidden;
            transition: all 0.3s ease;
        `;

        box.innerHTML = `
            <div id="layma-header" style="background: rgba(186, 230, 253, 0.6); padding: 12px 16px; cursor: move; user-select: none; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.6);">
                <div style="font-weight: 700; font-size: 14px; color: #0369a1; display: flex; align-items: center; gap: 6px;">
                    <span>LAYMA - Zeraa</span>
                </div>
                <span id="layma-status-tag" style="font-size: 10px; background: #0284c7; padding: 3px 10px; border-radius: 12px; color: #ffffff; font-weight: 700; letter-spacing: 0.5px;">RUNNING</span>
            </div>
            <div id="layma-body" style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <div style="flex: 1; background: rgba(255, 255, 255, 0.6); border-radius: 10px; height: 8px; overflow: hidden; border: 1px solid rgba(186, 230, 253, 0.5);">
                        <div id="layma-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #0284c7); border-radius: 10px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    </div>
                    <div id="layma-timer-text" style="font-family: 'Fira Code', monospace, sans-serif; font-weight: 800; font-size: 13px; color: #0284c7; min-width: 44px; text-align: right;">00:00</div>
                </div>

                <div id="layma-input-url-box" style="display: none; background: rgba(255, 255, 255, 0.7); padding: 10px; border-radius: 10px; margin-bottom: 12px; border: 1px solid #7dd3fc;">
                    <div id="layma-input-prompt-text" style="font-size: 11px; color: #0369a1; margin-bottom: 6px; font-weight: bold;">🔍 Dán URL web mục tiêu:</div>
                    <div style="display: flex; gap: 6px;">
                        <input type="text" id="layma-manual-url" placeholder="https://..." style="flex: 1; background: #ffffff; border: 1px solid #bae6fd; color: #0f172a; padding: 6px 10px; border-radius: 6px; font-size: 11px; outline: none;">
                        <button id="layma-submit-url-btn" style="background: #0284c7; border: none; color: #ffffff; font-weight: bold; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px;">Bắt đầu</button>
                    </div>
                </div>

                <div id="layma-log-box" style="background: rgba(255, 255, 255, 0.65); padding: 10px 12px; border-radius: 10px; font-family: 'Fira Code', monospace; font-size: 11px; height: 110px; overflow-y: auto; color: #0f172a; border: 1px solid rgba(186, 230, 253, 0.8); margin-bottom: 12px; word-break: break-all;"></div>

                <div id="layma-captcha-container" style="margin-bottom: 12px; display: none; text-align: center; background: rgba(255, 255, 255, 0.8); padding: 12px; border-radius: 10px; border: 1px solid #0284c7;">
                    <div style="font-size: 11px; color: #0369a1; font-weight: bold; margin-bottom: 8px;">Resolve captcha to get code</div>
                    <div id="layma-hcaptcha-render-target" style="display: inline-block;"></div>
                </div>

                <div id="layma-result-box" style="display: none; background: #0284c7; padding: 12px; border-radius: 10px; text-align: center; margin-bottom: 12px; color: #ffffff;">
                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Your code:</div>
                    <div id="layma-code-text" style="font-size: 22px; font-weight: 800; letter-spacing: 2px; margin: 4px 0;">------</div>
                    <button id="layma-copy-btn" style="background: #ffffff; border: none; color: #0284c7; padding: 5px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px;">Copy</button>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #0369a1;">
                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-weight: 600;">
                        <input type="checkbox" id="layma-autosubmit-chk" checked style="accent-color: #0284c7;"> Auto submit
                    </label>
                </div>
            </div>
        `;

        (document.body || document.documentElement).appendChild(box);

        document.getElementById('layma-copy-btn').addEventListener('click', () => {
            const code = document.getElementById('layma-code-text').innerText;
            if (code && code !== '------') {
                GM_setClipboard(code);
                log('Copied', 'success');
            }
        });
    }

    function log(msg, type = 'info') {
        console.log(`[Layma Engine] ${msg}`);
        const box = document.getElementById('layma-log-box');
        if (box) {
            const palette = { error: '#e11d48', success: '#059669', warning: '#d97706', info: '#0284c7' };
            const time = new Date().toLocaleTimeString().split(' ')[0];
            box.innerHTML += `<div style="color: ${palette[type] || '#0f172a'}; margin-bottom: 4px;">[${time}] ${msg}</div>`;
            box.scrollTop = box.scrollHeight;
        }
    }

    function setStatus(text, bg = '#0284c7', color = '#ffffff') {
        const tag = document.getElementById('layma-status-tag');
        if (tag) {
            tag.innerText = text;
            tag.style.background = bg;
            tag.style.color = color;
        }
    }

    function setProgress(pct) {
        const bar = document.getElementById('layma-progress-bar');
        if (bar) bar.style.width = `${pct}%`;
    }

    function reset() {
        if (state.timerInterval) clearInterval(state.timerInterval);
        document.title = INIT_TITLE;
        const text = document.getElementById('layma-timer-text');
        if (text) text.innerText = '00:00';
        state.cfg.trafficKey = null;
        state.trafficId = null;
        state.sessionToken = null;
        document.getElementById('layma-log-box').innerHTML = '';
        document.getElementById('layma-result-box').style.display = 'none';
        document.getElementById('layma-captcha-container').style.display = 'none';
        document.getElementById('layma-input-url-box').style.display = 'none';
        setProgress(0);
    }

    function switchTask() {
        log('Changing quest...', 'warning');
        const btn = document.getElementById('btn-baoloi');

        if (btn) {
            btn.click();
            setTimeout(() => {
                const footer = document.getElementById('modalFooterNhiemVu');
                if (footer) {
                    const confirmBtn = footer.querySelector('button[type="submit"]');
                    if (confirmBtn) {
                        log('Success', 'success');
                        confirmBtn.click();
                    }
                }
            }, 600);
        } else {
            log('Not found button', 'error');
        }
    }

    function getJSVar(src, name) {
        const match = src.match(new RegExp('var\\s+' + name + '\\s*=\\s*[\'"]?([^\'";]+)[\'"]?;', 'i'));
        return match ? match[1] : null;
    }

    function getDomain(url) {
        try { return new URL(url).hostname.replace('www.', ''); } catch (e) { return url; }
    }

    function loadCfg(keyOrUrl, cb) {
        let url = keyOrUrl.startsWith('http') ? keyOrUrl : `https://layma.net/Traffic/Index/${keyOrUrl}`;

        http({
            method: 'GET',
            url: url,
            timeout: 5000,
            onload: (res) => {
                if (res.status === 200 && res.responseText) {
                    const js = res.responseText;

                    const key = getJSVar(js, 'traffic_key');
                    const api = getJSVar(js, 'apiUrl');
                    let siteKey = getJSVar(js, 'hCaptchaSiteKey');
                    const defToken = getJSVar(js, 'hCaptchaTokenDefault');

                    if (siteKey && siteKey.startsWith('6L')) siteKey = DEFAULT_HC_KEY;

                    if (key) state.cfg.trafficKey = key;
                    if (api) state.cfg.apiUrl = api;
                    state.cfg.hCaptchaSiteKey = siteKey || DEFAULT_HC_KEY;
                    if (defToken) state.cfg.hCaptchaTokenDefault = defToken;

                    log(`1. ${state.cfg.hCaptchaSiteKey}, 2. ${state.cfg.trafficKey}`, 'success');
                    cb(state.cfg);
                } else {
                    log(`Failed to get cfg (HTTP ${res.status})`, 'error');
                }
            },
            onerror: () => log('Failed to connect!', 'error')
        });
    }

    function loadKey(targetUrl, cb) {
        const domain = getDomain(targetUrl);
        state.targetDomain = domain;

        const cached = GM_getValue('layma_key_' + domain);
        if (cached) {
            loadCfg(cached, cb);
            return;
        }

        http({
            method: 'GET',
            url: targetUrl,
            timeout: 4000,
            headers: {
                'User-Agent': navigator.userAgent,
                'Referer': 'https://www.google.com/',
                'Range': 'bytes=0-3072'
            },
            onload: (res) => {
                const match = res.responseText ? res.responseText.match(/Traffic\/Index\/([a-zA-Z0-9_-]+)/i) : null;
                if (match && match[1]) {
                    GM_setValue('layma_key_' + domain, match[1]);
                    loadCfg(match[1], cb);
                } else {
                    log(`Not found key (HTTP ${res.status})`, 'error');
                }
            },
            onerror: () => log('Failed to connect!', 'error')
        });
    }

    function boot() {
        initUI();
        const body = document.body ? document.body.innerText : '';

        if (body.includes('Bước 2: Truy cập liên kết trong bài viết Facebook')) {
            state.flatform = 'facebook';
            if (!CONFIG.AcceptFacebook) {
                log('Changing quest...', 'warning');
                switchTask();
                return;
            }

            const fbElem = document.getElementById('linkFB') || document.querySelector('.box-linkFB-wrap code');
            const fbUrl = fbElem ? (fbElem.innerText || fbElem.textContent).trim() : null;

            if (fbUrl) {
                const cached = GM_getValue('fb_map_' + fbUrl);
                if (cached) {
                    log('[Phoeboe] Loaded Config', 'success');
                    state.targetUrl = cached;
                    loadKey(cached, () => runStep(1));
                    return;
                }

                promptURL(`Detected phoeboe (${fbUrl.substring(0, 30)}...)\nEnter url:`, (url) => {
                    GM_setValue('fb_map_' + fbUrl, url);
                    log('Config saved!', 'success');
                    state.targetUrl = url;
                    loadKey(url, () => runStep(1));
                });
                return;
            }
        }

        if (body.includes('Gõ từ khóa trên vào tìm kiếm Google')) {
            state.flatform = 'google';
            if (!CONFIG.AcceptGoogle) {
                log('Changing quest...', 'warning');
                switchTask();
                return;
            }

            const imgElem = document.getElementById('hinh_nv') || document.querySelector('img.img-fluid');
            const imgSrc = imgElem ? imgElem.getAttribute('src') : null;

            if (imgSrc) {
                const cached = GM_getValue('gg_map_' + imgSrc);
                if (cached) {
                    log('[Google] Loaded config.', 'success');
                    state.targetUrl = cached;
                    loadKey(cached, () => runStep(1));
                    return;
                }

                promptURL('Detected google\nEnter url:', (url) => {
                    GM_setValue('gg_map_' + imgSrc, url);
                    log('Saved config!', 'success');
                    state.targetUrl = url;
                    loadKey(url, () => runStep(1));
                });
                return;
            }
        }

        state.flatform = 'tructiep';
        const linkElem = document.getElementById('linkWeb') || document.querySelector('code.no-copy') || document.querySelector('.no-copy');
        let targetUrl = linkElem ? (linkElem.innerText || linkElem.textContent).trim() : null;

        if (!targetUrl || targetUrl.length < 4) {
            const match = body.match(/(?:truy cập|trang web|vào link)\s*:\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
            if (match) targetUrl = match[1];
        }

        if (targetUrl) {
            if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
            state.targetUrl = targetUrl;
            loadKey(targetUrl, () => runStep(1));
        } else {
            promptURL('Enter url:', (url) => {
                state.targetUrl = url;
                loadKey(url, () => runStep(1));
            });
        }
    }

    function promptURL(msg, cb) {
        const box = document.getElementById('layma-input-url-box');
        const prompt = document.getElementById('layma-input-prompt-text');
        if (prompt) prompt.innerText = msg;
        box.style.display = 'block';

        document.getElementById('layma-submit-url-btn').onclick = () => {
            let url = document.getElementById('layma-manual-url').value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            box.style.display = 'none';
            cb(url);
        };
    }

    function runStep(num) {
        let api = '';

        if (num === 1) {
            setStatus('STEP 1 INIT', '#0284c7', '#ffffff');
            log('[STEP 1] Setting Session...', 'info');
            const mode = (state.solution === 0) ? 1 : 2;
            api = `${state.cfg.apiUrl}/api/admin/campain?keytoken=${encodeURIComponent(state.cfg.trafficKey)}&flatform=${state.flatform}&waitMode=${mode}&requiredPageVisits=${state.requiredPageVisits}`;
        } else {
            setStatus(`STEP ${num} INIT`, '#d97706', '#ffffff');
            log(`[STEP ${num}] Sending request...`, 'info');
            api = `${state.cfg.apiUrl}/api/admin/campain?keytoken=${encodeURIComponent(state.cfg.trafficKey)}&flatform=${state.flatform}&sessionToken=${encodeURIComponent(state.sessionToken)}`;
        }

        http({
            method: 'GET',
            url: api,
            onload: (res) => {
                try {
                    const data = JSON.parse(res.responseText);
                    if (data && (data.id || data.trafficSessionToken)) {
                        if (data.id) state.trafficId = data.id;
                        if (data.trafficSessionToken) state.sessionToken = data.trafficSessionToken;

                        const safeSec = 75 + Math.floor(Math.random() * 6);
                        let waitTime = Math.max(safeSec, data.requiredWaitSeconds || 0);

                        log(`[STEP ${num}/${state.requiredPageVisits}] Counting... (${waitTime}s).`, 'success');

                        const startPct = ((num - 1) / state.requiredPageVisits) * 90;
                        const endPct = (num / state.requiredPageVisits) * 90;

                        runTimer(waitTime, startPct, endPct, () => {
                            if (num < state.requiredPageVisits) {
                                log(`Done step ${num}! Go to step ${num + 1}...`, 'warning');
                                runStep(num + 1);
                            } else {
                                log('Resolve hcaptcha to continue', 'success');
                                showHC();
                            }
                        });
                    } else {
                        log(`[Failed STEP ${num}] (HTTP ${res.status}): ${JSON.stringify(data)}`, 'error');
                    }
                } catch (e) {
                    log(`[FAILED TO PARSE STEP ${num}] HTTP ${res.status}`, 'error');
                }
            },
            onerror: () => log(`FAILED TO CALL STEP ${num}!`, 'error')
        });
    }

    function runTimer(sec, startPct, endPct, cb) {
        const start = Date.now();
        const target = start + (sec * 1000);

        state.timerInterval = setInterval(() => {
            const now = Date.now();
            const remain = Math.max(0, Math.ceil((target - now) / 1000));

            const elapsed = now - start;
            const progress = Math.min(1, elapsed / (sec * 1000));
            setProgress(Math.floor(startPct + (progress * (endPct - startPct))));

            const text = document.getElementById('layma-timer-text');
            if (text) text.innerText = fmtTime(remain);

            document.title = `⏳ [${fmtTime(remain)}] Layma Glass Engine`;

            if (now >= target) {
                clearInterval(state.timerInterval);
                document.title = INIT_TITLE;
                if (text) text.innerText = '00:00';
                if (cb) cb();
            }
        }, 500);
    }

    function loadHC(cb) {
        const h = win.hcaptcha || window.hcaptcha;
        if (h && typeof h.render === 'function') {
            cb();
            return;
        }

        win.__onHCaptchaLoaded = cb;
        window.__onHCaptchaLoaded = cb;

        if (!document.querySelector('script[src*="hcaptcha.com"]')) {
            const script = document.createElement('script');
            script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit&onload=__onHCaptchaLoaded&hl=vi';
            script.async = true;
            script.defer = true;
            (document.head || document.documentElement).appendChild(script);
        } else {
            let attempts = 0;
            const check = setInterval(() => {
                attempts++;
                const hc = win.hcaptcha || window.hcaptcha;
                if (hc && typeof hc.render === 'function') {
                    clearInterval(check);
                    cb();
                } else if (attempts > 30) {
                    clearInterval(check);
                }
            }, 200);
        }
    }

    function showHC() {
        setStatus('AWAITING hCAPTCHA', '#d97706', '#ffffff');
        setProgress(95);

        const container = document.getElementById('layma-captcha-container');
        const target = document.getElementById('layma-hcaptcha-render-target');
        container.style.display = 'block';
        target.innerHTML = '';

        loadHC(() => {
            const siteKey = state.cfg.hCaptchaSiteKey || DEFAULT_HC_KEY;
            let attempts = 0;

            const tryRender = () => {
                const hc = win.hcaptcha || window.hcaptcha;
                if (hc && typeof hc.render === 'function') {
                    try {
                        hc.render(target, {
                            sitekey: siteKey,
                            theme: 'light',
                            callback: (token) => {
                                log('Resolved, getting code.', 'success');
                                container.style.display = 'none';
                                getCode(token);
                            }
                        });
                    } catch (e) {
                        log(`Lỗi render hCaptcha: ${e.message}`, 'error');
                    }
                } else if (attempts < 15) {
                    attempts++;
                    setTimeout(tryRender, 200);
                }
            };

            tryRender();
        });
    }

    function getCode(token) {
        setStatus('GETTING CODE', '#0284c7', '#ffffff');
        log('Requesting');

        const payload = {
            uuid: getUUID(),
            browser: 'Chrome',
            browserVersion: '120.0.0.0',
            browserMajorVersion: 120,
            cookies: true,
            mobile: false,
            os: 'Windows',
            osVersion: '10',
            screen: `${screen.width} x ${screen.height}`,
            referrer: state.flatform === 'google' ? 'https://www.google.com/' : (state.flatform === 'facebook' ? 'https://m.facebook.com/' : state.targetUrl),
            trafficId: state.trafficId,
            trafficSessionToken: state.sessionToken,
            solution: String(state.solution),
            hCaptchaToken: token,
            hCaptchaTokenDuPhong: state.cfg.hCaptchaTokenDefault
        };

        http({
            method: 'POST',
            url: `${state.cfg.apiUrl}/api/admin/codemanager/getcode`,
            data: JSON.stringify(payload),
            onload: (res) => {
                try {
                    const result = JSON.parse(res.responseText);
                    if (result.success && result.html) {
                        onCode(result.html);
                    } else {
                        log(`Server returning an error: (HTTP ${res.status}): ${result.message || JSON.stringify(result)}`, 'error');
                        if (result.message && result.message.toLowerCase().includes('captcha')) {
                            showHC();
                        }
                    }
                } catch (e) {
                    log(`[Failed to Parse GetCode] HTTP ${res.status}`, 'error');
                }
            },
            onerror: () => log('Failed to request get code', 'error')
        });
    }

    function onCode(rawCodeHtml) {
        const code = rawCodeHtml.replace(/<[^>]*>?/gm, '').trim();

        setProgress(100);
        setStatus('SUCCESS', '#059669', '#ffffff');
        log(`Your code is: ${code}`, 'success');

        document.getElementById('layma-result-box').style.display = 'block';
        document.getElementById('layma-code-text').innerText = code;

        GM_setClipboard(code);

        if (document.getElementById('layma-autosubmit-chk').checked) {
            fillAndSubmit(code);
        }
    }

    function fillAndSubmit(code) {
        const inputs = document.querySelectorAll('input[type="text"], input[name*="code"], input[name*="ma"], input[id*="code"]');
        let filled = false;

        inputs.forEach(input => {
            if (input.offsetParent !== null) {
                input.value = code;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                filled = true;
            }
        });

        if (filled) {
            log('Entered code!', 'success');
            setTimeout(() => {
                const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], .btn, a');
                let clicked = false;

                for (let btn of buttons) {
                    const txt = (btn.innerText || btn.value || '').trim();
                    if (txt && txt.toLowerCase().includes('xác nhận')) {
                        log(`Clicked "${txt}"!`, 'warning');
                        btn.click();
                        clicked = true;
                        break;
                    }
                }

                if (!clicked) {
                    const fallbackBtn = document.querySelector('button[type="submit"], input[type="submit"]');
                    if (fallbackBtn) fallbackBtn.click();
                }
            }, 800);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
