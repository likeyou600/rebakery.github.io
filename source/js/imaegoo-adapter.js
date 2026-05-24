(function () {
    var pageClasses = [
        'rebakery-home',
        'rebakery-archives',
        'rebakery-collections',
        'rebakery-about',
        'rebakery-post'
    ];

    function markPageType() {
        var path = window.location.pathname.replace(/\/index\.html$/, '/');
        var body = document.body;

        if (!body) {
            return;
        }

        pageClasses.forEach(function (className) {
            body.classList.remove(className);
        });

        if (path === '/' || path === '') {
            body.classList.add('rebakery-home');
        } else if (path.indexOf('/archives') === 0) {
            body.classList.add('rebakery-archives');
        } else if (path.indexOf('/collections') === 0) {
            body.classList.add('rebakery-collections');
        } else if (path.indexOf('/about') === 0) {
            body.classList.add('rebakery-about');
        } else if (/^\/\d{8}\//.test(path)) {
            body.classList.add('rebakery-post');
        }
    }

    function placeNightButton() {
        var nightNav = document.getElementById('night-nav');
        var navbarEnd = document.querySelector('.navbar-main .navbar-end');
        var search = document.querySelector('.navbar-main .navbar-end .search');

        if (!navbarEnd) {
            return;
        }

        if (!nightNav) {
            nightNav = document.createElement('a');
            nightNav.className = 'navbar-item night';
            nightNav.id = 'night-nav';
            nightNav.title = 'Night Mode';
            nightNav.href = 'javascript:;';
            nightNav.innerHTML = '<i class="fas fa-moon" id="night-icon"></i>';
        }

        if (nightNav.dataset.rebakeryNightBound !== 'true') {
            nightNav.dataset.rebakeryNightBound = 'true';
            nightNav.addEventListener('click', function (event) {
                event.preventDefault();

                if (typeof window.rebakerySwitchNight === 'function') {
                    window.rebakerySwitchNight();
                }
            });
        }

        if (search && search.parentNode === navbarEnd) {
            navbarEnd.insertBefore(nightNav, search.nextSibling);
        } else {
            navbarEnd.appendChild(nightNav);
        }
    }

    function toggleCatalogueButton() {
        var body = document.body;
        var catalogue = document.querySelector('.navbar-main .catalogue');

        if (!body || !catalogue) {
            return;
        }

        if (body.classList.contains('rebakery-post')) {
            catalogue.style.display = '';
        } else {
            catalogue.style.display = 'none';
        }
    }

    function placeColumns() {
        var columns = document.querySelector('.section .columns');
        var left = document.querySelector('.column-left');
        var main = document.querySelector('.column-main');
        var right = document.querySelector('.column-right');

        if (!columns || !left || !main) {
            return;
        }

        columns.insertBefore(left, main);

        if (right) {
            columns.appendChild(right);
        }
    }

    function placeHomeWidgets() {
        var body = document.body;
        var right = document.querySelector('.column-right');

        if (!body || !body.classList.contains('rebakery-home') || !right) {
            return;
        }

        ['tags', 'categories', 'recent-posts'].forEach(function (type) {
            var widget = right.querySelector('.widget[data-type="' + type + '"]');

            if (widget) {
                right.appendChild(widget);
            }
        });
    }

    function placeMobileToc() {
        var body = document.body;
        var staleToc = document.querySelector('body > #toc[data-rebakery-mobile-toc="true"]');

        if (body && staleToc) {
            staleToc.remove();
        }
    }

    function removeMobileTocModal() {
        var modal = document.getElementById('rebakery-toc-modal');
        var mask = document.getElementById('rebakery-toc-mask');

        if (modal) {
            modal.remove();
        }

        if (mask) {
            mask.remove();
        }
    }

    function closeMobileTocModal() {
        removeMobileTocModal();
    }

    function openMobileTocModal() {
        var sourceToc = document.querySelector('.column-right #toc');
        var sourceMenu = sourceToc && sourceToc.querySelector('.menu');
        var body = document.body;
        var modal;
        var mask;
        var menu;

        if (!body || !body.classList.contains('rebakery-post') || !sourceMenu) {
            return;
        }

        removeMobileTocModal();

        mask = document.createElement('div');
        mask.id = 'rebakery-toc-mask';
        mask.addEventListener('click', closeMobileTocModal);

        modal = document.createElement('div');
        modal.id = 'rebakery-toc-modal';
        modal.className = 'card widget';

        menu = sourceMenu.cloneNode(true);
        Array.prototype.forEach.call(menu.querySelectorAll('a'), function (link) {
            var rawHref = link.getAttribute('data-href') || link.getAttribute('href') || '';
            var targetId = rawHref.charAt(0) === '#' ? decodeURIComponent(rawHref.slice(1)) : '';

            if (!targetId) {
                return;
            }

            link.setAttribute('href', '#' + targetId);

            link.addEventListener('click', function (event) {
                var target = document.getElementById(targetId);

                event.preventDefault();

                if (target && typeof target.scrollIntoView === 'function') {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });

                    if (history.pushState) {
                        history.pushState(null, '', '#' + targetId);
                    } else {
                        location.hash = targetId;
                    }
                }

                closeMobileTocModal();
            });
        });

        modal.appendChild(menu);
        body.appendChild(mask);
        body.appendChild(modal);
    }

    function bindMobileTocModal() {
        if (document.body.dataset.rebakeryTocModal === 'true') {
            return;
        }

        document.body.dataset.rebakeryTocModal = 'true';

        document.addEventListener('click', function (event) {
            if (!event.target.closest('.navbar-main .catalogue')) {
                return;
            }

            if (!document.body.classList.contains('rebakery-post')) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            openMobileTocModal();
        }, true);
    }

    function getThemeMode() {
        if (document.body.classList.contains('night')) {
            return 'dark';
        }

        if (document.body.classList.contains('light')) {
            return 'light';
        }

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    function syncGiscusTheme() {
        var iframe = document.querySelector('iframe.giscus-frame');

        if (!iframe || !iframe.contentWindow) {
            return;
        }

        iframe.contentWindow.postMessage({
            giscus: {
                setConfig: {
                    theme: getThemeMode()
                }
            }
        }, 'https://giscus.app');
    }

    function watchThemeChanges() {
        if (!document.body || document.body.dataset.rebakeryThemeWatcher === 'true') {
            return;
        }

        document.body.dataset.rebakeryThemeWatcher = 'true';

        new MutationObserver(syncGiscusTheme).observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });

        if (window.matchMedia) {
            var colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

            if (colorScheme.addEventListener) {
                colorScheme.addEventListener('change', syncGiscusTheme);
            } else if (colorScheme.addListener) {
                colorScheme.addListener(syncGiscusTheme);
            }
        }
    }

    function retryGiscusThemeSync() {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts += 1;
            syncGiscusTheme();

            if (document.querySelector('iframe.giscus-frame') || attempts >= 20) {
                clearInterval(timer);
            }
        }, 250);
    }

    function applyAdapters() {
        markPageType();
        placeColumns();
        placeHomeWidgets();
        placeMobileToc();
        placeNightButton();
        toggleCatalogueButton();
        bindMobileTocModal();
        watchThemeChanges();
        retryGiscusThemeSync();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyAdapters);
    } else {
        applyAdapters();
    }

    document.addEventListener('pjax:complete', applyAdapters);
}());
