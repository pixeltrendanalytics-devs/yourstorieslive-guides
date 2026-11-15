import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetHash = async name => createHash('sha256').update(await readFile(path.join(root, 'site/assets', name))).digest('hex').slice(0, 12);
const cssVersion = await assetHash('ui-review.css');
const jsVersion = await assetHash('ui-review.js');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function validateEvidence(data) {
  if (!data.sourceRevision || !data.capturedOn || !data.screens?.length) throw new Error('Missing source/date/screens');
  const ids = new Set();
  for (const screen of data.screens) {
    if (!/^[a-z0-9-]+$/.test(screen.id) || ids.has(screen.id)) throw new Error('Invalid or duplicate screen ID');
    ids.add(screen.id);
    if (!screen.after || (!screen.before && !screen.candidateOnly)) throw new Error(`Unpaired capture: ${screen.id}`);
    for (const side of ['before', 'after']) {
      const image = screen[side];
      if (!image) continue;
      if (!/^[a-z0-9-]+\.jpg$/.test(image.file) || !image.capturedAt || image.width <= 0 || image.height <= 0) throw new Error(`Invalid screenshot: ${screen.id}`);
      if (image.side !== side) throw new Error(`Incorrect evidence side: ${screen.id}`);
    }
    if (screen.before && (screen.before.width !== screen.after.width || screen.before.height !== screen.after.height)) throw new Error(`Unmatched viewports: ${screen.id}`);
  }
}

