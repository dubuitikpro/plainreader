/**
 * PlainReader — EPUB & PDF to Plain Text with Chapter Sidebar
 * Client-side only, no server needed.
 */

(function () {
    'use strict';

    // =========================================
    // DOM Elements
    // =========================================
    const uploadSection = document.getElementById('uploadSection');
    const readerSection = document.getElementById('readerSection');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const progressFill = document.getElementById('progressFill');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const readerContent = document.getElementById('readerContent');
    const headerActions = document.getElementById('headerActions');
    const fileNameEl = document.getElementById('fileName');
    const wordCountEl = document.getElementById('wordCount');
    const charCountEl = document.getElementById('charCount');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // Sidebar elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const chapterList = document.getElementById('chapterList');
    const chapterSearch = document.getElementById('chapterSearch');
    const visibleCountEl = document.getElementById('visibleCount');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const btnShowAll = document.getElementById('btnShowAll');
    const btnHideAll = document.getElementById('btnHideAll');

    // Buttons
    const btnFontDecrease = document.getElementById('btnFontDecrease');
    const btnFontIncrease = document.getElementById('btnFontIncrease');
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const btnNewFile = document.getElementById('btnNewFile');

    // State
    let currentFontSize = 18;
    const MIN_FONT_SIZE = 12;
    const MAX_FONT_SIZE = 32;
    let chapters = []; // { id, title, content, visible }

    // =========================================
    // PDF.js Worker Setup
    // =========================================
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // =========================================
    // Theme
    // =========================================
    function initTheme() {
        const saved = localStorage.getItem('plainreader-theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('plainreader-theme', next);
    }

    initTheme();

    // =========================================
    // Sidebar
    // =========================================
    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }

    function toggleSidebar() {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    btnToggleSidebar.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // =========================================
    // Chapter Management
    // =========================================
    function renderChapterList(filter) {
        chapterList.innerHTML = '';
        const query = (filter || '').toLowerCase();

        chapters.forEach((ch, index) => {
            if (query && !ch.title.toLowerCase().includes(query)) return;

            const li = document.createElement('li');
            li.className = 'chapter-item' + (ch.visible ? '' : ' hidden-chapter');
            li.dataset.index = index;

            // Eye toggle button
            const toggle = document.createElement('button');
            toggle.className = 'chapter-toggle' + (ch.visible ? '' : ' is-hidden');
            toggle.title = ch.visible ? 'Ẩn chương này' : 'Hiện chương này';
            toggle.innerHTML = ch.visible
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                ch.visible = !ch.visible;
                renderChapterList(chapterSearch.value);
                renderReaderContent();
                updateSidebarToggleIndicator();
            });

            // Chapter info
            const info = document.createElement('div');
            info.className = 'chapter-info';

            const num = document.createElement('div');
            num.className = 'chapter-number';
            num.textContent = 'Chương ' + (index + 1);

            const title = document.createElement('div');
            title.className = 'chapter-title';
            title.textContent = ch.title;
            title.title = ch.title;

            info.appendChild(num);
            info.appendChild(title);

            li.appendChild(toggle);
            li.appendChild(info);

            // Click to scroll to chapter
            li.addEventListener('click', () => {
                if (!ch.visible) {
                    ch.visible = true;
                    renderChapterList(chapterSearch.value);
                    renderReaderContent();
                    updateSidebarToggleIndicator();
                }
                // Scroll to the chapter block
                setTimeout(() => {
                    const block = document.getElementById('chapter-' + ch.id);
                    if (block) {
                        block.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
                // Close sidebar on mobile
                if (window.innerWidth < 768) {
                    closeSidebar();
                }
            });

            chapterList.appendChild(li);
        });

        updateVisibleCount();
    }

    function updateVisibleCount() {
        const visible = chapters.filter((c) => c.visible).length;
        visibleCountEl.textContent = visible + '/' + chapters.length + ' chương đang hiện';
    }

    function updateSidebarToggleIndicator() {
        const hiddenCount = chapters.filter((c) => !c.visible).length;
        if (hiddenCount > 0) {
            btnToggleSidebar.classList.add('has-hidden');
        } else {
            btnToggleSidebar.classList.remove('has-hidden');
        }
    }

    // Show all chapters
    btnShowAll.addEventListener('click', () => {
        chapters.forEach((c) => (c.visible = true));
        renderChapterList(chapterSearch.value);
        renderReaderContent();
        updateSidebarToggleIndicator();
    });

    // Hide all chapters
    btnHideAll.addEventListener('click', () => {
        chapters.forEach((c) => (c.visible = false));
        renderChapterList(chapterSearch.value);
        renderReaderContent();
        updateSidebarToggleIndicator();
    });

    // Search filter
    chapterSearch.addEventListener('input', () => {
        renderChapterList(chapterSearch.value);
    });

    // =========================================
    // Render Reader Content
    // =========================================
    function renderReaderContent() {
        readerContent.innerHTML = '';

        const visibleChapters = chapters.filter((c) => c.visible);

        if (visibleChapters.length === 0) {
            readerContent.innerHTML =
                '<div style="text-align:center; padding:60px 20px; color:var(--text-muted); font-family:var(--font-sans);">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="margin-bottom:16px; opacity:0.4;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' +
                '<p style="font-size:1rem; margin-bottom:8px;">Tất cả chương đã bị ẩn</p>' +
                '<p style="font-size:0.85rem;">Mở sidebar và nhấn vào biểu tượng 👁 để hiện chương</p>' +
                '</div>';
            updateStats('');
            return;
        }

        let allText = '';

        visibleChapters.forEach((ch) => {
            const block = document.createElement('div');
            block.className = 'chapter-block';
            block.id = 'chapter-' + ch.id;

            // Chapter header
            const header = document.createElement('div');
            header.className = 'chapter-block-header';

            const label = document.createElement('span');
            label.className = 'chapter-block-label';
            label.textContent = 'Chương ' + (chapters.indexOf(ch) + 1);

            const title = document.createElement('span');
            title.className = 'chapter-block-title';
            title.textContent = ch.title;

            header.appendChild(label);
            header.appendChild(title);
            block.appendChild(header);

            // Content
            const content = document.createTextNode(ch.content);
            block.appendChild(content);

            readerContent.appendChild(block);
            allText += ch.content + '\n\n';
        });

        updateStats(allText);
    }

    function updateStats(text) {
        const chars = text.trim().length;
        const words = text
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0).length;

        charCountEl.textContent = chars.toLocaleString('vi-VN') + ' ký tự';
        wordCountEl.textContent = words.toLocaleString('vi-VN') + ' từ';
    }

    // =========================================
    // File Input & Drag/Drop
    // =========================================
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // =========================================
    // File Handler
    // =========================================
    async function handleFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext !== 'epub' && ext !== 'pdf') {
            alert('Chỉ hỗ trợ file EPUB hoặc PDF.');
            return;
        }

        showLoading('Đang đọc file...');
        setProgress(10);

        try {
            chapters = [];

            if (ext === 'epub') {
                chapters = await parseEpub(file);
            } else if (ext === 'pdf') {
                chapters = await parsePdf(file);
            }

            setProgress(90);
            loadingText.textContent = 'Đang hiển thị văn bản...';

            await sleep(200);

            fileNameEl.textContent = file.name;
            renderChapterList('');
            renderReaderContent();
            updateSidebarToggleIndicator();

            setProgress(100);
            await sleep(300);
            hideLoading();
            showReader();
        } catch (err) {
            hideLoading();
            console.error('Error processing file:', err);
            alert('Lỗi khi xử lý file: ' + err.message);
        }
    }

    // =========================================
    // EPUB Parser
    // =========================================
    async function parseEpub(file) {
        loadingText.textContent = 'Đang giải nén EPUB...';
        setProgress(20);

        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        setProgress(30);
        loadingText.textContent = 'Đang tìm nội dung...';

        // Read container.xml to find the OPF file
        let opfPath = '';
        const containerFile = zip.file('META-INF/container.xml');

        if (containerFile) {
            const containerXml = await containerFile.async('string');
            const parser = new DOMParser();
            const containerDoc = parser.parseFromString(containerXml, 'application/xml');
            const rootfile = containerDoc.querySelector('rootfile');
            if (rootfile) {
                opfPath = rootfile.getAttribute('full-path');
            }
        }

        // Parse OPF to get spine order and TOC
        let contentFiles = [];
        let tocTitles = {};

        if (opfPath) {
            const opfFile = zip.file(opfPath);
            if (opfFile) {
                const opfXml = await opfFile.async('string');
                const parser = new DOMParser();
                const opfDoc = parser.parseFromString(opfXml, 'application/xml');

                const opfDir = opfPath.includes('/')
                    ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
                    : '';

                // Build manifest map
                const manifest = {};
                const manifestItems = opfDoc.querySelectorAll('manifest item');
                manifestItems.forEach((item) => {
                    const id = item.getAttribute('id');
                    const href = item.getAttribute('href');
                    const mediaType = item.getAttribute('media-type');
                    manifest[id] = { href, mediaType };
                });

                // Try to find and parse TOC (NCX or NAV)
                tocTitles = await parseToc(zip, opfDoc, manifest, opfDir);

                // Read spine order
                const spineItems = opfDoc.querySelectorAll('spine itemref');
                spineItems.forEach((itemref) => {
                    const idref = itemref.getAttribute('idref');
                    if (manifest[idref]) {
                        const entry = manifest[idref];
                        if (
                            entry.mediaType === 'application/xhtml+xml' ||
                            entry.mediaType === 'text/html'
                        ) {
                            contentFiles.push({
                                path: opfDir + entry.href,
                                href: entry.href,
                            });
                        }
                    }
                });
            }
        }

        // Fallback: find all html/xhtml files
        if (contentFiles.length === 0) {
            zip.forEach((relativePath, zipEntry) => {
                if (
                    !zipEntry.dir &&
                    (relativePath.endsWith('.xhtml') ||
                        relativePath.endsWith('.html') ||
                        relativePath.endsWith('.htm'))
                ) {
                    contentFiles.push({ path: relativePath, href: relativePath });
                }
            });
            contentFiles.sort((a, b) => a.path.localeCompare(b.path));
        }

        setProgress(50);
        loadingText.textContent = 'Đang trích xuất văn bản...';

        // Extract text from each file as a chapter
        const result = [];
        const total = contentFiles.length;

        for (let i = 0; i < contentFiles.length; i++) {
            const fileEntry = contentFiles[i];
            const contentFile = zip.file(fileEntry.path);

            if (contentFile) {
                const html = await contentFile.async('string');
                const text = htmlToText(html);
                const trimmed = text.trim();

                if (trimmed) {
                    // Try to find title from TOC, or extract from HTML heading, or use filename
                    let title =
                        tocTitles[fileEntry.href] ||
                        extractTitleFromHtml(html) ||
                        fileEntry.href.replace(/^.*\//, '').replace(/\.\w+$/, '');

                    result.push({
                        id: 'ch-' + i,
                        title: title,
                        content: trimmed,
                        visible: true,
                    });
                }
            }

            setProgress(50 + Math.round((i / total) * 35));
        }

        return result;
    }

    /**
     * Try to parse the TOC (NCX or EPUB3 NAV) to get chapter titles
     */
    async function parseToc(zip, opfDoc, manifest, opfDir) {
        const titles = {};

        // Try NCX (EPUB2)
        const spineEl = opfDoc.querySelector('spine');
        const tocId = spineEl ? spineEl.getAttribute('toc') : null;

        if (tocId && manifest[tocId]) {
            const ncxPath = opfDir + manifest[tocId].href;
            const ncxFile = zip.file(ncxPath);
            if (ncxFile) {
                const ncxXml = await ncxFile.async('string');
                const parser = new DOMParser();
                const ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
                const navPoints = ncxDoc.querySelectorAll('navPoint');
                navPoints.forEach((np) => {
                    const label = np.querySelector('navLabel text');
                    const content = np.querySelector('content');
                    if (label && content) {
                        let src = content.getAttribute('src');
                        // Remove fragment
                        src = src.split('#')[0];
                        titles[src] = label.textContent.trim();
                    }
                });
            }
        }

        // Try NAV (EPUB3)
        for (const [id, entry] of Object.entries(manifest)) {
            if (entry.mediaType === 'application/xhtml+xml') {
                const props = opfDoc.querySelector('manifest item[id="' + id + '"]');
                if (props && props.getAttribute('properties') === 'nav') {
                    const navPath = opfDir + entry.href;
                    const navFile = zip.file(navPath);
                    if (navFile) {
                        const navHtml = await navFile.async('string');
                        const parser = new DOMParser();
                        const navDoc = parser.parseFromString(navHtml, 'text/html');
                        const links = navDoc.querySelectorAll('nav a, nav[epub\\:type="toc"] a');
                        links.forEach((a) => {
                            let href = a.getAttribute('href');
                            if (href) {
                                href = href.split('#')[0];
                                const text = a.textContent.trim();
                                if (text && !titles[href]) {
                                    titles[href] = text;
                                }
                            }
                        });
                    }
                }
            }
        }

        return titles;
    }

    /**
     * Extract first heading from HTML as title
     */
    function extractTitleFromHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const heading =
            doc.querySelector('h1') ||
            doc.querySelector('h2') ||
            doc.querySelector('h3') ||
            doc.querySelector('title');

        if (heading) {
            const text = heading.textContent.trim();
            if (text && text.length < 200) return text;
        }
        return null;
    }

    /**
     * Convert HTML string to plain text
     */
    function htmlToText(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        doc.querySelectorAll('script, style, link, meta').forEach((el) => el.remove());
        return extractText(doc.body);
    }

    function extractText(node) {
        if (!node) return '';

        const blocks = [
            'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
            'LI', 'TR', 'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE',
            'HEADER', 'FOOTER', 'ASIDE', 'FIGCAPTION',
        ];

        let result = '';

        for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                result += child.textContent;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tag = child.tagName;
                if (tag === 'BR') {
                    result += '\n';
                } else if (blocks.includes(tag)) {
                    const inner = extractText(child).trim();
                    if (inner) {
                        result += '\n\n' + inner + '\n\n';
                    }
                } else {
                    result += extractText(child);
                }
            }
        }

        return result;
    }

    // =========================================
    // PDF Parser
    // =========================================
    async function parsePdf(file) {
        loadingText.textContent = 'Đang tải PDF...';
        setProgress(20);

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        // Try to get PDF outline (bookmarks) for chapter detection
        let outline = [];
        try {
            outline = await pdf.getOutline();
        } catch (e) {
            outline = null;
        }

        loadingText.textContent = 'Đang trích xuất văn bản...';
        setProgress(30);

        // Extract all pages text
        const pageTexts = [];
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();

            const lines = {};
            content.items.forEach((item) => {
                const y = Math.round(item.transform[5]);
                if (!lines[y]) lines[y] = [];
                lines[y].push({ text: item.str, x: item.transform[4] });
            });

            const sortedYKeys = Object.keys(lines)
                .map(Number)
                .sort((a, b) => b - a);

            const pageLines = [];
            for (const y of sortedYKeys) {
                const lineItems = lines[y].sort((a, b) => a.x - b.x);
                const lineText = lineItems.map((item) => item.text).join(' ');
                if (lineText.trim()) {
                    pageLines.push(lineText.trim());
                }
            }

            pageTexts.push(pageLines.join('\n'));

            loadingText.textContent = `Đang trích xuất (${i}/${numPages} trang)...`;
            setProgress(30 + Math.round((i / numPages) * 55));
        }

        // If PDF has outline, use it for chapters
        if (outline && outline.length > 0) {
            return await buildChaptersFromOutline(pdf, outline, pageTexts);
        }

        // Fallback: group pages (every 10 pages or treat each page as a section)
        const result = [];
        const pagesPerChapter = numPages <= 20 ? 1 : Math.ceil(numPages / Math.ceil(numPages / 10));

        for (let i = 0; i < numPages; i += pagesPerChapter) {
            const end = Math.min(i + pagesPerChapter, numPages);
            const chapterPages = pageTexts.slice(i, end);
            const content = chapterPages.join('\n\n').trim();

            if (content) {
                const startPage = i + 1;
                const endPage = end;
                const title =
                    startPage === endPage
                        ? 'Trang ' + startPage
                        : 'Trang ' + startPage + ' – ' + endPage;

                result.push({
                    id: 'pdf-' + i,
                    title: title,
                    content: content,
                    visible: true,
                });
            }
        }

        return result;
    }

    /**
     * Build chapters from PDF outline/bookmarks
     */
    async function buildChaptersFromOutline(pdf, outline, pageTexts) {
        // Get page numbers for each outline item
        const chapterDefs = [];

        for (const item of outline) {
            let pageNum = 0;
            try {
                if (item.dest) {
                    let dest = item.dest;
                    if (typeof dest === 'string') {
                        dest = await pdf.getDestination(dest);
                    }
                    if (dest && dest[0]) {
                        const pageIndex = await pdf.getPageIndex(dest[0]);
                        pageNum = pageIndex;
                    }
                }
            } catch (e) {
                // ignore
            }
            chapterDefs.push({ title: item.title, startPage: pageNum });
        }

        // Sort by page number
        chapterDefs.sort((a, b) => a.startPage - b.startPage);

        // Build chapters with page ranges
        const result = [];
        for (let i = 0; i < chapterDefs.length; i++) {
            const start = chapterDefs[i].startPage;
            const end = i + 1 < chapterDefs.length ? chapterDefs[i + 1].startPage : pageTexts.length;
            const content = pageTexts.slice(start, end).join('\n\n').trim();

            if (content) {
                result.push({
                    id: 'pdf-ch-' + i,
                    title: chapterDefs[i].title || 'Phần ' + (i + 1),
                    content: content,
                    visible: true,
                });
            }
        }

        return result;
    }

    // =========================================
    // Display
    // =========================================
    function showReader() {
        uploadSection.style.display = 'none';
        readerSection.style.display = 'block';
        headerActions.style.display = 'flex';
        btnToggleSidebar.style.display = 'flex';
        window.scrollTo(0, 0);
    }

    function showUpload() {
        readerSection.style.display = 'none';
        uploadSection.style.display = 'flex';
        headerActions.style.display = 'none';
        btnToggleSidebar.style.display = 'none';
        closeSidebar();
        readerContent.innerHTML = '';
        chapterList.innerHTML = '';
        chapters = [];
        fileInput.value = '';
    }

    // =========================================
    // Loading
    // =========================================
    function showLoading(msg) {
        loadingText.textContent = msg || 'Đang xử lý...';
        progressFill.style.width = '0%';
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    function setProgress(percent) {
        progressFill.style.width = Math.min(100, percent) + '%';
    }

    // =========================================
    // Font Size
    // =========================================
    function updateFontSize(delta) {
        currentFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, currentFontSize + delta));
        document.documentElement.style.setProperty('--reader-font-size', currentFontSize + 'px');
        fontSizeDisplay.textContent = currentFontSize + 'px';
        localStorage.setItem('plainreader-fontsize', currentFontSize);
    }

    function initFontSize() {
        const saved = localStorage.getItem('plainreader-fontsize');
        if (saved) {
            currentFontSize = parseInt(saved, 10);
            document.documentElement.style.setProperty('--reader-font-size', currentFontSize + 'px');
            fontSizeDisplay.textContent = currentFontSize + 'px';
        }
    }

    initFontSize();

    // =========================================
    // Scroll to top
    // =========================================
    window.addEventListener('scroll', () => {
        if (window.scrollY > 600) {
            scrollTopBtn.style.display = 'flex';
        } else {
            scrollTopBtn.style.display = 'none';
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // =========================================
    // Event Listeners
    // =========================================
    btnFontDecrease.addEventListener('click', () => updateFontSize(-2));
    btnFontIncrease.addEventListener('click', () => updateFontSize(2));
    btnThemeToggle.addEventListener('click', toggleTheme);
    btnNewFile.addEventListener('click', showUpload);

    // Keyboard shortcut: Escape to close sidebar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // =========================================
    // Music Player (Web Audio API — Ambient Mode)
    // =========================================
    // Using Web Audio API (AudioContext + GainNode) instead of plain
    // <audio>.volume so that iOS/Safari treats our audio as "ambient"
    // and does NOT pause it when the user activates "Nghe trang"
    // (Speak Page). The AudioContext graph mixes with system audio
    // rather than claiming an exclusive media session.
    // =========================================

    const audioPlayer = document.getElementById('audioPlayer');
    const musicFileInput = document.getElementById('musicFileInput');
    const btnMusicUpload = document.getElementById('btnMusicUpload');
    const musicControls = document.getElementById('musicControls');
    const btnPlayPause = document.getElementById('btnPlayPause');
    const iconPlay = document.getElementById('iconPlay');
    const iconPause = document.getElementById('iconPause');
    const musicTrackName = document.getElementById('musicTrackName');
    const musicTime = document.getElementById('musicTime');
    const musicProgress = document.getElementById('musicProgress');
    const musicProgressFill = document.getElementById('musicProgressFill');
    const btnMute = document.getElementById('btnMute');
    const iconVolumeOn = document.getElementById('iconVolumeOn');
    const iconVolumeOff = document.getElementById('iconVolumeOff');
    const volumeSlider = document.getElementById('volumeSlider');
    const btnChangeTrack = document.getElementById('btnChangeTrack');
    const btnCloseMusic = document.getElementById('btnCloseMusic');
    const musicVisualizer = document.getElementById('musicVisualizer');

    let musicObjectUrl = null;
    let savedVolume = 0.5;

    // --- Web Audio API nodes ---
    let audioCtx = null;
    let sourceNode = null;
    let gainNode = null;
    let audioCtxInitialized = false;

    /**
     * Initialize the Web Audio API graph once.
     * Must be called from a user gesture (click/touch) on iOS.
     */
    function initAudioContext() {
        if (audioCtxInitialized) return;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return; // fallback: plain audio will still work

        audioCtx = new AudioCtx();

        // Create source from <audio> element
        sourceNode = audioCtx.createMediaElementSource(audioPlayer);

        // GainNode for volume control (replaces audio.volume)
        gainNode = audioCtx.createGain();
        gainNode.gain.value = savedVolume;

        // Connect: source → gain → destination (speakers)
        sourceNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        audioCtxInitialized = true;

        // On iOS, AudioContext starts in "suspended" state.
        // Resume it on user interaction.
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    /**
     * Set volume via GainNode (Web Audio API) with fallback
     */
    function setVolume(vol) {
        if (gainNode) {
            gainNode.gain.value = vol;
        } else {
            // Fallback if Web Audio API not available
            audioPlayer.volume = vol;
        }
    }

    /**
     * Get current effective volume
     */
    function getVolume() {
        if (gainNode) {
            return gainNode.gain.value;
        }
        return audioPlayer.volume;
    }

    // Init volume from localStorage
    (function initVolume() {
        const saved = localStorage.getItem('plainreader-volume');
        if (saved !== null) {
            savedVolume = parseFloat(saved);
            volumeSlider.value = Math.round(savedVolume * 100);
        }
        // Set audio element volume to 1.0 — GainNode controls actual volume
        audioPlayer.volume = 1.0;
    })();

    // Upload music
    btnMusicUpload.addEventListener('click', () => {
        initAudioContext(); // Must init from user gesture
        musicFileInput.click();
    });
    btnChangeTrack.addEventListener('click', () => {
        initAudioContext();
        musicFileInput.click();
    });

    musicFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadAudioFile(e.target.files[0]);
        }
    });

    function loadAudioFile(file) {
        // Ensure AudioContext is initialized
        initAudioContext();

        // Resume AudioContext if suspended (iOS requirement)
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // Revoke previous URL
        if (musicObjectUrl) {
            URL.revokeObjectURL(musicObjectUrl);
        }

        musicObjectUrl = URL.createObjectURL(file);
        audioPlayer.src = musicObjectUrl;

        // Volume is controlled by GainNode, so keep element at 1.0
        audioPlayer.volume = 1.0;
        setVolume(savedVolume);

        // Display track name (remove extension)
        const name = file.name.replace(/\.[^/.]+$/, '');
        musicTrackName.textContent = name;
        musicTrackName.title = name;

        // Show controls, hide upload button
        btnMusicUpload.style.display = 'none';
        musicControls.style.display = 'flex';

        // Auto-play
        audioPlayer.play().then(() => {
            updatePlayPauseUI(true);
        }).catch(() => {
            updatePlayPauseUI(false);
        });
    }

    // Play / Pause
    btnPlayPause.addEventListener('click', () => {
        // Resume AudioContext on user gesture (iOS)
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (audioPlayer.paused) {
            audioPlayer.play();
            updatePlayPauseUI(true);
        } else {
            audioPlayer.pause();
            updatePlayPauseUI(false);
        }
    });

    function updatePlayPauseUI(playing) {
        if (playing) {
            iconPlay.style.display = 'none';
            iconPause.style.display = 'block';
            musicVisualizer.classList.add('playing');
        } else {
            iconPlay.style.display = 'block';
            iconPause.style.display = 'none';
            musicVisualizer.classList.remove('playing');
        }
    }

    audioPlayer.addEventListener('play', () => updatePlayPauseUI(true));
    audioPlayer.addEventListener('pause', () => updatePlayPauseUI(false));

    // Time update
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            musicProgressFill.style.width = pct + '%';
            musicTime.textContent = formatTime(audioPlayer.currentTime) + ' / ' + formatTime(audioPlayer.duration);
        }
    });

    function formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // Seek via progress bar click
    musicProgress.addEventListener('click', (e) => {
        if (audioPlayer.duration) {
            const rect = musicProgress.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            audioPlayer.currentTime = pct * audioPlayer.duration;
        }
    });

    // Volume (via GainNode)
    volumeSlider.addEventListener('input', () => {
        const vol = volumeSlider.value / 100;
        setVolume(vol);
        savedVolume = vol;
        localStorage.setItem('plainreader-volume', vol);
        updateVolumeIcon(vol > 0);
    });

    // Mute
    btnMute.addEventListener('click', () => {
        const currentVol = getVolume();
        if (currentVol > 0) {
            savedVolume = currentVol;
            setVolume(0);
            volumeSlider.value = 0;
            updateVolumeIcon(false);
        } else {
            const restoreVol = savedVolume || 0.5;
            setVolume(restoreVol);
            volumeSlider.value = Math.round(restoreVol * 100);
            updateVolumeIcon(true);
        }
    });

    function updateVolumeIcon(on) {
        if (on) {
            iconVolumeOn.style.display = 'block';
            iconVolumeOff.style.display = 'none';
        } else {
            iconVolumeOn.style.display = 'none';
            iconVolumeOff.style.display = 'block';
        }
    }

    // Close music
    btnCloseMusic.addEventListener('click', () => {
        audioPlayer.pause();
        audioPlayer.src = '';
        if (musicObjectUrl) {
            URL.revokeObjectURL(musicObjectUrl);
            musicObjectUrl = null;
        }
        musicControls.style.display = 'none';
        btnMusicUpload.style.display = 'flex';
        musicProgressFill.style.width = '0%';
        musicTime.textContent = '0:00';
        musicVisualizer.classList.remove('playing');
        musicFileInput.value = '';
    });

    // =========================================
    // Utility
    // =========================================
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
})();


