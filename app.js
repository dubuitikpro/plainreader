/**
 * PlainReader — EPUB & PDF to Plain Text
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
    const fileName = document.getElementById('fileName');
    const wordCount = document.getElementById('wordCount');
    const charCount = document.getElementById('charCount');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // Buttons
    const btnFontDecrease = document.getElementById('btnFontDecrease');
    const btnFontIncrease = document.getElementById('btnFontIncrease');
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const btnNewFile = document.getElementById('btnNewFile');

    // State
    let currentFontSize = 18;
    const MIN_FONT_SIZE = 12;
    const MAX_FONT_SIZE = 32;

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
            let text = '';

            if (ext === 'epub') {
                text = await parseEpub(file);
            } else if (ext === 'pdf') {
                text = await parsePdf(file);
            }

            setProgress(90);
            loadingText.textContent = 'Đang hiển thị văn bản...';

            // Small delay for smooth transition
            await sleep(200);

            displayText(text, file.name);
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

        // Parse OPF to get spine order
        let contentFiles = [];

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
                            contentFiles.push(opfDir + entry.href);
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
                    contentFiles.push(relativePath);
                }
            });
            contentFiles.sort();
        }

        setProgress(50);
        loadingText.textContent = 'Đang trích xuất văn bản...';

        // Extract text from each file
        const textParts = [];
        const total = contentFiles.length;

        for (let i = 0; i < contentFiles.length; i++) {
            const filePath = contentFiles[i];
            const contentFile = zip.file(filePath);

            if (contentFile) {
                const html = await contentFile.async('string');
                const text = htmlToText(html);
                if (text.trim()) {
                    textParts.push(text.trim());
                }
            }

            setProgress(50 + Math.round((i / total) * 35));
        }

        return textParts.join('\n\n');
    }

    /**
     * Convert HTML string to plain text
     */
    function htmlToText(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove script and style elements
        doc.querySelectorAll('script, style, link, meta').forEach((el) => el.remove());

        // Walk through body and extract text
        return extractText(doc.body);
    }

    function extractText(node) {
        if (!node) return '';

        const blocks = [
            'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
            'LI', 'TR', 'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE',
            'HEADER', 'FOOTER', 'ASIDE', 'FIGCAPTION'
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

        loadingText.textContent = `Đang trích xuất văn bản (0/${numPages} trang)...`;
        setProgress(30);

        const textParts = [];

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();

            // Group text items into lines by Y position
            const lines = {};
            content.items.forEach((item) => {
                // Round Y to group items on the same line
                const y = Math.round(item.transform[5]);
                if (!lines[y]) {
                    lines[y] = [];
                }
                lines[y].push({
                    text: item.str,
                    x: item.transform[4],
                });
            });

            // Sort by Y (descending, since PDF Y is bottom-up) and then by X
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

            if (pageLines.length > 0) {
                textParts.push(pageLines.join('\n'));
            }

            loadingText.textContent = `Đang trích xuất văn bản (${i}/${numPages} trang)...`;
            setProgress(30 + Math.round((i / numPages) * 55));
        }

        return textParts.join('\n\n');
    }

    // =========================================
    // Display
    // =========================================
    function displayText(text, name) {
        // Clean up text: normalize whitespace
        text = text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        readerContent.textContent = text;
        fileName.textContent = name;

        // Stats
        const chars = text.length;
        const words = text
            .split(/\s+/)
            .filter((w) => w.length > 0).length;

        charCount.textContent = chars.toLocaleString('vi-VN') + ' ký tự';
        wordCount.textContent = words.toLocaleString('vi-VN') + ' từ';
    }

    function showReader() {
        uploadSection.style.display = 'none';
        readerSection.style.display = 'block';
        headerActions.style.display = 'flex';
        window.scrollTo(0, 0);
    }

    function showUpload() {
        readerSection.style.display = 'none';
        uploadSection.style.display = 'flex';
        headerActions.style.display = 'none';
        readerContent.textContent = '';
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

    // =========================================
    // Utility
    // =========================================
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
})();
