// Inkwell — HTML template functions
import { escapeHtml, escapeAttr } from './markdown.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function tagUrl(tag) {
  return /^[a-zA-Z0-9_-]+$/.test(tag) ? tag : encodeURIComponent(tag);
}

function basePath(config) {
  try {
    const u = new URL(config.site.url);
    return u.pathname.replace(/\/+$/, '');
  } catch { return ''; }
}

// ─── Shared helpers ─────────────────────────────────────────────────

function head(config, pageTitle) {
  const { title, subtitle, url, language } = config.site;
  const base = basePath(config);
  const displayTitle = pageTitle ? `${pageTitle} — ${title}` : title;
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(displayTitle)}</title>
<meta name="description" content="${escapeAttr(subtitle)}">
<link rel="alternate" type="application/rss+xml" title="${escapeAttr(title)} RSS" href="${url}/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600&family=Dancing+Script:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}/assets/theme.css">
<link rel="stylesheet" href="${base}/assets/style.css">
<script>!function(){var e=document.documentElement;try{var t=localStorage.getItem('inkwell-theme');e.classList.add(t||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))}catch(r){e.classList.add(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}}();</script>
</head>
<body>`;
}

function header(config, currentPath = '/') {
  const { title, subtitle } = config.site;
  const base = basePath(config);
  const nav = config.navigation || [];
  let html = `<header class="site-header">
  <div class="header-inner">
    <a href="${base}/" class="site-logo">
      <svg class="logo-cloud" viewBox="0 0 100 60" aria-hidden="true" width="100" height="60">
        <path d="M12 48 C2 40 2 28 12 22 C16 10 32 6 42 12 C54 2 74 2 82 14 C94 12 100 24 94 34 C98 42 90 52 78 48 C68 54 50 56 40 50 C28 56 16 54 12 48Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <span class="logo-text">${escapeHtml(title)}</span>
    </a>
    <nav class="site-nav">
      <button class="nav-toggle" aria-label="Toggle navigation" id="navToggle">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links" id="navLinks">`;
  for (const item of nav) {
    const navHref = item.href === '/' ? `${base}/` : `${base}${item.href}`;
    let isActive = currentPath === item.href;
    if (!isActive && item.href !== '/') {
      isActive = currentPath.startsWith(item.href) &&
        (currentPath.length === item.href.length || currentPath.charAt(item.href.length) === '/');
    }
    html += `
        <li><a href="${escapeAttr(navHref)}"${isActive ? ' class="active"' : ''}>${escapeHtml(item.label)}</a></li>`;
  }
  html += `
      </ul>
      <button class="theme-toggle" id="themeToggle" aria-label="切换深色模式" title="切换深色模式">
        <span class="icon-sun">☀</span>
        <span class="icon-moon">☾</span>
      </button>
    </nav>
  </div>
</header>
<main>`;
  return html;
}

function footer(config) {
  const { title, author } = config.site;
  const base = basePath(config);
  const year = new Date().getFullYear();
  return `</main>
<footer class="site-footer">
  <div class="footer-inner">
    <p>&copy; ${year} ${escapeHtml(title)} &mdash; ${escapeHtml(author.name)}</p>
    <p class="footer-links">
      <a href="${base}/feed.xml">RSS</a>
      <a href="${base}/sitemap.xml">Sitemap</a>
    </p>
  </div>
</footer>
<script src="${base}/assets/main.js"></script>
</body>
</html>`;
}

