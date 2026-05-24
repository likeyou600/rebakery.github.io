'use strict';

const path = require('path');

function escapeAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeSmallHtmlEntities(value) {
  return value
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&amp;/g, '&');
}

function decodeUrlPath(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

hexo.extend.filter.register('after_post_render', function rewritePreviewImagePaths(data) {
  if (!data.source || !data.path) {
    return data;
  }

  const postName = path.basename(data.source, path.extname(data.source));
  const publicPath = `/${data.path.replace(/index\.html$/, '')}`;

  if (!postName || !publicPath) {
    return data;
  }

  function getSitePath(rawSrc) {
    const originalSrc = decodeSmallHtmlEntities(rawSrc.trim()).replace(/\\/g, '/');
    const decodedSrc = decodeUrlPath(originalSrc);
    const prefix = `${postName}/`;
    const encodedPrefix = encodeURI(prefix);
    let filename = '';

    if (decodedSrc.startsWith(prefix)) {
      filename = decodedSrc.slice(prefix.length);
    } else if (originalSrc.startsWith(encodedPrefix)) {
      filename = decodeUrlPath(originalSrc.slice(encodedPrefix.length));
    }

    return filename ? encodeURI(`${publicPath}${filename}`) : '';
  }

  function rewrite(html) {
    if (typeof html !== 'string') {
      return html;
    }

    html = html.replace(/<p>\s*!\[([^\]]*)\]\((?:&lt;|<)?([^)<]+?)(?:&gt;|>)?\)\s*<\/p>/g, (match, alt, rawSrc) => {
      const sitePath = getSitePath(rawSrc);

      if (!sitePath) {
        return match;
      }

      return `<p><img src="${sitePath}" alt="${escapeAttribute(alt)}"></p>`;
    });

    html = html.replace(/(<img\b[^>]*\bsrc=")\/([^"]+)("[^>]*>)/g, (match, before, rawSrc, after) => {
      const sitePath = getSitePath(rawSrc);

      if (!sitePath) {
        return match;
      }

      return `${before}${sitePath}${after}`;
    });

    return html.replace(/(<a\b[^>]*\bhref=")\/?([^"#]+)("[^>]*>)/g, (match, before, rawHref, after) => {
      const sitePath = getSitePath(rawHref);

      if (!sitePath) {
        return match;
      }

      return `${before}${sitePath}${after}`;
    });
  }

  data.content = rewrite(data.content);
  data.excerpt = rewrite(data.excerpt);
  data.more = rewrite(data.more);

  return data;
});
