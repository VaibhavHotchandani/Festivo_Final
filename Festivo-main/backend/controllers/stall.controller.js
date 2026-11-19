const queries = require("../database/queries");
const { wrap } = require("./shared");

const listStalls = async (req, res) =>
  res.json({ stalls: await queries.listStalls() });

module.exports = wrap({ listStalls });
