const router = require("express").Router();
const c = require("../controllers/stall.controller");

router.get("/", c.listStalls); 

module.exports = router;
