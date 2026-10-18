const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const nunjucks = require('nunjucks');
const vm = require('node:vm');
const { exampleNames, examplePage, exampleInfo } = require('./example-pages.cjs');

const root = path.resolve(__dirname, '..');
const sibling = path.resolve(root, '../citator-demo');
const app = fs.existsSync(path.join(sibling, '_data/index.json')) ? sibling : root;
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(app, '_includes')), { autoescape: true });
for (const [name, filter] of Object.entries(require(path.join(app, 'tools/filters.cjs')).filters)) env.addFilter(name, filter);
const globals = {};
for (const file of fs.readdirSync(path.join(app, '_data')).filter((file) => file.endsWith('.json'))) {
  globals[file.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(app, '_data', file), 'utf8'));
}
globals.allOpinions = require(path.join(app, '_data/allOpinions.js'))();
globals.site = require(path.join(app, '_data/site.js'));
globals.build = { stamp: 'test', date: '2026-10-18' };

function render(id, override = {}) {
  const payload = examplePage(id);
  const { content, data } = matter(payload);
  const context = { ...globals, ...data, page: { url: `/examples/${id}/` }, ...override };
  const body = env.renderString(content, context);
  const html = env.render(data.layout, { ...context, content: body });
  return { payload, data, body, html };
}

for (const id of exampleNames()) {
  test(`copied ${id} page renders with only app templates, filters and data`, () => {
    const { payload, body, html, data } = render(id);
    assert.doesNotMatch(payload, /chartExamples\.|theme\.icons|opinionById|guideStage/);
    assert.ok(body.trim().length > 20);
    assert.match(html, /<html lang="en">/);
    assert.doesNotMatch(body, /This example requires opinion/);
    for (const script of data.scripts || []) assert.ok(fs.existsSync(path.join(app, script)), script);
    if (exampleInfo(id).kind === 'Reader composition') {
      assert.match(body, /x-data="opinionTabs"/);
      assert.match(body, /role="tabpanel"/);
      assert.match(body, /class="opinion-body/);
      const canonicalScripts = matter.read(path.join(app, 'src/opinion.njk')).data.scripts;
      assert.deepEqual(data.scripts, canonicalScripts);
      const positions = [...canonicalScripts, '/assets/js/alpine.min.js'].map((script) => html.indexOf(`src="${script}?`));
      assert.ok(positions.every((position) => position >= 0));
      assert.ok(positions.every((position, index) => index === 0 || position > positions[index - 1]));
      assert.match(html, /alpine\/composables\/highlight\.js/);
    }
    if (id.startsWith('citing-chart')) assert.match(body, /class="cite-chart__table"/);
    if (id === 'evidence-card') assert.match(body, /class="evidence-card"/);
    if (id === 'icons-all') assert.ok((body.match(/<svg/g) || []).length > 20);
    if (id === 'shortcuts-sheet') assert.equal((html.match(/id="shortcuts"/g) || []).length, 1);
    if (id === 'search-suggestions') assert.equal((html.match(/id="opinion-index"/g) || []).length, 1);
    if (id === 'menu-copy-citation') {
      const button = body.match(/<button\b[^>]*class="[^"]*doc-action--main[^"]*"[^>]*>/)[0];
      const attribute = (name) => button.match(new RegExp(`${name}="([^"]*)"`))[1];
      let factory;
      const copied = [];
      const context = {
        document: { addEventListener: (name, callback) => callback() },
        Alpine: { data: (name, callback) => { factory = callback; } },
        window: { isSecureContext: true },
        navigator: { clipboard: { writeText: (value) => { copied.push(value); return Promise.resolve(); } } },
      };
      vm.runInNewContext(fs.readFileSync(path.join(app, 'assets/js/alpine/components/case_actions.js'), 'utf8'), context);
      const controller = factory();
      controller.$el = { dataset: { copy: attribute('data-copy'), done: attribute('data-done') } };
      controller[attribute('x-on:click')]();
      assert.deepEqual(copied, ['Callahan v. Millard County, 494 F.3d 891 (10th Cir. 2007)']);
    }
  });
}

test('opinion-backed copied pages report missing records instead of empty examples', () => {
  for (const id of exampleNames().filter((id) => exampleInfo(id).opinionId)) {
    const { body } = render(id, { allOpinions: [] });
    assert.match(body, /This example requires opinion/);
    assert.doesNotMatch(body, /x-data="opinionTabs"/);
  }
});

test('evidence copy reports a missing row or missing cards on an existing record', () => {
  for (const cited_by of [[], [{}, {}], [{}, { evidence_cards: [] }]]) {
    const { body } = render('evidence-card', { allOpinions: [{ cluster_id: 1425860, cited_by }] });
    assert.match(body, /Choose a record and citing row with evidence/);
  }
});

test('all illustrative chart payloads carry their own rows without guide globals', () => {
  for (const id of ['citing-chart', 'citing-chart-century', 'citing-chart-dense']) {
    const { payload, body } = render(id);
    assert.match(payload, /set exampleRows = \[/);
    assert.match(body, /Illustrative interface fixtures/);
    assert.doesNotMatch(body, /<caption[^>]*>0 citing opinions in this preview/);
    if (id !== 'citing-chart') assert.match(body, /Count links require a corresponding treatment list/);
  }
});

test('toast copy includes the native binding to the actual shared toast API', () => {
  const { payload } = render('toasts');
  assert.match(payload, /document\.addEventListener\('click'/);
  assert.match(payload, /window\.citatorToast\(/);
});

test('built Copy page payloads match the tested exporter for all examples', () => {
  const html = fs.readdirSync(path.join(root, '_site'), { recursive: true })
    .filter((file) => file.endsWith('.html'))
    .map((file) => fs.readFileSync(path.join(root, '_site', file), 'utf8')).join('\n');
  for (const id of exampleNames()) {
    const marker = `id="code-${id}"`;
    const start = html.indexOf(marker);
    assert.ok(start >= 0, marker);
    const codeStart = html.indexOf('<code>', start) + 6;
    const end = html.indexOf('</code>', codeStart);
    const decoded = html.slice(codeStart, end).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value))).replace(/&amp;/g, '&');
    assert.equal(decoded, examplePage(id));
  }
});
