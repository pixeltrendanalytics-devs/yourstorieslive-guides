import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const failures = [];
let pages = 0;
let links = 0;
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.name.endsWith('.js')) {
      try { new Function(await readFile(file, 'utf8')); } catch (error) { failures.push(`Browser script syntax in ${file}: ${error.message}`); }
    }
    else if (entry.name.endsWith('.html')) {
      pages++;
      const html = await readFile(file, 'utf8');
      if (!/<title>.+<\/title>/.test(html)) failures.push(`Missing title: ${file}`);
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
      if (new Set(ids).size !== ids.length) failures.push(`Duplicate IDs: ${file}`);
      for (const match of html.matchAll(/\bhref=["']#([^"']+)["']/g)) {
        if (!ids.includes(decodeURIComponent(match[1]))) failures.push(`Missing section: #${match[1]} in ${file}`);
      }
      for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
        const url = match[1].replace(/&amp;/g, '&');
        if (/^(?:https?:|mailto:|data:|javascript:)/i.test(url)) continue;
        const [pathname] = url.split(/[?#]/);
        if (!pathname || pathname.startsWith('/yourstorieslive-guides/')) continue;
        const target = path.resolve(path.dirname(file), decodeURIComponent(pathname));
        if (!target.startsWith(`${root}${path.sep}`)) { failures.push(`Path escapes site: ${url} in ${file}`); continue; }
        links++;
        try { await stat(target); } catch { failures.push(`Broken link: ${url} in ${file}`); }
      }
      for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
        try { new Function(match[1]); } catch (error) { failures.push(`Script syntax in ${file}: ${error.message}`); }
      }
    }
  }
}
await walk(root);
const snapshot = JSON.parse(await readFile(path.join(root, '..', 'data', 'api-catalogue.json'), 'utf8'));
const apiHtml = await readFile(path.join(root, 'reference', 'api-reference.html'), 'utf8');
const operations = snapshot.groups.flatMap(group => group.operations);
const ids = [...apiHtml.matchAll(/<details class="api-endpoint" id="([^"]+)"/g)].map(match => match[1]);
if (ids.length !== operations.length) failures.push('The API page does not contain every snapshot operation');
for (const operation of operations) {
  const id = `api-${operation.method.toLowerCase()}-${operation.path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  if (!ids.includes(id)) failures.push(`Missing API entry: ${operation.method} ${operation.path}`);
}
const findOperation = (method, route) => operations.find(operation => operation.method === method && operation.path === route);
const signIn = findOperation('POST', '/api/v1/auth/sign-in');
if (signIn?.status !== 200 || signIn.auth !== 'Public entry point' || !signIn.parameters.some(input => input.fields.some(field => field.name === 'password' && field.required))) failures.push('Sign-in documentation is missing its public entry point / required password contract');
const upload = findOperation('POST', '/api/v1/media-assets/uploads');
if (!upload?.binary || !upload.parameters.some(input => input.location === 'Query' && input.fields.some(field => field.name === 'destination' && field.required))) failures.push('Raw upload documentation must preserve query metadata and binary body');
const listMedia = findOperation('GET', '/api/v1/media-assets');
if (!listMedia?.parameters.some(input => input.fields.some(field => field.name === 'datePeriod' && field.required) && input.fields.some(field => field.name === 'sortBy'))) failures.push('Media listing lost its required group key or inherited filter fields');
const createStory = findOperation('POST', '/api/v1/entities');
if (!createStory?.parameters.some(input => input.fields.some(field => field.name === 'occurred' && field.fields.some(child => child.name === 'lifeStage' && child.required)))) failures.push('Story documentation lost its nested date input');
const callback = findOperation('GET', '/api/v1/social-imports/:provider/callback');
if (callback?.responseKind !== 'Popup HTML') failures.push('Social import callback must be documented as HTML, not JSON');
if (!findOperation('GET', '/api/v1/auth/oauth/:provider')?.aliases.includes('/api/auth/:provider')) failures.push('OAuth compatibility alias is missing');
if (failures.length) throw new Error(failures.join('\n'));
console.log(`Verified ${pages} HTML pages and ${links} local links/assets; no duplicate IDs or script syntax errors.`);
console.log(`Checked ${operations.length} API entries, inherited/nested inputs, upload and callback exceptions.`);
