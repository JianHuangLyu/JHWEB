/*!
    * Start Bootstrap - SB Admin v7.0.7 (https://startbootstrap.com/template/sb-admin)
    * Copyright 2013-2023 Start Bootstrap
    * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-sb-admin/blob/master/LICENSE)
    */
const sidebarToggle = document.querySelector('#sidebarToggle');
const sidebar = document.querySelector('#layoutSidenav_nav');
const pageContent = document.querySelector('#layoutSidenav_content');
const scrim = document.querySelector('.nav-scrim');
const desktop = window.matchMedia('(min-width: 992px)');
const navigation = Array.from(sidebar.querySelectorAll('.nav-link'), link => ({
    link,
    section: document.getElementById(link.hash.slice(1))
}));

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
        sidebar.querySelector('.nav-link.active').focus({ preventScroll: true });
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
    const link = event.target.closest('a[href^="#"]');
    if (link && drawerIsOpen()) {
        setDrawer(false);
        document.getElementById(link.hash.slice(1))?.focus({ preventScroll: true });
    }
});

document.body.classList.add('sidebar-ready');
sidebarToggle.hidden = false;
setDrawer(false);

let currentLink = navigation[0].link;
let scrollFrame = 0;

function syncNavigation() {
    scrollFrame = 0;
    const readingLine = Math.min(200, window.innerHeight * 0.35);
    let active = navigation[0].link;

    for (const { link, section } of navigation) {
        if (section.getBoundingClientRect().top > readingLine) {
            break;
        }
        active = link;
    }

    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        const anchor = navigation.find(({ link }) => link.hash === window.location.hash);
        const anchorTop = anchor?.section.getBoundingClientRect().top ?? -1;
        active = anchorTop >= 0 && anchorTop < window.innerHeight ? anchor.link : navigation.at(-1).link;
    }

    if (active !== currentLink) {
        currentLink.classList.remove('active');
        currentLink.removeAttribute('aria-current');
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

window.addEventListener('scroll', scheduleNavigationSync, { passive: true });
window.addEventListener('resize', scheduleNavigationSync);
window.addEventListener('hashchange', scheduleNavigationSync);
syncNavigation();
