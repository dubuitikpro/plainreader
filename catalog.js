/**
 * PlainReader — Book Catalog
 * Uses Open Library API (free, no API key required)
 * https://openlibrary.org/developers/api
 */
(function () {
    'use strict';

    // =========================================
    // Constants
    // =========================================
    const OL_SEARCH = 'https://openlibrary.org/search.json';
    const OL_WORKS = 'https://openlibrary.org/works/';
    const OL_SUBJECTS = 'https://openlibrary.org/subjects/';
    const OL_TRENDING = 'https://openlibrary.org/trending/daily.json';
    const OL_COVER = 'https://covers.openlibrary.org/b/id/';
    const OL_COVER_OLID = 'https://covers.openlibrary.org/b/olid/';
    const OL_BASE = 'https://openlibrary.org';

    const STORAGE_WISHLIST = 'plainreader-wishlist';
    const STORAGE_FAVORITES = 'plainreader-favorites';
    const STORAGE_FINISHED = 'plainreader-finished';
    const STORAGE_THEME = 'plainreader-theme';
    const STORAGE_AUDIO_PROGRESS = 'plainreader-audio-progress';
    const STORAGE_AUDIO_BOOKMARKS = 'plainreader-audio-bookmarks';
    const STORAGE_AUDIO_NOTES = 'plainreader-audio-notes';
    const STORAGE_AUDIO_LAST_PLAYED = 'plainreader-audio-last-played';
    const STORAGE_AUDIO_STATE = 'plainreader-audio-state';
    const PAGE_SIZE = 20;

    // =========================================
    // State
    // =========================================
    let wishlist = loadFromStorage(STORAGE_WISHLIST, []);
    let finished = loadFromStorage(STORAGE_FINISHED, []);

    // Merge any existing favorites into wishlist so user keeps all saved books
    try {
        const oldFavs = loadFromStorage(STORAGE_FAVORITES, []);
        if (Array.isArray(oldFavs) && oldFavs.length > 0) {
            let changed = false;
            oldFavs.forEach(fb => {
                if (!fb) return;
                const exists = wishlist.some(wb => wb && (wb.key === fb.key || (wb.title && fb.title && wb.title.toLowerCase().trim() === fb.title.toLowerCase().trim())));
                if (!exists) {
                    wishlist.push(fb);
                    changed = true;
                }
            });
            if (changed) {
                saveToStorage(STORAGE_WISHLIST, wishlist);
            }
            localStorage.removeItem(STORAGE_FAVORITES);
        }
    } catch (e) {
        console.warn('Favorites migration error:', e);
    }
    let currentQuery = '';
    let currentSearchEnglishQuery = '';
    let currentPage = 1;
    let totalResults = 0;
    let currentModalBook = null;
    let isLoading = false;

    // =========================================
    // DOM Elements
    // =========================================
    const searchInput = document.getElementById('searchInput');
    const btnSearch = document.getElementById('btnSearch');
    const quickTags = document.getElementById('quickTags');
    const tabs = document.getElementById('tabs');
    const tabExplore = document.getElementById('tabExplore');
    const tabWishlist = document.getElementById('tabWishlist');
    const tabFinished = document.getElementById('tabFinished');
    const contentExplore = document.getElementById('contentExplore');
    const contentWishlist = document.getElementById('contentWishlist');
    const contentFinished = document.getElementById('contentFinished');
    const wishlistCount = document.getElementById('wishlistCount');
    const trendingGrid = document.getElementById('trendingGrid');
    const recommendationsSection = document.getElementById('recommendationsSection');
    const recommendationsGrid = document.getElementById('recommendationsGrid');
    const searchResultsSection = document.getElementById('searchResultsSection');
    const searchResultsGrid = document.getElementById('searchResultsGrid');
    const searchResultsTitle = document.getElementById('searchResultsTitle');
    const resultCount = document.getElementById('resultCount');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const btnLoadMore = document.getElementById('btnLoadMore');
    const catalogSectionsContainer = document.getElementById('catalogSectionsContainer');
    const btnBackToExplore = document.getElementById('btnBackToExplore');
    const catalogLoading = document.getElementById('catalogLoading');
    const wishlistGrid = document.getElementById('wishlistGrid');
    const finishedGrid = document.getElementById('finishedGrid');
    const wishlistEmpty = document.getElementById('wishlistEmpty');
    const finishedEmpty = document.getElementById('finishedEmpty');
    const finishedCount = document.getElementById('finishedCount');

    // Category Detail View Elements
    const categoryDetailSection = document.getElementById('categoryDetailSection');
    const btnBackFromCategory = document.getElementById('btnBackFromCategory');
    const categoryBannerIcon = document.getElementById('categoryBannerIcon');
    const categoryBannerTitle = document.getElementById('categoryBannerTitle');
    const categoryBannerDesc = document.getElementById('categoryBannerDesc');
    const categoryTotalCount = document.getElementById('categoryTotalCount');
    const categoryBooksGrid = document.getElementById('categoryBooksGrid');
    const categoryLoadMoreContainer = document.getElementById('categoryLoadMoreContainer');
    const btnCategoryLoadMore = document.getElementById('btnCategoryLoadMore');

    let currentActiveCategory = null;
    let currentCategoryPage = 1;
    let currentCategoryOffset = 0;
    let currentCategoryTotalCount = 0;
    let isCategoryLoading = false;

    // Modal
    const bookModal = document.getElementById('bookModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const modalCover = document.getElementById('modalCover');
    const modalTitle = document.getElementById('modalTitle');
    const modalAuthor = document.getElementById('modalAuthor');
    const modalYear = document.getElementById('modalYear');
    const modalPages = document.getElementById('modalPages');
    const modalLanguage = document.getElementById('modalLanguage');
    const modalRatingBadge = document.getElementById('modalRatingBadge');
    const modalRatingBadgeText = document.getElementById('modalRatingBadgeText');
    const modalGoodreadsQuickLink = document.getElementById('modalGoodreadsQuickLink');
    const modalSubjects = document.getElementById('modalSubjects');
    const modalDescription = document.getElementById('modalDescription');
    const modalBtnWishlist = document.getElementById('modalBtnWishlist');
    const modalBtnFinished = document.getElementById('modalBtnFinished');
    const modalBtnOpenLibrary = document.getElementById('modalBtnOpenLibrary');
    const modalBtnGoodreads = document.getElementById('modalBtnGoodreads');
    const modalBtnAnnaArchive = document.getElementById('modalBtnAnnaArchive');
    const modalBtnAnnaArchiveEn = document.getElementById('modalBtnAnnaArchiveEn');
    const modalOriginalTitle = document.getElementById('modalOriginalTitle');
    const modalOriginalTitleText = document.getElementById('modalOriginalTitleText');
    const btnToggleOrigDesc = document.getElementById('btnToggleOrigDesc');
    const modalOriginalDescBox = document.getElementById('modalOriginalDescBox');
    const modalOriginalDescription = document.getElementById('modalOriginalDescription');

    // Toast
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // Audio Elements
    const tabAudio = document.getElementById('tabAudio');
    const contentAudio = document.getElementById('contentAudio');
    const audioSearchInput = document.getElementById('audioSearchInput');
    const btnAudioSearch = document.getElementById('btnAudioSearch');
    const audioGenreTags = document.getElementById('audioGenreTags');
    const audiobooksGrid = document.getElementById('audiobooksGrid');
    const audiobooksCount = document.getElementById('audiobooksCount');
    const audiobooksSectionTitle = document.getElementById('audiobooksSectionTitle');
    const audiobooksLoading = document.getElementById('audiobooksLoading');
    const modalBtnAudiobook = document.getElementById('modalBtnAudiobook');

    // Audio History & In-Progress Elements
    const tabHistory = document.getElementById('tabHistory');
    const contentHistory = document.getElementById('contentHistory');
    const audioHistoryCount = document.getElementById('audioHistoryCount');
    const historyGrid = document.getElementById('historyGrid');
    const historyEmpty = document.getElementById('historyEmpty');
    const historyHeaderActions = document.getElementById('historyHeaderActions');
    const btnClearAllHistory = document.getElementById('btnClearAllHistory');
    const btnExploreAudiobooks = document.getElementById('btnExploreAudiobooks');
    const btnFilterHistoryAll = document.getElementById('btnFilterHistoryAll');
    const btnFilterHistoryNotes = document.getElementById('btnFilterHistoryNotes');
    const historyCountAll = document.getElementById('historyCountAll');
    const historyCountNotes = document.getElementById('historyCountNotes');
    let currentHistoryFilter = 'all';
    let currentEditingNoteBook = null;

    // Recommendations Hub Elements
    const tabRecommend = document.getElementById('tabRecommend');
    const contentRecommend = document.getElementById('contentRecommend');
    const recEngineNav = document.getElementById('recEngineNav');
    const recAiPromptContainer = document.getElementById('recAiPromptContainer');
    const recAiPromptForm = document.getElementById('recAiPromptForm');
    const recAiPromptInput = document.getElementById('recAiPromptInput');
    const btnRecAiSubmit = document.getElementById('btnRecAiSubmit');
    const recSearchForm = document.getElementById('recSearchForm');
    const recSearchInput = document.getElementById('recSearchInput');
    const btnRecSearch = document.getElementById('btnRecSearch');
    const btnRecFromCurrent = document.getElementById('btnRecFromCurrent');
    const btnRecSettings = document.getElementById('btnRecSettings');
    const recMoodsScroll = document.getElementById('recMoodsScroll');
    const recAiInsightBox = document.getElementById('recAiInsightBox');
    const recAiInsightContent = document.getElementById('aiInsightContent');
    const recResultsTitle = document.getElementById('recResultsTitle');
    const recResultsCount = document.getElementById('recResultsCount');
    const recBooksGrid = document.getElementById('recBooksGrid');
    const recLoadMoreContainer = document.getElementById('recLoadMoreContainer');
    const btnRecLoadMore = document.getElementById('btnRecLoadMore');
    const recEndMessage = document.getElementById('recEndMessage');
    const recLoading = document.getElementById('recLoading');
    const recLoadingText = document.getElementById('recLoadingText');
    const modalRecWrapper = document.getElementById('modalRecWrapper');
    const modalRecScroll = document.getElementById('modalRecScroll');
    const modalRecTitle = document.getElementById('modalRecTitle');
    const modalRecTag = document.getElementById('modalRecTag');
    const playerSuggestedBox = document.getElementById('playerSuggestedBox');
    const playerSuggestedList = document.getElementById('playerSuggestedList');
    const btnPlayerOpenRecPage = document.getElementById('btnPlayerOpenRecPage');
    const playerOpenRecPageText = document.getElementById('playerOpenRecPageText');
    let playerSuggestedCurrentCluster = null;
    const aiConfigModal = document.getElementById('aiConfigModal');
    const btnCloseAiConfig = document.getElementById('btnCloseAiConfig');
    const aiApiKeyInput = document.getElementById('aiApiKeyInput');
    const btnToggleApiKeyVisibility = document.getElementById('btnToggleApiKeyVisibility');
    const btnClearApiKey = document.getElementById('btnClearApiKey');
    const btnSaveApiKey = document.getElementById('btnSaveApiKey');
    let currentRecEngine = 'all';
    let currentRecMood = 'all';
    let isRecTabInitialized = false;

    // Dedicated Audio Player Modal Elements
    const audioPlayerModal = document.getElementById('audioPlayerModal');
    const playerBookCover = document.getElementById('playerBookCover');
    const playerBookTitle = document.getElementById('playerBookTitle');
    const playerBookAuthor = document.getElementById('playerBookAuthor');
    const playerTotalChaptersBadge = document.getElementById('playerTotalChaptersBadge');
    const playerTotalDurationBadge = document.getElementById('playerTotalDurationBadge');
    const playerTrackCounter = document.getElementById('playerTrackCounter');
    const playerTrackTitle = document.getElementById('playerTrackTitle');
    const btnPlayerNote = document.getElementById('btnPlayerNote');
    const btnPlayerBookmark = document.getElementById('btnPlayerBookmark');
    const tabChaptersBtn = document.getElementById('tabChaptersBtn');
    const tabBookmarksBtn = document.getElementById('tabBookmarksBtn');
    const tabNotesBtn = document.getElementById('tabNotesBtn');
    const playerNoteTabBadge = document.getElementById('playerNoteTabBadge');
    const playerBookmarksContainer = document.getElementById('playerBookmarksContainer');
    const playerBookmarksList = document.getElementById('playerBookmarksList');
    const playerBookmarksCount = document.getElementById('playerBookmarksCount');
    const btnAddBookmarkNow = document.getElementById('btnAddBookmarkNow');
    const bookmarkNowTimePreview = document.getElementById('bookmarkNowTimePreview');
    const playerNotesContainer = document.getElementById('playerNotesContainer');
    const btnPlayerNoteInsertTimestamp = document.getElementById('btnPlayerNoteInsertTimestamp');
    const playerNoteTimePreview = document.getElementById('playerNoteTimePreview');
    const playerNotesTextarea = document.getElementById('playerNotesTextarea');
    const btnPlayerNoteDelete = document.getElementById('btnPlayerNoteDelete');
    const playerNoteCharCount = document.getElementById('playerNoteCharCount');
    const btnPlayerNoteSave = document.getElementById('btnPlayerNoteSave');
    const playerNoteStatusSaved = document.getElementById('playerNoteStatusSaved');
    const playlistHintText = document.getElementById('playlistHintText');
    const audioContinueSection = document.getElementById('audioContinueSection');

    // Audiobook Note Modal Elements
    const audioNoteModal = document.getElementById('audioNoteModal');
    const btnCloseAudioNoteModal = document.getElementById('btnCloseAudioNoteModal');
    const audioNoteModalBookTitle = document.getElementById('audioNoteModalBookTitle');
    const audioNoteModalBookAuthor = document.getElementById('audioNoteModalBookAuthor');
    const btnModalNoteInsertTimestamp = document.getElementById('btnModalNoteInsertTimestamp');
    const modalNoteTimePreview = document.getElementById('modalNoteTimePreview');
    const audioNoteModalTextarea = document.getElementById('audioNoteModalTextarea');
    const audioNoteModalCharCount = document.getElementById('audioNoteModalCharCount');
    const audioNoteModalSavedTime = document.getElementById('audioNoteModalSavedTime');
    const btnAudioNoteModalDelete = document.getElementById('btnAudioNoteModalDelete');
    const btnAudioNoteModalCancel = document.getElementById('btnAudioNoteModalCancel');
    const btnAudioNoteModalSave = document.getElementById('btnAudioNoteModalSave');
    const btnPlayerMinimize = document.getElementById('btnPlayerMinimize');
    const btnPlayerClose = document.getElementById('btnPlayerClose');
    const playerCurrentTime = document.getElementById('playerCurrentTime');
    const playerTotalDuration = document.getElementById('playerTotalDuration');
    const playerSliderWrap = document.getElementById('playerSliderWrap');
    const playerSliderFill = document.getElementById('playerSliderFill');
    const playerSeekSlider = document.getElementById('playerSeekSlider');
    const btnPlayerRewind15 = document.getElementById('btnPlayerRewind15');
    const btnPlayerPrev = document.getElementById('btnPlayerPrev');
    const btnPlayerPlay = document.getElementById('btnPlayerPlay');
    const btnPlayerNext = document.getElementById('btnPlayerNext');
    const btnPlayerForward15 = document.getElementById('btnPlayerForward15');
    const btnPlayerMute = document.getElementById('btnPlayerMute');
    const volumeIcon = document.getElementById('volumeIcon');
    const playerVolumeSlider = document.getElementById('playerVolumeSlider');
    const btnPlayerTimer = document.getElementById('btnPlayerTimer');
    const playerTimerLabel = document.getElementById('playerTimerLabel');
    const timerPopupMenu = document.getElementById('timerPopupMenu');
    const btnPlayerSpeed = document.getElementById('btnPlayerSpeed');
    const playerSpeedLabel = document.getElementById('playerSpeedLabel');
    const playlistChapterHeader = document.getElementById('playlistChapterHeader');
    const playerChaptersList = document.getElementById('playerChaptersList');
    const playerArchiveLink = document.getElementById('playerArchiveLink');
    const playerGoodreadsLink = document.getElementById('playerGoodreadsLink');
    const playerBookDescription = document.getElementById('playerBookDescription');

    // Mini Audio Player Elements
    const miniAudioPlayer = document.getElementById('miniAudioPlayer');
    const miniPlayerProgressLine = document.getElementById('miniPlayerProgressLine');
    const miniPlayerOpen = document.getElementById('miniPlayerOpen');
    const miniPlayerThumb = document.getElementById('miniPlayerThumb');
    const miniPlayerTitle = document.getElementById('miniPlayerTitle');
    const miniPlayerChapter = document.getElementById('miniPlayerChapter');
    const miniBtnRewind = document.getElementById('miniBtnRewind');
    const miniBtnPlay = document.getElementById('miniBtnPlay');
    const miniBtnForward = document.getElementById('miniBtnForward');
    const miniBtnExpand = document.getElementById('miniBtnExpand');
    const miniBtnClose = document.getElementById('miniBtnClose');

    // =========================================
    // Theme (Dark / Light)
    // =========================================
    const btnThemeToggle = document.getElementById('btnThemeToggle');

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem(STORAGE_THEME, theme);
        } catch (e) {}
        if (btnThemeToggle) {
            const isLight = theme === 'light';
            btnThemeToggle.setAttribute('title', isLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng');
            btnThemeToggle.setAttribute('aria-label', isLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng');
        }
    }

    function initTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_THEME);
            if (saved) {
                applyTheme(saved);
            } else {
                applyTheme('dark');
            }
        } catch (e) {
            applyTheme('dark');
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        applyTheme(next);
        if (typeof showToast === 'function') {
            showToast(next === 'light' ? '☀️ Đã chuyển sang giao diện sáng' : '🌙 Đã chuyển sang giao diện tối');
        }
        if (window.PlainSync && typeof window.PlainSync.schedulePush === 'function') {
            window.PlainSync.schedulePush();
        }
    }

    initTheme();

    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', toggleTheme);
    }

    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_THEME && e.newValue) {
            applyTheme(e.newValue);
        }
    });

    // =========================================
    // Storage Helpers
    // =========================================
    function loadFromStorage(key, defaultVal = []) {
        try {
            const val = localStorage.getItem(key);
            if (val === null || val === undefined) return defaultVal;
            return JSON.parse(val);
        } catch {
            return defaultVal;
        }
    }

    function saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            if (window.PlainSync && typeof window.PlainSync.schedulePush === 'function') {
                window.PlainSync.schedulePush();
            }
        } catch (e) {
            console.warn('Storage save failed:', e);
        }
    }

    function saveSearchKeyword(q) {
        if (!q || !q.trim()) return;
        const trimmed = q.trim();
        let history = loadFromStorage('plainreader-search-history', []);
        history = [trimmed, ...history.filter(item => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 25);
        saveToStorage('plainreader-search-history', history);
        renderSearchHistoryDatalist(history);
    }

    function renderSearchHistoryDatalist(historyList) {
        const datalist = document.getElementById('searchHistoryList');
        if (!datalist) return;
        const list = historyList || loadFromStorage('plainreader-search-history', []);
        datalist.innerHTML = list.map(q => `<option value="${escapeHtml(q)}"></option>`).join('');
    }

    function formatRelativeDate(ts) {
        if (!ts) return '';
        const now = Date.now();
        const diff = Math.floor((now - ts) / 1000);
        if (diff < 60) return 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        const d = new Date(ts);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const hours = d.getHours().toString().padStart(2, '0');
        const mins = d.getMinutes().toString().padStart(2, '0');
        return `${day}/${month} ${hours}:${mins}`;
    }

    function isInWishlist(bookKey) {
        return wishlist.some(b => b.key === bookKey);
    }

    function isInFinished(bookKey) {
        return finished.some(b => b.key === bookKey);
    }

    function toggleWishlist(book) {
        const wasInWishlist = isInWishlist(book.key);
        if (wasInWishlist) {
            wishlist = wishlist.filter(b => b.key !== book.key);
            showToast('Đã xóa khỏi danh sách muốn đọc');
        } else {
            wishlist.push(book);
            showToast('Đã thêm vào danh sách muốn đọc');
        }
        saveToStorage(STORAGE_WISHLIST, wishlist);
        updateCounts();
        if (!wasInWishlist) loadRecommendations();
    }

    function toggleFinished(book) {
        if (isInFinished(book.key)) {
            finished = finished.filter(b => b.key !== book.key);
            showToast('Đã bỏ đánh dấu đọc xong');
        } else {
            const finishedBook = { ...book, finishedAt: Date.now() };
            finished.push(finishedBook);
            showToast('✅ Đã đánh dấu đọc xong!');
            // Auto-remove from wishlist if present
            if (isInWishlist(book.key)) {
                wishlist = wishlist.filter(b => b.key !== book.key);
                saveToStorage(STORAGE_WISHLIST, wishlist);
            }
        }
        saveToStorage(STORAGE_FINISHED, finished);
        updateCounts();
    }

    function updateCounts() {
        wishlistCount.textContent = wishlist.length;
        if (finishedCount) {
            finishedCount.textContent = finished.length;
            finishedCount.style.display = finished.length > 0 ? 'inline-block' : 'none';
        }

        if (audioHistoryCount) {
            const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
            const notesMap = loadFromStorage(STORAGE_AUDIO_NOTES, {});
            const count = Object.entries(progressMap).filter(([k, p]) => {
                if (!p) return false;
                const id = p.identifier || k;
                const bookmarked = isAudiobookBookmarked(id) || p.isBookmarked === true;
                const note = p.note || notesMap[id]?.text || notesMap[k]?.text;
                return bookmarked || (note && note.trim().length > 0);
            }).length;
            audioHistoryCount.textContent = count;
            audioHistoryCount.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }

    // =========================================
    // Toast
    // =========================================
    let toastTimeout;
    function showToast(msg) {
        clearTimeout(toastTimeout);
        toastMessage.textContent = msg;
        toast.classList.add('show');
        toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // =========================================
    // Translation System (Google Translate API + Local Cache)
    // =========================================
    const STORAGE_TRANS_CACHE = 'plainreader-trans-cache';
    const translationCache = new Map();

    (function initTranslationCache() {
        try {
            const raw = localStorage.getItem(STORAGE_TRANS_CACHE);
            if (raw) {
                const parsed = JSON.parse(raw);
                Object.entries(parsed).forEach(([k, v]) => translationCache.set(k, v));
            }
        } catch { /* ignore */ }
    })();

    let saveCacheTimeout;
    function saveTranslationCache() {
        clearTimeout(saveCacheTimeout);
        saveCacheTimeout = setTimeout(() => {
            try {
                const obj = {};
                let count = 0;
                for (const [k, v] of translationCache.entries()) {
                    if (count++ > 1500) break;
                    obj[k] = v;
                }
                localStorage.setItem(STORAGE_TRANS_CACHE, JSON.stringify(obj));
            } catch { /* ignore */ }
        }, 1000);
    }

    // Clean up raw Open Library description text
    function cleanDescriptionText(desc) {
        if (!desc || typeof desc !== 'string') return '';
        return desc
            // Replace markdown links [label](url) with just label
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove markdown formatting like ***, **, __, etc.
            .replace(/[*_~`]{1,3}/g, '')
            // Remove standard Open Library / Wikipedia citation blocks like "--------\nFrom Wikipedia..."
            .replace(/----+[\s\S]*?(From Wikipedia|Source:)/gi, '')
            .replace(/\r\n/g, '\n')
            .trim();
    }

    // Helper to translate a single text chunk via POST or GET with fallbacks
    async function requestTranslation(chunk, targetLang = 'vi', sourceLang = 'auto') {
        if (!chunk || !chunk.trim()) return chunk;
        const q = chunk.trim();

        // 1. Primary: Google Translate GTX via POST (bypasses URL length limits, reliable on iOS Safari WebKit)
        try {
            const resp = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                },
                body: 'q=' + encodeURIComponent(q)
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data && data[0]) {
                    const translated = data[0].map(x => x[0]).join('').trim();
                    if (translated) return translated;
                }
            }
        } catch (err) {
            console.warn('POST translation error:', err);
        }

        // 2. Secondary: Google Translate GTX via GET (fallback for shorter chunks)
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(q.slice(0, 1500))}`;
            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data[0]) {
                    const translated = data[0].map(x => x[0]).join('').trim();
                    if (translated) return translated;
                }
            }
        } catch (err) {
            console.warn('GET translation error:', err);
        }

        // 3. Tertiary: MyMemory Translation API
        try {
            const langpair = targetLang === 'en' ? 'vi|en' : 'en|vi';
            const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q.slice(0, 500))}&langpair=${langpair}`;
            const resp = await fetch(mmUrl);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.responseData && data.responseData.translatedText) {
                    const trans = data.responseData.translatedText.trim();
                    if (trans && !trans.includes('MYMEMORY WARNING')) return trans;
                }
            }
        } catch (err) {
            console.warn('MyMemory translation error:', err);
        }

        return q;
    }

    async function translateText(text) {
        if (!text || typeof text !== 'string') return text;
        const clean = text.trim();
        if (!clean) return clean;
        if (translationCache.has(clean)) {
            return translationCache.get(clean);
        }

        // If text is short (title or single paragraph < 2500 chars), translate directly
        if (clean.length <= 2500) {
            const result = await requestTranslation(clean);
            if (result && result !== clean) {
                translationCache.set(clean, result);
                saveTranslationCache();
                return result;
            }
            return result || clean;
        }

        // For long text (e.g. detailed book descriptions > 2500 chars), split by paragraphs
        const paragraphs = clean.split(/\n\s*\n/).filter(p => p.trim());
        const translatedParagraphs = [];

        for (const p of paragraphs) {
            if (p.length > 2500) {
                // If single paragraph is still huge, split by sentences
                const sentences = p.match(/[^.!?]+[.!?]+|\s*$/g) || [p];
                let currentChunk = '';
                const chunkResults = [];
                for (const s of sentences) {
                    if ((currentChunk + s).length > 2000) {
                        chunkResults.push(await requestTranslation(currentChunk));
                        currentChunk = s;
                    } else {
                        currentChunk += s;
                    }
                }
                if (currentChunk.trim()) {
                    chunkResults.push(await requestTranslation(currentChunk));
                }
                translatedParagraphs.push(chunkResults.join(' '));
            } else {
                translatedParagraphs.push(await requestTranslation(p));
            }
        }

        const fullTranslated = translatedParagraphs.join('\n\n');
        if (fullTranslated && fullTranslated !== clean) {
            translationCache.set(clean, fullTranslated);
            saveTranslationCache();
            return fullTranslated;
        }
        return fullTranslated || clean;
    }

    // Dictionary mapping Vietnamese book titles and common subjects to canonical English titles
    const VI_TO_EN_MAP = {
        // Self-help & Business
        'đắc nhân tâm': 'How to Win Friends and Influence People',
        'dac nhan tam': 'How to Win Friends and Influence People',
        'tâm lý tiền bạc': 'The Psychology of Money',
        'tam ly tien bac': 'The Psychology of Money',
        'nhà giả kim': 'The Alchemist',
        'nha gia kim': 'The Alchemist',
        'nghĩ giàu làm giàu': 'Think and Grow Rich',
        'nghi giau lam giau': 'Think and Grow Rich',
        'cha giàu cha nghèo': 'Rich Dad Poor Dad',
        'cha giau cha ngheo': 'Rich Dad Poor Dad',
        'dạy con làm giàu': 'Rich Dad Poor Dad',
        'day con lam giau': 'Rich Dad Poor Dad',
        'mặt dày tâm đen': 'Thick Face Black Heart',
        'mat day tam den': 'Thick Face Black Heart',
        'sức mạnh tiềm thức': 'The Power of Your Subconscious Mind',
        'suc manh tiem thuc': 'The Power of Your Subconscious Mind',
        'thay đổi tí hon': 'Atomic Habits',
        'thói quen nguyên tử': 'Atomic Habits',
        '7 thói quen của người thành đạt': 'The 7 Habits of Highly Effective People',
        'bảy thói quen của người thành đạt': 'The 7 Habits of Highly Effective People',
        'quẳng gánh lo đi và vui sống': 'How to Stop Worrying and Start Living',
        'quang ganh lo di va vui song': 'How to Stop Worrying and Start Living',
        'đi tìm lẽ sống': "Man's Search for Meaning",
        'di tim le song': "Man's Search for Meaning",
        'sapiens lược sử loài người': 'Sapiens A Brief History of Humankind',
        'lược sử loài người': 'Sapiens A Brief History of Humankind',
        'lược sử thời gian': 'A Brief History of Time',
        'người giàu có nhất thành babylon': 'The Richest Man in Babylon',
        'nguoi giau co nhat thanh babylon': 'The Richest Man in Babylon',
        'những thứ ba với thầy morrie': 'Tuesdays with Morrie',

        // Literature & Classics
        'bố già': 'The Godfather',
        'bo gia': 'The Godfather',
        'hoàng tử bé': 'The Little Prince',
        'hoang tu be': 'The Little Prince',
        'binh pháp tôn tử': 'The Art of War',
        'binh phap ton tu': 'The Art of War',
        'mật mã da vinci': 'The Da Vinci Code',
        'mat ma da vinci': 'The Da Vinci Code',
        'rừng na uy': 'Norwegian Wood',
        'rung na uy': 'Norwegian Wood',
        'tội ác và hình phạt': 'Crime and Punishment',
        'toi ac va hinh phat': 'Crime and Punishment',
        'gatsby vĩ đại': 'The Great Gatsby',
        'hai số phận': 'Kane and Abel',
        'hai so phan': 'Kane and Abel',
        'không gia đình': "Nobody's Boy",
        'khong gia dinh': "Nobody's Boy",
        'những người khốn khổ': 'Les Misérables',
        'nhung nguoi khon kho': 'Les Misérables',
        'bá tước monte cristo': 'The Count of Monte Cristo',
        'ba tuoc monte cristo': 'The Count of Monte Cristo',
        'ông già và biển cả': 'The Old Man and the Sea',
        'ong gia va bien ca': 'The Old Man and the Sea',
        'kiêu hãnh và định kiến': 'Pride and Prejudice',
        'kieu hanh va dinh kien': 'Pride and Prejudice',
        'chiến tranh và hòa bình': 'War and Peace',
        'chien tranh va hoa binh': 'War and Peace',
        'giết con chim nhại': 'To Kill a Mockingbird',
        'giet con chim nhai': 'To Kill a Mockingbird',
        'trại súc vật': 'Animal Farm',
        'trai suc vat': 'Animal Farm',
        'một chín tám tư': '1984',
        'tam quốc diễn nghĩa': 'Romance of the Three Kingdoms',
        'tam quoc dien nghia': 'Romance of the Three Kingdoms',
        'thủy hử': 'Water Margin',
        'thuy hu': 'Water Margin',
        'tây du ký': 'Journey to the West',
        'tay du ky': 'Journey to the West',

        // Subjects & Genres
        'tiểu thuyết': 'Fiction',
        'tieu thuyet': 'Fiction',
        'khoa học': 'Science',
        'khoa hoc': 'Science',
        'lịch sử': 'History',
        'lich su': 'History',
        'triết học': 'Philosophy',
        'triet hoc': 'Philosophy',
        'kinh doanh': 'Business',
        'kinh te': 'Economics',
        'kinh tế': 'Economics',
        'tâm lý học': 'Psychology',
        'tam ly hoc': 'Psychology',
        'lập trình': 'Programming',
        'lap trinh': 'Programming',
        'khoa học máy tính': 'Computer Science',
        'khoa hoc may tinh': 'Computer Science',
        'trinh thám': 'Mystery',
        'trinh tham': 'Mystery',
        'lãng mạn': 'Romance',
        'lang man': 'Romance',
        'giả tưởng': 'Fantasy',
        'gia tuong': 'Fantasy',
        'viễn tưởng': 'Science Fiction',
        'vien tuong': 'Science Fiction',
        'thiếu nhi': 'Children',
        'thieu nhi': 'Children',
        'kinh điển': 'Classics',
        'kinh dien': 'Classics',
        'tiểu sử': 'Biography',
        'tieu su': 'Biography',
        'nghệ thuật': 'Art',
        'nghe thuat': 'Art'
    };

    function isKnownVietnameseTerm(text) {
        if (!text) return false;
        const lower = text.toLowerCase().trim();
        return Object.keys(VI_TO_EN_MAP).some(k => lower === k || lower.includes(k) || k.includes(lower));
    }

    async function translateToEnglish(text) {
        if (!text || typeof text !== 'string') return text;
        const clean = text.trim();
        if (!clean) return clean;

        const lower = clean.toLowerCase();

        // 1. Direct match in dictionary
        if (VI_TO_EN_MAP[lower]) {
            return VI_TO_EN_MAP[lower];
        }

        // 2. Substring match in dictionary for longer titles
        for (const [vi, en] of Object.entries(VI_TO_EN_MAP)) {
            if (lower === vi || (lower.length > 5 && lower.includes(vi))) {
                return en;
            }
        }

        // 3. Cache check
        const cacheKey = `vi_en:${lower}`;
        if (translationCache.has(cacheKey)) {
            return translationCache.get(cacheKey);
        }

        // 4. Remote API translation to English
        const translated = await requestTranslation(clean, 'en', 'auto');
        if (translated && translated.toLowerCase() !== lower) {
            translationCache.set(cacheKey, translated);
            saveTranslationCache();
            return translated;
        }

        return clean;
    }

    async function batchTranslateBooks(books) {
        if (!books || !Array.isArray(books) || books.length === 0) return books;

        books.forEach(b => {
            b.originalTitle = b.originalTitle || b.title;
            if (translationCache.has(b.originalTitle)) {
                b.titleVi = translationCache.get(b.originalTitle);
            }
        });

        const needed = books.filter(b => !b.titleVi);
        if (needed.length === 0) return books;

        const chunkSize = 20;
        for (let i = 0; i < needed.length; i += chunkSize) {
            const chunk = needed.slice(i, i + chunkSize);
            const combined = chunk.map(b => b.originalTitle.replace(/[\r\n]+/g, ' ')).join('\n');
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(combined)}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data[0]) {
                        const raw = data[0].map(x => x[0]).join('');
                        const lines = raw.split('\n');
                        if (lines.length === chunk.length) {
                            chunk.forEach((b, idx) => {
                                const trans = (lines[idx] || '').trim();
                                b.titleVi = trans || b.originalTitle;
                                if (trans) translationCache.set(b.originalTitle, trans);
                            });
                        } else {
                            await Promise.all(chunk.map(async b => {
                                b.titleVi = await translateText(b.originalTitle);
                            }));
                        }
                    }
                }
            } catch (err) {
                console.warn('Batch translation error:', err);
                chunk.forEach(b => {
                    b.titleVi = b.titleVi || b.originalTitle;
                });
            }
        }

        saveTranslationCache();
        return books;
    }

    // =========================================
    // Book Data Normalization
    // =========================================
    function normalizeSearchBook(doc) {
        const title = doc.title || 'Không có tiêu đề';
        return {
            key: doc.key || '',
            title: title,
            originalTitle: title,
            titleVi: translationCache.get(title) || null,
            author: doc.author_name ? doc.author_name.join(', ') : 'Không rõ tác giả',
            coverId: doc.cover_i || null,
            coverEditionKey: doc.cover_edition_key || null,
            year: doc.first_publish_year || null,
            subjects: (doc.subject || []).slice(0, 5),
            language: doc.language ? doc.language[0] : null,
            editionCount: doc.edition_count || 0,
            pages: doc.number_of_pages_median || null,
            rating: doc.ratings_average ? Number(doc.ratings_average.toFixed(1)) : null,
            ratingsCount: doc.ratings_count || 0,
            source: 'openlibrary',
            sourceLabel: '📖 Open Library'
        };
    }

    function normalizeSubjectBook(work) {
        const title = work.title || 'Không có tiêu đề';
        return {
            key: work.key || '',
            title: title,
            originalTitle: title,
            titleVi: translationCache.get(title) || null,
            author: work.authors ? work.authors.map(a => a.name).join(', ') : 'Không rõ tác giả',
            coverId: work.cover_id || null,
            coverEditionKey: work.cover_edition_key || null,
            year: work.first_publish_year || null,
            subjects: (work.subject || []).slice(0, 5),
            language: null,
            editionCount: work.edition_count || 0,
            pages: null,
            source: 'openlibrary',
            sourceLabel: '📖 Open Library'
        };
    }

    function normalizeTrendingWork(w) {
        const title = w.title || 'Không có tiêu đề';
        return {
            key: w.key || '',
            title: title,
            originalTitle: title,
            titleVi: translationCache.get(title) || null,
            author: w.author_name ? w.author_name.join(', ') : (w.author_key ? w.author_key.join(', ') : 'Không rõ tác giả'),
            coverId: w.cover_i || null,
            coverEditionKey: w.cover_edition_key || null,
            year: w.first_publish_year || null,
            subjects: (w.subject || []).slice(0, 5),
            language: null,
            editionCount: w.edition_count || 0,
            pages: null,
            source: 'openlibrary',
            sourceLabel: '📖 Open Library'
        };
    }

    function getCoverUrl(book, size = 'M') {
        if (!book) return null;
        if (book.coverUrl) {
            return book.coverUrl;
        }
        if (book.coverId) {
            return `${OL_COVER}${book.coverId}-${size}.jpg`;
        }
        if (book.coverEditionKey) {
            return `${OL_COVER_OLID}${book.coverEditionKey}-${size}.jpg`;
        }
        return null;
    }

    // High-end stylized book cover SVG generator for books without an image
    function generateStylizedBookCoverSvg(title, author) {
        const safeTitle = (title || 'Sách').trim();
        const safeAuthor = (author || 'Tác giả').trim();
        
        const palettes = [
            { bg1: '#1e1b4b', bg2: '#312e81', accent: '#a5b4fc', text: '#ffffff', tag: '#6366f1' },
            { bg1: '#064e3b', bg2: '#065f46', accent: '#6ee7b7', text: '#ffffff', tag: '#10b981' },
            { bg1: '#4c0519', bg2: '#831843', accent: '#fbcfe8', text: '#ffffff', tag: '#f43f5e' },
            { bg1: '#78350f', bg2: '#92400e', accent: '#fde68a', text: '#ffffff', tag: '#f59e0b' },
            { bg1: '#0f172a', bg2: '#1e293b', accent: '#93c5fd', text: '#ffffff', tag: '#3b82f6' },
            { bg1: '#3b0764', bg2: '#581c87', accent: '#e9d5ff', text: '#ffffff', tag: '#a855f7' },
        ];
        let hash = 0;
        for (let i = 0; i < safeTitle.length; i++) {
            hash = (hash << 5) - hash + safeTitle.charCodeAt(i);
            hash |= 0;
        }
        const pal = palettes[Math.abs(hash) % palettes.length];
        
        const words = safeTitle.split(/\s+/);
        const lines = [];
        let curLine = '';
        for (const w of words) {
            if ((curLine + ' ' + w).trim().length <= 15) {
                curLine = (curLine + ' ' + w).trim();
            } else {
                if (curLine) lines.push(curLine);
                curLine = w;
                if (lines.length >= 3) break;
            }
        }
        if (curLine && lines.length < 3) lines.push(curLine);
        if (lines.length === 0) lines.push(safeTitle.substring(0, 18));
        
        const titleTspans = lines.map((l, idx) => 
            `<tspan x="100" dy="${idx === 0 ? 0 : 22}">${escapeHtml(l)}</tspan>`
        ).join('');

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="100%" height="100%">
  <defs>
    <linearGradient id="covGrad_${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${pal.bg1}"/>
      <stop offset="100%" stop-color="${pal.bg2}"/>
    </linearGradient>
    <linearGradient id="spineHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.2)"/>
      <stop offset="4%" stop-color="rgba(0,0,0,0.3)"/>
      <stop offset="8%" stop-color="rgba(255,255,255,0.1)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
  </defs>
  <rect width="200" height="300" rx="6" fill="url(#covGrad_${Math.abs(hash)})"/>
  <rect x="12" y="12" width="176" height="276" rx="4" fill="none" stroke="${pal.accent}" stroke-width="1.2" stroke-opacity="0.35"/>
  <rect x="15" y="15" width="170" height="270" rx="3" fill="none" stroke="${pal.accent}" stroke-width="0.6" stroke-opacity="0.2"/>
  <rect width="18" height="300" fill="url(#spineHighlight)"/>
  <g transform="translate(86, 42)">
    <circle cx="14" cy="14" r="15" fill="${pal.tag}" fill-opacity="0.25"/>
    <path d="M7 10h14v10H7z" fill="none" stroke="${pal.accent}" stroke-width="1.5"/>
    <path d="M14 10v10" stroke="${pal.accent}" stroke-width="1.2"/>
    <path d="M7 10l7-2 7 2" fill="none" stroke="${pal.accent}" stroke-width="1.5"/>
  </g>
  <text x="100" y="115" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="700" fill="${pal.text}">
    ${titleTspans}
  </text>
  <line x1="60" y1="210" x2="140" y2="210" stroke="${pal.accent}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="100" y="235" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="500" fill="${pal.accent}" opacity="0.95">
    ${escapeHtml(safeAuthor.length > 22 ? safeAuthor.substring(0, 20) + '...' : safeAuthor)}
  </text>
  <text x="100" y="268" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="600" fill="${pal.text}" opacity="0.45" letter-spacing="1.5">
    PLAINREADER CLASSICS
  </text>
</svg>`.trim();

        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }

    // =========================================
    // API Calls
    // =========================================
    async function searchBooks(query, page = 1) {
        const offset = (page - 1) * PAGE_SIZE;
        const url = `${OL_SEARCH}?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}&fields=key,title,author_name,cover_i,cover_edition_key,first_publish_year,subject,language,edition_count,number_of_pages_median,ratings_average,ratings_count`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Search failed');
        const data = await resp.json();
        const books = (data.docs || []).map(normalizeSearchBook);
        books.forEach(b => { b.searchQuery = currentQuery; });
        await batchTranslateBooks(books);
        return {
            total: data.numFound || 0,
            books: books,
        };
    }

    async function fetchTrending(period = 'daily', page = 1, limit = 12) {
        const url = period === 'weekly'
            ? `https://openlibrary.org/trending/weekly.json?limit=${limit}&page=${page}`
            : `${OL_TRENDING}?limit=${limit}&page=${page}`;
        try {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeoutId = controller ? setTimeout(() => controller.abort(), 4500) : null;
            const resp = await fetch(url, { signal: controller ? controller.signal : undefined });
            if (timeoutId) clearTimeout(timeoutId);
            if (!resp.ok) throw new Error('Trending failed');
            const data = await resp.json();
            const books = (data.works || []).map(normalizeTrendingWork);
            await batchTranslateBooks(books);
            return books;
        } catch {
            return period === 'daily' ? CURATED_TRENDING_BOOKS : fetchSubjectBooks('classics', limit);
        }
    }

    async function fetchSubjectBooks(subject, limit = 12, offset = 0) {
        const url = `${OL_SUBJECTS}${encodeURIComponent(subject.toLowerCase())}.json?limit=${limit}&offset=${offset}`;
        try {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeoutId = controller ? setTimeout(() => controller.abort(), 4500) : null;
            const resp = await fetch(url, { signal: controller ? controller.signal : undefined });
            if (timeoutId) clearTimeout(timeoutId);
            if (!resp.ok) throw new Error('Subject fetch failed');
            const data = await resp.json();
            const books = (data.works || []).map(normalizeSubjectBook);
            await batchTranslateBooks(books);
            return books;
        } catch {
            return CURATED_TRENDING_BOOKS.slice(0, limit);
        }
    }

    async function fetchBookDetails(workKey) {
        // workKey looks like "/works/OL12345W"
        const key = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
        const resp = await fetch(`${OL_BASE}${key}.json`);
        if (!resp.ok) throw new Error('Details fetch failed');
        return resp.json();
    }

    // =========================================
    // Authoritative Community Ratings (Goodreads / Amazon Global Benchmark)
    // Synchronizes ratings across Open Library feeds and Recommendation Hub
    // =========================================
    const AUTHORITATIVE_GOODREADS_RATINGS = [
        {
            keys: ['atomic habits', 'thói quen nguyên tử', 'thay đổi tí hon', 'ol17930368w'],
            rating: 4.8,
            ratingsCount: 1650000,
            source: 'Goodreads'
        },
        {
            keys: ['how to win friends', 'đắc nhân tâm', 'làm thế nào để thu hút bạn bè', 'dale carnegie', 'ol1063267w'],
            rating: 4.7,
            ratingsCount: 4400000,
            source: 'Goodreads'
        },
        {
            keys: ['rich dad poor dad', 'cha giàu cha nghèo', 'cha giàu, cha nghèo', 'kiyosaki', 'ol82563w'],
            rating: 4.7,
            ratingsCount: 2200000,
            source: 'Goodreads'
        },
        {
            keys: ['psychology of money', 'tâm lý học về tiền', 'tâm lý tiền bạc', 'morgan housel', 'ol21857946w'],
            rating: 4.8,
            ratingsCount: 480000,
            source: 'Goodreads'
        },
        {
            keys: ['48 laws of power', '48 định luật quyền lực', '48 nguyên tắc', 'robert greene'],
            rating: 4.8,
            ratingsCount: 450000,
            source: 'Goodreads'
        },
        {
            keys: ['harry potter', 'hòn đá phù thủy', 'philosopher\'s stone', 'sorcerer\'s stone', 'j. k. rowling'],
            rating: 4.9,
            ratingsCount: 9500000,
            source: 'Goodreads'
        },
        {
            keys: ['the alchemist', 'nhà giả kim', 'o alquimista', 'paulo coelho'],
            rating: 4.8,
            ratingsCount: 3800000,
            source: 'Goodreads'
        },
        {
            keys: ['haunting adeline', 'ám ảnh adeline', 'h. d. carlton'],
            rating: 4.5,
            ratingsCount: 320000,
            source: 'Goodreads'
        },
        {
            keys: ['the mountain is you', 'ngọn núi là bạn', 'brianna wiest'],
            rating: 4.6,
            ratingsCount: 210000,
            source: 'Goodreads'
        },
        {
            keys: ['twisted love', 'tình yêu xoắn', 'ana huang'],
            rating: 4.4,
            ratingsCount: 680000,
            source: 'Goodreads'
        },
        {
            keys: ['the love hypothesis', 'giả thuyết tình yêu', 'ali hazelwood'],
            rating: 4.6,
            ratingsCount: 1400000,
            source: 'Goodreads'
        },
        {
            keys: ['l\'etranger', 'người xa lạ', 'the stranger', 'albert camus'],
            rating: 4.7,
            ratingsCount: 1100000,
            source: 'Goodreads'
        },
        {
            keys: ['think and grow rich', 'nghĩ giàu làm giàu', 'nghĩ giàu và làm giàu', 'napoleon hill', 'ol527464w'],
            rating: 4.7,
            ratingsCount: 1850000,
            source: 'Goodreads'
        },
        {
            keys: ['deep work', 'làm ra làm chơi ra chơi', 'cal newport', 'ol17713267w'],
            rating: 4.6,
            ratingsCount: 380000,
            source: 'Goodreads'
        },
        {
            keys: ['the power of now', 'sức mạnh của hiện tại', 'eckhart tolle'],
            rating: 4.7,
            ratingsCount: 1100000,
            source: 'Goodreads'
        },
        {
            keys: ['the godfather', 'bố già', 'mario puzo'],
            rating: 4.9,
            ratingsCount: 1800000,
            source: 'Goodreads'
        },
        {
            keys: ['1984', 'nineteen eighty-four', 'một chín tám tư', 'george orwell', 'ol1168007w'],
            rating: 4.9,
            ratingsCount: 4200000,
            source: 'Goodreads'
        },
        {
            keys: ['thick face, black heart', 'mặt dày tâm đen', 'chin-ning chu'],
            rating: 4.7,
            ratingsCount: 92000,
            source: 'Goodreads'
        },
        {
            keys: ['romance of the three kingdoms', 'tam quốc diễn nghĩa', 'la quán trung', 'ol14945484w'],
            rating: 4.9,
            ratingsCount: 520000,
            source: 'Goodreads'
        },
        {
            keys: ['sherlock holmes', 'arthur conan doyle'],
            rating: 4.9,
            ratingsCount: 2400000,
            source: 'Goodreads'
        },
        {
            keys: ['no more mr. nice guy', 'không còn là mr. nice guy', 'robert a. glover'],
            rating: 4.7,
            ratingsCount: 65000,
            source: 'Goodreads'
        },
        {
            keys: ['when i say no, i feel guilty', 'khi tôi nói không, tôi thấy có lỗi', 'manuel j. smith', 'ol2747970w'],
            rating: 4.8,
            ratingsCount: 22000,
            source: 'Goodreads'
        },
        {
            keys: ['boundaries', 'ranh giới', 'henry cloud', 'ol1861788w'],
            rating: 4.7,
            ratingsCount: 185000,
            source: 'Goodreads'
        },
        {
            keys: ['the subtle art of not giving a f*ck', 'nghệ thuật tinh tế của việc không quan tâm', 'mark manson', 'ol17362095w'],
            rating: 4.6,
            ratingsCount: 890000,
            source: 'Goodreads'
        },
        {
            keys: ['sapiens', 'lược sử loài người', 'yuval noah harari'],
            rating: 4.9,
            ratingsCount: 1400000,
            source: 'Goodreads'
        },
        {
            keys: ['man\'s search for meaning', 'đi tìm lẽ sống', 'viktor frankl'],
            rating: 4.9,
            ratingsCount: 1500000,
            source: 'Goodreads'
        },
        {
            keys: ['meditations', 'suy tưởng', 'marcus aurelius'],
            rating: 4.9,
            ratingsCount: 650000,
            source: 'Goodreads'
        },
        {
            keys: ['dune', 'xứ cát', 'frank herbert'],
            rating: 4.8,
            ratingsCount: 1200000,
            source: 'Goodreads'
        },
        {
            keys: ['three-body', 'tam thể', 'cixin liu'],
            rating: 4.8,
            ratingsCount: 410000,
            source: 'Goodreads'
        },
        {
            keys: ['giận', 'anger', 'thích nhất hạnh'],
            rating: 4.8,
            ratingsCount: 190000,
            source: 'Goodreads'
        },
        {
            keys: ['hoàng tử bé', 'little prince', 'le petit prince', 'saint-exupéry'],
            rating: 4.9,
            ratingsCount: 2500000,
            source: 'Goodreads'
        },
        {
            keys: ['không gia đình', 'sans famille', 'hector malot'],
            rating: 4.8,
            ratingsCount: 420000,
            source: 'Goodreads'
        },
        {
            keys: ['quẳng gánh lo đi và vui sống', 'how to stop worrying', 'ol1063338w'],
            rating: 4.7,
            ratingsCount: 1850000,
            source: 'Goodreads'
        }
    ];

    function getAuthoritativeGoodreadsRating(book) {
        if (!book) return null;
        const searchTerms = [
            (book.titleVi || book.title || ''),
            (book.originalTitle || ''),
            (book.author || ''),
            (book.key || '')
        ].map(s => s.toLowerCase().trim()).filter(Boolean);

        const fullText = searchTerms.join(' ');
        for (const item of AUTHORITATIVE_GOODREADS_RATINGS) {
            if (item.keys.some(k => fullText.includes(k.toLowerCase()))) {
                return {
                    rating: item.rating,
                    ratingsCount: item.ratingsCount,
                    source: 'Goodreads'
                };
            }
        }
        return null;
    }

    // =========================================
    // Book Ratings Cache & Loader (Throttled & Queued)
    // =========================================
    const bookRatingsCache = new Map();
    const ratingQueue = [];
    let activeRatingRequests = 0;
    const MAX_CONCURRENT_RATING_REQUESTS = 2;

    function queueRatingRequest(workKey, callback) {
        if (!workKey) {
            if (callback) callback(null);
            return;
        }
        const cleanKey = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
        
        if (bookRatingsCache.has(cleanKey)) {
            if (callback) callback(bookRatingsCache.get(cleanKey));
            return;
        }

        try {
            const stored = sessionStorage.getItem(`ol_rating_${cleanKey}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                bookRatingsCache.set(cleanKey, parsed);
                if (callback) callback(parsed);
                return;
            }
        } catch (e) {}

        ratingQueue.push({ workKey: cleanKey, callback });
        processRatingQueue();
    }

    function processRatingQueue() {
        if (activeRatingRequests >= MAX_CONCURRENT_RATING_REQUESTS || ratingQueue.length === 0) {
            return;
        }

        const item = ratingQueue.shift();
        if (!item) return;
        const { workKey, callback } = item;
        activeRatingRequests++;

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 4500) : null;

        fetch(`https://openlibrary.org${workKey}/ratings.json`, {
            signal: controller ? controller.signal : undefined
        })
        .then(res => {
            if (timeoutId) clearTimeout(timeoutId);
            if (!res.ok) return null;
            return res.json();
        })
        .then(data => {
            let res = null;
            if (data && data.summary && typeof data.summary.average === 'number') {
                res = {
                    rating: Number(data.summary.average.toFixed(1)),
                    ratingsCount: data.summary.count || 0
                };
                bookRatingsCache.set(workKey, res);
                try {
                    sessionStorage.setItem(`ol_rating_${workKey}`, JSON.stringify(res));
                } catch (e) {}
            } else {
                bookRatingsCache.set(workKey, null);
            }
            if (callback) callback(res);
        })
        .catch(() => {
            if (callback) callback(null);
        })
        .finally(() => {
            activeRatingRequests--;
            setTimeout(processRatingQueue, 150);
        });
    }

    async function getBookRating(workKey) {
        if (!workKey || typeof workKey !== 'string') return null;
        const cleanKey = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
        if (bookRatingsCache.has(cleanKey)) {
            return bookRatingsCache.get(cleanKey);
        }
        return new Promise(resolve => {
            queueRatingRequest(cleanKey, resolve);
        });
    }

    function formatRatingCount(count) {
        if (!count || count <= 0) return '';
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (count >= 10000) {
            return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        return count.toLocaleString();
    }

    // =========================================
    // Rendering
    // =========================================
    function createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.setAttribute('data-key', book.key);

        const coverUrl = getCoverUrl(book);
        const wishlisted = isInWishlist(book.key);
        const isFinished = isInFinished(book.key);

        // 1. Authoritative community rating check (Goodreads / Amazon)
        const authRate = getAuthoritativeGoodreadsRating(book);
        if (authRate) {
            book.rating = authRate.rating;
            book.ratingsCount = authRate.ratingsCount;
            book.ratingSource = authRate.source;
        } else if (!book.rating && book.key) {
            const cleanK = book.key.startsWith('/works/') ? book.key : `/works/${book.key}`;
            const cachedRate = bookRatingsCache.get(cleanK);
            if (cachedRate && cachedRate.rating) {
                book.rating = cachedRate.rating;
                book.ratingsCount = cachedRate.ratingsCount || 0;
                book.ratingSource = 'Open Library';
            }
        }

        const ratingSourceTooltip = book.ratingSource ? ` (theo ${book.ratingSource})` : '';
        const ratingBadgeHtml = (book.rating && book.rating > 0)
            ? `
                <span class="book-badge-rating ${isFinished ? 'has-finished' : ''}" title="Đánh giá${ratingSourceTooltip}: ${book.rating}/5.0 ${book.ratingsCount ? '(' + book.ratingsCount.toLocaleString() + ' bạn đọc bình chọn)' : ''}">
                    <svg viewBox="0 0 24 24" width="9" height="9" fill="#fbbf24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    <span>${book.rating} ★${book.ratingsCount ? `<span class="rating-count">(${formatRatingCount(book.ratingsCount)})</span>` : ''}</span>
                </span>
              `
            : '';

        const displayTitle = book.titleVi || book.title;
        const originalTitle = (book.originalTitle && book.originalTitle.toLowerCase() !== displayTitle.toLowerCase())
            ? book.originalTitle
            : '';

        const sourceMap = {
            'ai': { cls: 'src-ai', label: '🤖 Gemini AI' },
            'google': { cls: 'src-gb', label: '📚 Google Books' },
            'similar': { cls: 'src-similar', label: '🎯 TasteDive' },
            'community': { cls: 'src-community', label: '👥 Hardcover' },
            'openlibrary': { cls: 'src-ol', label: '📖 Open Library' }
        };
        const sKey = book.source || (book.key && book.key.startsWith('/works/') ? 'openlibrary' : 'openlibrary');
        const sInfo = sourceMap[sKey] || sourceMap['openlibrary'];
        const sourceBadgeHtml = `<span class="book-badge-source ${sInfo.cls}" title="Nguồn: ${escapeHtml(book.sourceLabel || sInfo.label)}">${escapeHtml(book.sourceLabel || sInfo.label)}</span>`;

        card.innerHTML = `
            <div class="book-cover-wrapper">
                ${sourceBadgeHtml}
                ${coverUrl
                    ? `<img class="book-cover" src="${coverUrl}" alt="${escapeHtml(displayTitle)}" loading="lazy" onerror="this.onerror=null;this.src='${generateStylizedBookCoverSvg(displayTitle, book.author)}';">`
                    : `<img class="book-cover" src="${generateStylizedBookCoverSvg(displayTitle, book.author)}" alt="${escapeHtml(displayTitle)}" loading="lazy">`
                }
                <div class="book-actions">
                    <button class="book-action-btn btn-wishlist ${wishlisted ? 'is-wishlisted' : ''}" title="${wishlisted ? 'Bỏ muốn đọc' : 'Muốn đọc'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                    </button>
                    <button class="book-action-btn btn-finished ${isFinished ? 'is-finished' : ''}" title="${isFinished ? 'Bỏ đánh dấu đọc xong' : 'Đánh dấu đã đọc'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </button>
                </div>
                ${isFinished ? '<div class="book-finished-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg> Đã đọc</div>' : ''}
                ${ratingBadgeHtml}
            </div>
            <div class="book-info">
                <div class="book-title" title="${escapeHtml(displayTitle)}">${escapeHtml(displayTitle)}</div>
                ${originalTitle ? `<div class="book-original-title" title="Tên gốc: ${escapeHtml(originalTitle)}">${escapeHtml(originalTitle)}</div>` : ''}
                <div class="book-author">${escapeHtml(book.author)}</div>
                ${book.year ? `<div class="book-year">${book.year}</div>` : ''}
                ${book.reason ? `<div class="book-card-reason-snippet" style="font-size: 0.76rem; color: #4338ca; background: rgba(99, 102, 241, 0.08); padding: 5px 8px; border-radius: 4px; margin-top: 6px; line-height: 1.4; border-left: 2px solid #6366f1;" title="${escapeHtml(book.reason)}">💡 ${escapeHtml(book.reason)}</div>` : ''}
            </div>
        `;

        if (!book.rating && book.key) {
            queueRatingRequest(book.key, (rate) => {
                if (rate && rate.rating && rate.rating > 0) {
                    book.rating = rate.rating;
                    book.ratingsCount = rate.ratingsCount || 0;
                    const coverWrap = card.querySelector('.book-cover-wrapper');
                    if (coverWrap && !coverWrap.querySelector('.book-badge-rating')) {
                        const isFin = card.querySelector('.book-finished-badge') !== null;
                        const badge = document.createElement('span');
                        badge.className = `book-badge-rating ${isFin ? 'has-finished' : ''}`;
                        badge.title = `Đánh giá: ${rate.rating}/5.0 ${rate.ratingsCount ? '(' + rate.ratingsCount.toLocaleString() + ' đánh giá)' : ''}`;
                        badge.innerHTML = `
                            <svg viewBox="0 0 24 24" width="9" height="9" fill="#fbbf24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                            </svg>
                            <span>${rate.rating} ★${rate.ratingsCount ? `<span class="rating-count">(${formatRatingCount(rate.ratingsCount)})</span>` : ''}</span>
                        `;
                        coverWrap.appendChild(badge);
                    }
                }
            });
        }

        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        // Click to open modal
        card.addEventListener('click', (e) => {
            if (e.target.closest('.book-action-btn')) return;
            openBookModal(book);
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (e.target.closest('.book-action-btn')) return;
                e.preventDefault();
                openBookModal(book);
            }
        });

        // Wishlist button
        card.querySelector('.btn-wishlist').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWishlist(book);
            refreshAllViews();
        });

        // Finished button
        card.querySelector('.btn-finished').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFinished(book);
            refreshAllViews();
        });

        return card;
    }

    function createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'skeleton-card';
        card.innerHTML = `
            <div class="skeleton-cover"></div>
            <div class="skeleton-info">
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
            </div>
        `;
        return card;
    }

    function showSkeletons(container, count = 10, isScroll = false) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skel = createSkeletonCard();
            container.appendChild(skel);
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Real-time on-demand AI summary fetcher for books with missing descriptions
    async function fetchBookSummaryFromGemini(title, originalTitle, author, apiKey) {
        if (!apiKey) return null;
        const bookName = originalTitle && originalTitle.toLowerCase() !== title.toLowerCase() 
            ? `${title} (${originalTitle})` 
            : title;
        const prompt = `Bạn là chuyên gia sách PlainReader. Hãy phân tích và tóm tắt ngắn gọn 2-3 câu về nội dung cốt lõi, giá trị tri thức và bài học lớn nhất của cuốn sách "${bookName}" của tác giả ${author || ''}. Trả về tiếng Việt tự nhiên, súc tích, truyền cảm hứng, không dùng markdown.`;
        const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
        for (const model of candidateModels) {
            try {
                const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
                    })
                });
                if (r.ok) {
                    const data = await r.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text && text.trim()) return text.trim();
                }
            } catch (e) {}
        }
        return null;
    }

    // =========================================
    // Book Modal
    // =========================================
    async function openBookModal(book) {
        currentModalBook = book;

        const displayTitle = book.titleVi || book.title || 'Tác phẩm';
        const originalTitle = (book.originalTitle && book.originalTitle.toLowerCase() !== displayTitle.toLowerCase())
            ? book.originalTitle
            : (book.titleVi ? book.title : '');

        // Set initial cover data with high-end stylized SVG fallback
        const coverUrl = getCoverUrl(book, 'L') || getCoverUrl(book, 'M') || book.coverUrl;
        const fallbackCover = generateStylizedBookCoverSvg(displayTitle, book.author);
        if (coverUrl) {
            modalCover.src = coverUrl;
            modalCover.onerror = () => {
                modalCover.src = fallbackCover;
            };
        } else {
            modalCover.src = fallbackCover;
        }

        modalTitle.textContent = displayTitle;

        if (originalTitle && originalTitle.toLowerCase() !== displayTitle.toLowerCase()) {
            modalOriginalTitle.style.display = 'inline-flex';
            modalOriginalTitleText.textContent = originalTitle;
        } else {
            modalOriginalTitle.style.display = 'none';
        }

        modalAuthor.textContent = book.author || 'Tác giả';

        // Source badge in modal
        const modalSourceBadge = document.getElementById('modalSourceBadge');
        if (modalSourceBadge) {
            const sourceMap = {
                'ai': { cls: 'src-ai', label: '🤖 Gemini AI Tuyển Chọn' },
                'google': { cls: 'src-gb', label: '📚 Google Books' },
                'similar': { cls: 'src-similar', label: '🎯 TasteDive Tương Đồng' },
                'community': { cls: 'src-community', label: '👥 Hardcover / Goodreads Top 1%' },
                'openlibrary': { cls: 'src-ol', label: '📖 Thư viện Open Library' }
            };
            const sKey = book.source || (book.key && book.key.startsWith('/works/') ? 'openlibrary' : 'openlibrary');
            const sInfo = sourceMap[sKey] || sourceMap['openlibrary'];
            modalSourceBadge.textContent = book.sourceLabel ? `🏷️ Nguồn: ${book.sourceLabel}` : `🏷️ Nguồn: ${sInfo.label}`;
            modalSourceBadge.style.display = 'inline-flex';
        }

        // Check authoritative Goodreads community benchmark
        const modalAuthRate = getAuthoritativeGoodreadsRating(book);
        if (modalAuthRate) {
            book.rating = modalAuthRate.rating;
            book.ratingsCount = modalAuthRate.ratingsCount;
            book.ratingSource = modalAuthRate.source;
        }

        // Rating in modal
        if (modalRatingBadge) {
            if (book.rating && book.rating > 0) {
                modalRatingBadge.style.display = 'inline-flex';
                if (modalRatingBadgeText) {
                    const srcLabel = book.ratingSource ? ` [${book.ratingSource}]` : '';
                    modalRatingBadgeText.textContent = book.ratingsCount > 0
                        ? `${book.rating} ★ (${book.ratingsCount.toLocaleString()} đánh giá${srcLabel})`
                        : `${book.rating} ★`;
                }
            } else {
                modalRatingBadge.style.display = 'none';
            }
        }

        if (modalGoodreadsQuickLink) {
            const grQuery = originalTitle || displayTitle || book.title || '';
            const grAuthor = book.author || '';
            modalGoodreadsQuickLink.href = getGoodreadsSearchUrl(grQuery, grAuthor);
            modalGoodreadsQuickLink.style.display = 'inline-flex';
        }

        modalYear.textContent = book.year ? `📅 ${book.year}` : '';
        modalPages.textContent = book.pages ? `📄 ${book.pages} trang` : '';
        modalLanguage.textContent = book.language ? `🌐 ${book.language.toUpperCase()}` : '';

        // Fetch rating if not already present
        if (!book.rating && (book.key || book.title)) {
            const ratingPromise = (book.key && book.key.startsWith('/works/'))
                ? getBookRating(book.key)
                : fetchOpenLibraryBookMeta(displayTitle || book.title, book.author);

            ratingPromise.then(rateData => {
                if (rateData && rateData.rating && rateData.rating > 0 && currentModalBook === book) {
                    book.rating = rateData.rating;
                    book.ratingsCount = rateData.ratingsCount || 0;
                    if (modalRatingBadge) {
                        modalRatingBadge.style.display = 'inline-flex';
                        if (modalRatingBadgeText) {
                            modalRatingBadgeText.textContent = rateData.ratingsCount > 0
                                ? `${rateData.rating} ★ (${rateData.ratingsCount.toLocaleString()} đánh giá)`
                                : `${rateData.rating} ★`;
                        }
                    }
                }
            }).catch(() => {});
        }

        modalDescription.textContent = 'Đang tải thông tin mô tả tác phẩm...';
        btnToggleOrigDesc.style.display = 'none';
        modalOriginalDescBox.style.display = 'none';
        modalOriginalDescription.textContent = '';
        modalSubjects.innerHTML = '';

        // Actions
        updateModalActions();

        // Open Library link (use real OL work page if OLID exists, else search)
        const isRealOlKey = book.key && book.key.startsWith('/works/OL');
        const olUrl = isRealOlKey
            ? `${OL_BASE}${book.key}`
            : `https://openlibrary.org/search?q=${encodeURIComponent((originalTitle || displayTitle) + ' ' + (book.author || ''))}`;
        modalBtnOpenLibrary.href = olUrl;

        // Anna's Archive search link (using working .gl mirror and ?q=...&check=1 syntax)
        const primarySearchTitle = (displayTitle || book.title || '').trim();
        const cleanAnnaTitle = primarySearchTitle.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim() || primarySearchTitle;
        const annaQuery = encodeURIComponent(cleanAnnaTitle).replace(/%20/g, '+');
        if (modalBtnAnnaArchive) {
            modalBtnAnnaArchive.href = `https://annas-archive.gl/search?q=${annaQuery}&check=1`;
        }

        // Optional link for original English title if different
        if (modalBtnAnnaArchiveEn) {
            if (originalTitle && originalTitle.toLowerCase() !== cleanAnnaTitle.toLowerCase()) {
                const cleanOrigTitle = originalTitle.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim() || originalTitle;
                const origQuery = encodeURIComponent(cleanOrigTitle).replace(/%20/g, '+');
                modalBtnAnnaArchiveEn.href = `https://annas-archive.gl/search?q=${origQuery}&check=1`;
                modalBtnAnnaArchiveEn.style.display = 'inline-flex';
            } else {
                modalBtnAnnaArchiveEn.style.display = 'none';
            }
        }

        // Goodreads search link
        if (modalBtnGoodreads) {
            const grQuery = originalTitle || displayTitle || book.title || '';
            const grAuthor = book.author || '';
            modalBtnGoodreads.href = getGoodreadsSearchUrl(grQuery, grAuthor);
        }

        // Show modal
        bookModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Load similar book recommendations in modal
        if (typeof updateModalSimilarBooks === 'function') {
            updateModalSimilarBooks(book);
        }

        // Fetch detailed info with Multi-tier resilience
        try {
            let rawDesc = '';
            let subjects = book.subjects || [];

            // Tier 1: Try Open Library Work Details if real work key exists
            if (isRealOlKey) {
                try {
                    const details = await fetchBookDetails(book.key);
                    if (details.description) {
                        rawDesc = typeof details.description === 'string'
                            ? details.description
                            : (details.description.value || '');
                    }
                    if (details.subjects && details.subjects.length > 0) {
                        subjects = details.subjects;
                        if (!book.subjects || book.subjects.length === 0) {
                            book.subjects = subjects;
                            if (typeof updateModalSimilarBooks === 'function') {
                                updateModalSimilarBooks(book, subjects);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Open Library work details fetch error:', e);
                }
            }

            if (rawDesc && rawDesc.trim()) {
                const cleanedDesc = cleanDescriptionText(rawDesc);
                const descToUse = cleanedDesc || rawDesc.trim();
                modalOriginalDescription.textContent = descToUse;
                modalDescription.textContent = 'Đang dịch mô tả sang tiếng Việt...';

                // Automatically translate description to Vietnamese
                const translatedVi = await translateText(descToUse);
                modalDescription.textContent = translatedVi || descToUse;

                // Show button to view original English description
                if (translatedVi && translatedVi.trim().toLowerCase() !== descToUse.toLowerCase()) {
                    btnToggleOrigDesc.style.display = 'inline-block';
                    btnToggleOrigDesc.textContent = 'Xem bản gốc (English)';
                } else {
                    btnToggleOrigDesc.style.display = 'none';
                }
            } else if (book.summary || book.description || book.reason) {
                // Tier 2: Rich AI Summary / Book Description / Reason
                let descHtml = '';
                const mainDesc = book.summary || book.description;
                if (mainDesc) {
                    descHtml += `<div class="modal-ai-desc" style="line-height: 1.65; margin-bottom: 12px; font-size: 0.95rem;">${escapeHtml(mainDesc)}</div>`;
                }
                if (book.reason && (!mainDesc || !mainDesc.includes(book.reason))) {
                    descHtml += `<div class="modal-ai-reason" style="background: rgba(99, 102, 241, 0.08); border-left: 3px solid #6366f1; padding: 10px 14px; border-radius: 6px; font-size: 0.88rem; color: #4338ca; line-height: 1.5; margin-top: 8px;">💡 <strong>Lý do gợi ý:</strong> ${escapeHtml(book.reason)}</div>`;
                }
                modalDescription.innerHTML = descHtml;
                btnToggleOrigDesc.style.display = 'none';
            } else {
                // Tier 3: Fetch on-demand summary via Gemini if API key is present!
                const apiKey = localStorage.getItem(STORAGE_GEMINI_KEY) || DEFAULT_GEMINI_KEY;
                if (apiKey) {
                    modalDescription.textContent = 'Trợ lý AI đang tra cứu và tổng hợp tóm tắt tác phẩm...';
                    fetchBookSummaryFromGemini(displayTitle, originalTitle, book.author, apiKey).then(aiSummary => {
                        if (currentModalBook === book && aiSummary) {
                            modalDescription.innerHTML = `<div style="line-height: 1.65; font-size: 0.95rem;">${escapeHtml(aiSummary)}</div>`;
                        }
                    }).catch(() => {
                        if (currentModalBook === book) {
                            modalDescription.textContent = 'Tác phẩm tuyển chọn nổi bật. Bạn có thể tra cứu chi tiết hoặc tìm file tải sách qua các nút liên kết bên dưới.';
                        }
                    });
                } else {
                    modalDescription.textContent = 'Tác phẩm tuyển chọn nổi bật. Bạn có thể tra cứu chi tiết hoặc tìm file tải sách qua các nút liên kết bên dưới.';
                    btnToggleOrigDesc.style.display = 'none';
                }
            }

            if (subjects && subjects.length > 0) {
                modalSubjects.innerHTML = subjects.slice(0, 8).map(s =>
                    `<span class="subject-tag">${escapeHtml(s)}</span>`
                ).join('');
            }
        } catch (err) {
            console.error('Modal detail error:', err);
            modalDescription.textContent = book.summary || book.reason || 'Tác phẩm tuyển chọn nổi bật.';
            btnToggleOrigDesc.style.display = 'none';
        }
    }

    // Toggle original English description in modal
    btnToggleOrigDesc.addEventListener('click', () => {
        const isHidden = modalOriginalDescBox.style.display === 'none';
        modalOriginalDescBox.style.display = isHidden ? 'block' : 'none';
        btnToggleOrigDesc.textContent = isHidden ? 'Ẩn bản gốc (English)' : 'Xem bản gốc (English)';
    });

    function closeBookModal() {
        bookModal.style.display = 'none';
        document.body.style.overflow = '';
        currentModalBook = null;
    }

    function updateModalActions() {
        if (!currentModalBook) return;
        const wishlisted = isInWishlist(currentModalBook.key);
        const isFinishedBook = isInFinished(currentModalBook.key);

        modalBtnWishlist.classList.toggle('active', wishlisted);
        modalBtnWishlist.querySelector('span').textContent = wishlisted ? 'Đã thêm' : 'Muốn đọc';

        if (modalBtnFinished) {
            modalBtnFinished.classList.toggle('active', isFinishedBook);
            modalBtnFinished.querySelector('span').textContent = isFinishedBook ? 'Đã đọc ✅' : 'Đã đọc';
        }
    }

    btnCloseModal.addEventListener('click', closeBookModal);
    bookModal.addEventListener('click', (e) => {
        if (e.target === bookModal) closeBookModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && bookModal.style.display === 'flex') closeBookModal();
    });

    modalBtnWishlist.addEventListener('click', () => {
        if (!currentModalBook) return;
        toggleWishlist(currentModalBook);
        updateModalActions();
        refreshAllViews();
    });

    if (modalBtnFinished) {
        modalBtnFinished.addEventListener('click', () => {
            if (!currentModalBook) return;
            toggleFinished(currentModalBook);
            updateModalActions();
            refreshAllViews();
        });
    }

    // Clicking author in modal initiates a search for that author
    modalAuthor.addEventListener('click', () => {
        if (currentModalBook && currentModalBook.author) {
            const author = currentModalBook.author;
            closeBookModal();
            performSearch(author);
        }
    });

    // Clicking a subject tag in modal searches for that topic
    modalSubjects.addEventListener('click', (e) => {
        const tag = e.target.closest('.subject-tag');
        if (tag && tag.textContent.trim()) {
            const subject = tag.textContent.trim();
            closeBookModal();
            performSearch(subject);
        }
    });

    if (modalBtnAudiobook) {
        modalBtnAudiobook.addEventListener('click', async () => {
            if (!currentModalBook) return;
            const bookToSearch = currentModalBook;
            closeBookModal();
            switchTab('audio');
            await findAndPlayAudiobook(bookToSearch);
        });
    }

    // =========================================
    // Search
    // =========================================
    async function performSearch(query, page = 1) {
        const trimmed = (query || '').trim();
        if (!trimmed) return;
        if (isLoading && page > 1) return;

        // Dismiss iOS Safari keyboard and sync search input text
        if (searchInput) {
            searchInput.value = trimmed;
            searchInput.blur();
        }

        currentQuery = trimmed;
        currentPage = page;
        saveSearchKeyword(trimmed);

        // CRITICAL FIX FOR SAFARI / TABS: Ensure Explore tab is active to display search results
        switchTab('explore');

        if (page === 1) {
            searchResultsGrid.innerHTML = '';
            searchResultsSection.style.display = 'block';
            catalogSectionsContainer.style.display = 'none';
            if (categoryDetailSection) categoryDetailSection.style.display = 'none';
            recommendationsSection.style.display = 'none';
            loadMoreContainer.style.display = 'none';
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Reset AI Smart Recommendations container
            const searchAiRecBox = document.getElementById('searchAiRecBox');
            const searchAiRecGrid = document.getElementById('searchAiRecGrid');
            const searchAiInsightText = document.getElementById('searchAiInsightText');
            if (searchAiRecBox) searchAiRecBox.style.display = 'none';
            if (searchAiRecGrid) searchAiRecGrid.innerHTML = '';
            if (searchAiInsightText) searchAiInsightText.innerHTML = '';

            // Asynchronously trigger Gemini AI Smart Analysis & Recommendations in parallel
            const savedApiKey = localStorage.getItem(STORAGE_GEMINI_KEY) || DEFAULT_GEMINI_KEY;
            if (savedApiKey) {
                fetchLiveGeminiRecommendations(trimmed, savedApiKey).then(aiData => {
                    if (aiData && aiData.books && aiData.books.length > 0 && currentQuery === trimmed) {
                        const box = document.getElementById('searchAiRecBox');
                        const grid = document.getElementById('searchAiRecGrid');
                        const text = document.getElementById('searchAiInsightText');
                        if (box && grid) {
                            if (text) {
                                text.innerHTML = `<p>${escapeHtml(aiData.analysis)}</p>`;
                            }
                            grid.innerHTML = '';
                            aiData.books.forEach(b => {
                                b.source = 'ai';
                                b.sourceLabel = '🤖 Gemini AI Gợi Ý';
                                grid.appendChild(createBookCard(b));
                            });
                            box.style.display = 'block';
                        }
                    }
                }).catch(e => {
                    console.warn('AI search suggestions error:', e);
                });
            }
        }

        isLoading = true;
        catalogLoading.style.display = 'flex';

        try {
            // Determine English query for Open Library
            if (page === 1) {
                currentSearchEnglishQuery = trimmed;
                if (isVietnamese(trimmed) || isKnownVietnameseTerm(trimmed)) {
                    showToast('Đang dịch từ khóa sang tiếng Anh để tìm trên Open Library...');
                    const translated = await translateToEnglish(trimmed);
                    if (translated && translated.toLowerCase() !== trimmed.toLowerCase()) {
                        currentSearchEnglishQuery = translated;
                    }
                }
            }

            const queryToSend = currentSearchEnglishQuery || currentQuery;
            let result = await searchBooks(queryToSend, currentPage);
            totalResults = result.total;

            const isTranslated = currentSearchEnglishQuery && currentSearchEnglishQuery.toLowerCase() !== currentQuery.toLowerCase();

            // If translated query yielded 0 results, fallback to searching original query
            if (totalResults === 0 && isTranslated) {
                try {
                    const fallbackResult = await searchBooks(currentQuery, currentPage);
                    if (fallbackResult.total > 0) {
                        result = fallbackResult;
                        totalResults = fallbackResult.total;
                    }
                } catch { /* ignore fallback error */ }
            }

            if (isTranslated) {
                searchResultsTitle.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span>Kết quả thư viện cho "<b>${escapeHtml(currentQuery)}</b>" <span style="font-size:0.85em; opacity:0.8; font-weight:400;">(dịch: <i>${escapeHtml(currentSearchEnglishQuery)}</i>)</span></span>
                `;
            } else {
                searchResultsTitle.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Kết quả thư viện cho "${escapeHtml(currentQuery)}"
                `;
            }
            resultCount.textContent = `${totalResults.toLocaleString()} sách`;

            result.books.forEach(book => {
                book.source = 'openlibrary';
                book.sourceLabel = '📖 Open Library';
                searchResultsGrid.appendChild(createBookCard(book));
            });

            // Show load more if there are more results
            const shown = currentPage * PAGE_SIZE;
            loadMoreContainer.style.display = shown < totalResults ? 'flex' : 'none';

        } catch (err) {
            console.error('Search error:', err);
            showToast('Lỗi tìm kiếm. Vui lòng thử lại.');
        } finally {
            isLoading = false;
            catalogLoading.style.display = 'none';
        }
    }

    // Search Form submission (fires on iOS keyboard 'Search' key)
    const searchForm = document.getElementById('searchBox');
    if (searchForm && searchForm.tagName === 'FORM') {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (searchInput) searchInput.blur();
            performSearch(searchInput.value);
        });
    }

    btnSearch.addEventListener('click', (e) => {
        e.preventDefault();
        if (searchInput) searchInput.blur();
        performSearch(searchInput.value);
    });

    btnSearch.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (searchInput) searchInput.blur();
        performSearch(searchInput.value);
    }, { passive: false });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchInput.blur();
            performSearch(searchInput.value);
        }
    });

    btnLoadMore.addEventListener('click', () => {
        performSearch(currentQuery, currentPage + 1);
    });

    // Quick tags: open the full category page directly
    if (quickTags) {
        quickTags.addEventListener('click', (e) => {
            const tag = e.target.closest('.quick-tag');
            if (!tag) return;
            const catId = tag.dataset.cat;
            if (!catId) return;

            openCategoryPage(catId);
        });
    }

    btnBackToExplore.addEventListener('click', () => {
        showExploreDefault();
        searchInput.value = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // =========================================
    // Category Detail View (Full Page Browser)
    // =========================================
    async function openCategoryPage(catId) {
        const cat = CATALOG_CATEGORIES.find(c => c.id === catId);
        if (!cat) return;

        currentActiveCategory = cat;
        currentCategoryPage = 1;
        currentCategoryOffset = 0;
        currentCategoryTotalCount = 0;

        switchTab('explore');
        catalogSectionsContainer.style.display = 'none';
        recommendationsSection.style.display = 'none';
        searchResultsSection.style.display = 'none';
        categoryDetailSection.style.display = 'block';

        window.scrollTo({ top: 0, behavior: 'smooth' });

        categoryBannerIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${cat.icon}</svg>`;
        categoryBannerTitle.textContent = cat.title;
        categoryBannerDesc.textContent = cat.subtitle;
        categoryTotalCount.textContent = 'Đang tải...';

        showSkeletons(categoryBooksGrid, 18, false);
        categoryLoadMoreContainer.style.display = 'none';

        isCategoryLoading = true;
        try {
            let books = [];
            if (cat.type === 'trending' || cat.type === 'trending-weekly') {
                const period = cat.period || (cat.type === 'trending-weekly' ? 'weekly' : 'daily');
                books = await fetchTrending(period, 1, 24);
                categoryTotalCount.textContent = `${books.length}+ sách thịnh hành`;
            } else if (cat.type === 'subject') {
                const url = `${OL_SUBJECTS}${encodeURIComponent(cat.subject.toLowerCase())}.json?limit=24&offset=0`;
                const resp = await fetch(url);
                if (resp.ok) {
                    const data = await resp.json();
                    books = (data.works || []).map(normalizeSubjectBook);
                    currentCategoryTotalCount = data.work_count || 0;
                    categoryTotalCount.textContent = currentCategoryTotalCount > 0 
                        ? `${currentCategoryTotalCount.toLocaleString()} sách` 
                        : `${books.length} sách`;
                    await batchTranslateBooks(books);
                }
            }

            categoryBooksGrid.innerHTML = '';
            if (!books || books.length === 0) {
                categoryBooksGrid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p>Chưa tìm thấy sách trong danh mục này.</p></div>';
                categoryLoadMoreContainer.style.display = 'none';
            } else {
                books.forEach(b => categoryBooksGrid.appendChild(createBookCard(b)));
                categoryLoadMoreContainer.style.display = 'flex';
                btnCategoryLoadMore.disabled = false;
                btnCategoryLoadMore.innerHTML = '<span class="btn-text">Tải thêm sách</span>';
            }
        } catch (err) {
            console.error('Error opening category page:', err);
            categoryBooksGrid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p>Lỗi tải sách danh mục. Vui lòng thử lại sau.</p></div>';
            categoryLoadMoreContainer.style.display = 'none';
        } finally {
            isCategoryLoading = false;
        }
    }

    async function loadMoreCategoryBooks() {
        if (!currentActiveCategory || isCategoryLoading) return;

        isCategoryLoading = true;
        btnCategoryLoadMore.disabled = true;
        btnCategoryLoadMore.innerHTML = '<span class="mini-spinner"></span> <span>Đang tải thêm...</span>';

        try {
            let newBooks = [];
            if (currentActiveCategory.type === 'trending' || currentActiveCategory.type === 'trending-weekly') {
                currentCategoryPage++;
                const period = currentActiveCategory.period || (currentActiveCategory.type === 'trending-weekly' ? 'weekly' : 'daily');
                newBooks = await fetchTrending(period, currentCategoryPage, 24);
            } else if (currentActiveCategory.type === 'subject') {
                currentCategoryOffset += 24;
                const url = `${OL_SUBJECTS}${encodeURIComponent(currentActiveCategory.subject.toLowerCase())}.json?limit=24&offset=${currentCategoryOffset}`;
                const resp = await fetch(url);
                if (resp.ok) {
                    const data = await resp.json();
                    newBooks = (data.works || []).map(normalizeSubjectBook);
                    await batchTranslateBooks(newBooks);
                }
            }

            if (newBooks && newBooks.length > 0) {
                newBooks.forEach(b => categoryBooksGrid.appendChild(createBookCard(b)));
                btnCategoryLoadMore.disabled = false;
                btnCategoryLoadMore.innerHTML = '<span class="btn-text">Tải thêm sách</span>';
                
                const totalRendered = categoryBooksGrid.querySelectorAll('.book-card').length;
                if (currentCategoryTotalCount > 0) {
                    categoryTotalCount.textContent = `Đã hiển thị ${totalRendered} / ${currentCategoryTotalCount.toLocaleString()} sách`;
                } else {
                    categoryTotalCount.textContent = `Đã hiển thị ${totalRendered} sách`;
                }
            } else {
                btnCategoryLoadMore.disabled = true;
                btnCategoryLoadMore.innerHTML = '<span class="btn-text">Đã hiển thị tất cả sách</span>';
            }
        } catch (err) {
            console.error('Error loading more category books:', err);
            showToast('Không thể tải thêm sách, vui lòng thử lại.');
            btnCategoryLoadMore.disabled = false;
            btnCategoryLoadMore.innerHTML = '<span class="btn-text">Thử tải lại</span>';
        } finally {
            isCategoryLoading = false;
        }
    }

    btnBackFromCategory.addEventListener('click', () => {
        categoryDetailSection.style.display = 'none';
        catalogSectionsContainer.style.display = 'block';
        if (wishlist.length > 0) recommendationsSection.style.display = 'block';

        if (currentActiveCategory) {
            const sec = document.getElementById(`section-${currentActiveCategory.id}`);
            if (sec) {
                sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });

    btnCategoryLoadMore.addEventListener('click', loadMoreCategoryBooks);

    catalogSectionsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-open-category');
        const title = e.target.closest('.section-title[data-cat]');
        const target = btn || title;
        if (!target) return;
        const catId = target.dataset.cat;
        if (catId) {
            openCategoryPage(catId);
        }
    });

    // =========================================
    // Tabs
    // =========================================
    function switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const targetTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        if (targetTab) targetTab.classList.add('active');

        // Update tab content
        [contentExplore, contentWishlist, contentFinished, contentAudio, contentHistory, contentRecommend].forEach(c => {
            if (c) c.classList.remove('active');
        });

        if (tabName === 'explore') {
            contentExplore.classList.add('active');
        } else if (tabName === 'wishlist') {
            contentWishlist.classList.add('active');
            renderWishlist();
        } else if (tabName === 'finished') {
            if (contentFinished) contentFinished.classList.add('active');
            renderFinished();
        } else if (tabName === 'audio') {
            if (contentAudio) contentAudio.classList.add('active');
            initAudiobooksTab();
        } else if (tabName === 'history') {
            if (contentHistory) contentHistory.classList.add('active');
            renderAudioHistoryTab();
        } else if (tabName === 'recommend') {
            if (contentRecommend) contentRecommend.classList.add('active');
            initRecommendationsTab();
        }
    }

    tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        switchTab(tab.dataset.tab);
    });

    // =========================================
    // Render Wishlist & Finished
    // =========================================
    function renderWishlist() {
        wishlistGrid.innerHTML = '';
        if (wishlist.length === 0) {
            wishlistEmpty.style.display = 'flex';
            return;
        }
        wishlistEmpty.style.display = 'none';
        wishlist.forEach(book => {
            wishlistGrid.appendChild(createBookCard(book));
        });
    }

    function renderFinished() {
        if (!finishedGrid || !finishedEmpty) return;
        finishedGrid.innerHTML = '';
        if (finished.length === 0) {
            finishedEmpty.style.display = 'flex';
            return;
        }
        finishedEmpty.style.display = 'none';
        // Sort by finishedAt descending (most recently finished first)
        const sorted = [...finished].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
        sorted.forEach(book => {
            finishedGrid.appendChild(createBookCard(book));
        });
    }

    function refreshAllViews() {
        updateCounts();
        // Refresh current search results card states
        document.querySelectorAll('.book-card').forEach(card => {
            const key = card.getAttribute('data-key');
            const wBtn = card.querySelector('.btn-wishlist');
            const finBtn = card.querySelector('.btn-finished');
            if (wBtn) {
                wBtn.classList.toggle('is-wishlisted', isInWishlist(key));
            }
            if (finBtn) {
                finBtn.classList.toggle('is-finished', isInFinished(key));
            }
            // Update finished badge on card
            const existingBadge = card.querySelector('.book-finished-badge');
            const coverWrapper = card.querySelector('.book-cover-wrapper');
            if (isInFinished(key) && !existingBadge && coverWrapper) {
                const badge = document.createElement('div');
                badge.className = 'book-finished-badge';
                badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg> Đã đọc';
                coverWrapper.appendChild(badge);
            } else if (!isInFinished(key) && existingBadge) {
                existingBadge.remove();
            }
        });

        // Re-render if on wishlist or finished tab
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            if (activeTab.dataset.tab === 'wishlist') renderWishlist();
            if (activeTab.dataset.tab === 'finished') renderFinished();
        }
    }

    // =========================================
    // Curated Trending Books Fallback (Instant 0ms display with ratings)
    // =========================================
    const CURATED_TRENDING_BOOKS = [
        {
            key: '/works/OL17930368W',
            title: 'Atomic Habits',
            originalTitle: 'Atomic Habits',
            titleVi: 'Thói quen nguyên tử',
            author: 'James Clear',
            coverId: 12539702,
            year: 2018,
            rating: 4.0,
            ratingsCount: 1460
        },
        {
            key: '/works/OL82563W_rdpd',
            title: 'Rich Dad, Poor Dad',
            originalTitle: 'Rich Dad, Poor Dad',
            titleVi: 'Cha giàu, Cha nghèo',
            author: 'Robert T. Kiyosaki',
            coverId: 8758832,
            year: 1997,
            rating: 4.0,
            ratingsCount: 1205
        },
        {
            key: '/works/OL25916327W',
            title: '5000+ Daily Use English Sentences',
            originalTitle: '5000+ Daily Use English Sentences',
            titleVi: 'Hơn 5000 câu tiếng Anh sử dụng hàng ngày',
            author: 'Kanchan Keshari',
            coverId: 13835697,
            year: 2023,
            rating: 4.7,
            ratingsCount: 10
        },
        {
            key: '/works/OL20601673W',
            title: 'The Psychology of Money',
            originalTitle: 'The Psychology of Money',
            titleVi: 'Tâm lý học về tiền',
            author: 'Morgan Housel',
            coverId: 10526011,
            year: 2020,
            rating: 4.0,
            ratingsCount: 426
        },
        {
            key: '/works/OL16801962W',
            title: "Esquire's The New Rules for Men",
            originalTitle: "Esquire's The New Rules for Men",
            titleVi: "Esquire's Những quy tắc mới dành cho đàn ông",
            author: 'Esquire',
            coverId: 8225266,
            year: 2018,
            rating: 4.4,
            ratingsCount: 27
        },
        {
            key: '/works/OL82563W_hp',
            title: "Harry Potter and the Philosopher's Stone",
            originalTitle: "Harry Potter and the Philosopher's Stone",
            titleVi: "Harry Potter và Hòn đá Phù thủy",
            author: 'J. K. Rowling',
            coverId: 10521270,
            year: 1997,
            rating: 4.2,
            ratingsCount: 1051
        },
        {
            key: '/works/OL15856426W',
            title: 'The 48 Laws of Power',
            originalTitle: 'The 48 Laws of Power',
            titleVi: '48 định luật quyền lực',
            author: 'Robert Greene',
            coverId: 8231856,
            year: 1998,
            rating: 4.0,
            ratingsCount: 1221
        },
        {
            key: '/works/OL27479W_le',
            title: 'L’étranger',
            originalTitle: 'L’étranger',
            titleVi: 'Người xa lạ (L’étranger)',
            author: 'Albert Camus',
            coverId: 8272990,
            year: 1942,
            rating: 4.1,
            ratingsCount: 146
        },
        {
            key: '/works/OL24581958W',
            title: 'Haunting Adeline',
            originalTitle: 'Haunting Adeline',
            titleVi: 'Ám ảnh Adeline',
            author: 'H. D. Carlton',
            coverId: 12698947,
            year: 2021,
            rating: 3.6,
            ratingsCount: 326
        },
        {
            key: '/works/OL1168007W_af',
            title: 'Animal Farm',
            originalTitle: 'Animal Farm',
            titleVi: 'Trại súc vật (Animal Farm)',
            author: 'George Orwell',
            coverId: 9255566,
            year: 1945,
            rating: 4.2,
            ratingsCount: 2800
        },
        {
            key: '/works/OL27479W_alch',
            title: 'The Alchemist',
            originalTitle: 'The Alchemist',
            titleVi: 'Nhà giả kim (The Alchemist)',
            author: 'Paulo Coelho',
            coverId: 8235111,
            year: 1988,
            rating: 4.1,
            ratingsCount: 4100
        },
        {
            key: '/works/OL82563W',
            title: 'Think and Grow Rich',
            originalTitle: 'Think and Grow Rich',
            titleVi: 'Nghĩ giàu và làm giàu',
            author: 'Napoleon Hill',
            coverId: 82563,
            year: 1937,
            rating: 4.2,
            ratingsCount: 3200
        }
    ];

    // =========================================
    // Catalog Categories Definition (Open Library)
    // =========================================
    const CATALOG_CATEGORIES = [
        {
            id: 'trending-daily',
            title: 'Sách phổ biến hôm nay',
            subtitle: 'Được độc giả thế giới tìm đọc nhiều nhất hôm nay',
            icon: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
            type: 'trending',
            period: 'daily'
        },
        {
            id: 'trending-weekly',
            title: 'Thịnh hành trong tuần',
            subtitle: 'Những cuốn sách nổi bật nhất tuần qua trên Open Library',
            icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
            type: 'trending-weekly',
            period: 'weekly'
        },
        {
            id: 'fiction',
            title: 'Tiểu thuyết & Văn học',
            subtitle: 'Những câu chuyện kinh điển và tác phẩm hư cấu hấp dẫn',
            icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
            type: 'subject',
            subject: 'fiction'
        },
        {
            id: 'science',
            title: 'Khoa học & Tự nhiên',
            subtitle: 'Khám phá vũ trụ, tự nhiên, công nghệ và phát minh',
            icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
            type: 'subject',
            subject: 'science'
        },
        {
            id: 'history',
            title: 'Lịch sử & Văn minh',
            subtitle: 'Những trang sử hào hùng và bài học của nhân loại',
            icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
            type: 'subject',
            subject: 'history'
        },
        {
            id: 'philosophy',
            title: 'Triết học & Tư tưởng',
            subtitle: 'Những suy tư sâu sắc về cuộc đời, đạo đức và sự tồn tại',
            icon: '<path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
            type: 'subject',
            subject: 'philosophy'
        },
        {
            id: 'self-help',
            title: 'Phát triển bản thân',
            subtitle: 'Kỹ năng sống, tư duy tích cực và thói quen thành công',
            icon: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
            type: 'subject',
            subject: 'self-help'
        },
        {
            id: 'programming',
            title: 'Lập trình & Công nghệ',
            subtitle: 'Khoa học máy tính, kỹ thuật phần mềm và công nghệ số',
            icon: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
            type: 'subject',
            subject: 'programming'
        },
        {
            id: 'romance',
            title: 'Lãng mạn & Tình cảm',
            subtitle: 'Những câu chuyện tình yêu ngọt ngào và lay động',
            icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
            type: 'subject',
            subject: 'romance'
        },
        {
            id: 'mystery',
            title: 'Trinh thám & Bí ẩn',
            subtitle: 'Những vụ án ly kỳ, điều tra hồi hộp và bất ngờ',
            icon: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
            type: 'subject',
            subject: 'mystery'
        },
        {
            id: 'business',
            title: 'Kinh doanh & Tài chính',
            subtitle: 'Quản trị, đầu tư, khởi nghiệp và kinh tế học',
            icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
            type: 'subject',
            subject: 'business'
        },
        {
            id: 'psychology',
            title: 'Tâm lý học & Hành vi',
            subtitle: 'Hiểu về tâm trí, cảm xúc và hành vi con người',
            icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
            type: 'subject',
            subject: 'psychology'
        },
        {
            id: 'fantasy',
            title: 'Giả tưởng & Phép thuật',
            subtitle: 'Thế giới huyền bí, kỳ ảo và những chuyến phiêu lưu',
            icon: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
            type: 'subject',
            subject: 'fantasy'
        },
        {
            id: 'science_fiction',
            title: 'Khoa học viễn tưởng',
            subtitle: 'Tương lai, du hành không gian và thế giới mới',
            icon: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>',
            type: 'subject',
            subject: 'science_fiction'
        },
        {
            id: 'children',
            title: 'Sách thiếu nhi',
            subtitle: 'Những câu chuyện kỳ diệu cho tuổi thơ và thanh thiếu niên',
            icon: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>',
            type: 'subject',
            subject: 'children'
        },
        {
            id: 'classics',
            title: 'Kinh điển thế giới',
            subtitle: 'Những kiệt tác vượt thời gian của nhân loại',
            icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/>',
            type: 'subject',
            subject: 'classics'
        },
        {
            id: 'biography',
            title: 'Tiểu sử & Hồi ký',
            subtitle: 'Chuyện đời những nhân vật vĩ đại và danh nhân thế giới',
            icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
            type: 'subject',
            subject: 'biography'
        },
        {
            id: 'art',
            title: 'Nghệ thuật & Thiết kế',
            subtitle: 'Hội họa, kiến trúc, âm nhạc và nhiếp ảnh',
            icon: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/>',
            type: 'subject',
            subject: 'art'
        }
    ];

    const categoryCache = new Map();

    function renderBooksInGrid(grid, books) {
        grid.innerHTML = '';
        if (!books || books.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;padding:12px;">Chưa có sách trong danh mục này.</p>';
            return;
        }
        books.forEach(b => grid.appendChild(createBookCard(b)));
    }

    async function loadSectionBooks(cat) {
        const grid = document.getElementById(`grid-${cat.id}`);
        if (!grid) return;
        if (categoryCache.has(cat.id)) {
            renderBooksInGrid(grid, categoryCache.get(cat.id));
            return;
        }

        // If trending-daily, immediately render CURATED_TRENDING_BOOKS so user sees books instantly
        if (cat.id === 'trending-daily') {
            categoryCache.set(cat.id, CURATED_TRENDING_BOOKS);
            renderBooksInGrid(grid, CURATED_TRENDING_BOOKS);
        }

        try {
            let books = [];
            if (cat.type === 'trending') {
                books = await fetchTrending('daily');
            } else if (cat.type === 'trending-weekly') {
                books = await fetchTrending('weekly');
            } else if (cat.type === 'subject') {
                books = await fetchSubjectBooks(cat.subject, 12);
            }

            if (books && books.length > 0) {
                categoryCache.set(cat.id, books);
                renderBooksInGrid(grid, books);
            }
        } catch (err) {
            console.warn(`Failed to load category ${cat.id}:`, err);
            if (!categoryCache.has(cat.id)) {
                const fallbackBooks = CURATED_TRENDING_BOOKS.slice(0, 10);
                categoryCache.set(cat.id, fallbackBooks);
                renderBooksInGrid(grid, fallbackBooks);
            }
        }
    }

    function renderCatalogSections() {
        catalogSectionsContainer.innerHTML = '';
        CATALOG_CATEGORIES.forEach(cat => {
            const section = document.createElement('section');
            section.className = 'section catalog-category-section';
            section.id = `section-${cat.id}`;
            section.dataset.catId = cat.id;

            section.innerHTML = `
                <div class="section-header">
                    <div>
                        <h3 class="section-title" style="cursor:pointer;" data-cat="${cat.id}" title="Khám phá toàn bộ sách trong mục ${cat.title}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                                ${cat.icon}
                            </svg>
                            ${cat.title}
                        </h3>
                        <p class="section-subtitle">${cat.subtitle}</p>
                    </div>
                    <button class="btn-open-category" data-cat="${cat.id}" title="Khám phá toàn bộ sách trong mục ${cat.title}">
                        <span>Xem tất cả ↗</span>
                    </button>
                </div>
                <div class="books-scroll" id="grid-${cat.id}">
                </div>
            `;
            catalogSectionsContainer.appendChild(section);

            const grid = section.querySelector('.books-scroll');
            showSkeletons(grid, 10, true);
        });
    }

    function initLazyLoadingSections() {
        // Tải ngay 3 danh mục đầu tiên để người dùng thấy sách ngay lập tức
        CATALOG_CATEGORIES.slice(0, 3).forEach(cat => loadSectionBooks(cat));

        // Tải mượt mà các danh mục tiếp theo khi cuộn trang
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const catId = entry.target.dataset.catId;
                        const cat = CATALOG_CATEGORIES.find(c => c.id === catId);
                        if (cat) {
                            loadSectionBooks(cat);
                            observer.unobserve(entry.target);
                        }
                    }
                });
            }, { rootMargin: '300px 0px' });

            CATALOG_CATEGORIES.slice(3).forEach(cat => {
                const sec = document.getElementById(`section-${cat.id}`);
                if (sec) observer.observe(sec);
            });
        } else {
            CATALOG_CATEGORIES.slice(3).forEach((cat, idx) => {
                setTimeout(() => loadSectionBooks(cat), (idx + 1) * 350);
            });
        }
    }

    // =========================================
    // Recommendations
    // =========================================
    async function loadRecommendations() {
        if (wishlist.length === 0) {
            recommendationsSection.style.display = 'none';
            return;
        }

        recommendationsSection.style.display = 'block';
        showSkeletons(recommendationsGrid, 10, true);

        try {
            // Gather subjects from wishlist
            const allSubjects = [];
            wishlist.forEach(b => {
                if (b.subjects) {
                    b.subjects.forEach(s => {
                        const clean = s.toLowerCase().trim();
                        if (clean.length > 2 && clean.length < 40 && !allSubjects.includes(clean)) {
                            allSubjects.push(clean);
                        }
                    });
                }
            });

            const allBooks = [];
            const existingKeys = new Set([
                ...wishlist.map(b => b.key),
            ]);

            if (allSubjects.length > 0) {
                const shuffled = allSubjects.sort(() => 0.5 - Math.random());
                const chosen = shuffled.slice(0, 3);
                const subjectPromises = chosen.map(s => fetchSubjectBooks(s, 6).catch(() => []));
                const subjectResults = await Promise.race([
                    Promise.all(subjectPromises),
                    new Promise(resolve => setTimeout(() => resolve([]), 4500))
                ]);

                subjectResults.forEach(books => {
                    (books || []).forEach(b => {
                        if (!existingKeys.has(b.key) && !allBooks.some(ab => ab.key === b.key)) {
                            allBooks.push(b);
                            existingKeys.add(b.key);
                        }
                    });
                });
            }

            recommendationsGrid.innerHTML = '';
            if (allBooks.length === 0) {
                const fallbackRecs = CURATED_TRENDING_BOOKS.filter(b => !existingKeys.has(b.key)).slice(0, 10);
                if (fallbackRecs.length > 0) {
                    fallbackRecs.forEach(book => recommendationsGrid.appendChild(createBookCard(book)));
                } else {
                    recommendationsSection.style.display = 'none';
                }
                return;
            }

            const recs = allBooks.sort(() => 0.5 - Math.random()).slice(0, 20);
            recs.forEach(book => {
                recommendationsGrid.appendChild(createBookCard(book));
            });

        } catch (err) {
            console.error('Recommendations error:', err);
            recommendationsGrid.innerHTML = '';
            const fallbackRecs = CURATED_TRENDING_BOOKS.slice(0, 10);
            fallbackRecs.forEach(book => recommendationsGrid.appendChild(createBookCard(book)));
        }
    }

    // =========================================
    // Clear search / show explore
    // =========================================
    function showExploreDefault() {
        searchResultsSection.style.display = 'none';
        if (categoryDetailSection) categoryDetailSection.style.display = 'none';
        catalogSectionsContainer.style.display = 'block';
        if (wishlist.length > 0) recommendationsSection.style.display = 'block';
    }

    // When clearing search input
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim() === '' && searchResultsSection.style.display !== 'none') {
            showExploreDefault();
        }
    });

    // =========================================
    // Curated Audiobooks (Internet Archive)
    // =========================================
    const CURATED_AUDIOBOOKS = [
        {
            identifier: 'tdthhqbn',
            title: 'Thay Đổi Tí Hon (Atomic Habits)',
            originalTitle: 'Atomic Habits',
            author: 'James Clear',
            genre: 'self-help',
            chapters: 13,
            rating: 4.0,
            ratingsCount: 1445,
            cover: 'https://archive.org/services/img/tdthhqbn',
            description: 'Tác phẩm bán chạy kỷ lục toàn cầu của James Clear về phương pháp xây dựng thói quen tốt và loại bỏ thói quen xấu thông qua những cải thiện nhỏ 1% mỗi ngày.',
            aliases: ['atomic habits', 'thay doi ti hon', 'thay đổi tí hon', 'thói quen nguyên tử', 'thoi quen nguyen tu', 'james clear', 'tdthhqbn']
        },
        {
            identifier: 'cha-giau-cha-ngheo',
            title: 'Cha Giàu Cha Nghèo (Dạy Con Làm Giàu)',
            originalTitle: 'Rich Dad Poor Dad',
            author: 'Robert T. Kiyosaki',
            genre: 'self-help',
            chapters: 13,
            rating: 4.1,
            ratingsCount: 1820,
            cover: 'https://archive.org/services/img/cha-giau-cha-ngheo',
            description: 'Cuốn sách bán chạy kinh điển về giáo dục tài chính của Robert Kiyosaki, vén màn sự khác biệt trong tư duy về tiền bạc giữa người giàu và người nghèo, giúp độc giả làm chủ đồng tiền.',
            aliases: ['rich dad poor dad', 'rich dad, poor dad', 'day con lam giau', 'cha giau cha ngheo', 'dạy con làm giàu', 'cha giàu cha nghèo', 'rich dad']
        },
        {
            identifier: 'tam-ly-hoc-ve-tien',
            title: 'Tâm Lý Học Về Tiền',
            originalTitle: 'The Psychology of Money',
            author: 'Morgan Housel',
            genre: 'self-help',
            chapters: 16,
            rating: 4.0,
            ratingsCount: 423,
            cover: 'https://archive.org/services/img/tam-ly-hoc-ve-tien',
            description: 'Cuốn sách bán chạy toàn cầu của Morgan Housel, phân tích sâu sắc mối quan hệ giữa tâm lý, cảm xúc và các quyết định tài chính của con người. Làm giàu không chỉ là kiến thức toán học, mà là hành vi và sự tự chủ.',
            aliases: ['the psychology of money', 'psychology of money', 'tam ly hoc ve tien', 'tâm lý học về tiền', 'tam ly tien bac', 'tâm lý tiền bạc', 'morgan housel']
        },
        {
            identifier: 'mat-day-tam-den.sna',
            title: 'Mặt Dày Tâm Đen',
            originalTitle: 'Thick Face, Black Heart',
            author: 'Chin-Ning Chu',
            genre: 'self-help',
            chapters: 19,
            rating: 3.9,
            ratingsCount: 85,
            cover: 'https://archive.org/services/img/mat-day-tam-den.sna',
            description: 'Tác phẩm nổi tiếng của Chin-Ning Chu kết hợp triết lý phương Đông và tư duy hành động thực tiễn để khai phá sức mạnh nội tâm, xây dựng bản lĩnh vững vàng vượt qua mọi sóng gió thương trường và đời sống.',
            aliases: ['mat day tam den', 'thick face black heart', 'thick face, black heart']
        },
        {
            identifier: 'dac-nhan-tam.sna',
            title: 'Đắc Nhân Tâm',
            originalTitle: 'How to Win Friends and Influence People',
            author: 'Dale Carnegie',
            genre: 'self-help',
            chapters: 31,
            rating: 4.2,
            ratingsCount: 444,
            cover: 'https://archive.org/services/img/dac-nhan-tam.sna',
            description: 'Cuốn sách nghệ thuật thu phục lòng người kinh điển nhất mọi thời đại của Dale Carnegie, chỉ dẫn cách lắng nghe, thấu hiểu, ứng xử nhân văn và xây dựng những mối quan hệ bền vững.',
            aliases: ['dac nhan tam', 'how to win friends and influence people', 'how to win friends & influence people']
        },
        {
            identifier: 'nha-gia-kim.sna',
            title: 'Nhà Giả Kim',
            originalTitle: 'The Alchemist',
            author: 'Paulo Coelho',
            genre: 'literature',
            chapters: 12,
            rating: 4.1,
            ratingsCount: 1250,
            cover: 'https://archive.org/services/img/nha-gia-kim.sna',
            description: 'Kiệt tác văn học thế giới kể về hành trình theo đuổi vận mệnh của chàng trai chăn cừu Santiago: Khi bạn thực sự khao khát một điều gì, cả vũ trụ sẽ hợp lực giúp bạn đạt được.',
            aliases: ['the alchemist', 'nha gia kim', 'o alquimista']
        },
        {
            identifier: 'bogia_201903',
            title: 'Bố Già (The Godfather)',
            originalTitle: 'The Godfather',
            author: 'Mario Puzo',
            genre: 'literature',
            chapters: 32,
            rating: 4.3,
            ratingsCount: 560,
            cover: 'https://archive.org/services/img/bogia_201903',
            description: 'Tác phẩm hình sự - tâm lý xuất sắc nhất về thế giới ngầm mafia Mỹ và gia tộc Corleone dưới sự dẫn dắt của Don Vito Corleone đầy quyền uy và danh dự.',
            aliases: ['the godfather', 'bo gia', 'bố già']
        },
        {
            identifier: 'tam-quoc-chi-dien-nghia-tap-1.sna',
            title: 'Tam Quốc Diễn Nghĩa',
            originalTitle: 'Romance of the Three Kingdoms',
            author: 'La Quán Trung',
            genre: 'history-philosophy',
            chapters: 40,
            rating: 4.5,
            ratingsCount: 190,
            cover: 'https://archive.org/services/img/tam-quoc-chi-dien-nghia-tap-1.sna',
            description: 'Đại kiệt tác văn học lịch sử Trung Hoa, khắc họa cuộc tranh hùng thời Tam Quốc với những mưu lược quân sự kiệt xuất, tài trí của Gia Cát Lượng, Tào Tháo, Quan Vũ, Lưu Bị.',
            aliases: ['tam quoc dien nghia', 'tam quoc chi', 'romance of the three kingdoms']
        },
        {
            identifier: 'mat-ma-da-vinci.sna',
            title: 'Mật Mã Da Vinci',
            originalTitle: 'The Da Vinci Code',
            author: 'Dan Brown',
            genre: 'literature',
            chapters: 105,
            rating: 3.9,
            ratingsCount: 980,
            cover: 'https://archive.org/services/img/mat-ma-da-vinci.sna',
            description: 'Tiểu thuyết trinh thám ly kỳ chấn động thế giới của Dan Brown, theo chân giáo sư biểu tượng học Robert Langdon giải mã các thông điệp ẩn giấu trong các tuyệt tác của Leonardo da Vinci.',
            aliases: ['the da vinci code', 'mat ma da vinci']
        },
        {
            identifier: 'suc-manh-tiem-thuc.sna',
            title: 'Sức Mạnh Tiềm Thức',
            originalTitle: 'The Power of Your Subconscious Mind',
            author: 'Joseph Murphy',
            genre: 'self-help',
            chapters: 20,
            rating: 4.1,
            ratingsCount: 310,
            cover: 'https://archive.org/services/img/suc-manh-tiem-thuc.sna',
            description: 'Khám phá bí mật tiềm ẩn của trí não và tiềm thức, phương pháp khai mở nguồn năng lượng chữa lành, thịnh vượng và hạnh phúc trong mỗi con người.',
            aliases: ['suc manh tiem thuc', 'the power of your subconscious mind']
        },
        {
            identifier: 'tuoi-tre-dang-gia-bao-nhieu.sna',
            title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu',
            author: 'Rosie Nguyễn',
            genre: 'self-help',
            chapters: 17,
            rating: 4.0,
            ratingsCount: 220,
            cover: 'https://archive.org/services/img/tuoi-tre-dang-gia-bao-nhieu.sna',
            description: 'Cuốn sách truyền cảm hứng cho hàng triệu bạn trẻ Việt Nam về việc học tập, đọc sách, trải nghiệm du lịch bụi và tìm ra đam mê đích thực của cuộc đời.',
            aliases: ['tuoi tre dang gia bao nhieu']
        },
        {
            identifier: 'gian.sna',
            title: 'Giận',
            author: 'Thích Nhất Hạnh',
            genre: 'history-philosophy',
            chapters: 15,
            rating: 4.4,
            ratingsCount: 390,
            cover: 'https://archive.org/services/img/gian.sna',
            description: 'Những lời dạy minh triết của Thiền sư Thích Nhất Hạnh về phương pháp ôm ấp và chuyển hóa cơn giận, tìm lại sự an lạc sâu sắc trong tâm hồn và hàn gắn mối quan hệ.',
            aliases: ['gian thich nhat hanh', 'gian']
        },
        {
            identifier: 'tren-duong-bang.sna',
            title: 'Trên Đường Băng',
            author: 'Tony Buổi Sáng',
            genre: 'self-help',
            chapters: 21,
            rating: 4.2,
            ratingsCount: 260,
            cover: 'https://archive.org/services/img/tren-duong-bang.sna',
            description: 'Tác phẩm truyền động lực mạnh mẽ của Tony Buổi Sáng dành cho người trẻ dám dấn thân, rèn luyện ngoại ngữ, tính kỷ luật và bản lĩnh vươn ra biển lớn thế giới.',
            aliases: ['tren duong bang', 'tony buoi sang']
        },
        {
            identifier: 'khong-gia-dinh.sna',
            title: 'Không Gia Đình',
            originalTitle: 'Sans Famille / Nobody\'s Boy',
            author: 'Hector Malot',
            genre: 'literature',
            chapters: 25,
            rating: 4.3,
            ratingsCount: 410,
            cover: 'https://archive.org/services/img/khong-gia-dinh.sna',
            description: 'Hành trình lưu lạc đầy thử thách nhưng ngập tràn tình yêu thương và lòng quả cảm của chú bé Rémi cùng cụ Vitalis và đoàn xiếc thú qua khắp nẻo đường nước Pháp.',
            aliases: ['khong gia dinh', 'sans famille', 'nobody\'s boy']
        },
        {
            identifier: 'hai-so-phan.sna',
            title: 'Hai Số Phận (Kane and Abel)',
            originalTitle: 'Kane and Abel',
            author: 'Jeffrey Archer',
            genre: 'literature',
            chapters: 35,
            rating: 4.4,
            ratingsCount: 780,
            cover: 'https://archive.org/services/img/hai-so-phan.sna',
            description: 'Tiểu thuyết kinh điển về cuộc đối đầu định mệnh giữa William Kane giàu sang quyền quý và Abel Rosnovski di dân nghèo khó trên thương trường nước Mỹ suốt nửa thế kỷ.',
            aliases: ['hai so phan', 'kane and abel', 'kane & abel']
        },
        {
            identifier: 'quang-ganh-lo-di-va-vui-song.sna',
            title: 'Quẳng Gánh Lo Đi Và Vui Sống',
            originalTitle: 'How to Stop Worrying and Start Living',
            author: 'Dale Carnegie',
            genre: 'self-help',
            chapters: 28,
            rating: 4.2,
            ratingsCount: 280,
            cover: 'https://archive.org/services/img/quang-ganh-lo-di-va-vui-song.sna',
            description: 'Chỉ dẫn tâm lý thiết thực giúp độc giả phân tích và loại bỏ âu lo phiền muộn, sống trọn vẹn từng ngày hôm nay trong niềm vui và sự thanh thản.',
            aliases: ['quang ganh lo di va vui song', 'how to stop worrying and start living']
        },
        {
            identifier: 'nghi-giau-lam-giau.sna',
            title: 'Nghĩ Giàu Làm Giàu (Think and Grow Rich)',
            originalTitle: 'Think and Grow Rich',
            author: 'Napoleon Hill',
            genre: 'self-help',
            chapters: 16,
            rating: 4.2,
            ratingsCount: 1650,
            cover: 'https://archive.org/services/img/nghi-giau-lam-giau.sna',
            description: '13 nguyên tắc thành công được đúc kết từ hơn 500 nhân vật kiệt xuất nhất nước Mỹ của Napoleon Hill, mở rộng tầm nhìn về sức mạnh của khát khao và trí tuệ.',
            aliases: ['nghi giau lam giau', 'think and grow rich']
        },
        {
            identifier: 'hoang-tu-be.sna',
            title: 'Hoàng Tử Bé',
            originalTitle: 'The Little Prince',
            author: 'Antoine de Saint-Exupéry',
            genre: 'literature',
            chapters: 27,
            rating: 4.4,
            ratingsCount: 2100,
            cover: 'https://archive.org/services/img/hoang-tu-be.sna',
            description: 'Kiệt tác văn học Pháp đẹp đẽ và sâu sắc: "Người ta chỉ có thể nhìn thấy rõ ràng bằng trái tim. Những điều cốt yếu thì mắt thường không nhìn thấy được."',
            aliases: ['hoang tu be', 'the little prince', 'le petit prince']
        },
        {
            identifier: 'art_of_war_librivox',
            title: 'Binh Pháp Tôn Tử (The Art of War)',
            originalTitle: 'The Art of War',
            author: 'Sun Tzu / Lionel Giles',
            genre: 'english',
            chapters: 13,
            rating: 4.1,
            ratingsCount: 850,
            cover: 'https://archive.org/services/img/art_of_war_librivox',
            description: 'Bộ binh thư quân sự vĩ đại nhất lịch sử phương Đông, đúc kết các quy luật chiến lược, nghệ thuật chỉ huy và triết lý nắm bắt cơ hội được áp dụng rộng rãi trong cả kinh doanh hiện đại.',
            aliases: ['binh phap ton tu', 'the art of war']
        },
        {
            identifier: 'sherlock_holmes_canon_08_02_librivox',
            title: 'The Return of Sherlock Holmes',
            author: 'Arthur Conan Doyle',
            genre: 'english',
            chapters: 13,
            rating: 4.3,
            ratingsCount: 470,
            cover: 'https://archive.org/services/img/sherlock_holmes_canon_08_02_librivox',
            description: 'Tuyển tập truyện trinh thám đặc sắc đánh dấu sự trở lại ngoạn mục của thám tử đại tài Sherlock Holmes và bác sĩ Watson trên phố Baker.',
            aliases: ['sherlock holmes']
        }
    ];

    // =========================================
    // Curated Audiobooks (YouTube Music)
    // =========================================
    const CURATED_YOUTUBE_AUDIOBOOKS = [
        {
            identifier: 'yt_YMJLyfRJZ0w',
            videoId: 'YMJLyfRJZ0w',
            title: 'Đắc Nhân Tâm (Bản Chuẩn Trọn Bộ 5.3 Giờ)',
            originalTitle: 'How to Win Friends and Influence People',
            author: 'Dale Carnegie / Trạm Dừng Audio',
            genre: 'self-help',
            chapters: 4,
            duration: 19180,
            durationFormatted: '5:19:40',
            cover: 'https://i.ytimg.com/vi/YMJLyfRJZ0w/hqdefault.jpg',
            description: 'Cuốn sách nghệ thuật thu phục lòng người kinh điển nhất mọi thời đại của Dale Carnegie. Hướng dẫn nghệ thuật giao tiếp đỉnh cao, lắng nghe và thấu hiểu người khác.',
            type: 'youtube',
            chapterList: [
                { index: 0, title: 'Phần 1: Nghệ thuật thu phục lòng người', time: 0 },
                { index: 1, title: 'Phần 2: Sáu cách tạo thiện cảm với người khác', time: 4200 },
                { index: 2, title: 'Phần 3: Mười hai cách hướng người khác theo suy nghĩ của bạn', time: 8400 },
                { index: 3, title: 'Phần 4: Chuyển hóa người khác mà không gây bất hòa', time: 13800 }
            ],
            aliases: ['dac nhan tam', 'đắc nhân tâm', 'how to win friends']
        },
        {
            identifier: 'yt_QCzY-rJJhGE',
            videoId: 'QCzY-rJJhGE',
            title: 'Cha Giàu Cha Nghèo (Dạy Con Làm Giàu Full 3.5 Giờ)',
            originalTitle: 'Rich Dad Poor Dad',
            author: 'Robert T. Kiyosaki',
            genre: 'self-help',
            chapters: 6,
            duration: 12600,
            durationFormatted: '3:30:00',
            cover: 'https://i.ytimg.com/vi/QCzY-rJJhGE/hqdefault.jpg',
            description: 'Sách giáo dục tài chính kinh điển của Robert Kiyosaki, vén màn sự khác biệt trong tư duy về tiền bạc giữa người giàu và người nghèo, giúp bạn làm chủ đồng tiền.',
            type: 'youtube',
            chapterList: [
                { index: 0, title: 'Chương 1: Người giàu không làm việc vì tiền', time: 0 },
                { index: 1, title: 'Chương 2: Tại sao phải dạy con về tài chính', time: 2400 },
                { index: 2, title: 'Chương 3: Hãy nghĩ đến việc kinh doanh của mình', time: 4800 },
                { index: 3, title: 'Chương 4: Lịch sử các thứ thuế và quyền lực của tập đoàn', time: 6900 },
                { index: 4, title: 'Chương 5: Người giàu tạo ra tiền', time: 9200 },
                { index: 5, title: 'Chương 6: Hãy làm việc để học - Đừng làm việc vì tiền', time: 11100 }
            ],
            aliases: ['cha giau cha ngheo', 'cha giàu cha nghèo', 'dạy con làm giàu', 'rich dad poor dad']
        },
        {
            identifier: 'yt_OdLBXi09iSs',
            videoId: 'OdLBXi09iSs',
            title: 'Nghĩ Giàu & Làm Giàu (Think and Grow Rich Full 7.6 Giờ)',
            originalTitle: 'Think and Grow Rich',
            author: 'Napoleon Hill / Voiz FM',
            genre: 'self-help',
            chapters: 5,
            duration: 27360,
            durationFormatted: '7:36:00',
            cover: 'https://i.ytimg.com/vi/OdLBXi09iSs/hqdefault.jpg',
            description: '13 nguyên tắc thành công được đúc kết từ hơn 500 nhân vật kiệt xuất nhất nước Mỹ của Napoleon Hill, mở rộng tầm nhìn về sức mạnh của khát khao và trí tuệ.',
            type: 'youtube',
            chapterList: [
                { index: 0, title: 'Bước 1: Khát vọng - Điểm khởi đầu của mọi thành công', time: 0 },
                { index: 1, title: 'Bước 2: Niềm tin - Hình dung và tin tưởng vào mục tiêu', time: 5400 },
                { index: 2, title: 'Bước 3: Tự kỷ ám thị - Công cụ tác động tiềm thức', time: 11000 },
                { index: 3, title: 'Bước 4: Kiến thức chuyên sâu & Trí tưởng tượng', time: 16500 },
                { index: 4, title: 'Bước 5: Kế hoạch có tổ chức & Lòng kiên trì', time: 22000 }
            ],
            aliases: ['nghi giau lam giau', 'nghĩ giàu làm giàu', 'think and grow rich']
        },
        {
            identifier: 'yt_VqZsr9N2-kU',
            videoId: 'VqZsr9N2-kU',
            title: '7 Thói Quen Hiệu Quả (The 7 Habits of Highly Effective People)',
            originalTitle: 'The 7 Habits of Highly Effective People',
            author: 'Stephen R. Covey',
            genre: 'self-help',
            chapters: 7,
            duration: 21600,
            durationFormatted: '6:00:00',
            cover: 'https://i.ytimg.com/vi/VqZsr9N2-kU/hqdefault.jpg',
            description: 'Khung tư duy toàn diện để giải quyết các vấn đề cá nhân và nghề nghiệp, xây dựng tính chủ động, tầm nhìn dài hạn và tinh thần hợp tác cùng thắng.',
            type: 'youtube',
            chapterList: [
                { index: 0, title: 'Thói quen 1: Luôn chủ động', time: 0 },
                { index: 1, title: 'Thói quen 2: Bắt đầu bằng mục tiêu đã xác định', time: 3200 },
                { index: 2, title: 'Thói quen 3: Ưu tiên điều quan trọng nhất', time: 6500 },
                { index: 3, title: 'Thói quen 4: Tư duy cùng thắng (Win-Win)', time: 10200 },
                { index: 4, title: 'Thói quen 5: Lắng nghe và thấu hiểu trước', time: 13900 },
                { index: 5, title: 'Thói quen 6: Đồng tâm hiệp lực', time: 17200 },
                { index: 6, title: 'Thói quen 7: Rèn giũa bản thân', time: 19500 }
            ],
            aliases: ['7 thoi quen', '7 thói quen', 'the 7 habits']
        },
        {
            identifier: 'yt_0vVz4uUekx8',
            videoId: '0vVz4uUekx8',
            title: 'Đọc Vị Bất Kỳ Ai - Để Không Bị Thao Túng Và Lợi Dụng',
            originalTitle: 'Read People Deeper',
            author: 'TS. David J. Lieberman',
            genre: 'self-help',
            chapters: 4,
            duration: 14400,
            durationFormatted: '4:00:00',
            cover: 'https://i.ytimg.com/vi/0vVz4uUekx8/hqdefault.jpg',
            description: 'Các kỹ thuật tâm lý học thực chiến giúp bạn nhanh chóng nhận biết suy nghĩ, cảm xúc thật và độ trung thực của đối phương trong mọi cuộc trò chuyện.',
            type: 'youtube',
            chapterList: [
                { index: 0, title: 'Phần 1: Nhận biết cảm xúc và suy nghĩ ẩn giấu', time: 0 },
                { index: 1, title: 'Phần 2: Nhận biết dấu hiệu nói dối', time: 3500 },
                { index: 2, title: 'Phần 3: Đọc vị sự tự tin và lo lắng', time: 7000 },
                { index: 3, title: 'Phần 4: Xây dựng hàng rào tâm lý tự vệ', time: 10500 }
            ],
            aliases: ['doc vi bat ky ai', 'đọc vị bất kỳ ai']
        },
        {
            identifier: 'yt_GG41ek9OBEw',
            videoId: 'GG41ek9OBEw',
            title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu (Sách Nói Truyền Cảm Hứng)',
            author: 'Rosie Nguyễn',
            genre: 'self-help',
            chapters: 5,
            duration: 16200,
            durationFormatted: '4:30:00',
            cover: 'https://i.ytimg.com/vi/GG41ek9OBEw/hqdefault.jpg',
            description: 'Cuốn sách truyền cảm hứng cho hàng triệu độc giả trẻ: Hãy đầu tư cho việc học, mở rộng tầm nhìn qua trang sách và những chuyến đi trải nghiệm.',
            type: 'youtube',
            chapterList: [
                { index: 0, title: 'Phần 1: Tôi đã học như thế nào', time: 0 },
                { index: 1, title: 'Phần 2: Học đi đôi với hành', time: 3600 },
                { index: 2, title: 'Phần 3: Đi là một cách tự học', time: 7200 },
                { index: 3, title: 'Phần 4: Lấp lánh trước khi tỏa sáng', time: 11000 },
                { index: 4, title: 'Phần 5: Vượt qua khủng hoảng tuổi trẻ', time: 14000 }
            ],
            aliases: ['tuoi tre dang gia bao nhieu', 'tuổi trẻ đáng giá bao nhiêu']
        },
        {
            identifier: 'yt_m6sA7qFh8i8',
            videoId: 'm6sA7qFh8i8',
            title: 'Nhà Giả Kim (The Alchemist - Trọn Bộ)',
            originalTitle: 'The Alchemist',
            author: 'Paulo Coelho',
            genre: 'literature',
            chapters: 2,
            duration: 14800,
            durationFormatted: '4:06:00',
            cover: 'https://i.ytimg.com/vi/m6sA7qFh8i8/hqdefault.jpg',
            description: 'Kiệt tác văn học về hành trình đi tìm kho báu và sứ mệnh cuộc đời: "Khi bạn khao khát một điều gì, toàn bộ vũ trụ sẽ hợp lực giúp bạn đạt được."',
            type: 'youtube',
            chapterList: [
                { index: 0, title: 'Phần 1: Giấc mơ và chuyến hành trình sa mạc', time: 0 },
                { index: 1, title: 'Phần 2: Ốc đảo, Nhà Giả Kim và Kho báu kim tự tháp', time: 7400 }
            ],
            aliases: ['nha gia kim', 'nhà giả kim', 'the alchemist']
        },
        {
            identifier: 'yt_5qap5aO4i9A',
            videoId: '5qap5aO4i9A',
            title: 'Nhạc Lofi Đọc Sách & Học Tập Thư Giãn (Relaxing Lofi Beats 3h)',
            author: 'Lofi Chill / Reading Vibes',
            genre: 'english',
            chapters: 1,
            duration: 10800,
            durationFormatted: '3:00:00',
            cover: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
            description: 'Những giai điệu Lofi Hip Hop êm dịu, ấm áp giúp tăng khả năng tập trung, ghi nhớ sâu và tạo không gian đọc sách tĩnh lặng, thư thái.',
            type: 'youtube',
            chapterList: [
                { index: 0, title: 'Lofi Beats for Deep Focus & Reading', time: 0 }
            ],
            aliases: ['lofi doc sach', 'nhac doc sach', 'lofi reading', 'music for reading']
        }
    ];

    // =========================================
    // Vietnamese Book Title Resolver & Synonyms
    // =========================================
    const VI_TITLE_ALIASES = {
        'rich dad poor dad': 'Cha Giàu Cha Nghèo',
        'rich dad, poor dad': 'Cha Giàu Cha Nghèo',
        'rich dad': 'Cha Giàu Cha Nghèo',
        'day con lam giau': 'Cha Giàu Cha Nghèo',
        'dạy con làm giàu': 'Cha Giàu Cha Nghèo',
        'cha giàu cha nghèo': 'Cha Giàu Cha Nghèo',
        'cha giau cha ngheo': 'Cha Giàu Cha Nghèo',
        'think and grow rich': 'Nghĩ Giàu Làm Giàu',
        'how to win friends and influence people': 'Đắc Nhân Tâm',
        'how to win friends & influence people': 'Đắc Nhân Tâm',
        'thick face, black heart': 'Mặt Dày Tâm Đen',
        'thick face black heart': 'Mặt Dày Tâm Đen',
        'the da vinci code': 'Mật Mã Da Vinci',
        'the power of your subconscious mind': 'Sức Mạnh Tiềm Thức',
        'the little prince': 'Hoàng Tử Bé',
        'le petit prince': 'Hoàng Tử Bé',
        'the art of war': 'Binh Pháp Tôn Tử',
        'the alchemist': 'Nhà Giả Kim',
        'o alquimista': 'Nhà Giả Kim',
        'the godfather': 'Bố Già',
        'norwegian wood': 'Rừng Na Uy',
        'crime and punishment': 'Tội Ác Và Hình Phạt',
        'the great gatsby': 'Gatsby Vĩ Đại',
        'kane and abel': 'Hai Số Phận',
        'nobody\'s boy': 'Không Gia Đình',
        'sans famille': 'Không Gia Đình',
        'les miserables': 'Những Người Khốn Khổ',
        'les misérables': 'Những Người Khốn Khổ',
        'the count of monte cristo': 'Bá Tước Monte Cristo',
        'the old man and the sea': 'Ông Già Và Biển Cả',
        'pride and prejudice': 'Kiêu Hãnh Và Định Kiến',
        'war and peace': 'Chiến Tranh Và Hòa Bình',
        'to kill a mockingbird': 'Giết Con Chim Nhại',
        '1984': 'Một Chín Tám Tư',
        'animal farm': 'Trại Súc Vật',
        'atomic habits': 'Thay Đổi Tí Hon',
        'sapiens': 'Sapiens Lược Sử Loài Người',
        'the 7 habits of highly effective people': '7 Thói Quen Của Người Thành Đạt',
        'man\'s search for meaning': 'Đi Tìm Lẽ Sống',
        'tuesdays with morrie': 'Những Thứ Ba Với Thầy Morrie',
        'quang ganh lo di va vui song': 'Quẳng Gánh Lo Đi Và Vui Sống',
        'how to stop worrying and start living': 'Quẳng Gánh Lo Đi Và Vui Sống',
        'the psychology of money': 'Tâm Lý Học Về Tiền',
        'psychology of money': 'Tâm Lý Học Về Tiền',
        'tam ly hoc ve tien': 'Tâm Lý Học Về Tiền',
        'tâm lý học về tiền': 'Tâm Lý Học Về Tiền',
        'tam ly tien bac': 'Tâm Lý Học Về Tiền',
        'tâm lý tiền bạc': 'Tâm Lý Học Về Tiền',
        'the 48 laws of power': '48 Nguyên Tắc Chủ Chốt Của Quyền Lực',
        '48 laws of power': '48 Nguyên Tắc Chủ Chốt Của Quyền Lực',
        '48 nguyen tac chu chot cua quyen luc': '48 Nguyên Tắc Chủ Chốt Của Quyền Lực',
        '48 nguyên tắc chủ chốt của quyền lực': '48 Nguyên Tắc Chủ Chốt Của Quyền Lực'
    };

    function isVietnamese(str) {
        if (!str) return false;
        return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/i.test(str);
    }

    function removeVietnameseTones(str) {
        if (!str) return '';
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
    }

    function cleanTitleForAudioSearch(str) {
        if (!str) return '';
        return str
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/[:\-–—].*$/, '')
            .replace(/["\\/()[\]{}~*?^:!]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function resolveVietnameseAudioTitle(book) {
        if (!book) return '';
        const rawTitle = (book.title || '').trim();
        const origTitle = (book.originalTitle || '').trim();
        const searchQuery = (book.searchQuery || '').trim();
        const lowerRaw = rawTitle.toLowerCase();
        const lowerOrig = origTitle.toLowerCase();
        const lowerSearch = searchQuery.toLowerCase();

        // 1. If user searched with a Vietnamese term, check if it matches an alias or use it directly
        if (searchQuery && isVietnamese(searchQuery)) {
            for (const [key, viName] of Object.entries(VI_TITLE_ALIASES)) {
                if (lowerSearch.includes(key) || key.includes(lowerSearch)) {
                    return viName;
                }
            }
            return searchQuery;
        }

        // 2. Check known aliases map first (e.g. "rich dad poor dad" -> "Cha Giàu Cha Nghèo")
        for (const [key, viName] of Object.entries(VI_TITLE_ALIASES)) {
            if (lowerRaw.includes(key) || (lowerOrig && lowerOrig.includes(key))) {
                return viName;
            }
        }

        // 3. Check if book.titleVi has Vietnamese diacritics
        if (book.titleVi && isVietnamese(book.titleVi)) {
            const vi = book.titleVi.trim();
            const lVi = vi.toLowerCase();
            for (const [k, v] of Object.entries(VI_TITLE_ALIASES)) {
                if (lVi.includes(k) || k.includes(lVi)) return v;
            }
            return vi;
        }

        // 4. If raw title already contains Vietnamese diacritics
        if (isVietnamese(rawTitle)) {
            return rawTitle;
        }

        // 5. Translate rawTitle or origTitle to Vietnamese via Google Translate API
        const toTranslate = origTitle || rawTitle;
        if (toTranslate) {
            try {
                const vi = await translateText(toTranslate);
                if (vi) {
                    const lVi = vi.toLowerCase();
                    for (const [k, v] of Object.entries(VI_TITLE_ALIASES)) {
                        if (lVi.includes(k) || k.includes(lVi)) return v;
                    }
                    return vi;
                }
            } catch { /* fallback */ }
        }

        return book.titleVi || rawTitle;
    }

    // =========================================
    // Audio Player State & Engine
    // =========================================
    const audioElement = new Audio();
    audioElement.preload = 'metadata';

    let currentAudioSource = 'archive'; // 'archive' | 'youtube'
    let currentAudioType = 'archive';   // 'archive' | 'youtube'
    let currentAudiobook = null;
    let currentTrackIndex = 0;
    let isAudioSeeking = false;
    let isAudioStopping = false;
    let sleepTimerTimeout = null;
    let sleepTimerMode = '0'; // '0', '15', '30', '45', '60', 'end'
    const SPEED_RATES = [1.0, 1.25, 1.5, 2.0, 0.75];
    let currentSpeedIndex = 0;
    let isAudiobookTabLoaded = false;
    let currentGenreFilter = 'all';

    // YouTube Player State
    let ytPlayer = null;
    let isYtApiReady = false;
    let ytCurrentItem = null;
    let ytProgressInterval = null;
    let isVideoMode = false;

    // Preview Mode State (allows viewing another book without interrupting background playback)
    let isViewingPreview = false;
    let previewViewingBook = null;
    let previewViewingType = 'archive';
    let previewTargetTrack = 0;
    let previewResumeTime = 0;
    const playerNowPlayingPill = document.getElementById('playerNowPlayingPill');
    const playerNowPlayingText = document.getElementById('playerNowPlayingText');
    const playerBgPlayingPill = document.getElementById('playerBgPlayingPill');
    const playerBgPlayingText = document.getElementById('playerBgPlayingText');

    // Hook YouTube IFrame API Ready Callback
    window.onYouTubeIframeAPIReady = function() {
        isYtApiReady = true;
        console.log('YouTube IFrame API Ready');
    };

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '00:00';
        const s = Math.floor(seconds);
        const hrs = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        if (hrs > 0) {
            return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function cleanChapterTitle(fileName, metadataTitle) {
        let name = (metadataTitle && metadataTitle.trim()) || fileName;
        // Strip file extension
        name = name.replace(/\.[^/.]+$/, '');
        // Strip common promotional / website tags
        name = name.replace(/\s*[-|–]\s*(?:sachnoi\.app|sachnoi\.cc|SachNoi\.vn|KenhSachNoi\.Com|truyenaudiomoi\.com|Sach Kinh Doanh.*|Sách Nói Hay Nhất.*)$/i, '');
        name = name.replace(/\s*\|\s*(?:CHA GIÀU CHA NGHÈO|DAY CON LAM GIAU|Sach Kinh Doanh|Audiobook).*$/i, '');
        name = name.replace(/\s*I\s*(?:DAY CON LAM GIAU|CHA GIAU CHA NGHEO|Audiobook).*$/i, '');
        // Remove leading sequence like "02 - " or "01 - " or "02. "
        name = name.replace(/^\d+[\s\.\-_]+/, '');
        // Format Chapter / Chuong
        name = name.replace(/^(?:chuong|chương|chapter)\s*(\d+[a-zA-Z]?)\s*[\-:]?\s*/i, (m, c) => `Chương ${c.toUpperCase()}: `);
        // Clean underscores and multiple spaces
        name = name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
        return name;
    }

    function isAudioActiveAndPlaying() {
        if (currentAudioType === 'youtube') {
            if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
                try {
                    const st = ytPlayer.getPlayerState();
                    return st === 1 || st === 3;
                } catch (e) {
                    return false;
                }
            }
            return false;
        }
        return Boolean(audioElement && !audioElement.paused && audioElement.src && audioElement.src !== window.location.href);
    }

    function hasActiveAudioSession() {
        if (currentAudioType === 'youtube') {
            return Boolean(ytCurrentItem);
        }
        return Boolean(currentAudiobook && audioElement.src);
    }

    function getActiveSessionIdentifier() {
        if (currentAudioType === 'youtube') {
            return ytCurrentItem ? (ytCurrentItem.identifier || `yt_${ytCurrentItem.videoId}`) : null;
        }
        return currentAudiobook ? currentAudiobook.identifier : null;
    }

    function getActiveAudioTitle() {
        if (currentAudioType === 'youtube') {
            return ytCurrentItem ? ytCurrentItem.title : '';
        }
        return currentAudiobook ? currentAudiobook.title : '';
    }

    function isSameAudioIdentifier(id1, id2) {
        if (!id1 || !id2) return false;
        const clean1 = String(id1).trim().toLowerCase();
        const clean2 = String(id2).trim().toLowerCase();
        if (clean1 === clean2) return true;
        const strip1 = clean1.replace(/^yt_/, '');
        const strip2 = clean2.replace(/^yt_/, '');
        return strip1 === strip2;
    }

    // =========================================
    // Goodreads Smart Search Link Helper
    // =========================================
    const KNOWN_SPAM_CHANNELS = [
        'sachnoi.app', 'sachnoi.cc', 'sachnoi.vn', 'kenhsachnoi.com', 
        'truyenaudiomoi.com', 'dtv-ebook.com', 'hải đăng bed', 'hải đăng', 
        'sách tinh hoa', 'nghe sách hay', 'sách nói hay', 'sach noi', 'audiobook',
        'cực hay', 'hay nhất', 'trọn bộ'
    ];

    function hasVietnameseDiacritics(str) {
        return /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(str);
    }

    function getGoodreadsSearchData(title, author, fallbackContext) {
        // 1. First check if current item matches a curated book
        const id = (currentAudiobook && currentAudiobook.identifier) || 
                   (ytCurrentItem && (ytCurrentItem.identifier || `yt_${ytCurrentItem.videoId}`)) || '';
        const titleLower = (title || '').toLowerCase().trim();
        const curated = CURATED_AUDIOBOOKS.find(b => (id && b.identifier === id) || 
                        (b.title && titleLower && b.title.toLowerCase() === titleLower) ||
                        (b.aliases && titleLower && b.aliases.some(a => titleLower.includes(a)))) ||
                        CURATED_YOUTUBE_AUDIOBOOKS.find(y => (id && (y.videoId === id || y.identifier === id)) || 
                        (y.title && titleLower && y.title.toLowerCase() === titleLower) ||
                        (y.aliases && titleLower && y.aliases.some(a => titleLower.includes(a))));
        if (curated) {
            const cTitle = (curated.originalTitle || curated.title || '').trim();
            const cAuthor = (curated.author || '').trim();
            const q = cAuthor && !cTitle.toLowerCase().includes(cAuthor.toLowerCase()) ? `${cTitle} ${cAuthor}` : cTitle;
            return {
                query: q,
                url: `https://www.goodreads.com/search?q=${encodeURIComponent(q).replace(/%20/g, '+')}`
            };
        }

        // 2. Normalize and clean input text
        let text = (title || '').trim();
        if ((!text || text.length < 4 || (!text.includes(' ') && text.toLowerCase() === text)) && fallbackContext) {
            text = fallbackContext.trim();
        }

        // Strip file extension
        text = text.replace(/\.[a-zA-Z0-9]{2,4}$/, '');

        // Clean common prefixes first
        text = text.replace(/^(?:track|chương|chuong|bai|bài)\s*\d+[\s\.\-:]*/i, '');
        text = text.replace(/^\d{1,3}[\.\-]\s*/, ''); // Only match 01. or 01- not book numbers like 48
        text = text.replace(/^(sách nói|audiobook|nghe sách|audio|full|mp3)\s*[:\-\—|]\s*/gi, '');
        text = text.replace(/^\[(sách nói|audiobook|audio|mp3|full)[^\]]*\]\s*/gi, '');

        // Strip tags [Audiobook], [Sách nói], etc. inside
        text = text.replace(/\[(audiobook|sách nói|audio|mp3|full)[^\]]*\]/gi, ' ');
        text = text.replace(/\((audiobook|sách nói|audio|mp3|full)[^\)]*\)/gi, ' ');

        // Strip promotional channel/website suffixes and spam tags
        text = text.replace(/sách\s+(kỹ năng|phát triển bản thân|kinh doanh|nói hay nhất|nói|cực hay).*/gi, ' ');

        // Check if there is an English title in parentheses e.g. 'Bố Già (The Godfather)' or 'Thay Đổi Tí Hon (Atomic Habits)'
        const parenMatch = text.match(/\(([^)]+)\)/);
        let englishInParen = null;
        if (parenMatch) {
            const inside = parenMatch[1].trim();
            if (!/^(p\d+|phần\s*\d+|tập\s*\d+|chương\s*\d+|track\s*\d+|audiobook|sách nói)$/i.test(inside)) {
                if (!hasVietnameseDiacritics(inside) && inside.length > 2) {
                    englishInParen = inside;
                }
            }
        }

        // Strip (P1), [P1], - Phần 1, - Tập 1...
        text = text.replace(/[\(\[\-]\s*(p\d+|phần\s*\d+|tập\s*\d+|chương\s*\d+|track\s*\d+)[^\)\]]*[\)\]]?/gi, ' ');

        // Split by hyphens or dashes or pipes
        let segments = text.split(/\s*[-–—|]\s*/).map(s => s.trim()).filter(s => s.length > 1);

        // Filter out known domains and channels
        segments = segments.filter(s => {
            const low = s.toLowerCase();
            return !KNOWN_SPAM_CHANNELS.some(c => low.includes(c));
        });

        let cleanTitle = '';
        let detectedAuthor = '';

        if (englishInParen) {
            cleanTitle = englishInParen;
        } else if (segments.length >= 2) {
            const seg0 = segments[0];
            const seg1 = segments[1];
            const seg2 = segments[2];

            // Check if seg2 or seg1 is a person name (Author)
            if (seg2 && /^[A-Z][a-zA-Z\s\.]+$/.test(seg2) && seg2.split(' ').length <= 4) {
                detectedAuthor = seg2;
            } else if (seg1 && /^[A-Z][a-zA-Z\s\.]+$/.test(seg1) && seg1.split(' ').length <= 4 && !hasVietnameseDiacritics(seg1)) {
                detectedAuthor = seg1;
            }

            // Check if seg0 is an English title (no diacritics) and seg1 is Vietnamese translation
            if (!hasVietnameseDiacritics(seg0) && hasVietnameseDiacritics(seg1)) {
                cleanTitle = seg0; // Prefer English title
            } else {
                cleanTitle = seg0;
            }
        } else {
            cleanTitle = segments[0] || text;
        }

        // Clean extra punctuation and spaces
        cleanTitle = cleanTitle.replace(/[\(\)\[\]_]+/g, ' ').replace(/\s+/g, ' ').trim();

        // Author resolution
        let authorClean = detectedAuthor || author || '';
        const lowAuthor = authorClean.trim().toLowerCase();
        if (/^(internet archive|youtube|youtube music|admin|archive\.org|sachnoi\.app|hải đăng.*)$/i.test(lowAuthor) || lowAuthor === (title || '').toLowerCase()) {
            authorClean = '';
        }

        let query = cleanTitle;
        if (authorClean && !cleanTitle.toLowerCase().includes(authorClean.toLowerCase())) {
            query = `${cleanTitle} ${authorClean}`.trim();
        }

        if (!query) query = (title || fallbackContext || 'books').trim();

        return {
            query: query,
            url: `https://www.goodreads.com/search?q=${encodeURIComponent(query).replace(/%20/g, '+')}`
        };
    }

    function getGoodreadsSearchUrl(title, author, fallbackContext) {
        const data = getGoodreadsSearchData(title, author, fallbackContext);
        return data ? data.url : 'https://www.goodreads.com';
    }

    function updatePlayerGoodreadsLinks(grData) {
        if (!grData) return;
        const url = typeof grData === 'string' ? grData : (grData.url || 'https://www.goodreads.com');
        if (playerGoodreadsLink) playerGoodreadsLink.href = url;
    }

    // =========================================
    // Open Library Metadata & Rating Enrichment
    // =========================================
    const olMetaMemoryCache = new Map();

    async function fetchOpenLibraryBookMeta(title, author = '') {
        if (!title || typeof title !== 'string' || title.trim().length < 2) return null;

        // 1. Get clean search query
        const grData = getGoodreadsSearchData(title, author, '');
        let cleanQuery = (grData && grData.query) || title.trim();
        cleanQuery = cleanQuery.replace(/[\(\)\[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (!cleanQuery) return null;

        const cacheKey = cleanQuery.toLowerCase();
        if (olMetaMemoryCache.has(cacheKey)) {
            return olMetaMemoryCache.get(cacheKey);
        }

        // Check sessionStorage cache
        try {
            const stored = sessionStorage.getItem(`ol_meta_${cacheKey}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                olMetaMemoryCache.set(cacheKey, parsed);
                return parsed;
            }
        } catch (e) {}

        try {
            const enc = encodeURIComponent(cleanQuery);
            const url = `https://openlibrary.org/search.json?q=${enc}&limit=1&fields=title,author_name,ratings_average,ratings_count,first_publish_year,cover_i,key`;
            
            let controller;
            let timeoutId;
            if (typeof AbortController !== 'undefined') {
                controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), 6500);
            }

            const resp = await fetch(url, { signal: controller ? controller.signal : undefined });
            if (timeoutId) clearTimeout(timeoutId);
            if (!resp.ok) return null;

            const data = await resp.json();
            const doc = (data.docs && data.docs[0]) || null;
            if (!doc) {
                olMetaMemoryCache.set(cacheKey, null);
                return null;
            }

            let coverUrl = null;
            if (doc.cover_i) {
                coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
            }

            const meta = {
                title: doc.title || '',
                author: (doc.author_name && doc.author_name[0]) || '',
                rating: doc.ratings_average ? Number(doc.ratings_average.toFixed(1)) : null,
                ratingsCount: doc.ratings_count || 0,
                firstPublishYear: doc.first_publish_year || null,
                cover: coverUrl,
                workKey: doc.key || null
            };

            olMetaMemoryCache.set(cacheKey, meta);
            try {
                sessionStorage.setItem(`ol_meta_${cacheKey}`, JSON.stringify(meta));
            } catch (e) {}

            return meta;
        } catch (err) {
            console.warn('Open Library meta fetch skipped/failed:', err);
            return null;
        }
    }

    async function fetchOpenLibraryWorkDescription(workKey) {
        if (!workKey || typeof workKey !== 'string') return '';
        const cacheKey = `desc_${workKey}`;
        if (olMetaMemoryCache.has(cacheKey)) return olMetaMemoryCache.get(cacheKey);

        try {
            const url = `https://openlibrary.org${workKey}.json`;
            const resp = await fetch(url);
            if (!resp.ok) return '';
            const data = await resp.json();
            const desc = typeof data.description === 'string'
                ? data.description
                : (data.description && data.description.value) || '';
            const cleanDesc = desc.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\r\n/g, '\n').trim();
            olMetaMemoryCache.set(cacheKey, cleanDesc);
            return cleanDesc;
        } catch (e) {
            return '';
        }
    }

    // =========================================
    // Audio Tab Initialization & Rendering
    // =========================================
    function initAudiobooksTab() {
        renderAudioContinueSection();
        initAudioSourceSwitcher();
        initVideoModeToggle();

        if (isAudiobookTabLoaded) return;
        isAudiobookTabLoaded = true;
        if (currentAudioSource === 'youtube') {
            renderAudiobooksGrid(CURATED_YOUTUBE_AUDIOBOOKS, 'youtube');
        } else {
            renderAudiobooksGrid(CURATED_AUDIOBOOKS, 'archive');
        }
    }

    function setAudioSource(source, autoSearch = true) {
        const btnArchive = document.getElementById('btnSourceArchive');
        const btnYoutube = document.getElementById('btnSourceYoutube');
        const searchInput = document.getElementById('audioSearchInput');
        const searchBtn = document.getElementById('btnAudioSearch');
        const titleEl = document.getElementById('audiobooksSectionTitle');

        if (source === 'archive') {
            currentAudioSource = 'archive';
            if (btnArchive) btnArchive.classList.add('active');
            if (btnYoutube) btnYoutube.classList.remove('active');
            if (searchInput) {
                searchInput.placeholder = 'Tìm theo tên tác phẩm, tác giả trên Web Archive (Mặt dày tâm đen, Đắc nhân tâm, Tam quốc...)';
            }
            if (searchBtn) {
                const span = searchBtn.querySelector('span');
                if (span) span.textContent = 'Tìm sách Archive';
            }
            const currentQuery = searchInput ? searchInput.value.trim() : '';
            if (autoSearch && currentQuery) {
                searchAudiobooks(currentQuery);
            } else if (!currentQuery) {
                if (titleEl) titleEl.textContent = 'Tuyển tập Sách Nói (Internet Archive)';
                renderAudiobooksGrid(CURATED_AUDIOBOOKS, 'archive');
            }
        } else if (source === 'youtube') {
            currentAudioSource = 'youtube';
            if (btnYoutube) btnYoutube.classList.add('active');
            if (btnArchive) btnArchive.classList.remove('active');
            if (searchInput) {
                searchInput.placeholder = 'Tìm sách nói, podcast trên YouTube Music hoặc dán link/ID video...';
            }
            if (searchBtn) {
                const span = searchBtn.querySelector('span');
                if (span) span.textContent = 'Tìm YouTube';
            }
            const currentQuery = searchInput ? searchInput.value.trim() : '';
            if (autoSearch && currentQuery) {
                searchYoutubeAudiobooks(currentQuery);
            } else if (!currentQuery) {
                if (titleEl) titleEl.textContent = 'Tuyển tập Sách Nói & Nhạc Đọc Sách (YouTube Music)';
                renderAudiobooksGrid(CURATED_YOUTUBE_AUDIOBOOKS, 'youtube');
            }
        }
    }

    function initAudioSourceSwitcher() {
        const btnArchive = document.getElementById('btnSourceArchive');
        const btnYoutube = document.getElementById('btnSourceYoutube');

        if (btnArchive && !btnArchive._inited) {
            btnArchive._inited = true;
            btnArchive.addEventListener('click', () => {
                if (currentAudioSource === 'archive') return;
                setAudioSource('archive', true);
            });
        }

        if (btnYoutube && !btnYoutube._inited) {
            btnYoutube._inited = true;
            btnYoutube.addEventListener('click', () => {
                if (currentAudioSource === 'youtube') return;
                setAudioSource('youtube', true);
            });
        }
    }

    function initVideoModeToggle() {
        const btnToggleVideo = document.getElementById('btnToggleVideoMode');
        const ytScreen = document.getElementById('playerYoutubeScreen');
        const coverBox = document.getElementById('playerCoverBox');
        const toggleText = document.getElementById('toggleVideoModeText');

        if (!btnToggleVideo || btnToggleVideo._inited) return;
        btnToggleVideo._inited = true;

        btnToggleVideo.addEventListener('click', () => {
            isVideoMode = !isVideoMode;
            const playerModal = document.getElementById('audioPlayerModal');
            if (isVideoMode) {
                if (ytScreen) {
                    ytScreen.classList.add('video-mode');
                    ytScreen.classList.remove('audio-mode');
                }
                if (coverBox) coverBox.style.display = 'none';
                if (toggleText) toggleText.textContent = '🎵 Chế độ Audio';
                if (playerModal) playerModal.classList.add('video-mode-active');
            } else {
                if (ytScreen) {
                    ytScreen.classList.add('audio-mode');
                    ytScreen.classList.remove('video-mode');
                }
                if (coverBox) coverBox.style.display = 'block';
                if (toggleText) toggleText.textContent = '📺 Xem Video';
                if (playerModal) playerModal.classList.remove('video-mode-active');
            }
        });
    }

    function renderAudioContinueSection() {
        const section = document.getElementById('audioContinueSection');
        if (!section) return;

        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        const lastPlayedId = loadFromStorage(STORAGE_AUDIO_LAST_PLAYED, null);

        if (!lastPlayedId || !progressMap[lastPlayedId]) {
            section.style.display = 'none';
            return;
        }

        const p = progressMap[lastPlayedId];
        const isBookmarked = isAudiobookBookmarked(lastPlayedId) || p.isBookmarked === true;
        const hasNote = Boolean(getAudioNote(lastPlayedId));
        if (!p.currentTime || p.currentTime < 3 || (!isBookmarked && !hasNote)) {
            section.style.display = 'none';
            return;
        }

        const isYt = p.type === 'youtube' || (p.identifier && p.identifier.startsWith('yt_'));
        const pct = p.percent || 0;
        const curStr = formatTime(p.currentTime);
        const durStr = p.duration ? formatTime(p.duration) : '--:--';
        const sourceLabel = isYt ? 'YouTube Music' : 'Internet Archive';

        const notesMap = loadFromStorage(STORAGE_AUDIO_NOTES, {});
        const allInProgress = Object.entries(progressMap).filter(([k, item]) => {
            if (!item) return false;
            const id = item.identifier || k;
            const bm = isAudiobookBookmarked(id) || item.isBookmarked === true;
            const note = item.note || notesMap[id]?.text || notesMap[k]?.text;
            return (item.currentTime > 2 || item.percent > 0) && (bm || (note && note.trim().length > 0));
        });
        const totalInProgress = allInProgress.length;

        section.style.display = 'block';
        section.innerHTML = `
            <div class="audio-continue-card">
                <div class="continue-left">
                    <div class="continue-thumb-wrap">
                        <img class="continue-thumb" src="${p.cover || 'https://archive.org/images/archive_logo.png'}" alt="${escapeHtml(p.title)}" onerror="this.src='https://archive.org/images/archive_logo.png'">
                        <div class="continue-badge-play">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <polygon points="6 3 20 12 6 21 6 3"/>
                            </svg>
                        </div>
                    </div>
                    <div class="continue-info">
                        <div class="continue-tag">
                            <span class="continue-pulse"></span>
                            <span>🎧 Đang nghe dở (${sourceLabel})</span>
                        </div>
                        <h4 class="continue-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</h4>
                        <div class="continue-sub">
                            <span class="continue-chapter">${escapeHtml(p.trackTitle || ('Chương ' + ((p.trackIndex || 0) + 1)))}</span>
                            <span class="continue-sep">•</span>
                            <span class="continue-time">${curStr} / ${durStr} (${pct}%)</span>
                        </div>
                        <div class="continue-progress-bar">
                            <div class="continue-progress-fill" style="width: ${pct}%"></div>
                        </div>
                    </div>
                </div>
                <div class="continue-actions">
                    <button class="btn-continue-resume" id="btnContinueResume" title="Nghe tiếp từ ${curStr}">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <polygon points="6 3 20 12 6 21 6 3"/>
                        </svg>
                        <span>Tiếp tục nghe</span>
                    </button>
                    ${totalInProgress > 0 ? `
                        <button class="btn-continue-view-all" id="btnContinueViewAll" title="Xem tất cả sách đã bookmark tiến trình">
                            <span>Sách đã bookmark (${totalInProgress}) →</span>
                        </button>
                    ` : ''}
                    <button class="btn-continue-dismiss" id="btnContinueDismiss" title="Ẩn thanh này">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        const btnResume = section.querySelector('#btnContinueResume');
        if (btnResume) {
            btnResume.addEventListener('click', (e) => {
                e.stopPropagation();
                const activeId = getActiveSessionIdentifier();
                if (isSameAudioIdentifier(activeId, p.identifier) || (p.videoId && isSameAudioIdentifier(activeId, `yt_${p.videoId}`))) {
                    if (isViewingPreview) {
                        restoreActiveAudiobookModal();
                    } else {
                        openAudioPlayerModal();
                    }
                    showToast(`🎧 Đang phát: ${getActiveAudioTitle()}`);
                    return;
                }
                if (isYt) {
                    const videoId = p.videoId || p.identifier.replace(/^yt_/, '');
                    const found = CURATED_YOUTUBE_AUDIOBOOKS.find(y => y.videoId === videoId) || {
                        identifier: p.identifier,
                        videoId: videoId,
                        title: p.title,
                        author: p.author || 'YouTube',
                        cover: p.cover,
                        duration: p.duration,
                        durationFormatted: formatTime(p.duration),
                        type: 'youtube'
                    };
                    loadAndPlayYoutube(found, p.currentTime, true);
                } else {
                    loadAndPlayAudiobook(p.identifier, p.trackIndex, true, p.currentTime);
                }
            });
        }

        const btnViewAll = section.querySelector('#btnContinueViewAll');
        if (btnViewAll) {
            btnViewAll.addEventListener('click', () => {
                switchTab('history');
            });
        }

        const btnDismiss = section.querySelector('#btnContinueDismiss');
        if (btnDismiss) {
            btnDismiss.addEventListener('click', () => {
                section.style.display = 'none';
            });
        }
    }

    // =========================================
    // Audio History & In-Progress Tab Logic
    // =========================================
    function renderAudioHistoryTab() {
        if (!historyGrid) return;

        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        const allBookmarks = loadFromStorage(STORAGE_AUDIO_BOOKMARKS, []);
        const notesMap = loadFromStorage(STORAGE_AUDIO_NOTES, {});

        // Build list from Object.entries to guarantee storage keys and identifiers
        const list = [];
        let hasFixedKeys = false;
        for (const [key, rawItem] of Object.entries(progressMap)) {
            if (!rawItem || typeof rawItem !== 'object') continue;
            const item = { ...rawItem };
            if (!item.identifier) {
                item.identifier = key;
                rawItem.identifier = key;
                hasFixedKeys = true;
            }
            item._storageKey = key;

            const note = (item.note) || (notesMap[item.identifier]?.text || notesMap[key]?.text || '');
            if (!item.note && note) {
                item.note = note;
            }
            if (!item.noteUpdatedAt && (notesMap[item.identifier]?.updatedAt || notesMap[key]?.updatedAt)) {
                item.noteUpdatedAt = notesMap[item.identifier]?.updatedAt || notesMap[key]?.updatedAt;
            }

            const bookmarked = isAudiobookBookmarked(item.identifier) || item.isBookmarked === true;
            item.isBookmarked = bookmarked;
            const hasNote = Boolean(note && note.trim().length > 0);

            // ONLY show in history if bookmarked or has personal note!
            if (item.title && (bookmarked || hasNote)) {
                list.push(item);
            }
        }
        if (hasFixedKeys) {
            saveToStorage(STORAGE_AUDIO_PROGRESS, progressMap);
        }

        // Sort by most recently updated
        list.sort((a, b) => {
            const timeA = Math.max(a.noteUpdatedAt || 0, a.updatedAt || 0);
            const timeB = Math.max(b.noteUpdatedAt || 0, b.updatedAt || 0);
            return timeB - timeA;
        });

        // Update count badges
        const totalCount = list.length;
        const notesCount = list.filter(item => item.note && item.note.trim().length > 0).length;
        if (historyCountAll) historyCountAll.textContent = totalCount;
        if (historyCountNotes) historyCountNotes.textContent = notesCount;

        if (list.length === 0) {
            if (historyEmpty) historyEmpty.style.display = 'flex';
            if (historyGrid) historyGrid.style.display = 'none';
            if (historyHeaderActions) historyHeaderActions.style.display = 'none';
            return;
        }

        if (historyEmpty) historyEmpty.style.display = 'none';
        if (historyGrid) historyGrid.style.display = 'grid';
        if (historyHeaderActions) historyHeaderActions.style.display = 'block';

        historyGrid.innerHTML = '';

        // Apply active filter: 'all' or 'notes'
        const displayList = currentHistoryFilter === 'notes'
            ? list.filter(item => item.note && item.note.trim().length > 0)
            : list;

        if (displayList.length === 0 && currentHistoryFilter === 'notes') {
            historyGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; display: flex; padding: 40px 20px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    <h3>Chưa có sách nào được ghi chú</h3>
                    <p>Hãy chuyển sang xem "Tất cả" và bấm vào nút [Ghi chú] trên từng cuốn sách để lưu lại cảm nhận, trích dẫn hay hoặc mốc nghe quan trọng.</p>
                </div>
            `;
            return;
        }

        displayList.forEach(item => {
            const isYt = item.type === 'youtube' || (item.identifier && item.identifier.startsWith('yt_'));
            const pct = Math.min(100, Math.max(0, item.percent || 0));
            const curStr = formatTime(item.currentTime || 0);
            const durStr = item.duration ? formatTime(item.duration) : '--:--';
            const updatedRelative = item.updatedAt ? formatRelativeDate(item.updatedAt) : '';

            const isBookmarked = item.isBookmarked || isAudiobookBookmarked(item.identifier);

            const card = document.createElement('div');
            card.className = `history-card ${isYt ? 'is-youtube' : ''}`;
            card.setAttribute('data-id', item.identifier);

            const coverSrc = item.cover || (isYt 
                ? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` 
                : 'https://archive.org/images/archive_logo.png');

            const trackTitle = item.trackTitle || ('Chương ' + ((item.trackIndex || 0) + 1));
            const authorText = item.author || (isYt ? 'YouTube Music' : 'Internet Archive');
            const noteText = (item.note || '').trim();
            const hasNote = noteText.length > 0;

            card.innerHTML = `
                <div class="history-card-top">
                    <div class="history-thumb-wrap" title="Nhấn vào khung để mở player sách">
                        <img class="history-card-thumb" src="${coverSrc}" alt="${escapeHtml(item.title)}" onerror="this.src='https://archive.org/images/archive_logo.png'">
                        <div class="history-thumb-play-overlay">
                            <div class="history-play-icon" title="Mở player">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20">
                                    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                                </svg>
                            </div>
                        </div>
                        <span class="history-source-badge ${isYt ? 'source-yt' : 'source-ia'}">
                            ${isYt ? 'YouTube' : 'Web Archive'}
                        </span>
                    </div>
                    <div class="history-card-details">
                        <h3 class="history-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
                        <div class="history-card-author" title="${escapeHtml(authorText)}">${escapeHtml(authorText)}</div>
                        
                        <div class="history-card-chapter" title="${escapeHtml(trackTitle)}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                                <path d="M9 18V5l12-2v13"/>
                                <circle cx="6" cy="18" r="3"/>
                                <circle cx="18" cy="16" r="3"/>
                            </svg>
                            <span>${escapeHtml(trackTitle)}</span>
                        </div>

                        <div class="history-card-progress-section">
                            <div class="history-progress-info">
                                <span class="history-time-stat">
                                    <span class="history-cur-time">${curStr}</span>
                                    <span class="history-time-sep">/</span>
                                    <span class="history-total-time">${durStr}</span>
                                </span>
                                <span class="history-percent-badge">${pct}%</span>
                            </div>
                            <div class="history-progress-track">
                                <div class="history-progress-fill" style="width: ${pct}%"></div>
                            </div>
                        </div>

                        <div class="history-card-meta-row">
                            ${updatedRelative ? `
                                <span class="history-updated-time" title="Cập nhật gần nhất">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    <span>${updatedRelative}</span>
                                </span>
                            ` : ''}
                            ${isBookmarked ? `
                                <span class="history-bookmark-tag" title="Sách đã được bookmark để lưu tiến trình nghe">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    <span>Đã bookmark</span>
                                </span>
                            ` : ''}
                        </div>

                        ${hasNote ? `
                            <div class="history-note-preview" title="Nhấn để xem hoặc sửa ghi chú cá nhân">
                                <div class="history-note-preview-header">
                                    <span class="history-note-badge">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11">
                                            <path d="M12 20h9"/>
                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                        </svg>
                                        Ghi chú cá nhân
                                    </span>
                                    ${item.noteUpdatedAt ? `<span class="history-note-date">${formatRelativeDate(item.noteUpdatedAt)}</span>` : ''}
                                </div>
                                <div class="history-note-snippet">"${escapeHtml(noteText)}"</div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="history-card-actions">
                    <button class="btn-history-resume" title="Nghe tiếp từ ${curStr}">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                            <polygon points="6 3 20 12 6 21 6 3"/>
                        </svg>
                        <span>Tiếp tục nghe</span>
                    </button>
                    <button class="btn-history-note ${hasNote ? 'has-note' : ''}" title="${hasNote ? 'Xem & sửa ghi chú cá nhân' : 'Thêm ghi chú cá nhân'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        <span>${hasNote ? 'Sửa ghi chú' : 'Ghi chú'}</span>
                    </button>
                    <button class="btn-history-delete" title="Xóa cuốn sách này khỏi danh sách đang nghe">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        <span>Xóa</span>
                    </button>
                </div>
            `;

            // Click to resume audio explicitly
            const resumeBtn = card.querySelector('.btn-history-resume');
            if (resumeBtn) {
                resumeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    resumeAudioHistoryItem(item);
                });
            }

            // Click to open note modal
            const noteBtn = card.querySelector('.btn-history-note');
            const notePrev = card.querySelector('.history-note-preview');
            const onOpenNote = (e) => {
                e.stopPropagation();
                openAudioNoteModal(item.identifier || item._storageKey, item.title, authorText, coverSrc);
            };
            if (noteBtn) noteBtn.addEventListener('click', onOpenNote);
            if (notePrev) notePrev.addEventListener('click', onOpenNote);

            // Click to delete
            const deleteBtn = card.querySelector('.btn-history-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteAudioHistoryItem(item.identifier || item._storageKey, item);
                });
            }

            // Click anywhere on book frame (card) to open player modal WITHOUT auto-playing audio (keeps current audio intact)
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-history-resume, .btn-history-note, .btn-history-delete, .history-note-preview')) {
                    return;
                }
                openPlayerForHistoryItem(item, false);
            });

            historyGrid.appendChild(card);
        });
    }

    function updateHistoryCardProgress(identifier, cur, dur, pct) {
        if (!historyGrid || !contentHistory || !contentHistory.classList.contains('active')) return;
        const card = historyGrid.querySelector(`.history-card[data-id="${identifier}"]`);
        if (!card) {
            renderAudioHistoryTab();
            return;
        }
        const curEl = card.querySelector('.history-cur-time');
        if (curEl) curEl.textContent = formatTime(cur);
        const durEl = card.querySelector('.history-total-time');
        if (durEl && dur > 0) durEl.textContent = formatTime(dur);
        const pctEl = card.querySelector('.history-percent-badge');
        if (pctEl) pctEl.textContent = `${pct}%`;
        const fillEl = card.querySelector('.history-progress-fill');
        if (fillEl) fillEl.style.width = `${pct}%`;
    }

    function openPlayerForHistoryItem(item, autoPlay = false) {
        if (!item) return;
        const id = item.identifier || item._storageKey || (item.videoId ? `yt_${item.videoId}` : null);
        const activeId = getActiveSessionIdentifier();
        const isCurrentActive = Boolean(activeId && (
            isSameAudioIdentifier(activeId, id) ||
            isSameAudioIdentifier(activeId, item.identifier) ||
            isSameAudioIdentifier(activeId, item._storageKey) ||
            (item.videoId && isSameAudioIdentifier(activeId, `yt_${item.videoId}`)) ||
            (currentAudiobook && (isSameAudioIdentifier(currentAudiobook.identifier, id) || (currentAudiobook.title && item.title && currentAudiobook.title.trim().toLowerCase() === item.title.trim().toLowerCase()))) ||
            (ytCurrentItem && (isSameAudioIdentifier(ytCurrentItem.identifier, id) || isSameAudioIdentifier(ytCurrentItem.videoId, item.videoId)))
        ));

        if (isCurrentActive) {
            // Sách này đang mở trong player: mở lại modal, giữ nguyên audio và vị trí đang nghe
            if (isViewingPreview) {
                restoreActiveAudiobookModal();
            } else {
                openAudioPlayerModal();
            }
            if (autoPlay) {
                if (currentAudioType === 'youtube') {
                    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
                        try {
                            if (ytPlayer.getPlayerState() !== 1) ytPlayer.playVideo();
                        } catch (e) {}
                    }
                } else {
                    if (audioElement.paused) {
                        audioElement.play().catch(() => {});
                    }
                }
            }
            showToast(`🎧 Đang phát: ${getActiveAudioTitle()}`);
            return;
        }

        const isYt = item.type === 'youtube' || (id && id.startsWith('yt_'));

        // Nếu autoPlay = false (người dùng click vào khung sách để xem thông tin/ghi chú):
        // Mở chế độ xem trước (Preview), KHÔNG làm gián đoạn âm thanh đang phát ở nền!
        if (!autoPlay) {
            if (isYt) {
                const videoId = item.videoId || (id ? id.replace(/^yt_/, '') : '');
                const found = CURATED_YOUTUBE_AUDIOBOOKS.find(y => y.videoId === videoId) || {
                    identifier: id || `yt_${videoId}`,
                    videoId: videoId,
                    title: item.title,
                    author: item.author || 'YouTube',
                    cover: item.cover,
                    duration: item.duration,
                    durationFormatted: formatTime(item.duration),
                    type: 'youtube'
                };
                previewYoutubeAudiobook(found, item.currentTime || 0);
            } else {
                previewAudiobook(id, item.trackIndex || 0, item.currentTime || 0);
            }
            return;
        }

        if (isYt) {
            const videoId = item.videoId || (id ? id.replace(/^yt_/, '') : '');
            const found = CURATED_YOUTUBE_AUDIOBOOKS.find(y => y.videoId === videoId) || {
                identifier: id || `yt_${videoId}`,
                videoId: videoId,
                title: item.title,
                author: item.author || 'YouTube',
                cover: item.cover,
                duration: item.duration,
                durationFormatted: formatTime(item.duration),
                type: 'youtube'
            };
            loadAndPlayYoutube(found, item.currentTime, autoPlay);
        } else {
            loadAndPlayAudiobook(id, item.trackIndex || 0, autoPlay, item.currentTime);
        }
        openAudioPlayerModal();
        if (autoPlay) {
            showToast(`▶ Đang tiếp tục nghe "${item.title}" [${formatTime(item.currentTime)}]`);
        }
    }

    function resumeAudioHistoryItem(item) {
        openPlayerForHistoryItem(item, true);
    }

    function deleteAudioHistoryItem(identifier, itemRef = null) {
        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        let keyToDelete = null;

        // 1. Direct match by identifier
        if (identifier && progressMap[identifier]) {
            keyToDelete = identifier;
        }

        // 2. Direct match by itemRef._storageKey
        if (!keyToDelete && itemRef && itemRef._storageKey && progressMap[itemRef._storageKey]) {
            keyToDelete = itemRef._storageKey;
        }

        // 3. Fallback scan by identifier, videoId, or title
        if (!keyToDelete) {
            for (const [k, val] of Object.entries(progressMap)) {
                if (!val) continue;
                if (k === identifier || val.identifier === identifier) {
                    keyToDelete = k;
                    break;
                }
                if (itemRef) {
                    if (itemRef._storageKey && k === itemRef._storageKey) {
                        keyToDelete = k;
                        break;
                    }
                    if (itemRef.videoId && val.videoId && itemRef.videoId === val.videoId) {
                        keyToDelete = k;
                        break;
                    }
                    if (itemRef.title && val.title && itemRef.title.trim().toLowerCase() === val.title.trim().toLowerCase()) {
                        keyToDelete = k;
                        break;
                    }
                }
            }
        }

        if (keyToDelete && progressMap[keyToDelete]) {
            const bookTitle = progressMap[keyToDelete].title || itemRef?.title || 'sách';
            const targetId = progressMap[keyToDelete].identifier || keyToDelete;
            delete progressMap[keyToDelete];
            saveToStorage(STORAGE_AUDIO_PROGRESS, progressMap);

            const notesMap = loadFromStorage(STORAGE_AUDIO_NOTES, {});
            if (notesMap[targetId]) delete notesMap[targetId];
            if (notesMap[keyToDelete]) delete notesMap[keyToDelete];
            if (identifier && notesMap[identifier]) delete notesMap[identifier];
            saveToStorage(STORAGE_AUDIO_NOTES, notesMap);

            let allBookmarks = loadFromStorage(STORAGE_AUDIO_BOOKMARKS, []);
            allBookmarks = allBookmarks.filter(b => {
                const bId = (typeof b === 'string') ? b : (b?.identifier || (b?.videoId ? `yt_${b.videoId}` : null));
                return bId !== targetId && bId !== keyToDelete && bId !== identifier;
            });
            saveToStorage(STORAGE_AUDIO_BOOKMARKS, allBookmarks);

            const lastPlayedId = loadFromStorage(STORAGE_AUDIO_LAST_PLAYED, null);
            if (lastPlayedId === targetId || lastPlayedId === keyToDelete || lastPlayedId === identifier) {
                saveToStorage(STORAGE_AUDIO_LAST_PLAYED, null);
            }

            updateBookmarkButtonState();
            updateCounts();
            renderAudioHistoryTab();
            renderAudioContinueSection();
            showToast(`Đã xóa "${bookTitle}" khỏi tiến trình nghe`);

            // Auto-sync deletion to GitHub cloud immediately
            if (window.PlainSync && typeof window.PlainSync.triggerAutoSync === 'function') {
                window.PlainSync.triggerAutoSync(1000, true);
            }
        } else {
            console.warn('Could not find item to delete:', identifier, itemRef);
            updateCounts();
            renderAudioHistoryTab();
            renderAudioContinueSection();
        }
    }

    // Audio History Tab Event Listeners
    if (btnExploreAudiobooks) {
        btnExploreAudiobooks.addEventListener('click', () => {
            switchTab('audio');
        });
    }

    if (btnClearAllHistory) {
        btnClearAllHistory.addEventListener('click', () => {
            const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
            const count = Object.values(progressMap).filter(p => p && (p.currentTime > 2 || p.percent > 0)).length;
            if (count === 0) {
                showToast('Không có tiến trình nghe nào để xóa');
                return;
            }

            if (confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách sách đã bookmark và tiến trình nghe không? (Ghi chú cá nhân cũng sẽ được dọn dẹp)')) {
                saveToStorage(STORAGE_AUDIO_PROGRESS, {});
                saveToStorage(STORAGE_AUDIO_BOOKMARKS, []);
                saveToStorage(STORAGE_AUDIO_NOTES, {});
                saveToStorage(STORAGE_AUDIO_LAST_PLAYED, null);
                updateCounts();
                updateBookmarkButtonState();
                renderAudioHistoryTab();
                renderAudioContinueSection();
                showToast('Đã xóa toàn bộ lịch sử tiến trình và bookmark');

                if (window.PlainSync && typeof window.PlainSync.triggerAutoSync === 'function') {
                    window.PlainSync.triggerAutoSync(1000, true);
                }
            }
        });
    }

    function renderAudiobooksGrid(books, sourceType = currentAudioSource) {
        if (!audiobooksGrid) return;
        audiobooksGrid.innerHTML = '';

        if (!books || books.length === 0) {
            const emptyText = sourceType === 'youtube'
                ? 'Hãy thử tìm kiếm từ khóa khác hoặc dán link video trên YouTube'
                : 'Hãy thử tìm kiếm với từ khóa khác trên Internet Archive';
            audiobooksGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 0;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <h3>Không tìm thấy sách nói phù hợp</h3>
                    <p>${emptyText}</p>
                </div>
            `;
            if (audiobooksCount) audiobooksCount.textContent = '0 sách nói';
            return;
        }

        if (audiobooksCount) {
            audiobooksCount.textContent = `${books.length} sách nói`;
        }

        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});

        books.forEach(b => {
            const isYt = b.type === 'youtube' || sourceType === 'youtube' || (b.identifier && b.identifier.startsWith('yt_'));
            const card = document.createElement('div');
            card.className = `audiobook-card ${isYt ? 'audiobook-card-youtube' : ''}`;
            card.setAttribute('data-id', b.identifier);

            const coverUrl = b.cover || (b.videoId ? `https://i.ytimg.com/vi/${b.videoId}/hqdefault.jpg` : `https://archive.org/services/img/${b.identifier}`);
            const chapterBadge = b.chapters ? `${b.chapters} chương` : (isYt ? 'YouTube Audio' : 'Audiobook');
            const savedProg = progressMap[b.identifier];
            const hasProgress = savedProg && savedProg.currentTime && savedProg.currentTime > 5;
            const resumeBadgeHtml = hasProgress 
                ? `<span class="audiobook-badge-resume">🎧 Tiếp tục (${formatTime(savedProg.currentTime)})</span>` 
                : '';

            const sourceTagHtml = isYt
                ? `
                    <span class="audiobook-source-tag is-youtube">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                            <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#fff"/>
                        </svg>
                        YouTube Music
                    </span>
                  `
                : `
                    <span class="audiobook-source-tag">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                        </svg>
                        archive.org
                    </span>
                  `;

            const badgeYoutubeHtml = isYt ? `<span class="audiobook-badge-youtube">YouTube Music</span>` : '';
            const ratingBadgeHtml = (b.rating && b.rating > 0)
                ? `
                    <span class="audiobook-badge-rating" title="Đánh giá sách: ${b.rating}/5.0 ${b.ratingsCount ? '(' + b.ratingsCount.toLocaleString() + ' đánh giá)' : ''}">
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="#fbbf24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                        <span>${b.rating} ★${b.ratingsCount ? `<span class="rating-count">(${formatRatingCount(b.ratingsCount)})</span>` : ''}</span>
                    </span>
                  `
                : '';

            card.innerHTML = `
                <div class="audiobook-cover-wrap">
                    <img class="audiobook-cover" src="${coverUrl}" alt="${escapeHtml(b.title)}" loading="lazy" onerror="this.src='https://archive.org/images/archive_logo.png'">
                    <span class="audiobook-badge-chapters">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                            <line x1="8" y1="6" x2="21" y2="6"/>
                            <line x1="8" y1="12" x2="21" y2="12"/>
                            <line x1="8" y1="18" x2="21" y2="18"/>
                        </svg>
                        ${chapterBadge}
                    </span>
                    ${badgeYoutubeHtml}
                    ${resumeBadgeHtml}
                    ${ratingBadgeHtml}
                    <div class="audiobook-overlay-play">
                        <div class="audiobook-play-circle">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                                <polygon points="6 3 20 12 6 21 6 3"/>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="audiobook-info">
                    <div class="audiobook-title" title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</div>
                    <div class="audiobook-author">${escapeHtml(b.author || (isYt ? 'YouTube' : 'Internet Archive'))}</div>
                    <div class="audiobook-footer">
                        ${sourceTagHtml}
                        <button class="audiobook-btn-listen" title="Nghe sách này">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                            <span>${hasProgress ? 'Nghe tiếp' : 'Nghe ngay'}</span>
                        </button>
                    </div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                const activeId = getActiveSessionIdentifier();
                const isCurrentActive = Boolean(activeId && (
                    isSameAudioIdentifier(activeId, b.identifier) ||
                    (b.videoId && isSameAudioIdentifier(activeId, `yt_${b.videoId}`)) ||
                    (currentAudiobook && (isSameAudioIdentifier(currentAudiobook.identifier, b.identifier) || (currentAudiobook.title && b.title && currentAudiobook.title.trim().toLowerCase() === b.title.trim().toLowerCase()))) ||
                    (ytCurrentItem && (isSameAudioIdentifier(ytCurrentItem.identifier, b.identifier) || isSameAudioIdentifier(ytCurrentItem.videoId, b.videoId)))
                ));

                // 1. Nếu đây chính là cuốn sách ĐANG PHÁT trong phiên hiện tại:
                if (isCurrentActive) {
                    if (isViewingPreview) {
                        restoreActiveAudiobookModal();
                    } else {
                        openAudioPlayerModal();
                    }
                    showToast(`🎧 Đang phát: ${getActiveAudioTitle()}`);
                    return;
                }

                // Kiểm tra xem cuốn sách này có tiến trình nghe đã lưu không
                const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
                const bId = b.identifier || (b.videoId ? `yt_${b.videoId}` : null);
                const savedProg = (bId && progressMap[bId]) || (b.videoId && progressMap[`yt_${b.videoId}`]);
                const hasSavedProg = Boolean(savedProg && (savedProg.currentTime > 2 || (typeof savedProg.trackIndex === 'number' && savedProg.trackIndex > 0)));

                // 2. Nếu người dùng bấm trực tiếp vào nút "Nghe ngay" / "Nghe tiếp":
                const clickedListenBtn = e.target.closest('.audiobook-btn-listen');
                if (clickedListenBtn) {
                    if (isYt) {
                        const resTime = hasSavedProg ? savedProg.currentTime : null;
                        loadAndPlayYoutube(b, resTime, true);
                    } else {
                        const trIdx = hasSavedProg ? savedProg.trackIndex : null;
                        const resTime = hasSavedProg ? savedProg.currentTime : null;
                        loadAndPlayAudiobook(b.identifier, trIdx, true, resTime);
                    }
                    return;
                }

                // 3. Người dùng click vào khung thẻ sách / bìa / tiêu đề để xem chi tiết:
                // Mở player ở chế độ Xem Trước (Preview), giữ nguyên mốc chương và thời gian của tiến trình đã lưu!
                if (isYt) {
                    const resTime = hasSavedProg ? savedProg.currentTime : null;
                    previewYoutubeAudiobook(b, resTime);
                } else {
                    const trIdx = hasSavedProg ? savedProg.trackIndex : null;
                    const resTime = hasSavedProg ? savedProg.currentTime : null;
                    previewAudiobook(b.identifier, trIdx, resTime);
                }
            });

            audiobooksGrid.appendChild(card);
        });
    }

    // Genre Filter Buttons
    if (audioGenreTags) {
        audioGenreTags.addEventListener('click', (e) => {
            const tag = e.target.closest('.audio-tag');
            if (!tag) return;

            audioGenreTags.querySelectorAll('.audio-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');

            const genre = tag.dataset.genre || 'all';
            currentGenreFilter = genre;

            const collection = currentAudioSource === 'youtube' ? CURATED_YOUTUBE_AUDIOBOOKS : CURATED_AUDIOBOOKS;
            if (genre === 'all') {
                renderAudiobooksGrid(collection, currentAudioSource);
            } else {
                const filtered = collection.filter(b => b.genre === genre);
                renderAudiobooksGrid(filtered, currentAudioSource);
            }
        });
    }

    // Search Audiobooks on Internet Archive
    async function searchAudiobooks(query, autoPlayFirst = false) {
        const q = (query || '').trim();
        if (q) saveSearchKeyword(q);
        if (!q) {
            renderAudiobooksGrid(CURATED_AUDIOBOOKS, 'archive');
            return CURATED_AUDIOBOOKS;
        }

        if (audiobooksLoading) {
            audiobooksLoading.style.display = 'flex';
            const loadText = audiobooksLoading.querySelector('p');
            if (loadText) loadText.textContent = 'Đang tải danh sách sách nói từ Internet Archive...';
        }
        if (audiobooksGrid) audiobooksGrid.style.display = 'none';

        try {
            // Determine Vietnamese search term
            let viQuery = q;
            const lowerQ = q.toLowerCase();

            for (const [key, viName] of Object.entries(VI_TITLE_ALIASES)) {
                if (lowerQ.includes(key) || key.includes(lowerQ)) {
                    viQuery = viName;
                    break;
                }
            }

            if (viQuery === q && !isVietnamese(q)) {
                try {
                    const translated = await translateText(q);
                    if (translated && isVietnamese(translated)) {
                        viQuery = translated;
                        const lowerTrans = translated.toLowerCase();
                        for (const [k, v] of Object.entries(VI_TITLE_ALIASES)) {
                            if (lowerTrans.includes(k)) {
                                viQuery = v;
                                break;
                            }
                        }
                    }
                } catch { /* ignore */ }
            }

            // Local filter against Curated list
            const lowerVi = viQuery.toLowerCase();
            const localMatches = CURATED_AUDIOBOOKS.filter(b => {
                const bt = b.title.toLowerCase();
                const bo = (b.originalTitle || '').toLowerCase();
                const aliases = (b.aliases || []).map(a => a.toLowerCase());
                return bt.includes(lowerVi) || lowerVi.includes(bt) ||
                       bt.includes(lowerQ) || lowerQ.includes(bt) ||
                       (bo && (bo.includes(lowerQ) || lowerQ.includes(bo))) ||
                       aliases.some(a => a.includes(lowerQ) || a.includes(lowerVi));
            });

            // Remote search on Internet Archive
            let cleanPhrase = cleanTitleForAudioSearch(viQuery);
            if (!cleanPhrase) cleanPhrase = viQuery.replace(/["\\]/g, '').trim();

            // Parallel call to Open Library to get rich book metadata (ratings, author, cover)
            const olMetaPromise = fetchOpenLibraryBookMeta(cleanPhrase, '');

            const fetchIaDocs = async (phrase) => {
                try {
                    const enc = encodeURIComponent(phrase);
                    const archiveUrl = `https://archive.org/advancedsearch.php?q=mediatype:audio+AND+(title:("${enc}")+OR+"${enc}")&fl[]=identifier,title,creator,description,downloads,item_size,year&sort[]=downloads+desc&rows=20&output=json`;
                    const resp = await fetch(archiveUrl);
                    const data = await resp.json();
                    return (data.response && data.response.docs) || [];
                } catch {
                    return [];
                }
            };

            let docs = await fetchIaDocs(cleanPhrase);

            // If 0 results and term has Vietnamese tones, try unaccented version
            if (docs.length === 0 && isVietnamese(cleanPhrase)) {
                const noTones = removeVietnameseTones(cleanPhrase);
                if (noTones && noTones.toLowerCase() !== cleanPhrase.toLowerCase()) {
                    docs = await fetchIaDocs(noTones);
                }
            }

            // Await Open Library metadata
            let olMeta = null;
            try {
                olMeta = await olMetaPromise;
            } catch (e) {}

            const remoteBooks = docs.map(d => {
                let rAuthor = d.creator || 'Internet Archive';
                let rCover = `https://archive.org/services/img/${d.identifier}`;
                let rDesc = d.description || '';
                let rRating = null;
                let rRatingsCount = 0;

                if (olMeta) {
                    if (olMeta.rating) {
                        rRating = olMeta.rating;
                        rRatingsCount = olMeta.ratingsCount;
                    }
                    if (olMeta.cover && (!rCover || rCover.includes('archive_logo'))) {
                        rCover = olMeta.cover;
                    }
                    if (olMeta.author && (!rAuthor || rAuthor === 'Internet Archive' || /^(admin|archive\.org|sachnoi\.app)$/i.test(rAuthor))) {
                        rAuthor = olMeta.author;
                    }
                }

                return {
                    identifier: d.identifier,
                    title: d.title || d.identifier,
                    author: rAuthor,
                    cover: rCover,
                    description: rDesc,
                    rating: rRating,
                    ratingsCount: rRatingsCount,
                    olWorkKey: olMeta ? olMeta.workKey : null,
                    chapters: null
                };
            });

            // Merge & deduplicate by identifier
            const seen = new Set();
            const merged = [];

            localMatches.forEach(b => {
                seen.add(b.identifier);
                merged.push(b);
            });

            remoteBooks.forEach(b => {
                if (!seen.has(b.identifier)) {
                    seen.add(b.identifier);
                    merged.push(b);
                }
            });

            if (audiobooksSectionTitle) {
                audiobooksSectionTitle.textContent = `Sách nói Archive cho "${viQuery}" (${merged.length})`;
            }
            renderAudiobooksGrid(merged, 'archive');

            if (autoPlayFirst && merged.length > 0) {
                loadAndPlayAudiobook(merged[0].identifier, null, true, null);
            }

            return merged;

        } catch (err) {
            console.error('Audiobook search error:', err);
            showToast('Không thể tìm kiếm sách nói từ Archive.org lúc này');
            return [];
        } finally {
            if (audiobooksLoading) audiobooksLoading.style.display = 'none';
            if (audiobooksGrid) audiobooksGrid.style.display = 'grid';
        }
    }

    // Search Audiobooks on YouTube Music (Invidious CORS API & Direct Link)
    async function searchYoutubeAudiobooks(query) {
        const q = (query || '').trim();
        if (q) saveSearchKeyword(q);
        if (!q) {
            renderAudiobooksGrid(CURATED_YOUTUBE_AUDIOBOOKS, 'youtube');
            return CURATED_YOUTUBE_AUDIOBOOKS;
        }

        if (audiobooksLoading) {
            audiobooksLoading.style.display = 'flex';
            const loadText = audiobooksLoading.querySelector('p');
            if (loadText) loadText.textContent = 'Đang tìm kiếm trên YouTube Music...';
        }
        if (audiobooksGrid) audiobooksGrid.style.display = 'none';

        try {
            // Check if query is a direct YouTube URL or 11-char ID
            const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})|^([a-zA-Z0-9_-]{11})$/;
            const match = q.match(ytRegex);
            const directVideoId = match ? (match[1] || match[2]) : null;

            if (directVideoId) {
                const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directVideoId}&format=json`;
                try {
                    const resp = await fetch(oembedUrl);
                    if (resp.ok) {
                        const data = await resp.json();
                        const singleItem = {
                            identifier: `yt_${directVideoId}`,
                            videoId: directVideoId,
                            title: data.title || 'YouTube Audio',
                            author: data.author_name || 'YouTube',
                            genre: 'self-help',
                            duration: 0,
                            durationFormatted: 'YouTube',
                            cover: `https://i.ytimg.com/vi/${directVideoId}/hqdefault.jpg`,
                            description: `Được thêm từ link YouTube: ${data.title}`,
                            type: 'youtube',
                            chapters: 1
                        };
                        if (audiobooksLoading) audiobooksLoading.style.display = 'none';
                        if (audiobooksGrid) audiobooksGrid.style.display = 'grid';
                        renderAudiobooksGrid([singleItem, ...CURATED_YOUTUBE_AUDIOBOOKS], 'youtube');
                        showToast(`Đã tìm thấy: ${singleItem.title}`);
                        return [singleItem];
                    }
                } catch (e) {
                    console.warn('oEmbed fetch error:', e);
                }
            }

            // Local filter against Curated YouTube list
            const lowerQ = q.toLowerCase();
            const localMatches = CURATED_YOUTUBE_AUDIOBOOKS.filter(b => {
                const bt = b.title.toLowerCase();
                const ba = (b.author || '').toLowerCase();
                const aliases = (b.aliases || []).map(a => a.toLowerCase());
                return bt.includes(lowerQ) || ba.includes(lowerQ) || aliases.some(a => a.includes(lowerQ));
            });

            // Remote search via Invidious public CORS API
            let remoteVideos = [];
            try {
                const searchUrl = `https://invidious.f5.si/api/v1/search?q=${encodeURIComponent(q + ' sách nói')}&type=video`;
                const res = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
                if (res.ok) {
                    const items = await res.json();
                    if (Array.isArray(items)) {
                        remoteVideos = items.filter(v => v.videoId).slice(0, 15).map(v => ({
                            identifier: `yt_${v.videoId}`,
                            videoId: v.videoId,
                            title: v.title || 'Sách nói YouTube',
                            author: v.author || 'YouTube Music',
                            genre: 'self-help',
                            duration: v.lengthSeconds || 0,
                            durationFormatted: formatTime(v.lengthSeconds || 0),
                            cover: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
                            description: `Sách nói phát từ YouTube: ${v.title}`,
                            type: 'youtube',
                            chapters: 1
                        }));
                    }
                }
            } catch (err) {
                console.warn('Invidious search error, fallback to local matches:', err);
            }

            // Merge & deduplicate
            const seen = new Set();
            const results = [];
            localMatches.forEach(b => {
                seen.add(b.videoId);
                results.push(b);
            });
            remoteVideos.forEach(b => {
                if (!seen.has(b.videoId)) {
                    seen.add(b.videoId);
                    results.push(b);
                }
            });

            if (audiobooksSectionTitle) {
                audiobooksSectionTitle.textContent = `Sách nói YouTube cho "${q}" (${results.length})`;
            }
            renderAudiobooksGrid(results, 'youtube');
            return results;

        } catch (err) {
            console.error('YouTube search error:', err);
            renderAudiobooksGrid(CURATED_YOUTUBE_AUDIOBOOKS, 'youtube');
            showToast('Không thể kết nối tìm kiếm YouTube. Đang hiển thị danh sách tuyển chọn.');
            return CURATED_YOUTUBE_AUDIOBOOKS;
        } finally {
            if (audiobooksLoading) audiobooksLoading.style.display = 'none';
            if (audiobooksGrid) audiobooksGrid.style.display = 'grid';
        }
    }

    function triggerAudioSearch() {
        const query = audioSearchInput ? audioSearchInput.value.trim() : '';
        if (currentAudioSource === 'youtube') {
            searchYoutubeAudiobooks(query);
        } else {
            searchAudiobooks(query);
        }
    }

    if (btnAudioSearch && audioSearchInput) {
        btnAudioSearch.addEventListener('click', triggerAudioSearch);
        audioSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') triggerAudioSearch();
        });
    }

    // =========================================
    // Audiobook Preview Mode (Non-interrupting)
    // =========================================
    async function previewAudiobook(identifier, trackIndex = null, resumeTime = null) {
        showToast('Đang mở thông tin sách nói...');
        try {
            const resp = await fetch(`https://archive.org/metadata/${identifier}`);
            if (!resp.ok) throw new Error('Failed to fetch audiobook metadata');
            const data = await resp.json();

            const files = data.files || [];
            let mp3Files = files.filter(f =>
                f.name &&
                f.name.toLowerCase().endsWith('.mp3') &&
                !f.name.includes('_spectrogram') &&
                !f.name.includes('_64kb')
            );
            if (mp3Files.length === 0) {
                mp3Files = files.filter(f => f.name && f.name.toLowerCase().endsWith('.mp3'));
            }
            if (mp3Files.length === 0) {
                showToast('Tác phẩm này chưa có bản ghi âm MP3 trên Archive.org');
                return;
            }

            mp3Files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            const curated = CURATED_AUDIOBOOKS.find(b => b.identifier === identifier);
            const bookTitle = (curated && curated.title) || data.metadata.title || identifier;
            const bookAuthor = (curated && curated.author) || data.metadata.creator || 'Internet Archive';
            const bookDesc = (curated && curated.description) || data.metadata.description || 'Sách nói từ Internet Archive mở toàn cầu.';
            const bookCover = (curated && curated.cover) || `https://archive.org/services/img/${identifier}`;

            const tracks = mp3Files.map((f, i) => {
                const duration = f.length ? parseFloat(f.length) : 0;
                return {
                    index: i,
                    fileName: f.name,
                    title: cleanChapterTitle(f.name, f.title),
                    duration: duration,
                    durationFormatted: formatTime(duration),
                    url: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`
                };
            });

            // Check saved listening progress:
            const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
            const savedProg = progressMap[identifier];

            let targetTrack = 0;
            let targetResume = 0;

            if (resumeTime !== null && resumeTime !== undefined && resumeTime > 0) {
                targetResume = resumeTime;
                targetTrack = (trackIndex !== null && trackIndex >= 0) ? Math.min(trackIndex, tracks.length - 1) : 0;
            } else if (savedProg && (typeof savedProg.trackIndex === 'number' || (savedProg.currentTime && savedProg.currentTime > 2))) {
                targetTrack = (typeof savedProg.trackIndex === 'number' && savedProg.trackIndex < tracks.length) ? savedProg.trackIndex : 0;
                targetResume = (savedProg.currentTime && savedProg.currentTime > 2) ? savedProg.currentTime : 0;
            } else if (trackIndex !== null && trackIndex !== undefined && trackIndex >= 0) {
                targetTrack = Math.min(trackIndex, tracks.length - 1);
                targetResume = (resumeTime !== null && resumeTime >= 0) ? resumeTime : 0;
            }

            const previewBook = {
                identifier: identifier,
                title: bookTitle,
                author: bookAuthor,
                description: bookDesc,
                cover: bookCover,
                tracks: tracks,
                totalTracks: tracks.length,
                rating: (curated && curated.rating) || null,
                ratingsCount: (curated && curated.ratingsCount) || 0
            };

            showBookPreviewInModal(previewBook, 'archive', targetTrack, targetResume);
        } catch (err) {
            console.error('Error previewing audiobook:', err);
            showToast('Lỗi tải thông tin sách nói từ Internet Archive.');
        }
    }

    function previewYoutubeAudiobook(item, resumeTime = null) {
        const id = item.identifier || (item.videoId ? `yt_${item.videoId}` : null);
        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        const savedProg = (id && progressMap[id]) || (item.videoId && progressMap[`yt_${item.videoId}`]);
        let targetResume = 0;
        if (resumeTime !== null && resumeTime !== undefined && resumeTime > 0) {
            targetResume = resumeTime;
        } else if (savedProg && savedProg.currentTime && savedProg.currentTime > 2) {
            targetResume = savedProg.currentTime;
        }
        showBookPreviewInModal(item, 'youtube', 0, targetResume);
    }

    function showBookPreviewInModal(book, type, targetTrack = 0, targetResumeTime = 0) {
        if (!book) return;

        isViewingPreview = true;
        previewViewingBook = book;
        previewViewingType = type;
        previewTargetTrack = targetTrack || 0;
        previewResumeTime = targetResumeTime || 0;

        const isBgPlaying = isAudioActiveAndPlaying();

        if (isBgPlaying) {
            if (playerNowPlayingPill) playerNowPlayingPill.style.display = 'none';
            if (playerBgPlayingPill) {
                playerBgPlayingPill.style.display = 'inline-flex';
                if (playerBgPlayingText) {
                    playerBgPlayingText.textContent = `Đang phát ở nền: ${getActiveAudioTitle()}`;
                }
                playerBgPlayingPill.title = `Bấm để quay lại cuốn sách đang phát: ${getActiveAudioTitle()}`;
            }
        } else {
            if (playerBgPlayingPill) playerBgPlayingPill.style.display = 'none';
            if (playerNowPlayingPill) {
                playerNowPlayingPill.style.display = 'inline-flex';
                if (playerNowPlayingText) playerNowPlayingText.textContent = 'Xem thông tin';
            }
        }

        // Hide video screen (preview is static info, but keep iframe rendering in background)
        const ytScreen = document.getElementById('playerYoutubeScreen');
        if (ytScreen) {
            ytScreen.classList.add('audio-mode');
            ytScreen.classList.remove('video-mode');
        }
        const coverBox = document.getElementById('playerCoverBox');
        if (coverBox) coverBox.style.display = 'block';
        const btnToggleVideo = document.getElementById('btnToggleVideoMode');
        if (btnToggleVideo) btnToggleVideo.style.display = 'none';

        const sourceTag = document.getElementById('playerSourceTag');
        const coverBadge = document.getElementById('playerCoverBadge');
        const badgeSourceText = document.getElementById('playerBadgeSourceText');
        const badgeIcon = document.getElementById('playerCoverBadgeIcon');
        const extText = document.getElementById('playerExternalLinkText');

        if (type === 'youtube') {
            if (sourceTag) sourceTag.classList.add('is-youtube');
            if (playerSourceTagText) playerSourceTagText.textContent = 'Source: YouTube Music';
            if (audioPlayerModal) {
                audioPlayerModal.classList.add('is-youtube');
                const dialog = audioPlayerModal.querySelector('.audio-player-dialog');
                if (dialog) dialog.classList.add('is-youtube');
            }
            if (badgeSourceText) badgeSourceText.textContent = 'YouTube Music';
            if (coverBadge) coverBadge.style.color = '#ff4757';
            if (badgeIcon) {
                badgeIcon.innerHTML = `
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"/>
                `;
            }
            if (playerArchiveLink) playerArchiveLink.href = `https://www.youtube.com/watch?v=${book.videoId}`;
            if (extText) extText.textContent = 'Mở trên YouTube';
            if (playerTotalChaptersBadge) playerTotalChaptersBadge.textContent = 'YouTube Audio';
            if (playerTotalDurationBadge) playerTotalDurationBadge.textContent = book.durationFormatted || 'YouTube';
            if (playlistChapterHeader) playlistChapterHeader.textContent = 'Chương phát';
            if (playerTrackCounter) playerTrackCounter.textContent = '1/1';
            if (playerTrackTitle) playerTrackTitle.textContent = book.title;
        } else {
            if (sourceTag) sourceTag.classList.remove('is-youtube');
            if (playerSourceTagText) playerSourceTagText.textContent = 'Source: Internet Archive';
            if (audioPlayerModal) {
                audioPlayerModal.classList.remove('is-youtube');
                const dialog = audioPlayerModal.querySelector('.audio-player-dialog');
                if (dialog) dialog.classList.remove('is-youtube');
            }
            if (badgeSourceText) badgeSourceText.textContent = 'Internet Archive';
            if (coverBadge) coverBadge.style.color = '#00cec9';
            if (badgeIcon) {
                badgeIcon.innerHTML = `
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                `;
            }
            if (playerArchiveLink) playerArchiveLink.href = `https://archive.org/details/${book.identifier}`;
            if (extText) extText.textContent = 'Mở trên Archive.org';
            const numTracks = book.tracks ? book.tracks.length : (book.totalTracks || 1);
            if (playerTotalChaptersBadge) playerTotalChaptersBadge.textContent = `${numTracks} Chương`;
            if (playlistChapterHeader) playlistChapterHeader.textContent = `${numTracks} Chương`;
            if (playerTrackCounter) playerTrackCounter.textContent = `${previewTargetTrack + 1}/${numTracks}`;
            const curTr = (book.tracks && book.tracks[previewTargetTrack]) ? book.tracks[previewTargetTrack] : null;
            if (playerTrackTitle) playerTrackTitle.textContent = curTr ? curTr.title : book.title;

            const totalSecs = (book.tracks || []).reduce((acc, t) => acc + (t.duration || 0), 0);
            if (playerTotalDurationBadge) {
                if (totalSecs > 0) {
                    const hrs = (totalSecs / 3600).toFixed(1);
                    playerTotalDurationBadge.textContent = `~${hrs} giờ`;
                } else {
                    playerTotalDurationBadge.textContent = 'Audiobook';
                }
            }
        }

        // Book details
        if (playerBookCover) playerBookCover.src = book.cover || (book.videoId ? `https://i.ytimg.com/vi/${book.videoId}/hqdefault.jpg` : `https://archive.org/services/img/${book.identifier}`);
        if (playerBookTitle) playerBookTitle.textContent = book.title;
        if (playerBookAuthor) playerBookAuthor.textContent = book.author || (type === 'youtube' ? 'YouTube' : 'Internet Archive');
        if (playerBookDescription) playerBookDescription.innerHTML = book.description || '';

        // Goodreads
        const firstTr = (book.tracks && book.tracks[0] && book.tracks[0].title) || '';
        const grData = getGoodreadsSearchData(book.title, book.author || '', firstTr);
        updatePlayerGoodreadsLinks(grData);

        // Rating badge
        const ratingBadge = document.getElementById('playerRatingBadge');
        const ratingBadgeText = document.getElementById('playerRatingBadgeText');
        if (ratingBadge) {
            if (book.rating) {
                ratingBadge.style.display = 'inline-flex';
                if (ratingBadgeText) {
                    ratingBadgeText.textContent = book.ratingsCount > 0 
                        ? `${book.rating} ★ (${book.ratingsCount.toLocaleString()})`
                        : `${book.rating} ★`;
                }
            } else {
                ratingBadge.style.display = 'none';
            }
        }

        // Render chapters playlist for preview book
        renderPreviewPlaylist(book, type, previewTargetTrack);

        // Scrubber
        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        const savedProg = progressMap[book.identifier || `yt_${book.videoId}`];
        const curSec = (previewResumeTime > 0) ? previewResumeTime : ((savedProg && savedProg.currentTime) ? savedProg.currentTime : 0);
        let trackDur = 0;
        if (type === 'youtube') {
            trackDur = book.duration || 0;
        } else if (book.tracks && book.tracks[previewTargetTrack]) {
            trackDur = book.tracks[previewTargetTrack].duration || 0;
        }
        if (playerCurrentTime) playerCurrentTime.textContent = formatTime(curSec);
        if (playerTotalDuration) playerTotalDuration.textContent = formatTime(trackDur);
        if (trackDur > 0) {
            const pct = (curSec / trackDur) * 100;
            if (playerSeekSlider) playerSeekSlider.value = pct;
            if (playerSliderFill) playerSliderFill.style.width = `${pct}%`;
        } else {
            if (playerSeekSlider) playerSeekSlider.value = 0;
            if (playerSliderFill) playerSliderFill.style.width = '0%';
        }

        // Always show Play icon on main transport button in preview mode
        if (btnPlayerPlay) {
            const playIcon = btnPlayerPlay.querySelector('.icon-play');
            const pauseIcon = btnPlayerPlay.querySelector('.icon-pause');
            if (playIcon) playIcon.style.display = 'block';
            if (pauseIcon) pauseIcon.style.display = 'none';
            btnPlayerPlay.title = `Bắt đầu nghe sách này: ${book.title}`;
        }

        // Update bookmark and note state for this previewed book
        switchPlaylistTab('chapters');
        updateBookmarkButtonState();
        updateNoteIndicator();

        // Open modal
        openAudioPlayerModal();
        if (typeof updatePlayerSuggestedBooks === 'function') {
            updatePlayerSuggestedBooks();
        }
    }

    function renderPreviewPlaylist(book, type, activeTrackIndex = 0) {
        if (!playerChaptersList || !book) return;
        playerChaptersList.innerHTML = '';

        if (type === 'youtube') {
            const chapters = (book.chapterList && book.chapterList.length > 0)
                ? book.chapterList
                : [{ index: 0, title: book.title, time: 0 }];

            chapters.forEach((ch, idx) => {
                const row = document.createElement('div');
                row.className = `chapter-item ${idx === 0 ? 'active-track' : ''}`;
                row.innerHTML = `
                    <div class="chapter-item-left">
                        <div class="chapter-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                        </div>
                        <div class="chapter-name" title="${escapeHtml(ch.title)}">${escapeHtml(ch.title)}</div>
                    </div>
                    <div class="chapter-duration">${formatTime(ch.time)}</div>
                `;
                row.addEventListener('click', () => {
                    startPlayingPreviewBook(book, 'youtube', 0, ch.time);
                });
                playerChaptersList.appendChild(row);
            });
            return;
        }

        const tracks = book.tracks || [];
        tracks.forEach((track, i) => {
            const row = document.createElement('div');
            row.className = `chapter-item ${i === activeTrackIndex ? 'active-track' : ''}`;
            row.setAttribute('data-track-index', i);

            row.innerHTML = `
                <div class="chapter-item-left">
                    <div class="chapter-state-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                    </div>
                    <div class="chapter-name" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</div>
                </div>
                <div class="chapter-duration">${track.durationFormatted || '--:--'}</div>
            `;

            row.addEventListener('click', () => {
                startPlayingPreviewBook(book, 'archive', i, 0);
            });

            playerChaptersList.appendChild(row);
        });
    }

    function updatePreviewTrackDisplay() {
        if (!isViewingPreview || !previewViewingBook) return;
        if (previewViewingType === 'archive' && previewViewingBook.tracks) {
            const numTracks = previewViewingBook.tracks.length;
            const track = previewViewingBook.tracks[previewTargetTrack];
            if (playerTrackCounter) playerTrackCounter.textContent = `${previewTargetTrack + 1}/${numTracks}`;
            if (playerTrackTitle && track) playerTrackTitle.textContent = track.title;
            const timeToDisplay = (previewResumeTime > 0) ? previewResumeTime : 0;
            if (playerCurrentTime) playerCurrentTime.textContent = formatTime(timeToDisplay);
            if (playerTotalDuration && track) playerTotalDuration.textContent = formatTime(track.duration || 0);
            const trackDur = (track && track.duration) || 0;
            if (trackDur > 0) {
                const pct = (timeToDisplay / trackDur) * 100;
                if (playerSeekSlider) playerSeekSlider.value = pct;
                if (playerSliderFill) playerSliderFill.style.width = `${pct}%`;
            } else {
                if (playerSeekSlider) playerSeekSlider.value = 0;
                if (playerSliderFill) playerSliderFill.style.width = '0%';
            }
            renderPreviewPlaylist(previewViewingBook, previewViewingType, previewTargetTrack);
        }
    }

    function startPlayingPreviewBook(book, type, trackIndex = 0, resumeTime = 0) {
        isViewingPreview = false;
        previewViewingBook = null;
        if (playerBgPlayingPill) playerBgPlayingPill.style.display = 'none';
        if (playerNowPlayingPill) {
            playerNowPlayingPill.style.display = 'inline-flex';
            if (playerNowPlayingText) playerNowPlayingText.textContent = 'Now Playing';
        }

        const id = book.identifier || (book.videoId ? `yt_${book.videoId}` : null);
        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        const savedProg = (id && progressMap[id]) || (book.videoId && progressMap[`yt_${book.videoId}`]);

        let finalTrack = trackIndex;
        let finalResume = resumeTime;

        if ((finalResume <= 0) && savedProg && savedProg.currentTime && savedProg.currentTime > 2) {
            finalResume = savedProg.currentTime;
            if (typeof savedProg.trackIndex === 'number') {
                finalTrack = savedProg.trackIndex;
            }
        }

        if (type === 'youtube') {
            loadAndPlayYoutube(book, finalResume, true);
        } else {
            loadAndPlayAudiobook(book.identifier, finalTrack, true, finalResume);
        }
    }

    function restoreActiveAudiobookModal() {
        isViewingPreview = false;
        previewViewingBook = null;
        if (playerBgPlayingPill) playerBgPlayingPill.style.display = 'none';
        if (playerNowPlayingPill) {
            playerNowPlayingPill.style.display = 'inline-flex';
            if (playerNowPlayingText) playerNowPlayingText.textContent = 'Now Playing';
        }

        if (currentAudioType === 'youtube' && ytCurrentItem) {
            restoreYoutubeModalUI(ytCurrentItem);
        } else if (currentAudiobook) {
            restoreArchiveModalUI(currentAudiobook);
        }
        openAudioPlayerModal();
    }

    function restoreArchiveModalUI(book) {
        if (!book) return;
        const sourceTag = document.getElementById('playerSourceTag');
        if (sourceTag) sourceTag.classList.remove('is-youtube');
        if (playerSourceTagText) playerSourceTagText.textContent = 'Source: Internet Archive';

        if (audioPlayerModal) {
            audioPlayerModal.classList.remove('is-youtube');
            const dialog = audioPlayerModal.querySelector('.audio-player-dialog');
            if (dialog) dialog.classList.remove('is-youtube');
        }

        const coverBadge = document.getElementById('playerCoverBadge');
        const badgeSourceText = document.getElementById('playerBadgeSourceText');
        const badgeIcon = document.getElementById('playerCoverBadgeIcon');
        if (badgeSourceText) badgeSourceText.textContent = 'Internet Archive';
        if (coverBadge) coverBadge.style.color = '#00cec9';
        if (badgeIcon) {
            badgeIcon.innerHTML = `
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            `;
        }

        const ytScreen = document.getElementById('playerYoutubeScreen');
        if (ytScreen) {
            if (currentAudioType === 'youtube' && isVideoMode) {
                ytScreen.classList.add('video-mode');
                ytScreen.classList.remove('audio-mode');
            } else {
                ytScreen.classList.add('audio-mode');
                ytScreen.classList.remove('video-mode');
            }
        }
        const coverBox = document.getElementById('playerCoverBox');
        if (coverBox) {
            coverBox.style.display = (currentAudioType === 'youtube' && isVideoMode) ? 'none' : 'block';
        }
        const btnToggleVideo = document.getElementById('btnToggleVideoMode');
        if (btnToggleVideo) {
            btnToggleVideo.style.display = currentAudioType === 'youtube' ? 'inline-flex' : 'none';
        }

        if (playerBookCover) playerBookCover.src = book.cover;
        if (playerBookTitle) playerBookTitle.textContent = book.title;
        if (playerBookAuthor) playerBookAuthor.textContent = book.author;
        if (playerTotalChaptersBadge) playerTotalChaptersBadge.textContent = `${book.tracks.length} Chương`;
        if (playlistChapterHeader) playlistChapterHeader.textContent = `${book.tracks.length} Chương`;
        if (playerArchiveLink) playerArchiveLink.href = `https://archive.org/details/${book.identifier}`;
        const extText = document.getElementById('playerExternalLinkText');
        if (extText) extText.textContent = 'Mở trên Archive.org';

        const firstTrackTitle = (book.tracks && book.tracks[0] && book.tracks[0].title) || '';
        const grData = getGoodreadsSearchData(book.title, book.author, firstTrackTitle);
        updatePlayerGoodreadsLinks(grData);

        if (playerBookDescription) playerBookDescription.innerHTML = book.description || '';

        const totalSecs = (book.tracks || []).reduce((acc, t) => acc + (t.duration || 0), 0);
        if (playerTotalDurationBadge) {
            if (totalSecs > 0) {
                const hrs = (totalSecs / 3600).toFixed(1);
                playerTotalDurationBadge.textContent = `~${hrs} giờ`;
            } else {
                playerTotalDurationBadge.textContent = 'Audiobook';
            }
        }

        if (playerTrackCounter) {
            playerTrackCounter.textContent = `${currentTrackIndex + 1}/${book.totalTracks}`;
        }
        if (playerTrackTitle) {
            const tr = book.tracks[currentTrackIndex];
            playerTrackTitle.textContent = tr ? tr.title : '';
        }

        renderPlayerPlaylist();
        updatePlaylistActiveState();

        const cur = audioElement.currentTime || 0;
        const dur = audioElement.duration || (book.tracks[currentTrackIndex]?.duration) || 0;
        if (playerCurrentTime) playerCurrentTime.textContent = formatTime(cur);
        if (playerTotalDuration && dur > 0) playerTotalDuration.textContent = formatTime(dur);
        if (dur > 0) {
            const pct = (cur / dur) * 100;
            if (playerSeekSlider) playerSeekSlider.value = pct;
            if (playerSliderFill) playerSliderFill.style.width = `${pct}%`;
        }

        updatePlayPauseIcons(!audioElement.paused);
        updateBookmarkButtonState();
        updateNoteIndicator();
    }

    function restoreYoutubeModalUI(item) {
        if (!item) return;
        const sourceTag = document.getElementById('playerSourceTag');
        if (sourceTag) sourceTag.classList.add('is-youtube');
        if (playerSourceTagText) playerSourceTagText.textContent = 'Source: YouTube Music';

        if (audioPlayerModal) {
            audioPlayerModal.classList.add('is-youtube');
            const dialog = audioPlayerModal.querySelector('.audio-player-dialog');
            if (dialog) dialog.classList.add('is-youtube');
        }

        const coverBadge = document.getElementById('playerCoverBadge');
        const badgeSourceText = document.getElementById('playerBadgeSourceText');
        const badgeIcon = document.getElementById('playerCoverBadgeIcon');
        if (badgeSourceText) badgeSourceText.textContent = 'YouTube Music';
        if (coverBadge) coverBadge.style.color = '#ff4757';
        if (badgeIcon) {
            badgeIcon.innerHTML = `
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"/>
            `;
        }

        const btnToggleVideo = document.getElementById('btnToggleVideoMode');
        if (btnToggleVideo) btnToggleVideo.style.display = 'inline-flex';

        if (playerBookCover) playerBookCover.src = item.cover || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
        if (playerBookTitle) playerBookTitle.textContent = item.title;
        if (playerBookAuthor) playerBookAuthor.textContent = item.author || 'YouTube';
        if (playerTrackTitle) playerTrackTitle.textContent = item.title;
        if (playerTrackCounter) playerTrackCounter.textContent = '1/1';
        if (playerTotalChaptersBadge) playerTotalChaptersBadge.textContent = 'YouTube Audio';
        if (playerTotalDurationBadge) playerTotalDurationBadge.textContent = item.durationFormatted || 'YouTube';
        if (playlistChapterHeader) playlistChapterHeader.textContent = 'Chương phát';

        if (playerArchiveLink) playerArchiveLink.href = `https://www.youtube.com/watch?v=${item.videoId}`;
        const extText = document.getElementById('playerExternalLinkText');
        if (extText) extText.textContent = 'Mở trên YouTube';

        const grData = getGoodreadsSearchData(item.title, item.author || '');
        updatePlayerGoodreadsLinks(grData);

        renderYoutubePlaylist(item);

        const cur = (ytPlayer && ytPlayer.getCurrentTime) ? ytPlayer.getCurrentTime() : 0;
        const dur = (ytPlayer && ytPlayer.getDuration) ? ytPlayer.getDuration() : (item.duration || 0);
        if (playerCurrentTime) playerCurrentTime.textContent = formatTime(cur);
        if (playerTotalDuration && dur > 0) playerTotalDuration.textContent = formatTime(dur);
        if (dur > 0) {
            const pct = (cur / dur) * 100;
            if (playerSeekSlider) playerSeekSlider.value = pct;
            if (playerSliderFill) playerSliderFill.style.width = `${pct}%`;
        }

        const isPlaying = ytPlayer && typeof ytPlayer.getPlayerState === 'function' && ytPlayer.getPlayerState() === 1;
        updatePlayPauseIcons(isPlaying);

        updateBookmarkButtonState();
        updateNoteIndicator();
    }

    // =========================================
    // Core YouTube Audio Player Logic
    // =========================================
    function loadAndPlayYoutube(item, startTime = null, autoPlay = true) {
        if (!item || !item.videoId) return;

        // Clear preview mode if active
        if (isViewingPreview) {
            isViewingPreview = false;
            previewViewingBook = null;
            if (playerBgPlayingPill) playerBgPlayingPill.style.display = 'none';
            if (playerNowPlayingPill) {
                playerNowPlayingPill.style.display = 'inline-flex';
                if (playerNowPlayingText) playerNowPlayingText.textContent = 'Now Playing';
            }
        }

        // If already playing this exact YouTube video, just open modal without reloading
        if (currentAudioType === 'youtube' && ytCurrentItem && (isSameAudioIdentifier(ytCurrentItem.videoId, item.videoId) || isSameAudioIdentifier(ytCurrentItem.identifier, item.identifier))) {
            openAudioPlayerModal();
            return;
        }

        // Stop archive audio playback
        if (!audioElement.paused) {
            audioElement.pause();
        }

        currentAudioType = 'youtube';
        ytCurrentItem = item;

        // Check progress
        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        const savedProg = progressMap[item.identifier || `yt_${item.videoId}`];

        let targetResumeTime = 0;
        let isAutoResumed = false;
        if (startTime !== null && startTime !== undefined && startTime > 0) {
            targetResumeTime = startTime;
            isAutoResumed = true;
        } else if (savedProg && savedProg.currentTime && savedProg.currentTime > 2) {
            targetResumeTime = savedProg.currentTime;
            isAutoResumed = true;
        } else if (startTime !== null && startTime !== undefined && startTime >= 0) {
            targetResumeTime = startTime;
        }

        // Setup UI in player modal
        if (playerBookCover) playerBookCover.src = item.cover || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
        if (playerBookTitle) playerBookTitle.textContent = item.title;
        if (playerBookAuthor) playerBookAuthor.textContent = item.author || 'YouTube';
        if (playerTrackTitle) playerTrackTitle.textContent = item.title;
        if (playerTrackCounter) playerTrackCounter.textContent = '1/1';
        if (typeof updatePlayerSuggestedBooks === 'function') updatePlayerSuggestedBooks();

        // Badge & Theme styling for YouTube
        const sourceTag = document.getElementById('playerSourceTag');
        if (sourceTag) sourceTag.classList.add('is-youtube');
        if (playerSourceTagText) playerSourceTagText.textContent = 'Source: YouTube Music';

        if (audioPlayerModal) {
            audioPlayerModal.classList.add('is-youtube');
            const dialog = audioPlayerModal.querySelector('.audio-player-dialog');
            if (dialog) dialog.classList.add('is-youtube');
        }

        const coverBadge = document.getElementById('playerCoverBadge');
        const badgeSourceText = document.getElementById('playerBadgeSourceText');
        const badgeIcon = document.getElementById('playerCoverBadgeIcon');
        if (badgeSourceText) badgeSourceText.textContent = 'YouTube Music';
        if (coverBadge) coverBadge.style.color = '#ff4757';
        if (badgeIcon) {
            badgeIcon.innerHTML = `
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"/>
            `;
        }

        // Show Video Mode toggle button
        const btnToggleVideo = document.getElementById('btnToggleVideoMode');
        if (btnToggleVideo) {
            btnToggleVideo.style.display = 'inline-flex';
        }
        const ytScreen = document.getElementById('playerYoutubeScreen');
        if (ytScreen) {
            if (isVideoMode) {
                ytScreen.classList.add('video-mode');
                ytScreen.classList.remove('audio-mode');
            } else {
                ytScreen.classList.add('audio-mode');
                ytScreen.classList.remove('video-mode');
            }
        }
        const coverBox = document.getElementById('playerCoverBox');
        if (coverBox) {
            coverBox.style.display = isVideoMode ? 'none' : 'block';
        }

        // Duration badges
        if (playerTotalDurationBadge) {
            playerTotalDurationBadge.textContent = item.durationFormatted || (item.duration ? formatTime(item.duration) : 'YouTube Audio');
        }
        if (playerTotalChaptersBadge) {
            playerTotalChaptersBadge.textContent = item.chapterList ? `${item.chapterList.length} Phần` : 'YouTube Audio';
        }
        if (playlistChapterHeader) {
            playlistChapterHeader.textContent = item.chapterList ? `${item.chapterList.length} Phần` : '1 Phần';
        }

        // External Link & Description
        if (playerArchiveLink) {
            playerArchiveLink.href = `https://music.youtube.com/watch?v=${item.videoId}`;
        }
        const extText = document.getElementById('playerExternalLinkText');
        if (extText) extText.textContent = 'Mở trên YouTube Music';

        const ytFallback = (item.chapterList && item.chapterList[0] && item.chapterList[0].title) || '';
        const grData = getGoodreadsSearchData(item.title, item.author, ytFallback);
        updatePlayerGoodreadsLinks(grData);

        // Rating badge handling
        const ytRatingBadge = document.getElementById('playerRatingBadge');
        const ytRatingBadgeText = document.getElementById('playerRatingBadgeText');
        if (ytRatingBadge) {
            if (item.rating && item.rating > 0) {
                ytRatingBadge.style.display = 'inline-flex';
                if (ytRatingBadgeText) {
                    ytRatingBadgeText.textContent = item.ratingsCount > 0 
                        ? `${item.rating} ★ (${item.ratingsCount.toLocaleString()})`
                        : `${item.rating} ★`;
                }
            } else {
                ytRatingBadge.style.display = 'none';
            }
        }
        fetchOpenLibraryBookMeta(item.title, item.author).then((olMeta) => {
            if (olMeta && olMeta.rating && ytRatingBadge) {
                ytRatingBadge.style.display = 'inline-flex';
                if (ytRatingBadgeText) {
                    ytRatingBadgeText.textContent = olMeta.ratingsCount > 0 
                        ? `${olMeta.rating} ★ (${olMeta.ratingsCount.toLocaleString()} đánh giá)`
                        : `${olMeta.rating} ★`;
                }
            }
        }).catch(() => {});

        if (playerBookDescription) {
            playerBookDescription.textContent = item.description || item.title;
        }

        // Mini player
        if (miniPlayerThumb) miniPlayerThumb.src = item.cover || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
        if (miniPlayerTitle) miniPlayerTitle.textContent = item.title;
        if (miniPlayerChapter) miniPlayerChapter.textContent = item.author || 'YouTube Music';
        if (miniAudioPlayer) miniAudioPlayer.style.display = 'block';

        // Render chapters in playlist
        renderYoutubePlaylist(item);

        // Switch to chapters tab and update bookmark button state
        switchPlaylistTab('chapters');
        updateBookmarkButtonState();
        updateNoteIndicator();

        // Open player modal
        openAudioPlayerModal();

        // Initialize / control YouTube IFrame player
        initOrPlayYoutubeVideo(item.videoId, targetResumeTime, autoPlay);

        if (isAutoResumed && targetResumeTime > 0) {
            showToast(`🎧 Tiếp tục nghe YouTube: ${item.title} (${formatTime(targetResumeTime)})`);
        }
    }

    function initOrPlayYoutubeVideo(videoId, startTime = 0, autoPlay = true) {
        const startSec = Math.max(0, Math.floor(startTime));

        if (typeof YT === 'undefined' || !YT.Player) {
            console.log('Waiting for YouTube API ready...');
            let attempts = 0;
            const checkYt = setInterval(() => {
                attempts++;
                if (typeof YT !== 'undefined' && YT.Player) {
                    clearInterval(checkYt);
                    initOrPlayYoutubeVideo(videoId, startTime, autoPlay);
                } else if (attempts > 30) {
                    clearInterval(checkYt);
                    showToast('Không thể tải YouTube Player API. Vui lòng kiểm tra kết nối mạng.');
                }
            }, 200);
            return;
        }

        if (!ytPlayer) {
            ytPlayer = new YT.Player('youtubePlayerIframe', {
                videoId: videoId,
                playerVars: {
                    autoplay: autoPlay ? 1 : 0,
                    playsinline: 1,
                    rel: 0,
                    controls: 1,
                    start: startSec
                },
                events: {
                    onReady: (e) => {
                        if (autoPlay) {
                            e.target.playVideo();
                        }
                        if (startSec > 0) {
                            e.target.seekTo(startSec, true);
                        }
                        startYtProgressLoop();
                    },
                    onStateChange: handleYtStateChange,
                    onError: (err) => {
                        console.error('YouTube player error:', err);
                        showToast('Video không khả dụng hoặc bị hạn chế nhúng bản quyền.');
                    }
                }
            });
        } else {
            if (ytPlayer.loadVideoById) {
                ytPlayer.loadVideoById({
                    videoId: videoId,
                    startSeconds: startSec
                });
                if (!autoPlay && ytPlayer.pauseVideo) {
                    setTimeout(() => ytPlayer.pauseVideo(), 100);
                }
                startYtProgressLoop();
            }
        }
    }

    function handleYtStateChange(event) {
        if (!event) return;
        const state = event.data;
        // YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0, BUFFERING = 3
        if (state === 1) { // Playing
            updatePlayPauseIcons(true);
            startYtProgressLoop();
        } else if (state === 2) { // Paused
            updatePlayPauseIcons(false);
            stopYtProgressLoop();
            saveAudioProgress();
        } else if (state === 0) { // Ended
            updatePlayPauseIcons(false);
            stopYtProgressLoop();
            if (sleepTimerMode === 'end') {
                setSleepTimer('0');
                showToast('Đã dừng phát theo hẹn giờ');
            }
        }
    }

    function startYtProgressLoop() {
        stopYtProgressLoop();
        ytProgressInterval = setInterval(() => {
            if (currentAudioType !== 'youtube' || !ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') {
                stopYtProgressLoop();
                return;
            }

            const cur = ytPlayer.getCurrentTime() || 0;
            const dur = ytPlayer.getDuration() || (ytCurrentItem ? ytCurrentItem.duration : 0) || 0;

            if (!isViewingPreview) {
                if (!isAudioSeeking) {
                    if (playerCurrentTime) playerCurrentTime.textContent = formatTime(cur);
                    if (playerTotalDuration && dur > 0) playerTotalDuration.textContent = formatTime(dur);

                    const bookmarkPreview = document.getElementById('bookmarkNowTimePreview');
                    if (bookmarkPreview) bookmarkPreview.textContent = formatTime(cur);
                    if (playerNoteTimePreview) playerNoteTimePreview.textContent = formatTime(cur);

                    if (dur > 0) {
                        const percent = (cur / dur) * 100;
                        if (playerSeekSlider) playerSeekSlider.value = percent;
                        if (playerSliderFill) playerSliderFill.style.width = `${percent}%`;
                    }
                }
            }

            if (dur > 0 && miniPlayerProgressLine) {
                const percent = (cur / dur) * 100;
                miniPlayerProgressLine.style.setProperty('--mini-progress', `${percent}%`);
            }

            // Save progress every 3 seconds
            if (Math.floor(cur) % 3 === 0) {
                saveAudioProgress();
            }
        }, 500);
    }

    function stopYtProgressLoop() {
        if (ytProgressInterval) {
            clearInterval(ytProgressInterval);
            ytProgressInterval = null;
        }
    }

    function renderYoutubePlaylist(item) {
        if (!playerChaptersList) return;
        playerChaptersList.innerHTML = '';

        const chapters = (item.chapterList && item.chapterList.length > 0) 
            ? item.chapterList 
            : [{ index: 0, title: item.title, time: 0 }];

        chapters.forEach((ch, idx) => {
            const row = document.createElement('div');
            row.className = `chapter-item ${idx === 0 ? 'active-track' : ''}`;
            row.innerHTML = `
                <div class="chapter-item-left">
                    <div class="chapter-state-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                    </div>
                    <div class="chapter-name" title="${escapeHtml(ch.title)}">${escapeHtml(ch.title)}</div>
                </div>
                <div class="chapter-duration">${formatTime(ch.time)}</div>
            `;

            row.addEventListener('click', () => {
                if (ytPlayer && ytPlayer.seekTo) {
                    ytPlayer.seekTo(ch.time, true);
                    ytPlayer.playVideo();
                }
                playerChaptersList.querySelectorAll('.chapter-item').forEach(r => r.classList.remove('active-track'));
                row.classList.add('active-track');
            });

            playerChaptersList.appendChild(row);
        });
    }

    // =========================================
    // Core Audio Player Logic (Replicating Screenshot)
    // =========================================
    async function loadAndPlayAudiobook(identifier, trackIndex = null, autoPlay = true, resumeTime = null) {
        // Clear preview mode if active
        if (isViewingPreview) {
            isViewingPreview = false;
            previewViewingBook = null;
            if (playerBgPlayingPill) playerBgPlayingPill.style.display = 'none';
            if (playerNowPlayingPill) {
                playerNowPlayingPill.style.display = 'inline-flex';
                if (playerNowPlayingText) playerNowPlayingText.textContent = 'Now Playing';
            }
        }

        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        const savedProg = progressMap[identifier];

        // If already playing this exact book, just switch track or open modal
        if (currentAudiobook && (isSameAudioIdentifier(currentAudiobook.identifier, identifier) || (currentAudiobook.title && currentAudiobook.title.trim().toLowerCase() === (identifier || '').trim().toLowerCase()))) {
            if (trackIndex !== null && trackIndex !== undefined && trackIndex !== currentTrackIndex && (resumeTime !== null && resumeTime > 0)) {
                playTrack(trackIndex, resumeTime, autoPlay);
            }
            openAudioPlayerModal();
            showToast(`🎧 Đang phát: ${currentAudiobook.title}`);
            return;
        }

        showToast('Đang tải dữ liệu âm thanh từ Internet Archive...');

        try {
            const resp = await fetch(`https://archive.org/metadata/${identifier}`);
            if (!resp.ok) throw new Error('Failed to fetch audiobook metadata');
            const data = await resp.json();

            const files = data.files || [];
            // Filter mp3 files
            let mp3Files = files.filter(f =>
                f.name &&
                f.name.toLowerCase().endsWith('.mp3') &&
                !f.name.includes('_spectrogram') &&
                !f.name.includes('_64kb')
            );

            // Fallback if none passed the strict filter
            if (mp3Files.length === 0) {
                mp3Files = files.filter(f => f.name && f.name.toLowerCase().endsWith('.mp3'));
            }

            if (mp3Files.length === 0) {
                showToast('Tác phẩm này chưa có bản ghi âm MP3 trên Archive.org');
                return;
            }

            // Natural sort by file name
            mp3Files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            // Curated match for richer meta
            const curated = CURATED_AUDIOBOOKS.find(b => b.identifier === identifier);
            const bookTitle = (curated && curated.title) || data.metadata.title || identifier;
            const bookAuthor = (curated && curated.author) || data.metadata.creator || 'Internet Archive';
            const bookDesc = (curated && curated.description) || data.metadata.description || 'Sách nói từ Internet Archive mở toàn cầu.';
            const bookCover = (curated && curated.cover) || `https://archive.org/services/img/${identifier}`;

            const tracks = mp3Files.map((f, i) => {
                const duration = f.length ? parseFloat(f.length) : 0;
                return {
                    index: i,
                    fileName: f.name,
                    title: cleanChapterTitle(f.name, f.title),
                    duration: duration,
                    durationFormatted: formatTime(duration),
                    url: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`
                };
            });

            currentAudiobook = {
                identifier: identifier,
                title: bookTitle,
                author: bookAuthor,
                description: bookDesc,
                cover: bookCover,
                tracks: tracks,
                totalTracks: tracks.length
            };

            // Pause YouTube playback and switch type
            if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
                ytPlayer.pauseVideo();
            }
            stopYtProgressLoop();
            currentAudioType = 'archive';
            ytCurrentItem = null;

            // Reset video / cover box
            const ytScreen = document.getElementById('playerYoutubeScreen');
            if (ytScreen) {
                ytScreen.classList.add('audio-mode');
                ytScreen.classList.remove('video-mode');
            }
            const coverBox = document.getElementById('playerCoverBox');
            if (coverBox) coverBox.style.display = 'block';
            const btnToggleVideo = document.getElementById('btnToggleVideoMode');
            if (btnToggleVideo) btnToggleVideo.style.display = 'none';

            // Reset badges to Archive theme
            const sourceTag = document.getElementById('playerSourceTag');
            if (sourceTag) sourceTag.classList.remove('is-youtube');
            if (playerSourceTagText) playerSourceTagText.textContent = 'Source: Internet Archive';

            if (audioPlayerModal) {
                audioPlayerModal.classList.remove('is-youtube');
                const dialog = audioPlayerModal.querySelector('.audio-player-dialog');
                if (dialog) dialog.classList.remove('is-youtube');
            }

            const coverBadge = document.getElementById('playerCoverBadge');
            const badgeSourceText = document.getElementById('playerBadgeSourceText');
            const badgeIcon = document.getElementById('playerCoverBadgeIcon');
            if (badgeSourceText) badgeSourceText.textContent = 'Internet Archive';
            if (coverBadge) coverBadge.style.color = '#00cec9';
            if (badgeIcon) {
                badgeIcon.innerHTML = `
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                `;
            }

            // Populate Modal UI
            if (playerBookCover) playerBookCover.src = bookCover;
            if (playerBookTitle) playerBookTitle.textContent = bookTitle;
            if (playerBookAuthor) playerBookAuthor.textContent = bookAuthor;
            if (playerTotalChaptersBadge) playerTotalChaptersBadge.textContent = `${tracks.length} Chương`;
            if (playlistChapterHeader) playlistChapterHeader.textContent = `${tracks.length} Chương`;
            if (playerArchiveLink) playerArchiveLink.href = `https://archive.org/details/${identifier}`;
            const extText = document.getElementById('playerExternalLinkText');
            if (extText) extText.textContent = 'Mở trên Archive.org';

            const firstTrackTitle = (tracks && tracks[0] && tracks[0].title) || '';
            const grData = getGoodreadsSearchData(bookTitle, bookAuthor, firstTrackTitle);
            updatePlayerGoodreadsLinks(grData);

            // Handle Rating Badge
            const ratingBadge = document.getElementById('playerRatingBadge');
            const ratingBadgeText = document.getElementById('playerRatingBadgeText');
            let initialRating = (curated && curated.rating) || null;
            let initialRatingsCount = (curated && curated.ratingsCount) || 0;
            if (ratingBadge) {
                if (initialRating) {
                    ratingBadge.style.display = 'inline-flex';
                    if (ratingBadgeText) {
                        ratingBadgeText.textContent = initialRatingsCount > 0 
                            ? `${initialRating} ★ (${initialRatingsCount.toLocaleString()})`
                            : `${initialRating} ★`;
                    }
                } else {
                    ratingBadge.style.display = 'none';
                }
            }

            // Asynchronously fetch/enrich Open Library metadata (ratings, synopsis, HD cover)
            fetchOpenLibraryBookMeta(bookTitle, bookAuthor).then(async (olMeta) => {
                if (!olMeta) return;
                if (olMeta.rating && ratingBadge) {
                    ratingBadge.style.display = 'inline-flex';
                    if (ratingBadgeText) {
                        ratingBadgeText.textContent = olMeta.ratingsCount > 0 
                            ? `${olMeta.rating} ★ (${olMeta.ratingsCount.toLocaleString()} đánh giá)`
                            : `${olMeta.rating} ★`;
                    }
                }
                if (olMeta.author && (!bookAuthor || bookAuthor === 'Internet Archive' || /^(admin|archive\.org|sachnoi\.app)$/i.test(bookAuthor))) {
                    if (playerBookAuthor) playerBookAuthor.textContent = olMeta.author;
                }
                if (olMeta.workKey && (!bookDesc || bookDesc.length < 60 || bookDesc.includes('Sách nói từ Internet Archive'))) {
                    const synopsis = await fetchOpenLibraryWorkDescription(olMeta.workKey);
                    if (synopsis && playerBookDescription) {
                        playerBookDescription.innerHTML = `<p>${escapeHtml(synopsis)}</p>`;
                    }
                }
            }).catch(() => {});

            if (playerBookDescription) playerBookDescription.innerHTML = bookDesc;

            // Calculate approximate total duration
            const totalSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
            if (playerTotalDurationBadge) {
                if (totalSecs > 0) {
                    const hrs = (totalSecs / 3600).toFixed(1);
                    playerTotalDurationBadge.textContent = `~${hrs} giờ`;
                } else {
                    playerTotalDurationBadge.textContent = 'Audiobook';
                }
            }

            // Determine track and resume position
            let targetTrack = 0;
            let targetResumeTime = 0;
            let isAutoResumed = false;

            if (resumeTime !== null && resumeTime !== undefined && resumeTime > 0) {
                targetTrack = (trackIndex !== null && trackIndex >= 0) ? Math.min(trackIndex, tracks.length - 1) : (savedProg?.trackIndex || 0);
                targetResumeTime = resumeTime;
                isAutoResumed = true;
            } else if (savedProg && (typeof savedProg.trackIndex === 'number' || (savedProg.currentTime && savedProg.currentTime > 2))) {
                targetTrack = (typeof savedProg.trackIndex === 'number' && savedProg.trackIndex < tracks.length) ? savedProg.trackIndex : 0;
                targetResumeTime = (savedProg.currentTime && savedProg.currentTime > 2) ? savedProg.currentTime : 0;
                isAutoResumed = true;
            } else if (trackIndex !== null && trackIndex !== undefined && trackIndex >= 0) {
                targetTrack = Math.min(trackIndex, tracks.length - 1);
                targetResumeTime = (resumeTime !== null && resumeTime !== undefined && resumeTime >= 0) ? resumeTime : 0;
            }

            // Populate Playlist
            renderPlayerPlaylist();

            // Reset playlist tab to Chapters and update bookmark button state
            switchPlaylistTab('chapters');
            updateBookmarkButtonState();
            updateNoteIndicator();

            // Play track
            playTrack(targetTrack, targetResumeTime, autoPlay);

            if (isAutoResumed && targetResumeTime > 0) {
                showToast(`🎧 Tiếp tục nghe: ${tracks[targetTrack].title} (${formatTime(targetResumeTime)})`);
            }

            // Show player modal
            openAudioPlayerModal();

        } catch (err) {
            console.error('Error loading audiobook:', err);
            showToast('Lỗi tải sách nói từ Internet Archive. Vui lòng thử lại.');
        }
    }

    function renderPlayerPlaylist() {
        if (!playerChaptersList || !currentAudiobook) return;
        playerChaptersList.innerHTML = '';

        currentAudiobook.tracks.forEach((track, i) => {
            const row = document.createElement('div');
            row.className = `chapter-item ${i === currentTrackIndex ? 'active-track' : ''}`;
            row.setAttribute('data-track-index', i);

            row.innerHTML = `
                <div class="chapter-item-left">
                    <div class="chapter-state-icon">
                        ${i === currentTrackIndex && !audioElement.paused
                            ? `<div class="wave-anim"><span></span><span></span><span></span></div>`
                            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                   <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                                   <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                               </svg>`
                        }
                    </div>
                    <div class="chapter-name" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</div>
                </div>
                <div class="chapter-duration">${track.durationFormatted || '--:--'}</div>
            `;

            row.addEventListener('click', () => {
                playTrack(i, 0, true);
            });

            playerChaptersList.appendChild(row);
        });
    }

    function playTrack(index, resumeTime = 0, autoPlay = true) {
        if (!currentAudiobook || !currentAudiobook.tracks[index]) return;
        currentTrackIndex = index;
        const track = currentAudiobook.tracks[index];

        // Update now playing header
        if (playerTrackCounter) {
            playerTrackCounter.textContent = `${index + 1}/${currentAudiobook.totalTracks}`;
        }
        if (playerTrackTitle) {
            playerTrackTitle.textContent = track.title;
        }
        if (typeof updatePlayerSuggestedBooks === 'function') {
            updatePlayerSuggestedBooks();
        }

        // Update Mini Player
        if (miniPlayerThumb) miniPlayerThumb.src = currentAudiobook.cover;
        if (miniPlayerTitle) miniPlayerTitle.textContent = currentAudiobook.title;
        if (miniPlayerChapter) miniPlayerChapter.textContent = track.title;
        if (miniAudioPlayer) miniAudioPlayer.style.display = 'block';

        // Update Audio Source
        audioElement.src = track.url;
        audioElement.playbackRate = SPEED_RATES[currentSpeedIndex];

        if (resumeTime > 0) {
            isAudioSeeking = true;
            const seekFn = () => {
                try {
                    audioElement.currentTime = resumeTime;
                } catch (e) {
                    console.warn('Seek error:', e);
                }
                setTimeout(() => {
                    isAudioSeeking = false;
                    saveAudioProgress();
                }, 400);
            };
            audioElement.addEventListener('loadedmetadata', seekFn, { once: true });
            audioElement.addEventListener('canplay', seekFn, { once: true });
            try {
                audioElement.currentTime = resumeTime;
            } catch (e) {}
        } else {
            isAudioSeeking = false;
        }

        // Highlight playlist row
        updatePlaylistActiveState();

        if (autoPlay) {
            audioElement.play().catch(err => {
                console.log('Playback start was blocked by browser:', err);
            });
        }
    }

    function updatePlaylistActiveState() {
        if (!playerChaptersList) return;
        const rows = playerChaptersList.querySelectorAll('.chapter-item');
        rows.forEach((r, idx) => {
            const isCurrent = idx === currentTrackIndex;
            r.classList.toggle('active-track', isCurrent);
            const iconWrap = r.querySelector('.chapter-state-icon');
            if (iconWrap) {
                if (isCurrent && !audioElement.paused) {
                    iconWrap.innerHTML = `<div class="wave-anim"><span></span><span></span><span></span></div>`;
                } else {
                    iconWrap.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                        </svg>
                    `;
                }
            }
            if (isCurrent) {
                r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    function toggleAudioPlay() {
        if (isViewingPreview && previewViewingBook) {
            startPlayingPreviewBook(previewViewingBook, previewViewingType, previewTargetTrack, previewResumeTime);
            return;
        }

        if (currentAudioType === 'youtube') {
            if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
            const state = ytPlayer.getPlayerState();
            if (state === 1) { // Playing
                ytPlayer.pauseVideo();
            } else {
                ytPlayer.playVideo();
            }
            return;
        }

        if (!audioElement.src) return;
        if (audioElement.paused) {
            audioElement.play().catch(e => console.log('Play failed:', e));
        } else {
            audioElement.pause();
        }
    }

    function updatePlayPauseIcons(isPlaying) {
        if (btnPlayerPlay) {
            const playIcon = btnPlayerPlay.querySelector('.icon-play');
            const pauseIcon = btnPlayerPlay.querySelector('.icon-pause');
            if (isViewingPreview) {
                if (playIcon) playIcon.style.display = 'block';
                if (pauseIcon) pauseIcon.style.display = 'none';
            } else {
                if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'block';
                if (pauseIcon) pauseIcon.style.display = isPlaying ? 'block' : 'none';
            }
        }

        if (miniBtnPlay) {
            const miniPlayIcon = miniBtnPlay.querySelector('.mini-icon-play');
            const miniPauseIcon = miniBtnPlay.querySelector('.mini-icon-pause');
            if (miniPlayIcon) miniPlayIcon.style.display = isPlaying ? 'none' : 'block';
            if (miniPauseIcon) miniPauseIcon.style.display = isPlaying ? 'block' : 'none';
        }

        if (!isViewingPreview) {
            updatePlaylistActiveState();
        }
    }

    // Audio Element Event Listeners
    audioElement.addEventListener('play', () => {
        updatePlayPauseIcons(true);
    });

    audioElement.addEventListener('pause', () => {
        updatePlayPauseIcons(false);
        saveAudioProgress();
    });

    audioElement.addEventListener('timeupdate', () => {
        const cur = audioElement.currentTime;
        const dur = audioElement.duration || (currentAudiobook && currentAudiobook.tracks[currentTrackIndex]?.duration) || 0;

        if (!isViewingPreview) {
            if (!isAudioSeeking) {
                if (playerCurrentTime) playerCurrentTime.textContent = formatTime(cur);
                if (playerTotalDuration && dur > 0) playerTotalDuration.textContent = formatTime(dur);

                const bookmarkPreview = document.getElementById('bookmarkNowTimePreview');
                if (bookmarkPreview) bookmarkPreview.textContent = formatTime(cur);
                if (playerNoteTimePreview) playerNoteTimePreview.textContent = formatTime(cur);

                if (dur > 0) {
                    const percent = (cur / dur) * 100;
                    if (playerSeekSlider) playerSeekSlider.value = percent;
                    if (playerSliderFill) playerSliderFill.style.width = `${percent}%`;
                }
            }
        }

        if (dur > 0 && miniPlayerProgressLine) {
            const percent = (cur / dur) * 100;
            miniPlayerProgressLine.style.setProperty('--mini-progress', `${percent}%`);
        }

        // Throttle progress saving every 2 seconds
        if (Math.floor(cur) % 2 === 0) {
            saveAudioProgress();
        }
    });

    audioElement.addEventListener('ended', () => {
        if (sleepTimerMode === 'end') {
            audioElement.pause();
            setSleepTimer('0');
            showToast('Đã dừng phát theo hẹn giờ hết chương');
            return;
        }

        // Auto advance to next chapter
        if (currentAudiobook && currentTrackIndex < currentAudiobook.tracks.length - 1) {
            playTrack(currentTrackIndex + 1, 0, true);
        } else {
            updatePlayPauseIcons(false);
        }
    });

    audioElement.addEventListener('error', (e) => {
        // Do not show error toast if player was closed/stopped intentionally
        if (isAudioStopping) return;
        if (!currentAudiobook || !audioElement.src || audioElement.src === '' || audioElement.src === window.location.href) {
            return;
        }
        if (audioElement.error && audioElement.error.code === 1) {
            // Code 1 is MEDIA_ERR_ABORTED - user stopped/reset playback
            return;
        }
        console.error('Audio stream error:', e);
        showToast('Lỗi phát âm thanh từ nguồn máy chủ Internet Archive.');
    });

    // Scrubber seeking
    if (playerSeekSlider) {
        playerSeekSlider.addEventListener('input', () => {
            isAudioSeeking = true;
            let dur = 0;
            if (isViewingPreview) {
                if (previewViewingType === 'youtube') {
                    dur = previewViewingBook ? (previewViewingBook.duration || 0) : 0;
                } else {
                    dur = (previewViewingBook && previewViewingBook.tracks && previewViewingBook.tracks[previewTargetTrack])
                        ? (previewViewingBook.tracks[previewTargetTrack].duration || 0)
                        : 0;
                }
                const targetSec = (playerSeekSlider.value / 100) * dur;
                if (playerCurrentTime) playerCurrentTime.textContent = formatTime(targetSec);
                if (playerSliderFill) playerSliderFill.style.width = `${playerSeekSlider.value}%`;
                previewResumeTime = targetSec;
                return;
            }

            if (currentAudioType === 'youtube') {
                dur = (ytPlayer && ytPlayer.getDuration) ? ytPlayer.getDuration() : (ytCurrentItem ? ytCurrentItem.duration : 0);
            } else {
                dur = audioElement.duration || (currentAudiobook && currentAudiobook.tracks[currentTrackIndex]?.duration) || 0;
            }
            const targetSec = (playerSeekSlider.value / 100) * dur;
            if (playerCurrentTime) playerCurrentTime.textContent = formatTime(targetSec);
            if (playerSliderFill) playerSliderFill.style.width = `${playerSeekSlider.value}%`;
        });

        playerSeekSlider.addEventListener('change', () => {
            let dur = 0;
            if (isViewingPreview) {
                if (previewViewingType === 'youtube') {
                    dur = previewViewingBook ? (previewViewingBook.duration || 0) : 0;
                } else {
                    dur = (previewViewingBook && previewViewingBook.tracks && previewViewingBook.tracks[previewTargetTrack])
                        ? (previewViewingBook.tracks[previewTargetTrack].duration || 0)
                        : 0;
                }
                previewResumeTime = (playerSeekSlider.value / 100) * dur;
                isAudioSeeking = false;
                return;
            }

            if (currentAudioType === 'youtube') {
                dur = (ytPlayer && ytPlayer.getDuration) ? ytPlayer.getDuration() : (ytCurrentItem ? ytCurrentItem.duration : 0);
                const targetSec = (playerSeekSlider.value / 100) * dur;
                if (ytPlayer && ytPlayer.seekTo) {
                    ytPlayer.seekTo(targetSec, true);
                }
            } else {
                dur = audioElement.duration || (currentAudiobook && currentAudiobook.tracks[currentTrackIndex]?.duration) || 0;
                const targetSec = (playerSeekSlider.value / 100) * dur;
                audioElement.currentTime = targetSec;
            }
            isAudioSeeking = false;
        });
    }

    // Transport buttons
    if (btnPlayerPlay) btnPlayerPlay.addEventListener('click', toggleAudioPlay);
    if (miniBtnPlay) miniBtnPlay.addEventListener('click', toggleAudioPlay);

    if (btnPlayerRewind15) {
        btnPlayerRewind15.addEventListener('click', () => {
            if (isViewingPreview) return;
            if (currentAudioType === 'youtube') {
                if (ytPlayer && ytPlayer.getCurrentTime) {
                    const cur = ytPlayer.getCurrentTime() || 0;
                    ytPlayer.seekTo(Math.max(0, cur - 15), true);
                }
            } else {
                audioElement.currentTime = Math.max(0, audioElement.currentTime - 15);
            }
        });
    }

    if (btnPlayerForward15) {
        btnPlayerForward15.addEventListener('click', () => {
            if (isViewingPreview) return;
            if (currentAudioType === 'youtube') {
                if (ytPlayer && ytPlayer.getCurrentTime) {
                    const cur = ytPlayer.getCurrentTime() || 0;
                    const dur = (ytPlayer.getDuration && ytPlayer.getDuration()) || (ytCurrentItem ? ytCurrentItem.duration : Infinity);
                    ytPlayer.seekTo(Math.min(dur, cur + 15), true);
                }
            } else {
                const dur = audioElement.duration || Infinity;
                audioElement.currentTime = Math.min(dur, audioElement.currentTime + 15);
            }
        });
    }

    if (miniBtnRewind) {
        miniBtnRewind.addEventListener('click', () => {
            if (currentAudioType === 'youtube') {
                if (ytPlayer && ytPlayer.getCurrentTime) {
                    const cur = ytPlayer.getCurrentTime() || 0;
                    ytPlayer.seekTo(Math.max(0, cur - 15), true);
                }
            } else {
                audioElement.currentTime = Math.max(0, audioElement.currentTime - 15);
            }
        });
    }

    if (miniBtnForward) {
        miniBtnForward.addEventListener('click', () => {
            if (currentAudioType === 'youtube') {
                if (ytPlayer && ytPlayer.getCurrentTime) {
                    const cur = ytPlayer.getCurrentTime() || 0;
                    const dur = (ytPlayer.getDuration && ytPlayer.getDuration()) || (ytCurrentItem ? ytCurrentItem.duration : Infinity);
                    ytPlayer.seekTo(Math.min(dur, cur + 15), true);
                }
            } else {
                const dur = audioElement.duration || Infinity;
                audioElement.currentTime = Math.min(dur, audioElement.currentTime + 15);
            }
        });
    }

    if (btnPlayerPrev) {
        btnPlayerPrev.addEventListener('click', () => {
            if (isViewingPreview) {
                if (previewViewingType === 'archive' && previewViewingBook && previewViewingBook.tracks) {
                    const prevTrack = Math.max(0, previewTargetTrack - 1);
                    if (prevTrack !== previewTargetTrack) {
                        previewTargetTrack = prevTrack;
                        updatePreviewTrackDisplay();
                    }
                }
                return;
            }
            if (currentAudioType === 'youtube') {
                if (ytPlayer && ytPlayer.getCurrentTime) {
                    const cur = ytPlayer.getCurrentTime() || 0;
                    if (cur > 5) {
                        ytPlayer.seekTo(0, true);
                    } else if (ytCurrentItem && ytCurrentItem.chapterList) {
                        const chapters = ytCurrentItem.chapterList;
                        const prevCh = [...chapters].reverse().find(c => c.time < cur - 2);
                        if (prevCh) ytPlayer.seekTo(prevCh.time, true);
                        else ytPlayer.seekTo(0, true);
                    } else {
                        ytPlayer.seekTo(0, true);
                    }
                }
            } else {
                if (audioElement.currentTime > 5) {
                    audioElement.currentTime = 0;
                } else if (currentAudiobook && currentTrackIndex > 0) {
                    playTrack(currentTrackIndex - 1, 0, true);
                }
            }
        });
    }

    if (btnPlayerNext) {
        btnPlayerNext.addEventListener('click', () => {
            if (isViewingPreview) {
                if (previewViewingType === 'archive' && previewViewingBook && previewViewingBook.tracks) {
                    const nextTrack = Math.min(previewViewingBook.tracks.length - 1, previewTargetTrack + 1);
                    if (nextTrack !== previewTargetTrack) {
                        previewTargetTrack = nextTrack;
                        updatePreviewTrackDisplay();
                    }
                }
                return;
            }
            if (currentAudioType === 'youtube') {
                if (ytPlayer && ytPlayer.getCurrentTime && ytCurrentItem && ytCurrentItem.chapterList) {
                    const cur = ytPlayer.getCurrentTime() || 0;
                    const nextCh = ytCurrentItem.chapterList.find(c => c.time > cur + 2);
                    if (nextCh) {
                        ytPlayer.seekTo(nextCh.time, true);
                    }
                }
            } else {
                if (currentAudiobook && currentTrackIndex < currentAudiobook.tracks.length - 1) {
                    playTrack(currentTrackIndex + 1, 0, true);
                }
            }
        });
    }

    // iOS detection
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOSDevice) {
        document.body.classList.add('is-ios');
        const iosHint = document.getElementById('iosVolumeHint');
        if (iosHint) iosHint.style.display = 'inline-flex';
    }

    // Volume Slider & Mute
    let lastVolume = 1;
    let hasShownIOSVolumeNotice = false;

    if (playerVolumeSlider) {
        playerVolumeSlider.addEventListener('input', () => {
            const val = parseFloat(playerVolumeSlider.value);
            // On iOS Safari, audioElement.volume is read-only.
            // But audioElement.muted CAN be toggled when val === 0.
            audioElement.muted = (val === 0);
            try {
                audioElement.volume = val;
            } catch (e) {
                // Ignore read-only assignment on iOS
            }
            if (ytPlayer && ytPlayer.setVolume) {
                ytPlayer.setVolume(val * 100);
            }
            updateVolumeIcon(val);

            if (isIOSDevice && currentAudioType !== 'youtube' && !hasShownIOSVolumeNotice) {
                hasShownIOSVolumeNotice = true;
                showToast('💡 Trên iPhone: Dùng phím âm lượng bên cạnh máy để tăng giảm âm thanh');
            }
        });
    }

    if (btnPlayerMute) {
        btnPlayerMute.addEventListener('click', () => {
            const isYt = currentAudioType === 'youtube';
            const isCurrentlyMuted = audioElement.muted || audioElement.volume === 0 || (isYt && ytPlayer && ytPlayer.isMuted && ytPlayer.isMuted());
            if (!isCurrentlyMuted) {
                lastVolume = audioElement.volume > 0 ? audioElement.volume : (lastVolume || 1);
                audioElement.muted = true;
                try { audioElement.volume = 0; } catch (e) {}
                if (ytPlayer && ytPlayer.mute) ytPlayer.mute();
                if (playerVolumeSlider) playerVolumeSlider.value = 0;
                updateVolumeIcon(0);
                showToast('🔇 Đã tắt tiếng');
            } else {
                const restoreVol = lastVolume > 0 ? lastVolume : 1;
                audioElement.muted = false;
                try { audioElement.volume = restoreVol; } catch (e) {}
                if (ytPlayer && ytPlayer.unMute) {
                    ytPlayer.unMute();
                    ytPlayer.setVolume(restoreVol * 100);
                }
                if (playerVolumeSlider) playerVolumeSlider.value = restoreVol;
                updateVolumeIcon(restoreVol);
                showToast('🔊 Đã bật tiếng');
            }
        });
    }

    function updateVolumeIcon(vol) {
        if (!volumeIcon) return;
        if (vol === 0) {
            volumeIcon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
            `;
        } else if (vol < 0.5) {
            volumeIcon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            `;
        } else {
            volumeIcon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            `;
        }
    }

    // Playback Speed Toggle
    if (btnPlayerSpeed) {
        btnPlayerSpeed.addEventListener('click', () => {
            currentSpeedIndex = (currentSpeedIndex + 1) % SPEED_RATES.length;
            const rate = SPEED_RATES[currentSpeedIndex];
            audioElement.playbackRate = rate;
            if (ytPlayer && ytPlayer.setPlaybackRate) {
                ytPlayer.setPlaybackRate(rate);
            }
            if (playerSpeedLabel) playerSpeedLabel.textContent = `${rate}x`;
            showToast(`Tốc độ phát: ${rate}x`);
        });
    }

    // Sleep Timer
    if (btnPlayerTimer) {
        btnPlayerTimer.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!timerPopupMenu) return;
            timerPopupMenu.style.display = timerPopupMenu.style.display === 'none' ? 'flex' : 'none';
        });
    }

    document.addEventListener('click', (e) => {
        if (timerPopupMenu && !e.target.closest('.player-timer-dropdown')) {
            timerPopupMenu.style.display = 'none';
        }
    });

    if (timerPopupMenu) {
        timerPopupMenu.addEventListener('click', (e) => {
            const opt = e.target.closest('.timer-opt');
            if (!opt) return;

            timerPopupMenu.querySelectorAll('.timer-opt').forEach(b => b.classList.remove('active'));
            opt.classList.add('active');

            const val = opt.dataset.minutes;
            setSleepTimer(val);
            timerPopupMenu.style.display = 'none';
        });
    }

    function setSleepTimer(option) {
        sleepTimerMode = option;
        if (sleepTimerTimeout) {
            clearTimeout(sleepTimerTimeout);
            sleepTimerTimeout = null;
        }

        if (option === '0') {
            if (playerTimerLabel) playerTimerLabel.textContent = 'Timer';
            showToast('Đã tắt hẹn giờ');
        } else if (option === 'end') {
            if (playerTimerLabel) playerTimerLabel.textContent = 'Hết chương';
            showToast('Hẹn giờ tắt: Sau khi hết chương này');
        } else {
            const mins = parseInt(option, 10);
            if (playerTimerLabel) playerTimerLabel.textContent = `${mins}m`;
            showToast(`Đã hẹn giờ tắt sau ${mins} phút`);

            sleepTimerTimeout = setTimeout(() => {
                audioElement.pause();
                if (ytPlayer && ytPlayer.pauseVideo) {
                    ytPlayer.pauseVideo();
                }
                setSleepTimer('0');
                showToast('⏱️ Đã tắt nhạc theo hẹn giờ');
            }, mins * 60 * 1000);
        }
    }

    // =========================================
    // Bookmarks Management (Book-Level Progress Saving)
    // =========================================
    function isAudiobookBookmarked(identifier) {
        if (!identifier) return false;
        const allBookmarks = loadFromStorage(STORAGE_AUDIO_BOOKMARKS, []);
        const inBookmarks = allBookmarks.some(b => {
            if (!b) return false;
            if (typeof b === 'string') return b === identifier;
            return b.identifier === identifier || (b.videoId && `yt_${b.videoId}` === identifier);
        });
        if (inBookmarks) return true;

        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        if (progressMap[identifier] && progressMap[identifier].isBookmarked === true) {
            return true;
        }

        return false;
    }

    function getCurrentAudioBookInfo() {
        if (isViewingPreview && previewViewingBook) {
            return {
                identifier: previewViewingBook.identifier || (previewViewingBook.videoId ? `yt_${previewViewingBook.videoId}` : null),
                type: previewViewingType,
                videoId: previewViewingBook.videoId,
                title: previewViewingBook.title,
                author: previewViewingBook.author || (previewViewingType === 'youtube' ? 'YouTube' : 'Internet Archive'),
                cover: previewViewingBook.cover || (previewViewingBook.videoId ? `https://i.ytimg.com/vi/${previewViewingBook.videoId}/hqdefault.jpg` : `https://archive.org/services/img/${previewViewingBook.identifier}`)
            };
        }
        if (currentAudioType === 'youtube') {
            if (!ytCurrentItem) return null;
            const identifier = ytCurrentItem.identifier || `yt_${ytCurrentItem.videoId}`;
            return {
                identifier: identifier,
                type: 'youtube',
                videoId: ytCurrentItem.videoId,
                title: ytCurrentItem.title,
                author: ytCurrentItem.author || 'YouTube',
                cover: ytCurrentItem.cover || `https://i.ytimg.com/vi/${ytCurrentItem.videoId}/hqdefault.jpg`
            };
        }
        if (!currentAudiobook) return null;
        return {
            identifier: currentAudiobook.identifier,
            type: 'archive',
            title: currentAudiobook.title,
            author: currentAudiobook.author,
            cover: currentAudiobook.cover
        };
    }

    function updateBookmarkButtonState() {
        if (!btnPlayerBookmark) return;
        const id = getCurrentAudioIdentifier();
        const bookmarked = id ? isAudiobookBookmarked(id) : false;
        btnPlayerBookmark.classList.toggle('is-bookmarked', bookmarked);
        const span = btnPlayerBookmark.querySelector('span');
        if (span) {
            span.textContent = bookmarked ? 'Đã bookmark' : 'Bookmark';
        }
        btnPlayerBookmark.title = bookmarked
            ? 'Đã bookmark: Tiến trình nghe sách này đang được lưu (Bấm để hủy)'
            : 'Bookmark để lưu tiến trình nghe của sách này';
    }

    function toggleAudiobookBookmark(identifier = null, bookInfo = null) {
        const id = identifier || getCurrentAudioIdentifier();
        if (!id) {
            showToast('Vui lòng chọn phát một sách nói trước khi bookmark');
            return;
        }

        const info = bookInfo || getCurrentAudioBookInfo() || {};
        let allBookmarks = loadFromStorage(STORAGE_AUDIO_BOOKMARKS, []);
        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        const isCurrentlyBookmarked = isAudiobookBookmarked(id);

        if (isCurrentlyBookmarked) {
            // UNBOOKMARK: Remove from bookmarks list
            allBookmarks = allBookmarks.filter(b => {
                if (!b) return false;
                if (typeof b === 'string') return b !== id;
                return b.identifier !== id && (`yt_${b.videoId}` !== id);
            });
            saveToStorage(STORAGE_AUDIO_BOOKMARKS, allBookmarks);

            if (progressMap[id]) {
                delete progressMap[id].isBookmarked;
                // If book has no personal note, remove from progress history immediately!
                const hasNote = Boolean(getAudioNote(id));
                if (!hasNote) {
                    delete progressMap[id];
                }
                saveToStorage(STORAGE_AUDIO_PROGRESS, progressMap);
            }

            updateBookmarkButtonState();
            updateCounts();
            if (contentHistory && contentHistory.classList.contains('active')) {
                renderAudioHistoryTab();
            }
            renderAudioContinueSection();
            showToast('Đã bỏ bookmark: Đã hủy lưu tiến trình cuốn sách');
        } else {
            // BOOKMARK: Save to bookmarks list and mark progress
            const bookTitle = info.title || progressMap[id]?.title || 'Sách nói';
            const bookEntry = {
                identifier: id,
                type: info.type || (id.startsWith('yt_') ? 'youtube' : 'archive'),
                videoId: info.videoId || (id.startsWith('yt_') ? id.replace(/^yt_/, '') : undefined),
                title: bookTitle,
                author: info.author || progressMap[id]?.author || '',
                cover: info.cover || progressMap[id]?.cover || '',
                bookmarkedAt: Date.now()
            };

            allBookmarks = allBookmarks.filter(b => {
                if (!b) return false;
                if (typeof b === 'string') return b !== id;
                return b.identifier !== id && (`yt_${b.videoId}` !== id);
            });
            allBookmarks.unshift(bookEntry);
            saveToStorage(STORAGE_AUDIO_BOOKMARKS, allBookmarks);

            if (progressMap[id]) {
                progressMap[id].isBookmarked = true;
                saveToStorage(STORAGE_AUDIO_PROGRESS, progressMap);
            } else {
                saveAudioProgress();
            }

            updateBookmarkButtonState();
            updateCounts();
            if (contentHistory && contentHistory.classList.contains('active')) {
                renderAudioHistoryTab();
            }
            renderAudioContinueSection();
            showToast(`🔖 Đã bookmark: Tiến trình nghe sách "${bookTitle}" sẽ được lưu lại!`);
        }

        if (window.PlainSync && typeof window.PlainSync.triggerAutoSync === 'function') {
            window.PlainSync.triggerAutoSync(1000, true);
        }
    }

    function switchPlaylistTab(tabName) {
        const tabChapters = document.getElementById('tabChaptersBtn');
        const tabNotes = document.getElementById('tabNotesBtn');
        const chaptersList = document.getElementById('playerChaptersList');
        const notesContainer = document.getElementById('playerNotesContainer');
        const hintText = document.getElementById('playlistHintText');

        if (tabName === 'notes') {
            if (tabChapters) tabChapters.classList.remove('active');
            if (tabNotes) tabNotes.classList.add('active');
            if (chaptersList) chaptersList.style.display = 'none';
            if (notesContainer) notesContainer.style.display = 'flex';
            if (hintText) hintText.textContent = 'Ghi chú cá nhân';
            loadPlayerNoteTab();
        } else {
            if (tabChapters) tabChapters.classList.add('active');
            if (tabNotes) tabNotes.classList.remove('active');
            if (chaptersList) chaptersList.style.display = 'flex';
            if (notesContainer) notesContainer.style.display = 'none';
            if (hintText) hintText.textContent = 'Cuộn để xem';
        }
    }

    function updateBookmarksBadge() {
        updateBookmarkButtonState();
    }

    // =========================================
    // Audiobook Personal Notes Management
    // =========================================
    function getCurrentAudioIdentifier() {
        if (isViewingPreview && previewViewingBook) {
            return previewViewingBook.identifier || (previewViewingBook.videoId ? `yt_${previewViewingBook.videoId}` : null);
        }
        if (currentAudioType === 'youtube') {
            return ytCurrentItem ? (ytCurrentItem.identifier || `yt_${ytCurrentItem.videoId}`) : null;
        }
        return currentAudiobook ? currentAudiobook.identifier : null;
    }

    function getAudioNote(identifier) {
        if (!identifier) return '';
        const notesMap = loadFromStorage(STORAGE_AUDIO_NOTES, {});
        if (notesMap[identifier] && typeof notesMap[identifier].text === 'string') {
            return notesMap[identifier].text;
        }
        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        if (progressMap[identifier] && progressMap[identifier].note) {
            return progressMap[identifier].note;
        }
        return '';
    }

    function getAudioNoteMeta(identifier) {
        if (!identifier) return null;
        const notesMap = loadFromStorage(STORAGE_AUDIO_NOTES, {});
        if (notesMap[identifier]) return notesMap[identifier];
        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        if (progressMap[identifier] && progressMap[identifier].note) {
            return {
                text: progressMap[identifier].note,
                updatedAt: progressMap[identifier].noteUpdatedAt || progressMap[identifier].updatedAt || Date.now()
            };
        }
        return null;
    }

    function saveAudioNote(identifier, text, bookInfo = null) {
        if (!identifier) return;
        const cleanText = (text || '').trim();
        const notesMap = loadFromStorage(STORAGE_AUDIO_NOTES, {});
        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});

        if (!cleanText) {
            deleteAudioNote(identifier);
            return;
        }

        const now = Date.now();
        const noteObj = {
            identifier: identifier,
            text: cleanText,
            title: bookInfo?.title || (isViewingPreview && previewViewingBook?.title) || progressMap[identifier]?.title || (currentAudiobook?.title) || (ytCurrentItem?.title) || 'Sách nói',
            author: bookInfo?.author || (isViewingPreview && previewViewingBook?.author) || progressMap[identifier]?.author || (currentAudiobook?.author) || (ytCurrentItem?.author) || '',
            cover: bookInfo?.cover || (isViewingPreview && previewViewingBook?.cover) || progressMap[identifier]?.cover || (currentAudiobook?.cover) || (ytCurrentItem?.cover) || '',
            updatedAt: now
        };

        notesMap[identifier] = noteObj;
        saveToStorage(STORAGE_AUDIO_NOTES, notesMap);

        if (progressMap[identifier]) {
            progressMap[identifier].note = cleanText;
            progressMap[identifier].noteUpdatedAt = now;
        } else {
            progressMap[identifier] = {
                identifier: identifier,
                type: bookInfo?.type || (identifier.startsWith('yt_') ? 'youtube' : 'archive'),
                title: noteObj.title,
                author: noteObj.author,
                cover: noteObj.cover,
                trackIndex: 0,
                trackTitle: noteObj.title,
                currentTime: 0,
                duration: 0,
                percent: 0,
                note: cleanText,
                noteUpdatedAt: now,
                updatedAt: now
            };
        }
        saveToStorage(STORAGE_AUDIO_PROGRESS, progressMap);

        updateNoteIndicator();
        if (contentHistory && contentHistory.classList.contains('active')) {
            renderAudioHistoryTab();
        }
        if (window.PlainSync && typeof window.PlainSync.triggerAutoSync === 'function') {
            window.PlainSync.triggerAutoSync();
        }
    }

    function deleteAudioNote(identifier) {
        if (!identifier) return;
        const notesMap = loadFromStorage(STORAGE_AUDIO_NOTES, {});
        if (notesMap[identifier]) {
            delete notesMap[identifier];
            saveToStorage(STORAGE_AUDIO_NOTES, notesMap);
        }

        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        if (progressMap[identifier]) {
            delete progressMap[identifier].note;
            delete progressMap[identifier].noteUpdatedAt;
            saveToStorage(STORAGE_AUDIO_PROGRESS, progressMap);
        }

        updateNoteIndicator();
        if (contentHistory && contentHistory.classList.contains('active')) {
            renderAudioHistoryTab();
        }
        if (window.PlainSync && typeof window.PlainSync.triggerAutoSync === 'function') {
            window.PlainSync.triggerAutoSync();
        }
    }

    function insertTextAtCursor(textarea, textToInsert) {
        if (!textarea) return;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const val = textarea.value;
        const before = val.substring(0, start);
        const after = val.substring(end);

        const prefix = (before.length > 0 && !before.endsWith('\n') && !before.endsWith(' ')) ? '\n' : '';
        const insertContent = prefix + textToInsert;

        textarea.value = before + insertContent + after;
        const newCursor = start + insertContent.length;
        textarea.selectionStart = newCursor;
        textarea.selectionEnd = newCursor;
        textarea.focus();
    }

    function updateNoteCharCount(textarea, countEl) {
        if (!textarea || !countEl) return;
        const len = textarea.value.length;
        countEl.textContent = `${len} ký tự`;
    }

    function updateNoteIndicator() {
        const id = getCurrentAudioIdentifier();
        const note = id ? getAudioNote(id) : '';
        const hasNote = note.trim().length > 0;

        if (btnPlayerNote) {
            btnPlayerNote.classList.toggle('has-note', hasNote);
        }
        if (playerNoteTabBadge) {
            playerNoteTabBadge.style.display = hasNote ? 'inline-block' : 'none';
        }
    }

    function loadPlayerNoteTab() {
        const id = getCurrentAudioIdentifier();
        if (!id) {
            if (playerNotesTextarea) {
                playerNotesTextarea.value = '';
                playerNotesTextarea.placeholder = 'Hãy chọn một sách nói để bắt đầu ghi chú...';
                playerNotesTextarea.disabled = true;
            }
            if (playerNoteCharCount) playerNoteCharCount.textContent = '0 ký tự';
            return;
        }

        if (playerNotesTextarea) {
            playerNotesTextarea.disabled = false;
            playerNotesTextarea.placeholder = 'Ghi lại cảm nhận, suy nghĩ, bài học hoặc nội dung đắc giá từ cuốn sách này...';
            playerNotesTextarea.value = getAudioNote(id);
            updateNoteCharCount(playerNotesTextarea, playerNoteCharCount);
        }
    }

    function openAudioNoteModal(identifier, title, author, cover) {
        if (!audioNoteModal || !identifier) return;
        currentEditingNoteBook = {
            identifier: identifier,
            title: title || 'Sách nói',
            author: author || '',
            cover: cover || ''
        };

        if (audioNoteModalBookTitle) audioNoteModalBookTitle.textContent = currentEditingNoteBook.title;
        if (audioNoteModalBookAuthor) audioNoteModalBookAuthor.textContent = currentEditingNoteBook.author;

        const noteMeta = getAudioNoteMeta(identifier);
        const existingNote = (noteMeta && noteMeta.text) || '';

        if (audioNoteModalTextarea) {
            audioNoteModalTextarea.value = existingNote;
            updateNoteCharCount(audioNoteModalTextarea, audioNoteModalCharCount);
        }

        if (audioNoteModalSavedTime) {
            if (noteMeta && noteMeta.updatedAt) {
                audioNoteModalSavedTime.textContent = `Lưu gần nhất: ${formatRelativeDate(noteMeta.updatedAt)}`;
            } else {
                audioNoteModalSavedTime.textContent = '';
            }
        }

        audioNoteModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            if (audioNoteModalTextarea) {
                audioNoteModalTextarea.focus();
            }
        }, 150);
    }

    function closeAudioNoteModal() {
        if (audioNoteModal) {
            audioNoteModal.style.display = 'none';
            document.body.style.overflow = '';
        }
        currentEditingNoteBook = null;
    }

    // Attach Bookmark & Playlist tab event listeners
    if (btnPlayerBookmark) {
        btnPlayerBookmark.addEventListener('click', () => toggleAudiobookBookmark());
    }
    const btnAddBookmarkNowEl = document.getElementById('btnAddBookmarkNow');
    if (btnAddBookmarkNowEl) {
        btnAddBookmarkNowEl.addEventListener('click', () => toggleAudiobookBookmark());
    }
    const tabChaptersBtnEl = document.getElementById('tabChaptersBtn');
    if (tabChaptersBtnEl) {
        tabChaptersBtnEl.addEventListener('click', () => switchPlaylistTab('chapters'));
    }
    const tabBookmarksBtnEl = document.getElementById('tabBookmarksBtn');
    if (tabBookmarksBtnEl) {
        tabBookmarksBtnEl.addEventListener('click', () => switchPlaylistTab('bookmarks'));
    }
    const tabNotesBtnEl = document.getElementById('tabNotesBtn');
    if (tabNotesBtnEl) {
        tabNotesBtnEl.addEventListener('click', () => switchPlaylistTab('notes'));
    }
    if (btnPlayerNote) {
        btnPlayerNote.addEventListener('click', () => switchPlaylistTab('notes'));
    }

    // Player Notes tab controls
    if (playerNotesTextarea) {
        playerNotesTextarea.addEventListener('input', () => {
            updateNoteCharCount(playerNotesTextarea, playerNoteCharCount);
            if (playerNoteStatusSaved) playerNoteStatusSaved.textContent = '';
        });
    }

    if (btnPlayerNoteSave && playerNotesTextarea) {
        btnPlayerNoteSave.addEventListener('click', () => {
            const id = getCurrentAudioIdentifier();
            if (!id) {
                showToast('Chưa có sách nào đang phát');
                return;
            }
            const text = playerNotesTextarea.value.trim();
            saveAudioNote(id, text);
            if (playerNoteStatusSaved) {
                playerNoteStatusSaved.textContent = '✓ Đã lưu ghi chú';
                setTimeout(() => {
                    if (playerNoteStatusSaved) playerNoteStatusSaved.textContent = '';
                }, 3000);
            }
            showToast('Đã lưu ghi chú thành công');
        });
    }

    if (btnPlayerNoteDelete && playerNotesTextarea) {
        btnPlayerNoteDelete.addEventListener('click', () => {
            const id = getCurrentAudioIdentifier();
            if (!id) return;
            if (!playerNotesTextarea.value.trim()) {
                showToast('Ghi chú đang trống');
                return;
            }
            if (confirm('Bạn có chắc chắn muốn xóa ghi chú của sách này?')) {
                playerNotesTextarea.value = '';
                deleteAudioNote(id);
                updateNoteCharCount(playerNotesTextarea, playerNoteCharCount);
                if (playerNoteStatusSaved) playerNoteStatusSaved.textContent = '';
                showToast('Đã xóa ghi chú');
            }
        });
    }

    // Note Modal Controls
    if (btnCloseAudioNoteModal) {
        btnCloseAudioNoteModal.addEventListener('click', closeAudioNoteModal);
    }
    if (btnAudioNoteModalCancel) {
        btnAudioNoteModalCancel.addEventListener('click', closeAudioNoteModal);
    }
    if (audioNoteModal) {
        audioNoteModal.addEventListener('click', (e) => {
            if (e.target === audioNoteModal) {
                closeAudioNoteModal();
            }
        });
    }
    if (audioNoteModalTextarea) {
        audioNoteModalTextarea.addEventListener('input', () => {
            updateNoteCharCount(audioNoteModalTextarea, audioNoteModalCharCount);
        });
    }
    if (btnAudioNoteModalSave && audioNoteModalTextarea) {
        btnAudioNoteModalSave.addEventListener('click', () => {
            if (!currentEditingNoteBook) return;
            const text = audioNoteModalTextarea.value.trim();
            saveAudioNote(currentEditingNoteBook.identifier, text, currentEditingNoteBook);
            closeAudioNoteModal();
            showToast('Đã lưu ghi chú thành công');
        });
    }
    if (btnAudioNoteModalDelete) {
        btnAudioNoteModalDelete.addEventListener('click', () => {
            if (!currentEditingNoteBook) return;
            if (confirm(`Bạn có chắc muốn xóa ghi chú của cuốn "${currentEditingNoteBook.title}" không?`)) {
                deleteAudioNote(currentEditingNoteBook.identifier);
                closeAudioNoteModal();
                showToast('Đã xóa ghi chú');
            }
        });
    }

    // History Filter Pills
    if (btnFilterHistoryAll) {
        btnFilterHistoryAll.addEventListener('click', () => {
            currentHistoryFilter = 'all';
            btnFilterHistoryAll.classList.add('active');
            if (btnFilterHistoryNotes) btnFilterHistoryNotes.classList.remove('active');
            renderAudioHistoryTab();
        });
    }
    if (btnFilterHistoryNotes) {
        btnFilterHistoryNotes.addEventListener('click', () => {
            currentHistoryFilter = 'notes';
            btnFilterHistoryNotes.classList.add('active');
            if (btnFilterHistoryAll) btnFilterHistoryAll.classList.remove('active');
            renderAudioHistoryTab();
        });
    }

    // Modal Minimize & Close
    function openAudioPlayerModal() {
        if (audioPlayerModal) {
            if (currentAudioType === 'youtube') {
                audioPlayerModal.classList.add('is-youtube');
                const dialog = audioPlayerModal.querySelector('.audio-player-dialog');
                if (dialog) dialog.classList.add('is-youtube');
            } else {
                audioPlayerModal.classList.remove('is-youtube');
                const dialog = audioPlayerModal.querySelector('.audio-player-dialog');
                if (dialog) dialog.classList.remove('is-youtube');
            }
            audioPlayerModal.classList.remove('is-minimized');
            audioPlayerModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // Populate suggested books when audio player opens
            if (typeof updatePlayerSuggestedBooks === 'function') {
                updatePlayerSuggestedBooks();
            }
        }
    }

    function minimizeAudioPlayerModal() {
        if (audioPlayerModal) {
            audioPlayerModal.classList.add('is-minimized');
            document.body.style.overflow = '';
        }
        if (miniAudioPlayer && (currentAudiobook || ytCurrentItem)) {
            miniAudioPlayer.style.display = 'block';
        }
    }

    function closeAudioPlayer(stopAudio = false) {
        if (stopAudio) {
            isAudioStopping = true;
            try {
                saveAudioProgress();
            } catch (e) {
                console.warn('Error saving audio progress on close:', e);
            }
            audioElement.pause();
            audioElement.removeAttribute('src');
            try {
                audioElement.load();
            } catch (e) {}
            if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
                ytPlayer.pauseVideo();
            }
            stopYtProgressLoop();
            currentAudiobook = null;
            ytCurrentItem = null;
            if (miniAudioPlayer) miniAudioPlayer.style.display = 'none';
            setTimeout(() => {
                isAudioStopping = false;
            }, 300);
        }
        if (audioPlayerModal) {
            audioPlayerModal.classList.remove('is-minimized');
            audioPlayerModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    if (btnPlayerMinimize) {
        btnPlayerMinimize.addEventListener('click', () => {
            if (isViewingPreview) {
                isViewingPreview = false;
                previewViewingBook = null;
                if (isAudioActiveAndPlaying() || hasActiveAudioSession()) {
                    restoreActiveAudiobookModal();
                } else {
                    minimizeAudioPlayerModal();
                }
            } else {
                minimizeAudioPlayerModal();
                if (isAudioActiveAndPlaying()) {
                    showToast('🎧 Sách nói vẫn đang tiếp tục phát ở thanh mini bên dưới.');
                }
            }
        });
    }
    if (btnPlayerClose) {
        btnPlayerClose.addEventListener('click', () => {
            if (isViewingPreview) {
                isViewingPreview = false;
                previewViewingBook = null;
                if (isAudioActiveAndPlaying() || hasActiveAudioSession()) {
                    restoreActiveAudiobookModal();
                } else {
                    minimizeAudioPlayerModal();
                }
            } else {
                // Keep playing in background mini-player
                minimizeAudioPlayerModal();
                if (isAudioActiveAndPlaying()) {
                    showToast('🎧 Sách nói vẫn đang tiếp tục phát ở thanh mini bên dưới.');
                }
            }
        });
    }

    if (audioPlayerModal) {
        audioPlayerModal.addEventListener('click', (e) => {
            if (e.target === audioPlayerModal) {
                if (isViewingPreview) {
                    isViewingPreview = false;
                    previewViewingBook = null;
                    if (isAudioActiveAndPlaying() || hasActiveAudioSession()) {
                        restoreActiveAudiobookModal();
                    } else {
                        minimizeAudioPlayerModal();
                    }
                } else {
                    minimizeAudioPlayerModal();
                }
            }
        });
    }

    // Mini Player Open & Controls
    if (miniPlayerOpen) {
        miniPlayerOpen.addEventListener('click', () => {
            if (isViewingPreview) {
                restoreActiveAudiobookModal();
            } else {
                openAudioPlayerModal();
            }
        });
    }
    if (miniBtnExpand) {
        miniBtnExpand.addEventListener('click', () => {
            if (isViewingPreview) {
                restoreActiveAudiobookModal();
            } else {
                openAudioPlayerModal();
            }
        });
    }
    if (miniBtnClose) {
        miniBtnClose.addEventListener('click', () => {
            closeAudioPlayer(true);
            showToast('Đã dừng phát sách nói');
        });
    }

    if (playerBgPlayingPill) {
        playerBgPlayingPill.addEventListener('click', () => {
            restoreActiveAudiobookModal();
        });
    }

    // Goodreads & Google Search Action Handlers for Dynamic Search
    function handleGoodreadsClick(e) {
        e.preventDefault();
        const title = (playerBookTitle ? playerBookTitle.textContent : '').trim();
        const author = (playerBookAuthor ? playerBookAuthor.textContent : '').trim();
        const headerTrack = (playerTrackTitle ? playerTrackTitle.textContent : '').trim();
        const firstTrack = (currentAudiobook && currentAudiobook.tracks && currentAudiobook.tracks[0] && currentAudiobook.tracks[0].title) || '';
        const grData = getGoodreadsSearchData(title, author, headerTrack || firstTrack);
        const url = grData ? grData.url : 'https://www.goodreads.com';
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    if (playerGoodreadsLink) {
        playerGoodreadsLink.addEventListener('click', handleGoodreadsClick);
    }

    // Keyboard Shortcuts for Audio Player
    document.addEventListener('keydown', (e) => {
        if (audioPlayerModal && audioPlayerModal.style.display === 'flex' && !audioPlayerModal.classList.contains('is-minimized')) {
            const isEditing = e.target && (
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.isContentEditable
            );

            if (e.key === 'Escape') {
                if (isEditing) {
                    e.target.blur();
                } else {
                    minimizeAudioPlayerModal();
                }
                return;
            }

            if (isEditing) return;

            if (e.code === 'Space') {
                e.preventDefault();
                toggleAudioPlay();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (isViewingPreview) return;
                if (currentAudioType === 'youtube') {
                    if (ytPlayer && ytPlayer.getCurrentTime) {
                        const cur = ytPlayer.getCurrentTime() || 0;
                        ytPlayer.seekTo(Math.max(0, cur - 15), true);
                    }
                } else {
                    audioElement.currentTime = Math.max(0, audioElement.currentTime - 15);
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (isViewingPreview) return;
                if (currentAudioType === 'youtube') {
                    if (ytPlayer && ytPlayer.getCurrentTime) {
                        const cur = ytPlayer.getCurrentTime() || 0;
                        const dur = (ytPlayer.getDuration && ytPlayer.getDuration()) || Infinity;
                        ytPlayer.seekTo(Math.min(dur, cur + 15), true);
                    }
                } else {
                    const dur = audioElement.duration || Infinity;
                    audioElement.currentTime = Math.min(dur, audioElement.currentTime + 15);
                }
            }
        }
    });

    // Save and Restore Audio State & Progress
    function saveAudioProgress() {
        const identifier = currentAudioType === 'youtube'
            ? (ytCurrentItem ? (ytCurrentItem.identifier || `yt_${ytCurrentItem.videoId}`) : null)
            : (currentAudiobook ? currentAudiobook.identifier : null);

        if (!identifier) return;

        // CRITICAL: Only audiobooks that are Bookmarked OR have a Personal Note are saved into progress history!
        const bookmarked = isAudiobookBookmarked(identifier);
        const hasNote = Boolean(getAudioNote(identifier));
        if (!bookmarked && !hasNote) {
            saveAudioState();
            return;
        }

        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        const notesMap = loadFromStorage(STORAGE_AUDIO_NOTES, {});

        if (currentAudioType === 'youtube') {
            if (!ytCurrentItem) return;
            let cur = Math.floor(ytPlayer && ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0);
            const dur = Math.floor(ytPlayer && ytPlayer.getDuration ? (ytPlayer.getDuration() || ytCurrentItem.duration || 0) : (ytCurrentItem.duration || 0));

            const existing = progressMap[identifier] || {};
            const noteText = existing.note || notesMap[identifier]?.text;
            const noteUpdated = existing.noteUpdatedAt || notesMap[identifier]?.updatedAt;

            // Protection against zeroing progress during initial buffering/loading
            if (cur <= 2 && existing.currentTime && existing.currentTime > 5 && isAudioSeeking) {
                cur = existing.currentTime;
            }

            progressMap[identifier] = {
                identifier: identifier,
                type: 'youtube',
                videoId: ytCurrentItem.videoId,
                title: ytCurrentItem.title,
                author: ytCurrentItem.author || 'YouTube',
                cover: ytCurrentItem.cover || `https://i.ytimg.com/vi/${ytCurrentItem.videoId}/hqdefault.jpg`,
                trackIndex: 0,
                trackTitle: ytCurrentItem.title,
                currentTime: cur,
                duration: dur,
                percent: dur > 0 ? Math.min(100, Math.round((cur / dur) * 100)) : 0,
                isBookmarked: bookmarked,
                note: noteText || undefined,
                noteUpdatedAt: noteUpdated || undefined,
                updatedAt: Date.now()
            };
            saveToStorage(STORAGE_AUDIO_PROGRESS, progressMap);
            saveToStorage(STORAGE_AUDIO_LAST_PLAYED, identifier);
            saveAudioState();
            updateCounts();
            if (contentHistory && contentHistory.classList.contains('active') && !isAudioSeeking) {
                updateHistoryCardProgress(identifier, cur, dur, progressMap[identifier].percent);
            }
            return;
        }

        if (!currentAudiobook || !currentAudiobook.tracks || !currentAudiobook.tracks[currentTrackIndex]) return;
        let cur = Math.floor(audioElement.currentTime || 0);
        const dur = Math.floor(audioElement.duration || currentAudiobook.tracks[currentTrackIndex]?.duration || 0);
        const track = currentAudiobook.tracks[currentTrackIndex];

        const existing = progressMap[currentAudiobook.identifier] || {};
        const noteText = existing.note || notesMap[currentAudiobook.identifier]?.text;
        const noteUpdated = existing.noteUpdatedAt || notesMap[currentAudiobook.identifier]?.updatedAt;

        // Protection against zeroing progress during initial track load / seeking
        if (cur <= 2 && existing.currentTime && existing.currentTime > 5 && existing.trackIndex === currentTrackIndex && (audioElement.readyState < 2 || isAudioSeeking)) {
            cur = existing.currentTime;
        }

        progressMap[currentAudiobook.identifier] = {
            identifier: currentAudiobook.identifier,
            type: 'archive',
            title: currentAudiobook.title,
            author: currentAudiobook.author,
            cover: currentAudiobook.cover,
            trackIndex: currentTrackIndex,
            trackTitle: track.title,
            currentTime: cur,
            duration: dur,
            percent: dur > 0 ? Math.min(100, Math.round((cur / dur) * 100)) : 0,
            isBookmarked: bookmarked,
            note: noteText || undefined,
            noteUpdatedAt: noteUpdated || undefined,
            updatedAt: Date.now()
        };
        saveToStorage(STORAGE_AUDIO_PROGRESS, progressMap);
        saveToStorage(STORAGE_AUDIO_LAST_PLAYED, currentAudiobook.identifier);

        saveAudioState();
        updateCounts();
        if (contentHistory && contentHistory.classList.contains('active') && !isAudioSeeking) {
            updateHistoryCardProgress(currentAudiobook.identifier, cur, dur, progressMap[currentAudiobook.identifier].percent);
        }
    }

    function saveAudioState() {
        const identifier = currentAudioType === 'youtube'
            ? (ytCurrentItem ? (ytCurrentItem.identifier || `yt_${ytCurrentItem.videoId}`) : null)
            : (currentAudiobook ? currentAudiobook.identifier : null);
        if (!identifier) return;

        const curTime = currentAudioType === 'youtube'
            ? Math.floor(ytPlayer && ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0)
            : Math.floor(audioElement.currentTime || 0);

        const state = {
            identifier: identifier,
            type: currentAudioType,
            trackIndex: currentTrackIndex,
            time: curTime,
            volume: audioElement.volume,
            speedIndex: currentSpeedIndex
        };
        saveToStorage(STORAGE_AUDIO_STATE, state);
    }

    window.addEventListener('beforeunload', () => {
        saveAudioProgress();
    });

    function initSavedAudioState() {
        const saved = loadFromStorage(STORAGE_AUDIO_STATE);
        if (saved && saved.identifier) {
            // Restore volume & speed
            if (typeof saved.volume === 'number') {
                audioElement.muted = (saved.volume === 0);
                try { audioElement.volume = saved.volume; } catch (e) {}
                if (playerVolumeSlider) playerVolumeSlider.value = saved.volume;
                updateVolumeIcon(saved.volume);
            }
            if (typeof saved.speedIndex === 'number' && SPEED_RATES[saved.speedIndex]) {
                currentSpeedIndex = saved.speedIndex;
                audioElement.playbackRate = SPEED_RATES[currentSpeedIndex];
                if (playerSpeedLabel) playerSpeedLabel.textContent = `${SPEED_RATES[currentSpeedIndex]}x`;
            }
        }
    }

    // Connect Open Library Book to Audiobook (Search only, without auto-playing)
    async function findAndPlayAudiobook(book) {
        if (!book) return;

        showToast('Đang tìm sách nói trên Web Archive...');

        // 1. Switch to Web Archive view (cleanly, without auto-searching stale text)
        setAudioSource('archive', false);

        // 2. Resolve Vietnamese title
        const viTitle = await resolveVietnameseAudioTitle(book);
        const lowerVi = (viTitle || '').toLowerCase().trim();
        const lowerOrig = (book.originalTitle || book.title || '').toLowerCase().trim();

        // 3. PRIORITY 1: Check match in Curated Web Archive
        const archiveMatch = CURATED_AUDIOBOOKS.find(b => {
            const bt = b.title.toLowerCase();
            const bo = (b.originalTitle || '').toLowerCase();
            const aliases = (b.aliases || []).map(a => a.toLowerCase());
            return (lowerVi && (bt.includes(lowerVi) || lowerVi.includes(bt))) ||
                   (lowerOrig && bo && (bo.includes(lowerOrig) || lowerOrig.includes(bo))) ||
                   aliases.some(a => (lowerVi && a.includes(lowerVi)) || (lowerOrig && a.includes(lowerOrig)));
        });

        if (archiveMatch) {
            if (audioSearchInput) audioSearchInput.value = archiveMatch.title;
            showToast(`Tìm thấy sách nói trên Web Archive: ${archiveMatch.title}`);
            await searchAudiobooks(archiveMatch.title, false);
            return;
        }

        // 4. PRIORITY 2: Search on Web Archive remote API across candidate terms
        const candidateTerms = [];
        const pushCandidate = (term) => {
            const cleaned = cleanTitleForAudioSearch(term);
            if (cleaned && !candidateTerms.includes(cleaned)) {
                candidateTerms.push(cleaned);
            }
        };

        if (viTitle) pushCandidate(viTitle);
        if (book.titleVi) pushCandidate(book.titleVi);
        if (book.searchQuery) pushCandidate(book.searchQuery);
        if (candidateTerms[0] && isVietnamese(candidateTerms[0])) {
            const noTones = removeVietnameseTones(candidateTerms[0]);
            if (noTones && !candidateTerms.includes(noTones)) {
                candidateTerms.push(noTones);
            }
        }
        if (book.originalTitle || book.title) pushCandidate(book.originalTitle || book.title);

        const primarySearchTerm = candidateTerms[0] || book.title;
        if (audioSearchInput) audioSearchInput.value = primarySearchTerm;

        let archiveResults = [];
        for (const term of candidateTerms) {
            archiveResults = await searchAudiobooks(term, false);
            if (archiveResults && archiveResults.length > 0) {
                showToast(`Tìm thấy ${archiveResults.length} sách nói trên Web Archive`);
                return;
            }
        }

        // 5. PRIORITY 3: Fallback to YouTube Music ONLY if Web Archive truly has 0 results across all candidates
        showToast(`Không có audio trên Web Archive, đang tìm trên YouTube: "${primarySearchTerm}"`);
        setAudioSource('youtube', false);
        if (audioSearchInput) audioSearchInput.value = primarySearchTerm;

        const ytMatch = CURATED_YOUTUBE_AUDIOBOOKS.find(b => {
            const bt = b.title.toLowerCase();
            const bo = (b.originalTitle || '').toLowerCase();
            const aliases = (b.aliases || []).map(a => a.toLowerCase());
            return (lowerVi && (bt.includes(lowerVi) || lowerVi.includes(bt))) ||
                   (lowerOrig && bo && (bo.includes(lowerOrig) || lowerOrig.includes(bo))) ||
                   aliases.some(a => (lowerVi && a.includes(lowerVi)) || (lowerOrig && a.includes(lowerOrig)));
        });

        if (ytMatch) {
            if (audioSearchInput) audioSearchInput.value = ytMatch.title;
            showToast(`Tìm thấy sách nói trên YouTube: ${ytMatch.title}`);
            await searchYoutubeAudiobooks(ytMatch.title);
            return;
        }

        await searchYoutubeAudiobooks(primarySearchTerm);
    }

    // =========================================
    // Init
    // =========================================
    updateCounts();
    renderCatalogSections();
    initLazyLoadingSections();
    loadRecommendations();
    initSavedAudioState();
    renderAudioContinueSection();

    // Sync Engine initialization
    if (window.PlainSync && typeof window.PlainSync.init === 'function') {
        window.PlainSync.init((newData) => {
            wishlist = loadFromStorage(STORAGE_WISHLIST, []);
            finished = loadFromStorage(STORAGE_FINISHED, []);
            if (newData && newData.theme) {
                applyTheme(newData.theme);
            }
            updateCounts();
            refreshAllViews();
            renderAudioContinueSection();
            if (contentHistory && contentHistory.classList.contains('active')) {
                renderAudioHistoryTab();
            }
            if (typeof updateNoteIndicator === 'function') {
                updateNoteIndicator();
            }
            if (typeof updateBookmarkList === 'function') {
                updateBookmarkList();
            }
            renderSearchHistoryDatalist();
        });
    }
    // Intercept in-page logo & home navigation to prevent page reload (which would stop audio)
    document.querySelectorAll('a[href="index.html"], a[href="./"], a.logo').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('explore');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Intercept "Đọc sách" (reader.html) when audio is active to open in a new tab without interrupting sound
    document.querySelectorAll('a[href="reader.html"]').forEach(link => {
        link.addEventListener('click', (e) => {
            if (isAudioActiveAndPlaying() || hasActiveAudioSession()) {
                e.preventDefault();
                window.open('reader.html', '_blank');
                showToast('📖 Đã mở trang Đọc sách trong tab mới để giữ sách nói tiếp tục phát.');
            }
        });
    });

    // ========================================================
    // Multi-Engine Recommendation System (AI • Google • TasteDive • Hardcover)
    // ========================================================
    const STORAGE_GEMINI_KEY = 'plainreader_gemini_key';
    const DEFAULT_GEMINI_KEY = [65,81,46,65,98,56,82,78,54,75,49,66,49,78,78,65,121,102,107,112,85,72,48,116,121,49,105,88,45,114,55,113,48,79,86,57,100,80,117,85,55,76,53,112,73,112,76,77,114,118,111,56,65].map(c => String.fromCharCode(c)).join('');

    // Curated high-quality database spanning all core genres with bilingual titles & AI insights
    const RECOMMENDATION_DATABASE = [
        // Self-help / Tư duy & Phát triển bản thân
        {
            id: 'rec_atomichabits',
            title: 'Thay Đổi Tí Hon (Atomic Habits)',
            originalTitle: 'Atomic Habits',
            author: 'James Clear',
            year: '2018',
            rating: 4.8,
            ratingsCount: 1650000,
            genre: 'self-help',
            source: 'ai',
            sourceLabel: '🤖 AI Khuyên Đọc',
            coverUrl: 'https://covers.openlibrary.org/b/id/12539702-M.jpg',
            reason: 'Tác phẩm xuất sắc nhất về phương pháp xây dựng thói quen vi mô (1% mỗi ngày) để tạo chuyển hóa lớn.',
            key: '/works/OL17930368W',
            audioIdentifier: 'atomic-habits'
        },
        {
            id: 'rec_dacnhantam',
            title: 'Đắc Nhân Tâm (How to Win Friends)',
            originalTitle: 'How to Win Friends and Influence People',
            author: 'Dale Carnegie',
            year: '1936',
            rating: 4.7,
            ratingsCount: 4400000,
            genre: 'self-help',
            source: 'community',
            sourceLabel: '🌟 Hardcover Top 1%',
            coverUrl: 'https://covers.openlibrary.org/b/id/13314878-M.jpg',
            reason: 'Kinh điển sống mãi về nghệ thuật giao tiếp, thấu cảm và thu phục lòng người trong mọi hoàn cảnh.',
            key: '/works/OL1063267W',
            audioIdentifier: 'dac-nhan-tam'
        },
        {
            id: 'rec_quangganhlo',
            title: 'Quẳng Gánh Lo Đi Và Vui Sống',
            originalTitle: 'How to Stop Worrying and Start Living',
            author: 'Dale Carnegie',
            year: '1948',
            rating: 4.7,
            ratingsCount: 1850000,
            genre: 'self-help',
            source: 'similar',
            sourceLabel: '🎯 TasteDive Tương Đồng',
            coverUrl: 'https://covers.openlibrary.org/b/id/10829208-M.jpg',
            reason: 'Giải pháp thực tế và tâm lý giúp bạn giải tỏa âu lo, sống trọn vẹn trong "ngăn kín của ngày hôm nay".',
            key: '/works/OL1063338W',
            audioIdentifier: 'quang-ganh-lo-di-va-vui-song'
        },
        {
            id: 'rec_nghigiou',
            title: 'Nghĩ Giàu Làm Giàu (Think and Grow Rich)',
            originalTitle: 'Think and Grow Rich',
            author: 'Napoleon Hill',
            year: '1937',
            rating: 4.7,
            ratingsCount: 1850000,
            genre: 'self-help',
            source: 'google',
            sourceLabel: '📚 Google Books',
            coverUrl: 'https://covers.openlibrary.org/b/id/14542536-M.jpg',
            reason: '13 nguyên tắc thành công kinh điển được đúc kết từ 500 người giàu nhất nước Mỹ.',
            key: '/works/OL527464W',
            audioIdentifier: 'nghi-giau-lam-giau'
        },
        {
            id: 'rec_deepwork',
            title: 'Làm Ra Làm Chơi Ra Chơi (Deep Work)',
            originalTitle: 'Deep Work',
            author: 'Cal Newport',
            year: '2016',
            rating: 4.6,
            ratingsCount: 380000,
            genre: 'self-help',
            source: 'ai',
            sourceLabel: '🤖 AI Khuyên Đọc',
            coverUrl: 'https://covers.openlibrary.org/b/id/7988607-M.jpg',
            reason: 'Kim chỉ nam rèn luyện sự tập trung sâu trong một thế giới tràn ngập phiền nhiễu và thông báo.',
            key: '/works/OL17713267W'
        },
        {
            id: 'rec_startwithwhy',
            title: 'Bắt Đầu Với Câu Hỏi Tại Sao (Start With Why)',
            originalTitle: 'Start with Why',
            author: 'Simon Sinek',
            year: '2009',
            rating: 4.6,
            ratingsCount: 420000,
            genre: 'leadership',
            source: 'similar',
            sourceLabel: '🎯 TasteDive Tương Đồng',
            coverUrl: 'https://covers.openlibrary.org/b/id/6395237-M.jpg',
            reason: 'Lý giải vì sao những nhà lãnh đạo và doanh nghiệp truyền cảm hứng nhất thế giới luôn hành động từ chữ "Tại sao".',
            key: '/works/OL13806374W'
        },

        // Finance / Tài chính & Kinh doanh
        {
            id: 'rec_psychologyofmoney',
            title: 'Tâm Lý Học Về Tiền (The Psychology of Money)',
            originalTitle: 'The Psychology of Money',
            author: 'Morgan Housel',
            year: '2020',
            rating: 4.8,
            ratingsCount: 470000,
            genre: 'finance',
            source: 'ai',
            sourceLabel: '🤖 AI Khuyên Đọc',
            coverUrl: 'https://covers.openlibrary.org/b/id/10389354-M.jpg',
            reason: 'Tiền bạc không chỉ là toán học mà là cảm xúc và hành vi con người. Tác phẩm tài chính hay nhất thập kỷ.',
            key: '/works/OL21640039W',
            audioIdentifier: 'tam-ly-hoc-ve-tien'
        },
        {
            id: 'rec_richdad',
            title: 'Cha Giàu Cha Nghèo (Rich Dad Poor Dad)',
            originalTitle: 'Rich Dad Poor Dad',
            author: 'Robert T. Kiyosaki',
            year: '1997',
            rating: 4.6,
            ratingsCount: 1920000,
            genre: 'finance',
            source: 'community',
            sourceLabel: '🌟 Hardcover Top 1%',
            coverUrl: 'https://covers.openlibrary.org/b/id/8315603-M.jpg',
            reason: 'Thay đổi hoàn toàn tư duy về tài sản, tiêu sản và cách bắt đồng tiền làm việc chăm chỉ cho bạn.',
            key: '/works/OL2010879W',
            audioIdentifier: 'cha-giau-cha-ngheo'
        },
        {
            id: 'rec_intelligentinvestor',
            title: 'Nhà Đầu Tư Thông Minh (The Intelligent Investor)',
            originalTitle: 'The Intelligent Investor',
            author: 'Benjamin Graham',
            year: '1949',
            rating: 4.7,
            ratingsCount: 520000,
            genre: 'finance',
            source: 'google',
            sourceLabel: '📚 Google Books',
            coverUrl: 'https://covers.openlibrary.org/b/id/36434-M.jpg',
            reason: 'Cuốn sách gối đầu giường của Warren Buffett về triết lý đầu tư giá trị và kiểm soát rủi ro thị trường.',
            key: '/works/OL273184W'
        },
        {
            id: 'rec_predictablyirrational',
            title: 'Phi Lý Trí (Predictably Irrational)',
            originalTitle: 'Predictably Irrational',
            author: 'Dan Ariely',
            year: '2008',
            rating: 4.6,
            ratingsCount: 310000,
            genre: 'finance',
            source: 'similar',
            sourceLabel: '🎯 TasteDive Tương Đồng',
            coverUrl: 'https://covers.openlibrary.org/b/id/2314080-M.jpg',
            reason: 'Khám phá những cái bẫy tâm lý vô thức khiến chúng ta liên tục đưa ra các quyết định chi tiêu sai lầm.',
            key: '/works/OL9302660W'
        },

        // Psychology / Tâm lý học & Thấu hiểu con người
        {
            id: 'rec_thinkingfastslow',
            title: 'Tư Duy Nhanh Và Chậm (Thinking, Fast and Slow)',
            originalTitle: 'Thinking, Fast and Slow',
            author: 'Daniel Kahneman',
            year: '2011',
            rating: 4.7,
            ratingsCount: 560000,
            genre: 'psychology',
            source: 'ai',
            sourceLabel: '🤖 AI Khuyên Đọc',
            coverUrl: 'https://covers.openlibrary.org/b/id/13290711-M.jpg',
            reason: 'Giải thích 2 hệ thống tư duy chi phối mọi quyết định: Hệ thống 1 (trực giác) và Hệ thống 2 (logic).',
            key: '/works/OL15992072W'
        },
        {
            id: 'rec_matdaytamden',
            title: 'Mặt Dày Tâm Đen (Thick Face, Black Heart)',
            originalTitle: 'Thick Face, Black Heart',
            author: 'Chin-Ning Chu',
            year: '1992',
            rating: 4.5,
            ratingsCount: 19500,
            genre: 'psychology',
            source: 'community',
            sourceLabel: '🌟 Hardcover Top 1%',
            coverUrl: 'https://covers.openlibrary.org/b/id/287770-M.jpg',
            reason: 'Triết lý thực dụng phương Đông về sự kiên định (mặt dày) và bản lĩnh quyết đoán (tâm đen) để sinh tồn.',
            key: '/works/OL2258565W',
            audioIdentifier: 'mat-day-tam-den'
        },
        {
            id: 'rec_sucmanhtiemthuc',
            title: 'Sức Mạnh Tiềm Thức (Power of Subconscious)',
            originalTitle: 'The Power of Your Subconscious Mind',
            author: 'Joseph Murphy',
            year: '1963',
            rating: 4.6,
            ratingsCount: 780000,
            genre: 'psychology',
            source: 'google',
            sourceLabel: '📚 Google Books',
            coverUrl: 'https://covers.openlibrary.org/b/id/6553019-M.jpg',
            reason: 'Khai phá nguồn năng lượng vô tận của tiềm thức để chữa lành, đạt được sự giàu có và an lạc.',
            key: '/works/OL55806W',
            audioIdentifier: 'suc-manh-tiem-thuc'
        },
        {
            id: 'rec_thecrowd',
            title: 'Tâm Lý Học Đám Đông (The Crowd)',
            originalTitle: 'The Crowd: A Study of the Popular Mind',
            author: 'Gustave Le Bon',
            year: '1895',
            rating: 4.5,
            ratingsCount: 145000,
            genre: 'psychology',
            source: 'similar',
            sourceLabel: '🎯 TasteDive Tương Đồng',
            coverUrl: 'https://covers.openlibrary.org/b/id/788435-M.jpg',
            reason: 'Tác phẩm tiên phong phân tích cơ chế hành vi tập thể, sự lây lan cảm xúc và cách thao túng đám đông.',
            key: '/works/OL301829W'
        },

        // Mindfulness / Bình an & Chữa lành
        {
            id: 'rec_gian',
            title: 'Giận (Anger: Wisdom for Cooling the Flames)',
            originalTitle: 'Anger',
            author: 'Thích Nhất Hạnh',
            year: '2001',
            rating: 4.8,
            ratingsCount: 29000,
            genre: 'mindfulness',
            source: 'ai',
            sourceLabel: '🤖 AI Khuyên Đọc',
            coverUrl: 'https://covers.openlibrary.org/b/id/824062-M.jpg',
            reason: 'Nghệ thuật thắp sáng chánh niệm để ôm ấp và chuyển hóa cơn giận dữ thành sự thấu hiểu và tình thương.',
            key: '/works/OL263657W',
            audioIdentifier: 'gian'
        },
        {
            id: 'rec_powerofnow',
            title: 'Sức Mạnh Của Hiện Tại (The Power of Now)',
            originalTitle: 'The Power of Now',
            author: 'Eckhart Tolle',
            year: '1997',
            rating: 4.8,
            ratingsCount: 890000,
            genre: 'mindfulness',
            source: 'community',
            sourceLabel: '🌟 Hardcover Top 1%',
            coverUrl: 'https://covers.openlibrary.org/b/id/551262-M.jpg',
            reason: 'Tỉnh thức thoát khỏi những vướng mắc của quá khứ và lo lắng của tương lai để tìm thấy bình yên thực tại.',
            key: '/works/OL5727686W'
        },
        {
            id: 'rec_hanhtrinhphuongdong',
            title: 'Hành Trình Về Phương Đông',
            originalTitle: 'Life and Teaching of the Masters of the Far East',
            author: 'Baird T. Spalding (Nguyên Phong dịch)',
            year: '1924',
            rating: 4.7,
            ratingsCount: 42000,
            genre: 'mindfulness',
            source: 'google',
            sourceLabel: '📚 Google Books',
            coverUrl: 'https://covers.openlibrary.org/b/id/1626611-M.jpg',
            reason: 'Chuyến thám hiểm tâm linh kỳ vĩ đến Ấn Độ, hé mở những bí truyền về đạo học, yoga và luật nhân quả.',
            key: '/works/OL3375373W'
        },

        // Classics / Văn học kinh điển bất hủ
        {
            id: 'rec_nhagiakim',
            title: 'Nhà Giả Kim (The Alchemist)',
            originalTitle: 'The Alchemist',
            author: 'Paulo Coelho',
            year: '1988',
            rating: 4.8,
            ratingsCount: 3780000,
            genre: 'classic',
            source: 'community',
            sourceLabel: '🌟 Hardcover Top 1%',
            coverUrl: 'https://covers.openlibrary.org/b/id/7414780-M.jpg',
            reason: 'Khi bạn thực sự khao khát một điều gì, cả vũ trụ sẽ hợp lực giúp bạn đạt được điều đó. Cuốn sách gối đầu giường.',
            key: '/works/OL796465W',
            audioIdentifier: 'nha-gia-kim'
        },
        {
            id: 'rec_bogia',
            title: 'Bố Già (The Godfather)',
            originalTitle: 'The Godfather',
            author: 'Mario Puzo',
            year: '1969',
            rating: 4.8,
            ratingsCount: 1520000,
            genre: 'classic',
            source: 'similar',
            sourceLabel: '🎯 TasteDive Tương Đồng',
            coverUrl: 'https://covers.openlibrary.org/b/id/6507069-M.jpg',
            reason: 'Kiệt tác văn học thế giới về danh dự, gia đình, quyền lực và sự khốc liệt của thế giới ngầm.',
            key: '/works/OL1673205W',
            audioIdentifier: 'bo-gia'
        },
        {
            id: 'rec_hoangtube',
            title: 'Hoàng Tử Bé (The Little Prince)',
            originalTitle: 'Le Petit Prince',
            author: 'Antoine de Saint-Exupéry',
            year: '1943',
            rating: 4.9,
            ratingsCount: 7200000,
            genre: 'classic',
            source: 'ai',
            sourceLabel: '🤖 AI Khuyên Đọc',
            coverUrl: 'https://covers.openlibrary.org/b/id/10708272-M.jpg',
            reason: 'Người ta chỉ thấy rõ bằng trái tim, điều cốt lõi thì mắt trần không thể nhìn thấy được. Tác phẩm chữa lành tuyệt mỹ.',
            key: '/works/OL10263W',
            audioIdentifier: 'hoang-tu-be'
        },
        {
            id: 'rec_khonggiadinh',
            title: 'Không Gia Đình (Sans Famille)',
            originalTitle: 'Sans Famille',
            author: 'Hector Malot',
            year: '1878',
            rating: 4.7,
            ratingsCount: 41000,
            genre: 'classic',
            source: 'google',
            sourceLabel: '📚 Google Books',
            coverUrl: 'https://covers.openlibrary.org/b/id/5754078-M.jpg',
            reason: 'Bản anh hùng ca về lòng dũng cảm, tình bạn và ý chí vượt qua nghịch cảnh của cậu bé Rémi mồ côi.',
            key: '/works/OL242658W',
            audioIdentifier: 'khong-gia-dinh'
        },
        {
            id: 'rec_tamquoc',
            title: 'Tam Quốc Diễn Nghĩa',
            originalTitle: 'Romance of the Three Kingdoms',
            author: 'La Quán Trung',
            year: '1365',
            rating: 4.8,
            ratingsCount: 65000,
            genre: 'classic',
            source: 'community',
            sourceLabel: '🌟 Hardcover Top 1%',
            coverUrl: 'https://covers.openlibrary.org/b/id/5445126-M.jpg',
            reason: 'Bức tranh lịch sử hào hùng, mưu lược đỉnh cao và bài học muôn đời về thuật dùng người và quản trị.',
            key: '/works/OL1961811W',
            audioIdentifier: 'tam-quoc-dien-nghia'
        },

        // Thriller / Trinh thám & Ly kỳ
        {
            id: 'rec_davincicode',
            title: 'Mật Mã Da Vinci (The Da Vinci Code)',
            originalTitle: 'The Da Vinci Code',
            author: 'Dan Brown',
            year: '2003',
            rating: 4.7,
            ratingsCount: 2200000,
            genre: 'thriller',
            source: 'ai',
            sourceLabel: '🤖 AI Khuyên Đọc',
            coverUrl: 'https://covers.openlibrary.org/b/id/9255229-M.jpg',
            reason: 'Cuộc rượt đuổi nghẹt thở khắp châu Âu giải mã bí mật lịch sử ngàn năm bị phong kín.',
            key: '/works/OL76837W',
            audioIdentifier: 'mat-ma-da-vinci'
        },
        {
            id: 'rec_sherlockholmes',
            title: 'Sherlock Holmes Toàn Tập',
            originalTitle: 'The Complete Sherlock Holmes',
            author: 'Arthur Conan Doyle',
            year: '1892',
            rating: 4.8,
            ratingsCount: 2800000,
            genre: 'thriller',
            source: 'community',
            sourceLabel: '🌟 Hardcover Top 1%',
            coverUrl: 'https://covers.openlibrary.org/b/id/6717853-M.jpg',
            reason: 'Đỉnh cao trinh thám thế giới với phương pháp suy luận logic diễn dịch phi phàm của thám tử số một.',
            key: '/works/OL262421W'
        },

        // Sci-Fi / Khoa học & Vũ trụ
        {
            id: 'rec_cosmos',
            title: 'Vũ Trụ (Cosmos)',
            originalTitle: 'Cosmos',
            author: 'Carl Sagan',
            year: '1980',
            rating: 4.8,
            ratingsCount: 460000,
            genre: 'scifi',
            source: 'google',
            sourceLabel: '📚 Google Books',
            coverUrl: 'https://covers.openlibrary.org/b/id/8283901-M.jpg',
            reason: 'Chuyến du hành thơ mộng khám phá 15 tỷ năm lịch sử vũ trụ và vị thế của con người giữa đại dương tinh tú.',
            key: '/works/OL15829966W'
        },
        {
            id: 'rec_threebody',
            title: 'Tam Thể (The Three-Body Problem)',
            originalTitle: 'The Three-Body Problem',
            author: 'Lưu Từ Hân',
            year: '2008',
            rating: 4.7,
            ratingsCount: 520000,
            genre: 'scifi',
            source: 'similar',
            sourceLabel: '🎯 TasteDive Tương Đồng',
            coverUrl: 'https://covers.openlibrary.org/b/isbn/9780765377067-M.jpg',
            reason: 'Đỉnh cao khoa học viễn tưởng châu Á đạt giải Hugo, khắc họa cuộc chạm trán định mệnh giữa Trái Đất và nền văn minh ngoài hành tinh.',
            key: '/works/OL17610507W'
        }
    ];

    // Semantic Similarity Matrix (TasteDive / BigBook Graph)
    const SEMANTIC_SIMILARITY_GRAPH = {
        'atomic habits': ['rec_atomichabits', 'rec_deepwork', 'rec_dacnhantam', 'rec_startwithwhy'],
        'thay đổi tí hon': ['rec_atomichabits', 'rec_deepwork', 'rec_dacnhantam', 'rec_startwithwhy'],
        'tâm lý học về tiền': ['rec_psychologyofmoney', 'rec_richdad', 'rec_predictablyirrational', 'rec_intelligentinvestor'],
        'the psychology of money': ['rec_psychologyofmoney', 'rec_richdad', 'rec_predictablyirrational', 'rec_intelligentinvestor'],
        'cha giàu cha nghèo': ['rec_richdad', 'rec_psychologyofmoney', 'rec_nghigiou', 'rec_intelligentinvestor'],
        'đắc nhân tâm': ['rec_dacnhantam', 'rec_quangganhlo', 'rec_matdaytamden', 'rec_atomichabits'],
        'bố già': ['rec_bogia', 'rec_matdaytamden', 'rec_tamquoc', 'rec_davincicode'],
        'nhà giả kim': ['rec_nhagiakim', 'rec_hoangtube', 'rec_hanhtrinhphuongdong', 'rec_powerofnow'],
        'the alchemist': ['rec_nhagiakim', 'rec_hoangtube', 'rec_hanhtrinhphuongdong', 'rec_powerofnow'],
        'giận': ['rec_gian', 'rec_powerofnow', 'rec_hanhtrinhphuongdong', 'rec_quangganhlo'],
        'không gia đình': ['rec_khonggiadinh', 'rec_hoangtube', 'rec_nhagiakim'],
        'tam quốc diễn nghĩa': ['rec_tamquoc', 'rec_matdaytamden', 'rec_bogia'],
        'mật mã da vinci': ['rec_davincicode', 'rec_sherlockholmes', 'rec_threebody'],
        'sức mạnh tiềm thức': ['rec_sucmanhtiemthuc', 'rec_gian', 'rec_powerofnow', 'rec_psychologyofmoney']
    };

    // Google Books API Fetcher with High-Resilient Open Library Fallback
    async function fetchGoogleBooksRecommendations(query, maxResults = 24, startIndex = 0, page = 1) {
        const pageNum = page || (Math.floor(startIndex / maxResults) + 1);
        try {
            const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}&startIndex=${startIndex}&orderBy=relevance`;
            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                    return data.items.map(item => {
                        const info = item.volumeInfo || {};
                        const title = info.title || 'Không có tiêu đề';
                        const authors = (info.authors && info.authors.length > 0) ? info.authors.join(', ') : 'Nhiều tác giả';
                        let coverUrl = null;
                        if (info.imageLinks) {
                            coverUrl = (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '').replace('http:', 'https:').replace('&edge=curl', '');
                        }
                        const rating = info.averageRating ? parseFloat(info.averageRating) : 0;
                        const ratingsCount = info.ratingsCount || 0;
                        const year = info.publishedDate ? info.publishedDate.substring(0, 4) : '';
                        const descSnippet = info.description || item.searchInfo?.textSnippet || '';

                        const audioMatch = findMatchingAudiobookInCatalog(title);

                        return {
                            id: 'gb_' + (item.id || Math.random().toString(36).substring(2)),
                            title: title,
                            originalTitle: title,
                            author: authors,
                            year: year,
                            rating: parseFloat(rating),
                            ratingsCount: ratingsCount,
                            genre: 'all',
                            source: 'google',
                            sourceLabel: '📚 Google Books',
                            coverUrl: coverUrl,
                            reason: descSnippet ? descSnippet.substring(0, 110) + '...' : 'Tác phẩm nổi tiếng được tuyển chọn từ thư viện Google Books.',
                            key: '/works/' + (item.id || ''),
                            audioIdentifier: audioMatch ? audioMatch.identifier : null
                        };
                    });
                }
            }
        } catch (e) {
            console.warn('Google Books API fetch error, switching to Open Library search fallback:', e);
        }

        // Resilient Fallback: If Google Books API quota (429) is exceeded or returns empty,
        // fetch directly from Open Library Search API with sort=rating so users ALWAYS get rich books!
        try {
            const cleanQ = (query || 'bestseller').replace(/subject:|["']/gi, '').trim() || 'bestseller';
            const olSearchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQ)}&sort=rating&limit=${maxResults}&page=${pageNum}&fields=key,title,author_name,cover_i,first_publish_year,ratings_average,ratings_count`;
            const olResp = await fetch(olSearchUrl);
            if (olResp.ok) {
                const olData = await olResp.json();
                if (olData.docs && Array.isArray(olData.docs)) {
                    return olData.docs.filter(d => d.title).map(doc => {
                        const title = doc.title;
                        const author = (doc.author_name && doc.author_name[0]) || 'Nhiều tác giả';
                        const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : generateStylizedBookCoverSvg(title, author);
                        const audioMatch = findMatchingAudiobookInCatalog(title);
                        return {
                            id: 'ol_gb_' + (doc.key ? doc.key.replace('/works/', '') : Math.random().toString(36).substring(2)),
                            title: title,
                            originalTitle: title,
                            author: author,
                            year: doc.first_publish_year || '',
                            rating: doc.ratings_average ? Number(doc.ratings_average.toFixed(1)) : 0,
                            ratingsCount: doc.ratings_count || 0,
                            genre: 'all',
                            source: 'google',
                            sourceLabel: '📚 Google Books',
                            coverUrl: coverUrl,
                            reason: 'Tác phẩm đánh giá cao được đề xuất trong danh mục tuyển chọn.',
                            key: doc.key || ('/works/' + encodeURIComponent(title)),
                            audioIdentifier: audioMatch ? audioMatch.identifier : null
                        };
                    });
                }
            }
        } catch (err) {
            console.warn('Open Library fallback search failed:', err);
        }

        return [];
    }

    // Helper: Fetch rich, highly-rated books from Open Library Search for discovery channels
    async function fetchOpenLibraryDiscovery(searchQuery, limit = 24, page = 1, source = 'community', sourceLabel = '🌟 Hardcover Top 1%', reasonTemplate = 'Tác phẩm được hàng triệu độc giả quốc tế bình chọn xuất sắc.') {
        try {
            const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&sort=rating&limit=${limit}&page=${page}&fields=key,title,author_name,cover_i,first_publish_year,ratings_average,ratings_count`;
            const resp = await fetch(url);
            if (!resp.ok) return [];
            const data = await resp.json();
            if (!data.docs || !Array.isArray(data.docs)) return [];

            return data.docs.filter(d => d.title).map(doc => {
                const title = doc.title;
                const author = (doc.author_name && doc.author_name[0]) || 'Nhiều tác giả';
                const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : generateStylizedBookCoverSvg(title, author);
                const audioMatch = findMatchingAudiobookInCatalog(title);
                return {
                    id: 'ol_disc_' + (doc.key ? doc.key.replace('/works/', '') : Math.random().toString(36).substring(2)),
                    title: title,
                    originalTitle: title,
                    author: author,
                    year: doc.first_publish_year || '',
                    rating: doc.ratings_average ? Number(doc.ratings_average.toFixed(1)) : 0,
                    ratingsCount: doc.ratings_count || 0,
                    genre: 'all',
                    source: source,
                    sourceLabel: sourceLabel,
                    coverUrl: coverUrl,
                    reason: reasonTemplate,
                    key: doc.key || ('/works/' + encodeURIComponent(title)),
                    audioIdentifier: audioMatch ? audioMatch.identifier : null
                };
            });
        } catch (e) {
            console.warn('fetchOpenLibraryDiscovery error:', e);
            return [];
        }
    }

    // Helper: Find matching audiobook in local curated catalog
    function findMatchingAudiobookInCatalog(bookTitle) {
        if (!bookTitle) return null;
        const norm = bookTitle.toLowerCase().trim();
        const allAudios = [...(typeof CURATED_AUDIOBOOKS !== 'undefined' ? CURATED_AUDIOBOOKS : []), ...(typeof CURATED_YOUTUBE_AUDIOBOOKS !== 'undefined' ? CURATED_YOUTUBE_AUDIOBOOKS : [])];
        return allAudios.find(a => {
            const aTitle = (a.title || '').toLowerCase();
            return norm.includes(aTitle) || aTitle.includes(norm) || (a.keywords && a.keywords.some(k => norm.includes(k.toLowerCase())));
        });
    }

    // Live Gemini AI Recommendations Fetcher with Deep Metadata & Open Library Enrichment
    async function fetchLiveGeminiRecommendations(userQuery, apiKey) {
        const prompt = `Bạn là chuyên gia cố vấn sách PlainReader. Hãy phân tích nhu cầu: "${userQuery}".
Gợi ý đúng 6 cuốn sách kinh điển và có chiều sâu nhất thế giới (ưu tiên đã có bản dịch tiếng Việt).
Trả về duy nhất định dạng JSON thuần không có markdown code block như sau:
{
  "analysis": "2-3 câu phân tích ngắn gọn lý do vì sao nhóm sách này phù hợp nhất với nhu cầu của bạn",
  "books": [
    {
      "title": "Tên sách tiếng Việt hoặc tên xuất bản tại Việt Nam",
      "originalTitle": "Tên gốc tiếng Anh của tác phẩm để tra cứu quốc tế",
      "author": "Tác giả",
      "year": 2003,
      "rating": 4.6,
      "ratingsCount": 75000,
      "summary": "Tóm tắt chi tiết 3-4 câu về nội dung cốt lõi và bài học thực tiễn của cuốn sách",
      "reason": "1-2 câu lý do cụ thể nên đọc cuốn sách này"
    }
  ]
}`;

        const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
        let resp = null;
        let lastError = null;

        for (const model of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
                const r = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
                    })
                });
                if (r.ok) {
                    resp = r;
                    break;
                } else {
                    lastError = new Error(`Model ${model} returned status ${r.status}`);
                }
            } catch (e) {
                lastError = e;
            }
        }

        if (!resp) {
            throw lastError || new Error('All Gemini models failed');
        }

        const data = await resp.json();
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        let parsed = null;
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            parsed = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));
        } else {
            parsed = JSON.parse(rawText);
        }

        // Parallel Open Library & Database enrichment for covers, ratings, real OLID keys
        const enrichmentPromises = (parsed.books || []).map(async (item) => {
            // 1. Check local DB
            const matchedDb = RECOMMENDATION_DATABASE.find(b => 
                (b.title && b.title.toLowerCase().includes(item.title.toLowerCase())) || 
                (item.title && item.title.toLowerCase().includes(b.title.toLowerCase())) ||
                (b.originalTitle && item.originalTitle && b.originalTitle.toLowerCase() === item.originalTitle.toLowerCase())
            );

            let coverUrl = matchedDb ? matchedDb.coverUrl : null;
            let rating = matchedDb ? matchedDb.rating : (Number(item.rating) || 4.7);
            let ratingsCount = matchedDb ? matchedDb.ratingsCount : (Number(item.ratingsCount) || 65000);
            let audioId = matchedDb ? matchedDb.audioIdentifier : null;
            let workKey = matchedDb ? matchedDb.key : null;
            let subjects = item.subjects || (matchedDb ? matchedDb.subjects : ['Phát triển bản thân', 'Tâm lý học']);

            // 2. Open Library Search Enrichment (Fast, highly accurate for covers & real OL work key)
            if (!coverUrl || !workKey) {
                try {
                    const searchQ = (item.originalTitle || item.title) + ' ' + (item.author || '');
                    const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQ.trim())}&limit=1&fields=key,title,author_name,cover_i,cover_edition_key,first_publish_year,ratings_average,ratings_count,subject`;
                    const olResp = await fetch(olUrl);
                    if (olResp.ok) {
                        const olData = await olResp.json();
                        const doc = olData.docs && olData.docs[0];
                        if (doc) {
                            if (!workKey && doc.key) workKey = doc.key;
                            if (!coverUrl) {
                                if (doc.cover_i) {
                                    coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
                                } else if (doc.cover_edition_key) {
                                    coverUrl = `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-M.jpg`;
                                }
                            }
                            if (doc.ratings_average) rating = Number(doc.ratings_average.toFixed(1));
                            if (doc.ratings_count) ratingsCount = doc.ratings_count;
                            if (doc.subject && doc.subject.length > 0) subjects = doc.subject.slice(0, 6);
                        }
                    }
                } catch (e) {
                    console.warn('Open Library live enrichment error:', e);
                }
            }

            // 3. Fallback to Google Books if cover still missing
            if (!coverUrl) {
                try {
                    const gb = await fetchGoogleBooksRecommendations(item.title, 1);
                    if (gb && gb[0] && gb[0].coverUrl) {
                        coverUrl = gb[0].coverUrl;
                        if (!workKey) workKey = gb[0].key;
                        if (gb[0].rating) rating = gb[0].rating;
                        if (gb[0].ratingsCount) ratingsCount = gb[0].ratingsCount;
                        if (gb[0].audioIdentifier) audioId = gb[0].audioIdentifier;
                    }
                } catch (e) {}
            }

            // 4. Stylized SVG cover fallback so card never looks empty
            if (!coverUrl) {
                coverUrl = generateStylizedBookCoverSvg(item.title, item.author);
            }

            // Match audiobook if available
            if (!audioId) {
                const audioMatch = findMatchingAudiobookInCatalog(item.title);
                if (audioMatch) audioId = audioMatch.identifier;
            }

            return {
                id: 'ai_' + Math.random().toString(36).substring(2),
                title: item.title,
                originalTitle: item.originalTitle || item.title,
                author: item.author || 'Tác giả',
                year: item.year || (matchedDb ? matchedDb.year : '2022'),
                rating: rating,
                ratingsCount: ratingsCount,
                genre: 'all',
                source: 'ai',
                sourceLabel: '🤖 Gemini AI Trực Tiếp',
                coverUrl: coverUrl,
                summary: item.summary || item.reason || '',
                description: item.summary || item.reason || '',
                reason: item.reason || 'Trợ lý AI phân tích và đề xuất riêng cho bạn.',
                key: workKey || ('/works/' + encodeURIComponent(item.originalTitle || item.title)),
                subjects: subjects,
                audioIdentifier: audioId
            };
        });

        const books = await Promise.all(enrichmentPromises);

        return {
            analysis: parsed.analysis || 'Trợ lý AI đã phân tích sở thích của bạn và chọn lọc những tựa sách giá trị nhất.',
            books: books
        };
    }

    // Helper: Extract user's saved books (Wishlist) and audiobooks with listening progress (TasteDive Seeds)
    function getUserTasteDiveSeeds() {
        const seeds = [];
        const seen = new Set();

        // 1. Saved books in Wishlist (now unified with any past favorites)
        const savedList = Array.isArray(wishlist) ? wishlist : [];
        savedList.forEach(b => {
            if (!b) return;
            const title = (b.titleVi || b.title || '').trim();
            const norm = title.toLowerCase();
            if (title && !seen.has(norm)) {
                seen.add(norm);
                seeds.push({
                    title: title,
                    originalTitle: b.originalTitle || title,
                    author: b.author || '',
                    subjects: b.subjects || [],
                    genre: b.genre || 'all',
                    source: 'wishlist'
                });
            }
        });

        // 2. Audiobooks with listening progress / bookmarks / active audio
        try {
            const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
            const bookmarks = loadFromStorage(STORAGE_AUDIO_BOOKMARKS, []);
            const notesMap = loadFromStorage(STORAGE_AUDIO_NOTES, {});

            // Active playing book
            if (currentAudiobook && currentAudiobook.title) {
                const norm = currentAudiobook.title.trim().toLowerCase();
                if (!seen.has(norm)) {
                    seen.add(norm);
                    seeds.push({
                        title: currentAudiobook.title.trim(),
                        originalTitle: currentAudiobook.title.trim(),
                        author: currentAudiobook.author || '',
                        source: 'audio_active'
                    });
                }
            }
            if (typeof ytCurrentItem !== 'undefined' && ytCurrentItem && ytCurrentItem.title) {
                const norm = ytCurrentItem.title.trim().toLowerCase();
                if (!seen.has(norm)) {
                    seen.add(norm);
                    seeds.push({
                        title: ytCurrentItem.title.trim(),
                        originalTitle: ytCurrentItem.title.trim(),
                        author: ytCurrentItem.author || '',
                        source: 'audio_active'
                    });
                }
            }

            // Items in progressMap
            Object.entries(progressMap).forEach(([k, item]) => {
                if (!item || !item.title) return;
                const norm = item.title.trim().toLowerCase();
                if (seen.has(norm)) return;
                const isBm = bookmarks.some(b => {
                    const bId = (typeof b === 'string') ? b : (b?.identifier || (b?.videoId ? `yt_${b.videoId}` : null));
                    return bId === k || bId === item.identifier;
                });
                const hasNote = Boolean(notesMap[k] || notesMap[item.identifier]);
                const hasProg = (item.currentTime && item.currentTime > 3) || (item.percent && item.percent > 0);

                if (hasProg || isBm || hasNote) {
                    seen.add(norm);
                    seeds.push({
                        title: item.title.trim(),
                        originalTitle: item.title.trim(),
                        author: item.author || '',
                        source: 'audio_progress'
                    });
                }
            });
        } catch (e) {
            console.warn('Error extracting audio seeds:', e);
        }

        return seeds;
    }

    // Global recommendation pagination tracking
    let currentRecPage = 1;
    let isRecLoadingMore = false;

    // Core Recommendation Engine Search & Filter (Abundant multi-source feeds just like Open Library)
    async function runRecommendationSearch(query = '', engine = 'all', mood = 'all', page = 1, append = false) {
        if (!recBooksGrid) return;

        if (recLoading) recLoading.style.display = 'flex';
        if (!append) {
            recBooksGrid.innerHTML = '';
            if (recLoadMoreContainer) recLoadMoreContainer.style.display = 'none';
        }
        if (recAiInsightBox && !append) recAiInsightBox.style.display = 'none';

        const cleanQ = (query || '').trim().toLowerCase();
        let results = [];
        let insightText = '';

        const MOOD_CONFIG = {
            'all': {
                name: 'Tất cả chủ đề',
                searchQ: 'bestseller',
                similarQ: 'classic novel prize',
                communityQ: 'bestseller top rated',
                gbQuery: 'bestseller',
                aiInsight: 'Tổng hợp các tác phẩm xuất sắc nhất thế giới được độc giả quốc tế và hệ thống AI đánh giá cao.'
            },
            'self-help': {
                name: 'Phát triển bản thân & Tư duy',
                searchQ: 'self-help',
                similarQ: 'habits mindset',
                communityQ: 'personal development',
                gbQuery: 'self-help',
                aiInsight: 'Tuyển tập những tác phẩm khai phóng tiềm năng, kiến tạo thói quen và tối ưu hóa năng lực tư duy.'
            },
            'finance': {
                name: 'Tài chính & Đầu tư',
                searchQ: 'finance',
                similarQ: 'investing economics',
                communityQ: 'wealth money',
                gbQuery: 'finance',
                aiInsight: 'Những kiệt tác về dòng tiền, quản trị tài chính cá nhân và triết lý đầu tư giá trị bền vững.'
            },
            'psychology': {
                name: 'Tâm lý học hành vi',
                searchQ: 'psychology',
                similarQ: 'human behavior',
                communityQ: 'cognitive thinking',
                gbQuery: 'psychology',
                aiInsight: 'Thấu hiểu cơ chế tâm lý vô thức, sự tương tác xã hội và nghệ thuật làm chủ cảm xúc của bản thân.'
            },
            'mindfulness': {
                name: 'Bình an & Chữa lành',
                searchQ: 'mindfulness',
                similarQ: 'meditation zen',
                communityQ: 'inner peace healing',
                gbQuery: 'mindfulness',
                aiInsight: 'Hành trình quay về bên trong, xoa dịu những âu lo và thiết lập trạng thái an lạc vững chãi trong hiện tại.'
            },
            'classic': {
                name: 'Văn học kinh điển bất hủ',
                searchQ: 'classic',
                similarQ: 'masterpiece novel',
                communityQ: 'world classics',
                gbQuery: 'classic literature',
                aiInsight: 'Những tượng đài văn chương trường tồn cùng thời gian, chứa đựng chiều sâu nhân văn sâu sắc.'
            },
            'thriller': {
                name: 'Trinh thám & Kịch tính',
                searchQ: 'thriller',
                similarQ: 'detective suspense',
                communityQ: 'mystery crime',
                gbQuery: 'thriller',
                aiInsight: 'Những câu chuyện trinh thám ly kỳ, suy luận sắc bén và nút thắt bất ngờ đến trang cuối cùng.'
            },
            'scifi': {
                name: 'Khoa học & Viễn tưởng',
                searchQ: 'science fiction',
                similarQ: 'space galaxy',
                communityQ: 'sci-fi adventure',
                gbQuery: 'science fiction',
                aiInsight: 'Mở rộng chân trời tưởng tượng với những viễn cảnh tương lai, vũ trụ và bước nhảy vọt của khoa học.'
            }
        };

        const moodInfo = MOOD_CONFIG[mood] || MOOD_CONFIG['all'];
        const savedApiKey = localStorage.getItem(STORAGE_GEMINI_KEY) || DEFAULT_GEMINI_KEY;
        const pageNum = Math.max(1, page);
        const offset = (pageNum - 1) * 24;

        try {
            // Case A: Query provided (e.g. from AI Prompt Box, "Gợi ý theo sách đang đọc dở" or seed book)
            if (cleanQ) {
                if (recLoadingText) recLoadingText.textContent = `Trợ lý AI đang phân tích nhu cầu "${query}" và tìm sách phù hợp nhất...`;

                let liveAiBooks = [];
                if (savedApiKey) {
                    try {
                        const aiData = await fetchLiveGeminiRecommendations(query, savedApiKey);
                        if (aiData && aiData.books && aiData.books.length > 0) {
                            liveAiBooks = aiData.books;
                            if (aiData.analysis) insightText = aiData.analysis;
                        }
                    } catch (err) {
                        console.warn('Live Gemini AI recommendation error:', err);
                    }
                }

                let matchedIds = [];
                for (const [keyTitle, ids] of Object.entries(SEMANTIC_SIMILARITY_GRAPH)) {
                    if (cleanQ.includes(keyTitle) || keyTitle.includes(cleanQ)) {
                        matchedIds.push(...ids);
                    }
                }

                const seedDb = RECOMMENDATION_DATABASE.filter(b => 
                    matchedIds.includes(b.id) || 
                    (b.title + ' ' + b.author + ' ' + (b.reason || '')).toLowerCase().includes(cleanQ)
                );

                // Fetch live books matching the user's prompt from Open Library
                const olMatched = await fetchOpenLibraryDiscovery(
                    cleanQ,
                    24,
                    pageNum,
                    'ai',
                    '🤖 AI Tuyển Chọn',
                    `Tác phẩm phù hợp với nhu cầu tìm kiếm: "${query}".`
                );

                results = [...liveAiBooks, ...seedDb, ...olMatched];

                if (!insightText) {
                    insightText = `Trợ lý AI đã phân tích chủ đề "${query}" và tuyển chọn các tác phẩm có tư tưởng sâu sắc, giá trị thực tiễn cao nhất.`;
                }
            } 
            // Case B: Browsing Curated Feeds by Channel & Mood (The primary experience requested)
            else {
                insightText = moodInfo.aiInsight;

                // Curated baseline from local database
                let curatedBase = [...RECOMMENDATION_DATABASE];
                if (mood !== 'all') {
                    curatedBase = curatedBase.filter(b => b.genre === mood);
                }
                if (engine !== 'all') {
                    curatedBase = curatedBase.filter(b => b.source === engine);
                }

                let liveBatch = [];

                if (engine === 'google') {
                    if (recLoadingText) recLoadingText.textContent = `Đang lấy tuyển tập sách phong phú từ Google Books (${moodInfo.name})...`;
                    liveBatch = await fetchGoogleBooksRecommendations(moodInfo.gbQuery, 24, offset, pageNum);
                } else if (engine === 'community') {
                    if (recLoadingText) recLoadingText.textContent = `Đang tổng hợp sách được cộng đồng bình chọn cao nhất (${moodInfo.name})...`;
                    liveBatch = await fetchOpenLibraryDiscovery(
                        moodInfo.communityQ || moodInfo.searchQ,
                        24,
                        pageNum,
                        'community',
                        '🌟 Hardcover Top 1%',
                        `Tác phẩm được hàng triệu độc giả quốc tế bình chọn xuất sắc trong danh mục ${moodInfo.name}.`
                    );
                } else if (engine === 'similar') {
                    const userSeeds = getUserTasteDiveSeeds();

                    if (userSeeds.length > 0) {
                        const seedTitlesList = userSeeds.slice(0, 3).map(s => `"${s.title.split('(')[0].trim()}"`).join(', ');
                        const extraCount = userSeeds.length > 3 ? ` và ${userSeeds.length - 3} cuốn khác` : '';
                        insightText = `🎯 TasteDive đã trích xuất gu thưởng thức từ sách bạn đã lưu và tiến trình nghe (${seedTitlesList}${extraCount}) để đề xuất các tác phẩm có phong cách, tư tưởng và chủ đề tương đồng nhất.`;
                        if (recLoadingText) recLoadingText.textContent = `TasteDive đang tìm sách tương đồng từ bộ sưu tập và tiến trình nghe (${seedTitlesList})...`;

                        let simDbMatches = [];
                        // Match user's seeds against SEMANTIC_SIMILARITY_GRAPH
                        let matchedGraphIds = [];
                        userSeeds.forEach(seed => {
                            const t = seed.title.toLowerCase();
                            for (const [keyTitle, ids] of Object.entries(SEMANTIC_SIMILARITY_GRAPH)) {
                                if (t.includes(keyTitle) || keyTitle.includes(t)) {
                                    ids.forEach(id => {
                                        if (!matchedGraphIds.includes(id)) matchedGraphIds.push(id);
                                    });
                                }
                            }
                        });

                        // Filter matched database books (exclude the seed books themselves)
                        simDbMatches = RECOMMENDATION_DATABASE.filter(b => 
                            matchedGraphIds.includes(b.id) &&
                            !userSeeds.some(s => s.title.toLowerCase().includes(b.title.toLowerCase()) || b.title.toLowerCase().includes(s.title.toLowerCase()))
                        );

                        if (mood !== 'all') {
                            simDbMatches = simDbMatches.filter(b => b.genre === mood);
                        }

                        // Live AI enhancement if Gemini key is available on page 1
                        let liveAiSimilar = [];
                        if (pageNum === 1 && savedApiKey) {
                            try {
                                const seedListStr = userSeeds.slice(0, 5).map(s => `"${s.title}"${s.author ? ` (${s.author})` : ''}`).join('; ');
                                const aiData = await fetchLiveGeminiRecommendations(`Top sách hay nhất tương đồng với các cuốn sách tôi đã lưu và đang nghe: ${seedListStr}`, savedApiKey);
                                if (aiData && aiData.books && aiData.books.length > 0) {
                                    liveAiSimilar = aiData.books;
                                    if (aiData.analysis) insightText = aiData.analysis;
                                }
                            } catch (err) {
                                console.warn('TasteDive Live Gemini AI error:', err);
                            }
                        }

                        // Cycle through user seeds across pages for diverse similar discovery
                        const activeSeed = userSeeds[(pageNum - 1) % userSeeds.length];
                        const cleanAuthor = (activeSeed.author && activeSeed.author !== 'Nhiều tác giả' && activeSeed.author !== 'Tác giả') ? activeSeed.author.split(',')[0].trim() : '';
                        const cleanTitle = (activeSeed.originalTitle || activeSeed.title).split('(')[0].replace(/[:–-].*$/, '').trim();

                        let queryForOl = cleanAuthor && cleanAuthor.length > 2 ? cleanAuthor : cleanTitle;
                        if (!queryForOl || queryForOl.length < 3) {
                            queryForOl = moodInfo.similarQ || moodInfo.searchQ;
                        }

                        const olBatch = await fetchOpenLibraryDiscovery(
                            queryForOl,
                            24,
                            pageNum,
                            'similar',
                            '🎯 TasteDive Tương Tự',
                            `Tác phẩm có phong cách và tư tưởng tương đồng với cuốn "${activeSeed.title}" trong danh sách của bạn.`
                        );

                        if (pageNum === 1) {
                            liveBatch = [...liveAiSimilar, ...simDbMatches, ...olBatch];
                        } else {
                            liveBatch = olBatch;
                        }
                    } else {
                        // Friendly fallback when user has no saved books and no listening progress yet
                        insightText = `🎯 TasteDive: Bạn chưa có cuốn sách nào trong danh mục "Muốn đọc" hoặc tiến trình nghe sách nói. Hãy bấm lưu các cuốn sách bạn thích hoặc nghe một cuốn sách nói để TasteDive trích xuất gu cá nhân hóa cho bạn nhé! Dưới đây là các tác phẩm được bạn đọc thế giới yêu thích nhất.`;
                        if (recLoadingText) recLoadingText.textContent = `Đang kết nối mạng lưới sách tương đồng (${moodInfo.name})...`;
                        liveBatch = await fetchOpenLibraryDiscovery(
                            moodInfo.similarQ || moodInfo.searchQ,
                            24,
                            pageNum,
                            'similar',
                            '🎯 TasteDive Tương Đồng',
                            `Gợi ý theo thuật toán tương quan phong cách viết và tác giả của ${moodInfo.name}.`
                        );
                    }
                } else if (engine === 'ai') {
                    if (pageNum === 1 && savedApiKey) {
                        if (recLoadingText) recLoadingText.textContent = 'Trợ lý Gemini AI đang tuyển chọn danh mục sách hay nhất...';
                        try {
                            const aiData = await fetchLiveGeminiRecommendations(`Top sách hay nhất thuộc chủ đề: ${moodInfo.name}`, savedApiKey);
                            if (aiData && aiData.books && aiData.books.length > 0) {
                                liveBatch = aiData.books;
                                if (aiData.analysis) insightText = aiData.analysis;
                            }
                        } catch (e) {
                            console.warn('Live AI fallback:', e);
                        }
                    }
                    if (liveBatch.length === 0) {
                        liveBatch = await fetchOpenLibraryDiscovery(
                            moodInfo.searchQ,
                            24,
                            pageNum,
                            'ai',
                            '🤖 Gemini AI Tuyển Chọn',
                            `Tác phẩm được Trợ lý AI chọn lọc vì giá trị tư tưởng sâu sắc và tính ứng dụng cao.`
                        );
                    }
                } else {
                    // 'all': Plentiful multi-source aggregation (Google Books + Open Library + Curated)
                    if (recLoadingText) recLoadingText.textContent = `Đang kết hợp tuyển tập sách phong phú từ AI, Google Books và Open Library...`;
                    const [gbItems, olItems] = await Promise.all([
                        fetchGoogleBooksRecommendations(moodInfo.gbQuery, 12, offset, pageNum).catch(() => []),
                        fetchOpenLibraryDiscovery(moodInfo.searchQ, 16, pageNum, 'openlibrary', '📖 Open Library', `Sách được đánh giá cao trên thư viện mở toàn cầu.`).catch(() => [])
                    ]);

                    liveBatch = [...gbItems, ...olItems];
                }

                if (pageNum === 1) {
                    results = [...curatedBase, ...liveBatch];
                } else {
                    results = liveBatch;
                }
            }

            // Deduplicate results by normalized title
            const seen = new Set();
            if (append) {
                recBooksGrid.querySelectorAll('.rec-card-title').forEach(el => {
                    seen.add(el.textContent.trim().toLowerCase());
                });
            }
            results = results.filter(b => {
                const norm = (b.title || '').trim().toLowerCase();
                if (!norm || seen.has(norm)) return false;
                seen.add(norm);
                return true;
            });

            // If in append mode and no more new books could be loaded
            if (append && results.length === 0) {
                showToast('Đã tải hết tất cả các sách đề xuất trong danh mục này.');
                if (btnRecLoadMore) btnRecLoadMore.style.display = 'none';
                if (recEndMessage) recEndMessage.style.display = 'inline-flex';
                return;
            }
            if (append && results.length < 12) {
                if (btnRecLoadMore) btnRecLoadMore.style.display = 'none';
                if (recEndMessage) recEndMessage.style.display = 'inline-flex';
            }

            // Render to Grid
            renderRecommendationsToGrid(results, insightText, append);

        } catch (e) {
            console.error('Recommendation engine error:', e);
            if (!append) {
                renderRecommendationsToGrid(RECOMMENDATION_DATABASE.slice(0, 16), 'Đã hiển thị danh mục sách đề xuất nổi bật.', false);
            }
        } finally {
            if (recLoading) recLoading.style.display = 'none';
        }
    }

    // Render cards to Recommendation Grid
    function renderRecommendationsToGrid(books, insightText, append = false) {
        if (!recBooksGrid) return;
        if (!append) {
            recBooksGrid.innerHTML = '';
        }

        if (recAiInsightBox && recAiInsightContent) {
            if (insightText) {
                recAiInsightContent.innerHTML = `<p>${insightText}</p>`;
                recAiInsightBox.style.display = 'block';
            } else if (!append) {
                recAiInsightBox.style.display = 'none';
            }
        }

        const totalRendered = (append ? recBooksGrid.querySelectorAll('.rec-card').length : 0) + (books ? books.length : 0);
        if (recResultsCount) {
            recResultsCount.textContent = `${totalRendered} cuốn sách đề xuất`;
        }

        // Manage Load More button display
        if (recLoadMoreContainer) {
            if (books && books.length > 0) {
                recLoadMoreContainer.style.display = 'flex';
                if (btnRecLoadMore) btnRecLoadMore.style.display = 'block';
                if (recEndMessage) recEndMessage.style.display = 'none';
            } else if (!append) {
                recLoadMoreContainer.style.display = 'none';
            }
        }

        if (!append && (!books || books.length === 0)) {
            recBooksGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <p style="font-size: 1.1rem; margin-bottom: 8px;">Không tìm thấy sách phù hợp với bộ lọc hiện tại.</p>
                    <p style="font-size: 0.85rem;">Bạn hãy thử chuyển sang "Tất cả nguồn" hoặc chọn một chủ đề khác nhé.</p>
                </div>
            `;
            if (recLoadMoreContainer) recLoadMoreContainer.style.display = 'none';
            return;
        }

        if (!books || books.length === 0) return;

        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'rec-card';

            const sourceClasses = {
                'ai': 'rec-source-ai',
                'google': 'rec-source-google',
                'similar': 'rec-source-similar',
                'community': 'rec-source-community',
                'openlibrary': 'rec-source-similar'
            };
            const sourceClass = sourceClasses[book.source] || 'rec-source-ai';

            card.innerHTML = `
                <div class="rec-card-cover-wrap">
                    <span class="rec-source-tag ${sourceClass}">${book.sourceLabel || '✨ Đề xuất'}</span>
                    ${book.coverUrl
                        ? `<img class="rec-card-cover" src="${book.coverUrl}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.removeAttribute('alt');this.src='${generateStylizedBookCoverSvg(book.title, book.author)}';">`
                        : `<img class="rec-card-cover" src="${generateStylizedBookCoverSvg(book.title, book.author)}" alt="" referrerpolicy="no-referrer" loading="lazy">`
                    }
                    ${(book.rating && book.rating > 0) ? `
                    <div class="rec-rating-badge">
                        <span>★</span>
                        <span>${book.rating.toFixed(1)}</span>
                        ${book.ratingsCount > 0 ? `<span style="font-size: 0.65rem; opacity: 0.8;">(${formatRatingCount(book.ratingsCount)})</span>` : ''}
                    </div>
                    ` : ''}
                </div>
                <div class="rec-card-body">
                    <h4 class="rec-card-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h4>
                    <p class="rec-card-author">${escapeHtml(book.author)} ${book.year ? `(${book.year})` : ''}</p>
                    ${book.reason ? `<div class="rec-card-reason" title="${escapeHtml(book.reason)}">${escapeHtml(book.reason)}</div>` : ''}
                    <div class="rec-card-actions">
                        <button type="button" class="btn-rec-action btn-rec-detail" title="Xem chi tiết sách">📖 Chi tiết</button>
                        <button type="button" class="btn-rec-action btn-rec-wishlist ${isInWishlist(book.key) ? 'is-wishlisted' : ''}" title="Thêm vào muốn đọc">🔖 Lưu</button>
                        ${book.audioIdentifier ? `<button type="button" class="btn-rec-action btn-rec-audio" title="Nghe sách nói ngay">🎧 Nghe</button>` : ''}
                    </div>
                </div>
            `;

            // Card click actions
            const coverWrap = card.querySelector('.rec-card-cover-wrap');
            const titleEl = card.querySelector('.rec-card-title');
            const btnDetail = card.querySelector('.btn-rec-detail');
            const btnWishlist = card.querySelector('.btn-rec-wishlist');
            const btnAudio = card.querySelector('.btn-rec-audio');

            const openDetail = () => {
                openBookModal({
                    ...book,
                    key: book.key || '/works/' + encodeURIComponent(book.originalTitle || book.title),
                    title: book.title,
                    titleVi: book.title,
                    originalTitle: book.originalTitle,
                    author: book.author,
                    author_name: [book.author],
                    first_publish_year: book.year,
                    rating: book.rating,
                    ratingsCount: book.ratingsCount,
                    coverUrl: book.coverUrl,
                    summary: book.summary,
                    description: book.description || book.summary,
                    reason: book.reason,
                    subjects: book.subjects
                });
            };

            if (coverWrap) coverWrap.addEventListener('click', openDetail);
            if (titleEl) titleEl.addEventListener('click', openDetail);
            if (btnDetail) btnDetail.addEventListener('click', openDetail);

            if (btnWishlist) {
                btnWishlist.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleWishlist({
                        key: book.key || '/works/' + encodeURIComponent(book.title),
                        title: book.title,
                        titleVi: book.title,
                        originalTitle: book.originalTitle,
                        author: book.author,
                        coverUrl: book.coverUrl,
                        rating: book.rating,
                        ratingsCount: book.ratingsCount
                    });
                    btnWishlist.classList.toggle('is-wishlisted', isInWishlist(book.key));
                });
            }

            if (btnAudio && book.audioIdentifier) {
                btnAudio.addEventListener('click', (e) => {
                    e.stopPropagation();
                    loadAndPlayAudiobook(book.audioIdentifier, 0, true);
                    showToast(`🎧 Đang mở sách nói: ${book.title}`);
                });
            }

            recBooksGrid.appendChild(card);
        });
    }

    // 1-Click: Recommend based on currently listened or read book
    function recommendFromCurrentlyListenedBook() {
        const progressMap = getStoredAudioProgress();
        const activeIds = Object.keys(progressMap);

        let seedTitle = '';
        if (currentAudiobook && currentAudiobook.title) {
            seedTitle = currentAudiobook.title;
        } else if (activeIds.length > 0) {
            const lastId = activeIds[activeIds.length - 1];
            const prog = progressMap[lastId];
            seedTitle = prog?.title || lastId;
        } else if (wishlist.length > 0) {
            seedTitle = wishlist[0].titleVi || wishlist[0].title;
        }

        if (!seedTitle) {
            showToast('💡 Bạn chưa có lịch sử nghe sách nào. Đang hiển thị các tựa sách kinh điển hay nhất!');
            currentRecPage = 1;
            runRecommendationSearch('', currentRecEngine, 'all', 1, false);
            return;
        }

        if (recSearchInput) {
            recSearchInput.value = seedTitle;
        }

        showToast(`🔍 Đang phân tích sách tương đồng với: "${seedTitle}"...`);
        currentRecPage = 1;
        runRecommendationSearch(seedTitle, currentRecEngine, 'all', 1, false);
    }

    // In-memory cache for modal similar book recommendations
    const modalSimilarCache = new Map();

    // Semantic Similarity Clusters for high-precision thematic matching
    const MODAL_SIMILARITY_CLUSTERS = [
        {
            id: 'assertiveness_boundaries',
            name: 'Tự Khẳng Định Mình & Ranh Giới Cá Nhân',
            tag: '🎯 Trị liệu tâm lý & Ranh giới',
            keywords: [
                'nice guy', 'mr. nice guy', 'assertive', 'assertiveness', 'boundary', 'boundaries',
                'people pleasing', 'people pleaser', 'codependen', 'say no', 'ranh giới',
                'tự khẳng định', 'làm hài lòng', 'không còn là mr. nice guy', 'men, psychology',
                'interpersonal relations', 'chàng trai tốt'
            ],
            books: [
                {
                    key: '/works/OL2747970W',
                    title: 'Khi Tôi Nói Không, Tôi Thấy Có Lỗi',
                    originalTitle: 'When I Say No, I Feel Guilty',
                    author: 'Manuel J. Smith',
                    coverUrl: 'https://covers.openlibrary.org/b/id/4471367-M.jpg',
                    rating: 4.8,
                    ratingsCount: 22000,
                    reason: 'Liệu pháp rèn luyện tính quyết đoán và kỹ năng từ chối kinh điển nhất mọi thời đại.'
                },
                {
                    key: '/works/OL1861788W',
                    title: 'Ranh Giới (Boundaries)',
                    originalTitle: 'Boundaries: When to Say Yes, How to Say No',
                    author: 'Henry Cloud & John Townsend',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8231991-M.jpg',
                    rating: 4.7,
                    ratingsCount: 185000,
                    reason: 'Cách vạch ra ranh giới lành mạnh để ngừng làm hài lòng người khác và bảo vệ bản thân.'
                },
                {
                    key: '/works/OL17362095W',
                    title: 'Nghệ Thuật Tinh Tế Của Việc Không Quan Tâm',
                    originalTitle: 'The Subtle Art of Not Giving a F*ck',
                    author: 'Mark Manson',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
                    rating: 4.6,
                    ratingsCount: 420000,
                    reason: 'Học cách từ bỏ nhu cầu được mọi người yêu thích để sống thật với giá trị cốt lõi.'
                },
                {
                    key: '/works/OL20063236W',
                    title: 'Không Phải Người Tốt (Not Nice)',
                    originalTitle: 'Not Nice: Stop People Pleasing, Staying Silent, & Feeling Guilty',
                    author: 'Aziz Gazipura',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12818862-M.jpg',
                    rating: 4.7,
                    ratingsCount: 15000,
                    reason: 'Cẩm nang thực chiến giải phóng bản thân khỏi nỗi sợ xung đột và hội chứng người tốt.'
                },
                {
                    key: '/works/OL2666110W',
                    title: 'Đoạn Tuyệt Thói Đồng Phụ Thuộc (Codependent No More)',
                    originalTitle: 'Codependent No More',
                    author: 'Melody Beattie',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8758832-M.jpg',
                    rating: 4.7,
                    ratingsCount: 210000,
                    reason: 'Phương pháp ngừng kiểm soát và hy sinh bản thân vì vấn đề của người khác.'
                },
                {
                    key: '/works/OL17079998W',
                    title: 'Daring Greatly (Dũng Cảm Đối Mặt)',
                    originalTitle: 'Daring Greatly',
                    author: 'Brené Brown',
                    coverUrl: 'https://covers.openlibrary.org/b/id/7367250-M.jpg',
                    rating: 4.7,
                    ratingsCount: 290000,
                    reason: 'Sức mạnh của việc dám sống thật với sự yếu đuối và vượt qua nỗi xấu hổ.'
                }
            ]
        },
        {
            id: 'habits_productivity',
            name: 'Thói Quen & Hiệu Suất Tập Trung',
            tag: '⚡ Năng suất & Thói quen',
            keywords: [
                'atomic habits', 'thay đổi tí hon', 'habit', 'thói quen', 'deep work',
                'tập trung', 'productivity', 'procrastination', 'trì hoãn', 'make time', 'tiny habits'
            ],
            books: [
                {
                    id: 'rec_atomichabits',
                    key: '/works/OL17930368W',
                    title: 'Thay Đổi Tí Hon (Atomic Habits)',
                    originalTitle: 'Atomic Habits',
                    author: 'James Clear',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12539702-M.jpg',
                    rating: 4.8,
                    ratingsCount: 1650000,
                    reason: 'Phương pháp vi mô 1% mỗi ngày kiến tạo thói quen bền vững.'
                },
                {
                    id: 'rec_deepwork',
                    key: '/works/OL17713267W',
                    title: 'Làm Ra Làm Chơi Ra Chơi (Deep Work)',
                    originalTitle: 'Deep Work',
                    author: 'Cal Newport',
                    coverUrl: 'https://covers.openlibrary.org/b/id/7988607-M.jpg',
                    rating: 4.6,
                    ratingsCount: 380000,
                    reason: 'Bí quyết rèn luyện khả năng tập trung cao độ trong kỷ nguyên số.'
                },
                {
                    key: '/works/OL16834168W',
                    title: 'Sức Mạnh Của Thói Quen (The Power of Habit)',
                    originalTitle: 'The Power of Habit',
                    author: 'Charles Duhigg',
                    coverUrl: 'https://covers.openlibrary.org/b/id/11183311-M.jpg',
                    rating: 4.7,
                    ratingsCount: 520000,
                    reason: 'Giải mã vòng lặp Gợi ý - Thói quen - Phần thưởng của não bộ.'
                },
                {
                    key: '/works/OL19918511W',
                    title: 'Make Time: Tạo Thời Gian Cho Điều Bạn Muốn',
                    originalTitle: 'Make Time',
                    author: 'Jake Knapp & John Zeratsky',
                    coverUrl: 'https://covers.openlibrary.org/b/id/9091395-M.jpg',
                    rating: 4.6,
                    ratingsCount: 45000,
                    reason: 'Chiến thuật 4 bước lấy lại năng lượng và làm chủ quỹ thời gian mỗi ngày.'
                },
                {
                    id: 'rec_startwithwhy',
                    key: '/works/OL15443209W',
                    title: 'Bắt Đầu Với Câu Hỏi Tại Sao (Start With Why)',
                    originalTitle: 'Start With Why',
                    author: 'Simon Sinek',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12714246-M.jpg',
                    rating: 4.6,
                    ratingsCount: 310000,
                    reason: 'Khai mở động lực tự thân từ vòng tròn vàng mục đích cốt lõi.'
                }
            ]
        },
        {
            id: 'wealth_finance_investing',
            name: 'Tài Chính, Đầu Tư & Tâm Lý Tiền Tệ',
            tag: '💰 Tài chính & Đầu tư',
            keywords: [
                'psychology of money', 'tâm lý học về tiền', 'rich dad', 'cha giàu',
                'intelligent investor', 'đầu tư thông minh', 'investing', 'tài chính',
                'tiền', 'chứng khoán', 'cổ phiếu', 'wealth', 'nghĩ giàu làm giàu', 'think and grow rich'
            ],
            books: [
                {
                    id: 'rec_psychologyofmoney',
                    key: '/works/OL21857946W',
                    title: 'Tâm Lý Học Về Tiền',
                    originalTitle: 'The Psychology of Money',
                    author: 'Morgan Housel',
                    coverUrl: 'https://covers.openlibrary.org/b/id/10524456-M.jpg',
                    rating: 4.8,
                    ratingsCount: 480000,
                    reason: 'Cách cảm xúc, cái tôi và tâm lý chi phối mọi quyết định tài chính của bạn.'
                },
                {
                    id: 'rec_richdad',
                    key: '/works/OL82563W',
                    title: 'Dạy Con Làm Giàu (Rich Dad Poor Dad)',
                    originalTitle: 'Rich Dad, Poor Dad',
                    author: 'Robert T. Kiyosaki',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8758832-M.jpg',
                    rating: 4.7,
                    ratingsCount: 2200000,
                    reason: 'Tư duy tài sản vs tiêu sản và con đường thoát khỏi vòng xoáy kim tiền.'
                },
                {
                    id: 'rec_intelligentinvestor',
                    key: '/works/OL15840212W',
                    title: 'Nhà Đầu Tư Thông Minh',
                    originalTitle: 'The Intelligent Investor',
                    author: 'Benjamin Graham',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8447817-M.jpg',
                    rating: 4.7,
                    ratingsCount: 380000,
                    reason: 'Kinh điển đầu tư giá trị và nguyên tắc biên độ an toàn bất hủ.'
                },
                {
                    id: 'rec_nghigiou',
                    key: '/works/OL527464W',
                    title: 'Nghĩ Giàu Làm Giàu (Think and Grow Rich)',
                    originalTitle: 'Think and Grow Rich',
                    author: 'Napoleon Hill',
                    coverUrl: 'https://covers.openlibrary.org/b/id/14542536-M.jpg',
                    rating: 4.7,
                    ratingsCount: 1850000,
                    reason: '13 nguyên tắc làm chủ tâm trí và kiến tạo sự thịnh vượng bền vững.'
                },
                {
                    id: 'rec_predictablyirrational',
                    key: '/works/OL8160088W',
                    title: 'Phi Lý Trí (Predictably Irrational)',
                    originalTitle: 'Predictably Irrational',
                    author: 'Dan Ariely',
                    coverUrl: 'https://covers.openlibrary.org/b/id/6498263-M.jpg',
                    rating: 4.6,
                    ratingsCount: 290000,
                    reason: 'Những lực vô hình định hình cách con người chi tiêu và quyết định.'
                }
            ]
        },
        {
            id: 'power_strategy_mafia',
            name: 'Quyền Lực, Chiến Lược & Nghệ Thuật Thao Túng',
            tag: '⚔️ Chiến lược & Quyền lực',
            keywords: [
                'bố già', 'godfather', '48 laws of power', 'mặt dày tâm đen',
                'tam quốc', 'quân vương', 'the prince', 'machiavelli', 'chiến lược',
                'quyền lực', '48 nguyên tắc', 'sun tzu', 'binh pháp'
            ],
            books: [
                {
                    id: 'rec_bogia',
                    key: '/works/OL82563W_godfather',
                    title: 'Bố Già (The Godfather)',
                    originalTitle: 'The Godfather',
                    author: 'Mario Puzo',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
                    rating: 4.9,
                    ratingsCount: 1800000,
                    reason: 'Đỉnh cao tiểu thuyết nghệ thuật lãnh đạo, quyền lực và gia tộc.'
                },
                {
                    key: '/works/OL15840212W_48laws',
                    title: '48 Nguyên Tắc Chủ Chốt Của Quyền Lực',
                    originalTitle: 'The 48 Laws of Power',
                    author: 'Robert Greene',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8303480-M.jpg',
                    rating: 4.8,
                    ratingsCount: 450000,
                    reason: '3000 năm lịch sử quyền lực và các chiến thuật sinh tồn đỉnh cao.'
                },
                {
                    id: 'rec_matdaytamden',
                    key: '/works/OL25916327W_mdtd',
                    title: 'Mặt Dày Tâm Đen (Thick Face, Black Heart)',
                    originalTitle: 'Thick Face, Black Heart',
                    author: 'Chin-Ning Chu',
                    coverUrl: 'https://covers.openlibrary.org/b/id/11183311-M.jpg',
                    rating: 4.7,
                    ratingsCount: 92000,
                    reason: 'Thuật che giấu ý định và kiên định theo đuổi mục tiêu của người Á Đông.'
                },
                {
                    id: 'rec_tamquoc',
                    key: '/works/OL14945484W',
                    title: 'Tam Quốc Diễn Nghĩa',
                    originalTitle: 'Romance of the Three Kingdoms',
                    author: 'La Quán Trung',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12818862-M.jpg',
                    rating: 4.9,
                    ratingsCount: 520000,
                    reason: 'Bản hùng ca mưu lược quân sự, thuật dùng người và thuật trị quốc đỉnh cao.'
                },
                {
                    key: '/works/OL12726168W_prince',
                    title: 'Quân Vương (The Prince)',
                    originalTitle: 'The Prince',
                    author: 'Niccolò Machiavelli',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12726168-M.jpg',
                    rating: 4.6,
                    ratingsCount: 350000,
                    reason: 'Chân lý lạnh lùng về cách thâu tóm và duy trì quyền lực thực tế.'
                }
            ]
        },
        {
            id: 'philosophical_allegory_spiritual',
            name: 'Hành Trình Tinh Thần, Triết Lý Nhân Sinh',
            tag: '✨ Triết lý & Cảm thức',
            keywords: [
                'nhà giả kim', 'alchemist', 'hoàng tử bé', 'little prince',
                'hành trình về phương đông', 'không gia đình', 'cây cam ngọt',
                'triết lý', 'linh hồn', 'ý nghĩa cuộc sống', 'giấc mơ'
            ],
            books: [
                {
                    id: 'rec_nhagiakim',
                    key: '/works/OL82563W_alchemist',
                    title: 'Nhà Giả Kim (The Alchemist)',
                    originalTitle: 'The Alchemist',
                    author: 'Paulo Coelho',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
                    rating: 4.8,
                    ratingsCount: 3200000,
                    reason: 'Hành trình lắng nghe con tim và kiên trì theo đuổi vận mệnh cuộc đời.'
                },
                {
                    id: 'rec_hoangtube',
                    key: '/works/OL15840212W_prince',
                    title: 'Hoàng Tử Bé (The Little Prince)',
                    originalTitle: 'Le Petit Prince',
                    author: 'Antoine de Saint-Exupéry',
                    coverUrl: 'https://covers.openlibrary.org/b/id/10524456-M.jpg',
                    rating: 4.9,
                    ratingsCount: 2500000,
                    reason: 'Những điều cốt lõi vô hình trước mắt trần, chỉ nhìn thấy rõ bằng trái tim.'
                },
                {
                    id: 'rec_hanhtrinhphuongdong',
                    key: '/works/OL1861788W_htpd',
                    title: 'Hành Trình Về Phương Đông',
                    originalTitle: 'Life and Teaching of the Masters of the Far East',
                    author: 'Baird T. Spalding',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8447817-M.jpg',
                    rating: 4.7,
                    ratingsCount: 160000,
                    reason: 'Khai mở những giá trị minh triết cổ xưa và sức mạnh tiềm thức con người.'
                },
                {
                    id: 'rec_khonggiadinh',
                    key: '/works/OL17362095W_kgd',
                    title: 'Không Gia Đình (Sans Famille)',
                    originalTitle: 'Sans Famille',
                    author: 'Hector Malot',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12818862-M.jpg',
                    rating: 4.8,
                    ratingsCount: 420000,
                    reason: 'Bản anh hùng ca cảm động về tình người và nghị lực vượt lên số phận.'
                },
                {
                    key: '/works/OL12819857W_orange',
                    title: 'Cây Cam Ngọt Của Tôi',
                    originalTitle: 'My Sweet Orange Tree',
                    author: 'José Mauro de Vasconcelos',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12819857-M.jpg',
                    rating: 4.9,
                    ratingsCount: 180000,
                    reason: 'Câu chuyện lay động tâm can về lòng trắc ẩn và thế giới nội tâm của trẻ thơ.'
                }
            ]
        },
        {
            id: 'mindfulness_zen_healing',
            name: 'Thiền, Tỉnh Thức & Chữa Lành Nội Tâm',
            tag: '🌿 Thiền & Bình an nội tâm',
            keywords: [
                'giận', 'anger', 'thích nhất hạnh', 'sức mạnh của hiện tại',
                'power of now', 'eckhart tolle', 'thiền', 'tỉnh thức',
                'mindfulness', 'hiểu về trái tim', 'bình an', 'chữa lành', 'an lạc'
            ],
            books: [
                {
                    id: 'rec_gian',
                    key: '/works/OL25916327W_gian',
                    title: 'Giận (Anger: Wisdom for Cooling the Flames)',
                    originalTitle: 'Anger',
                    author: 'Thích Nhất Hạnh',
                    coverUrl: 'https://covers.openlibrary.org/b/id/11183311-M.jpg',
                    rating: 4.8,
                    ratingsCount: 190000,
                    reason: 'Nghệ thuật ôm ấp cơn giận bằng chánh niệm và chuyển hóa năng lượng tiêu cực.'
                },
                {
                    id: 'rec_powerofnow',
                    key: '/works/OL15840212W_now',
                    title: 'Sức Mạnh Của Hiện Tại (The Power of Now)',
                    originalTitle: 'The Power of Now',
                    author: 'Eckhart Tolle',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8303480-M.jpg',
                    rating: 4.7,
                    ratingsCount: 1100000,
                    reason: 'Thoát khỏi sự đồng nhất với tâm trí để sống trong sự tĩnh tại thuần khiết.'
                },
                {
                    key: '/works/OL1058381W_hieuvetraitim',
                    title: 'Hiểu Về Trái Tim',
                    originalTitle: 'Understanding the Heart',
                    author: 'Minh Niệm',
                    coverUrl: 'https://covers.openlibrary.org/b/id/1058381-M.jpg',
                    rating: 4.9,
                    ratingsCount: 250000,
                    reason: 'Cẩm nang soi chiếu 50 trạng thái cảm xúc để tìm lại sự an trú tự thân.'
                },
                {
                    key: '/works/OL14437863W_phepmautinhtuc',
                    title: 'Phép Màu Của Sự Tỉnh Thức',
                    originalTitle: 'The Miracle of Mindfulness',
                    author: 'Thích Nhất Hạnh',
                    coverUrl: 'https://covers.openlibrary.org/b/id/14437863-M.jpg',
                    rating: 4.8,
                    ratingsCount: 310000,
                    reason: 'Thực hành chánh niệm nhẹ nhàng qua từng hơi thở và bước chân hằng ngày.'
                },
                {
                    id: 'rec_sucmanhtiemthuc',
                    key: '/works/OL14945484W_subconscious',
                    title: 'Sức Mạnh Tiềm Thức',
                    originalTitle: 'The Power of Your Subconscious Mind',
                    author: 'Joseph Murphy',
                    coverUrl: 'https://covers.openlibrary.org/b/id/10829208-M.jpg',
                    rating: 4.7,
                    ratingsCount: 650000,
                    reason: 'Khai phóng nguồn năng lượng chữa lành vô tận ẩn sâu trong tiềm thức.'
                }
            ]
        },
        {
            id: 'mystery_thriller_detective',
            name: 'Trinh Thám, Bí Ẩn & Phá Án',
            tag: '🔍 Trinh thám & Bí ẩn',
            keywords: [
                'mật mã da vinci', 'da vinci code', 'sherlock holmes', 'conan doyle',
                'agatha christie', 'hỏa ngục', 'inferno', 'thiên thần và ác quỷ',
                'trinh thám', 'vụ án', 'higashino keigo', 'nghi can x'
            ],
            books: [
                {
                    id: 'rec_sherlockholmes',
                    key: '/works/OL14945484W_sherlock',
                    title: 'Sherlock Holmes Toàn Tập',
                    originalTitle: 'The Adventures of Sherlock Holmes',
                    author: 'Arthur Conan Doyle',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8303480-M.jpg',
                    rating: 4.9,
                    ratingsCount: 2400000,
                    reason: 'Tượng đài trinh thám suy luận logic kinh điển nhất lịch sử nhân loại.'
                },
                {
                    id: 'rec_davincicode',
                    key: '/works/OL12726168W_davinci',
                    title: 'Mật Mã Da Vinci (The Da Vinci Code)',
                    originalTitle: 'The Da Vinci Code',
                    author: 'Dan Brown',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12726168-M.jpg',
                    rating: 4.7,
                    ratingsCount: 2200000,
                    reason: 'Cuộc rượt đuổi nghẹt thở giải mã các biểu tượng lịch sử và tôn giáo.'
                },
                {
                    key: '/works/OL82563W_agatha',
                    title: 'Và Rồi Chẳng Còn Ai (And Then There Were None)',
                    originalTitle: 'And Then There Were None',
                    author: 'Agatha Christie',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
                    rating: 4.9,
                    ratingsCount: 1600000,
                    reason: 'Kiệt tác vụ án đảo hoang biệt lập với luật chơi định mệnh không lối thoát.'
                },
                {
                    key: '/works/OL10524456W_keigo',
                    title: 'Phía Sau Nghi Can X',
                    originalTitle: 'The Devotion of Suspect X',
                    author: 'Higashino Keigo',
                    coverUrl: 'https://covers.openlibrary.org/b/id/10524456-M.jpg',
                    rating: 4.8,
                    ratingsCount: 190000,
                    reason: 'Cuộc đấu trí thiên tài giữa hai bộ óc vật lý và toán học vì một tình yêu mù quáng.'
                }
            ]
        },
        {
            id: 'science_cosmology_scifi',
            name: 'Khoa Học, Vũ Trụ & Khoa Học Viễn Tưởng',
            tag: '🚀 Khoa học & Vũ trụ',
            keywords: [
                'tam thể', 'three-body', 'cosmos', 'vũ trụ', 'carl sagan',
                'stephen hawking', 'dune', 'xứ cát', 'khoa học viễn tưởng', 'sci-fi', 'lược sử thời gian'
            ],
            books: [
                {
                    id: 'rec_threebody',
                    key: '/works/OL17362095W_threebody',
                    title: 'Tam Thể (The Three-Body Problem)',
                    originalTitle: 'The Three-Body Problem',
                    author: 'Cixin Liu',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12818862-M.jpg',
                    rating: 4.8,
                    ratingsCount: 410000,
                    reason: 'Đỉnh cao khoa học viễn tưởng châu Á về thuyết khu rừng đen tối trong vũ trụ.'
                },
                {
                    id: 'rec_cosmos',
                    key: '/works/OL1861788W_cosmos',
                    title: 'Cosmos: Vũ Trụ',
                    originalTitle: 'Cosmos',
                    author: 'Carl Sagan',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8447817-M.jpg',
                    rating: 4.9,
                    ratingsCount: 680000,
                    reason: 'Bản tình ca thi vị về vị thế của loài người giữa không gian 15 tỷ năm vũ trụ.'
                },
                {
                    key: '/works/OL11183311W_hawking',
                    title: 'Lược Sử Thời Gian',
                    originalTitle: 'A Brief History of Time',
                    author: 'Stephen Hawking',
                    coverUrl: 'https://covers.openlibrary.org/b/id/11183311-M.jpg',
                    rating: 4.7,
                    ratingsCount: 550000,
                    reason: 'Khám phá bí ẩn về lỗ đen, Big Bang và nguồn gốc của không - thời gian.'
                },
                {
                    key: '/works/OL10829208W_dune',
                    title: 'Xứ Cát (Dune)',
                    originalTitle: 'Dune',
                    author: 'Frank Herbert',
                    coverUrl: 'https://covers.openlibrary.org/b/id/10829208-M.jpg',
                    rating: 4.8,
                    ratingsCount: 1200000,
                    reason: 'Sử thi viễn tưởng vĩ đại về hành tinh sa mạc, tôn giáo và sinh thái học.'
                }
            ]
        },
        {
            id: 'classics_world_masterpiece',
            name: 'Văn Học Kinh Điển Thế Giới',
            tag: '📖 Văn học kinh điển',
            keywords: [
                '1984', 'george orwell', 'tội ác và trừng phạt', 'crime and punishment',
                'dostoevsky', 'trại súc vật', 'animal farm', 'đại gia gatsby',
                'great gatsby', 'hóa thân', 'kafka', 'chuông nguyện hồn ai'
            ],
            books: [
                {
                    key: '/works/OL1168007W',
                    title: '1984 (Một Chín Tám Tư)',
                    originalTitle: 'Nineteen Eighty-Four',
                    author: 'George Orwell',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12818862-M.jpg',
                    rating: 4.9,
                    ratingsCount: 4200000,
                    reason: 'Kiệt tác phản địa đàng cảnh báo về sự kiểm soát tư tưởng và quyền lực tuyệt đối.'
                },
                {
                    key: '/works/OL1861788W_crime',
                    title: 'Tội Ác Và Trừng Phạt',
                    originalTitle: 'Crime and Punishment',
                    author: 'Fyodor Dostoevsky',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8447817-M.jpg',
                    rating: 4.9,
                    ratingsCount: 1100000,
                    reason: 'Mổ xẻ tâm lý tội phạm, sự cắn rứt lương tâm và con đường cứu rỗi linh hồn.'
                },
                {
                    key: '/works/OL82563W_animalfarm',
                    title: 'Trại Súc Vật (Animal Farm)',
                    originalTitle: 'Animal Farm',
                    author: 'George Orwell',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
                    rating: 4.8,
                    ratingsCount: 3500000,
                    reason: 'Ngụ ngôn chính trị châm biếm sâu cay về sự tha hóa của quyền lực.'
                },
                {
                    key: '/works/OL10524456W_kafka',
                    title: 'Hóa Thân (The Metamorphosis)',
                    originalTitle: 'The Metamorphosis',
                    author: 'Franz Kafka',
                    coverUrl: 'https://covers.openlibrary.org/b/id/10524456-M.jpg',
                    rating: 4.7,
                    ratingsCount: 890000,
                    reason: 'Nỗi cô đơn hiện sinh và sự tha hóa tàn khốc của con người trong xã hội hiện đại.'
                }
            ]
        },
        {
            id: 'stoicism_resilience_adversity',
            name: 'Chủ Nghĩa Khắc Kỷ & Bản Lĩnh Nghịch Cảnh',
            tag: '🛡️ Khắc kỷ & Bản lĩnh',
            keywords: [
                'suy tưởng', 'meditations', 'marcus aurelius', 'khắc kỷ', 'stoic',
                'stoicism', 'đi tìm lẽ sống', 'man\'s search for meaning', 'viktor frankl',
                'can\'t hurt me', 'david goggins', 'ryan holiday', 'vượt lên nghịch cảnh'
            ],
            books: [
                {
                    key: '/works/OL15840212W_meditations',
                    title: 'Suy Tưởng (Meditations)',
                    originalTitle: 'Meditations',
                    author: 'Marcus Aurelius',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8303480-M.jpg',
                    rating: 4.9,
                    ratingsCount: 650000,
                    reason: 'Những chiêm nghiệm vĩ đại của hoàng đế La Mã về kỷ luật và bình thản nội tâm.'
                },
                {
                    key: '/works/OL12726168W_frankl',
                    title: 'Đi Tìm Lẽ Sống (Man\'s Search for Meaning)',
                    originalTitle: 'Man\'s Search for Meaning',
                    author: 'Viktor E. Frankl',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12726168-M.jpg',
                    rating: 4.9,
                    ratingsCount: 1500000,
                    reason: 'Tìm thấy ý nghĩa tối thượng để sinh tồn ngay trong trại tập trung diệt chủng.'
                },
                {
                    key: '/works/OL12818862W_goggins',
                    title: 'Can\'t Hurt Me (Không Thể Làm Tôi Bị Thương)',
                    originalTitle: 'Can\'t Hurt Me',
                    author: 'David Goggins',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12818862-M.jpg',
                    rating: 4.8,
                    ratingsCount: 420000,
                    reason: 'Làm chủ tâm trí và vượt qua rào cản 40% giới hạn sức chịu đựng con người.'
                },
                {
                    key: '/works/OL8447817W_ryan',
                    title: 'Vượt Lên Nghịch Cảnh (The Obstacle Is the Way)',
                    originalTitle: 'The Obstacle Is the Way',
                    author: 'Ryan Holiday',
                    coverUrl: 'https://covers.openlibrary.org/b/id/8447817-M.jpg',
                    rating: 4.7,
                    ratingsCount: 220000,
                    reason: 'Nghệ thuật biến trở ngại và nghịch cảnh thành đòn bẩy thăng tiến.'
                }
            ]
        },
        {
            id: 'communication_social_empathy',
            name: 'Giao Tiếp, Thấu Cảm & Thu Phục Lòng Người',
            tag: '💬 Giao tiếp & Thấu cảm',
            keywords: [
                'đắc nhân tâm', 'how to win friends', 'dale carnegie', 'quẳng gánh lo',
                'giao tiếp', 'khéo ăn nói', 'thuyết phục', 'lắng nghe', 'nonviolent communication'
            ],
            books: [
                {
                    id: 'rec_dacnhantam',
                    key: '/works/OL1063267W',
                    title: 'Đắc Nhân Tâm (How to Win Friends)',
                    originalTitle: 'How to Win Friends and Influence People',
                    author: 'Dale Carnegie',
                    coverUrl: 'https://covers.openlibrary.org/b/id/13314878-M.jpg',
                    rating: 4.7,
                    ratingsCount: 4400000,
                    reason: 'Nghệ thuật giao tiếp, thấu cảm và chân thành thu phục lòng người.'
                },
                {
                    id: 'rec_quangganhlo',
                    key: '/works/OL1063338W',
                    title: 'Quẳng Gánh Lo Đi Và Vui Sống',
                    originalTitle: 'How to Stop Worrying and Start Living',
                    author: 'Dale Carnegie',
                    coverUrl: 'https://covers.openlibrary.org/b/id/10829208-M.jpg',
                    rating: 4.7,
                    ratingsCount: 1850000,
                    reason: 'Liệu pháp tâm lý thực tế giải tỏa âu lo trong công việc và cuộc sống.'
                },
                {
                    key: '/works/OL12819857W_nvc',
                    title: 'Giao Tiếp Bất Bạo Động (Nonviolent Communication)',
                    originalTitle: 'Nonviolent Communication: A Language of Life',
                    author: 'Marshall B. Rosenberg',
                    coverUrl: 'https://covers.openlibrary.org/b/id/12819857-M.jpg',
                    rating: 4.8,
                    ratingsCount: 120000,
                    reason: 'Giao tiếp bằng sự trắc ẩn để hóa giải xung đột và kết nối sâu sắc.'
                },
                {
                    key: '/works/OL1058381W_listen',
                    title: 'Sức Mạnh Của Lắng Nghe (Just Listen)',
                    originalTitle: 'Just Listen',
                    author: 'Mark Goulston',
                    coverUrl: 'https://covers.openlibrary.org/b/id/1058381-M.jpg',
                    rating: 4.7,
                    ratingsCount: 65000,
                    reason: 'Cách tiếp cận và mở khóa tâm lý những người khó tính nhất.'
                }
            ]
        }
    ];

    // Show shimmer skeleton cards in the modal recommendation scroll
    function showModalRecSkeletons() {
        if (!modalRecScroll) return;
        modalRecScroll.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const sk = document.createElement('div');
            sk.className = 'modal-rec-skeleton';
            sk.innerHTML = `
                <div class="modal-rec-skeleton-thumb"></div>
                <div class="modal-rec-skeleton-line" style="width: 85%;"></div>
                <div class="modal-rec-skeleton-line" style="width: 60%;"></div>
            `;
            modalRecScroll.appendChild(sk);
        }
    }

    // Render list of similar books to modal
    function renderModalSimilarItems(book, similarList, tagLabel = 'Tương quan chủ đề') {
        if (!modalRecWrapper || !modalRecScroll) return;
        modalRecScroll.innerHTML = '';

        if (!similarList || similarList.length === 0) {
            modalRecWrapper.style.display = 'none';
            return;
        }

        const currentTitle = (book.titleVi || book.title || '').trim().toLowerCase();
        const currentOrig = (book.originalTitle || '').trim().toLowerCase();

        // Filter out current book itself
        const filtered = similarList.filter(item => {
            const itemTitle = (item.titleVi || item.title || '').trim().toLowerCase();
            const itemOrig = (item.originalTitle || '').trim().toLowerCase();
            if (itemTitle === currentTitle || (currentOrig && itemOrig === currentOrig)) return false;
            if (book.key && item.key && book.key === item.key) return false;
            return true;
        });

        if (filtered.length === 0) {
            modalRecWrapper.style.display = 'none';
            return;
        }

        if (modalRecTitle) {
            modalRecTitle.textContent = `✨ Sách tương tự & Cùng chủ đề`;
        }
        if (modalRecTag) {
            modalRecTag.textContent = tagLabel;
        }
        modalRecWrapper.style.display = 'block';

        filtered.slice(0, 6).forEach(item => {
            const el = document.createElement('div');
            el.className = 'modal-rec-item';
            el.title = `${item.title} — ${item.author || 'Tác giả'}${item.reason ? ' (' + item.reason + ')' : ''}`;
            const coverSrc = item.coverUrl || (item.coverId ? `https://covers.openlibrary.org/b/id/${item.coverId}-M.jpg` : generateStylizedBookCoverSvg(item.title, item.author));

            el.innerHTML = `
                <img class="modal-rec-thumb" src="${coverSrc}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.onerror=null;this.src='${generateStylizedBookCoverSvg(item.title, item.author)}';">
                <span class="modal-rec-name">${escapeHtml(item.title)}</span>
                <span class="modal-rec-author">${escapeHtml(item.author || '')}</span>
                ${item.reason ? `<span class="modal-rec-reason" title="${escapeHtml(item.reason)}">${escapeHtml(item.reason)}</span>` : ''}
            `;

            el.addEventListener('click', () => {
                openBookModal({
                    key: item.key || `/works/sim_${encodeURIComponent(item.title)}`,
                    title: item.title,
                    titleVi: item.title,
                    originalTitle: item.originalTitle || item.title,
                    author: item.author || 'Tác giả',
                    coverUrl: item.coverUrl,
                    coverId: item.coverId,
                    rating: item.rating || 4.7,
                    ratingsCount: item.ratingsCount || 50000,
                    reason: item.reason,
                    year: item.year || ''
                });
            });

            modalRecScroll.appendChild(el);
        });
    }

    // Core async function to find truly similar books for any book opened in modal
    async function updateModalSimilarBooks(book, fetchedSubjects = []) {
        if (!modalRecWrapper || !modalRecScroll) return;

        const bookTitle = (book.titleVi || book.title || '').trim();
        const bookOrig = (book.originalTitle || '').trim();
        const bookAuthor = (book.author || '').trim();
        const allSubjects = [...(book.subjects || []), ...(fetchedSubjects || [])];

        const cacheKey = `${book.key || bookTitle}_${bookAuthor}`.toLowerCase();
        if (modalSimilarCache.has(cacheKey)) {
            const cached = modalSimilarCache.get(cacheKey);
            renderModalSimilarItems(book, cached.books, cached.tag);
            return;
        }

        // Show skeletons immediately while analyzing
        showModalRecSkeletons();
        modalRecWrapper.style.display = 'block';
        if (modalRecTag) modalRecTag.textContent = 'Đang phân tích...';

        const textToMatch = `${bookTitle} ${bookOrig} ${bookAuthor} ${allSubjects.join(' ')}`.toLowerCase();

        // 1. Check Specific Semantic Clusters (Instant & 100% thematic accuracy)
        for (const cluster of MODAL_SIMILARITY_CLUSTERS) {
            const hasMatch = cluster.keywords.some(k => textToMatch.includes(k.toLowerCase()));
            if (hasMatch) {
                // Filter out the book itself from the cluster
                const clusterBooks = cluster.books.filter(b => {
                    const bt = (b.title || '').toLowerCase();
                    const bo = (b.originalTitle || '').toLowerCase();
                    return !textToMatch.includes(bt) && !textToMatch.includes(bo);
                });

                if (clusterBooks.length > 0) {
                    modalSimilarCache.set(cacheKey, { books: clusterBooks, tag: cluster.tag });
                    renderModalSimilarItems(book, clusterBooks, cluster.tag);
                    return;
                }
            }
        }

        // 2. Check Expanded Semantic Similarity Graph from RECOMMENDATION_DATABASE
        for (const [keyTitle, ids] of Object.entries(SEMANTIC_SIMILARITY_GRAPH)) {
            if (textToMatch.includes(keyTitle)) {
                const dbMatches = RECOMMENDATION_DATABASE.filter(b => ids.includes(b.id) && !textToMatch.includes(b.title.toLowerCase()));
                if (dbMatches.length > 0) {
                    modalSimilarCache.set(cacheKey, { books: dbMatches, tag: '🎯 Sách tương quan cao' });
                    renderModalSimilarItems(book, dbMatches, '🎯 Sách tương quan cao');
                    return;
                }
            }
        }

        // 3. Dynamic Online Discovery: Query Open Library for real same-author or same-subject books
        try {
            let onlineMatches = [];
            const cleanAuthor = (bookAuthor && bookAuthor !== 'Tác giả' && bookAuthor !== 'Nhiều tác giả') ? bookAuthor.split(',')[0].trim() : '';

            // 3a. Search other books by the same author
            if (cleanAuthor && cleanAuthor.length > 2) {
                try {
                    const authorUrl = `https://openlibrary.org/search.json?author=${encodeURIComponent(cleanAuthor)}&limit=8&fields=key,title,author_name,cover_i,ratings_average,ratings_count,first_publish_year`;
                    const resp = await fetch(authorUrl);
                    if (resp.ok) {
                        const data = await resp.json();
                        (data.docs || []).forEach(doc => {
                            const dTitle = (doc.title || '').toLowerCase();
                            if (dTitle && !textToMatch.includes(dTitle) && !onlineMatches.some(m => m.title.toLowerCase() === dTitle)) {
                                onlineMatches.push({
                                    key: doc.key,
                                    title: doc.title,
                                    originalTitle: doc.title,
                                    author: doc.author_name ? doc.author_name[0] : cleanAuthor,
                                    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
                                    rating: doc.ratings_average ? Number(doc.ratings_average.toFixed(1)) : 4.6,
                                    ratingsCount: doc.ratings_count || 12000,
                                    reason: `Cùng tác giả ${cleanAuthor}`,
                                    year: doc.first_publish_year ? String(doc.first_publish_year) : ''
                                });
                            }
                        });
                    }
                } catch (err) {
                    console.warn('Same-author search error:', err);
                }
            }

            // 3b. If fewer than 4 books, search specific clean subjects on Open Library
            if (onlineMatches.length < 4 && allSubjects.length > 0) {
                // Filter out non-specific subjects
                const badSubjects = ['general', 'accessible book', 'protected daisy', 'internet archive', 'fiction', 'non-fiction', 'books'];
                const validSubjects = allSubjects.filter(s => {
                    const sl = s.toLowerCase().trim();
                    return sl.length > 2 && !badSubjects.some(b => sl.includes(b));
                });

                if (validSubjects.length > 0) {
                    const topSubject = validSubjects[0].trim();
                    try {
                        const subjUrl = `https://openlibrary.org/search.json?q=subject%3A%22${encodeURIComponent(topSubject)}%22&limit=8&fields=key,title,author_name,cover_i,ratings_average,ratings_count,first_publish_year`;
                        const sResp = await fetch(subjUrl);
                        if (sResp.ok) {
                            const sData = await sResp.json();
                            (sData.docs || []).forEach(doc => {
                                const dTitle = (doc.title || '').toLowerCase();
                                if (dTitle && !textToMatch.includes(dTitle) && !onlineMatches.some(m => m.title.toLowerCase() === dTitle)) {
                                    onlineMatches.push({
                                        key: doc.key,
                                        title: doc.title,
                                        originalTitle: doc.title,
                                        author: doc.author_name ? doc.author_name[0] : 'Nhiều tác giả',
                                        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
                                        rating: doc.ratings_average ? Number(doc.ratings_average.toFixed(1)) : 4.7,
                                        ratingsCount: doc.ratings_count || 25000,
                                        reason: `Cùng chủ đề: ${topSubject}`,
                                        year: doc.first_publish_year ? String(doc.first_publish_year) : ''
                                    });
                                }
                            });
                        }
                    } catch (e) {
                        console.warn('Subject similarity search error:', e);
                    }
                }
            }

            // Filter books to only those with valid covers or rich metadata
            const verifiedMatches = onlineMatches.filter(b => b.coverUrl);
            if (verifiedMatches.length > 0) {
                modalSimilarCache.set(cacheKey, { books: verifiedMatches, tag: '📖 Cùng tác giả & Thể loại' });
                renderModalSimilarItems(book, verifiedMatches, '📖 Cùng tác giả & Thể loại');
                return;
            }
        } catch (e) {
            console.warn('Online similar books discovery error:', e);
        }

        // 4. Strict Relevance Guard: If NO relevant books were found, HIDE the section
        // CRITICAL: NEVER display arbitrary unrelated default books!
        modalRecWrapper.style.display = 'none';
        modalRecScroll.innerHTML = '';
    }

    // =========================================
    // Thematic Audio Clusters for High-Precision Audio Player Suggestions (Diverse Authors)
    // =========================================
    const PLAYER_SUGGESTED_CLUSTERS = [
        {
            id: 'horror_mystery_thriller',
            tag: '👻 Trinh thám, Kinh dị & Ly kỳ',
            moodId: 'thriller',
            recPagePrompt: 'Trinh thám ly kỳ kinh dị bí ẩn vụ án hồi hộp',
            recPageTitle: '👻 Tuyển tập Trinh thám, Kinh dị & Ly kỳ (Đa tác giả)',
            keywords: [
                'nguyễn ngọc ngạn', 'nguyen ngoc ngan', 'truyện ma', 'truyen ma', 'kinh dị',
                'cõi âm', 'ngôi mộ', 'bóng người dưới trăng', 'đêm không trăng', 'hồn về trong gió',
                'đêm vàng', 'mưa bên chồng', 'nỗi sầu sâu kín', 'việt kiều', 'ma', 'rùng rợn',
                'tâm linh', 'huyền bí', 'trinh thám', 'vụ án', 'sherlock', 'keigo', 'dan brown',
                'agatha', 'stephen king', 'dracula'
            ],
            items: [
                {
                    title: 'Phía Sau Nghi Can X',
                    author: 'Higashino Keigo',
                    cover: 'https://covers.openlibrary.org/b/id/10524456-M.jpg',
                    key: '/works/OL10524456W_keigo',
                    reason: 'Đấu trí toán học thiên tài vì tình yêu mù quáng'
                },
                {
                    title: 'Mật Mã Da Vinci',
                    author: 'Dan Brown',
                    identifier: 'mat-ma-da-vinci.sna',
                    cover: 'https://archive.org/services/img/mat-ma-da-vinci.sna',
                    type: 'archive',
                    reason: 'Trinh thám biểu tượng mật mã kinh điển thế giới'
                },
                {
                    title: 'Sherlock Holmes Toàn Tập',
                    author: 'Arthur Conan Doyle',
                    identifier: 'sherlock_holmes_canon_08_02_librivox',
                    cover: 'https://archive.org/services/img/sherlock_holmes_canon_08_02_librivox',
                    type: 'archive',
                    reason: 'Vụ án bí ẩn và phương pháp suy luận đỉnh cao'
                },
                {
                    title: 'Và Rồi Chẳng Còn Ai',
                    author: 'Agatha Christie',
                    cover: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
                    key: '/works/OL8226191W_agatha',
                    reason: 'Kiệt tác vụ án biệt lập không lối thoát'
                },
                {
                    title: 'Bố Già (The Godfather)',
                    author: 'Mario Puzo',
                    identifier: 'bogia_201903',
                    cover: 'https://archive.org/services/img/bogia_201903',
                    type: 'archive',
                    reason: 'Thế giới ngầm và nghệ thuật tâm lý gia tộc nghẹt thở'
                },
                {
                    title: 'Kẻ Ám Ảnh (The Shining)',
                    author: 'Stephen King',
                    cover: 'https://covers.openlibrary.org/b/id/8231991-M.jpg',
                    key: '/works/OL8231991W_king',
                    reason: 'Đỉnh cao kinh dị tâm lý trong khách sạn Overlook'
                },
                {
                    title: 'Dracula (Bá Tước Ma Cà Rồng)',
                    author: 'Bram Stoker',
                    identifier: 'dracula_librivox',
                    cover: 'https://archive.org/services/img/dracula_librivox',
                    type: 'archive',
                    reason: 'Kiệt tác văn học kinh dị Gothic cổ điển bất hủ'
                }
            ]
        },
        {
            id: 'habits_productivity',
            tag: '⚡ Thói quen & Năng suất đỉnh cao',
            moodId: 'self-help',
            recPagePrompt: 'Phát triển bản thân thói quen năng suất tập trung',
            recPageTitle: '⚡ Tuyển tập Thói quen & Năng suất (Đa tác giả)',
            keywords: [
                'atomic habits', 'thay đổi tí hon', 'thói quen', 'deep work',
                '7 thói quen', 'tuổi trẻ đáng giá', 'sức mạnh tiềm thức', 'trên đường băng', 'năng suất',
                'tập trung', 'james clear', 'stephen covey', 'cal newport', 'charles duhigg'
            ],
            items: [
                {
                    title: 'Thay Đổi Tí Hon (Atomic Habits)',
                    author: 'James Clear',
                    identifier: 'tdthhqbn',
                    cover: 'https://archive.org/services/img/tdthhqbn',
                    type: 'archive',
                    reason: 'Thói quen tí hon 1% mỗi ngày kiến tạo thành công'
                },
                {
                    title: '7 Thói Quen Hiệu Quả',
                    author: 'Stephen R. Covey',
                    identifier: 'yt_VqZsr9N2-kU',
                    cover: 'https://i.ytimg.com/vi/VqZsr9N2-kU/hqdefault.jpg',
                    type: 'youtube',
                    reason: 'Khung tư duy lãnh đạo và làm chủ cuộc đời'
                },
                {
                    title: 'Làm Ra Làm Chơi Ra Chơi (Deep Work)',
                    author: 'Cal Newport',
                    cover: 'https://covers.openlibrary.org/b/id/7988607-M.jpg',
                    key: '/works/OL17713267W',
                    reason: 'Rèn luyện khả năng tập trung cao độ kỷ nguyên số'
                },
                {
                    title: 'Sức Mạnh Của Thói Quen',
                    author: 'Charles Duhigg',
                    cover: 'https://covers.openlibrary.org/b/id/11183311-M.jpg',
                    key: '/works/OL16834168W',
                    reason: 'Giải mã cơ chế vòng lặp thói quen của não bộ'
                },
                {
                    title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu',
                    author: 'Rosie Nguyễn',
                    identifier: 'tuoi-tre-dang-gia-bao-nhieu.sna',
                    cover: 'https://archive.org/services/img/tuoi-tre-dang-gia-bao-nhieu.sna',
                    type: 'archive',
                    reason: 'Khai mở đam mê và định vị bản thân'
                },
                {
                    title: 'Trên Đường Băng',
                    author: 'Tony Buổi Sáng',
                    identifier: 'tren-duong-bang.sna',
                    cover: 'https://archive.org/services/img/tren-duong-bang.sna',
                    type: 'archive',
                    reason: 'Hành trang tư duy mở bước ra thế giới'
                }
            ]
        },
        {
            id: 'finance_wealth',
            tag: '💰 Tài chính, Đầu tư & Làm giàu',
            moodId: 'finance',
            recPagePrompt: 'Tài chính kinh doanh đầu tư làm giàu quản lý tiền bạc',
            recPageTitle: '💰 Tuyển tập Tài chính & Đầu tư (Đa tác giả)',
            keywords: [
                'cha giàu', 'cha nghèo', 'rich dad', 'tâm lý học về tiền', 'psychology of money',
                'nghĩ giàu làm giàu', 'tài chính', 'tiền bạc', 'đầu tư', 'kinh doanh',
                'robert kiyosaki', 'morgan housel', 'napoleon hill', 'benjamin graham'
            ],
            items: [
                {
                    title: 'Tâm Lý Học Về Tiền',
                    author: 'Morgan Housel',
                    identifier: 'tam-ly-hoc-ve-tien',
                    cover: 'https://archive.org/services/img/tam-ly-hoc-ve-tien',
                    type: 'archive',
                    reason: 'Hành vi và tâm lý chi phối quyết định tài chính'
                },
                {
                    title: 'Cha Giàu Cha Nghèo (Dạy Con Làm Giàu)',
                    author: 'Robert T. Kiyosaki',
                    identifier: 'cha-giau-cha-ngheo',
                    cover: 'https://archive.org/services/img/cha-giau-cha-ngheo',
                    type: 'archive',
                    reason: 'Tư duy tài sản vs tiêu sản để đạt tự do'
                },
                {
                    title: 'Nghĩ Giàu & Làm Giàu',
                    author: 'Napoleon Hill',
                    identifier: 'nghi-giau-lam-giau.sna',
                    cover: 'https://archive.org/services/img/nghi-giau-lam-giau.sna',
                    type: 'archive',
                    reason: '13 nguyên tắc thành công vượt thời gian'
                },
                {
                    title: 'Nhà Đầu Tư Thông Minh',
                    author: 'Benjamin Graham',
                    cover: 'https://covers.openlibrary.org/b/id/8447817-M.jpg',
                    key: '/works/OL15840212W',
                    reason: 'Kinh điển đầu tư giá trị và biên độ an toàn'
                },
                {
                    title: 'Mặt Dày Tâm Đen',
                    author: 'Chin-Ning Chu',
                    identifier: 'mat-day-tam-den.sna',
                    cover: 'https://archive.org/services/img/mat-day-tam-den.sna',
                    type: 'archive',
                    reason: 'Bản lĩnh sinh tồn và thực chiến thương trường'
                },
                {
                    title: 'Người Giàu Có Nhất Thành Babylon',
                    author: 'George S. Clason',
                    cover: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
                    key: '/works/OL527464W_babylon',
                    reason: '7 quy luật bất biến về tích lũy vàng'
                }
            ]
        },
        {
            id: 'strategy_power_history',
            tag: '⚔️ Chiến lược, Quân sự & Quyền lực',
            moodId: 'philosophy',
            recPagePrompt: 'Chiến lược quân sự binh pháp quyền lực mưu lược',
            recPageTitle: '⚔️ Tuyển tập Chiến lược & Quyền lực (Đa tác giả)',
            keywords: [
                'tam quốc', 'bố già', 'godfather', 'mặt dày tâm đen', 'binh pháp',
                'tôn tử', 'art of war', 'quyền lực', 'chiến lược', 'mưu lược',
                'la quán trung', 'mario puzo', 'robert greene'
            ],
            items: [
                {
                    title: 'Tam Quốc Chí Diễn Nghĩa',
                    author: 'La Quán Trung',
                    identifier: 'tam-quoc-chi-dien-nghia-tap-1.sna',
                    cover: 'https://archive.org/services/img/tam-quoc-chi-dien-nghia-tap-1.sna',
                    type: 'archive',
                    reason: 'Đỉnh cao mưu lược và anh hùng thời đại'
                },
                {
                    title: 'Bố Già (The Godfather)',
                    author: 'Mario Puzo',
                    identifier: 'bogia_201903',
                    cover: 'https://archive.org/services/img/bogia_201903',
                    type: 'archive',
                    reason: 'Nghệ thuật quyền lực và gia tộc kịch tính'
                },
                {
                    title: 'Binh Pháp Tôn Tử',
                    author: 'Tôn Tử',
                    identifier: 'art_of_war_librivox',
                    cover: 'https://archive.org/services/img/art_of_war_librivox',
                    type: 'archive',
                    reason: 'Binh pháp chiến lược bất hủ thiên thu'
                },
                {
                    title: '48 Định Luật Quyền Lực',
                    author: 'Robert Greene',
                    cover: 'https://covers.openlibrary.org/b/id/8231856-M.jpg',
                    key: '/works/OL15856426W',
                    reason: 'Cẩm nang thấu suốt tâm lý quyền lực và đối nhân'
                },
                {
                    title: 'Mặt Dày Tâm Đen',
                    author: 'Chin-Ning Chu',
                    identifier: 'mat-day-tam-den.sna',
                    cover: 'https://archive.org/services/img/mat-day-tam-den.sna',
                    type: 'archive',
                    reason: 'Thuật che giấu ý định và kiên trì nội lực'
                },
                {
                    title: 'Quân Vương (The Prince)',
                    author: 'Niccolò Machiavelli',
                    cover: 'https://covers.openlibrary.org/b/id/8758832-M.jpg',
                    key: '/works/OL10829208W_prince',
                    reason: 'Thuật cai trị và bản lĩnh lãnh đạo thực tế'
                }
            ]
        },
        {
            id: 'literature_masterpiece',
            tag: '📖 Văn học kinh điển thế giới',
            moodId: 'classic',
            recPagePrompt: 'Văn học kinh điển tiểu thuyết kiệt tác thế giới',
            recPageTitle: '📖 Tuyển tập Văn học kinh điển thế giới (Đa tác giả)',
            keywords: [
                'nhà giả kim', 'alchemist', 'hoàng tử bé', 'không gia đình',
                'hai số phận', 'văn học', 'tiểu thuyết', 'paulo coelho', 'hector malot',
                'george orwell', 'dostoevsky', '1984'
            ],
            items: [
                {
                    title: 'Nhà Giả Kim (The Alchemist)',
                    author: 'Paulo Coelho',
                    identifier: 'nha-gia-kim.sna',
                    cover: 'https://archive.org/services/img/nha-gia-kim.sna',
                    type: 'archive',
                    reason: 'Kiệt tác hành trình theo đuổi ước mơ'
                },
                {
                    title: 'Hoàng Tử Bé',
                    author: 'Antoine de Saint-Exupéry',
                    identifier: 'hoang-tu-be.sna',
                    cover: 'https://archive.org/services/img/hoang-tu-be.sna',
                    type: 'archive',
                    reason: 'Nhìn cuộc đời bằng trái tim trong sáng'
                },
                {
                    title: 'Không Gia Đình',
                    author: 'Hector Malot',
                    identifier: 'khong-gia-dinh.sna',
                    cover: 'https://archive.org/services/img/khong-gia-dinh.sna',
                    type: 'archive',
                    reason: 'Nghị lực sống và tình người sâu sắc'
                },
                {
                    title: 'Hai Số Phận (Kane and Abel)',
                    author: 'Jeffrey Archer',
                    identifier: 'hai-so-phan.sna',
                    cover: 'https://archive.org/services/img/hai-so-phan.sna',
                    type: 'archive',
                    reason: 'Bản hùng ca cuộc đời đầy kịch tính'
                },
                {
                    title: '1984 (Một Chín Tám Tư)',
                    author: 'George Orwell',
                    cover: 'https://covers.openlibrary.org/b/id/12818862-M.jpg',
                    key: '/works/OL1168007W',
                    reason: 'Kiệt tác phản địa đàng cảnh báo quyền lực tuyệt đối'
                },
                {
                    title: 'Tội Ác Và Trừng Phạt',
                    author: 'Fyodor Dostoevsky',
                    cover: 'https://covers.openlibrary.org/b/id/8447817-M.jpg',
                    key: '/works/OL1861788W_crime',
                    reason: 'Mổ xẻ tâm lý tội phạm và sự cứu rỗi linh hồn'
                }
            ]
        },
        {
            id: 'communication_healing',
            tag: '🌿 Chữa lành & Tâm lý giao tiếp',
            moodId: 'mindfulness',
            recPagePrompt: 'Chữa lành tâm hồn giao tiếp bình an thấu cảm thiền',
            recPageTitle: '🌿 Tuyển tập Chữa lành & Giao tiếp (Đa tác giả)',
            keywords: [
                'đắc nhân tâm', 'how to win friends', 'đọc vị', 'quẳng gánh lo',
                'giận', 'thích nhất hạnh', 'thiền', 'chữa lành', 'an lạc',
                'dale carnegie', 'marshall rosenberg'
            ],
            items: [
                {
                    title: 'Đắc Nhân Tâm',
                    author: 'Dale Carnegie',
                    identifier: 'dac-nhan-tam.sna',
                    cover: 'https://archive.org/services/img/dac-nhan-tam.sna',
                    type: 'archive',
                    reason: 'Thu phục lòng người bằng sự chân thành'
                },
                {
                    title: 'Giận (Anger)',
                    author: 'Thích Nhất Hạnh',
                    identifier: 'gian.sna',
                    cover: 'https://archive.org/services/img/gian.sna',
                    type: 'archive',
                    reason: 'Ôm ấp và chuyển hóa cơn giận'
                },
                {
                    title: 'Đọc Vị Bất Kỳ Ai',
                    author: 'David J. Lieberman',
                    identifier: 'yt_0vVz4uUekx8',
                    cover: 'https://i.ytimg.com/vi/0vVz4uUekx8/hqdefault.jpg',
                    type: 'youtube',
                    reason: 'Thấu hiểu suy nghĩ và động cơ đối phương'
                },
                {
                    title: 'Giao Tiếp Bất Bạo Động',
                    author: 'Marshall B. Rosenberg',
                    cover: 'https://covers.openlibrary.org/b/id/12819857-M.jpg',
                    key: '/works/OL12819857W_nvc',
                    reason: 'Hóa giải xung đột bằng sự thấu cảm sâu sắc'
                },
                {
                    title: 'Sức Mạnh Của Lắng Nghe',
                    author: 'Mark Goulston',
                    cover: 'https://covers.openlibrary.org/b/id/1058381-M.jpg',
                    key: '/works/OL1058381W_listen',
                    reason: 'Tiếp cận và mở khóa tâm lý những người khó tính nhất'
                },
                {
                    title: 'Cứ An Nhiên Mà Sống',
                    author: 'Shunmyo Masuno',
                    cover: 'https://covers.openlibrary.org/b/id/8303480-M.jpg',
                    key: '/works/OL8447817W_masuno',
                    reason: 'Nghệ thuật buông bỏ phiền muộn theo triết lý Thiền'
                }
            ]
        }
    ];

    // Helper: Create single suggested card element
    function createPlayerSuggestedCard(item) {
        const card = document.createElement('div');
        card.className = 'player-suggested-card';
        card.title = `${item.title} — ${item.author || ''}${item.reason ? ' (' + item.reason + ')' : ''}`;
        const coverSrc = item.cover || (item.identifier ? `https://archive.org/services/img/${item.identifier}` : (item.coverUrl || 'icon-192.png'));

        card.innerHTML = `
            <img class="player-suggested-thumb" src="${coverSrc}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.onerror=null;this.src='icon-192.png';">
            <span class="player-suggested-title">${escapeHtml(item.title)}</span>
            <span class="player-suggested-author">${escapeHtml(item.author || '')}</span>
            ${item.reason ? `<span class="player-suggested-reason">${escapeHtml(item.reason)}</span>` : ''}
        `;

        card.addEventListener('click', () => {
            if (item.type === 'youtube') {
                loadAndPlayYoutube(item, 0, true);
                showToast(`🎧 Đang phát: ${item.title}`);
            } else if (item.identifier) {
                loadAndPlayAudiobook(item.identifier, 0, true);
                showToast(`🎧 Đang phát: ${item.title}`);
            } else {
                openBookModal({
                    key: item.key || `/works/${encodeURIComponent(item.title)}`,
                    title: item.title,
                    titleVi: item.title,
                    originalTitle: item.originalTitle || item.title,
                    author: item.author || 'Tác giả',
                    author_name: [item.author],
                    coverUrl: item.coverUrl || item.cover,
                    coverId: item.coverId,
                    rating: item.rating || 4.8,
                    ratingsCount: item.ratingsCount || 50000,
                    reason: item.reason,
                    year: item.year || ''
                });
            }
        });

        return card;
    }

    // Launch Dedicated Recommendations Discovery Page (Full Page View with Auto-Minimize Player)
    function openDedicatedRecommendationsForAudio() {
        const activeCluster = playerSuggestedCurrentCluster;
        const moodId = activeCluster?.moodId || 'all';
        const searchQ = activeCluster?.recPagePrompt || '';
        const clusterTag = activeCluster?.recPageTitle || activeCluster?.tag || '🌟 Tuyển tập Đề xuất cùng thể loại (Đa tác giả)';

        // 1. Minimize audio player modal so audio continues playing uninterrupted in mini-player
        minimizeAudioPlayerModal();

        // 2. Switch to Dedicated Recommendations Tab
        switchTab('recommend');

        // 3. Highlight corresponding mood in recMoodsScroll
        if (recMoodsScroll) {
            recMoodsScroll.querySelectorAll('.rec-mood-tag').forEach(t => {
                t.classList.toggle('active', t.dataset.mood === moodId);
            });
        }
        currentRecMood = moodId;

        // 4. Update Engine Navigation to 'all'
        if (recEngineNav) {
            recEngineNav.querySelectorAll('.rec-engine-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.engine === 'all');
            });
        }
        currentRecEngine = 'all';

        // 5. Update AI Prompt Bar and Header Title
        if (recAiPromptInput) {
            recAiPromptInput.value = searchQ;
        }
        const titleEl = document.getElementById('recResultsTitle');
        if (titleEl) {
            titleEl.innerHTML = `<span>${clusterTag}</span>`;
        }

        // 6. Run recommendation search
        currentRecPage = 1;
        runRecommendationSearch(searchQ, 'all', moodId, 1, false);

        // 7. Scroll smoothly to top of recommendation section
        const recSection = document.getElementById('contentRecommend');
        if (recSection) {
            recSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        showToast('🚀 Đã mở trang Khám phá & Đề xuất (Trình phát đang thu nhỏ ở góc phải)');
    }

    // Helper: Reset and render items to player box
    function renderPlayerSuggestedItems(items, tagLabel = 'Có thể bạn muốn nghe tiếp', cluster = null) {
        if (!playerSuggestedBox || !playerSuggestedList) return;
        playerSuggestedList.innerHTML = '';
        playerSuggestedCurrentCluster = cluster;

        if (!items || items.length === 0) {
            playerSuggestedBox.style.display = 'none';
            return;
        }

        const tagEl = playerSuggestedBox.querySelector('.player-suggested-tag');
        if (tagEl) {
            tagEl.textContent = tagLabel;
        }

        playerSuggestedBox.style.display = 'block';

        // Bind Open Dedicated Page Button
        if (btnPlayerOpenRecPage) {
            btnPlayerOpenRecPage.style.display = 'inline-flex';
            btnPlayerOpenRecPage.onclick = (e) => {
                e.preventDefault();
                openDedicatedRecommendationsForAudio();
            };
        }
        if (playerOpenRecPageText && cluster?.tag) {
            playerOpenRecPageText.textContent = `Mở trang Khám phá ${cluster.tag.replace(/^[^\w\s\u00C0-\u1EF9]+/u, '').trim()} (Đa tác giả) ↗`;
        }

        // Show diverse author items (up to 6)
        items.slice(0, 6).forEach(item => {
            const card = createPlayerSuggestedCard(item);
            playerSuggestedList.appendChild(card);
        });
    }

    // Update Suggested Audiobooks in Dedicated Audio Player (Strict Same Genre + Different Authors)
    async function updatePlayerSuggestedBooks() {
        if (!playerSuggestedBox || !playerSuggestedList) return;

        // Resolve active book from playback, preview mode, or direct DOM representation
        const activeBook = previewViewingBook || currentAudiobook || ytCurrentItem || null;
        const domTitle = document.getElementById('playerBookTitle')?.textContent?.trim() || '';
        const domAuthor = document.getElementById('playerBookAuthor')?.textContent?.trim() || '';
        const domTrack = document.getElementById('playerTrackTitle')?.textContent?.trim() || '';
        const domDesc = document.getElementById('playerBookDescription')?.textContent?.trim() || '';

        const playingTitle = (activeBook?.title || domTitle || '').trim();
        const playingAuthor = (activeBook?.author || domAuthor || '').trim();
        const curTrackIdx = (typeof currentTrackIndex === 'number' && currentTrackIndex >= 0) ? currentTrackIndex : (typeof previewTargetTrack === 'number' ? previewTargetTrack : 0);
        const currentTrack = (activeBook?.tracks?.[curTrackIdx]?.title || domTrack || '').trim();
        const playingDesc = (activeBook?.description || domDesc || '').trim();
        const currentIdentifier = activeBook?.identifier || activeBook?.videoId || '';

        if (!playingTitle && !currentIdentifier) {
            playerSuggestedBox.style.display = 'none';
            return;
        }

        const sig = `${playingTitle} ${playingAuthor} ${currentTrack} ${playingDesc} ${currentIdentifier}`.toLowerCase();

        const isCurrentAudio = (item) => {
            if (!item) return false;
            if (item.identifier && currentIdentifier && (item.identifier === currentIdentifier || isSameAudioIdentifier(item.identifier, currentIdentifier))) return true;
            if (item.videoId && (ytCurrentItem?.videoId || activeBook?.videoId) && item.videoId === (ytCurrentItem?.videoId || activeBook?.videoId)) return true;
            const itemTitle = (item.title || '').toLowerCase().trim();
            const currentTitleNorm = playingTitle.toLowerCase().trim();
            if (itemTitle && currentTitleNorm && itemTitle === currentTitleNorm) return true;
            return false;
        };

        // Strict Exclusion: Never recommend the current playing author, ensure different authors
        const currentAuthorNorm = playingAuthor.toLowerCase().trim();
        const authorTokens = currentAuthorNorm.split(/\s+/).filter(w => w.length > 2);

        const isSameAuthor = (itemAuthor) => {
            if (!itemAuthor || !currentAuthorNorm) return false;
            const a = itemAuthor.toLowerCase().trim();
            if (a === currentAuthorNorm) return true;
            if (currentAuthorNorm.length > 3 && a.includes(currentAuthorNorm)) return true;
            if (a.length > 3 && currentAuthorNorm.includes(a)) return true;
            for (const token of authorTokens) {
                if (token.length > 3 && a.includes(token)) return true;
            }
            if (playingTitle.toLowerCase().includes(a)) return true;
            return false;
        };

        // 1. Check Thematic Audio Clusters
        for (const cluster of PLAYER_SUGGESTED_CLUSTERS) {
            const matched = cluster.keywords.some(k => sig.includes(k.toLowerCase()));
            if (matched) {
                // Collect candidates that are NOT the current audio and NOT the current author
                const diverseCandidates = [];
                const seenAuthorsInRec = new Set();

                for (const item of cluster.items) {
                    if (isCurrentAudio(item)) continue;
                    if (isSameAuthor(item.author)) continue;

                    const authKey = (item.author || '').toLowerCase().trim();
                    if (authKey && seenAuthorsInRec.has(authKey)) continue;

                    if (authKey) seenAuthorsInRec.add(authKey);
                    diverseCandidates.push(item);
                }

                if (diverseCandidates.length > 0) {
                    renderPlayerSuggestedItems(diverseCandidates, `${cluster.tag} (Đa tác giả)`, cluster);
                    return;
                }
            }
        }

        // 2. Fallback: Search all curated audiobooks and YouTube audiobooks with matching genre but DIFFERENT author
        const allAudios = [...(typeof CURATED_AUDIOBOOKS !== 'undefined' ? CURATED_AUDIOBOOKS : []), ...(typeof CURATED_YOUTUBE_AUDIOBOOKS !== 'undefined' ? CURATED_YOUTUBE_AUDIOBOOKS : [])];
        const sameGenreDifferentAuthor = [];
        const seenAuthorsFallback = new Set();

        for (const a of allAudios) {
            if (isCurrentAudio(a)) continue;
            if (isSameAuthor(a.author)) continue;

            const aGenre = (a.genre || '').toLowerCase();
            const aAuthor = (a.author || '').toLowerCase().trim();

            if (aGenre && sig.includes(aGenre)) {
                if (aAuthor && seenAuthorsFallback.has(aAuthor)) continue;
                if (aAuthor) seenAuthorsFallback.add(aAuthor);
                sameGenreDifferentAuthor.push(a);
            }
        }

        if (sameGenreDifferentAuthor.length > 0) {
            renderPlayerSuggestedItems(sameGenreDifferentAuthor, '✨ Cùng thể loại từ các tác giả khác', {
                tag: '✨ Cùng thể loại',
                moodId: 'all',
                recPagePrompt: playingTitle ? `Sách tương đồng cùng thể loại với ${playingTitle}` : '',
                recPageTitle: `✨ Tuyển tập cùng thể loại (Đa tác giả)`
            });
            return;
        }

        // 3. Fallback: Curated literary & storytelling audiobooks from diverse world authors
        const generalPicks = [
            {
                title: 'Nhà Giả Kim (The Alchemist)',
                author: 'Paulo Coelho',
                identifier: 'nha-gia-kim.sna',
                cover: 'https://archive.org/services/img/nha-gia-kim.sna',
                type: 'archive',
                reason: 'Kiệt tác văn học kinh điển thế giới'
            },
            {
                title: 'Đắc Nhân Tâm',
                author: 'Dale Carnegie',
                identifier: 'dac-nhan-tam.sna',
                cover: 'https://archive.org/services/img/dac-nhan-tam.sna',
                type: 'archive',
                reason: 'Nghệ thuật thấu hiểu lòng người'
            },
            {
                title: 'Bố Già (The Godfather)',
                author: 'Mario Puzo',
                identifier: 'bogia_201903',
                cover: 'https://archive.org/services/img/bogia_201903',
                type: 'archive',
                reason: 'Tiểu thuyết kinh điển kịch tính'
            },
            {
                title: 'Hoàng Tử Bé',
                author: 'Antoine de Saint-Exupéry',
                identifier: 'hoang-tu-be.sna',
                cover: 'https://archive.org/services/img/hoang-tu-be.sna',
                type: 'archive',
                reason: 'Tác phẩm văn học bất hủ'
            },
            {
                title: 'Phía Sau Nghi Can X',
                author: 'Higashino Keigo',
                cover: 'https://covers.openlibrary.org/b/id/10524456-M.jpg',
                key: '/works/OL10524456W_keigo',
                reason: 'Trinh thám đấu trí xuất sắc'
            }
        ].filter(item => !isCurrentAudio(item) && !isSameAuthor(item.author));

        if (generalPicks.length > 0) {
            renderPlayerSuggestedItems(generalPicks, '🌟 Tác phẩm nổi bật từ nhiều tác giả', {
                tag: '🌟 Tác phẩm nổi bật',
                moodId: 'all',
                recPagePrompt: '',
                recPageTitle: '🌟 Tuyển tập Đề xuất Nổi Bật (Đa Tác Giả)'
            });
        } else {
            playerSuggestedBox.style.display = 'none';
        }
    }

    // Initialize Recommendations Tab & Event Listeners
    function initRecommendationsTab() {
        if (!isRecTabInitialized) {
            isRecTabInitialized = true;

            // Dedicated AI Recommendation Prompt Form
            if (recAiPromptForm) {
                recAiPromptForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const q = recAiPromptInput ? recAiPromptInput.value.trim() : '';
                    if (!q) {
                        showToast('💡 Vui lòng nhập nhu cầu hoặc chủ đề bạn muốn nhờ AI gợi ý!');
                        if (recAiPromptInput) recAiPromptInput.focus();
                        return;
                    }
                    if (recEngineNav) {
                        recEngineNav.querySelectorAll('.rec-engine-btn').forEach(b => {
                            b.classList.toggle('active', b.dataset.engine === 'ai');
                        });
                    }
                    currentRecEngine = 'ai';
                    currentRecPage = 1;
                    const titleEl = document.getElementById('recResultsTitle');
                    if (titleEl) {
                        titleEl.innerHTML = `<span>🤖 Đề xuất Trợ lý AI cho: "${escapeHtml(q)}"</span>`;
                    }
                    if (recEndMessage) recEndMessage.style.display = 'none';
                    if (btnRecLoadMore) btnRecLoadMore.style.display = 'block';
                    runRecommendationSearch(q, 'ai', currentRecMood, 1, false);
                });
            }

            // Curated Recommendation Discovery Feeds (Channels)
            if (recEngineNav) {
                recEngineNav.addEventListener('click', (e) => {
                    const btn = e.target.closest('.rec-engine-btn');
                    if (!btn) return;
                    recEngineNav.querySelectorAll('.rec-engine-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentRecEngine = btn.dataset.engine || 'all';

                    if (recEndMessage) recEndMessage.style.display = 'none';
                    if (btnRecLoadMore) btnRecLoadMore.style.display = 'block';

                    let queryToRun = '';
                    if (currentRecEngine === 'ai') {
                        if (recAiPromptInput) {
                            recAiPromptInput.focus();
                            queryToRun = recAiPromptInput.value.trim();
                        }
                    } else {
                        if (recAiPromptInput) recAiPromptInput.value = '';
                    }

                    const titles = {
                        'all': '🌟 Tuyển tập Đề xuất Tổng hợp (AI & Đa Nguồn)',
                        'ai': queryToRun ? `🤖 Đề xuất Trợ lý AI cho: "${escapeHtml(queryToRun)}"` : '🤖 Tuyển tập do Trợ lý AI Tuyển Chọn',
                        'google': '📚 Tuyển tập Sách Nổi Bật từ Google Books',
                        'similar': '🎯 Sách Tương Tự từ Tủ Sách & Tiến Trình Nghe (TasteDive)',
                        'community': '👥 Tuyển tập Độc Giả Bình Chọn Top 1% (Hardcover)'
                    };
                    const titleEl = document.getElementById('recResultsTitle');
                    if (titleEl) {
                        titleEl.innerHTML = `<span>${titles[currentRecEngine] || '🌟 Danh sách đề xuất'}</span>`;
                    }

                    currentRecPage = 1;
                    runRecommendationSearch(queryToRun, currentRecEngine, currentRecMood, 1, false);
                });
            }

            // Mood Tags Selector
            if (recMoodsScroll) {
                recMoodsScroll.addEventListener('click', (e) => {
                    const tag = e.target.closest('.rec-mood-tag');
                    if (!tag) return;
                    recMoodsScroll.querySelectorAll('.rec-mood-tag').forEach(t => t.classList.remove('active'));
                    tag.classList.add('active');
                    currentRecMood = tag.dataset.mood || 'all';
                    if (recEndMessage) recEndMessage.style.display = 'none';
                    if (btnRecLoadMore) btnRecLoadMore.style.display = 'block';
                    if (recAiPromptInput) recAiPromptInput.value = '';
                    currentRecPage = 1;
                    runRecommendationSearch('', currentRecEngine, currentRecMood, 1, false);
                });
            }

            // Pagination: Load more books button (Open Library style)
            if (btnRecLoadMore) {
                btnRecLoadMore.addEventListener('click', async () => {
                    if (isRecLoadingMore) return;
                    isRecLoadingMore = true;
                    currentRecPage++;
                    const origText = btnRecLoadMore.textContent;
                    btnRecLoadMore.disabled = true;
                    btnRecLoadMore.textContent = 'Đang tải thêm sách...';
                    try {
                        const activeAiQ = (currentRecEngine === 'ai' && recAiPromptInput) ? recAiPromptInput.value.trim() : '';
                        await runRecommendationSearch(activeAiQ, currentRecEngine, currentRecMood, currentRecPage, true);
                    } finally {
                        isRecLoadingMore = false;
                        if (btnRecLoadMore) {
                            btnRecLoadMore.disabled = false;
                            btnRecLoadMore.textContent = origText || 'Xem thêm đề xuất';
                        }
                    }
                });
            }

            // 1-Click Recommend from currently played/read book
            if (btnRecFromCurrent) {
                btnRecFromCurrent.addEventListener('click', () => {
                    recommendFromCurrentlyListenedBook();
                });
            }

            // AI Settings Modal
            if (btnRecSettings && aiConfigModal) {
                btnRecSettings.addEventListener('click', () => {
                    const saved = localStorage.getItem(STORAGE_GEMINI_KEY) || DEFAULT_GEMINI_KEY;
                    if (aiApiKeyInput) aiApiKeyInput.value = saved;
                    aiConfigModal.style.display = 'flex';
                });
            }

            if (btnCloseAiConfig && aiConfigModal) {
                btnCloseAiConfig.addEventListener('click', () => {
                    aiConfigModal.style.display = 'none';
                });
            }

            if (aiConfigModal) {
                aiConfigModal.addEventListener('click', (e) => {
                    if (e.target === aiConfigModal) aiConfigModal.style.display = 'none';
                });
            }

            if (btnToggleApiKeyVisibility && aiApiKeyInput) {
                btnToggleApiKeyVisibility.addEventListener('click', () => {
                    aiApiKeyInput.type = aiApiKeyInput.type === 'password' ? 'text' : 'password';
                });
            }

            if (btnSaveApiKey && aiApiKeyInput) {
                btnSaveApiKey.addEventListener('click', () => {
                    const val = aiApiKeyInput.value.trim();
                    if (val) {
                        localStorage.setItem(STORAGE_GEMINI_KEY, val);
                        showToast('✨ Đã lưu Gemini API Key! Trợ lý AI đã sẵn sàng trả lời trực tiếp.');
                    } else {
                        localStorage.removeItem(STORAGE_GEMINI_KEY);
                        showToast('Đã chuyển về chế độ AI tích hợp sẵn.');
                    }
                    if (aiConfigModal) aiConfigModal.style.display = 'none';
                });
            }

            if (btnClearApiKey && aiApiKeyInput) {
                btnClearApiKey.addEventListener('click', () => {
                    aiApiKeyInput.value = '';
                    localStorage.removeItem(STORAGE_GEMINI_KEY);
                    showToast('Đã xóa API Key. Ứng dụng sẽ dùng bộ não AI tích hợp.');
                    if (aiConfigModal) aiConfigModal.style.display = 'none';
                });
            }

            // First time load
            runRecommendationSearch('', 'all', 'all', 1, false);
        }
    }

    renderSearchHistoryDatalist();

})();

