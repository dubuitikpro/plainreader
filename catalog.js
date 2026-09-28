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
    const STORAGE_AUDIO_LAST_PLAYED = 'plainreader-audio-last-played';
    const STORAGE_AUDIO_STATE = 'plainreader-audio-state';
    const PAGE_SIZE = 20;

    // =========================================
    // State
    // =========================================
    let wishlist = loadFromStorage(STORAGE_WISHLIST);
    let favorites = loadFromStorage(STORAGE_FAVORITES);
    let currentQuery = '';
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

    // Dedicated Audio Player Modal Elements
    const audioPlayerModal = document.getElementById('audioPlayerModal');
    const playerBookCover = document.getElementById('playerBookCover');
    const playerBookTitle = document.getElementById('playerBookTitle');
    const playerBookAuthor = document.getElementById('playerBookAuthor');
    const playerTotalChaptersBadge = document.getElementById('playerTotalChaptersBadge');
    const playerTotalDurationBadge = document.getElementById('playerTotalDurationBadge');
    const playerTrackCounter = document.getElementById('playerTrackCounter');
    const playerTrackTitle = document.getElementById('playerTrackTitle');
    const btnPlayerBookmark = document.getElementById('btnPlayerBookmark');
    const tabChaptersBtn = document.getElementById('tabChaptersBtn');
    const tabBookmarksBtn = document.getElementById('tabBookmarksBtn');
    const playerBookmarksContainer = document.getElementById('playerBookmarksContainer');
    const playerBookmarksList = document.getElementById('playerBookmarksList');
    const playerBookmarksCount = document.getElementById('playerBookmarksCount');
    const btnAddBookmarkNow = document.getElementById('btnAddBookmarkNow');
    const bookmarkNowTimePreview = document.getElementById('bookmarkNowTimePreview');
    const playlistHintText = document.getElementById('playlistHintText');
    const audioContinueSection = document.getElementById('audioContinueSection');
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
        } catch (e) {
            console.warn('Storage save failed:', e);
        }
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

    async function translateText(text) {
        if (!text || typeof text !== 'string') return text;
        const clean = text.trim();
        if (!clean) return clean;
        if (translationCache.has(clean)) {
            return translationCache.get(clean);
        }
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(clean)}`;
            const res = await fetch(url);
            if (!res.ok) return clean;
            const data = await res.json();
            if (data && data[0]) {
                const translated = data[0].map(x => x[0]).join('').trim();
                if (translated) {
                    translationCache.set(clean, translated);
                    saveTranslationCache();
                    return translated;
                }
            }
        } catch (err) {
            console.warn('Translation failed:', err);
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

        // Click to open modal
        card.addEventListener('click', (e) => {
            if (e.target.closest('.book-action-btn')) return;
            openBookModal(book);
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
                modalOriginalDescription.textContent = rawDesc.trim();
                modalDescription.textContent = 'Đang dịch mô tả sang tiếng Việt...';

                // Automatically translate description to Vietnamese
                const translatedVi = await translateText(rawDesc);
                modalDescription.textContent = translatedVi || rawDesc;

                // Show button to view original English description
                if (translatedVi && translatedVi.trim().toLowerCase() !== rawDesc.trim().toLowerCase()) {
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
        if (!query.trim() || isLoading) return;

        currentQuery = query.trim();
        currentPage = page;

        if (page === 1) {
            searchResultsGrid.innerHTML = '';
            searchResultsSection.style.display = 'block';
            catalogSectionsContainer.style.display = 'none';
            if (categoryDetailSection) categoryDetailSection.style.display = 'none';
            recommendationsSection.style.display = 'none';
            loadMoreContainer.style.display = 'none';
        }

        isLoading = true;
        catalogLoading.style.display = 'flex';

        try {
            const result = await searchBooks(currentQuery, currentPage);
            totalResults = result.total;

            searchResultsTitle.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Kết quả cho "${escapeHtml(currentQuery)}"
            `;
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

    btnSearch.addEventListener('click', () => performSearch(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performSearch(searchInput.value);
    });

    btnLoadMore.addEventListener('click', () => {
        performSearch(currentQuery, currentPage + 1);
    });

    // Quick tags: open the full category page directly
    quickTags.addEventListener('click', (e) => {
        const tag = e.target.closest('.quick-tag');
        if (!tag) return;
        const catId = tag.dataset.cat;
        if (!catId) return;

        openCategoryPage(catId);
    });

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
        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        [contentExplore, contentWishlist, contentFavorites, contentAudio].forEach(c => {
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
            identifier: 'cha-giau-cha-ngheo',
            title: 'Cha Giàu Cha Nghèo (Dạy Con Làm Giàu)',
            originalTitle: 'Rich Dad Poor Dad',
            author: 'Robert T. Kiyosaki',
            genre: 'self-help',
            chapters: 13,
            cover: 'https://archive.org/services/img/cha-giau-cha-ngheo',
            description: 'Cuốn sách bán chạy kinh điển về giáo dục tài chính của Robert Kiyosaki, vén màn sự khác biệt trong tư duy về tiền bạc giữa người giàu và người nghèo, giúp độc giả làm chủ đồng tiền.',
            aliases: ['rich dad poor dad', 'rich dad, poor dad', 'day con lam giau', 'cha giau cha ngheo', 'dạy con làm giàu', 'cha giàu cha nghèo', 'rich dad']
        },
        {
            identifier: 'mat-day-tam-den.sna',
            title: 'Mặt Dày Tâm Đen',
            originalTitle: 'Thick Face, Black Heart',
            author: 'Chin-Ning Chu',
            genre: 'self-help',
            chapters: 19,
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
            cover: 'https://archive.org/services/img/sherlock_holmes_canon_08_02_librivox',
            description: 'Tuyển tập truyện trinh thám đặc sắc đánh dấu sự trở lại ngoạn mục của thám tử đại tài Sherlock Holmes và bác sĩ Watson trên phố Baker.',
            aliases: ['sherlock holmes']
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
        'how to stop worrying and start living': 'Quẳng Gánh Lo Đi Và Vui Sống'
    };

    function isVietnamese(str) {
        if (!str) return false;
        return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/i.test(str);
    }

    async function resolveVietnameseAudioTitle(book) {
        if (!book) return '';
        const rawTitle = (book.title || '').trim();
        const origTitle = (book.originalTitle || '').trim();
        const lowerRaw = rawTitle.toLowerCase();
        const lowerOrig = origTitle.toLowerCase();

        // 1. Check known aliases map first (e.g. "rich dad poor dad" -> "Cha Giàu Cha Nghèo")
        for (const [key, viName] of Object.entries(VI_TITLE_ALIASES)) {
            if (lowerRaw.includes(key) || (lowerOrig && lowerOrig.includes(key))) {
                return viName;
            }
        }

        // 2. Check if book.titleVi has Vietnamese diacritics
        if (book.titleVi && isVietnamese(book.titleVi)) {
            const vi = book.titleVi.trim();
            // Check if titleVi matches alias
            const lVi = vi.toLowerCase();
            for (const [k, v] of Object.entries(VI_TITLE_ALIASES)) {
                if (lVi.includes(k)) return v;
            }
            return vi;
        }

        // 3. If raw title already contains Vietnamese diacritics
        if (isVietnamese(rawTitle)) {
            return rawTitle;
        }

        // 4. Translate rawTitle or origTitle to Vietnamese via Google Translate API
        const toTranslate = origTitle || rawTitle;
        if (toTranslate) {
            try {
                const vi = await translateText(toTranslate);
                if (vi) {
                    const lVi = vi.toLowerCase();
                    for (const [k, v] of Object.entries(VI_TITLE_ALIASES)) {
                        if (lVi.includes(k)) return v;
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

    let currentAudiobook = null;
    let currentTrackIndex = 0;
    let isAudioSeeking = false;
    let sleepTimerTimeout = null;
    let sleepTimerMode = '0'; // '0', '15', '30', '45', '60', 'end'
    const SPEED_RATES = [1.0, 1.25, 1.5, 2.0, 0.75];
    let currentSpeedIndex = 0;
    let isAudiobookTabLoaded = false;
    let currentGenreFilter = 'all';

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
    // Audio Tab Initialization & Rendering
    // =========================================
    function initAudiobooksTab() {
        renderAudioContinueSection();
        if (isAudiobookTabLoaded) return;
        isAudiobookTabLoaded = true;
        renderAudiobooksGrid(CURATED_AUDIOBOOKS);
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
        if (!p.currentTime || p.currentTime < 3) {
            section.style.display = 'none';
            return;
        }

        const pct = p.percent || 0;
        const curStr = formatTime(p.currentTime);
        const durStr = p.duration ? formatTime(p.duration) : '--:--';

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
                            <span>🎧 Đang nghe dở</span>
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
                loadAndPlayAudiobook(p.identifier, p.trackIndex, true, p.currentTime);
            });
        }

        const btnDismiss = section.querySelector('#btnContinueDismiss');
        if (btnDismiss) {
            btnDismiss.addEventListener('click', () => {
                section.style.display = 'none';
            });
        }
    }

    function renderAudiobooksGrid(books) {
        if (!audiobooksGrid) return;
        audiobooksGrid.innerHTML = '';

        if (!books || books.length === 0) {
            audiobooksGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 0;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <h3>Không tìm thấy sách nói phù hợp</h3>
                    <p>Hãy thử tìm kiếm với từ khóa khác trên Internet Archive</p>
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
            const card = document.createElement('div');
            card.className = 'audiobook-card';
            card.setAttribute('data-id', b.identifier);

            const coverUrl = b.cover || `https://archive.org/services/img/${b.identifier}`;
            const chapterBadge = b.chapters ? `${b.chapters} chương` : 'Audiobook';
            const savedProg = progressMap[b.identifier];
            const hasProgress = savedProg && savedProg.currentTime && savedProg.currentTime > 5;
            const resumeBadgeHtml = hasProgress 
                ? `<span class="audiobook-badge-resume">🎧 Tiếp tục (${formatTime(savedProg.currentTime)})</span>` 
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
                    ${resumeBadgeHtml}
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
                    <div class="audiobook-author">${escapeHtml(b.author || 'Internet Archive')}</div>
                    <div class="audiobook-footer">
                        <span class="audiobook-source-tag">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="2" y1="12" x2="22" y2="12"/>
                            </svg>
                            archive.org
                        </span>
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
                loadAndPlayAudiobook(b.identifier, null, true, null);
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

            if (genre === 'all') {
                renderAudiobooksGrid(CURATED_AUDIOBOOKS);
            } else {
                const filtered = CURATED_AUDIOBOOKS.filter(b => b.genre === genre);
                renderAudiobooksGrid(filtered);
            }
        });
    }

    // Search Audiobooks (Always Searches Vietnamese Audio on Archive.org)
    async function searchAudiobooks(query, autoPlayFirst = false) {
        const q = (query || '').trim();
        if (!q) {
            renderAudiobooksGrid(CURATED_AUDIOBOOKS);
            return CURATED_AUDIOBOOKS;
        }

        if (audiobooksLoading) audiobooksLoading.style.display = 'flex';
        if (audiobooksGrid) audiobooksGrid.style.display = 'none';

        try {
            // Determine Vietnamese search term
            let viQuery = q;
            const lowerQ = q.toLowerCase();

            // 1. Check if query matches alias
            for (const [key, viName] of Object.entries(VI_TITLE_ALIASES)) {
                if (lowerQ.includes(key) || key.includes(lowerQ)) {
                    viQuery = viName;
                    break;
                }
            }

            // 2. If query is in English without Vietnamese diacritics, translate to Vietnamese
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

            // Local filter against Curated list using both original and Vietnamese term
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

            // Remote search on Internet Archive using the VIETNAMESE title for Vietnamese audio!
            const archiveSearchPhrase = viQuery.replace(/["\\]/g, '').trim();
            const archiveUrl = `https://archive.org/advancedsearch.php?q=mediatype:audio+AND+(title:("${encodeURIComponent(archiveSearchPhrase)}") OR "${encodeURIComponent(archiveSearchPhrase)}")&fl[]=identifier,title,creator,description,downloads,item_size,year&sort[]=downloads+desc&rows=20&output=json`;

            const resp = await fetch(archiveUrl);
            const data = await resp.json();
            const docs = (data.response && data.response.docs) || [];

            const remoteBooks = docs.map(d => ({
                identifier: d.identifier,
                title: d.title || d.identifier,
                author: d.creator || 'Internet Archive',
                cover: `https://archive.org/services/img/${d.identifier}`,
                description: d.description || '',
                chapters: null
            }));

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
                audiobooksSectionTitle.textContent = `Sách nói tiếng Việt cho "${viQuery}" (${merged.length})`;
            }
            renderAudiobooksGrid(merged);

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

    if (btnAudioSearch && audioSearchInput) {
        btnAudioSearch.addEventListener('click', () => searchAudiobooks(audioSearchInput.value));
        audioSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchAudiobooks(audioSearchInput.value);
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

            // Populate Modal UI
            if (playerBookCover) playerBookCover.src = bookCover;
            if (playerBookTitle) playerBookTitle.textContent = bookTitle;
            if (playerBookAuthor) playerBookAuthor.textContent = bookAuthor;
            if (playerTotalChaptersBadge) playerTotalChaptersBadge.textContent = `${tracks.length} Chương`;
            if (playlistChapterHeader) playlistChapterHeader.textContent = `${tracks.length} Chương`;
            if (playerArchiveLink) playerArchiveLink.href = `https://archive.org/details/${identifier}`;
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

            // Reset playlist tab to Chapters and update bookmark badge
            switchPlaylistTab('chapters');
            updateBookmarksBadge();

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
        console.error('Audio stream error:', e);
        showToast('Lỗi phát âm thanh từ nguồn máy chủ Internet Archive.');
    });

    // Scrubber seeking
    if (playerSeekSlider) {
        playerSeekSlider.addEventListener('input', () => {
            isAudioSeeking = true;
            const dur = audioElement.duration || 0;
            const targetSec = (playerSeekSlider.value / 100) * dur;
            if (playerCurrentTime) playerCurrentTime.textContent = formatTime(targetSec);
            if (playerSliderFill) playerSliderFill.style.width = `${playerSeekSlider.value}%`;
        });

        playerSeekSlider.addEventListener('change', () => {
            const dur = audioElement.duration || 0;
            const targetSec = (playerSeekSlider.value / 100) * dur;
            audioElement.currentTime = targetSec;
            isAudioSeeking = false;
        });
    }

    // Transport buttons
    if (btnPlayerPlay) btnPlayerPlay.addEventListener('click', toggleAudioPlay);
    if (miniBtnPlay) miniBtnPlay.addEventListener('click', toggleAudioPlay);

    if (btnPlayerRewind15) {
        btnPlayerRewind15.addEventListener('click', () => {
            audioElement.currentTime = Math.max(0, audioElement.currentTime - 15);
        });
    }

    if (btnPlayerForward15) {
        btnPlayerForward15.addEventListener('click', () => {
            const dur = audioElement.duration || Infinity;
            audioElement.currentTime = Math.min(dur, audioElement.currentTime + 15);
        });
    }

    if (miniBtnRewind) {
        miniBtnRewind.addEventListener('click', () => {
            audioElement.currentTime = Math.max(0, audioElement.currentTime - 15);
        });
    }

    if (miniBtnForward) {
        miniBtnForward.addEventListener('click', () => {
            const dur = audioElement.duration || Infinity;
            audioElement.currentTime = Math.min(dur, audioElement.currentTime + 15);
        });
    }

    if (btnPlayerPrev) {
        btnPlayerPrev.addEventListener('click', () => {
            if (audioElement.currentTime > 5) {
                audioElement.currentTime = 0;
            } else if (currentAudiobook && currentTrackIndex > 0) {
                playTrack(currentTrackIndex - 1, 0, true);
            }
        });
    }

    if (btnPlayerNext) {
        btnPlayerNext.addEventListener('click', () => {
            if (currentAudiobook && currentTrackIndex < currentAudiobook.tracks.length - 1) {
                playTrack(currentTrackIndex + 1, 0, true);
            }
        });
    }

    // Volume Slider & Mute
    let lastVolume = 1;
    if (playerVolumeSlider) {
        playerVolumeSlider.addEventListener('input', () => {
            const val = parseFloat(playerVolumeSlider.value);
            audioElement.volume = val;
            updateVolumeIcon(val);
        });
    }

    if (btnPlayerMute) {
        btnPlayerMute.addEventListener('click', () => {
            if (audioElement.volume > 0) {
                lastVolume = audioElement.volume;
                audioElement.volume = 0;
                if (playerVolumeSlider) playerVolumeSlider.value = 0;
                updateVolumeIcon(0);
            } else {
                audioElement.volume = lastVolume || 1;
                if (playerVolumeSlider) playerVolumeSlider.value = audioElement.volume;
                updateVolumeIcon(audioElement.volume);
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
                setSleepTimer('0');
                showToast('⏱️ Đã tắt nhạc theo hẹn giờ');
            }, mins * 60 * 1000);
        }
    }

    // =========================================
    // Bookmarks Management & Tabs
    // =========================================
    function switchPlaylistTab(tabName, highlightId = null) {
        const tabChapters = document.getElementById('tabChaptersBtn');
        const tabBookmarks = document.getElementById('tabBookmarksBtn');
        const chaptersList = document.getElementById('playerChaptersList');
        const bookmarksContainer = document.getElementById('playerBookmarksContainer');
        const hintText = document.getElementById('playlistHintText');

        if (tabName === 'bookmarks') {
            if (tabChapters) tabChapters.classList.remove('active');
            if (tabBookmarks) tabBookmarks.classList.add('active');
            if (chaptersList) chaptersList.style.display = 'none';
            if (bookmarksContainer) bookmarksContainer.style.display = 'flex';
            if (hintText) hintText.textContent = 'Bấm để nghe đoạn đã lưu';
            renderPlayerBookmarks(highlightId);
        } else {
            if (tabChapters) tabChapters.classList.add('active');
            if (tabBookmarks) tabBookmarks.classList.remove('active');
            if (chaptersList) chaptersList.style.display = 'flex';
            if (bookmarksContainer) bookmarksContainer.style.display = 'none';
            if (hintText) hintText.textContent = 'Cuộn để xem';
        }
    }

    function updateBookmarksBadge() {
        const countEl = document.getElementById('playerBookmarksCount');
        if (!countEl) return;
        const allBookmarks = loadFromStorage(STORAGE_AUDIO_BOOKMARKS, []);
        const count = currentAudiobook 
            ? allBookmarks.filter(b => b.identifier === currentAudiobook.identifier).length 
            : allBookmarks.length;
        countEl.textContent = count;
    }

    function addBookmark() {
        if (!currentAudiobook || !currentAudiobook.tracks || !currentAudiobook.tracks[currentTrackIndex]) {
            showToast('Vui lòng chọn phát một sách nói trước khi đánh dấu');
            return;
        }

        const curTime = Math.floor(audioElement.currentTime || 0);
        const track = currentAudiobook.tracks[currentTrackIndex];
        const allBookmarks = loadFromStorage(STORAGE_AUDIO_BOOKMARKS, []);

        // Check if bookmark already exists in current chapter within 4 seconds
        const duplicate = allBookmarks.find(b => 
            b.identifier === currentAudiobook.identifier && 
            b.trackIndex === currentTrackIndex && 
            Math.abs(b.time - curTime) < 4
        );

        if (duplicate) {
            showToast(`⚠️ Mốc ${duplicate.timeFormatted || formatTime(duplicate.time)} đã được lưu trước đó`);
            switchPlaylistTab('bookmarks', duplicate.id);
            return;
        }

        const newBookmark = {
            id: 'bm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            identifier: currentAudiobook.identifier,
            bookTitle: currentAudiobook.title,
            cover: currentAudiobook.cover,
            trackIndex: currentTrackIndex,
            trackTitle: track.title,
            time: curTime,
            timeFormatted: formatTime(curTime),
            createdAt: Date.now()
        };

        allBookmarks.unshift(newBookmark);
        saveToStorage(STORAGE_AUDIO_BOOKMARKS, allBookmarks.slice(0, 100));

        // Visual feedback on top Bookmark button
        if (btnPlayerBookmark) {
            btnPlayerBookmark.classList.add('is-bookmarked');
            const bookmarkSpan = btnPlayerBookmark.querySelector('span');
            if (bookmarkSpan) bookmarkSpan.textContent = 'Đã lưu!';
            setTimeout(() => {
                btnPlayerBookmark.classList.remove('is-bookmarked');
                if (bookmarkSpan) bookmarkSpan.textContent = 'Bookmark';
            }, 2200);
        }

        updateBookmarksBadge();

        // Switch to bookmarks tab so user instantly sees where it was saved!
        switchPlaylistTab('bookmarks', newBookmark.id);
        showToast(`🔖 Đã lưu dấu trang: ${track.title} [${formatTime(curTime)}]`);
    }

    function deleteBookmark(id) {
        let allBookmarks = loadFromStorage(STORAGE_AUDIO_BOOKMARKS, []);
        allBookmarks = allBookmarks.filter(b => b.id !== id);
        saveToStorage(STORAGE_AUDIO_BOOKMARKS, allBookmarks);
        renderPlayerBookmarks();
        updateBookmarksBadge();
        showToast('Đã xóa dấu trang');
    }

    function renderPlayerBookmarks(highlightId = null) {
        const listEl = document.getElementById('playerBookmarksList');
        if (!listEl) return;

        const allBookmarks = loadFromStorage(STORAGE_AUDIO_BOOKMARKS, []);
        const bookBookmarks = currentAudiobook 
            ? allBookmarks.filter(b => b.identifier === currentAudiobook.identifier)
            : allBookmarks;

        updateBookmarksBadge();
        listEl.innerHTML = '';

        if (bookBookmarks.length === 0) {
            listEl.innerHTML = `
                <div class="bookmarks-empty-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p class="bm-empty-title">Chưa có dấu trang nào cho sách này</p>
                    <p class="bm-empty-sub">Nhấn nút <b>"+ Đánh dấu mốc hiện tại"</b> ở trên hoặc nút <b>Bookmark</b> ở góc phải để ghi nhớ lại các đoạn bạn muốn nghe lại!</p>
                </div>
            `;
            return;
        }

        bookBookmarks.forEach(bm => {
            const row = document.createElement('div');
            row.className = `player-bookmark-row ${bm.id === highlightId ? 'just-added-highlight' : ''}`;
            const dateStr = formatRelativeDate(bm.createdAt);

            row.innerHTML = `
                <div class="bm-row-left">
                    <div class="bm-time-tag">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>${bm.timeFormatted || formatTime(bm.time)}</span>
                    </div>
                    <div class="bm-details">
                        <div class="bm-chapter-name" title="${escapeHtml(bm.trackTitle)}">${escapeHtml(bm.trackTitle)}</div>
                        <div class="bm-date">${dateStr}</div>
                    </div>
                </div>
                <div class="bm-row-actions">
                    <button class="bm-action-play" title="Nghe từ mốc này">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        <span>Nghe tiếp</span>
                    </button>
                    <button class="bm-action-del" title="Xóa dấu trang">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            `;

            // Action: Play from bookmark
            const btnPlay = row.querySelector('.bm-action-play');
            if (btnPlay) {
                btnPlay.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (currentTrackIndex !== bm.trackIndex) {
                        playTrack(bm.trackIndex, bm.time, true);
                    } else {
                        audioElement.currentTime = bm.time;
                        if (audioElement.paused) audioElement.play();
                    }
                    showToast(`▶ Đang nghe từ mốc [${bm.timeFormatted || formatTime(bm.time)}] - ${bm.trackTitle}`);
                });
            }

            // Action: Delete bookmark
            const btnDel = row.querySelector('.bm-action-del');
            if (btnDel) {
                btnDel.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteBookmark(bm.id);
                });
            }

            listEl.appendChild(row);

            if (bm.id === highlightId) {
                setTimeout(() => {
                    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        });
    }

    // Attach Bookmark & Playlist tab event listeners
    if (btnPlayerBookmark) {
        btnPlayerBookmark.addEventListener('click', addBookmark);
    }
    const btnAddBookmarkNowEl = document.getElementById('btnAddBookmarkNow');
    if (btnAddBookmarkNowEl) {
        btnAddBookmarkNowEl.addEventListener('click', addBookmark);
    }
    const tabChaptersBtnEl = document.getElementById('tabChaptersBtn');
    if (tabChaptersBtnEl) {
        tabChaptersBtnEl.addEventListener('click', () => switchPlaylistTab('chapters'));
    }
    const tabBookmarksBtnEl = document.getElementById('tabBookmarksBtn');
    if (tabBookmarksBtnEl) {
        tabBookmarksBtnEl.addEventListener('click', () => switchPlaylistTab('bookmarks'));
    }

    // Modal Minimize & Close
    function openAudioPlayerModal() {
        if (audioPlayerModal) {
            audioPlayerModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function minimizeAudioPlayerModal() {
        if (audioPlayerModal) {
            audioPlayerModal.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (miniAudioPlayer && currentAudiobook) {
            miniAudioPlayer.style.display = 'block';
        }
    }

    function closeAudioPlayer(stopAudio = false) {
        if (stopAudio) {
            audioElement.pause();
            audioElement.src = '';
            currentAudiobook = null;
            if (miniAudioPlayer) miniAudioPlayer.style.display = 'none';
        }
        if (audioPlayerModal) {
            audioPlayerModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    if (btnPlayerMinimize) btnPlayerMinimize.addEventListener('click', minimizeAudioPlayerModal);
    if (btnPlayerClose) {
        btnPlayerClose.addEventListener('click', () => {
            // If playing, minimize instead of abruptly killing playback
            if (!audioElement.paused) {
                minimizeAudioPlayerModal();
                showToast('Audio đang phát trong thanh mini phía dưới màn hình');
            } else {
                closeAudioPlayer(true);
            }
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

    // Keyboard Shortcuts for Audio Player
    document.addEventListener('keydown', (e) => {
        if (audioPlayerModal && audioPlayerModal.style.display === 'flex') {
            if (e.key === 'Escape') {
                minimizeAudioPlayerModal();
            } else if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                toggleAudioPlay();
            } else if (e.key === 'ArrowLeft' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                audioElement.currentTime = Math.max(0, audioElement.currentTime - 15);
            } else if (e.key === 'ArrowRight' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                const dur = audioElement.duration || Infinity;
                audioElement.currentTime = Math.min(dur, audioElement.currentTime + 15);
            }
        }
    });

    // Save and Restore Audio State & Progress
    function saveAudioProgress() {
        if (!currentAudiobook || !currentAudiobook.tracks || !currentAudiobook.tracks[currentTrackIndex]) return;
        const cur = Math.floor(audioElement.currentTime || 0);
        const dur = Math.floor(audioElement.duration || currentAudiobook.tracks[currentTrackIndex]?.duration || 0);
        const track = currentAudiobook.tracks[currentTrackIndex];

        const progressMap = loadFromStorage(STORAGE_AUDIO_PROGRESS, {});
        progressMap[currentAudiobook.identifier] = {
            identifier: currentAudiobook.identifier,
            title: currentAudiobook.title,
            author: currentAudiobook.author,
            cover: currentAudiobook.cover,
            trackIndex: currentTrackIndex,
            trackTitle: track.title,
            currentTime: cur,
            duration: dur,
            percent: dur > 0 ? Math.min(100, Math.round((cur / dur) * 100)) : 0,
            updatedAt: Date.now()
        };
        saveToStorage(STORAGE_AUDIO_PROGRESS, progressMap);
        saveToStorage(STORAGE_AUDIO_LAST_PLAYED, currentAudiobook.identifier);

        saveAudioState();
    }

    function saveAudioState() {
        if (!currentAudiobook) return;
        const state = {
            identifier: currentAudiobook.identifier,
            trackIndex: currentTrackIndex,
            time: Math.floor(audioElement.currentTime || 0),
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
                audioElement.volume = saved.volume;
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

    // Connect Open Library Book to Internet Archive Audiobook (Always in Vietnamese!)
    async function findAndPlayAudiobook(book) {
        if (!book) return;

        showToast('Đang tìm sách nói tiếng Việt trên Internet Archive...');

        // 1. Resolve Vietnamese title
        const viTitle = await resolveVietnameseAudioTitle(book);
        const lowerVi = (viTitle || '').toLowerCase().trim();
        const lowerOrig = (book.originalTitle || book.title || '').toLowerCase().trim();

        // 2. Look for match in Curated Audiobooks
        const match = CURATED_AUDIOBOOKS.find(b => {
            const bt = b.title.toLowerCase();
            const bo = (b.originalTitle || '').toLowerCase();
            const aliases = (b.aliases || []).map(a => a.toLowerCase());

            return (lowerVi && (bt.includes(lowerVi) || lowerVi.includes(bt))) ||
                   (lowerOrig && bo && (bo.includes(lowerOrig) || lowerOrig.includes(bo))) ||
                   aliases.some(a => (lowerVi && a.includes(lowerVi)) || (lowerOrig && a.includes(lowerOrig)));
        });

        if (match) {
            showToast(`Tìm thấy sách nói tiếng Việt: ${match.title}`);
            loadAndPlayAudiobook(match.identifier, null, true, null);
            return;
        }

        // 3. Query Internet Archive using the VIETNAMESE title!
        const searchTerm = viTitle || book.titleVi || book.title;
        if (audioSearchInput) audioSearchInput.value = searchTerm;

        const results = await searchAudiobooks(searchTerm, true);

        if (results && results.length > 0) {
            showToast(`Đã tìm thấy sách nói tiếng Việt: ${results[0].title}`);
        } else {
            showToast(`Không tìm thấy audio tiếng Việt cho "${searchTerm}". Đang mở kho sách nói.`);
        }
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

})();

