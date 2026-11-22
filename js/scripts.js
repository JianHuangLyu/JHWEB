/*!
    * Start Bootstrap - SB Admin v7.0.7 (https://startbootstrap.com/template/sb-admin)
    * Copyright 2013-2023 Start Bootstrap
    * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-sb-admin/blob/master/LICENSE)
    */
const sidebarToggle = document.querySelector('#sidebarToggle');
const sidebar = document.querySelector('#layoutSidenav_nav');
const pageContent = document.querySelector('#layoutSidenav_content');
const scrim = document.querySelector('.nav-scrim');
const sidebarLinks = [...(sidebar?.querySelectorAll('.nav-link[href]:not([hidden])') ?? [])];

if (sidebarToggle && sidebar && pageContent && scrim && sidebarLinks.length) {
    setupNavigation();
}

setupViewTheme();
setupBackgroundVideo();

function setupBackgroundVideo() {
    const videos = new Map();
    for (const clip of document.querySelectorAll('.background-scene > video[data-background-src]')) {
        videos.set(clip.parentElement.dataset.background, clip);
        clip.muted = true;
    }
    const defaultVideo = [...videos.values()].find(clip => !clip.parentElement.hidden) ?? videos.values().next().value;
    if (!defaultVideo) return;

    const picker = document.querySelector('#portfolio-background');
    const toggle = document.querySelector('#background-toggle');
    const controls = document.querySelector('.background-controls');
    const preferenceKey = 'jianhuanglyu-portfolio-background';
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let video = defaultVideo;
    let enabled = !motion.matches;

    function updateToggle() {
        if (toggle) toggle.textContent = video.paused || video.error ? '播放背景' : '暫停背景';
    }

    function selectBackground(value) {
        const next = videos.get(value) ?? defaultVideo;
        if (next !== video) {
            video.pause();
            video.classList.remove('has-frame');
            if (video.hasAttribute('src')) {
                video.removeAttribute('src');
                video.load();
            }
            video.parentElement.hidden = true;
            video = next;
        }
        video.parentElement.hidden = false;
        if (picker) picker.value = video.parentElement.dataset.background;
        toggle?.setAttribute('aria-controls', video.id);
        updateToggle();
    }

    function syncPlayback() {
        if (!enabled || document.hidden) {
            video.pause();
            return;
        }
        if (!video.hasAttribute('src')) video.src = video.dataset.backgroundSrc;
        video.play().catch(updateToggle);
    }

    let saved = '';
    try { saved = localStorage.getItem(preferenceKey) || ''; }
    catch { /* The default background is available without storage. */ }
    selectBackground(saved);

    picker?.addEventListener('change', () => {
        selectBackground(picker.value);
        syncPlayback();
        try { localStorage.setItem(preferenceKey, picker.value); }
        catch { /* The chosen background applies for the current page. */ }
    });
    toggle?.addEventListener('click', () => {
        enabled = video.paused || Boolean(video.error);
        if (video.error) video.load();
        syncPlayback();
    });
    for (const clip of videos.values()) {
        clip.addEventListener('play', updateToggle);
        clip.addEventListener('pause', updateToggle);
        clip.addEventListener('playing', () => {
            if (clip === video && !clip.paused) clip.classList.add('has-frame');
        });
        clip.addEventListener('error', () => {
            clip.classList.remove('has-frame');
            updateToggle();
        });
    }
    document.addEventListener('visibilitychange', syncPlayback);
    motion.addEventListener('change', () => {
        enabled = !motion.matches;
        syncPlayback();
    });

    if (controls) {
        placeViewControl(controls);
        controls.hidden = false;
    }
    if (document.readyState === 'complete') syncPlayback();
    else window.addEventListener('load', syncPlayback, { once: true });
}

function setupViewTheme() {
    const picker = document.querySelector('#portfolio-view-theme');
    const preferenceKey = 'jianhuanglyu-portfolio-view-theme';
    const choices = new Set(picker
        ? Array.from(picker.options, option => option.value)
        : ['warm', 'sage', 'mist', 'rose', 'lavender', 'jade', 'amber', 'monochrome', 'indigo', 'apricot']);
    const root = document.documentElement;
    const browserColor = document.querySelector('meta[name="theme-color"]');

    function applyTheme(value) {
        const theme = choices.has(value) ? value : '';
        if (theme) root.dataset.viewTheme = theme;
        else delete root.dataset.viewTheme;
        if (picker) picker.value = theme;
        if (browserColor) browserColor.content = getComputedStyle(root).getPropertyValue('--canvas').trim();
    }

    let saved = '';
    try { saved = localStorage.getItem(preferenceKey) || ''; }
    catch { /* Theme selection still works when storage is unavailable. */ }
    applyTheme(saved);
    if (!picker) return;

    const control = picker.closest('.view-theme-control');
    if (control) placeViewControl(control);

    picker.addEventListener('change', () => {
        applyTheme(picker.value);
        try {
            if (picker.value) localStorage.setItem(preferenceKey, picker.value);
            else localStorage.removeItem(preferenceKey);
        } catch { /* Keep the chosen theme for the current page. */ }
    });
}

