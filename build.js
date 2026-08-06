// Inkwell — Static site build script
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, cpSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname, basename, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import parseMarkdown, { slugify } from './lib/markdown.js';
import * as tpl from './lib/templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = join(ROOT, 'dist');
const CONTENT = join(ROOT, 'content');
const ASSETS = join(ROOT, 'assets');

// ─── Helpers ────────────────────────────────────────────────────────

function readConfig() {
  const raw = readFileSync(join(ROOT, 'config.json'), 'utf-8');
  return JSON.parse(raw);
}

function readMD(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  return parseMarkdown(raw);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeDist(relPath, content) {
  const full = join(DIST, relPath);
  ensureDir(dirname(full));
  writeFileSync(full, content, 'utf-8');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ls(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir);
}

function lsFiles(dir) {
  return ls(dir).filter(f => statSync(join(dir, f)).isFile());
}

function lsDirs(dir) {
  return ls(dir).filter(f => statSync(join(dir, f)).isDirectory());
}

// ─── Load content ───────────────────────────────────────────────────

function loadPosts() {
  const dir = join(CONTENT, 'posts');
  const entries = ls(dir);
  const posts = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const isDir = statSync(fullPath).isDirectory();

    if (isDir) {
      // Directory mode: posts/{slug}/index.md + images
      const mdFiles = lsFiles(fullPath).filter(f => f.endsWith('.md'));
      if (mdFiles.length === 0) continue;
      // prefer index.md, otherwise first .md
      const mainMd = mdFiles.includes('index.md') ? 'index.md' : mdFiles[0];
      let parsed;
      try {
        parsed = readMD(join(fullPath, mainMd));
      } catch (e) {
        console.error(`  Error parsing ${entry}/${mainMd}: ${e.message}`);
        continue;
      }
      const slug = slugify(parsed.data.slug || entry);
      // Collect resource files (non-.md) in the directory
      const resources = lsFiles(fullPath).filter(f => !f.endsWith('.md') && !f.endsWith('.html'));
      posts.push({
        slug,
        title: parsed.data.title || slug,
        date: parsed.data.date || '',
        tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
        listed: parsed.data.listed !== false,
        draft: parsed.data.draft === true,
        html: parsed.html,
        excerpt: parsed.excerpt,
        readingTime: parsed.readingTime,
        headings: parsed.headings,
        raw: parsed,
        sourceDir: fullPath,
        resources,
      });
    } else if (entry.endsWith('.md')) {
      // Flat mode: posts/xxx.md
      let parsed;
      try {
        parsed = readMD(fullPath);
      } catch (e) {
        console.error(`  Error parsing ${entry}: ${e.message}`);
        continue;
      }
      const slug = slugify(parsed.data.slug || basename(entry, '.md'));
      posts.push({
        slug,
        title: parsed.data.title || slug,
        date: parsed.data.date || '',
        tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
        listed: parsed.data.listed !== false,
        draft: parsed.data.draft === true,
        html: parsed.html,
        excerpt: parsed.excerpt,
        readingTime: parsed.readingTime,
        headings: parsed.headings,
        raw: parsed,
      });
    }
  }
  // Sort by date desc
  posts.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
  return posts;
}

function loadSeries() {
  const dir = join(CONTENT, 'series');
  const seriesDirs = lsDirs(dir);
  const seriesList = [];

  for (const d of seriesDirs) {
    const seriesPath = join(dir, d);
    const seriesMetaFile = join(seriesPath, '_series.md');
    if (!existsSync(seriesMetaFile)) continue;

    let meta;
    try {
      meta = readMD(seriesMetaFile);
    } catch (e) {
      console.error(`  Error parsing series ${d}/_series.md: ${e.message}`);
      continue;
    }

    const seriesSlug = slugify(meta.data.slug || d);
    const seriesData = {
      slug: seriesSlug,
      title: meta.data.title || d,
      description: meta.data.description || '',
      listed: meta.data.listed !== false,
      introHtml: meta.html,
      posts: [],
    };

    // Load chapter files (not _series.md)
    const chapterFiles = lsFiles(seriesPath)
      .filter(f => f.endsWith('.md') && f !== '_series.md');

    for (const cf of chapterFiles) {
      let parsed;
      try {
        parsed = readMD(join(seriesPath, cf));
      } catch (e) {
        console.error(`  Error parsing series ${d}/${cf}: ${e.message}`);
        continue;
      }
      const nameWithoutExt = basename(cf, '.md');
      const slug = slugify(parsed.data.slug || nameWithoutExt);
      const numMatch = nameWithoutExt.match(/^(\d+)/);
      let order = numMatch ? parseInt(numMatch[1], 10) : 999;
      if (parsed.data.order != null) order = parseInt(parsed.data.order, 10);

      seriesData.posts.push({
        slug,
        title: parsed.data.title || nameWithoutExt,
        date: parsed.data.date || '',
        tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
        html: parsed.html,
        excerpt: parsed.excerpt,
        readingTime: parsed.readingTime,
        headings: parsed.headings,
        order,
        series: seriesData.title,
        seriesSlug: seriesData.slug,
        seriesListed: seriesData.listed,
      });
    }

    // Sort by order
    seriesData.posts.sort((a, b) => a.order - b.order);
    seriesList.push(seriesData);
  }

  return seriesList;
}

