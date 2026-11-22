const imageViewerDialog = document.querySelector('#project-image-viewer');
const imageViewerRoot = imageViewerDialog || document.querySelector('.image-viewer-page');
const imageViewer = imageViewerRoot && setupImageViewer(imageViewerRoot);

if (imageViewer && imageViewerDialog) {
    setupImageDialog(imageViewerDialog, imageViewer);
} else if (imageViewer) {
    const params = new URLSearchParams(location.search);
    const path = params.get('image') || '';
    const localImagePath = /^assets\/img\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|gif|avif)$/i;
    const title = params.get('title')?.trim().slice(0, 100) || '專案原圖';
    imageViewer.loadImage({ src: localImagePath.test(path) ? path : '', title });
    document.title = `${title}｜圖片檢視`;
}

function setupImageDialog(dialog, { loadImage, cancelLoad }) {
    let opener = null;
    let gallery = null;
    let scrollAtOpen;
    let pressedBackdrop = false;

    document.addEventListener('click', event => {
        const trigger = event.target.closest('button[data-viewer-src], button[data-viewer-gallery]');
        if (!trigger || dialog.open || dialog.contains(trigger)) return;
        opener = trigger;
        if (gallery) gallery.hidden = true;
        const requestedGallery = document.getElementById(trigger.dataset.viewerGallery || '');
        gallery = requestedGallery?.parentElement === dialog ? requestedGallery : null;
        if (gallery) gallery.hidden = false;
        scrollAtOpen = { left: window.scrollX, top: window.scrollY, behavior: 'instant' };
        pressedBackdrop = false;
        dialog.classList.toggle('has-scrollbar', window.innerWidth > document.documentElement.clientWidth);
        dialog.showModal();
        window.scrollTo(scrollAtOpen);
        if (gallery) gallery.scrollLeft = 0;
        const firstImage = gallery?.querySelector('button[data-viewer-src]:not([hidden]):not(:disabled)');
        showImage(firstImage || trigger);
    });

    function showImage(button) {
        if (gallery) {
            for (const thumbnail of gallery.querySelectorAll('button[data-viewer-src]')) {
                thumbnail.setAttribute('aria-pressed', String(thumbnail === button));
            }
        }
        loadImage({
            src: button.dataset.viewerSrc,
            title: button.dataset.viewerTitle,
            preview: button.dataset.viewerPreview,
            width: Number(button.dataset.viewerWidth),
            height: Number(button.dataset.viewerHeight),
        });
    }

    function isBackdrop(event) {
        if (event.target !== dialog) return false;
        const { left, right, top, bottom } = dialog.getBoundingClientRect();
        return event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom;
    }

    dialog.addEventListener('pointerdown', event => {
        pressedBackdrop = event.isPrimary && event.button === 0 && isBackdrop(event);
    });
    dialog.addEventListener('pointercancel', () => { pressedBackdrop = false; });
    dialog.addEventListener('click', event => {
        if (pressedBackdrop && isBackdrop(event)) dialog.close();
        pressedBackdrop = false;
        const thumbnail = event.target.closest('button[data-viewer-src]');
        if (thumbnail && gallery?.contains(thumbnail)) showImage(thumbnail);
    });
    dialog.querySelector('#viewer-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
        if (!opener || dialog.open) return;
        cancelLoad();
        if (gallery) gallery.hidden = true;
        gallery = null;
        opener.focus({ preventScroll: true });
        window.scrollTo(scrollAtOpen);
        opener = null;
    });
}

