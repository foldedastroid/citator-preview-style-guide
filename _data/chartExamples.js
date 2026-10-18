



const { chartBreakdown } = require("../tools/chart-data.cjs");
const { centuryRows, denseRows, sparseRows } = require("../tools/chart-examples.cjs");

const build = (rows, id) => ({ ...chartBreakdown(rows, `chart-${id}`), id });

module.exports = {
  sparse: build(sparseRows(), "sparse"),
  century: build(centuryRows(), "century"),
  dense: build(denseRows(), "dense"),
};
