/**
 * PlainReader — Book Catalog & Recommendations
 * Chỉ lưu trữ & hiển thị: Thumbnail, Tên sách, Tác giả, Mô tả, Năm phát hành (nếu có)
 */
(function () {
    'use strict';

    // =========================================
    // Storage Keys
    // =========================================
    const STORAGE_WISHLIST = 'plainreader-wishlist';
    const STORAGE_FAVORITES = 'plainreader-favorites';
    const STORAGE_THEME = 'plainreader-theme';

    // =========================================
    // State
    // =========================================
    let wishlist = loadFromStorage(STORAGE_WISHLIST);
    let favorites = loadFromStorage(STORAGE_FAVORITES);
    let currentQuery = '';
    let currentModalBook = null;
    let localBooks = [];

    // =========================================
    // DOM Elements
    // =========================================
    const searchInput = document.getElementById('searchInput');
    const btnSearch = document.getElementById('btnSearch');
    const quickTags = document.getElementById('quickTags');
    const tabs = document.getElementById('tabs');
    const contentExplore = document.getElementById('contentExplore');
    const contentWishlist = document.getElementById('contentWishlist');
    const contentFavorites = document.getElementById('contentFavorites');
    const wishlistCount = document.getElementById('wishlistCount');
    const favoritesCount = document.getElementById('favoritesCount');
    const trendingGrid = document.getElementById('trendingGrid');
    const trendingSection = document.getElementById('trendingSection');
    const recommendationsSection = document.getElementById('recommendationsSection');
    const recommendationsGrid = document.getElementById('recommendationsGrid');
    const searchResultsSection = document.getElementById('searchResultsSection');
    const searchResultsGrid = document.getElementById('searchResultsGrid');
    const searchResultsTitle = document.getElementById('searchResultsTitle');
    const resultCount = document.getElementById('resultCount');
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
    const modalDescription = document.getElementById('modalDescription');
    const modalBtnWishlist = document.getElementById('modalBtnWishlist');
    const modalBtnFavorite = document.getElementById('modalBtnFavorite');

    // Toast
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // =========================================
    // Theme
    // =========================================
    (function initTheme() {
        const saved = localStorage.getItem(STORAGE_THEME);
        if (saved) document.documentElement.setAttribute('data-theme', saved);
    })();

    // =========================================
    // Utilities
    // =========================================
    function escapeHtml(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function removeVietnameseAccents(str) {
        if (!str) return '';
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase()
            .trim();
    }

    function loadFromStorage(key) {
        try { return JSON.parse(localStorage.getItem(key)) || []; }
        catch { return []; }
    }

    function saveToStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function isInWishlist(bookKey) { return wishlist.some(b => b.key === bookKey); }
    function isInFavorites(bookKey) { return favorites.some(b => b.key === bookKey); }

    let toastTimeout;
    function showToast(msg) {
        clearTimeout(toastTimeout);
        toastMessage.textContent = msg;
        toast.classList.add('show');
        toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
    }

    function updateCounts() {
        wishlistCount.textContent = wishlist.length;
        favoritesCount.textContent = favorites.length;
    }

    // =========================================
    // Book Normalizer
    // Chỉ giữ: thumbnail (coverUrl), title, author, year (nếu có), description
    // =========================================
    function normalizeBook(raw) {
        const key = raw.id || 'book-' + Math.random().toString(36).slice(2);
        return {
            id: raw.id || key,
            key: key,
            title: raw.title || 'Chưa đặt tên',
            author: raw.author || 'Tác giả',
            year: raw.year ? String(raw.year) : '',
            description: raw.description || '',
            coverUrl: raw.cover || null,
            gradient: raw.gradient || 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            category: raw.category || '',
            isTrending: !!raw.isTrending,
        };
    }

    function initBooks() {
        if (window.VIETNAMESE_BOOKS && Array.isArray(window.VIETNAMESE_BOOKS)) {
            localBooks = window.VIETNAMESE_BOOKS.map(normalizeBook);
        } else {
            localBooks = [];
        }
    }

    // =========================================
    // Rendering: Book Card
    // Hiển thị: Thumbnail, Tên sách, Tác giả, Năm phát hành (nếu có)
    // =========================================
    function createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.setAttribute('data-key', book.key);

        const wishlisted = isInWishlist(book.key);
        const favorited = isInFavorites(book.key);
        const gradientStyle = book.gradient || 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)';

        card.innerHTML = `
            <div class="book-cover-wrapper" style="background: ${gradientStyle};">
                <div class="book-cover-placeholder">
                    <div class="placeholder-title">${escapeHtml(book.title)}</div>
                    <div class="placeholder-author">${escapeHtml(book.author)}</div>
                </div>
                ${book.coverUrl ? `
                    <img class="book-cover" src="${book.coverUrl}" alt="${escapeHtml(book.title)}" loading="lazy"
                         onload="this.style.opacity='1';"
                         onerror="this.style.display='none';"
                         style="opacity:0; transition: opacity 0.3s ease;">
                ` : ''}
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
                <div class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</div>
                <div class="book-author" title="${escapeHtml(book.author)}">${escapeHtml(book.author)}</div>
                ${book.year ? `<div class="book-year">${escapeHtml(book.year)}</div>` : ''}
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.book-action-btn')) return;
            openBookModal(book);
        });

        const btnWish = card.querySelector('.btn-wishlist');
        btnWish.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWishlist(book);
            refreshAllViews();
        });

        const btnFav = card.querySelector('.btn-favorite');
        btnFav.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(book);
            refreshAllViews();
        });

        return card;
    }

    // =========================================
    // Wishlist & Favorite Toggles
    // =========================================
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
        const was = isInFavorites(book.key);
        if (was) {
            favorites = favorites.filter(b => b.key !== book.key);
            showToast('Đã xóa khỏi Ưa thích');
        } else {
            favorites.push(book);
            showToast('Đã thêm vào Ưa thích');
        }
        saveToStorage(STORAGE_FAVORITES, favorites);
        updateCounts();
        loadRecommendations();
    }

    // =========================================
    // Book Detail Modal
    // Hiển thị: Thumbnail, Tên sách, Tác giả, Năm phát hành (nếu có), Mô tả
    // =========================================
    function openBookModal(book) {
        currentModalBook = book;

        // Thumbnail
        modalCover.src = book.coverUrl || '';
        modalCover.alt = book.title;
        modalCover.style.display = book.coverUrl ? 'block' : 'none';
        modalCover.onerror = () => { modalCover.style.display = 'none'; };

        // Tên sách & Tác giả
        modalTitle.textContent = book.title;
        modalAuthor.textContent = book.author || 'Tác giả';

        // Năm phát hành (nếu có)
        modalYear.textContent = book.year ? `Năm phát hành: ${book.year}` : '';

        // Mô tả cuốn sách
        modalDescription.textContent = book.description || 'Không có mô tả chi tiết.';

        updateModalActions();
        bookModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeBookModal() {
        bookModal.style.display = 'none';
        document.body.style.overflow = '';
        currentModalBook = null;
    }

    function updateModalActions() {
        if (!currentModalBook) return;
        const w = isInWishlist(currentModalBook.key);
        const f = isInFavorites(currentModalBook.key);

        modalBtnWishlist.classList.toggle('active', w);
        modalBtnWishlist.querySelector('span').textContent = w ? 'Đã thêm' : 'Muốn đọc';

        modalBtnFavorite.classList.toggle('active', f);
        modalBtnFavorite.querySelector('span').textContent = f ? 'Đã thích' : 'Ưa thích';
    }

    btnCloseModal.addEventListener('click', closeBookModal);
    bookModal.addEventListener('click', (e) => { if (e.target === bookModal) closeBookModal(); });
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
    // Trending
    // =========================================
    function loadTrending() {
        trendingGrid.innerHTML = '';
        let trendingBooks = localBooks.filter(b => b.isTrending);
        if (trendingBooks.length < 8) {
            const others = localBooks.filter(b => !b.isTrending);
            trendingBooks = trendingBooks.concat(others);
        }
        trendingBooks.slice(0, 16).forEach(book => trendingGrid.appendChild(createBookCard(book)));
    }

    // =========================================
    // Recommendations
    // =========================================
    function loadRecommendations() {
        if (favorites.length === 0) {
            recommendationsSection.style.display = 'none';
            return;
        }

        const favoriteAuthors = new Set(favorites.map(b => b.author.toLowerCase().trim()));
        const favoriteCategories = new Set(favorites.map(b => b.category));
        const existingKeys = new Set([
            ...favorites.map(b => b.key),
            ...wishlist.map(b => b.key),
        ]);

        const scored = [];
        localBooks.forEach(candidate => {
            if (existingKeys.has(candidate.key)) return;

            let score = 0;
            if (favoriteAuthors.has(candidate.author.toLowerCase().trim())) score += 3;
            if (candidate.category && favoriteCategories.has(candidate.category)) score += 2;

            if (score > 0) scored.push({ book: candidate, score: score });
        });

        scored.sort((a, b) => b.score - a.score);
        let recBooks = scored.map(s => s.book);

        if (recBooks.length < 4) {
            localBooks.forEach(b => {
                if (!existingKeys.has(b.key) && !recBooks.some(r => r.key === b.key)) {
                    recBooks.push(b);
                }
            });
        }

        recommendationsGrid.innerHTML = '';
        if (recBooks.length === 0) {
            recommendationsSection.style.display = 'none';
            return;
        }

        recommendationsSection.style.display = 'block';
        recBooks.slice(0, 12).forEach(b => recommendationsGrid.appendChild(createBookCard(b)));
    }

    // =========================================
    // Search
    // =========================================
    function performSearch(query) {
        const cleanQuery = query.trim();
        if (!cleanQuery) return;

        currentQuery = cleanQuery;
        const normalizedQuery = removeVietnameseAccents(cleanQuery);
        const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);

        searchResultsGrid.innerHTML = '';
        searchResultsSection.style.display = 'block';
        trendingSection.style.display = 'none';
        recommendationsSection.style.display = 'none';

        const matched = localBooks.filter(book => {
            if (cleanQuery.toLowerCase() === 'bestseller') return book.isTrending;

            const searchString = removeVietnameseAccents(
                `${book.title} ${book.author} ${book.category} ${book.year} ${book.description}`
            );

            return queryTerms.every(term => searchString.includes(term));
        });

        searchResultsTitle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Kết quả cho "${escapeHtml(cleanQuery)}"
        `;
        resultCount.textContent = `${matched.length} sách`;

        if (matched.length === 0) {
            searchResultsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <p style="font-size: 1rem;">Không tìm thấy cuốn sách nào phù hợp.</p>
                </div>
            `;
        } else {
            matched.forEach(book => searchResultsGrid.appendChild(createBookCard(book)));
        }

        searchResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // =========================================
    // Event Listeners
    // =========================================
    btnSearch.addEventListener('click', () => performSearch(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performSearch(searchInput.value);
    });

    quickTags.addEventListener('click', (e) => {
        const tag = e.target.closest('.quick-tag');
        if (!tag) return;
        const query = tag.dataset.query;
        searchInput.value = tag.textContent.trim().replace(/^🔥\s*/, '');
        switchTab('explore');
        performSearch(query);
    });

    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim() === '' && searchResultsSection.style.display !== 'none') {
            searchResultsSection.style.display = 'none';
            trendingSection.style.display = 'block';
            currentQuery = '';
            if (favorites.length > 0) recommendationsSection.style.display = 'block';
        }
    });

    // =========================================
    // Tabs: Explore, Wishlist, Favorites
    // =========================================
    function switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const targetTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        if (targetTab) targetTab.classList.add('active');

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
        if (tab) switchTab(tab.dataset.tab);
    });

    function renderWishlist() {
        wishlistGrid.innerHTML = '';
        if (wishlist.length === 0) {
            wishlistEmpty.style.display = 'flex';
            return;
        }
        wishlistEmpty.style.display = 'none';
        wishlist.forEach(b => wishlistGrid.appendChild(createBookCard(b)));
    }

    function renderFavorites() {
        favoritesGrid.innerHTML = '';
        if (favorites.length === 0) {
            favoritesEmpty.style.display = 'flex';
            return;
        }
        favoritesEmpty.style.display = 'none';
        favorites.forEach(b => favoritesGrid.appendChild(createBookCard(b)));
    }

    function refreshAllViews() {
        updateCounts();
        document.querySelectorAll('.book-card').forEach(card => {
            const key = card.getAttribute('data-key');
            const wBtn = card.querySelector('.btn-wishlist');
            const fBtn = card.querySelector('.btn-favorite');
            if (wBtn) {
                const isW = isInWishlist(key);
                wBtn.classList.toggle('is-wishlisted', isW);
                wBtn.title = isW ? 'Bỏ muốn đọc' : 'Muốn đọc';
            }
            if (fBtn) {
                const isF = isInFavorites(key);
                fBtn.classList.toggle('is-favorited', isF);
                fBtn.title = isF ? 'Bỏ ưa thích' : 'Ưa thích';
            }
        });

        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            if (activeTab.dataset.tab === 'wishlist') renderWishlist();
            if (activeTab.dataset.tab === 'favorites') renderFavorites();
        }
    }

    // =========================================
    // Initialization
    // =========================================
    initBooks();
    updateCounts();
    loadTrending();
    loadRecommendations();

})();