function setupImageViewer(viewer) {
    const viewerStage = viewer.querySelector('.image-viewer-stage');
    const viewerContent = viewer.querySelector('.image-viewer-content');
    let viewerImage = viewer.querySelector('#viewer-image');
    if (!viewerStage || !viewerContent || !viewerImage) return null;

    const viewerTitle = viewer.querySelector('#viewer-title');
    const viewerMessage = viewer.querySelector('#viewer-message');
    const zoomIn = viewer.querySelector('#viewer-zoom-in');
    const zoomOut = viewer.querySelector('#viewer-zoom-out');
    const zoomLevel = viewer.querySelector('#viewer-zoom-level');
    const fitButton = viewer.querySelector('#viewer-fit');
    const maxScale = 6;
    const zoomStep = 1.35;
    const pointers = new Map();
    let fitScale = 0;
    let scale = 0;
    let selection = null;
    let pendingImage = null;

    function showMessage(text) {
        if (!viewerMessage) return;
        viewerMessage.hidden = !text;
        viewerMessage.textContent = text;
    }

    function syncControls() {
        if (zoomLevel) zoomLevel.value = scale ? `${Math.max(1, Math.round(scale * 100))}%` : '—';
        if (zoomIn) zoomIn.disabled = !scale || scale === maxScale;
        if (zoomOut) zoomOut.disabled = scale === fitScale;
        if (fitButton) fitButton.disabled = scale === fitScale;
        viewerStage.classList.toggle('can-pan', scale > fitScale);
    }

    function setScale(requested, point) {
        const stageBox = viewerStage.getBoundingClientRect();
        const focus = point ?? { x: stageBox.left + stageBox.width / 2, y: stageBox.top + stageBox.height / 2 };
        const before = viewerImage.getBoundingClientRect();
        const xFraction = (focus.x - before.left) / before.width;
        const yFraction = (focus.y - before.top) / before.height;
        scale = Math.max(fitScale, Math.min(maxScale, requested));
        viewerImage.style.width = `${selection.width * scale}px`;
        viewerImage.style.height = `${selection.height * scale}px`;

        if (scale === fitScale) {
            viewerStage.scrollTo(0, 0);
        } else {
            const after = viewerImage.getBoundingClientRect();
            viewerStage.scrollBy(after.left + xFraction * after.width - focus.x, after.top + yFraction * after.height - focus.y);
        }
        syncControls();
    }

    function updateFit() {
        if (viewerImage.hidden || !viewerStage.clientWidth || !viewerStage.clientHeight) return;
        const atFit = scale === fitScale;
        const padding = getComputedStyle(viewerContent);
        const width = viewerStage.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
        const height = viewerStage.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom);
        fitScale = Math.min(1, Math.max(1, width) / selection.width, Math.max(1, height) / selection.height);
        if (atFit || scale < fitScale) setScale(fitScale);
    }

    function cancelLoad() {
        const previous = pendingImage;
        pendingImage = null;
        previous?.removeAttribute('src');
    }

    function requestImage(src, preview = false) {
        const image = viewerImage.cloneNode(false);
        image.removeAttribute('src');
        image.decoding = 'async';
        image.fetchPriority = 'high';
        pendingImage = image;

        image.addEventListener('load', () => {
            if (pendingImage !== image || image.currentSrc !== image.src) return;
            pendingImage = null;
            const firstImage = viewerImage.hidden;
            if (firstImage && !preview) {
                selection.width = image.naturalWidth;
                selection.height = image.naturalHeight;
            }
            image.style.width = viewerImage.style.width;
            image.style.height = viewerImage.style.height;
            image.hidden = false;
            viewerImage.replaceWith(image);
            viewerImage = image;
            showMessage('');
            if (firstImage) updateFit();
        }, { once: true });

        image.addEventListener('error', () => {
            if (pendingImage !== image) return;
            pendingImage = null;
            if (preview) {
                selection.originalRequested = true;
                requestImage(selection.src);
            } else if (viewerImage.hidden) {
                showMessage('無法載入圖片，請重新開啟原圖。');
            }
        }, { once: true });

        image.src = src;
    }

    function zoomTo(requested, point) {
        const previousScale = scale;
        setScale(requested, point);
        if (scale > previousScale && selection.preview && !selection.originalRequested) {
            selection.originalRequested = true;
            requestImage(selection.src);
        }
    }

    new ResizeObserver(updateFit).observe(viewerStage);
    zoomIn?.addEventListener('click', () => zoomTo(scale * zoomStep));
    zoomOut?.addEventListener('click', () => zoomTo(scale / zoomStep));
    fitButton?.addEventListener('click', () => setScale(fitScale));

    viewerStage.addEventListener('wheel', event => {
        if (!scale || !event.deltaY) return;
        event.preventDefault();
        const delta = event.deltaMode ? event.deltaY * 16 : event.deltaY;
        const factor = Math.exp(-0.002 * Math.max(-300, Math.min(300, delta)));
        zoomTo(scale * factor, { x: event.clientX, y: event.clientY });
    }, { passive: false });

    viewerStage.addEventListener('keydown', event => {
        const keyScales = { '+': scale * zoomStep, '=': scale * zoomStep, '-': scale / zoomStep, '0': fitScale };
        if (!scale || event.ctrlKey || event.metaKey || !Object.hasOwn(keyScales, event.key)) return;
        event.preventDefault();
        zoomTo(keyScales[event.key]);
    });

    viewerStage.addEventListener('pointerdown', event => {
        if (!scale || event.button !== 0 || pointers.size >= 2) return;
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
        zoomTo(scale * Math.hypot(other.x - next.x, other.y - next.y) / distance, {
            x: (other.x + previous.x) / 2,
            y: (other.y + previous.y) / 2,
        });
        viewerStage.scrollBy(dx / 2, dy / 2);
    });

    viewerStage.addEventListener('lostpointercapture', event => {
        pointers.delete(event.pointerId);
        if (!pointers.size) viewerStage.classList.remove('is-panning');
    });

    function loadImage({ src, title = '專案原圖', preview, width, height }) {
        cancelLoad();
        const hasPreview = preview && preview !== src && width > 0 && height > 0;
        selection = { src, preview: hasPreview, width, height, originalRequested: !hasPreview };
        const label = title.trim() || '專案原圖';
        if (viewerTitle) viewerTitle.textContent = label;
        viewerImage.alt = label;
        viewerImage.hidden = true;
        viewerImage.style.removeProperty('width');
        viewerImage.style.removeProperty('height');
        scale = 0;
        fitScale = 0;
        pointers.clear();
        viewerStage.classList.remove('is-panning');
        viewerStage.scrollTo(0, 0);
        syncControls();

        if (!src) {
            viewerImage.removeAttribute('src');
            showMessage('找不到圖片，請從專案頁開啟原圖。');
            return;
        }

        showMessage('正在載入圖片…');
        requestImage(hasPreview ? preview : src, Boolean(hasPreview));
    }

    return { loadImage, cancelLoad };
}
