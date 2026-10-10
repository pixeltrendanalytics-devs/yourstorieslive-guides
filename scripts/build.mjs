import { readFile, writeFile, mkdir, readdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const catalog = JSON.parse(await readFile(path.join(root, 'guides.json'), 'utf8'));
const sources = new Set(await readdir(path.join(root, 'content')));
const guides = catalog.filter(guide => !guide.companion);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const destination = file => `${file.endsWith('.md') ? 'reference' : 'guides'}/${file.replace(/\.md$/, '.html')}`;
const categories = [...new Set(guides.map(guide => guide.category))];

for (const guide of catalog) {
  if (!sources.has(guide.file)) throw new Error(`Missing content: ${guide.file}`);
  if (path.basename(guide.file) !== guide.file) throw new Error(`Invalid catalog path: ${guide.file}`);
}
if (new Set(catalog.map(guide => guide.file)).size !== catalog.length) throw new Error('Duplicate catalog entries');
for (const file of sources) {
  if (/\.(html|md)$/.test(file) && !catalog.some(guide => guide.file === file)) {
    throw new Error(`Add ${file} to guides.json before publishing`);
  }
}

function localLink(href, current) {
  if (/^(?:https?:|mailto:|#)/i.test(href)) return href;
  const [file, suffix = ''] = href.split(/(?=[?#])/s);
  const name = decodeURIComponent(file);
  if (name.startsWith('/') || name.includes('..')) return null;
  if (!sources.has(name)) throw new Error(`Unresolved link in ${current}: ${href}`);
  return `../${destination(name)}${suffix}`;
}

function header(prefix = '') {
  return `<a class="skip-link" href="#main-content">Skip to content</a><header class="site-header"><div class="header-inner"><a class="wordmark" href="${prefix}index.html"><span class="brand-seal" aria-hidden="true">Y</span><span>YourStoriesLive <span style="font-weight:400">/ Guides</span></span></a><a class="header-link" href="${prefix}index.html#library">Browse library ↗</a></div></header>`;
}

function document(title, body, prefix = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#583581"><meta name="description" content="YourStoriesLive architecture, deployment and media documentation"><title>${escape(title)} · YourStoriesLive Guides</title><link rel="stylesheet" href="${prefix}assets/site.css"></head><body>${header(prefix)}${body}<footer class="site-footer"><div><span>YourStoriesLive · Architecture, media & delivery</span><a href="${prefix}index.html">Back to all guides ↑</a></div></footer></body></html>`;
}

const essentials = guides.filter(guide => guide.collection === 'Application');
const featured = guides.filter(guide => guide.featured && guide.collection !== 'Application');
const runbooks = guides.filter(guide => !guide.featured && guide.collection !== 'Application');
const icons = ['⌘', '◈', '⇄', '≈'];
const guideCard = (guide, i) => `<a class="guide-card" data-guide data-category="${escape(guide.category)}" href="${destination(guide.file)}"><div class="card-top"><span class="guide-symbol" aria-hidden="true">${icons[i % icons.length]}</span><span class="format-tag">${escape(guide.format)}</span></div><h3>${escape(guide.title)}</h3><p>${escape(guide.description)}</p><div class="card-footer"><span>${escape(guide.category)}</span><strong>Open ${guide.format === 'Presentation' ? 'presentation' : 'guide'} ↗</strong></div></a>`;
const featuredCards = featured.map(guideCard).join('');
const essentialCards = essentials.map(guideCard).join('');
const essentialsSection = essentials.length ? `<section data-guide-section><div class="section-label"><h2>Understand the application</h2><span>Architecture, features & stakeholder questions</span></div><div class="essentials-grid">${essentialCards}</div></section>` : '';
const runbookCards = runbooks.map(guide => `<a class="runbook" data-guide data-category="${escape(guide.category)}" href="${destination(guide.file)}"><div><h3>${escape(guide.title)}</h3><p>${escape(guide.description)}</p></div><span aria-hidden="true">↗</span></a>`).join('');
const filters = ['All', ...categories].map(category => `<button type="button" class="filter" data-category-filter="${escape(category)}" aria-pressed="${category === 'All'}">${escape(category)}</button>`).join('');
const home = `<main class="home" id="main-content"><section class="hero"><div><p class="eyebrow">YourStoriesLive · Knowledge library</p><h1>The decisions behind<br><em>the experience.</em></h1><p class="lede">A shared place for our architecture, media workflows and deployment guides. Start with the big picture, then open the reference you need.</p></div><aside class="library-note"><strong>${guides.length} guides. One place.</strong><p>Application guides, visual references, presentations and detailed runbooks—ready to read and share.</p></aside></section><div id="library" class="toolbar"><label class="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span class="sr-only">Search guides</span><input id="guide-search" type="search" placeholder="Search guides, media, deployment…" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter guides by topic">${filters}</div></div><p class="results-note" id="results-count" role="status" aria-live="polite">${guides.length} guides in the library</p>${essentialsSection}<section data-guide-section><div class="section-label"><h2>Visual guides & presentations</h2><span>The big picture & key workflows</span></div><div class="featured-grid">${featuredCards}</div></section><section data-guide-section><div class="section-label"><h2>Deployment & operations</h2><span>Detailed references for the team</span></div><div class="runbook-grid">${runbookCards}</div></section><p id="empty-state" class="empty-state" hidden>No guides match your search. Try a different phrase or choose All.</p><p class="history-note"><strong>Check the document’s date and scope.</strong> Current application guides sit alongside historical AWS POC records and dated deployment instructions. Verify the selected environment before using operational commands or budgets.</p></main><script src="assets/site.js" defer></script>`;

// Only remove the generated output inside this repository; never the sources.
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'guides'), { recursive: true });
await mkdir(path.join(output, 'reference'), { recursive: true });
await mkdir(path.join(output, 'sources'), { recursive: true });
await cp(path.join(root, 'site', 'assets'), path.join(output, 'assets'), { recursive: true });
await writeFile(path.join(output, 'index.html'), document('Guides library', home));
await writeFile(path.join(output, '.nojekyll'), '');

for (const guide of catalog) {
  const source = await readFile(path.join(root, 'content', guide.file), 'utf8');
  let page;
  if (guide.file.endsWith('.md')) {
    const markdown = new Marked({ gfm: true });
    const headingIds = new Set();
    const contents = [];
    markdown.use({ renderer: {
      heading(token) {
        const base = token.text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
        let id = base;
        for (let suffix = 2; headingIds.has(id); suffix++) id = `${base}-${suffix}`;
        headingIds.add(id);
        if (token.depth === 2) contents.push({ id, text: token.text });
        return `<h${token.depth} id="${escape(id)}">${this.parser.parseInline(token.tokens)}</h${token.depth}>`;
      },
      link(token) {
        const href = localLink(token.href, guide.file);
        const text = this.parser.parseInline(token.tokens);
        if (href === null) return `<span>${text} <small>(application source reference)</small></span>`;
        return `<a href="${escape(href)}"${token.title ? ` title="${escape(token.title)}"` : ''}>${text}</a>`;
      }
    } });
    let rendered = markdown.parse(source);
    rendered = rendered.replace(/<table>[\s\S]*?<\/table>/g, table => `<div class="table-scroll">${table}</div>`);
    const sidebar = categories.map(category => `<h2>${escape(category)}</h2>${guides.filter(item => item.category === category).map(item => `<a href="../${destination(item.file)}"${item.file === guide.file ? ' aria-current="page"' : ''}>${escape(item.title)}</a>`).join('')}`).join('');
    const tableOfContents = guide.collection === 'Application' ? `<nav class="guide-contents" aria-label="On this page"><strong>On this page</strong><ul>${contents.map(item => `<li><a href="#${escape(item.id)}">${escape(item.text)}</a></li>`).join('')}</ul></nav>` : '';
    if (tableOfContents) rendered = rendered.replace('<h2 ', `${tableOfContents}<h2 `);
    const contextNote = guide.reviewed ? `Reviewed ${escape(guide.reviewed)} · Current code snapshot. Implementation status and production acceptance are separate.` : 'Historical reference. Follow the document’s date and environment status; verify current configuration before acting.';
    page = document(guide.title, `<main class="reader-layout" id="main-content"><nav class="reader-sidebar" aria-label="Guides"><a href="../index.html">← All guides</a>${sidebar}</nav><article class="reader-content"><a class="reader-mobile-back" href="../index.html">← All guides</a><p class="history-note">${contextNote}</p>${rendered}<p class="source-link"><a href="../sources/${escape(guide.file)}">Read the Markdown source</a></p></article></main>`, '../');
    await writeFile(path.join(output, 'sources', guide.file), source);
  } else {
    page = source.replace(/\bhref=(['"])([^'"]+)\1/g, (match, quote, href) => {
      const resolved = localLink(href, guide.file);
      return resolved === null ? match : `href=${quote}${escape(resolved)}${quote}`;
    });
    if (page.includes('class="deck"')) {
      page = page.replace(/<div class="brand">([\s\S]*?)<\/div>/, '<a class="brand" href="../index.html" title="Back to all guides" style="text-decoration:none">$1</a>');
    } else {
      const full = guide.file.replace(/\.html$/, '.md');
      const companion = sources.has(full) ? `<a href="../${destination(full)}">Full written guide ↗</a>` : '';
      const navigation = `<nav class="gs-nav" aria-label="Guide navigation"><a href="../index.html">← All guides</a>${companion}</nav>`;
      const style = '<style>.gs-nav{max-width:1100px;margin:16px auto;padding:0 18px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font:13px/1.5 system-ui,sans-serif}.gs-nav a{color:#583581;text-decoration:none}.gs-nav a:hover{text-decoration:underline}.gs-nav a:focus-visible{outline:3px solid #b695d6;outline-offset:4px}@media print{.gs-nav{display:none}}</style>';
      page = page.replace('</head>', `${style}</head>`).replace(/<body([^>]*)>/, `<body$1>${navigation}`);
    }
  }
  await writeFile(path.join(output, destination(guide.file)), page);
}
await writeFile(path.join(output, '404.html'), document('Page not found', '<main class="home" id="main-content" style="padding-top:60px"><p class="eyebrow">Page not found</p><h1>Let’s get you back<br>to the library.</h1><p>This guide may have moved. <a href="/yourstorieslive-guides/">Browse all guides</a>.</p></main>', '/yourstorieslive-guides/'));
console.log(`Built ${guides.length} library entries and ${catalog.length} guide pages in dist/.`);
