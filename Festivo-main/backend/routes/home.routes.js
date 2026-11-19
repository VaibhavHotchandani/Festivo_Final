const router = require("express").Router();
const c = require("../controllers/home.controller");
router.get("/overview", c.overview);
router.get("/demo-users", c.demoUsers);
module.exports = router;
