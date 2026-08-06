// Inkwell — self-contained Markdown + frontmatter parser
// Zero dependencies, Node.js built-ins only.

// ─── Utilities (exported) ───────────────────────────────────────────

export function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf-]/g, '')  // keep CJK
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Frontmatter parser ─────────────────────────────────────────────

function parseFrontmatter(raw) {
  const data = {};
  const lines = raw.trim().split(/\r?\n/);
  let key = null;
  let isMultiline = false;
  let multilineBuffer = [];

  for (const line of lines) {
    // Multiline value continuation
    if (isMultiline) {
      const m = line.match(/^\s+(.+)/);
      if (m) {
        multilineBuffer.push(m[1]);
        continue;
      } else {
        data[key] = unquote(multilineBuffer.join('\n'));
        isMultiline = false;
        multilineBuffer = [];
        key = null;
      }
    }

    // Empty line or comment
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Multiline indicator
    const mlMatch = line.match(/^(\w[\w-]*)\s*:\s*\|$/);
    if (mlMatch) {
      key = mlMatch[1];
      isMultiline = true;
      multilineBuffer = [];
      continue;
    }

    // Key: value
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)/);
    if (kv) {
      key = kv[1];
      const val = kv[2].trim();
      // Array: [a, b, c]
      if (val.startsWith('[') && val.endsWith(']')) {
        data[key] = val.slice(1, -1).split(',').map(s => unquote(s.trim())).filter(Boolean);
      } else {
        data[key] = coerceValue(unquote(val));
      }
      key = null;
    }
  }

  // Flush remaining multiline
  if (isMultiline && key) {
    data[key] = unquote(multilineBuffer.join('\n'));
  }

  return data;
}

function coerceValue(val) {
  // YAML boolean
  if (val === 'true' || val === 'TRUE') return true;
  if (val === 'false' || val === 'FALSE') return false;
  // YAML null
  if (val === 'null' || val === 'NULL' || val === '~') return null;
  // YAML integer
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  // YAML float
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  return val;
}

