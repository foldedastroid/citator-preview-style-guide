# Citator preview style guide

This is my [style guide](https://github.com/foldedastroid/citator-preview-style-guide) for my [Citator preview fork](https://github.com/foldedastroid/citator-demo). I keep the live components, copyable Nunjucks examples, design tokens and implementation notes together so I can reuse the interface consistently.

The guide and preview derive from the [Free Law Project Citator demo](https://github.com/freelawproject/citator-demo). This is not an official Free Law Project release. Original attribution and retained source and font notices are in [ATTRIBUTION.md](ATTRIBUTION.md).

## Run locally

Install Node 20 or later, then run:

```sh
npm ci
npm run build
npm test
npm run dev
```

Open [localhost:8080](http://localhost:8080/). The guide builds independently with Node: frozen and explicitly illustrative fixtures are included, so no Python installation or app checkout is needed. The app search preview is at `/search/`.

For static hosting, serve `_site/` as the HTTP root. Asset paths are root-relative. Plain Python serving works for existing pages; a host must map missing routes to `404.html` while retaining the requested path for the preview's opinion recovery page.

## Use a component

Open its guide page, try the example and choose **Copy page**. Save the complete payload as `src/examples/<name>.njk` in the app and build. It includes front matter, required page scripts, imports and data setup. When moving its body into an existing template, retain that setup and merge its scripts; front matter belongs on a page, not inside an include.

Record-backed exports explicitly select a preview id from `allOpinions`; choose an available record for your collection. Missing records or evidence show a setup message. Chart exports carry labelled illustrative literal rows. Reader-dependent fragments export the actual reader composition with its controllers, rather than a fragment with unresolved callbacks. Visual-state examples are labelled and require your own application actions. These are Eleventy/Nunjucks components using Tailwind 3 and Alpine CSP; they do not require another runtime framework.

`src/guide/` contains the guide pages, `_includes/examples/` the copyable examples and `assets/guide/` the guide shell. The app's own templates, macros, controllers, styles and fonts are included alongside them. `tailwind.config.js` is the theme source; `design/tokens.json` records explicit values and their pinned CourtListener comparison. The guide's red accent CSS is generated from those primary theme values.

## Keep shared source aligned

I edit the shared interface in the app, then sync it into the guide. With the app cloned beside this repository as `citator-demo`, build its fixture data first:

```sh
cd ../citator-demo
npm ci
uv sync --group dev
CITATOR_DEMO_DATA=mock npm run build:data
cd ../citator-preview-style-guide
node tools/sync-app.cjs ../citator-demo
node tools/sync-app.cjs ../citator-demo --check
npm run build
npm test
```

The optional app data build needs Python 3.13 or later and [uv](https://docs.astral.sh/uv/). The guide build does not. The `npm run sync` and `npm run check:sync` shortcuts use the default sibling name `citator-demo`; pass another path to `node tools/sync-app.cjs` for a differently named checkout. `_data/site.js` deliberately keeps the guide's `/search/` home path while sharing the app's feedback URL.

## Checks and scope

`npm test` checks the built guide's pages, examples, internal links and navigation, and renders every exported Copy page using only app templates, filters and globals. Tests cover missing records/evidence, embedded chart fixtures, copied script paths and the exact built clipboard payload. They do not replace browser interaction checks. The fixtures demonstrate behavior and do not establish legal accuracy, comprehensive treatment coverage or a case's current status.

## License

The original [BSD 2-Clause license](LICENSE), CourtListener source notice under `design/licenses/`, and bundled fonts' OFL notices are retained. Keep those notices with redistributed files.
