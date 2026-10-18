const fs = require('node:fs');
const path = require('node:path');
const { sparseRows, centuryRows, denseRows } = require('./chart-examples.cjs');

const root = path.resolve(__dirname, '..');
const opinions = {
  'allocation-citing': 1425860,
  'evidence-card': 1425860,
  'history-trail': 1425860,
  history: 1425860,
  'later-courts-list': 1425860,
  'narrow-by': 1425860,
  'opinion-text': 145918,
  'status-rows': 1425860,
};
const hosts = new Set(['allocation-citing', 'history-trail', 'history', 'later-courts-list', 'narrow-by', 'opinion-text', 'status-rows']);
const fixtures = {
  'citing-chart': ['sparse', sparseRows],
  'citing-chart-century': ['century', centuryRows],
  'citing-chart-dense': ['dense', denseRows],
};
const scripts = {
  'citing-chart': ['opinion_views', 'treatment_list'],
  'citing-chart-century': ['opinion_views'],
  'citing-chart-dense': ['opinion_views'],
  'list-toolbar': ['treatment_list'],
  'menu-copy-citation': ['case_actions'],
  pagination: ['search_filter'],
};
const visual = new Set(['buttons', 'empty-states', 'fields', 'status-states']);
const hostScripts = ['opinion_tabs', 'treatment_list', 'opinion_views', 'case_actions'];

function exampleNames() {
  return fs.readdirSync(path.join(root, '_includes/examples')).filter((name) => name.endsWith('.njk')).map((name) => name.slice(0, -4));
}

function exampleInfo(id) {
  if (!exampleNames().includes(id)) throw new Error(`Unknown example: ${id}`);
  return {
    id,
    opinionId: opinions[id] || null,
    kind: hosts.has(id) ? 'Reader composition' : visual.has(id) ? 'Visual states' : 'Example page',
    note: hosts.has(id)
      ? 'Copy exports the actual reader composition: its tabs, panel and callbacks share opinionTabs. The isolated fragment above remains in the named example file.'
      : fixtures[id]
        ? `Copy includes explicitly illustrative rows and uses the app chartBreakdown filter; no guide fixture loader is required.${id === 'citing-chart' ? '' : ' This scale preview includes axis, date and pan controls; count filtering requires a corresponding treatment list, supplied in the first chart example.'}`
        : visual.has(id)
          ? 'These controls demonstrate visual states. Copy does not attach search, filtering or citation actions to the static controls.'
          : 'Copy includes a complete page with its imports, setup and required page scripts.',
  };
}

function selectOpinion(id, body) {
  return `{% set exampleOpinionId = "${id}" %}
{% set opinion = null %}
{% for record in allOpinions %}
  {% if record.cluster_id | string == exampleOpinionId %}{% set opinion = record %}{% endif %}
{% endfor %}
{% if opinion %}
${body}
{% else %}
<p role="status">This example requires opinion {{ exampleOpinionId }} in allOpinions. Set exampleOpinionId to an available record with the data this component needs.</p>
{% endif %}`;
}

function toastBinding() {
  return `<script>
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-toast]');
  if (!button || !window.citatorToast) return;
  const label = button.dataset.toastAction;
  window.citatorToast({
    title: button.dataset.toast,
    message: button.dataset.toastMessage || '',
    intent: button.dataset.toastIntent || 'neutral',
    duration: button.dataset.toastDuration === undefined ? 4000 : Number(button.dataset.toastDuration),
    action: label ? { label, run: () => window.citatorToast({ title: label + ' chosen', intent: 'positive' }) } : null,
  });
});
</script>`;
}

function examplePage(id) {
  const info = exampleInfo(id);
  let body = fs.readFileSync(path.join(root, '_includes/examples', `${id}.njk`), 'utf8').trim();
  const pageScripts = (hosts.has(id) ? hostScripts : scripts[id] || []).map((name) => `/assets/js/alpine/components/${name}.js`);
  if (hosts.has(id)) {
    body = '{% include "partials/opinion-page.njk" %}';
    pageScripts.push('/assets/js/doc_rail.js');
  }
  if (id === 'expandable') pageScripts.push('/assets/js/expandable.js');
  if (id === 'search-suggestions') {
    pageScripts.push('/assets/js/search_suggest.js');
    body = body.replace(/<script type="application\/json"[\s\S]*?<\/script>\s*/, '');
  }
  if (id === 'shortcuts-sheet') body = body.replace('{% include "partials/shortcuts-sheet.njk" %}', '').trim();
  if (id === 'icons-all') {
    const source = fs.readFileSync(path.join(root, '_includes/macros/icons.njk'), 'utf8');
    const names = [...source.matchAll(/name == "([^"]+)"/g)].map((match) => match[1]);
    body = `{% set exampleIcons = ${JSON.stringify(names)} %}\n${body.replace('theme.icons', 'exampleIcons')}`;
  }
  if (fixtures[id]) {
    const [key, rows] = fixtures[id];
    const data = JSON.stringify(rows(), null, 2);
    body = `<p class="text-sm text-greyscale-600">Illustrative interface fixtures; these rows are not legal records.</p>
{% set exampleRows = ${data} %}
{% set exampleChart = exampleRows | chartBreakdown("chart-${key}", "severity", "citing_court_display", "citing_date_filed") %}
${body.replaceAll(`chartExamples.${key}`, 'exampleChart')}`;
  }
  if (id === 'toasts') body += `\n${toastBinding()}`;
  if (id === 'evidence-card') body = `{% if opinion.cited_by[1] and opinion.cited_by[1].evidence_cards | length %}\n${body}\n{% else %}\n<p role="status">This example needs evidence_cards on opinion.cited_by[1]. Choose a record and citing row with evidence.</p>\n{% endif %}`;
  if (fixtures[id] && id !== 'citing-chart') body = `<p class="text-sm text-greyscale-600">Scale preview: axis, date granularity and horizontal pan work here. Count links require a corresponding treatment list; use the first chart example for that composition.</p>\n${body}`;
  if (info.opinionId) body = selectOpinion(info.opinionId, body);
  if (visual.has(id)) body = `<p class="text-sm text-greyscale-600">Visual states only: connect static controls to your page actions before using them in a flow.</p>\n${body}`;
  const front = ['---', 'layout: layouts/base.njk', `title: ${JSON.stringify(`Example: ${id}`)}`];
  if (hosts.has(id)) front.push('panel: Citator');
  if (pageScripts.length) front.push('scripts:', ...pageScripts.map((script) => `  - ${script}`));
  front.push('---', '', body, '');
  return front.join('\n');
}

module.exports = { exampleNames, exampleInfo, examplePage };
