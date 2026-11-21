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

function sectionFor(link) {
    const href = link.getAttribute('href');
    return href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
}

function setupNavigation() {
    const desktop = window.matchMedia('(min-width: 992px)');
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
        const expanded = open && !desktop.matches;
        document.body.classList.toggle('sb-sidenav-toggled', expanded);
        sidebarToggle.setAttribute('aria-expanded', String(expanded));
        sidebar.inert = !desktop.matches && !expanded;
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
    desktop.addEventListener('change', () => {
        const focusWasInSidebar = sidebar.contains(document.activeElement);
        setDrawer(false);
        if (!desktop.matches && focusWasInSidebar) {
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

        for (const { link, section } of navigation) {
            if (section.getBoundingClientRect().top > readingLine) break;
            active = link;
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
