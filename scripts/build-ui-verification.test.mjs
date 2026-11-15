import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateEvidence, renderVerification } from './build-ui-verification.mjs';

const shot = side => ({ side, file: `dashboard-${side}.jpg`, width: 1440, height: 1000, capturedAt: '2026-11-15T01:00:00Z', path: '/dashboard', rendered: {} });
const fixture = () => ({ sourceRevision: '62a7e286', libraryRevision: '9401d27', capturedOn: '15 November 2026', screens: [{ id: 'dashboard', title: 'Dashboard', device: 'Desktop', group: 'Member', before: shot('before'), after: shot('after'), note: 'Same account', checked: 'Navigation' }], bundles: [], manualChecks: [], limitations: [] });

test('requires paired captures with matching viewport and truthful side', () => {
  for (const mutate of [d => delete d.screens[0].before, d => d.screens[0].before.width = 390, d => d.screens[0].after.side = 'before']) {
    const data = fixture(); mutate(data); assert.throws(() => validateEvidence(data));
  }
});
test('rejects duplicate IDs, path traversal and missing capture metadata', () => {
  for (const mutate of [d => d.screens.push(d.screens[0]), d => d.screens[0].after.file = '../../secret.jpg', d => delete d.screens[0].after.capturedAt]) {
    const data = fixture(); mutate(data); assert.throws(() => validateEvidence(data));
  }
});
test('labels an unpaired theme view explicitly and does not count it as a pair', () => {
  const data = fixture(); delete data.screens[0].before; data.screens[0].candidateOnly = true;
  const html = renderVerification(data);
  assert.match(html, /Candidate only/); assert.match(html, /<strong>0<\/strong><span>before \/ after pairs/);
});
test('escapes captured labels and provides accessible direct image links', () => {
  const data = fixture(); data.screens[0].title = '<script>untrusted</script>';
  const html = renderVerification(data);
  assert.ok(!html.includes('<script>untrusted'));
  assert.match(html, /&lt;script&gt;untrusted/);
  assert.match(html, /loading="lazy"/); assert.match(html, /aria-label="Enlarge before/);
  assert.match(html, /href="\.\.\/assets\/ui-integration\/dashboard-after.jpg"/);
});
