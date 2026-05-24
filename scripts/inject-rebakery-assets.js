'use strict';

hexo.extend.injector.register('head_end', `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/css/imaegoo-night.css">
<link rel="stylesheet" href="/css/imaegoo-adapter.css">
`);

hexo.extend.injector.register('body_begin', `
<canvas id="universe"></canvas>
`);

hexo.extend.injector.register('body_end', `
<a class="navbar-item night" id="night-nav" title="Night Mode" href="javascript:;">
  <i class="fas fa-moon" id="night-icon"></i>
</a>
<script src="/js/imaegoo/night.js"></script>
<script src="/js/imaegoo-adapter.js"></script>
<script src="/js/imaegoo/universe.js"></script>
`);