export function renderVerification(data) {
  validateEvidence(data);
  const paired = data.screens.filter(s => s.before).length;
  const image = (s, side) => {
    const shot = s[side];
    if (!shot) return '<div class="candidate-note">The baseline has no matching theme control.<br>This is a candidate-only view.</div>';
    return `<figure class="shot ${side}"><figcaption><strong>${side === 'before' ? 'Before · Vercel' : 'After · UI library'}</strong><span>${shot.width} × ${shot.height}</span></figcaption><button class="enlarge" type="button" aria-label="Enlarge ${side}: ${escape(s.title)}"><img src="../assets/ui-integration/${shot.file}" width="${shot.width}" height="${shot.height}" alt="${escape(s.title)} — ${side === 'before' ? 'pre-migration Vercel' : 'integrated localhost'}" loading="lazy" decoding="async"></button><small>${escape(new Date(shot.capturedAt).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'))} · ${escape(shot.path)}</small></figure>`;
  };
  const panels = data.screens.map((s, i) => `<article class="review-panel" id="screen-${s.id}" data-screen="${s.id}"${i ? ' hidden' : ''}><div class="panel-heading"><div><p class="eyebrow">${escape(s.group)} · ${escape(s.device)}</p><h2>${escape(s.title)}</h2></div><span class="pill">${s.candidateOnly ? 'Candidate only' : 'Matched viewport'}</span></div><p class="screen-note">${escape(s.note)}</p><div class="pair${s.device === 'Mobile' ? ' mobile-pair' : ''}">${image(s, 'before')}${image(s, 'after')}</div><p class="checks"><strong>Checked:</strong> ${escape(s.checked)}</p></article>`).join('');
  const rows = data.bundles.map(row => `<tr><th scope="row">${escape(row.label)}</th><td>${row.before.toLocaleString('en-US')}</td><td>${row.after.toLocaleString('en-US')}</td><td>${row.after - row.before > 0 ? '+' : ''}${(row.after - row.before).toLocaleString('en-US')}</td></tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Fresh YourStoriesLive UI-library comparisons and verification evidence"><title>UI integration — before & after</title><link rel="stylesheet" href="../assets/ui-review.css?v=${cssVersion}"></head><body>
<a class="skip" href="#comparison">Skip to comparison</a>
<header class="masthead"><a href="../index.html#library">YourStoriesLive <span>/ Design review</span></a><a href="../reference/ui-library-integration-guide.html">Integration guide ↗</a></header>
<main><section class="hero"><p class="eyebrow">Integration review · ${escape(data.capturedOn)}</p><h1>A shared design system.<br><em>The same stories.</em></h1><p class="intro">Compare the existing application with the UI-library integration. Fresh captures, matched account data and explicit acceptance boundaries.</p><div class="stats"><div><strong>${paired}</strong><span>before / after pairs</span></div><div><strong>5,276</strong><span>unit tests passed</span></div><div><strong>36</strong><span>public browser tests passed</span></div><div><strong>1.3.1</strong><span>UI library · tokens 1.2.0</span></div></div><p class="source">Candidate: <code>${escape(data.sourceRevision.slice(0, 8))}</code> · <code>feature/ysl-ui-library-integration</code><br>Before: yourstorieslive.vercel.app · After: localhost:3000 · Captures use the approved test account.</p></section>
<aside class="notice"><strong>Ready for review, not an automatic launch approval.</strong> Latest named Figma variable reconciliation, controlled write/permission journeys and production-like performance measurements remain open. The existing Vercel deployment's commit was not independently established. Screenshots are dated evidence, not a live environment.</aside>
<section id="comparison" aria-label="Screen comparisons"><div class="review-toolbar"><label>Screen<select id="screen-select">${data.screens.map(s => `<option value="${s.id}">${escape(s.device + ' · ' + s.title)}</option>`).join('')}</select></label><div class="mode" role="group" aria-label="Comparison mode"><button type="button" data-mode="pair" aria-pressed="true">Side by side</button><button type="button" data-mode="before" aria-pressed="false">Before</button><button type="button" data-mode="after" aria-pressed="false">After</button></div><div class="step"><button type="button" id="previous" aria-label="Previous screen">←</button><output id="screen-position">1 / ${data.screens.length}</output><button type="button" id="next" aria-label="Next screen">→</button></div></div>${panels}<noscript><p>JavaScript is needed to switch screens. The first comparison remains readable. Use the capture index below for all images.</p></noscript></section>
<section class="section" id="verification"><p class="eyebrow">Evidence & boundaries</p><h2>What this review establishes</h2><div class="evidence-grid"><div><h3>Automated checks · passed</h3><ul><li>432 suites / 5,276 tests; coverage: 97.39% statements, 91.39% branches, 92.51% functions, 97.39% lines.</li><li>36 pre-login Chromium Playwright checks.</li><li>TypeScript, ESLint, artifact integrity, ownership, theme, image and locale/message checks.</li><li>Six ownership tests and six bundle-gate tests.</li><li>Next.js production build and eight frozen initial-route budgets plus CSS.</li></ul></div><div><h3>Manual browser scope</h3><ul>${data.manualChecks.map(x => `<li>${escape(x)}</li>`).join('')}</ul><p>Read-only browsing did not create, save, upload, share, approve or delete records.</p></div><div><h3>Still to accept</h3><ul>${data.limitations.map(x => `<li>${escape(x)}</li>`).join('')}</ul></div></div></section>
<section class="section" id="performance"><p class="eyebrow">Production build · gzip bytes</p><h2>Keep initial delivery bounded</h2><p>These are code measurements, not production page timings. The “earlier build” is the recorded first integration build; it is not a downloaded Vercel bundle.</p><div class="table-wrap"><table><thead><tr><th>Route / output</th><th>Earlier build</th><th>Reviewed build</th><th>Change</th></tr></thead><tbody>${rows}</tbody></table></div><p>All frozen budgets pass. Photos increased 121 bytes; seven other initial routes decreased. Total emitted JavaScript increased 48,453 bytes, including deferred output. No claim of improved LCP, INP, CPU use or slow-device latency is made from these sizes.</p></section>
<section class="section" id="ownership"><p class="eyebrow">One reusable presentation system</p><h2>What changed, what stays in the app</h2><div class="evidence-grid"><div><h3>Library</h3><p>Tokens, spacing/type roles, controls, cards, dialogs, menus, navigation, media and bulk-action presentation. Inter body, Literata SemiBold headings, text-only logo, light/dark themes and shared component dimensions.</p></div><div><h3>Application</h3><p>Next Image/Link, translations, APIs, forms, Redux, permissions, recording/transcription, partial dates, virtualized geometry and documented sticky/safe-area layouts.</p></div><div><h3>Cleanup</h3><p>Removed the 12-file local kitchen sink, nine presentation-only wrappers and two UI-only menu hooks. Ownership checks prevent reintroducing the removed patterns. Private library packages remain private.</p></div></div></section>
<section class="section" id="review-notes"><p class="eyebrow">For product owner & designer</p><h2>Record your review</h2><p>Notes stay in this browser only. Export a JSON file to share feedback through your usual review process; this page sends no approvals or notes to a server.</p><div class="review-form"><label>Review status<select id="review-status"><option value="pending">Pending review</option><option value="changes">Changes requested</option><option value="visual-approved">Visual review approved — other acceptance still applies</option></select></label><label>Notes<textarea id="review-note" rows="4" placeholder="Screen, observation and expected result…"></textarea></label><button type="button" id="export-review">Download review notes</button><output id="save-status" aria-live="polite"></output></div></section>
<details class="section"><summary>Capture index, dates and measured style evidence</summary><p>Open a screenshot directly for full resolution. Style values below come from rendered DOM inspection, not a new Figma export. Local developer tools and origin/CDN failures may appear in candidate captures.</p><ul class="capture-index">${data.screens.map(s => `<li><strong>${escape(s.title)} · ${escape(s.device)}</strong> — ${['before', 'after'].filter(side => s[side]).map(side => `<a href="../assets/ui-integration/${s[side].file}">${side} (${s[side].width} × ${s[side].height})</a>`).join(' · ')}<br><small>${escape(s.after.rendered?.headingFont || 'No heading font sampled')} · primary: ${escape(s.after.rendered?.primary || 'not sampled')} · document ${s.after.rendered?.scrollWidth ?? '?'} / viewport ${s.after.rendered?.viewportWidth ?? '?'}px</small></li>`).join('')}</ul></details>
<footer><p>Library source <code>${escape(data.libraryRevision.slice(0, 8))}</code> · BFF catalogue source <code>00d2139</code> (unchanged contract snapshot).</p><a href="../reference/ui-library-integration-guide.html">Read the integration and rollout guide →</a></footer></main>
<dialog id="image-dialog" aria-label="Full-resolution screenshot"><button type="button" id="close-image">Close preview ×</button><img alt=""></dialog><script src="../assets/ui-review.js?v=${jsVersion}"></script></body></html>\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(await readFile(path.join(root, 'data/ui-integration-verification.json'), 'utf8'));
  validateEvidence(data);
  for (const screen of data.screens) for (const side of ['before', 'after']) if (screen[side]) await stat(path.join(root, 'site/assets/ui-integration', screen[side].file));
  const html = renderVerification(data);
  const output = path.join(root, 'content/ui-library-verification.html');
  if (process.argv.includes('--check')) {
    if (await readFile(output, 'utf8') !== html) throw new Error('Verification HTML is stale; run npm run build:ui-verification');
    console.log(`Verified generated review: ${data.screens.length} screens, all capture assets present.`);
  } else {
    await writeFile(output, html);
    console.log(`Generated review: ${data.screens.length} screens.`);
  }
}