function loadPages() {
  const dir = join(CONTENT, 'pages');
  const files = lsFiles(dir).filter(f => f.endsWith('.md'));
  const pages = [];
  for (const f of files) {
    let parsed;
    try {
      parsed = readMD(join(dir, f));
    } catch (e) {
      console.error(`  Error parsing page ${f}: ${e.message}`);
      continue;
    }
    const slug = slugify(parsed.data.slug || basename(f, '.md'));
    pages.push({
      slug,
      title: parsed.data.title || slug,
      html: parsed.html,
      excerpt: parsed.excerpt,
      readingTime: parsed.readingTime,
    });
  }
  return pages;
}

// ─── Build ──────────────────────────────────────────────────────────

function build(options = {}) {
  console.log('Inkwell — building site...\n');

  const config = readConfig();
  const posts = loadPosts();
  const seriesList = loadSeries();
  const pages = loadPages();

  // Filter out drafts (unless --drafts flag is set)
  const includeDrafts = options.drafts === true;
  const draftPosts = posts.filter(p => p.draft);
  const publishedPosts = includeDrafts ? posts : posts.filter(p => !p.draft);

  console.log(`  Posts:  ${publishedPosts.length}`);
  console.log(`  Series: ${seriesList.length}`);
  console.log(`  Pages:  ${pages.length}`);
  if (draftPosts.length > 0) {
    console.log(`  Drafts: ${draftPosts.length} (${draftPosts.map(p => p.slug).join(', ')})`);
  }
  console.log('');

  // Clean dist
  if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true, force: true });
  }
  ensureDir(DIST);

  // Copy assets
  cpSync(ASSETS, join(DIST, 'assets'), { recursive: true });
  // Copy static content
  if (existsSync(join(CONTENT, 'static'))) {
    cpSync(join(CONTENT, 'static'), DIST, { recursive: true });
  }

  // Add series context to series posts (prev/next)
  for (const series of seriesList) {
    const sp = series.posts;
    for (let i = 0; i < sp.length; i++) {
      sp[i].seriesIndex = i + 1;
      sp[i].seriesTotal = sp.length;
      sp[i].prevInSeries = i > 0 ? { title: sp[i - 1].title, slug: sp[i - 1].slug } : null;
      sp[i].nextInSeries = i < sp.length - 1 ? { title: sp[i + 1].title, slug: sp[i + 1].slug } : null;
      // Series posts get href pointing to their series URL
      sp[i].href = `/series/${series.slug}/${sp[i].slug}.html`;
      sp[i].listed = series.listed; // inherit listed from series
    }
  }

  // ─── Build post pages ─────────────────────────────────────────────
  const listedPosts = publishedPosts.filter(p => p.listed);

  // Merge listed series posts into the main timeline
  for (const series of seriesList) {
    if (series.listed) {
      for (const sp of series.posts) {
        listedPosts.push(sp);
      }
    }
  }
  // Re-sort by date descending
  listedPosts.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  // Build individual post pages
  for (const post of publishedPosts) {
    let html = tpl.postPage(config, post);
    // Copy post resources (images) and fix paths
    if (post.sourceDir && post.resources && post.resources.length > 0) {
      const assetsDir = join(DIST, 'posts', post.slug);
      ensureDir(assetsDir);
      for (const res of post.resources) {
        copyFileSync(join(post.sourceDir, res), join(assetsDir, res));
        // Rewrite relative image src to point to /posts/{slug}/
        html = html.replace(
          new RegExp(`(src|href)=["'](?!https?://|#|/|\\.\\./)${escapeRegExp(res)}["']`, 'g'),
          `$1="/posts/${post.slug}/${res}"`
        );
      }
    }
    writeDist(`posts/${post.slug}.html`, html);
  }

  // Build series chapter pages
  for (const series of seriesList) {
    for (const post of series.posts) {
      const dir = `series/${series.slug}`;
      writeDist(`${dir}/${post.slug}.html`, tpl.seriesPostPage(config, post));
    }
  }

  // ─── Home page with pagination ────────────────────────────────────
  const postsPerPage = config.build?.postsPerPage || 8;
  const totalPages = Math.ceil(listedPosts.length / postsPerPage) || 1;

  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * postsPerPage;
    const slice = listedPosts.slice(start, start + postsPerPage);
    const html = tpl.homePage(config, slice, { page, totalPages });
    if (page === 1) {
      writeDist('index.html', html);
    } else {
      writeDist(`${page}.html`, html);
    }
  }

  // ─── Archive ──────────────────────────────────────────────────────
  const postsByYear = {};
  for (const p of listedPosts) {
    if (!p.date) continue;
    const year = new Date(p.date).getFullYear().toString();
    if (!postsByYear[year]) postsByYear[year] = [];
    postsByYear[year].push(p);
  }
  writeDist('archive.html', tpl.archivePage(config, postsByYear));

  // ─── Tags ─────────────────────────────────────────────────────────
  const allTags = {};
  for (const p of listedPosts) {
    for (const tag of p.tags) {
      if (!allTags[tag]) allTags[tag] = 0;
      allTags[tag]++;
    }
  }
  writeDist('tags.html', tpl.tagsOverview(config, allTags));

  for (const tag of Object.keys(allTags)) {
    const tagPosts = listedPosts.filter(p => p.tags && p.tags.includes(tag));
    const tagFile = /^[a-zA-Z0-9_-]+$/.test(tag) ? tag : encodeURIComponent(tag);
    writeDist(`tags/${tagFile}.html`, tpl.tagPage(config, tag, tagPosts));
  }

  // ─── Series ───────────────────────────────────────────────────────
  writeDist('series.html', tpl.seriesOverview(config, seriesList));
  for (const series of seriesList) {
    writeDist(`series/${series.slug}.html`, tpl.seriesDetailPage(config, series));
  }

  // ─── Pages ────────────────────────────────────────────────────────
  for (const page of pages) {
    writeDist(`${page.slug}.html`, tpl.pagePage(config, page));
  }

  // ─── 404 ──────────────────────────────────────────────────────────
  writeDist('404.html', tpl.notFound(config));

  // ─── RSS ──────────────────────────────────────────────────────────
  writeDist('feed.xml', tpl.rssFeed(config, listedPosts));

  // ─── Sitemap ──────────────────────────────────────────────────────
  const siteUrl = config.site.url;
  const sitemapUrls = [
    { loc: siteUrl + '/', changefreq: 'daily' },
    { loc: siteUrl + '/archive.html', changefreq: 'weekly' },
    { loc: siteUrl + '/tags.html', changefreq: 'weekly' },
    { loc: siteUrl + '/series.html', changefreq: 'weekly' },
  ];

  for (const p of listedPosts) {
    sitemapUrls.push({ loc: `${siteUrl}/posts/${p.slug}.html`, lastmod: p.date ? p.date.slice(0, 10) : '' });
  }

  for (const s of seriesList) {
    sitemapUrls.push({ loc: `${siteUrl}/series/${s.slug}.html` });
    for (const p of s.posts) {
      sitemapUrls.push({ loc: `${siteUrl}/series/${s.slug}/${p.slug}.html`, lastmod: p.date ? p.date.slice(0, 10) : '' });
    }
  }

  for (const p of pages) {
    sitemapUrls.push({ loc: `${siteUrl}/${p.slug}.html` });
  }

  for (const tag of Object.keys(allTags)) {
    sitemapUrls.push({ loc: `${siteUrl}/tags/${tag}.html` });
  }

  writeDist('sitemap.xml', tpl.sitemap(config, sitemapUrls));

  // ─── Robots.txt ───────────────────────────────────────────────────
  writeDist('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);

  console.log('Build complete! Output in dist/\n');
}

// ─── Run ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const buildOptions = {
  drafts: args.includes('--drafts'),
};
build(buildOptions);
