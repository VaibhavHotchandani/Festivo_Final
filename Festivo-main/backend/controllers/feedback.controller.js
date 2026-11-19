const queries = require("../database/queries");
const { httpError, wrap, posInt, onDup, getStudentId } = require("./shared");

async function submit(req, res) {
  const b = req.body || {};
  const registrationId = posInt(b.registration_id, "registration_id is required");
  const rating = Number(b.rating);
  const comments = String(b.comments || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw httpError(400, "Rating must be between 1 and 5");
  if (comments.length > 1000) throw httpError(400, "Comments are too long (max 1000 characters)");

  const studentId = await getStudentId(req.user.user_id);
  const reg = await queries.findRegistrationForFeedback(registrationId);
  if (!reg) throw httpError(404, "Registration not found");
  if (reg.student_id !== studentId) throw httpError(403, "This is not your registration");
  if (reg.status !== "confirmed") throw httpError(409, "Feedback is only open for confirmed registrations");

  await onDup("You have already given feedback for this registration", () =>
    queries.insertFeedback(reg.event_id, registrationId, rating, comments ));
  res.status(201).json({ message: "Thanks for your feedback!" });
}

async function mine(req, res) {
  const studentId = await getStudentId(req.user.user_id);
  const feedback = await queries.listStudentFeedback(studentId);
  res.json({ feedback });
}

module.exports = wrap({ submit, mine });
