const queries = require("../database/queries");
const { wrap } = require("./shared");

async function overview(req, res) {
  const stats = await queries.readOverview();
  const fests = await queries.listFestEventCounts();
  res.json({ stats, fests });
}

async function demoUsers(req, res) {
  const users = await queries.listDemoUsers();
  res.json({ users });
}

module.exports = wrap({ overview, demoUsers });
