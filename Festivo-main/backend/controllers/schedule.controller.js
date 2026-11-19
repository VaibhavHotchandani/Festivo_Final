const queries = require("../database/queries");
const { httpError, wrap, posInt, idParam, text, isDate, isTime, hms, getOwnedEvent } = require("./shared");

async function listSchedule(req, res) {
  const eventId = req.query.event_id === undefined ? undefined : posInt(req.query.event_id, "Invalid event_id");
  res.json({ schedule: await queries.listSchedule(eventId) });
}

const listVenues = async (req, res) => res.json({ venues: await queries.listVenues() });
const listFests = async (req, res) => res.json({ fests: await queries.listFestsWithSponsors() });

async function validateRound(body, userId) {
  const b = body || {};
  const eventId = posInt(b.event_id, "event_id is required");
  const venueId = posInt(b.venue_id, "Choose a venue");
  const roundName = text(b.round_name, "Round name", 100);
  const date = String(b.event_date || ""), start = String(b.start_time || ""), end = String(b.end_time || "");
  if (!isDate(date)) throw httpError(400, "Enter a valid date");
  if (!isTime(start) || !isTime(end)) throw httpError(400, "Enter valid start and end times");

  const event = await getOwnedEvent(eventId, userId);
  if (date < event.fest_start || date > event.fest_end)
    throw httpError(400, `Date must fall within the fest (${event.fest_start} to ${event.fest_end})`);
  return { event_id: eventId, venue_id: venueId, round_name: roundName, event_date: date, start_time: hms(start), end_time: hms(end) };
}

// Serialize writes targeting the same venue before the trigger checks for overlaps.
function withVenueLock(venueId, write) {
  return queries.withTransaction(async (conn) => {
    if (!await queries.lockVenue(conn, venueId)) throw httpError(404, "Venue not found");
    return write(conn);
  });
}

async function checkRoundOwner(id, userId) {
  const round = await queries.findRound(id);
  if (!round) throw httpError(404, "Round not found");
  await getOwnedEvent(round.event_id, userId);
}

async function createRound(req, res) {
  const d = await validateRound(req.body, req.user.user_id);
  const result = await withVenueLock(d.venue_id, conn => queries.insertRound(conn, d));
  res.status(201).json({ message: "Round added", schedule_id: result.insertId });
}

async function updateRound(req, res) {
  const id = idParam(req);
  await checkRoundOwner(id, req.user.user_id);
  const d = await validateRound(req.body, req.user.user_id);
  const result = await withVenueLock(d.venue_id, conn => queries.updateRound(conn, id, d));
  if (!result.affectedRows) throw httpError(404, "Round not found");
  res.json({ message: "Round updated" });
}

async function deleteRound(req, res) {
  const id = idParam(req);
  await checkRoundOwner(id, req.user.user_id);
  await queries.deleteRound(id);
  res.json({ message: "Round removed" });
}

module.exports = wrap({ listSchedule, listVenues, listFests, createRound, updateRound, deleteRound });
