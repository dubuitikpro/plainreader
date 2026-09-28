/**
 * PlainReader — Book Catalog
 * Primary: Google Books API (free, no key required, supports Vietnamese)
 * Fallback: Open Library API
 */
(function () {
    'use strict';

    // =========================================
    // Constants
    // =========================================
    const GB_SEARCH = 'https://www.googleapis.com/books/v1/volumes';
    const OL_SUBJECTS = 'https://openlibrary.org/subjects/';
    const OL_BASE = 'https://openlibrary.org';

    const STORAGE_WISHLIST = 'plainreader-wishlist';
    const STORAGE_FAVORITES = 'plainreader-favorites';
    const STORAGE_THEME = 'plainreader-theme';
    const STORAGE_LANG = 'plainreader-lang';
    const PAGE_SIZE = 20;

    // Vietnamese popular search seeds for "trending"
    const VI_TRENDING_QUERIES = [
        'tiểu thuyết việt nam',
        'sách văn học việt nam',
        'truyện ngắn việt nam',
        'sách lịch sử việt nam',
        'sách tâm lý học',
        'sách kỹ năng sống',
        'truyện cổ tích việt nam',
        'sách triết học',
    ];

    // =========================================
    // State
    // =========================================
    let wishlist = loadFromStorage(STORAGE_WISHLIST);
    let favorites = loadFromStorage(STORAGE_FAVORITES);
    let currentQuery = '';
    let currentPage = 0; // Google Books uses startIndex
    let totalResults = 0;
    let currentModalBook = null;
    let isLoading = false;
    let currentLang = localStorage.getItem(STORAGE_LANG) || 'vi'; // default Vietnamese

    // =========================================
    // DOM Elements
    // =========================================
    const searchInput = document.getElementById('searchInput');
    const btnSearch = document.getElementById('btnSearch');
    const quickTags = document.getElementById('quickTags');
    const langToggle = document.getElementById('langToggle');
    const langLabel = document.getElementById('langLabel');
    const tabs = document.getElementById('tabs');
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
    const trendingSection = document.getElementById('trendingSection');
    const catalogLoading = document.getElementById('catalogLoading');
    const wishlistGrid = document.getElementById('wishlistGrid');
    const favoritesGrid = document.getElementById('favoritesGrid');
    const wishlistEmpty = document.getElementById('wishlistEmpty');
    const favoritesEmpty = document.getElementById('favoritesEmpty');

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
    // Language Toggle
    // =========================================
    function updateLangUI() {
        if (currentLang === 'vi') {
            langToggle.classList.add('active');
            langLabel.textContent = '🇻🇳 Tiếng Việt';
        } else {
            langToggle.classList.remove('active');
            langLabel.textContent = '🌐 Tất cả ngôn ngữ';
        }
    }

    langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'vi' ? 'all' : 'vi';
        localStorage.setItem(STORAGE_LANG, currentLang);
        updateLangUI();
        // Reload trending with new language
        loadTrending();
        // Re-search if there's a current query
        if (currentQuery) {
            currentPage = 0;
            searchResultsGrid.innerHTML = '';
            performSearch(currentQuery, 0);
        }
    });

    updateLangUI();

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
            showToast('Đã xóa khỏi danh sách Muốn đọc');
        } else {
            wishlist.push(book);
            showToast('Đã thêm vào danh sách Muốn đọc');
        }
        saveToStorage(STORAGE_WISHLIST, wishlist);
        updateCounts();
    }

    function toggleFavorite(book) {
        const wasInFavorites = isInFavorites(book.key);
        if (wasInFavorites) {
            favorites = favorites.filter(b => b.key !== book.key);
            showToast('Đã xóa khỏi Ưa thích');
        } else {
            favorites.push(book);
            showToast('Đã thêm vào Ưa thích');
        }
        saveToStorage(STORAGE_FAVORITES, favorites);
        updateCounts();
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
    // Google Books API
    // =========================================
    function normalizeGoogleBook(item) {
        const v = item.volumeInfo || {};
        const covUrl = v.imageLinks
            ? (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail || '')
            : '';
        // Upgrade to higher quality cover
        const coverUrl = covUrl
            .replace('http://', 'https://')
            .replace('&edge=curl', '')
            .replace('zoom=1', 'zoom=2');

        return {
            key: item.id || '',
            title: v.title || 'Không có tiêu đề',
            author: v.authors ? v.authors.join(', ') : 'Không rõ tác giả',
            coverUrl: coverUrl || null,
            year: v.publishedDate ? v.publishedDate.substring(0, 4) : null,
            subjects: v.categories || [],
            language: v.language || null,
            pages: v.pageCount || null,
            description: v.description || '',
            infoLink: v.infoLink || '',
            previewLink: v.previewLink || '',
            publisher: v.publisher || '',
            source: 'google',
        };
    }

    async function searchGoogleBooks(query, startIndex = 0) {
        let url = `${GB_SEARCH}?q=${encodeURIComponent(query)}&maxResults=${PAGE_SIZE}&startIndex=${startIndex}&orderBy=relevance&printType=books`;
        if (currentLang === 'vi') {
            url += '&langRestrict=vi';
        }
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Google Books search failed');
        const data = await resp.json();
        return {
            total: data.totalItems || 0,
            books: (data.items || []).map(normalizeGoogleBook),
        };
    }

    async function fetchGoogleBookDetails(volumeId) {
        const resp = await fetch(`${GB_SEARCH}/${volumeId}`);
        if (!resp.ok) throw new Error('Details fetch failed');
        const data = await resp.json();
        return normalizeGoogleBook(data);
    }

    // =========================================
    // Book Cover URL helper
    // =========================================
    function getCoverUrl(book) {
        if (book.coverUrl) return book.coverUrl;
        if (book.coverId) {
            return `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`;
        }
        return null;
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

        card.innerHTML = `
            <div class="book-cover-wrapper">
                ${coverUrl
                    ? `<img class="book-cover" src="${coverUrl}" alt="${escapeHtml(book.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'book-cover-placeholder\\'>${escapeHtml(book.title)}</div>'">`
                    : `<div class="book-cover-placeholder">${escapeHtml(book.title)}</div>`
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
                <div class="book-title">${escapeHtml(book.title)}</div>
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

        const coverUrl = getCoverUrl(book);
        if (coverUrl) {
            // Try to get higher quality cover for modal
            let modalCoverUrl = coverUrl;
            if (book.source === 'google' && book.coverUrl) {
                modalCoverUrl = book.coverUrl.replace('zoom=1', 'zoom=3').replace('zoom=2', 'zoom=3');
            }
            modalCover.src = modalCoverUrl;
            modalCover.onerror = () => {
                modalCover.src = coverUrl; // fallback to regular
                modalCover.onerror = () => {
                    modalCover.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect fill="%2312121a" width="200" height="300"/><text fill="%235a5a6e" x="100" y="150" text-anchor="middle" font-size="14">No Cover</text></svg>';
                };
            };
        } else {
            modalCover.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect fill="%2312121a" width="200" height="300"/><text fill="%235a5a6e" x="100" y="150" text-anchor="middle" font-size="14">No Cover</text></svg>';
        }

        modalTitle.textContent = book.title;
        modalAuthor.textContent = book.author;
        modalYear.textContent = book.year ? `📅 ${book.year}` : '';
        modalPages.textContent = book.pages ? `📄 ${book.pages} trang` : '';

        const langMap = { vi: 'Tiếng Việt', en: 'English', fr: 'Français', zh: '中文', ja: '日本語', ko: '한국어' };
        modalLanguage.textContent = book.language ? `🌐 ${langMap[book.language] || book.language.toUpperCase()}` : '';

        // Subjects
        modalSubjects.innerHTML = '';
        if (book.subjects && book.subjects.length > 0) {
            modalSubjects.innerHTML = book.subjects.slice(0, 8).map(s =>
                `<span class="subject-tag">${escapeHtml(s)}</span>`
            ).join('');
        }

        // Description
        if (book.description) {
            // Strip HTML tags from Google Books descriptions
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = book.description;
            modalDescription.textContent = tempDiv.textContent || tempDiv.innerText || '';
        } else {
            modalDescription.textContent = 'Không có mô tả.';
        }

        // Publisher info
        if (book.publisher) {
            modalDescription.textContent = `📚 NXB: ${book.publisher}\n\n${modalDescription.textContent}`;
        }

        // Actions
        updateModalActions();

        // Link
        const linkUrl = book.infoLink || book.previewLink || `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(book.title)}`;
        modalBtnOpenLibrary.href = linkUrl;
        modalBtnOpenLibrary.querySelector('span').textContent = book.source === 'google' ? 'Google Books' : 'Open Library';

        // Show modal
        bookModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Fetch more details for Google Books if description is short
        if (book.source === 'google' && !book.description && book.key) {
            try {
                const details = await fetchGoogleBookDetails(book.key);
                if (details.description) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = details.description;
                    let desc = tempDiv.textContent || tempDiv.innerText || '';
                    if (details.publisher) {
                        desc = `📚 NXB: ${details.publisher}\n\n${desc}`;
                    }
                    modalDescription.textContent = desc;
                }
                if (details.subjects && details.subjects.length > 0) {
                    modalSubjects.innerHTML = details.subjects.slice(0, 8).map(s =>
                        `<span class="subject-tag">${escapeHtml(s)}</span>`
                    ).join('');
                }
            } catch { /* ignore */ }
        }
    }

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
    async function performSearch(query, startIndex = 0) {
        if (!query.trim() || isLoading) return;

        currentQuery = query.trim();
        currentPage = startIndex;

        if (startIndex === 0) {
            searchResultsGrid.innerHTML = '';
            searchResultsSection.style.display = 'block';
            trendingSection.style.display = 'none';
            recommendationsSection.style.display = 'none';
            loadMoreContainer.style.display = 'none';
        }

        isLoading = true;
        catalogLoading.style.display = 'flex';

        try {
            const result = await searchGoogleBooks(currentQuery, startIndex);
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

            // Show load more
            const shown = startIndex + PAGE_SIZE;
            loadMoreContainer.style.display = shown < totalResults && result.books.length > 0 ? 'flex' : 'none';

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
        performSearch(currentQuery, currentPage + PAGE_SIZE);
    });

    // Quick tags
    quickTags.addEventListener('click', (e) => {
        const tag = e.target.closest('.quick-tag');
        if (!tag) return;
        const query = tag.dataset.query;
        searchInput.value = tag.textContent.trim();
        switchTab('explore');
        performSearch(query);
    });

    // =========================================
    // Tabs
    // =========================================
    function switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

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
        document.querySelectorAll('.book-card').forEach(card => {
            const key = card.getAttribute('data-key');
            const wBtn = card.querySelector('.btn-wishlist');
            const fBtn = card.querySelector('.btn-favorite');
            if (wBtn) wBtn.classList.toggle('is-wishlisted', isInWishlist(key));
            if (fBtn) fBtn.classList.toggle('is-favorited', isInFavorites(key));
        });

        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            if (activeTab.dataset.tab === 'wishlist') renderWishlist();
            if (activeTab.dataset.tab === 'favorites') renderFavorites();
        }
    }

    // =========================================
    // Trending (Vietnamese books)
    // =========================================
    async function loadTrending() {
        showSkeletons(trendingGrid, 8, true);

        try {
            // Pick 2-3 random Vietnamese queries for variety
            const shuffled = [...VI_TRENDING_QUERIES].sort(() => 0.5 - Math.random());
            const picks = shuffled.slice(0, 3);

            const allBooks = [];
            const seenKeys = new Set();

            for (const query of picks) {
                try {
                    const result = await searchGoogleBooks(query, 0);
                    result.books.forEach(b => {
                        if (!seenKeys.has(b.key)) {
                            seenKeys.add(b.key);
                            allBooks.push(b);
                        }
                    });
                } catch { /* skip */ }
            }

            trendingGrid.innerHTML = '';
            if (allBooks.length === 0) {
                trendingGrid.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Không thể tải sách phổ biến.</p>';
                return;
            }

            // Shuffle and show
            const display = allBooks.sort(() => 0.5 - Math.random()).slice(0, 20);
            display.forEach(book => {
                trendingGrid.appendChild(createBookCard(book));
            });
        } catch (err) {
            console.error('Trending error:', err);
            trendingGrid.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Không thể tải sách phổ biến.</p>';
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
            const searchQueries = [];

            // Build search queries from favorite books' subjects, authors, and titles
            favorites.forEach(b => {
                if (b.subjects) {
                    b.subjects.forEach(s => {
                        const clean = s.toLowerCase().trim();
                        if (clean.length > 2 && !searchQueries.includes(clean)) {
                            searchQueries.push(clean);
                        }
                    });
                }
                // Also use author names for recommendations
                if (b.author && b.author !== 'Không rõ tác giả') {
                    const authorQuery = `inauthor:${b.author.split(',')[0].trim()}`;
                    if (!searchQueries.includes(authorQuery)) {
                        searchQueries.push(authorQuery);
                    }
                }
            });

            if (searchQueries.length === 0) {
                // Fallback: use title keywords
                favorites.forEach(b => {
                    const words = b.title.split(/\s+/).filter(w => w.length > 3);
                    if (words.length > 0) {
                        searchQueries.push(words.slice(0, 2).join(' '));
                    }
                });
            }

            if (searchQueries.length === 0) {
                recommendationsSection.style.display = 'none';
                return;
            }

            // Pick up to 3 random queries
            const shuffled = searchQueries.sort(() => 0.5 - Math.random());
            const chosen = shuffled.slice(0, 3);

            const allBooks = [];
            const existingKeys = new Set([
                ...favorites.map(b => b.key),
                ...wishlist.map(b => b.key),
            ]);

            for (const query of chosen) {
                try {
                    const result = await searchGoogleBooks(query, 0);
                    result.books.forEach(b => {
                        if (!existingKeys.has(b.key) && !allBooks.some(ab => ab.key === b.key)) {
                            allBooks.push(b);
                            existingKeys.add(b.key);
                        }
                    });
                } catch { /* skip */ }
            }

            recommendationsGrid.innerHTML = '';
            if (allBooks.length === 0) {
                recommendationsSection.style.display = 'none';
                return;
            }

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
    // Show explore default
    // =========================================
    function showExploreDefault() {
        searchResultsSection.style.display = 'none';
        trendingSection.style.display = 'block';
        if (favorites.length > 0) recommendationsSection.style.display = 'block';
    }

    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim() === '' && searchResultsSection.style.display !== 'none') {
            showExploreDefault();
        }
    });

    // =========================================
    // Init
    // =========================================
    updateCounts();
    loadTrending();
    loadRecommendations();

})();
