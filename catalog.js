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
    let wishlist = loadFromStorage(STORAGE_WISHLIST);
    let favorites = loadFromStorage(STORAGE_FAVORITES);
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
    const tabFavorites = document.getElementById('tabFavorites');
    const contentExplore = document.getElementById('contentExplore');
    const contentWishlist = document.getElementById('contentWishlist');
    const contentFavorites = document.getElementById('contentFavorites');
    const wishlistCount = document.getElementById('wishlistCount');
    const favoritesCount = document.getElementById('favoritesCount');
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
    const favoritesGrid = document.getElementById('favoritesGrid');
    const wishlistEmpty = document.getElementById('wishlistEmpty');
    const favoritesEmpty = document.getElementById('favoritesEmpty');

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
    const modalSubjects = document.getElementById('modalSubjects');
    const modalDescription = document.getElementById('modalDescription');
    const modalBtnWishlist = document.getElementById('modalBtnWishlist');
    const modalBtnFavorite = document.getElementById('modalBtnFavorite');
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
    // Theme (sync with main app)
    // =========================================
    (function initTheme() {
        const saved = localStorage.getItem(STORAGE_THEME);
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        }
    })();

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

    function isInFavorites(bookKey) {
        return favorites.some(b => b.key === bookKey);
    }

    function toggleWishlist(book) {
        if (isInWishlist(book.key)) {
            wishlist = wishlist.filter(b => b.key !== book.key);
            showToast('Đã xóa khỏi danh sách muốn đọc');
        } else {
            wishlist.push(book);
            showToast('Đã thêm vào danh sách muốn đọc');
        }
        saveToStorage(STORAGE_WISHLIST, wishlist);
        updateCounts();
    }

    function toggleFavorite(book) {
        const wasInFavorites = isInFavorites(book.key);
        if (wasInFavorites) {
            favorites = favorites.filter(b => b.key !== book.key);
            showToast('Đã xóa khỏi ưa thích');
        } else {
            favorites.push(book);
            showToast('Đã thêm vào ưa thích');
        }
        saveToStorage(STORAGE_FAVORITES, favorites);
        updateCounts();
        // Refresh recommendations when favorites change
        if (!wasInFavorites) loadRecommendations();
    }

    function updateCounts() {
        wishlistCount.textContent = wishlist.length;
        favoritesCount.textContent = favorites.length;

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
        };
    }

    function getCoverUrl(book, size = 'M') {
        if (book.coverId) {
            return `${OL_COVER}${book.coverId}-${size}.jpg`;
        }
        if (book.coverEditionKey) {
            return `${OL_COVER_OLID}${book.coverEditionKey}-${size}.jpg`;
        }
        return null;
    }

    // =========================================
    // API Calls
    // =========================================
    async function searchBooks(query, page = 1) {
        const offset = (page - 1) * PAGE_SIZE;
        const url = `${OL_SEARCH}?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}&fields=key,title,author_name,cover_i,cover_edition_key,first_publish_year,subject,language,edition_count,number_of_pages_median`;
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
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('Trending failed');
            const data = await resp.json();
            const books = (data.works || []).map(normalizeTrendingWork);
            await batchTranslateBooks(books);
            return books;
        } catch {
            return fetchSubjectBooks(period === 'weekly' ? 'classics' : 'fiction', limit, (page - 1) * limit);
        }
    }

    async function fetchSubjectBooks(subject, limit = 12, offset = 0) {
        const url = `${OL_SUBJECTS}${encodeURIComponent(subject.toLowerCase())}.json?limit=${limit}&offset=${offset}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Subject fetch failed');
        const data = await resp.json();
        const books = (data.works || []).map(normalizeSubjectBook);
        await batchTranslateBooks(books);
        return books;
    }

    async function fetchBookDetails(workKey) {
        // workKey looks like "/works/OL12345W"
        const key = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
        const resp = await fetch(`${OL_BASE}${key}.json`);
        if (!resp.ok) throw new Error('Details fetch failed');
        return resp.json();
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
        const favorited = isInFavorites(book.key);

        const displayTitle = book.titleVi || book.title;
        const originalTitle = (book.originalTitle && book.originalTitle.toLowerCase() !== displayTitle.toLowerCase())
            ? book.originalTitle
            : '';

        card.innerHTML = `
            <div class="book-cover-wrapper">
                ${coverUrl
                    ? `<img class="book-cover" src="${coverUrl}" alt="${escapeHtml(displayTitle)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'book-cover-placeholder\\'>${escapeHtml(displayTitle)}</div>'">`
                    : `<div class="book-cover-placeholder">${escapeHtml(displayTitle)}</div>`
                }
                <div class="book-actions">
                    <button class="book-action-btn btn-wishlist ${wishlisted ? 'is-wishlisted' : ''}" title="${wishlisted ? 'Bỏ muốn đọc' : 'Muốn đọc'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                    </button>
                    <button class="book-action-btn btn-favorite ${favorited ? 'is-favorited' : ''}" title="${favorited ? 'Bỏ ưa thích' : 'Ưa thích'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="book-info">
                <div class="book-title" title="${escapeHtml(displayTitle)}">${escapeHtml(displayTitle)}</div>
                ${originalTitle ? `<div class="book-original-title" title="Tên gốc: ${escapeHtml(originalTitle)}">${escapeHtml(originalTitle)}</div>` : ''}
                <div class="book-author">${escapeHtml(book.author)}</div>
                ${book.year ? `<div class="book-year">${book.year}</div>` : ''}
            </div>
        `;

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

        // Favorite button
        card.querySelector('.btn-favorite').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(book);
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

    function showSkeletons(container, count = 6, isScroll = false) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skel = createSkeletonCard();
            if (isScroll) {
                skel.style.minWidth = '160px';
                skel.style.maxWidth = '160px';
            }
            container.appendChild(skel);
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // =========================================
    // Book Modal
    // =========================================
    async function openBookModal(book) {
        currentModalBook = book;

        // Set initial data
        const coverUrl = getCoverUrl(book, 'L') || getCoverUrl(book, 'M');
        if (coverUrl) {
            modalCover.src = coverUrl;
            modalCover.onerror = () => {
                modalCover.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect fill="%2312121a" width="200" height="300"/><text fill="%235a5a6e" x="100" y="150" text-anchor="middle" font-size="14">No Cover</text></svg>';
            };
        } else {
            modalCover.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect fill="%2312121a" width="200" height="300"/><text fill="%235a5a6e" x="100" y="150" text-anchor="middle" font-size="14">No Cover</text></svg>';
        }

        const displayTitle = book.titleVi || book.title;
        modalTitle.textContent = displayTitle;

        // Original Title
        const originalTitle = (book.originalTitle && book.originalTitle.toLowerCase() !== displayTitle.toLowerCase())
            ? book.originalTitle
            : (book.titleVi ? book.title : '');

        if (originalTitle && originalTitle.toLowerCase() !== displayTitle.toLowerCase()) {
            modalOriginalTitle.style.display = 'inline-flex';
            modalOriginalTitleText.textContent = originalTitle;
        } else {
            modalOriginalTitle.style.display = 'none';
        }

        modalAuthor.textContent = book.author;
        modalYear.textContent = book.year ? `📅 ${book.year}` : '';
        modalPages.textContent = book.pages ? `📄 ${book.pages} trang` : '';
        modalLanguage.textContent = book.language ? `🌐 ${book.language.toUpperCase()}` : '';

        modalDescription.textContent = 'Đang tải và dịch mô tả...';
        btnToggleOrigDesc.style.display = 'none';
        modalOriginalDescBox.style.display = 'none';
        modalOriginalDescription.textContent = '';
        modalSubjects.innerHTML = '';

        // Actions
        updateModalActions();

        // Open Library link
        const olUrl = `${OL_BASE}${book.key}`;
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

        // Fetch detailed info
        try {
            const details = await fetchBookDetails(book.key);
            let rawDesc = '';
            if (details.description) {
                rawDesc = typeof details.description === 'string'
                    ? details.description
                    : (details.description.value || '');
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
            } else {
                modalDescription.textContent = 'Không có mô tả cho tác phẩm này.';
                btnToggleOrigDesc.style.display = 'none';
            }

            if (details.subjects && details.subjects.length > 0) {
                modalSubjects.innerHTML = details.subjects.slice(0, 8).map(s =>
                    `<span class="subject-tag">${escapeHtml(s)}</span>`
                ).join('');
            }
        } catch {
            modalDescription.textContent = 'Không thể tải mô tả tác phẩm.';
            btnToggleOrigDesc.style.display = 'none';
            if (book.subjects && book.subjects.length > 0) {
                modalSubjects.innerHTML = book.subjects.map(s =>
                    `<span class="subject-tag">${escapeHtml(s)}</span>`
                ).join('');
            }
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
        const favorited = isInFavorites(currentModalBook.key);

        modalBtnWishlist.classList.toggle('active', wishlisted);
        modalBtnWishlist.querySelector('span').textContent = wishlisted ? 'Đã thêm' : 'Muốn đọc';

        modalBtnFavorite.classList.toggle('active', favorited);
        modalBtnFavorite.querySelector('span').textContent = favorited ? 'Đã thích' : 'Ưa thích';
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

    modalBtnFavorite.addEventListener('click', () => {
        if (!currentModalBook) return;
        toggleFavorite(currentModalBook);
        updateModalActions();
        refreshAllViews();
    });

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
                    <span>Kết quả cho "<b>${escapeHtml(currentQuery)}</b>" <span style="font-size:0.85em; opacity:0.8; font-weight:400;">(dịch: <i>${escapeHtml(currentSearchEnglishQuery)}</i>)</span></span>
                `;
            } else {
                searchResultsTitle.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Kết quả cho "${escapeHtml(currentQuery)}"
                `;
            }
            resultCount.textContent = `${totalResults.toLocaleString()} sách`;

            result.books.forEach(book => {
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
        if (favorites.length > 0) recommendationsSection.style.display = 'block';

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
        [contentExplore, contentWishlist, contentFavorites, contentAudio, contentHistory].forEach(c => {
            if (c) c.classList.remove('active');
        });

        if (tabName === 'explore') {
            contentExplore.classList.add('active');
        } else if (tabName === 'wishlist') {
            contentWishlist.classList.add('active');
            renderWishlist();
        } else if (tabName === 'favorites') {
            contentFavorites.classList.add('active');
            renderFavorites();
        } else if (tabName === 'audio') {
            if (contentAudio) contentAudio.classList.add('active');
            initAudiobooksTab();
        } else if (tabName === 'history') {
            if (contentHistory) contentHistory.classList.add('active');
            renderAudioHistoryTab();
        }
    }

    tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        switchTab(tab.dataset.tab);
    });

    // =========================================
    // Render Wishlist & Favorites
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

    function renderFavorites() {
        favoritesGrid.innerHTML = '';
        if (favorites.length === 0) {
            favoritesEmpty.style.display = 'flex';
            return;
        }
        favoritesEmpty.style.display = 'none';
        favorites.forEach(book => {
            favoritesGrid.appendChild(createBookCard(book));
        });
    }

    function refreshAllViews() {
        updateCounts();
        // Refresh current search results card states
        document.querySelectorAll('.book-card').forEach(card => {
            const key = card.getAttribute('data-key');
            const wBtn = card.querySelector('.btn-wishlist');
            const fBtn = card.querySelector('.btn-favorite');
            if (wBtn) {
                wBtn.classList.toggle('is-wishlisted', isInWishlist(key));
            }
            if (fBtn) {
                fBtn.classList.toggle('is-favorited', isInFavorites(key));
            }
        });

        // Re-render if on wishlist or favorites tab
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            if (activeTab.dataset.tab === 'wishlist') renderWishlist();
            if (activeTab.dataset.tab === 'favorites') renderFavorites();
        }
    }

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

        try {
            let books = [];
            if (cat.type === 'trending') {
                books = await fetchTrending('daily');
            } else if (cat.type === 'trending-weekly') {
                books = await fetchTrending('weekly');
            } else if (cat.type === 'subject') {
                books = await fetchSubjectBooks(cat.subject, 12);
            }

            categoryCache.set(cat.id, books);
            renderBooksInGrid(grid, books);
        } catch (err) {
            console.warn(`Failed to load category ${cat.id}:`, err);
            grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;padding:12px;">Đang cập nhật thêm sách...</p>';
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
            showSkeletons(grid, 6, true);
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
        if (favorites.length === 0) {
            recommendationsSection.style.display = 'none';
            return;
        }

        recommendationsSection.style.display = 'block';
        showSkeletons(recommendationsGrid, 8, true);

        try {
            // Gather subjects from favorites
            const allSubjects = [];
            favorites.forEach(b => {
                if (b.subjects) {
                    b.subjects.forEach(s => {
                        const clean = s.toLowerCase().trim();
                        if (clean.length > 2 && clean.length < 40 && !allSubjects.includes(clean)) {
                            allSubjects.push(clean);
                        }
                    });
                }
            });

            if (allSubjects.length === 0) {
                recommendationsSection.style.display = 'none';
                return;
            }

            // Pick up to 3 random subjects
            const shuffled = allSubjects.sort(() => 0.5 - Math.random());
            const chosen = shuffled.slice(0, 3);

            const allBooks = [];
            const existingKeys = new Set([
                ...favorites.map(b => b.key),
                ...wishlist.map(b => b.key),
            ]);

            for (const subject of chosen) {
                try {
                    const books = await fetchSubjectBooks(subject, 8);
                    books.forEach(b => {
                        if (!existingKeys.has(b.key) && !allBooks.some(ab => ab.key === b.key)) {
                            allBooks.push(b);
                            existingKeys.add(b.key);
                        }
                    });
                } catch { /* skip failed subject */ }
            }

            recommendationsGrid.innerHTML = '';
            if (allBooks.length === 0) {
                recommendationsSection.style.display = 'none';
                return;
            }

            // Shuffle and limit
            const recs = allBooks.sort(() => 0.5 - Math.random()).slice(0, 15);
            recs.forEach(book => {
                recommendationsGrid.appendChild(createBookCard(book));
            });

        } catch (err) {
            console.error('Recommendations error:', err);
            recommendationsSection.style.display = 'none';
        }
    }

    // =========================================
    // Clear search / show explore
    // =========================================
    function showExploreDefault() {
        searchResultsSection.style.display = 'none';
        if (categoryDetailSection) categoryDetailSection.style.display = 'none';
        catalogSectionsContainer.style.display = 'block';
        if (favorites.length > 0) recommendationsSection.style.display = 'block';
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
                if (ytScreen) ytScreen.style.display = 'block';
                if (coverBox) coverBox.style.display = 'none';
                if (toggleText) toggleText.textContent = '🎵 Chế độ Audio';
                if (playerModal) playerModal.classList.add('video-mode-active');
            } else {
                if (ytScreen) ytScreen.style.display = 'none';
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
            btnResume.addEventListener('click', () => {
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
                    <div class="history-thumb-wrap" title="Nhấn để nghe tiếp ngay">
                        <img class="history-card-thumb" src="${coverSrc}" alt="${escapeHtml(item.title)}" onerror="this.src='https://archive.org/images/archive_logo.png'">
                        <div class="history-thumb-play-overlay">
                            <div class="history-play-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                                    <polygon points="6 3 20 12 6 21 6 3"/>
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

            // Click to resume
            const thumbWrap = card.querySelector('.history-thumb-wrap');
            const resumeBtn = card.querySelector('.btn-history-resume');
            const onResume = (e) => {
                e.stopPropagation();
                resumeAudioHistoryItem(item);
            };
            if (thumbWrap) thumbWrap.addEventListener('click', onResume);
            if (resumeBtn) resumeBtn.addEventListener('click', onResume);

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

    function resumeAudioHistoryItem(item) {
        if (!item) return;
        const id = item.identifier || item._storageKey || (item.videoId ? `yt_${item.videoId}` : null);
        const isYt = item.type === 'youtube' || (id && id.startsWith('yt_'));
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
            loadAndPlayYoutube(found, item.currentTime, true);
        } else {
            loadAndPlayAudiobook(id, item.trackIndex || 0, true, item.currentTime);
        }
        openAudioPlayerModal();
        showToast(`▶ Đang tiếp tục nghe "${item.title}" [${formatTime(item.currentTime)}]`);
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
                        <span>${b.rating} ★</span>
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

            card.addEventListener('click', () => {
                if (isYt) {
                    loadAndPlayYoutube(b, null, true);
                } else {
                    loadAndPlayAudiobook(b.identifier, null, true, null);
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
    // Core YouTube Audio Player Logic
    // =========================================
    function loadAndPlayYoutube(item, startTime = null, autoPlay = true) {
        if (!item || !item.videoId) return;

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
        if (startTime !== null && startTime !== undefined && startTime >= 0) {
            targetResumeTime = startTime;
        } else if (savedProg && savedProg.currentTime && savedProg.currentTime > 2) {
            targetResumeTime = savedProg.currentTime;
            isAutoResumed = true;
        }

        // Setup UI in player modal
        if (playerBookCover) playerBookCover.src = item.cover || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
        if (playerBookTitle) playerBookTitle.textContent = item.title;
        if (playerBookAuthor) playerBookAuthor.textContent = item.author || 'YouTube';
        if (playerTrackTitle) playerTrackTitle.textContent = item.title;
        if (playerTrackCounter) playerTrackCounter.textContent = '1/1';

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
            if (isAudioSeeking) return;

            const cur = ytPlayer.getCurrentTime() || 0;
            const dur = ytPlayer.getDuration() || (ytCurrentItem ? ytCurrentItem.duration : 0) || 0;

            if (playerCurrentTime) playerCurrentTime.textContent = formatTime(cur);
            if (playerTotalDuration && dur > 0) playerTotalDuration.textContent = formatTime(dur);

            const bookmarkPreview = document.getElementById('bookmarkNowTimePreview');
            if (bookmarkPreview) bookmarkPreview.textContent = formatTime(cur);
            if (playerNoteTimePreview) playerNoteTimePreview.textContent = formatTime(cur);

            if (dur > 0) {
                const percent = (cur / dur) * 100;
                if (playerSeekSlider) playerSeekSlider.value = percent;
                if (playerSliderFill) playerSliderFill.style.width = `${percent}%`;
                if (miniPlayerProgressLine) {
                    miniPlayerProgressLine.style.setProperty('--mini-progress', `${percent}%`);
                }
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
        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        const savedProg = progressMap[identifier];

        // If already playing this exact book, just switch track or open modal
        if (currentAudiobook && currentAudiobook.identifier === identifier) {
            if (trackIndex !== null && trackIndex !== undefined && trackIndex !== currentTrackIndex) {
                playTrack(trackIndex, (resumeTime !== null && resumeTime !== undefined) ? resumeTime : 0, autoPlay);
            }
            openAudioPlayerModal();
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
            if (ytScreen) ytScreen.style.display = 'none';
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

            if (trackIndex !== null && trackIndex !== undefined && trackIndex >= 0) {
                targetTrack = Math.min(trackIndex, tracks.length - 1);
                targetResumeTime = (resumeTime !== null && resumeTime !== undefined && resumeTime >= 0) ? resumeTime : 0;
            } else if (savedProg && typeof savedProg.trackIndex === 'number' && savedProg.trackIndex < tracks.length) {
                targetTrack = savedProg.trackIndex;
                targetResumeTime = (savedProg.currentTime && savedProg.currentTime > 2) ? savedProg.currentTime : 0;
                isAutoResumed = true;
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

        // Update Mini Player
        if (miniPlayerThumb) miniPlayerThumb.src = currentAudiobook.cover;
        if (miniPlayerTitle) miniPlayerTitle.textContent = currentAudiobook.title;
        if (miniPlayerChapter) miniPlayerChapter.textContent = track.title;
        if (miniAudioPlayer) miniAudioPlayer.style.display = 'block';

        // Update Audio Source
        audioElement.src = track.url;
        audioElement.playbackRate = SPEED_RATES[currentSpeedIndex];

        if (resumeTime > 0) {
            const seekFn = () => {
                try {
                    audioElement.currentTime = resumeTime;
                } catch (e) {
                    console.warn('Seek error:', e);
                }
            };
            audioElement.addEventListener('loadedmetadata', seekFn, { once: true });
            try {
                audioElement.currentTime = resumeTime;
            } catch (e) {}
        }

        // Highlight playlist row
        updatePlaylistActiveState();

        if (autoPlay) {
            audioElement.play().catch(err => {
                console.log('Playback start was blocked by browser:', err);
            });
        }

        saveAudioProgress();
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
            if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'block';
            if (pauseIcon) pauseIcon.style.display = isPlaying ? 'block' : 'none';
        }

        if (miniBtnPlay) {
            const miniPlayIcon = miniBtnPlay.querySelector('.mini-icon-play');
            const miniPauseIcon = miniBtnPlay.querySelector('.mini-icon-pause');
            if (miniPlayIcon) miniPlayIcon.style.display = isPlaying ? 'none' : 'block';
            if (miniPauseIcon) miniPauseIcon.style.display = isPlaying ? 'block' : 'none';
        }

        updatePlaylistActiveState();
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
        if (isAudioSeeking) return;

        const cur = audioElement.currentTime;
        const dur = audioElement.duration || (currentAudiobook && currentAudiobook.tracks[currentTrackIndex]?.duration) || 0;

        if (playerCurrentTime) playerCurrentTime.textContent = formatTime(cur);
        if (playerTotalDuration && dur > 0) playerTotalDuration.textContent = formatTime(dur);

        const bookmarkPreview = document.getElementById('bookmarkNowTimePreview');
        if (bookmarkPreview) bookmarkPreview.textContent = formatTime(cur);
        if (playerNoteTimePreview) playerNoteTimePreview.textContent = formatTime(cur);

        if (dur > 0) {
            const percent = (cur / dur) * 100;
            if (playerSeekSlider) playerSeekSlider.value = percent;
            if (playerSliderFill) playerSliderFill.style.width = `${percent}%`;
            if (miniPlayerProgressLine) {
                miniPlayerProgressLine.style.setProperty('--mini-progress', `${percent}%`);
            }
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
            title: bookInfo?.title || progressMap[identifier]?.title || (currentAudiobook?.title) || (ytCurrentItem?.title) || 'Sách nói',
            author: bookInfo?.author || progressMap[identifier]?.author || (currentAudiobook?.author) || (ytCurrentItem?.author) || '',
            cover: bookInfo?.cover || progressMap[identifier]?.cover || (currentAudiobook?.cover) || (ytCurrentItem?.cover) || '',
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
            audioPlayerModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function minimizeAudioPlayerModal() {
        if (audioPlayerModal) {
            audioPlayerModal.style.display = 'none';
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
            audioPlayerModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    if (btnPlayerMinimize) {
        btnPlayerMinimize.addEventListener('click', () => {
            minimizeAudioPlayerModal();
            showToast('Đã thu nhỏ. Sách nói vẫn đang tiếp tục phát.');
        });
    }
    if (btnPlayerClose) {
        btnPlayerClose.addEventListener('click', () => {
            closeAudioPlayer(true);
            showToast('Đã dừng phát và đóng sách nói.');
        });
    }

    if (audioPlayerModal) {
        audioPlayerModal.addEventListener('click', (e) => {
            if (e.target === audioPlayerModal) {
                minimizeAudioPlayerModal();
            }
        });
    }

    // Mini Player Open & Controls
    if (miniPlayerOpen) {
        miniPlayerOpen.addEventListener('click', openAudioPlayerModal);
    }
    if (miniBtnExpand) {
        miniBtnExpand.addEventListener('click', openAudioPlayerModal);
    }
    if (miniBtnClose) {
        miniBtnClose.addEventListener('click', () => {
            closeAudioPlayer(true);
            showToast('Đã dừng phát sách nói');
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
        if (audioPlayerModal && audioPlayerModal.style.display === 'flex') {
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
            const cur = Math.floor(ytPlayer && ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0);
            const dur = Math.floor(ytPlayer && ytPlayer.getDuration ? (ytPlayer.getDuration() || ytCurrentItem.duration || 0) : (ytCurrentItem.duration || 0));

            const existing = progressMap[identifier] || {};
            const noteText = existing.note || notesMap[identifier]?.text;
            const noteUpdated = existing.noteUpdatedAt || notesMap[identifier]?.updatedAt;

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
        const cur = Math.floor(audioElement.currentTime || 0);
        const dur = Math.floor(audioElement.duration || currentAudiobook.tracks[currentTrackIndex]?.duration || 0);
        const track = currentAudiobook.tracks[currentTrackIndex];

        const existing = progressMap[currentAudiobook.identifier] || {};
        const noteText = existing.note || notesMap[currentAudiobook.identifier]?.text;
        const noteUpdated = existing.noteUpdatedAt || notesMap[currentAudiobook.identifier]?.updatedAt;

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
            favorites = loadFromStorage(STORAGE_FAVORITES, []);
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
    renderSearchHistoryDatalist();

})();

