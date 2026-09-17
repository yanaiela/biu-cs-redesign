// Checks every external link in index.html and he/index.html.
//
//   node tools/check-links.mjs
//
// Exits non-zero if a link is dead, so CI can catch rot. Sites that block
// automated requests answer 403/405 to a bot but work in a browser, so those
// are reported as "blocked" and don't fail the run.
import fs from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const FILES = ['index.html', 'he/index.html'];
const UA = 'Mozilla/5.0 (compatible; biu-cs-redesign link check)';
const TIMEOUT = 25000;
const BLOCKED = new Set([401, 403, 405, 429]);

const links = new Map();
for (const file of FILES) {
  const html = fs.readFileSync(ROOT + file, 'utf8');
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const url = m[1].replace(/&amp;/g, '&');
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\/?$/.test(url)) continue; // preconnect hints
    if (!links.has(url)) links.set(url, new Set());
    links.get(url).add(file);
  }
}

async function check(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    return { url, status: res.status, final: res.url };
  } catch (e) {
    return { url, status: 'ERROR', detail: String(e.message || e).slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

const urls = [...links.keys()];
const results = [];
const CONCURRENCY = 8;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  let u;
  while ((u = urls.pop())) results.push(await check(u));
}));

// Some university pages sit behind a bot check that redirects robots to a
// validation host; that is not link rot, so it counts as "blocked".
const isBotCheck = r => r.final && /validate\.perfdrive\.com/.test(r.final);
const dead = results.filter(r => r.status === 'ERROR' || (typeof r.status === 'number' && r.status >= 400 && !BLOCKED.has(r.status)));
const blocked = results.filter(r => BLOCKED.has(r.status) || isBotCheck(r));
const moved = results.filter(r => !isBotCheck(r) && r.final && r.final !== r.url && r.final !== r.url + '/');

console.log(`checked ${results.length} links in ${FILES.join(', ')}`);
if (moved.length) {
  console.log(`\n${moved.length} redirected (consider updating):`);
  for (const r of moved) console.log(`  ${r.url}\n    -> ${r.final}`);
}
if (blocked.length) {
  console.log(`\n${blocked.length} blocked automated requests (check by hand if in doubt):`);
  for (const r of blocked) console.log(`  ${r.status} ${r.url}`);
}
if (dead.length) {
  console.log(`\n${dead.length} BROKEN:`);
  for (const r of dead) console.log(`  ${r.status} ${r.url} [${[...links.get(r.url)].join(', ')}]${r.detail ? ' ' + r.detail : ''}`);
  process.exit(1);
}
console.log('\nno broken links');
