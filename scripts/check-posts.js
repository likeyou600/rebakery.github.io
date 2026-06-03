'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'source');
const postsDir = path.join(sourceDir, '_posts');
const scanDirs = [
  postsDir,
  path.join(sourceDir, 'collections'),
  path.join(sourceDir, 'about')
];

const errors = [];

function walkMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walkMarkdownFiles(fullPath);
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      return [fullPath];
    }

    return [];
  });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function rel(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function addError(filePath, line, message) {
  errors.push(`${rel(filePath)}:${line}: ${message}`);
}

function parseFrontMatter(text) {
  if (!text.startsWith('---')) {
    return {};
  }

  const end = text.indexOf('\n---', 3);

  if (end === -1) {
    return {};
  }

  const frontMatter = text.slice(3, end).split(/\r?\n/);
  const data = {};

  frontMatter.forEach((line) => {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!match) {
      return;
    }

    data[match[1]] = stripYamlValue(match[2]);
  });

  return data;
}

function stripYamlValue(value) {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function normalizePermalink(permalink) {
  return permalink.replace(/^\/+/, '').replace(/\/+$/, '') + '/';
}

function removeHtmlCommentsPreserveLines(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (comment) => {
    return comment.replace(/[^\r\n]/g, ' ');
  });
}

function stripMarkdownUrlTitle(rawUrl) {
  return rawUrl
    .trim()
    .replace(/^<|>$/g, '')
    .replace(/\s+(?:"[^"]*"|'[^']*'|\([^)]*\))\s*$/, '')
    .trim();
}

function safeDecodeUri(value) {
  try {
    return decodeURI(value);
  } catch (_error) {
    return value;
  }
}

function isExternalUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value)
    || /^(?:mailto|tel|data):/i.test(value);
}

function fileExists(candidate) {
  return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
}

function resolveImagePath(rawUrl, filePath, frontMatter) {
  const withoutHash = rawUrl.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  const imagePath = safeDecodeUri(stripMarkdownUrlTitle(withoutQuery));

  if (!imagePath || isExternalUrl(imagePath)) {
    return true;
  }

  const normalized = imagePath.replace(/\\/g, '/');
  const candidates = [];

  if (normalized.startsWith('/')) {
    candidates.push(path.join(sourceDir, normalized.slice(1)));
  } else {
    candidates.push(path.resolve(path.dirname(filePath), normalized));
    candidates.push(path.resolve(postsDir, normalized));

    if (frontMatter.asset_folder) {
      candidates.push(path.resolve(postsDir, frontMatter.asset_folder, normalized));
      candidates.push(path.resolve(postsDir, frontMatter.asset_folder, path.basename(normalized)));
    }

    candidates.push(path.resolve(sourceDir, normalized));
  }

  return candidates.some(fileExists);
}

function parsePostLinkTarget(raw) {
  const trimmed = raw.trim();
  const quoted = trimmed.match(/^(['"])(.*?)\1/);

  if (quoted) {
    return quoted[2].trim();
  }

  const beforeLabel = trimmed.match(/^(.+?)\s+(['"])/);

  if (beforeLabel) {
    return beforeLabel[1].trim();
  }

  return trimmed.split(/\s+/)[0].trim();
}

function collectPosts(postFiles) {
  const posts = new Map();
  const permalinks = new Map();

  postFiles.forEach((filePath) => {
    const text = readText(filePath);
    const frontMatter = parseFrontMatter(text);

    if (frontMatter.published === 'false' || frontMatter.draft === 'true') {
      return;
    }

    const basename = path.basename(filePath, '.md');
    const keys = [
      basename,
      frontMatter.title,
      frontMatter.slug
    ].filter(Boolean);

    keys.forEach((key) => {
      posts.set(key, filePath);
    });

    if (frontMatter.permalink) {
      const normalized = normalizePermalink(frontMatter.permalink);
      const existing = permalinks.get(normalized);

      if (existing) {
        addError(filePath, 1, `duplicate permalink "${normalized}" also used by ${rel(existing)}`);
      } else {
        permalinks.set(normalized, filePath);
      }
    }
  });

  return { posts };
}

function checkImages(filePath, text, frontMatter) {
  const cleaned = removeHtmlCommentsPreserveLines(text);
  const imagePattern = /!\[[^\]]*]\(([^)\r\n]+)\)/g;
  let match;

  while ((match = imagePattern.exec(cleaned)) !== null) {
    const rawUrl = match[1];

    if (!resolveImagePath(rawUrl, filePath, frontMatter)) {
      addError(filePath, lineOf(cleaned, match.index), `image path not found: ${stripMarkdownUrlTitle(rawUrl)}`);
    }
  }
}

function checkPostLinks(filePath, text, posts) {
  const cleaned = removeHtmlCommentsPreserveLines(text);
  const postLinkPattern = /{%\s*post_link\s+([\s\S]*?)\s*%}/g;
  let match;

  while ((match = postLinkPattern.exec(cleaned)) !== null) {
    const target = parsePostLinkTarget(match[1]);

    if (!target || !posts.has(target)) {
      addError(filePath, lineOf(cleaned, match.index), `post_link target not found: ${target || '(empty)'}`);
    }
  }
}

function main() {
  const postFiles = walkMarkdownFiles(postsDir);
  const allMarkdownFiles = scanDirs.flatMap(walkMarkdownFiles);
  const { posts } = collectPosts(postFiles);

  allMarkdownFiles.forEach((filePath) => {
    const text = readText(filePath);
    const frontMatter = parseFrontMatter(text);

    if (frontMatter.published === 'false' || frontMatter.draft === 'true') {
      return;
    }

    checkImages(filePath, text, frontMatter);
    checkPostLinks(filePath, text, posts);
  });

  if (errors.length > 0) {
    console.error('Post checks failed:\n');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('Post checks passed.');
}

if (require.main === module) {
  main();
}
