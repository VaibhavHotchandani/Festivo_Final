const router = require("express").Router();
const c = require("../controllers/judge.controller");
const allowRoles = require("../middleware/role.middleware");
const judge = allowRoles("event_judge");

router.get("/", allowRoles("organizer"), c.listJudgeUsers);   // pool of judge accounts to assign
router.get("/events", judge, c.myEvents);
router.get("/events/:eventId/registrations", judge, c.eventRegistrations);
router.post("/scores", judge, c.submitScore);

module.exports = router;
