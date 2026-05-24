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

    function applyAdapters() {
        markPageType();
        placeColumns();
        placeHomeWidgets();
        placeNightButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyAdapters);
    } else {
        applyAdapters();
    }

    document.addEventListener('pjax:complete', applyAdapters);
}());
