/**
 * PlainReader Cloud Sync Engine
 * Real-time two-way synchronization between PC and Mobile devices
 * Supports Firebase Realtime Database, GitHub Gist, JSONBin, and Direct QR/Link transfer.
 */
(function(window) {
    'use strict';

    const STORAGE_CONFIG = 'plainreader-sync-config';
    const STORAGE_WISHLIST = 'plainreader-wishlist';
    const STORAGE_FAVORITES = 'plainreader-favorites';
    const STORAGE_AUDIO_PROGRESS = 'plainreader-audio-progress';
    const STORAGE_AUDIO_BOOKMARKS = 'plainreader-audio-bookmarks';
    const STORAGE_AUDIO_LAST_PLAYED = 'plainreader-audio-last-played';
    const STORAGE_AUDIO_STATE = 'plainreader-audio-state';
    const STORAGE_SEARCH_HISTORY = 'plainreader-search-history';
    const STORAGE_LAST_UPDATED = 'plainreader-last-updated';

    let config = {
        provider: 'none', // 'firebase' | 'github' | 'jsonbin' | 'custom' | 'none'
        firebaseUrl: '',
        githubToken: '',
        githubGistId: '',
        jsonbinId: '',
        jsonbinKey: '',
        customUrl: '',
        autoSync: true,
        lastSyncTime: 0
    };

    let pushTimer = null;
    let isSyncing = false;
    let onSyncUpdateCallback = null;

    function loadConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_CONFIG);
            if (raw) {
                config = Object.assign(config, JSON.parse(raw));
            }
        } catch (e) {
            console.warn('Failed to load sync config:', e);
        }
    }

    function saveConfig(newConfig) {
        if (newConfig) config = Object.assign(config, newConfig);
        try {
            localStorage.setItem(STORAGE_CONFIG, JSON.stringify(config));
        } catch (e) {
            console.warn('Failed to save sync config:', e);
        }
        updateSyncIndicator();
    }

    function getLocalData() {
        const parse = (k, def) => {
            try {
                const v = localStorage.getItem(k);
                return v ? JSON.parse(v) : def;
            } catch { return def; }
        };

        return {
            version: 1,
            lastUpdated: parseInt(localStorage.getItem(STORAGE_LAST_UPDATED) || '0', 10) || Date.now(),
            wishlist: parse(STORAGE_WISHLIST, []),
            favorites: parse(STORAGE_FAVORITES, []),
            audioProgress: parse(STORAGE_AUDIO_PROGRESS, {}),
            audioBookmarks: parse(STORAGE_AUDIO_BOOKMARKS, []),
            lastPlayedId: parse(STORAGE_AUDIO_LAST_PLAYED, null),
            audioState: parse(STORAGE_AUDIO_STATE, null),
            searchHistory: parse(STORAGE_SEARCH_HISTORY, [])
        };
    }

    function applyData(data, saveLocal = true) {
        if (!data || typeof data !== 'object') return false;

        try {
            if (saveLocal) {
                if (data.wishlist) localStorage.setItem(STORAGE_WISHLIST, JSON.stringify(data.wishlist));
                if (data.favorites) localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(data.favorites));
                if (data.audioProgress) localStorage.setItem(STORAGE_AUDIO_PROGRESS, JSON.stringify(data.audioProgress));
                if (data.audioBookmarks) localStorage.setItem(STORAGE_AUDIO_BOOKMARKS, JSON.stringify(data.audioBookmarks));
                if (data.lastPlayedId) localStorage.setItem(STORAGE_AUDIO_LAST_PLAYED, JSON.stringify(data.lastPlayedId));
                if (data.audioState) localStorage.setItem(STORAGE_AUDIO_STATE, JSON.stringify(data.audioState));
                if (data.searchHistory) localStorage.setItem(STORAGE_SEARCH_HISTORY, JSON.stringify(data.searchHistory));
                if (data.lastUpdated) localStorage.setItem(STORAGE_LAST_UPDATED, data.lastUpdated.toString());
            }

            if (typeof onSyncUpdateCallback === 'function') {
                onSyncUpdateCallback(data);
            }
            return true;
        } catch (e) {
            console.error('Error applying synced data:', e);
            return false;
        }
    }

    function markLocalDataUpdated() {
        localStorage.setItem(STORAGE_LAST_UPDATED, Date.now().toString());
    }

    // =========================================
    // Cloud Provider Communication
    // =========================================
    async function pushToCloud(showToastFlag = false) {
        if (config.provider === 'none') return;
        if (isSyncing) return;

        isSyncing = true;
        setSyncStatusVisual('syncing');

        const payload = getLocalData();
        payload.lastUpdated = Date.now();
        localStorage.setItem(STORAGE_LAST_UPDATED, payload.lastUpdated.toString());

        try {
            if (config.provider === 'firebase') {
                let url = (config.firebaseUrl || '').trim();
                if (!url.endsWith('.json')) url += '.json';
                const resp = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!resp.ok) throw new Error('Firebase HTTP ' + resp.status);

            } else if (config.provider === 'github') {
                const token = (config.githubToken || '').trim();
                const gistId = (config.githubGistId || '').trim();
                if (!token) throw new Error('Chưa nhập GitHub Token');

                const isRepoMode = token.startsWith('github_pat_') || !gistId;

                if (isRepoMode) {
                    const repo = config.githubRepo || 'dubuitikpro/plainreader';
                    const fileUrl = `https://api.github.com/repos/${repo}/contents/user-data.json`;
                    let sha = '';
                    try {
                        const getRes = await fetch(fileUrl, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Accept': 'application/vnd.github+json',
                                'User-Agent': 'PlainReader'
                            }
                        });
                        if (getRes.ok) {
                            const cur = await getRes.json();
                            sha = cur.sha;
                        }
                    } catch { /* ignore */ }

                    const jsonStr = JSON.stringify(payload, null, 2);
                    const contentBase64 = btoa(unescape(encodeURIComponent(jsonStr)));

                    const putRes = await fetch(fileUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/vnd.github+json',
                            'Content-Type': 'application/json',
                            'User-Agent': 'PlainReader'
                        },
                        body: JSON.stringify({
                            message: 'sync: update user-data.json (PlainReader)',
                            content: contentBase64,
                            ...(sha ? { sha } : {})
                        })
                    });

                    if (!putRes.ok) {
                        const err = await putRes.json().catch(() => ({}));
                        if (putRes.status === 403) {
                            throw new Error('Token chưa được cấp quyền "Contents: Read and write". Vui lòng vào GitHub bật quyền Read and Write cho Contents.');
                        }
                        throw new Error(err.message || ('GitHub Repo HTTP ' + putRes.status));
                    }
                } else {
                    const files = {
                        'plainreader-sync.json': {
                            content: JSON.stringify(payload, null, 2)
                        }
                    };

                    const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/vnd.github+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ files })
                    });
                    if (!resp.ok) throw new Error('GitHub Gist update error ' + resp.status);
                }

            } else if (config.provider === 'jsonbin') {
                const binId = (config.jsonbinId || '').trim();
                const key = (config.jsonbinKey || '').trim();
                if (!binId || !key) throw new Error('Chưa nhập Bin ID hoặc Master Key');

                const resp = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': key
                    },
                    body: JSON.stringify(payload)
                });
                if (!resp.ok) throw new Error('JSONBin HTTP ' + resp.status);

            } else if (config.provider === 'custom') {
                const url = (config.customUrl || '').trim();
                if (!url) throw new Error('Chưa nhập URL');
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!resp.ok) throw new Error('Custom URL HTTP ' + resp.status);
            }

            config.lastSyncTime = Date.now();
            saveConfig();
            setSyncStatusVisual('synced');
            if (showToastFlag && typeof window.showToast === 'function') {
                window.showToast('✅ Đã đồng bộ dữ liệu lên đám mây thành công!');
            }
        } catch (err) {
            console.error('Push to cloud error:', err);
            setSyncStatusVisual('error', err.message);
            if (showToastFlag && typeof window.showToast === 'function') {
                window.showToast('⚠️ Lỗi đồng bộ đám mây: ' + err.message);
            }
        } finally {
            isSyncing = false;
        }
    }

    async function pullFromCloud(silent = false) {
        if (config.provider === 'none') return;
        if (isSyncing) return;

        isSyncing = true;
        setSyncStatusVisual('syncing');

        try {
            let remoteData = null;

            if (config.provider === 'firebase') {
                let url = (config.firebaseUrl || '').trim();
                if (!url.endsWith('.json')) url += '.json';
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('Firebase HTTP ' + resp.status);
                remoteData = await resp.json();

            } else if (config.provider === 'github') {
                const token = (config.githubToken || '').trim();
                const gistId = (config.githubGistId || '').trim();
                const isRepoMode = token.startsWith('github_pat_') || !gistId;

                if (isRepoMode) {
                    const repo = config.githubRepo || 'dubuitikpro/plainreader';
                    const headers = {
                        'Accept': 'application/vnd.github+json',
                        'User-Agent': 'PlainReader'
                    };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const resp = await fetch(`https://api.github.com/repos/${repo}/contents/user-data.json?t=` + Date.now(), { headers });
                    if (resp.ok) {
                        const fileData = await resp.json();
                        if (fileData.content) {
                            const decoded = decodeURIComponent(escape(atob(fileData.content.replace(/\s/g, ''))));
                            remoteData = JSON.parse(decoded);
                        }
                    } else {
                        // Fallback to static site file
                        const rawResp = await fetch('user-data.json?v=' + Date.now());
                        if (rawResp.ok) remoteData = await rawResp.json();
                    }
                } else {
                    const headers = { 'Accept': 'application/vnd.github+json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const resp = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
                    if (!resp.ok) throw new Error('GitHub Gist fetch error ' + resp.status);
                    const gist = await resp.json();
                    const file = gist.files && gist.files['plainreader-sync.json'];
                    if (file && file.content) {
                        remoteData = JSON.parse(file.content);
                    }
                }

            } else if (config.provider === 'jsonbin') {
                const binId = (config.jsonbinId || '').trim();
                const key = (config.jsonbinKey || '').trim();
                if (!binId) return;

                const resp = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                    headers: key ? { 'X-Master-Key': key } : {}
                });
                if (!resp.ok) throw new Error('JSONBin HTTP ' + resp.status);
                const json = await resp.json();
                remoteData = json.record || json;

            } else if (config.provider === 'custom') {
                const url = (config.customUrl || '').trim();
                if (!url) return;
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('Custom URL HTTP ' + resp.status);
                remoteData = await resp.json();
            }

            if (remoteData && typeof remoteData === 'object') {
                const localData = getLocalData();
                const remoteTs = remoteData.lastUpdated || 0;
                const localTs = localData.lastUpdated || 0;

                if (remoteTs > localTs) {
                    applyData(remoteData, true);
                    config.lastSyncTime = Date.now();
                    saveConfig();
                    setSyncStatusVisual('synced');
                    if (!silent && typeof window.showToast === 'function') {
                        window.showToast('✅ Đã tải dữ liệu mới nhất từ đám mây!');
                    }
                } else if (localTs > remoteTs) {
                    // Local is newer, push to cloud
                    await pushToCloud(false);
                } else {
                    setSyncStatusVisual('synced');
                }
            } else {
                setSyncStatusVisual('synced');
            }
        } catch (err) {
            console.error('Pull from cloud error:', err);
            setSyncStatusVisual('error', err.message);
            if (!silent && typeof window.showToast === 'function') {
                window.showToast('⚠️ Lỗi tải dữ liệu đám mây: ' + err.message);
            }
        } finally {
            isSyncing = false;
        }
    }

    function schedulePush(delay = 2500) {
        markLocalDataUpdated();
        if (config.provider === 'none' || !config.autoSync) return;
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
            pushToCloud(false);
        }, delay);
    }

    // =========================================
    // URL Hash Quick Transfer (#sync=...)
    // =========================================
    function checkUrlSyncHash() {
        const hash = window.location.hash;
        if (!hash || !hash.includes('sync=')) return false;

        try {
            const rawParam = hash.substring(hash.indexOf('sync=') + 5);
            const decodedStr = decodeURIComponent(atob(decodeURIComponent(rawParam)));
            const data = JSON.parse(decodedStr);

            if (data && typeof data === 'object') {
                applyData(data, true);
                // Also copy sync config if provided in transfer
                if (data._syncConfig) {
                    saveConfig(data._syncConfig);
                }
                // Clean hash from URL
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }
                setTimeout(() => {
                    if (typeof window.showToast === 'function') {
                        window.showToast('🎉 Đã đồng bộ dữ liệu thành công từ thiết bị khác!');
                    }
                }, 500);
                return true;
            }
        } catch (e) {
            console.warn('Failed to parse sync hash:', e);
        }
        return false;
    }

    function generateShareUrl(includeConfig = true) {
        const payload = getLocalData();
        if (includeConfig && config.provider !== 'none') {
            payload._syncConfig = {
                provider: config.provider,
                firebaseUrl: config.firebaseUrl,
                githubToken: config.githubToken,
                githubGistId: config.githubGistId,
                jsonbinId: config.jsonbinId,
                jsonbinKey: config.jsonbinKey,
                customUrl: config.customUrl,
                autoSync: config.autoSync
            };
        }
        const jsonStr = JSON.stringify(payload);
        const encoded = encodeURIComponent(btoa(encodeURIComponent(jsonStr)));
        const url = `${window.location.origin}${window.location.pathname}#sync=${encoded}`;
        return url;
    }

    // =========================================
    // Backup & Restore Files
    // =========================================
    function exportJsonFile() {
        const payload = getLocalData();
        payload._syncConfig = config;
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `plainreader-backup-${now}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importJsonFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) return reject(new Error('No file provided'));
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    applyData(data, true);
                    if (data._syncConfig) {
                        saveConfig(data._syncConfig);
                    }
                    if (typeof window.showToast === 'function') {
                        window.showToast('✅ Đã khôi phục dữ liệu từ file thành công!');
                    }
                    resolve(data);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Check repository baseline user-data.json on first run
    async function checkRepoBaseline() {
        // If user already has data in localStorage, don't overwrite with default baseline
        const hasData = localStorage.getItem(STORAGE_LAST_UPDATED) ||
                        localStorage.getItem(STORAGE_FAVORITES) ||
                        localStorage.getItem(STORAGE_AUDIO_PROGRESS);
        if (hasData) return;

        try {
            const resp = await fetch('user-data.json?v=' + Date.now());
            if (resp.ok) {
                const baseline = await resp.json();
                if (baseline && typeof baseline === 'object') {
                    applyData(baseline, true);
                    console.log('PlainReader baseline user-data.json loaded successfully.');
                }
            }
        } catch (e) {
            console.log('No user-data.json baseline loaded:', e);
        }
    }

    // =========================================
    // UI Helpers
    // =========================================
    function setSyncStatusVisual(status, errorMsg = '') {
        const dot = document.getElementById('syncStatusDot');
        const text = document.getElementById('syncStatusText');
        const meta = document.getElementById('syncLastTime');
        const indicator = document.getElementById('syncIndicator');

        if (dot) {
            dot.className = 'sync-status-dot ' + status;
        }
        if (indicator) {
            indicator.className = 'sync-indicator ' + status;
        }

        if (text) {
            if (status === 'synced') {
                const provName = config.provider === 'firebase' ? 'Firebase' :
                                 config.provider === 'github' ? 'GitHub Gist' :
                                 config.provider === 'jsonbin' ? 'JSONBin' : 'Đám mây';
                text.textContent = `Đang kết nối ${provName} (Hoạt động)`;
            } else if (status === 'syncing') {
                text.textContent = 'Đang đồng bộ dữ liệu...';
            } else if (status === 'error') {
                text.textContent = 'Lỗi kết nối: ' + (errorMsg || 'Không thể đồng bộ');
            } else {
                text.textContent = 'Chưa thiết lập đám mây';
            }
        }

        if (meta && config.lastSyncTime) {
            const date = new Date(config.lastSyncTime);
            meta.textContent = date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
        }
    }

    function updateSyncIndicator() {
        if (config.provider === 'none') {
            setSyncStatusVisual('idle');
        } else {
            setSyncStatusVisual('synced');
        }
    }

    // =========================================
    // Initialization
    // =========================================
    async function init(onUpdate) {
        loadConfig();
        if (typeof onUpdate === 'function') {
            onSyncUpdateCallback = onUpdate;
        }

        // 1. Check if opened via #sync=... URL
        const hashApplied = checkUrlSyncHash();

        // 2. If not from hash, check repo baseline on clean devices
        if (!hashApplied) {
            await checkRepoBaseline();
        }

        // 3. If cloud configured, pull from cloud
        if (config.provider !== 'none') {
            await pullFromCloud(true);
        }

        updateSyncIndicator();
        initModalEvents();
    }

    function initModalEvents() {
        const btnOpen = document.getElementById('btnOpenSyncModal');
        const modal = document.getElementById('cloudSyncModal');
        const btnClose = document.getElementById('btnCloseSyncModal');

        if (btnOpen && modal) {
            btnOpen.addEventListener('click', () => {
                populateModalFields();
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
        }

        if (btnClose && modal) {
            btnClose.addEventListener('click', () => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
        }

        // Tab switching inside modal
        document.querySelectorAll('.sync-tab-btn').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
                document.querySelectorAll('.sync-tab-btn').forEach(b => b.classList.remove('active'));
                tabBtn.classList.add('active');
                const target = tabBtn.getAttribute('data-sync-tab');
                document.querySelectorAll('.sync-tab-panel').forEach(p => p.style.display = 'none');
                const panel = document.getElementById('syncTab' + target.charAt(0).toUpperCase() + target.slice(1));
                if (panel) panel.style.display = 'block';
            });
        });

        // Sync Now
        const btnSyncNow = document.getElementById('btnSyncNow');
        if (btnSyncNow) {
            btnSyncNow.addEventListener('click', async () => {
                btnSyncNow.disabled = true;
                await pullFromCloud(false);
                await pushToCloud(true);
                btnSyncNow.disabled = false;
            });
        }

        // Auto Sync Toggle
        const btnAuto = document.getElementById('btnAutoSyncToggle');
        const autoLabel = document.getElementById('autoSyncLabel');
        if (btnAuto && autoLabel) {
            btnAuto.addEventListener('click', () => {
                config.autoSync = !config.autoSync;
                saveConfig();
                autoLabel.textContent = config.autoSync ? 'BẬT' : 'TẮT';
                autoLabel.style.color = config.autoSync ? '#10b981' : '#ef4444';
            });
        }

        // Save Firebase
        const btnSaveFb = document.getElementById('btnSaveFirebase');
        if (btnSaveFb) {
            btnSaveFb.addEventListener('click', async () => {
                const url = (document.getElementById('inputFirebaseUrl')?.value || '').trim();
                if (!url) {
                    if (confirm('Xóa cấu hình Firebase?')) {
                        config.provider = 'none';
                        config.firebaseUrl = '';
                        saveConfig();
                        updateSyncIndicator();
                    }
                    return;
                }
                config.provider = 'firebase';
                config.firebaseUrl = url;
                saveConfig();
                await pushToCloud(true);
            });
        }

        // Save GitHub Gist
        const btnSaveGh = document.getElementById('btnSaveGithub');
        if (btnSaveGh) {
            btnSaveGh.addEventListener('click', async () => {
                const token = (document.getElementById('inputGithubToken')?.value || '').trim();
                const gistId = (document.getElementById('inputGithubGistId')?.value || '').trim();
                if (!token && !gistId) {
                    if (confirm('Xóa cấu hình GitHub?')) {
                        config.provider = 'none';
                        config.githubToken = '';
                        config.githubGistId = '';
                        saveConfig();
                        updateSyncIndicator();
                    }
                    return;
                }
                config.provider = 'github';
                config.githubToken = token;
                config.githubGistId = gistId;
                saveConfig();
                await pushToCloud(true);
                populateModalFields();
            });
        }

        // Save JSONBin
        const btnSaveJb = document.getElementById('btnSaveJsonbin');
        if (btnSaveJb) {
            btnSaveJb.addEventListener('click', async () => {
                const id = (document.getElementById('inputJsonbinId')?.value || '').trim();
                const key = (document.getElementById('inputJsonbinKey')?.value || '').trim();
                if (!id) {
                    if (confirm('Xóa cấu hình JSONBin?')) {
                        config.provider = 'none';
                        config.jsonbinId = '';
                        config.jsonbinKey = '';
                        saveConfig();
                        updateSyncIndicator();
                    }
                    return;
                }
                config.provider = 'jsonbin';
                config.jsonbinId = id;
                config.jsonbinKey = key;
                saveConfig();
                await pushToCloud(true);
            });
        }

        // QR Code Generator
        const btnGenQr = document.getElementById('btnGenerateQr');
        const qrResult = document.getElementById('qrResult');
        const qrImage = document.getElementById('qrImage');
        const btnCopyLink = document.getElementById('btnCopySyncLink');

        if (btnGenQr && qrResult && qrImage) {
            btnGenQr.addEventListener('click', () => {
                const url = generateShareUrl(true);
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(url)}`;
                qrImage.src = qrUrl;
                qrResult.style.display = 'block';
            });
        }

        if (btnCopyLink) {
            btnCopyLink.addEventListener('click', () => {
                const url = generateShareUrl(true);
                navigator.clipboard.writeText(url).then(() => {
                    if (typeof window.showToast === 'function') {
                        window.showToast('📋 Đã sao chép liên kết đồng bộ vào bộ nhớ tạm!');
                    }
                }).catch(() => {
                    prompt('Sao chép liên kết sau:', url);
                });
            });
        }

        // Backup Export / Import
        const btnExport = document.getElementById('btnExportJson');
        const inputImport = document.getElementById('inputImportJson');

        if (btnExport) {
            btnExport.addEventListener('click', exportJsonFile);
        }

        if (inputImport) {
            inputImport.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    try {
                        await importJsonFile(file);
                        populateModalFields();
                    } catch (err) {
                        alert('Lỗi đọc file JSON: ' + err.message);
                    }
                }
            });
        }
    }

    function populateModalFields() {
        const inFb = document.getElementById('inputFirebaseUrl');
        const inGhTok = document.getElementById('inputGithubToken');
        const inGhGist = document.getElementById('inputGithubGistId');
        const inJbId = document.getElementById('inputJsonbinId');
        const inJbKey = document.getElementById('inputJsonbinKey');
        const autoLabel = document.getElementById('autoSyncLabel');

        if (inFb) inFb.value = config.firebaseUrl || '';
        if (inGhTok) inGhTok.value = config.githubToken || '';
        if (inGhGist) inGhGist.value = config.githubGistId || '';
        if (inJbId) inJbId.value = config.jsonbinId || '';
        if (inJbKey) inJbKey.value = config.jsonbinKey || '';
        if (autoLabel) {
            autoLabel.textContent = config.autoSync ? 'BẬT' : 'TẮT';
            autoLabel.style.color = config.autoSync ? '#10b981' : '#ef4444';
        }

        // Active tab matching current provider
        const prov = config.provider !== 'none' ? config.provider : 'firebase';
        const tabBtn = document.querySelector(`.sync-tab-btn[data-sync-tab="${prov}"]`);
        if (tabBtn) tabBtn.click();

        updateSyncIndicator();
    }

    // Expose public API
    window.PlainSync = {
        init,
        getLocalData,
        applyData,
        pushToCloud,
        pullFromCloud,
        schedulePush,
        generateShareUrl,
        exportJsonFile,
        importJsonFile,
        saveConfig,
        getConfig: () => Object.assign({}, config)
    };

})(window);
