const router = require("express").Router();
const c = require("../controllers/registration.controller");

router.use(require("../middleware/role.middleware")("student"));
router.post("/", c.create);
router.get("/me", c.mine);
router.get("/activity", c.activity);
router.patch("/:id/cancel", c.cancel);

module.exports = router;
