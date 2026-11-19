const router = require("express").Router();
const ev = require("../controllers/event.controller");
const judge = require("../controllers/judge.controller");
const organizer = require("../middleware/role.middleware")("organizer");

router.get("/", ev.listEvents);                      
router.get("/mine", organizer, ev.myEvents);        
router.get("/:id", ev.getEvent);                     
router.post("/", organizer, ev.createEvent);
router.put("/:id", organizer, ev.updateEvent);        
router.delete("/:id", organizer, ev.deleteEvent);     

router.get("/:id/registrations", organizer, ev.eventRegistrations);
router.get("/:id/leaderboard", organizer, ev.leaderboard);
router.get("/:id/feedback", organizer, ev.eventFeedback);

router.get("/:id/judges", organizer, judge.listEventJudges);
router.post("/:id/judges", organizer, judge.assignJudge);
router.delete("/:id/judges/:judgeId", organizer, judge.removeJudge);

module.exports = router;
