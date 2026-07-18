document.addEventListener('DOMContentLoaded', () => {
    const dropOverlay = document.getElementById('drop-overlay');
    const welcomeScreen = document.getElementById('welcome-screen');
    const viewerContainer = document.getElementById('viewer-container');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const closeBtn = document.getElementById('close-btn');
    const contentFrame = document.getElementById('content-frame');
    const filenameDisplay = document.getElementById('filename');

    let currentObjectURL = null;

    // --- i18n Initialization ---
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const msg = browser.i18n.getMessage(el.getAttribute('data-i18n'));
        if (msg) el.textContent = msg;
    });

    document.title = browser.i18n.getMessage('extensionName') || "MHT Viewer";

    // --- Drag and Drop Handling ---
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        dropOverlay.classList.remove('hidden');
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            dropOverlay.classList.add('hidden');
        }
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        dropOverlay.classList.add('hidden');

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // --- Button Handling ---
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    closeBtn.addEventListener('click', () => {
        closeViewer();
    });

    // --- File Processing ---
    function handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.mht') && !file.name.toLowerCase().endsWith('.mhtml')) {
            alert(browser.i18n.getMessage('invalidFileErr'));
            return;
        }

        filenameDisplay.textContent = browser.i18n.getMessage('loadingMsg', file.name) || ('Loading ' + file.name + '...');
        welcomeScreen.classList.add('hidden');
        viewerContainer.classList.remove('hidden');

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsedHtml = MHTParser.parse(e.target.result);
                renderHtml(parsedHtml);
                filenameDisplay.textContent = file.name;
            } catch (error) {
                console.error("Error parsing MHT:", error);
                alert(browser.i18n.getMessage('parseErr'));
                closeViewer();
            }
        };
        reader.onerror = () => {
            alert(browser.i18n.getMessage('readErr'));
            closeViewer();
        };
        // Read as array buffer to handle charsets correctly in the parser
        reader.readAsArrayBuffer(file);
    }

    function renderHtml(htmlContent) {
        if (currentObjectURL) {
            URL.revokeObjectURL(currentObjectURL);
        }
        
        const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
        currentObjectURL = URL.createObjectURL(blob);
        
        contentFrame.src = currentObjectURL;
    }

    function closeViewer() {
        if (currentObjectURL) {
            URL.revokeObjectURL(currentObjectURL);
            currentObjectURL = null;
        }
        contentFrame.src = 'about:blank';
        fileInput.value = '';
        viewerContainer.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
    }
});
