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
    function loadFromStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch {
            return [];
        }
    }

    function saveToStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
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
        [contentExplore, contentWishlist, contentFavorites].forEach(c => c.classList.remove('active'));

        if (tabName === 'explore') {
            contentExplore.classList.add('active');
        } else if (tabName === 'wishlist') {
            contentWishlist.classList.add('active');
            renderWishlist();
        } else if (tabName === 'favorites') {
            contentFavorites.classList.add('active');
            renderFavorites();
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
    // Init
    // =========================================
    updateCounts();
    renderCatalogSections();
    initLazyLoadingSections();
    loadRecommendations();

})();
