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
setupBackground();
setupVisitorCount();

function setupVisitorCount() {
    const output = document.querySelector('[data-visitor-count]');
    const tracker = document.querySelector('script[data-goatcounter]')?.dataset.goatcounter;
    if (!output || !tracker) return;

    // GoatCounter 全站累計（站點設定需開啟 Allow adding visitor counts）；伺服器端最多快取 4 小時
    const endpoint = tracker.replace(/\/count$/, '/counter/TOTAL.json');
    fetch(endpoint)
        .then(response => response.ok ? response.json() : Promise.reject(new Error(response.status)))
        .then(({ count }) => {
            // count 是依站點設定加了千分位的字串（例如 "1,234" 或 "1 234"）
            const total = Number(String(count ?? '').replace(/\D/g, ''));
            if (!total) return;
            output.textContent = total.toLocaleString('zh-TW');
            output.closest('.visitor-count').hidden = false;
        })
        .catch(() => { /* 被廣告攔截或尚未開放計數時，頁尾只顯示版權。 */ });
}

function setupBackground() {
    const backdrop = document.querySelector('.site-background');
    const scenes = new Map();
    for (const scene of document.querySelectorAll('.background-scene[data-background]')) {
        scenes.set(scene.dataset.background, scene);
    }
    const defaultScene = [...scenes.values()].find(scene => !scene.hidden) ?? scenes.values().next().value;
    if (!defaultScene) return;

    const picker = document.querySelector('#portfolio-background');
    const controls = document.querySelector('.background-controls');
    const preferenceKey = 'jianhuanglyu-portfolio-background';

    function selectBackground(value) {
        // 「無」：隱藏整個背景，頁面改回不透明的卡片樣式；已移除的舊選項（森林、海灘）改用預設場景
        const next = value === 'none' ? null : scenes.get(value) ?? defaultScene;
        for (const scene of scenes.values()) scene.hidden = scene !== next;
        if (backdrop) backdrop.hidden = !next;
        if (picker) picker.value = next ? next.dataset.background : 'none';
    }

    let saved = '';
    try { saved = localStorage.getItem(preferenceKey) || ''; }
    catch { /* The default background is available without storage. */ }
    selectBackground(saved);

    picker?.addEventListener('change', () => {
        selectBackground(picker.value);
        try { localStorage.setItem(preferenceKey, picker.value); }
        catch { /* The chosen background applies for the current page. */ }
    });

    if (controls) {
        placeViewControl(controls);
        controls.hidden = false;
    }
}

function setupViewTheme() {
    const picker = document.querySelector('#portfolio-view-theme');
    const preferenceKey = 'jianhuanglyu-portfolio-view-theme';
    // 只提供玄素與霧藍，預設玄素；舊偏好若是已移除的配色，改回預設
    const defaultTheme = 'monochrome';
    const choices = new Set(picker
        ? Array.from(picker.options, option => option.value)
        : [defaultTheme, 'mist']);
    const root = document.documentElement;
    const browserColor = document.querySelector('meta[name="theme-color"]');

    function applyTheme(value) {
        const theme = choices.has(value) ? value : defaultTheme;
        root.dataset.viewTheme = theme;
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
        try { localStorage.setItem(preferenceKey, picker.value); }
        catch { /* Keep the chosen theme for the current page. */ }
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
