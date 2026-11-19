const router = require("express").Router();
const student = require("../middleware/role.middleware")("student");
const c = require("../controllers/feedback.controller");
router.get("/me", student, c.mine);
router.post("/", student, c.submit);
module.exports = router;
