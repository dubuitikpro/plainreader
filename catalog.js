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
    // Book Data Normalization
    // =========================================
    function normalizeSearchBook(doc) {
        return {
            key: doc.key || '',
            title: doc.title || 'Không có tiêu đề',
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
        return {
            key: work.key || '',
            title: work.title || 'Không có tiêu đề',
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
        return {
            total: data.numFound || 0,
            books: (data.docs || []).map(normalizeSearchBook),
        };
    }

    async function fetchTrending() {
        try {
            const resp = await fetch(`${OL_TRENDING}?limit=20`);
            if (!resp.ok) throw new Error('Trending failed');
            const data = await resp.json();
            return (data.works || []).map(w => ({
                key: w.key || '',
                title: w.title || 'Không có tiêu đề',
                author: w.author_name ? w.author_name.join(', ') : (w.author_key ? w.author_key.join(', ') : 'Không rõ tác giả'),
                coverId: w.cover_i || null,
                coverEditionKey: w.cover_edition_key || null,
                year: w.first_publish_year || null,
                subjects: (w.subject || []).slice(0, 5),
                language: null,
                editionCount: w.edition_count || 0,
                pages: null,
            }));
        } catch {
            // Fallback to a subject search if trending endpoint is unavailable
            return fetchSubjectBooks('fiction', 20);
        }
    }

    async function fetchSubjectBooks(subject, limit = 12) {
        const url = `${OL_SUBJECTS}${encodeURIComponent(subject.toLowerCase())}.json?limit=${limit}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Subject fetch failed');
        const data = await resp.json();
        return (data.works || []).map(normalizeSubjectBook);
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

        modalTitle.textContent = book.title;
        modalAuthor.textContent = book.author;
        modalYear.textContent = book.year ? `📅 ${book.year}` : '';
        modalPages.textContent = book.pages ? `📄 ${book.pages} trang` : '';
        modalLanguage.textContent = book.language ? `🌐 ${book.language.toUpperCase()}` : '';
        modalDescription.textContent = 'Đang tải mô tả...';
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
            if (details.description) {
                const desc = typeof details.description === 'string'
                    ? details.description
                    : details.description.value || '';
                modalDescription.textContent = desc || 'Không có mô tả.';
            } else {
                modalDescription.textContent = 'Không có mô tả.';
            }

            if (details.subjects && details.subjects.length > 0) {
                modalSubjects.innerHTML = details.subjects.slice(0, 8).map(s =>
                    `<span class="subject-tag">${escapeHtml(s)}</span>`
                ).join('');
            }
        } catch {
            modalDescription.textContent = 'Không thể tải mô tả.';
            if (book.subjects && book.subjects.length > 0) {
                modalSubjects.innerHTML = book.subjects.map(s =>
                    `<span class="subject-tag">${escapeHtml(s)}</span>`
                ).join('');
            }
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
    async function performSearch(query, page = 1) {
        if (!query.trim() || isLoading) return;

        currentQuery = query.trim();
        currentPage = page;

        if (page === 1) {
            searchResultsGrid.innerHTML = '';
            searchResultsSection.style.display = 'block';
            trendingSection.style.display = 'none';
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

    // Quick tags
    quickTags.addEventListener('click', (e) => {
        const tag = e.target.closest('.quick-tag');
        if (!tag) return;
        const query = tag.dataset.query;
        searchInput.value = query;
        switchTab('explore');
        performSearch(query);
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
    // Trending
    // =========================================
    async function loadTrending() {
        showSkeletons(trendingGrid, 8, true);
        try {
            const books = await fetchTrending();
            trendingGrid.innerHTML = '';
            books.forEach(book => {
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
        trendingSection.style.display = 'block';
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
    loadTrending();
    loadRecommendations();

})();
