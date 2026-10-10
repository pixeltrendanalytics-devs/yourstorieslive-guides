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
    else if (entry.name.endsWith('.html')) {
      pages++;
      const html = await readFile(file, 'utf8');
      if (!/<title>.+<\/title>/.test(html)) failures.push(`Missing title: ${file}`);
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
      if (new Set(ids).size !== ids.length) failures.push(`Duplicate IDs: ${file}`);
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
if (failures.length) throw new Error(failures.join('\n'));
console.log(`Verified ${pages} HTML pages and ${links} local links/assets; no duplicate IDs or script syntax errors.`);