function placeViewControl(control) {
    const panel = control.closest('.sb-sidenav-footer');
    if (!panel) return;
    if (document.body.classList.contains('sidebar-ready')) {
        panel.hidden = false;
    } else {
        document.querySelector('.site-footer .portfolio-shell')?.append(control);
    }
}

function sectionFor(link) {
    const href = link.getAttribute('href');
    return href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
}

function setupNavigation() {
    const floatingMenu = window.matchMedia('(max-width: 1199.98px), (max-width: 1536px) and (any-pointer: coarse)');
    const navigation = sidebarLinks
        .map(link => ({ link, section: sectionFor(link) }))
        .filter(({ section }) => section && !section.hidden)
        .sort((a, b) => {
            if (a.section === b.section) return 0;
            return a.section.compareDocumentPosition(b.section) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });

    let currentLink = null;
    let scrollFrame = 0;
    for (const link of sidebarLinks) {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
    }

    function drawerIsOpen() {
        return sidebarToggle.getAttribute('aria-expanded') === 'true';
    }

    function setDrawer(open) {
        const expanded = open && floatingMenu.matches;
        document.body.classList.toggle('sb-sidenav-toggled', expanded);
        sidebarToggle.setAttribute('aria-expanded', String(expanded));
        sidebar.inert = floatingMenu.matches && !expanded;
        pageContent.inert = expanded;
        scrim.hidden = !expanded;

        if (expanded) {
            (currentLink || sidebarLinks[0]).focus();
        }
    }

    function dismissDrawer() {
        setDrawer(false);
        sidebarToggle.focus();
    }

    sidebarToggle.addEventListener('click', () => setDrawer(!drawerIsOpen()));
    scrim.addEventListener('click', dismissDrawer);
    floatingMenu.addEventListener('change', () => {
        const focusWasInSidebar = sidebar.contains(document.activeElement);
        setDrawer(false);
        if (floatingMenu.matches && focusWasInSidebar) {
            sidebarToggle.focus();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && drawerIsOpen()) {
            dismissDrawer();
        }
    });

    document.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (!link || !drawerIsOpen() || (!sidebar.contains(link) && !link.getAttribute('href').startsWith('#'))) return;
        setDrawer(false);
        const section = sectionFor(link);
        if (section) {
            if (!section.hasAttribute('tabindex')) section.tabIndex = -1;
            section.focus({ preventScroll: true });
        }
    });

    function syncNavigation() {
        scrollFrame = 0;
        const readingLine = Math.min(200, window.innerHeight * 0.35);
        let active = navigation[0]?.link;
        let activeTop = -Infinity;

        for (const { link, section } of navigation) {
            const top = section.getBoundingClientRect().top;
            if (top > readingLine) break;
            // 並排的區塊頂端同高：保留左側的區塊，除非網址的 # 指向右側區塊
            const besidePrevious = Math.abs(top - activeTop) < 1;
            if (!besidePrevious || link.hash === window.location.hash) active = link;
            activeTop = top;
        }

        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
            const anchor = navigation.find(({ link }) => link.hash === window.location.hash);
            const anchorTop = anchor?.section.getBoundingClientRect().top ?? -1;
            active = anchorTop >= 0 && anchorTop < window.innerHeight ? anchor.link : navigation.at(-1)?.link;
        }

        if (active && active !== currentLink) {
            currentLink?.classList.remove('active');
            currentLink?.removeAttribute('aria-current');
            active.classList.add('active');
            active.setAttribute('aria-current', 'location');
            currentLink = active;
        }
    }

    function scheduleNavigationSync() {
        if (!scrollFrame) {
            scrollFrame = window.requestAnimationFrame(syncNavigation);
        }
    }

    document.body.classList.add('sidebar-ready');
    sidebarToggle.hidden = false;
    setDrawer(false);
    window.addEventListener('scroll', scheduleNavigationSync, { passive: true });
    window.addEventListener('resize', scheduleNavigationSync);
    window.addEventListener('hashchange', scheduleNavigationSync);
    syncNavigation();
}
