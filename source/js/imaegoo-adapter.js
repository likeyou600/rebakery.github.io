(function () {
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', placeNightButton);
    } else {
        placeNightButton();
    }

    document.addEventListener('pjax:complete', placeNightButton);
}());
