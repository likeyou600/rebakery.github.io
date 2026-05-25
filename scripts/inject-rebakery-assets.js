'use strict';

hexo.extend.injector.register('head_end', `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/css/imaegoo-night.css">
<link rel="stylesheet" href="/css/imaegoo-adapter.css">
`);

hexo.extend.injector.register('body_begin', `
<script>
(function () {
  var path = window.location.pathname.replace(/\\/index\\.html$/, '/');
  var className = '';

  if (path === '/' || path === '') {
    className = 'rebakery-home';
  } else if (path.indexOf('/archives') === 0) {
    className = 'rebakery-archives';
  } else if (path.indexOf('/collections') === 0) {
    className = 'rebakery-collections';
  } else if (path.indexOf('/about') === 0) {
    className = 'rebakery-about';
  } else if (/^\\/\\d{8}\\//.test(path)) {
    className = 'rebakery-post';
  }

  if (className) {
    document.body.classList.add(className);
  }
}());
</script>
<canvas id="universe"></canvas>
`);

hexo.extend.injector.register('body_end', `
<a class="navbar-item night" id="night-nav" title="Night Mode" href="javascript:;">
  <i class="fas fa-moon" id="night-icon"></i>
</a>
<script src="/js/imaegoo/night.js"></script>
<script src="/js/imaegoo-adapter.js"></script>
<script src="/js/imaegoo/universe.js"></script>
<script data-goatcounter="https://rebakery.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
<!-- Cloudflare Web Analytics -->
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"82c49522b87744b79020391148c3329f"}'></script>
<!-- End Cloudflare Web Analytics -->
`);
