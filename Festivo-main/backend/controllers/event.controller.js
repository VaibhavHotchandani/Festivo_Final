const queries = require("../database/queries");
const { wrap, idParam, posInt, httpError, getOwnedEvent } = require("./shared");

async function listEvents(req, res) {
  const search = String(req.query.q || "").trim();
  const festId = req.query.fest_id === undefined ? undefined : posInt(req.query.fest_id, "Invalid fest_id");
  res.json({ events: await queries.listEvents(search, festId) });
}

async function myEvents(req, res) {
  const input = req.query.min_registrations;
  const minimum = input === undefined || input === "0" ? 0 : posInt(input, "Enter a positive minimum registration count");
  res.json({ events: await queries.listOrganizerEvents(req.user.user_id, minimum) });
}

async function getEvent(req, res) {
  const id = idParam(req);
  const event = await queries.findEvent(id);
  if (!event) throw httpError(404, "Event not found");
  const schedule = await queries.listEventRounds(id);
  res.json({ event, schedule });
}

async function createEvent(req, res) {
  const result = await queries.insertEvent(req.body, req.user.user_id);
  res.json({
    message: "Event created",
    event_id: result.insertId
  });
}

async function updateEvent(req, res) {
  const id = idParam(req);
  await getOwnedEvent(id, req.user.user_id);
  await queries.updateEvent(id, req.body);
  res.json({ message: "Event updated" });
}

async function deleteEvent(req, res) {
  const id = idParam(req);
  await getOwnedEvent(id, req.user.user_id);
  await queries.deleteEvent(id);
  res.json({ message: "Event deleted" });
}

async function eventRegistrations(req, res) {
  const id = idParam(req);
  await getOwnedEvent(id, req.user.user_id);
  const registrations = await queries.listEventRegistrations(id);
  res.json({ registrations });
}

async function leaderboard(req, res) {
  const id = idParam(req);
  await getOwnedEvent(id, req.user.user_id);
  const leaderboard = await queries.listLeaderboard(id);
  res.json({ leaderboard });
}

async function eventFeedback(req, res) {
  const id = idParam(req);
  await getOwnedEvent(id, req.user.user_id);
  const feedback = await queries.listVisibleFeedback(id);
  const summary = await queries.readFeedbackSummary(id);
  res.json({ feedback, ...summary });
}
module.exports = wrap({
  listEvents,
  myEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  eventRegistrations,
  leaderboard,
  eventFeedback
});
