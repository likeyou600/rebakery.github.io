'use strict';

const fs = require('fs');
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
  const assetFolder = data.asset_folder || postName;
  const publicPath = `/${data.path.replace(/index\.html$/, '').replace(/^\/+/, '')}`;

  if (!postName || !publicPath) {
    return data;
  }

  function getSitePath(rawSrc) {
    const originalSrc = decodeSmallHtmlEntities(rawSrc.trim()).replace(/\\/g, '/');
    const decodedSrc = decodeUrlPath(originalSrc);
    const prefixes = [`${assetFolder}/`, `${postName}/`];
    let filename = '';

    for (const prefix of prefixes) {
      const encodedPrefix = encodeURI(prefix);

      if (decodedSrc.startsWith(prefix)) {
        filename = decodedSrc.slice(prefix.length);
        break;
      }

      if (originalSrc.startsWith(encodedPrefix)) {
        filename = decodeUrlPath(originalSrc.slice(encodedPrefix.length));
        break;
      }
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

function walkFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    const itemPath = path.join(directory, item.name);

    if (item.isDirectory()) {
      return walkFiles(itemPath);
    }

    return item.isFile() ? [itemPath] : [];
  });
}

hexo.extend.generator.register('rebakery_post_assets', function registerPostAssets(locals) {
  return locals.posts.data.flatMap(post => {
    if (!post.asset_folder || !post.source || !post.path) {
      return [];
    }

    const assetsDirectory = path.join(hexo.source_dir, '_posts', post.asset_folder);
    const postDirectory = post.path.replace(/index\.html$/, '');

    return walkFiles(assetsDirectory).map(filePath => {
      const relativePath = path.relative(assetsDirectory, filePath).replace(/\\/g, '/');

      return {
        path: `${postDirectory}${relativePath}`,
        data: () => fs.createReadStream(filePath)
      };
    });
  });
});
