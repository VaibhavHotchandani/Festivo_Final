const router = require("express").Router();
const c = require("../controllers/payment.controller");
const allowRoles = require("../middleware/role.middleware");
router.get("/", allowRoles("organizer"), c.listPayments);
router.patch("/:id/mark-received", allowRoles("organizer"), c.markReceived);
router.post("/demo", allowRoles("student"), c.demoPay);
module.exports = router;
