


const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const extend = require("../tailwind.config.js").theme.extend;
const tokens = require("../design/tokens.json");
const iconSource = fs.readFileSync(path.join(root, "_includes/macros/icons.njk"), "utf8");

module.exports = {
  extend,
  tokens: tokens.entries,
  tokenSource: tokens.sourceUrl,
  provenance: tokens.entries.reduce((n, t) => ({ ...n, [t.provenance]: (n[t.provenance] || 0) + 1 }), {}),
  icons: [...iconSource.matchAll(/name == "([^"]+)"/g)].map((m) => m[1]),
};
