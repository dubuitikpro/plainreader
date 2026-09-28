/**
 * PlainReader — Book Catalog & Recommendations
 * Nguồn dữ liệu:
 * 1. Kho sách tiếng Việt tuyển chọn (tải tức thì 0ms)
 * 2. Kết nối Open Library API theo thời gian thực
 * 3. Tự động tìm kiếm ảnh bìa trên mạng (Wikipedia / Wikimedia / ISBN) nếu Open Library chưa có bìa
 * 
 * Thông tin hiển thị tuân thủ nghiêm ngặt 5 mục:
 * 1. Thumbnail (ảnh bìa)
 * 2. Tên cuốn sách (title)
 * 3. Tác giả (author)
 * 4. Năm phát hành nếu có (year)
 * 5. Mô tả cuốn sách (description)
 */
(function () {
    'use strict';

    // =========================================
    // Storage Keys & API URLs
    // =========================================
    const STORAGE_WISHLIST = 'plainreader-wishlist';
    const STORAGE_FAVORITES = 'plainreader-favorites';
    const STORAGE_THEME = 'plainreader-theme';

    const OL_SEARCH_URL = 'https://openlibrary.org/search.json';
    const OL_WORKS_URL = 'https://openlibrary.org';
    const WIKI_API_URL = 'https://vi.wikipedia.org/w/api.php';

    const GRADIENTS = [
        'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
        'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
        'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
        'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        'linear-gradient(135deg, #3a6073 0%, #3a7bd5 100%)'
    ];

    // In-memory web cover cache to avoid redundant API requests
    const webCoverCache = new Map();

    // =========================================
    // State
    // =========================================
    let wishlist = loadFromStorage(STORAGE_WISHLIST);
    let favorites = loadFromStorage(STORAGE_FAVORITES);
    let currentQuery = '';
    let currentModalBook = null;
    let localBooks = [];
    let searchAbortController = null;

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
    const modalPublisher = document.getElementById('modalPublisher');
    const modalPages = document.getElementById('modalPages');
    const modalLanguage = document.getElementById('modalLanguage');
    const modalEditions = document.getElementById('modalEditions');
    const modalRating = document.getElementById('modalRating');
    const modalISBN = document.getElementById('modalISBN');
    const modalSubjects = document.getElementById('modalSubjects');
    const modalDescription = document.getElementById('modalDescription');
    const modalBtnWishlist = document.getElementById('modalBtnWishlist');
    const modalBtnFavorite = document.getElementById('modalBtnFavorite');
    const modalBtnOpenLibrary = document.getElementById('modalBtnOpenLibrary');
    const modalStoreLinks = document.getElementById('modalStoreLinks');

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

    function getRandomGradient(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % GRADIENTS.length;
        return GRADIENTS[index];
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
    // Tự động tìm kiếm ảnh bìa trên mạng (Wikipedia / Wikimedia)
    // Nếu Open Library không có ảnh bìa
    // =========================================
    async function fetchWebCover(title) {
        if (!title) return null;
        const cleanTitle = title.replace(/\(.*?\)/g, '').trim();
        if (webCoverCache.has(cleanTitle)) {
            return webCoverCache.get(cleanTitle);
        }

        try {
            const url = `${WIKI_API_URL}?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanTitle)}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=500&origin=*`;
            const resp = await fetch(url);
            if (!resp.ok) {
                webCoverCache.set(cleanTitle, null);
                return null;
            }
            const data = await resp.json();
            if (data.query && data.query.pages) {
                const page = Object.values(data.query.pages)[0];
                if (page.thumbnail && page.thumbnail.source) {
                    const thumb = page.thumbnail.source;
                    webCoverCache.set(cleanTitle, thumb);
                    return thumb;
                }
            }
        } catch { /* ignore network error */ }

        webCoverCache.set(cleanTitle, null);
        return null;
    }

    // =========================================
    // Language Formatter
    // =========================================
    function formatLanguageName(code) {
        if (!code) return '';
        const map = {
            vie: 'Tiếng Việt',
            eng: 'Tiếng Anh',
            fre: 'Tiếng Pháp',
            fra: 'Tiếng Pháp',
            ger: 'Tiếng Đức',
            deu: 'Tiếng Đức',
            spa: 'Tiếng Tây Ban Nha',
            ita: 'Tiếng Ý',
            rus: 'Tiếng Nga',
            chi: 'Tiếng Trung',
            zho: 'Tiếng Trung',
            jpn: 'Tiếng Nhật',
            kor: 'Tiếng Hàn'
        };
        return map[code.toLowerCase()] || code.toUpperCase();
    }

    // =========================================
    // Book Normalizer
    // =========================================
    function normalizeBook(raw) {
        const key = raw.id || 'book-' + Math.random().toString(36).slice(2);
        return {
            id: raw.id || key,
            key: key,
            title: raw.title || 'Chưa đặt tên',
            author: raw.author || 'Tác giả',
            year: raw.year ? String(raw.year) : '',
            publisher: raw.publisher || '',
            pages: raw.pages || null,
            price: raw.price || '',
            language: raw.language || 'Tiếng Việt',
            category: raw.category || '',
            categoryLabel: raw.categoryLabel || '',
            description: raw.description || '',
            coverUrl: raw.cover || null,
            gradient: raw.gradient || getRandomGradient(raw.title || 'book'),
            isTrending: !!raw.isTrending,
            nhaNamUrl: raw.nhaNamUrl || '',
            fahasaUrl: raw.fahasaUrl || '',
            tikiUrl: raw.tikiUrl || '',
            isbn: raw.isbn || '',
            workKey: raw.workKey || '',
            subjects: raw.categoryLabel ? [raw.categoryLabel] : (raw.category ? [raw.category] : []),
            rating: raw.rating || null,
            ratingCount: raw.ratingCount || 0,
            editionCount: raw.editionCount || null
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
    // Open Library Live Search
    // =========================================
    async function searchOpenLibrary(query, signal) {
        try {
            const url = `${OL_SEARCH_URL}?q=${encodeURIComponent(query)}&fields=key,title,author_name,first_publish_year,cover_i,isbn,publisher,number_of_pages_median,subject,language,edition_count,ratings_average,ratings_count,publish_date&limit=15`;
            const resp = await fetch(url, { signal });
            if (!resp.ok) return [];
            const data = await resp.json();
            return (data.docs || []).map(doc => {
                const title = doc.title || 'Chưa đặt tên';
                const author = doc.author_name ? doc.author_name.join(', ') : 'Tác giả';
                const year = doc.first_publish_year ? String(doc.first_publish_year) : (doc.publish_date && doc.publish_date.length > 0 ? String(doc.publish_date[0]) : '');
                const workKey = doc.key || '';

                let coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null;

                // Nếu Open Library không có cover_i, thử qua ISBN
                if (!coverUrl && doc.isbn && doc.isbn.length > 0) {
                    coverUrl = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
                }

                // Nếu vẫn chưa có, kiểm tra trong kho sách tuyển chọn có sẵn
                if (!coverUrl) {
                    const normT = removeVietnameseAccents(title);
                    const localMatch = localBooks.find(lb => removeVietnameseAccents(lb.title) === normT && lb.coverUrl);
                    if (localMatch) {
                        coverUrl = localMatch.coverUrl;
                    }
                }

                const publisher = doc.publisher && doc.publisher.length > 0 ? doc.publisher.slice(0, 3).join(', ') : '';
                const pages = doc.number_of_pages_median || null;
                const languages = doc.language && doc.language.length > 0 ? doc.language.slice(0, 3).map(formatLanguageName).join(', ') : '';
                const isbn = doc.isbn && doc.isbn.length > 0 ? doc.isbn[0] : '';
                const editionCount = doc.edition_count || null;
                const rating = doc.ratings_average ? Number(doc.ratings_average).toFixed(1) : null;
                const ratingCount = doc.ratings_count || 0;
                const subjects = doc.subject && Array.isArray(doc.subject) ? doc.subject.slice(0, 8) : [];

                return {
                    id: 'ol-' + (workKey.replace(/\//g, '-') || Math.random().toString(36).slice(2)),
                    key: 'ol-' + (workKey.replace(/\//g, '-') || Math.random().toString(36).slice(2)),
                    workKey: workKey,
                    title: title,
                    author: author,
                    year: year,
                    publisher: publisher,
                    pages: pages,
                    language: languages,
                    isbn: isbn,
                    editionCount: editionCount,
                    rating: rating,
                    ratingCount: ratingCount,
                    subjects: subjects,
                    description: '', // Loaded on demand in modal
                    coverUrl: coverUrl,
                    gradient: getRandomGradient(title),
                    isFromOpenLibrary: true,
                    needsWebCover: !coverUrl
                };
            });
        } catch (err) {
            if (err.name === 'AbortError') return [];
            console.warn('Open Library search error:', err);
            return [];
        }
    }

    // =========================================
    // Rendering: Book Card
    // Hiển thị đúng 5 mục: Thumbnail, Tên sách, Tác giả, Năm phát hành (nếu có)
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
                         onerror="this.style.display='none'; this.dispatchEvent(new CustomEvent('cover-failed', {bubbles: true}));"
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
                <div class="book-meta-line">
                    ${book.year ? `<span class="book-year">${escapeHtml(book.year)}</span>` : '<span></span>'}
                    ${book.rating ? `<span class="book-rating">★ ${book.rating}</span>` : (book.pages ? `<span class="book-pages">${book.pages} tr</span>` : '')}
                </div>
            </div>
        `;

        // Nếu cuốn sách chưa có ảnh bìa từ Open Library, tự động tìm trên mạng
        if (book.needsWebCover && !book.coverUrl) {
            fetchWebCover(book.title).then(webCover => {
                if (webCover) {
                    book.coverUrl = webCover;
                    book.needsWebCover = false;
                    const wrapper = card.querySelector('.book-cover-wrapper');
                    if (wrapper) {
                        let img = wrapper.querySelector('.book-cover');
                        if (!img) {
                            img = document.createElement('img');
                            img.className = 'book-cover';
                            img.alt = book.title;
                            img.loading = 'lazy';
                            img.style.opacity = '0';
                            img.style.transition = 'opacity 0.3s ease';
                            wrapper.appendChild(img);
                        }
                        img.onload = () => { img.style.opacity = '1'; };
                        img.src = webCover;
                    }
                }
            });
        }

        // Nếu ảnh bìa Open Library bị lỗi tải (404), tự động tìm ảnh thay thế trên mạng
        card.addEventListener('cover-failed', () => {
            fetchWebCover(book.title).then(webCover => {
                if (webCover && webCover !== book.coverUrl) {
                    book.coverUrl = webCover;
                    const img = card.querySelector('.book-cover');
                    if (img) {
                        img.src = webCover;
                        img.style.display = 'block';
                    }
                }
            });
        });

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
    // Book Detail Modal Helpers
    // =========================================
    function renderModalBadges(book) {
        // Năm phát hành
        if (book.year) {
            modalYear.textContent = `Năm: ${book.year}`;
            modalYear.style.display = 'inline-flex';
        } else {
            modalYear.style.display = 'none';
        }

        // Nhà xuất bản
        if (book.publisher) {
            modalPublisher.textContent = `NXB: ${book.publisher}`;
            modalPublisher.style.display = 'inline-flex';
        } else {
            modalPublisher.style.display = 'none';
        }

        // Số trang
        if (book.pages) {
            modalPages.textContent = `${book.pages} trang`;
            modalPages.style.display = 'inline-flex';
        } else {
            modalPages.style.display = 'none';
        }

        // Ngôn ngữ
        if (book.language) {
            modalLanguage.textContent = `${book.language}`;
            modalLanguage.style.display = 'inline-flex';
        } else {
            modalLanguage.style.display = 'none';
        }

        // Phiên bản phát hành
        if (book.editionCount) {
            modalEditions.textContent = `${book.editionCount} ấn bản`;
            modalEditions.style.display = 'inline-flex';
        } else {
            modalEditions.style.display = 'none';
        }

        // Điểm đánh giá
        if (book.rating) {
            modalRating.textContent = `★ ${book.rating} / 5${book.ratingCount ? ' (' + book.ratingCount + ' đánh giá)' : ''}`;
            modalRating.style.display = 'inline-flex';
        } else {
            modalRating.style.display = 'none';
        }

        // Mã ISBN
        if (book.isbn) {
            modalISBN.textContent = `ISBN: ${book.isbn}`;
            modalISBN.style.display = 'inline-flex';
        } else {
            modalISBN.style.display = 'none';
        }
    }

    function renderModalSubjects(book) {
        modalSubjects.innerHTML = '';
        if (book.subjects && book.subjects.length > 0) {
            book.subjects.forEach(subj => {
                const tag = document.createElement('span');
                tag.className = 'subject-tag';
                tag.textContent = subj;
                modalSubjects.appendChild(tag);
            });
            modalSubjects.style.display = 'flex';
        } else {
            modalSubjects.style.display = 'none';
        }
    }

    function renderModalLinks(book) {
        // Nút xem trực tiếp trên Open Library
        if (book.workKey) {
            modalBtnOpenLibrary.href = `https://openlibrary.org${book.workKey}`;
            modalBtnOpenLibrary.style.display = 'inline-flex';
        } else {
            modalBtnOpenLibrary.href = `https://openlibrary.org/search?q=${encodeURIComponent(book.title)}`;
            modalBtnOpenLibrary.style.display = 'inline-flex';
        }

        // Các nút liên kết mua sách Việt Nam (Fahasa, Tiki, Nhã Nam)
        modalStoreLinks.innerHTML = '';
        const stores = [];
        if (book.fahasaUrl) stores.push({ name: 'Fahasa', url: book.fahasaUrl, cls: 'store-btn-fahasa' });
        if (book.tikiUrl) stores.push({ name: 'Tiki', url: book.tikiUrl, cls: 'store-btn-tiki' });
        if (book.nhaNamUrl) stores.push({ name: 'Nhã Nam', url: book.nhaNamUrl, cls: 'store-btn-nhanam' });

        if (stores.length > 0) {
            stores.forEach(s => {
                const a = document.createElement('a');
                a.className = `store-btn ${s.cls}`;
                a.href = s.url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.innerHTML = `<span>Mua tại ${s.name} ↗</span>`;
                modalStoreLinks.appendChild(a);
            });
            modalStoreLinks.style.display = 'flex';
        } else {
            modalStoreLinks.style.display = 'none';
        }
    }

    // =========================================
    // Book Detail Modal
    // =========================================
    function openBookModal(book) {
        currentModalBook = book;

        // Thumbnail
        modalCover.src = book.coverUrl || '';
        modalCover.alt = book.title;
        modalCover.style.display = book.coverUrl ? 'block' : 'none';
        modalCover.onerror = () => { modalCover.style.display = 'none'; };

        // Nếu modal chưa có ảnh bìa, tự động tìm trên mạng
        if (!book.coverUrl) {
            fetchWebCover(book.title).then(webCover => {
                if (webCover) {
                    book.coverUrl = webCover;
                    if (currentModalBook && currentModalBook.key === book.key) {
                        modalCover.src = webCover;
                        modalCover.style.display = 'block';
                    }
                }
            });
        }

        // Tên sách & Tác giả
        modalTitle.textContent = book.title;
        modalAuthor.textContent = book.author || 'Tác giả';

        // Render toàn bộ huy hiệu thông tin (Năm, NXB, Trang, Ngôn ngữ, Ấn bản, Đánh giá, ISBN)
        renderModalBadges(book);

        // Render thể loại & chủ đề
        renderModalSubjects(book);

        // Render nút Open Library & Store links
        renderModalLinks(book);

        // Mô tả cuốn sách
        if (book.description) {
            modalDescription.textContent = book.description;
        } else if (book.workKey) {
            modalDescription.textContent = 'Đang tải tóm tắt từ Open Library...';
            fetch(`${OL_WORKS_URL}${book.workKey}.json`)
                .then(r => r.json())
                .then(data => {
                    let desc = '';
                    if (typeof data.description === 'string') {
                        desc = data.description.trim();
                    } else if (data.description && data.description.value) {
                        desc = data.description.value.trim();
                    }
                    if (!desc) {
                        desc = `Tác phẩm của tác giả ${book.author}${book.year ? ', xuất bản năm ' + book.year : ''}. Hiện chưa có bản tóm tắt nội dung chi tiết trên Open Library.`;
                    }
                    book.description = desc;
                    if (data.subjects && (!book.subjects || book.subjects.length <= 1)) {
                        book.subjects = [...(book.subjects || []), ...data.subjects.slice(0, 8)];
                        if (currentModalBook && currentModalBook.key === book.key) {
                            renderModalSubjects(book);
                        }
                    }
                    if (currentModalBook && currentModalBook.key === book.key) {
                        modalDescription.textContent = desc;
                    }
                })
                .catch(() => {
                    const fallback = `Tác phẩm của tác giả ${book.author}${book.year ? ', xuất bản năm ' + book.year : ''}.`;
                    book.description = fallback;
                    if (currentModalBook && currentModalBook.key === book.key) {
                        modalDescription.textContent = fallback;
                    }
                });
        } else {
            modalDescription.textContent = 'Không có mô tả chi tiết.';
        }

        // Tự động kết nối Open Library để làm giàu thêm thông tin nếu chưa có (ví dụ: sách tuyển chọn)
        if (!book.isFromOpenLibrary && !book._enrichedFromOL) {
            book._enrichedFromOL = true;
            const olQuery = book.author ? `${book.title} ${book.author}` : book.title;
            fetch(`${OL_SEARCH_URL}?q=${encodeURIComponent(olQuery)}&fields=key,number_of_pages_median,subject,ratings_average,ratings_count,edition_count,publisher,isbn&limit=1`)
                .then(r => r.json())
                .then(d => {
                    if (d.docs && d.docs.length > 0) {
                        const doc = d.docs[0];
                        if (!book.workKey && doc.key) book.workKey = doc.key;
                        if (!book.pages && doc.number_of_pages_median) book.pages = doc.number_of_pages_median;
                        if (!book.rating && doc.ratings_average) {
                            book.rating = Number(doc.ratings_average).toFixed(1);
                            book.ratingCount = doc.ratings_count || 0;
                        }
                        if (!book.editionCount && doc.edition_count) book.editionCount = doc.edition_count;
                        if (!book.isbn && doc.isbn && doc.isbn[0]) book.isbn = doc.isbn[0];
                        if (doc.subject && Array.isArray(doc.subject)) {
                            const newSubs = doc.subject.slice(0, 6);
                            book.subjects = Array.from(new Set([...(book.subjects || []), ...newSubs]));
                        }
                        if (currentModalBook && currentModalBook.key === book.key) {
                            renderModalBadges(book);
                            renderModalSubjects(book);
                            renderModalLinks(book);
                        }
                    }
                })
                .catch(() => {});
        }

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
        recBooks.slice(0, 12).forEach(b => recommendationsGrid.appendChild(createBookCard(book)));
    }

    // =========================================
    // Search: Kết hợp kho tiếng Việt + Live Open Library API + Web Cover Fallback
    // =========================================
    async function performSearch(query) {
        const cleanQuery = query.trim();
        if (!cleanQuery) return;

        currentQuery = cleanQuery;
        const normalizedQuery = removeVietnameseAccents(cleanQuery);
        const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);

        // Hủy yêu cầu tìm kiếm cũ nếu người dùng gõ từ khóa mới
        if (searchAbortController) {
            searchAbortController.abort();
        }
        searchAbortController = new AbortController();

        searchResultsGrid.innerHTML = '';
        searchResultsSection.style.display = 'block';
        trendingSection.style.display = 'none';
        recommendationsSection.style.display = 'none';

        searchResultsTitle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Kết quả cho "${escapeHtml(cleanQuery)}"
        `;

        // 1. Tìm kiếm tức thì trong kho tuyển chọn (0ms)
        const matched = localBooks.filter(book => {
            if (cleanQuery.toLowerCase() === 'bestseller') return book.isTrending;
            const searchString = removeVietnameseAccents(
                `${book.title} ${book.author} ${book.category} ${book.year} ${book.description}`
            );
            return queryTerms.every(term => searchString.includes(term));
        });

        matched.forEach(book => searchResultsGrid.appendChild(createBookCard(book)));
        resultCount.textContent = `${matched.length} sách (đang kết nối Open Library...)`;

        searchResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // 2. Tự động gọi Open Library API trực tiếp để lấy thêm sách theo thời gian thực
        try {
            const olBooks = await searchOpenLibrary(cleanQuery, searchAbortController.signal);

            // Lọc trùng lặp tiêu đề với sách đã hiển thị
            const seenTitles = new Set(matched.map(b => removeVietnameseAccents(b.title)));
            let addedCount = 0;

            olBooks.forEach(b => {
                const normTitle = removeVietnameseAccents(b.title);
                if (!seenTitles.has(normTitle)) {
                    seenTitles.add(normTitle);
                    searchResultsGrid.appendChild(createBookCard(b));
                    addedCount++;
                }
            });

            const totalCount = matched.length + addedCount;
            resultCount.textContent = `${totalCount} sách`;

            if (totalCount === 0) {
                searchResultsGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
                        <p style="font-size: 1rem;">Không tìm thấy cuốn sách nào phù hợp trên hệ thống và Open Library.</p>
                    </div>
                `;
            }
        } catch {
            resultCount.textContent = `${matched.length} sách`;
        }
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
