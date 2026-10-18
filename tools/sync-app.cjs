














const fs = require('node:fs');
const path = require('node:path');

const SHARED = [
  'tailwind.config.js',
  '_includes/layouts',
  '_includes/macros',
  '_includes/partials',
  'assets/css',
  'assets/js',
  'assets/fonts',
  'design',
  'tools/chart-data.cjs',
  'tools/chart-examples.cjs',
  'tools/filters.cjs',
  '_data/allOpinions.js',
  '_data/build.js',
  '_data/court_abbr.js',
  'src/index.njk',
  'src/opinion.njk',
  'src/about.njk',
  'src/404.njk',
  'src/opinions.json.njk',
];
const FIXTURES = ['_data/opinions'];
const FIXTURE_JSON_DIR = '_data';

const here = path.resolve(__dirname, '..');
const [appArg, flag] = process.argv.slice(2);
if (!appArg) {
  console.error('usage: node tools/sync-app.cjs <path to citator-app> [--check]');
  process.exit(2);
}
const app = path.resolve(appArg);
const check = flag === '--check';

function files(base, rel) {
  const full = path.join(base, rel);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [rel];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((entry) => entry.name !== '.DS_Store')
    .flatMap((entry) => files(base, path.join(rel, entry.name)));
}

function fixtureJson(base) {
  const dir = path.join(base, FIXTURE_JSON_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(FIXTURE_JSON_DIR, name));
}

const roots = [...SHARED, ...FIXTURES];
const wanted = new Set([...roots.flatMap((rel) => files(app, rel)), ...fixtureJson(app)]);
const present = new Set([...roots.flatMap((rel) => files(here, rel)), ...fixtureJson(here)]);

if (!fixtureJson(app).includes(path.join('_data', 'index.json'))) {
  console.error(`${app} has no _data/index.json: run CITATOR_DEMO_DATA=mock npm run build:data there first.`);
  process.exit(2);
}

const changed = [...wanted].filter((rel) => {
  const target = path.join(here, rel);
  return !fs.existsSync(target) || !fs.readFileSync(target).equals(fs.readFileSync(path.join(app, rel)));
});
const removed = [...present].filter((rel) => !wanted.has(rel));

if (check) {
  for (const rel of changed) console.log(`differs  ${rel}`);
  for (const rel of removed) console.log(`extra    ${rel}`);
  console.log(changed.length + removed.length ? `${changed.length + removed.length} files out of sync with ${app}` : 'In sync.');
  process.exit(changed.length + removed.length ? 1 : 0);
}

for (const rel of removed) fs.rmSync(path.join(here, rel));
for (const rel of changed) {
  fs.mkdirSync(path.dirname(path.join(here, rel)), { recursive: true });
  fs.copyFileSync(path.join(app, rel), path.join(here, rel));
}
console.log(`Copied ${changed.length} and removed ${removed.length} of ${wanted.size} shared files from ${app}.`);
