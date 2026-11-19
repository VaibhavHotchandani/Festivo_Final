const queries = require("../database/queries");
const { httpError, wrap, posInt, idParam, text, onDup, getOwnedEvent } = require("./shared");

const listJudgeUsers = async (req, res) =>
  res.json({ judges: await queries.listJudgeAccounts() });

async function listEventJudges(req, res) {
  const id = idParam(req);
  await getOwnedEvent(id, req.user.user_id);
  res.json({ judges: await queries.listEventJudges(id) });
}

async function assignJudge(req, res) {
  const id = idParam(req);
  await getOwnedEvent(id, req.user.user_id);
  const userId = posInt((req.body || {}).user_id, "user_id is required");
  const result = await onDup("That judge is already assigned to this event", () => queries.insertJudgeAssignment(userId, id));
  if (!result.affectedRows) throw httpError(404, "User not found");
  res.status(201).json({ message: "Judge assigned" });
}

async function removeJudge(req, res) {
  const id = idParam(req), judgeId = idParam(req, "judgeId");
  await getOwnedEvent(id, req.user.user_id);
  if (await queries.findScoreForAssignment(judgeId))
    throw httpError(409, "This judge has already submitted scores and cannot be removed");
  const r = await queries.deleteJudgeAssignment(judgeId, id);
  if (!r.affectedRows) throw httpError(404, "Assignment not found");
  res.json({ message: "Judge removed" });
}

async function assignmentFor(req, eventId) {
  const a = await queries.findJudgeAssignment(req.user.user_id, eventId);
  if (!a) throw httpError(403, "You are not assigned to this event");
  return a.judge_id;
}

const myEvents = async (req, res) =>
  res.json({ events: await queries.listAssignedEvents(req.user.user_id) });

async function eventRegistrations(req, res) {
  const eventId = idParam(req, "eventId");
  const judgeId = await assignmentFor(req, eventId);
  const people = await queries.listConfirmedParticipants(eventId);
  const scores = await queries.listJudgeScores(judgeId, eventId);
  res.json({ registrations: people.map((p) => {
    const mine = scores.filter((s) => s.registration_id === p.registration_id).map((s) => ({ criteria: s.criteria, score: Number(s.score) }));
    return { ...p, scores: mine, total_score: mine.reduce((sum, s) => sum + s.score, 0) };
  }) });
}

async function submitScore(req, res) {
  const b = req.body || {};
  const eventId = posInt(b.event_id, "event_id and registration_id are required");
  const registrationId = posInt(b.registration_id, "event_id and registration_id are required");
  const criteria = text(b.criteria, "Criteria", 150);
  const score = String(b.score ?? "").trim() ? Number(b.score) : NaN;
  if (!Number.isFinite(score) || score < 0 || score > 100) throw httpError(400, "Score must be between 0 and 100");

  const judgeId = await assignmentFor(req, eventId);
  const result = await queries.upsertScore(judgeId, registrationId, eventId, criteria, score);
  if (!result.affectedRows) throw httpError(404, "That registration does not belong to this event");
  res.json({ message: "Score saved" });
}

module.exports = wrap({ listJudgeUsers, listEventJudges, assignJudge, removeJudge, myEvents, eventRegistrations, submitScore });