function unquote(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

// ─── Inline parser ──────────────────────────────────────────────────

function parseInline(text) {
  // Process images and links on raw text first (to avoid double-escaping)
  const placeholders = [];

  // Images (before links — same syntax overlap)
  let html = text.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g,
    (_, alt, src, title) => {
      const ph = `\x00PH${placeholders.length}\x00`;
      placeholders.push(`<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${title ? ` title="${escapeAttr(title)}"` : ''} loading="lazy">`);
      return ph;
    });

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g,
    (_, text, href, title) => {
      const ph = `\x00PH${placeholders.length}\x00`;
      placeholders.push(`<a href="${escapeAttr(href)}"${title ? ` title="${escapeAttr(title)}"` : ''}>${escapeHtml(text)}</a>`);
      return ph;
    });

  // Escape remaining raw text
  html = escapeHtml(html);

  // Restore placeholders
  for (let i = 0; i < placeholders.length; i++) {
    html = html.replace(`\x00PH${i}\x00`, placeholders[i]);
  }

  // Bold + Italic (***)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold (**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic (*)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Strikethrough (~~)
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Inline code (`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  return html;
}

// ─── Block parser ───────────────────────────────────────────────────

function parseBlocks(lines) {
  const tokens = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) { i++; continue; }

    // Fenced code block
    const fenceMatch = line.match(/^(`{3,}|~{3,})(\w*)/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const lang = fenceMatch[2] || '';
      let codeLines = [];
      i++;
      while (i < lines.length) {
        if (lines[i].startsWith(fence)) { i++; break; }
        codeLines.push(lines[i]);
        i++;
      }
      tokens.push({ type: 'code', lang, content: codeLines.join('\n') });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      tokens.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() });
      i++; continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      tokens.push({ type: 'hr' });
      i++; continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      let quoteLines = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const inner = parseBlocks(quoteLines);
      tokens.push({ type: 'blockquote', children: inner });
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)/);
    if (ulMatch) {
      let listItems = [];
      while (i < lines.length) {
        const ulm = lines[i].match(/^(\s*)[-*+]\s+(.+)/);
        if (!ulm) break;
        listItems.push({ text: ulm[2] });
        i++;
      }
      tokens.push({ type: 'ul', items: listItems });
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (olMatch) {
      let listItems = [];
      while (i < lines.length) {
        const olm = lines[i].match(/^(\s*)\d+\.\s+(.+)/);
        if (!olm) break;
        listItems.push({ text: olm[2] });
        i++;
      }
      tokens.push({ type: 'ol', items: listItems });
      continue;
    }

    // Paragraph — consume until blank line or block token
    let paraLines = [line];
    i++;
    while (i < lines.length) {
      const nl = lines[i];
      if (!nl.trim()) break;
      if (/^(#{1,6}\s|```|~~~|>{1,}|[-*+]\s|\d+\.\s|^[-*_]{3,}\s*$)/.test(nl)) break;
      paraLines.push(nl);
      i++;
    }
    tokens.push({ type: 'paragraph', text: paraLines.join('\n') });
  }

  return tokens;
}

// ─── Render blocks to HTML ──────────────────────────────────────────

function renderBlocks(tokens) {
  let html = '';

  for (const tok of tokens) {
    switch (tok.type) {
      case 'heading': {
        const slug = slugify(tok.text);
        html += `<h${tok.level} id="${slug}">${parseInline(tok.text)}</h${tok.level}>\n`;
        break;
      }
      case 'paragraph':
        html += `<p>${parseInline(tok.text)}</p>\n`;
        break;
      case 'code':
        html += `<pre><code${tok.lang ? ` class="language-${escapeAttr(tok.lang)}"` : ''}>${escapeHtml(tok.content)}</code></pre>\n`;
        break;
      case 'hr':
        html += '<hr>\n';
        break;
      case 'blockquote': {
        const inner = renderBlocks(tok.children);
        html += `<blockquote>\n${inner}</blockquote>\n`;
        break;
      }
      case 'ul': {
        html += '<ul>\n';
        for (const item of tok.items) {
          html += `  <li>${parseInline(item.text)}</li>\n`;
        }
        html += '</ul>\n';
        break;
      }
      case 'ol': {
        html += '<ol>\n';
        for (const item of tok.items) {
          html += `  <li>${parseInline(item.text)}</li>\n`;
        }
        html += '</ol>\n';
        break;
      }
    }
  }

  return html.trim();
}

// ─── Extract headings ───────────────────────────────────────────────

function extractHeadings(tokens) {
  const headings = [];
  for (const tok of tokens) {
    if (tok.type === 'heading') {
      headings.push({ level: tok.level, text: tok.text, id: slugify(tok.text) });
    }
  }
  return headings;
}

// ─── Extract plain text (for excerpt / reading time) ────────────────

function extractPlainText(tokens) {
  const parts = [];
  for (const tok of tokens) {
    if (tok.type === 'heading') {
      parts.push(tok.text);
    } else if (tok.type === 'paragraph') {
      parts.push(tok.text);
    } else if (tok.type === 'blockquote') {
      parts.push(extractPlainText(tok.children));
    } else if (tok.type === 'ul' || tok.type === 'ol') {
      for (const item of tok.items) {
        parts.push(item.text);
      }
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ─── Main export ────────────────────────────────────────────────────

export default function parseMarkdown(raw) {
  let frontmatter = {};
  let body = raw;

  // Detect frontmatter
  if (raw.startsWith('---')) {
    const endIdx = raw.indexOf('\n---', 3);
    if (endIdx !== -1) {
      const fmRaw = raw.slice(4, endIdx);
      frontmatter = parseFrontmatter(fmRaw);
      body = raw.slice(endIdx + 4).trim();
    }
  }

  const lines = body.split(/\r?\n/);
  const tokens = parseBlocks(lines);
  const html = renderBlocks(tokens);
  const headings = extractHeadings(tokens);
  const plainText = extractPlainText(tokens);

  // Excerpt: first N chars of plain text
  const excerpt = plainText.length > 280
    ? plainText.slice(0, 280).replace(/\s+\S*$/, '') + '...'
    : plainText;

  // Reading time: ~250 wpm
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 250));

  return { data: frontmatter, html, headings, excerpt, readingTime };
}
