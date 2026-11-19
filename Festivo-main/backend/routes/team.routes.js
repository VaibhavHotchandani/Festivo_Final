const router = require("express").Router();
const c = require("../controllers/team.controller");
const allowRoles = require("../middleware/role.middleware");
const student = allowRoles("student");

router.get("/mine", student, c.mine);
router.post("/", student, c.create);
router.post("/:id/members", student, c.addMember);
router.delete("/:id/members/:studentId", student, c.removeMember);
router.get("/:id", allowRoles(), c.getTeam); 

module.exports = router;