function pageShell(config, pageTitle, content, currentPath = '/') {
  return head(config, pageTitle) + header(config, currentPath) + content + footer(config);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function tagList(tags, base = '') {
  if (!tags || !tags.length) return '';
  return `<div class="post-tags">${tags.map(t => `<a href="${base}/tags/${escapeAttr(tagUrl(t))}.html" class="tag">${escapeHtml(t)}</a>`).join('\n')}</div>`;
}

function paginationNav(current, total, basePath) {
  if (total <= 1) return '';
  let html = '<nav class="pagination">';
  for (let i = 1; i <= total; i++) {
    const href = i === 1 ? (basePath === '/' ? '/' : basePath) : `${basePath}${i}.html`;
    if (i === current) {
      html += `<span class="page-current">${i}</span>`;
    } else {
      html += `<a href="${href}">${i}</a>`;
    }
  }
  html += '</nav>';
  return html;
}

function postCard(post, config) {
  const base = basePath(config);
  const href = post.href || `${base}/posts/${post.slug}.html`;
  return `<article class="post-card">
  <h2 class="post-card-title"><a href="${escapeAttr(href)}">${escapeHtml(post.title)}</a></h2>
  <div class="post-card-meta">
    <time datetime="${escapeAttr(post.date || '')}">${formatDate(post.date)}</time>
    ${post.readingTime ? `<span class="reading-time">${post.readingTime} 分钟阅读</span>` : ''}
  </div>
  ${tagList(post.tags, base)}
  ${post.excerpt ? `<p class="post-card-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
  <a href="${escapeAttr(href)}" class="read-more">阅读全文 &rarr;</a>
</article>`;
}

// ─── Home page ──────────────────────────────────────────────────────

export function homePage(config, posts, pagination) {
  const { page, totalPages } = pagination;
  const pageTitle = page > 1 ? `第 ${page} 页` : '';
  const cards = posts.map(p => postCard(p, config)).join('\n');

  const base = basePath(config);
  const baseForPagination = base + '/';
  const pagNav = paginationNav(page, totalPages, baseForPagination);

  const content = `
<section class="home-hero">
  <div class="hero-divider">
    <span class="divider-line"></span>
    <span class="divider-text">${escapeHtml(config.site.subtitle)}</span>
    <span class="divider-line"></span>
  </div>
</section>
<section class="post-list">
  ${cards || '<p class="empty-state">暂无文章。</p>'}
</section>
${pagNav}`;

  return pageShell(config, pageTitle, content, '/');
}

// ─── Post page ──────────────────────────────────────────────────────

export function postPage(config, post) {
  const base = basePath(config);
  const seriesBar = post.series
    ? `<div class="series-bar">
        <a href="${base}/series/${escapeAttr(post.seriesSlug)}.html">${escapeHtml(post.series)}</a>
        <span>第 ${post.seriesIndex}/${post.seriesTotal} 篇</span>
      </div>`
    : '';

  const seriesNav = post.prevInSeries || post.nextInSeries
    ? `<nav class="series-nav">
        ${post.prevInSeries ? `<a href="${base}/series/${escapeAttr(post.seriesSlug)}/${escapeAttr(post.prevInSeries.slug)}.html" class="prev-post">&larr; ${escapeHtml(post.prevInSeries.title)}</a>` : '<span></span>'}
        ${post.nextInSeries ? `<a href="${base}/series/${escapeAttr(post.seriesSlug)}/${escapeAttr(post.nextInSeries.slug)}.html" class="next-post">${escapeHtml(post.nextInSeries.title)} &rarr;</a>` : '<span></span>'}
      </nav>`
    : '';

  const content = `
<article class="post-full">
  <a href="${base}/" class="back-link" onclick="history.back();return false">&larr; 返回</a>
  <header class="post-header">
    ${seriesBar}
    <h1 class="post-title">${escapeHtml(post.title)}</h1>
    <div class="post-meta">
      <time datetime="${escapeAttr(post.date || '')}">${formatDate(post.date)}</time>
      ${post.readingTime ? `<span class="reading-time">${post.readingTime} 分钟阅读</span>` : ''}
    </div>
    ${tagList(post.tags, base)}
  </header>
  <div class="post-content">
    ${post.html}
  </div>
  ${seriesNav}
</article>`;

  return pageShell(config, post.title, content, `/posts/${post.slug}.html`);
}

// ─── Series post page (same as post but with series URL) ────────────

export function seriesPostPage(config, post) {
  const base = basePath(config);
  const seriesBar = post.series
    ? `<div class="series-bar">
        <a href="${base}/series/${escapeAttr(post.seriesSlug)}.html">${escapeHtml(post.series)}</a>
        <span>第 ${post.seriesIndex}/${post.seriesTotal} 篇</span>
      </div>`
    : '';

  const seriesNav = post.prevInSeries || post.nextInSeries
    ? `<nav class="series-nav">
        ${post.prevInSeries ? `<a href="${base}/series/${escapeAttr(post.seriesSlug)}/${escapeAttr(post.prevInSeries.slug)}.html" class="prev-post">&larr; ${escapeHtml(post.prevInSeries.title)}</a>` : '<span></span>'}
        ${post.nextInSeries ? `<a href="${base}/series/${escapeAttr(post.seriesSlug)}/${escapeAttr(post.nextInSeries.slug)}.html" class="next-post">${escapeHtml(post.nextInSeries.title)} &rarr;</a>` : '<span></span>'}
      </nav>`
    : '';

  const href = `/series/${post.seriesSlug}/${post.slug}.html`;
  const backHref = `${base}/series/${escapeAttr(post.seriesSlug)}.html`;
  const backLabel = post.series || '专栏';
  const content = `
<article class="post-full">
  <a href="${escapeAttr(backHref)}" class="back-link">&larr; ${escapeHtml(backLabel)}</a>
  <header class="post-header">
    ${seriesBar}
    <h1 class="post-title">${escapeHtml(post.title)}</h1>
    <div class="post-meta">
      <time datetime="${escapeAttr(post.date || '')}">${formatDate(post.date)}</time>
      ${post.readingTime ? `<span class="reading-time">${post.readingTime} 分钟阅读</span>` : ''}
    </div>
    ${tagList(post.tags)}
  </header>
  <div class="post-content">
    ${post.html}
  </div>
  ${seriesNav}
</article>`;

  return pageShell(config, post.title, content, href);
}

// ─── Archive page ───────────────────────────────────────────────────

export function archivePage(config, postsByYear) {
  const base = basePath(config);
  let html = '<section class="archive">\n';
  const years = Object.keys(postsByYear).sort((a, b) => b - a);
  for (const year of years) {
    html += `<h2>${year} 年</h2>\n<ul class="archive-list">\n`;
    for (const post of postsByYear[year]) {
      const href = post.href || `${base}/posts/${post.slug}.html`;
      html += `<li><time datetime="${escapeAttr(post.date)}">${formatDate(post.date)}</time> <a href="${escapeAttr(href)}">${escapeHtml(post.title)}</a></li>\n`;
    }
    html += '</ul>\n';
  }
  html += '</section>';
  return pageShell(config, '归档', html, '/archive.html');
}

// ─── Tags overview ──────────────────────────────────────────────────

export function tagsOverview(config, allTags) {
  const base = basePath(config);
  const sorted = Object.entries(allTags).sort((a, b) => b[1] - a[1]);
  let html = '<section class="tags-overview">\n<ul class="tag-cloud">\n';
  for (const [tag, count] of sorted) {
    html += `<li><a href="${base}/tags/${escapeAttr(tagUrl(tag))}.html" class="tag tag-cloud-item">${escapeHtml(tag)} <span>(${count})</span></a></li>\n`;
  }
  html += '</ul>\n</section>';
  return pageShell(config, '标签', html, '/tags.html');
}

// ─── Single tag page ────────────────────────────────────────────────

export function tagPage(config, tag, posts) {
  const cards = posts.map(p => postCard(p, config)).join('\n');
  const content = `<section class="tag-page">
  <div class="post-list">${cards || '<p class="empty-state">暂无此标签的文章。</p>'}</div>
</section>`;
  return pageShell(config, `标签: ${tag}`, content, `/tags/${tag}.html`);
}

// ─── Series overview ────────────────────────────────────────────────

export function seriesOverview(config, seriesList) {
  const base = basePath(config);
  let html = '<section class="series-overview">\n';
  if (!seriesList.length) {
    html += '<p class="empty-state">暂无专栏。</p>';
  } else {
    html += '<div class="series-grid">\n';
    for (const s of seriesList) {
      html += `<article class="series-card">
  <h2><a href="${base}/series/${escapeAttr(s.slug)}.html">${escapeHtml(s.title)}</a></h2>
  ${s.description ? `<p>${escapeHtml(s.description)}</p>` : ''}
  <span class="series-count">${s.posts.length} 篇</span>
</article>\n`;
    }
    html += '</div>\n';
  }
  html += '</section>';
  return pageShell(config, '专栏', html, '/series.html');
}

// ─── Single series page ─────────────────────────────────────────────

export function seriesDetailPage(config, series) {
  const base = basePath(config);
  let html = `<section class="series-detail">
  <a href="${base}/series.html" class="back-link">&larr; 合集</a>
  ${series.description ? `<p class="series-description">${escapeHtml(series.description)}</p>` : ''}
  ${series.introHtml ? `<div class="series-intro">${series.introHtml}</div>` : ''}
  <ol class="series-chapters">`;
  for (const post of series.posts) {
    const href = `${base}/series/${escapeAttr(series.slug)}/${escapeAttr(post.slug)}.html`;
    html += `<li>
      <a href="${escapeAttr(href)}">${escapeHtml(post.title)}</a>
      <span class="chapter-date">${formatDate(post.date)}</span>
    </li>`;
  }
  html += `</ol>
</section>`;
  return pageShell(config, series.title, html, `/series/${series.slug}.html`);
}

// ─── Standalone page ────────────────────────────────────────────────

export function pagePage(config, page) {
  const content = `<article class="page-content">
  ${page.html}
</article>`;
  return pageShell(config, page.title, content, `/${page.slug}.html`);
}

// ─── 404 page ───────────────────────────────────────────────────────

export function notFound(config) {
  const base = basePath(config);
  const content = `<section class="not-found">
  <h1>404</h1>
  <p>页面未找到。</p>
  <a href="${base}/">&larr; 返回首页</a>
</section>`;
  return pageShell(config, '404', content, '/404.html');
}

// ─── RSS feed ───────────────────────────────────────────────────────

export function rssFeed(config, posts) {
  const { title, description, url, language, author } = config.site;
  const now = new Date().toUTCString();
  let items = '';
  for (const post of posts) {
    const href = post.href || `/posts/${post.slug}.html`;
    const postUrl = `${url}${href}`;
    const postDate = post.date ? new Date(post.date).toUTCString() : now;
    items += `
    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${escapeAttr(postUrl)}</link>
      <guid isPermaLink="true">${escapeAttr(postUrl)}</guid>
      <pubDate>${postDate}</pubDate>
      <description>${escapeHtml(post.excerpt || '')}</description>
      ${post.tags ? post.tags.map(t => `<category>${escapeHtml(t)}</category>`).join('\n      ') : ''}
    </item>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(title)}</title>
    <link>${escapeAttr(url)}</link>
    <description>${escapeHtml(description)}</description>
    <language>${language}</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${url}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}

// ─── Sitemap ────────────────────────────────────────────────────────

export function sitemap(config, urls) {
  let entries = '';
  for (const u of urls) {
    const loc = u.loc.replace(/[^\x00-\x7F]+/g, (ch) => encodeURIComponent(ch));
    entries += `  <url><loc>${escapeAttr(loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq || 'monthly'}</changefreq></url>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}</urlset>`;
}
