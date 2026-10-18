






const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const site = path.join(root, '_site');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

function resolves(url) {
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  if (!clean) return true;
  const target = path.join(site, clean);
  if (clean.endsWith('/')) return fs.existsSync(path.join(target, 'index.html'));
  return fs.existsSync(target) || fs.existsSync(path.join(target, 'index.html'));
}

test('the site has been built', () => {
  assert.ok(fs.existsSync(path.join(site, 'index.html')), 'run npm run build first');
});

test('every guide page and the app pages are built', () => {
  const pages = fs.readdirSync(path.join(root, 'src/guide')).filter((f) => f.endsWith('.njk'));
  assert.ok(pages.length > 20);
  for (const page of ['index.html', 'search/index.html', 'about/index.html', '404.html', 'assets/opinions.json']) {
    assert.ok(fs.existsSync(path.join(site, page)), page);
  }
  assert.ok(fs.readdirSync(path.join(site, 'opinion')).length > 0);
});

test('every example is used, and every used example exists', () => {
  const examples = new Set(
    fs.readdirSync(path.join(root, '_includes/examples')).map((f) => f.replace(/\.njk$/, ''))
  );
  const used = new Set();
  for (const file of fs.readdirSync(path.join(root, 'src/guide'))) {
    const source = fs.readFileSync(path.join(root, 'src/guide', file), 'utf8');
    for (const m of source.matchAll(/set ex = "([^"]+)"/g)) used.add(m[1]);
  }
  for (const name of used) assert.ok(examples.has(name), `missing example ${name}`);
  for (const name of examples) assert.ok(used.has(name), `unused example ${name}`);
});

test('every root-relative link and asset resolves', () => {
  const broken = [];
  for (const file of htmlFiles(site)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const m of html.matchAll(/\s(?:href|src|data-src)="(\/[^"]*)"/g)) {
      if (m[1].startsWith('//')) continue;
      if (!resolves(m[1])) broken.push(`${path.relative(site, file)} → ${m[1]}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('guide pages link to their neighbours', () => {
  const html = fs.readFileSync(path.join(site, 'start/using-components/index.html'), 'utf8');
  assert.match(html, /rel="prev"/);
  assert.match(html, /rel="next"/);
  const first = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
  assert.doesNotMatch(first, /rel="prev"/);
});
