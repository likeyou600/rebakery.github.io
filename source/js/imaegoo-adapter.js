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

        if (!nightNav || !navbarEnd) {
            return;
        }

        if (search && search.parentNode === navbarEnd) {
            navbarEnd.insertBefore(nightNav, search.nextSibling);
        } else {
            navbarEnd.appendChild(nightNav);
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
        placeNightButton();
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
