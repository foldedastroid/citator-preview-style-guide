










const fs = require("node:fs");
const path = require("node:path");
const addFilters = require("./tools/filters.cjs");
const { groups } = require("./_data/guide.js");

const groupIndex = (page) => {
  const i = groups.findIndex((g) => g.key === page.data.group);
  return i < 0 ? groups.length : i;
};

module.exports = function (eleventyConfig) {
  addFilters(eleventyConfig);
  eleventyConfig.addPassthroughCopy("assets/js");
  eleventyConfig.addPassthroughCopy("assets/fonts");
  eleventyConfig.addPassthroughCopy("assets/guide");
  eleventyConfig.addPassthroughCopy({
    "node_modules/@alpinejs/csp/dist/cdn.min.js": "assets/js/alpine.min.js",
  });


  eleventyConfig.addCollection("guide", (api) =>
    api
      .getFilteredByTag("guide")
      .sort((a, b) => groupIndex(a) - groupIndex(b) || (a.data.order || 0) - (b.data.order || 0))
  );


  eleventyConfig.addFilter("neighbours", (pages, url) => {
    const i = pages.findIndex((p) => p.url === url);
    return { previous: i > 0 ? pages[i - 1] : null, next: i >= 0 && i < pages.length - 1 ? pages[i + 1] : null };
  });



  eleventyConfig.addFilter("opinionById", (opinions, id) =>
    (opinions || []).find((o) => String(o.cluster_id) === String(id))
  );


  eleventyConfig.addFilter("pad", (n) => String(n).padStart(2, "0"));


  eleventyConfig.addFilter("exampleSource", (id) =>
    fs.readFileSync(path.join(__dirname, "_includes/examples", `${id}.njk`), "utf8").trimEnd()
  );


  eleventyConfig.addFilter("sections", (html) =>
    [...String(html).matchAll(/<h2\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => ({
      id: m[1],
      title: m[2].replace(/<[^>]+>/g, "").trim(),
    }))
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "../_includes",
      data: "../_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
