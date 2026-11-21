const viewerStage = document.querySelector('.image-viewer-stage');
const viewerContent = document.querySelector('.image-viewer-content');
const viewerImage = document.querySelector('#viewer-image');
const viewerMessage = document.querySelector('#viewer-message');
const zoomIn = document.querySelector('#viewer-zoom-in');
const zoomOut = document.querySelector('#viewer-zoom-out');
const zoomLevel = document.querySelector('#viewer-zoom-level');
const fitButton = document.querySelector('#viewer-fit');
const params = new URLSearchParams(location.search);
const imagePath = params.get('image') || '';
const localImagePath = /^assets\/img\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|gif|avif)$/i;

if (localImagePath.test(imagePath)) {
    const title = params.get('title')?.trim().slice(0, 100) || '專案原圖';
    document.querySelector('#viewer-title').textContent = title;
    document.title = `${title}｜圖片檢視`;
    viewerImage.alt = title;
    showViewerMessage('正在載入圖片…');
    viewerImage.addEventListener('load', enableViewer, { once: true });
    viewerImage.addEventListener('error', () => {
        showViewerMessage('無法載入圖片，請回到專案頁重新開啟。');
    }, { once: true });
    viewerImage.src = imagePath;
} else {
    showViewerMessage('找不到圖片，請從專案頁開啟原圖。');
}

function showViewerMessage(text) {
    viewerMessage.hidden = false;
    viewerMessage.textContent = text;
}

function enableViewer() {
    const maxScale = 6;
    const zoomStep = 1.35;
    const pointers = new Map();
    let fitScale = 0;
    let scale = 0;

    viewerImage.hidden = false;
    viewerMessage.hidden = true;

    function setScale(requested, point) {
        const stageBox = viewerStage.getBoundingClientRect();
        const focus = point ?? { x: stageBox.left + stageBox.width / 2, y: stageBox.top + stageBox.height / 2 };
        const before = viewerImage.getBoundingClientRect();
        const xFraction = (focus.x - before.left) / before.width;
        const yFraction = (focus.y - before.top) / before.height;
        scale = Math.max(fitScale, Math.min(maxScale, requested));
        viewerImage.style.width = `${viewerImage.naturalWidth * scale}px`;
        viewerImage.style.height = `${viewerImage.naturalHeight * scale}px`;

        if (scale === fitScale) {
            viewerStage.scrollTo(0, 0);
        } else {
            const after = viewerImage.getBoundingClientRect();
            viewerStage.scrollBy(after.left + xFraction * after.width - focus.x, after.top + yFraction * after.height - focus.y);
        }
        zoomLevel.value = `${Math.max(1, Math.round(scale * 100))}%`;
        zoomIn.disabled = scale === maxScale;
        zoomOut.disabled = scale === fitScale;
        fitButton.disabled = scale === fitScale;
        viewerStage.classList.toggle('can-pan', scale > fitScale);
    }

    function updateFit() {
        const atFit = scale === fitScale;
        const padding = getComputedStyle(viewerContent);
        const width = viewerStage.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
        const height = viewerStage.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom);
        fitScale = Math.min(1, Math.max(1, width) / viewerImage.naturalWidth, Math.max(1, height) / viewerImage.naturalHeight);
        if (atFit || scale < fitScale) setScale(fitScale);
    }

    updateFit();
    new ResizeObserver(updateFit).observe(viewerStage);
    zoomIn.addEventListener('click', () => setScale(scale * zoomStep));
    zoomOut.addEventListener('click', () => setScale(scale / zoomStep));
    fitButton.addEventListener('click', () => setScale(fitScale));

    viewerStage.addEventListener('wheel', event => {
        if (!event.deltaY) return;
        event.preventDefault();
        const delta = event.deltaMode ? event.deltaY * 16 : event.deltaY;
        const factor = Math.exp(-0.002 * Math.max(-300, Math.min(300, delta)));
        setScale(scale * factor, { x: event.clientX, y: event.clientY });
    }, { passive: false });

    viewerStage.addEventListener('keydown', event => {
        const keyScales = { '+': scale * zoomStep, '=': scale * zoomStep, '-': scale / zoomStep, '0': fitScale };
        if (event.ctrlKey || event.metaKey || !Object.hasOwn(keyScales, event.key)) return;
        event.preventDefault();
        setScale(keyScales[event.key]);
    });

    viewerStage.addEventListener('pointerdown', event => {
        if (event.button !== 0 || pointers.size >= 2) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        viewerStage.setPointerCapture(event.pointerId);
        if (scale > fitScale) viewerStage.classList.add('is-panning');
    });

    viewerStage.addEventListener('pointermove', event => {
        const previous = pointers.get(event.pointerId);
        if (!previous) return;
        const next = { x: event.clientX, y: event.clientY };
        pointers.set(event.pointerId, next);
        const dx = previous.x - next.x;
        const dy = previous.y - next.y;
        if (pointers.size === 1) {
            viewerStage.scrollBy(dx, dy);
            return;
        }
        const other = [...pointers.values()].find(point => point !== next);
        const distance = Math.hypot(other.x - previous.x, other.y - previous.y);
        if (distance < 1) return;
        setScale(scale * Math.hypot(other.x - next.x, other.y - next.y) / distance, {
            x: (other.x + previous.x) / 2,
            y: (other.y + previous.y) / 2,
        });
        viewerStage.scrollBy(dx / 2, dy / 2);
    });

    viewerStage.addEventListener('lostpointercapture', event => {
        pointers.delete(event.pointerId);
        if (!pointers.size) viewerStage.classList.remove('is-panning');
    });
}
