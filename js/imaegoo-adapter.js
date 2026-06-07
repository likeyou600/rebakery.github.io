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
        } else if (/^\/\d{8}\//.test(path) || path.indexOf('/posts/') === 0 || path.indexOf('/projects/') === 0) {
            body.classList.add('rebakery-post');
        }
    }

    function markDevTitle() {
        var hostname = window.location.hostname;
        var prefix = '[ 開發環境!!! ] ';

        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return;
        }

        if (document.title.indexOf(prefix) !== 0) {
            document.title = prefix + document.title;
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

        if (search && search.parentNode === navbarEnd) {
            navbarEnd.insertBefore(nightNav, search.nextSibling);
        } else {
            navbarEnd.appendChild(nightNav);
        }

        if (typeof window.rebakeryBindNightNav === 'function') {
            window.rebakeryBindNightNav();
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

    function placeFloatingTocButton() {
        var body = document.body;
        var button = document.getElementById('rebakery-floating-toc');

        if (!body || !body.classList.contains('rebakery-post')) {
            if (button) {
                button.remove();
            }

            return;
        }

        if (!button) {
            button = document.createElement('button');
            button.id = 'rebakery-floating-toc';
            button.type = 'button';
            button.title = 'Catalogue';
            button.setAttribute('aria-label', 'Catalogue');
            button.innerHTML = '<i class="fas fa-list-ul"></i>';
            body.appendChild(button);
        }

        updateFloatingTocPosition();
    }

    function updateFloatingTocPosition() {
        var body = document.body;
        var navbar = document.querySelector('.navbar-main');
        var offset = 10;
        var top;

        if (!body || !body.classList.contains('rebakery-post') || !navbar) {
            return;
        }

        top = Math.max(16, Math.round(navbar.getBoundingClientRect().bottom + offset));
        body.style.setProperty('--rebakery-floating-toc-top', top + 'px');
    }

    function bindFloatingTocPosition() {
        if (!document.body || document.body.dataset.rebakeryFloatingToc === 'true') {
            return;
        }

        document.body.dataset.rebakeryFloatingToc = 'true';
        window.addEventListener('scroll', updateFloatingTocPosition, {
            passive: true
        });
        window.addEventListener('resize', updateFloatingTocPosition);
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

    function placePostWidgets() {
        var body = document.body;
        var main = document.querySelector('.column-main');
        var comments = document.getElementById('comments');
        var right = document.querySelector('.column-right');
        var container;

        if (!body || !body.classList.contains('rebakery-post') || !main || !right) {
            return;
        }

        if (!window.matchMedia || !window.matchMedia('(max-width: 1023px)').matches) {
            return;
        }

        container = main.querySelector('.rebakery-post-widgets');

        if (!container) {
            container = document.createElement('div');
            container.className = 'rebakery-post-widgets';

            if (comments && comments.parentNode === main) {
                comments.insertAdjacentElement('afterend', container);
            } else {
                main.appendChild(container);
            }
        }

        ['tags', 'categories', 'recent-posts'].forEach(function (type) {
            var widget = right.querySelector('.widget[data-type="' + type + '"]') ||
                container.querySelector('.widget[data-type="' + type + '"]');

            if (widget && widget.parentNode !== container) {
                container.appendChild(widget);
            }
        });
    }

    function normalizePostNavigation() {
        var nav = document.querySelector('.post-navigation');
        var newerLink = nav && nav.querySelector('.article-nav-prev');
        var olderLink = nav && nav.querySelector('.article-nav-next');
        var leftSlot;
        var rightSlot;

        if (!nav || nav.dataset.rebakeryNormalized === 'true') {
            return;
        }

        leftSlot = ensurePostNavigationSlot(nav, 'level-start');
        rightSlot = ensurePostNavigationSlot(nav, 'level-end');

        if (olderLink) {
            olderLink.classList.remove('article-nav-next');
            olderLink.classList.add('article-nav-prev');
            setPostNavigationIcon(olderLink, 'left');
            leftSlot.appendChild(olderLink);
        }

        if (newerLink) {
            newerLink.classList.remove('article-nav-prev');
            newerLink.classList.add('article-nav-next');
            setPostNavigationIcon(newerLink, 'right');
            rightSlot.appendChild(newerLink);
        }

        removeEmptyPostNavigationSlots(nav);
        nav.dataset.rebakeryNormalized = 'true';
    }

    function ensurePostNavigationSlot(nav, className) {
        var slot = nav.querySelector(':scope > .' + className);

        if (!slot) {
            slot = document.createElement('div');
            slot.className = className;

            if (className === 'level-start') {
                nav.insertBefore(slot, nav.firstChild);
            } else {
                nav.appendChild(slot);
            }
        }

        return slot;
    }

    function setPostNavigationIcon(link, direction) {
        var span = link.querySelector('span');
        var icon = link.querySelector('i') || document.createElement('i');
        var iconClass = direction === 'left' ? 'fa-chevron-left' : 'fa-chevron-right';

        icon.className = 'level-item fas ' + iconClass;

        if (!span) {
            link.appendChild(icon);
            return;
        }

        if (direction === 'left') {
            link.insertBefore(icon, span);
        } else {
            link.appendChild(icon);
        }
    }

    function removeEmptyPostNavigationSlots(nav) {
        Array.prototype.forEach.call(nav.querySelectorAll(':scope > .level-start, :scope > .level-end'), function (slot) {
            if (!slot.querySelector('a')) {
                slot.remove();
            }
        });
    }

    function localizePagination() {
        var previous = document.querySelectorAll('.pagination-previous');
        var next = document.querySelectorAll('.pagination-next');

        Array.prototype.forEach.call(previous, function (item) {
            var link = item.querySelector('a');

            if (link) {
                link.textContent = '上一頁';
            } else {
                item.textContent = '上一頁';
            }

            item.setAttribute('aria-label', '上一頁');
        });

        Array.prototype.forEach.call(next, function (item) {
            var link = item.querySelector('a');

            if (link) {
                link.textContent = '下一頁';
            } else {
                item.textContent = '下一頁';
            }

            item.setAttribute('aria-label', '下一頁');
        });
    }

    function compactMobilePagination() {
        var paginations = document.querySelectorAll('.pagination');
        var isMobile = window.matchMedia && window.matchMedia('(max-width: 1023px)').matches;

        Array.prototype.forEach.call(paginations, function (pagination) {
            var list = pagination.querySelector('.pagination-list');
            var items = list ? Array.prototype.slice.call(list.children) : [];
            var currentIndex = -1;
            var currentPage = -1;
            var totalPage = 0;
            var pageItems;
            var ellipsisItems;
            var firstVisible;
            var lastVisible;

            if (!list || list.dataset.rebakeryCompacted === 'true') {
                return;
            }

            pageItems = items.filter(function (item) {
                return item.querySelector('.pagination-link');
            });
            ellipsisItems = items.filter(function (item) {
                return item.querySelector('.pagination-ellipsis');
            });

            pageItems.forEach(function (item, index) {
                var pageNumber = Number(item.textContent.trim());

                if (Number.isFinite(pageNumber)) {
                    totalPage = Math.max(totalPage, pageNumber);
                }

                if (item.querySelector('.pagination-link.is-current')) {
                    currentIndex = index;
                    currentPage = pageNumber;
                }
            });

            if (currentIndex === -1 || currentPage === -1 || totalPage <= 7) {
                if (isMobile && pagination) {
                    pagination.classList.add('rebakery-pagination-compact');
                }

                list.dataset.rebakeryCompacted = 'true';
                return;
            }

            firstVisible = Math.max(1, currentPage - 1);
            lastVisible = Math.min(totalPage, currentPage + 1);

            pageItems.forEach(function (item, index) {
                var pageNumber = Number(item.textContent.trim());
                var shouldShow = pageNumber === 1 ||
                    pageNumber === totalPage ||
                    (pageNumber >= firstVisible && pageNumber <= lastVisible);

                item.style.display = shouldShow ? '' : 'none';
            });

            ellipsisItems.forEach(function (item) {
                item.remove();
            });

            insertPaginationEllipsis(list, pageItems);

            list.dataset.rebakeryCompacted = 'true';
        });
    }

    function insertPaginationEllipsis(list, pageItems) {
        var visibleItems = pageItems.filter(function (item) {
            return item.style.display !== 'none';
        });

        visibleItems.forEach(function (item, index) {
            var next = visibleItems[index + 1];
            var currentPage;
            var nextPage;
            var ellipsis;

            if (!next) {
                return;
            }

            currentPage = Number(item.textContent.trim());
            nextPage = Number(next.textContent.trim());

            if (!Number.isFinite(currentPage) || !Number.isFinite(nextPage) || nextPage - currentPage <= 1) {
                return;
            }

            ellipsis = document.createElement('li');
            ellipsis.className = 'rebakery-pagination-ellipsis';
            ellipsis.innerHTML = '<span class="pagination-ellipsis">&hellip;</span>';
            list.insertBefore(ellipsis, next);
        });
    }

    function placeDeployBadge() {
        var profile = document.querySelector('.widget[data-type="profile"]');
        var content = profile && profile.querySelector('.card-content');
        var badge;

        if (!profile || !content || profile.querySelector('.rebakery-deploy-badge')) {
            return;
        }

        badge = document.createElement('p');
        badge.className = 'is-size-7 rebakery-deploy-badge';
        badge.innerHTML = '<span class="rebakery-published-at">Last updated: loading...</span>';

        content.appendChild(badge);
        updatePublishedAt(badge.querySelector('.rebakery-published-at'));
    }

    function updatePublishedAt(target) {
        if (!target || target.dataset.loaded === 'true' || typeof fetch !== 'function') {
            return;
        }

        target.dataset.loaded = 'true';

        fetch('https://api.github.com/repos/likeyou600/rebakery.github.io/commits/gh-pages-2', {
            headers: {
                Accept: 'application/vnd.github+json'
            }
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Unable to load GitHub Pages commit');
                }

                return response.json();
            })
            .then(function (commit) {
                var publishedAt = commit && commit.commit && commit.commit.committer && commit.commit.committer.date;
                var date;

                if (!publishedAt) {
                    throw new Error('GitHub Pages commit has no date');
                }

                date = new Date(publishedAt);
                target.textContent = 'Last updated: ' + new Intl.DateTimeFormat('zh-TW', {
                    timeZone: 'Asia/Taipei',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).format(date);
            })
            .catch(function () {
                target.textContent = 'Last updated: unavailable';
            });
    }

    function syncBackToTopVisibility() {
        if (!document.body) {
            return;
        }

        document.body.classList.toggle('rebakery-scrolled', window.scrollY > 240);
    }

    function bindBackToTopVisibility() {
        if (!document.body || document.body.dataset.rebakeryBackToTop === 'true') {
            return;
        }

        document.body.dataset.rebakeryBackToTop = 'true';
        syncBackToTopVisibility();

        window.addEventListener('scroll', syncBackToTopVisibility, {
            passive: true
        });
        window.addEventListener('resize', syncBackToTopVisibility);
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
            if (!event.target.closest('.navbar-main .catalogue, #rebakery-floating-toc')) {
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
        var savedMode = window.localStorage && window.localStorage.getItem('night');

        if (document.body.classList.contains('night')) {
            return 'dark';
        }

        if (document.body.classList.contains('light')) {
            return 'light';
        }

        if (savedMode === 'true' || savedMode === null) {
            return 'dark';
        }

        if (savedMode === 'false') {
            return 'light';
        }

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    function syncGiscusTheme() {
        var iframes = document.querySelectorAll('iframe.giscus-frame');
        var scripts = document.querySelectorAll('script[src*="giscus.app/client.js"]');
        var theme = getThemeMode();

        Array.prototype.forEach.call(scripts, function (script) {
            script.setAttribute('data-theme', theme);
        });

        Array.prototype.forEach.call(iframes, function (iframe) {
            if (!iframe.contentWindow) {
                return;
            }

            iframe.contentWindow.postMessage({
                giscus: {
                    setConfig: {
                        theme: theme
                    }
                }
            }, 'https://giscus.app');
        });
    }

    function retryGiscusThemeSync() {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts += 1;
            syncGiscusTheme();

            if (attempts >= 20) {
                clearInterval(timer);
            }
        }, 250);
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
                colorScheme.addEventListener('change', retryGiscusThemeSync);
            } else if (colorScheme.addListener) {
                colorScheme.addListener(retryGiscusThemeSync);
            }
        }

        window.addEventListener('rebakery:theme-change', retryGiscusThemeSync);

        document.addEventListener('giscus:loaded', retryGiscusThemeSync);

        new MutationObserver(function (mutations) {
            var hasGiscusChange = mutations.some(function (mutation) {
                return Array.prototype.some.call(mutation.addedNodes, function (node) {
                    return node.nodeType === 1 &&
                        (node.matches && node.matches('iframe.giscus-frame, .giscus, script[src*="giscus.app/client.js"]') ||
                            node.querySelector && node.querySelector('iframe.giscus-frame, .giscus, script[src*="giscus.app/client.js"]'));
                });
            });

            if (hasGiscusChange) {
                retryGiscusThemeSync();
            }
        }).observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function getSearchKeywords() {
        var input = document.querySelector('.searchbox-input');

        return input ? input.value.trim() : '';
    }

    function getInternalSearchUrl(href, keywords) {
        var url;

        if (!href || !keywords) {
            return href;
        }

        try {
            url = new URL(href, window.location.origin);
        } catch (error) {
            return href;
        }

        if (url.origin !== window.location.origin) {
            return href;
        }

        url.searchParams.set('rebakery_search', keywords);
        return url.pathname + url.search + url.hash;
    }

    function enhanceSearchResultLinks() {
        var keywords = getSearchKeywords();

        Array.prototype.forEach.call(document.querySelectorAll('.searchbox-result-item'), function (link) {
            var href = link.getAttribute('href');
            var enhancedHref = getInternalSearchUrl(href, keywords);

            if (enhancedHref) {
                link.setAttribute('href', enhancedHref);
            }
        });
    }

    function bindSearchJump() {
        if (!document.body || document.body.dataset.rebakerySearchJump === 'true') {
            return;
        }

        document.body.dataset.rebakerySearchJump = 'true';

        document.addEventListener('input', function (event) {
            if (event.target.closest('.searchbox-input')) {
                setTimeout(enhanceSearchResultLinks, 0);
            }
        }, true);

        document.addEventListener('click', function (event) {
            var link = event.target.closest('.searchbox-result-item');
            var keywords;
            var href;

            if (!link) {
                return;
            }

            keywords = getSearchKeywords();
            href = getInternalSearchUrl(link.getAttribute('href'), keywords);

            if (href) {
                link.setAttribute('href', href);
                saveSearchJump(href, keywords);
            }
        }, true);

        document.addEventListener('keydown', function (event) {
            var active;
            var keywords;
            var href;

            if (event.key !== 'Enter') {
                return;
            }

            active = document.querySelector('.searchbox-result-item.active');

            if (!active) {
                return;
            }

            keywords = getSearchKeywords();
            href = getInternalSearchUrl(active.getAttribute('href'), keywords);

            if (href) {
                active.setAttribute('href', href);
                saveSearchJump(href, keywords);
            }
        }, true);
    }

    function saveSearchJump(href, keywords) {
        var url;

        if (!keywords || !window.sessionStorage) {
            return;
        }

        try {
            url = new URL(href, window.location.origin);
            window.sessionStorage.setItem('rebakery_search_jump', JSON.stringify({
                path: url.pathname,
                keywords: keywords,
                time: Date.now()
            }));
        } catch (error) {
            return;
        }
    }

    function consumeSearchJumpKeywords() {
        var queryKeywords = new URLSearchParams(window.location.search).get('rebakery_search');
        var stored;

        if (queryKeywords) {
            return queryKeywords;
        }

        if (!window.sessionStorage) {
            return '';
        }

        try {
            stored = JSON.parse(window.sessionStorage.getItem('rebakery_search_jump') || 'null');
        } catch (error) {
            return '';
        }

        if (!stored || stored.path !== window.location.pathname || Date.now() - stored.time > 60000) {
            return '';
        }

        return stored.keywords || '';
    }

    function jumpToSearchKeyword() {
        var keywords = consumeSearchJumpKeywords();
        var keyword = keywords.split(/\s+/).filter(Boolean)[0];
        var content = document.querySelector('.article .content');
        var marker;

        if (!keyword || !content || content.dataset.rebakerySearchHighlighted === keyword) {
            return;
        }

        marker = markFirstTextMatch(content, keyword);

        if (!marker) {
            return;
        }

        content.dataset.rebakerySearchHighlighted = keyword;

        setTimeout(function () {
            marker.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 120);
    }

    function markFirstTextMatch(root, keyword) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                var parent = node.parentElement;

                if (!parent || !node.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }

                if (parent.closest('script, style, pre, code, figure, .rebakery-search-hit')) {
                    return NodeFilter.FILTER_REJECT;
                }

                if (node.nodeValue.toLowerCase().indexOf(keyword.toLowerCase()) === -1) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        });
        var node = walker.nextNode();
        var index;
        var range;
        var marker;

        if (!node) {
            return null;
        }

        index = node.nodeValue.toLowerCase().indexOf(keyword.toLowerCase());
        range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + keyword.length);

        marker = document.createElement('mark');
        marker.className = 'rebakery-search-hit';
        range.surroundContents(marker);

        return marker;
    }

    function enhanceLazyVideos() {
        Array.prototype.forEach.call(document.querySelectorAll('video.rebakery-lazy-video'), function (video) {
            if (video.dataset.rebakeryVideoEnhanced === 'true') {
                return;
            }

            video.dataset.rebakeryVideoEnhanced = 'true';
            video.setAttribute('preload', 'none');
            video.setAttribute('playsinline', '');

            wrapLazyVideo(video);
            addLazyVideoButton(video);
        });
    }

    function wrapLazyVideo(video) {
        var wrapper;

        if (video.parentElement && video.parentElement.classList.contains('rebakery-video-frame')) {
            return;
        }

        wrapper = document.createElement('figure');
        wrapper.className = 'rebakery-video-frame';
        video.parentNode.insertBefore(wrapper, video);
        wrapper.appendChild(video);
    }

    function addLazyVideoButton(video) {
        var wrapper = video.parentElement;
        var button;

        if (!wrapper || wrapper.querySelector('.rebakery-video-load')) {
            return;
        }

        button = document.createElement('button');
        button.type = 'button';
        button.className = 'rebakery-video-load';
        button.innerHTML = '<i class="fas fa-play"></i><span>載入影片</span>';

        button.addEventListener('click', function () {
            loadLazyVideo(video, true);
        });

        wrapper.appendChild(button);
    }

    function loadLazyVideo(video, shouldPlay) {
        var sources = video.querySelectorAll('source[data-src]');
        var wrapper = video.parentElement;
        var button = wrapper && wrapper.querySelector('.rebakery-video-load');

        if (video.dataset.rebakeryVideoLoaded !== 'true') {
            Array.prototype.forEach.call(sources, function (source) {
                source.setAttribute('src', source.getAttribute('data-src'));
                source.removeAttribute('data-src');
            });

            if (button) {
                button.remove();
            }

            video.dataset.rebakeryVideoLoaded = 'true';
            video.load();
        }

        if (shouldPlay && typeof video.play === 'function') {
            video.play().catch(function () {
                return null;
            });
        }
    }

    function applyAdapters() {
        markDevTitle();
        markPageType();
        placeColumns();
        placeHomeWidgets();
        placePostWidgets();
        normalizePostNavigation();
        localizePagination();
        compactMobilePagination();
        placeDeployBadge();
        placeMobileToc();
        placeNightButton();
        toggleCatalogueButton();
        placeFloatingTocButton();
        bindFloatingTocPosition();
        bindBackToTopVisibility();
        bindMobileTocModal();
        bindSearchJump();
        enhanceSearchResultLinks();
        jumpToSearchKeyword();
        enhanceLazyVideos();
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
