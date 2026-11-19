const queries = require("../database/queries");

const httpError = (status, message) => Object.assign(new Error(message), { status });

const wrap = (controllers) =>
  Object.fromEntries(Object.entries(controllers).map(([name, fn]) => [name, (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)]));

function posInt(value, message = "Invalid id") {
  const n = typeof value === "string" && !/^\d+$/.test(value) ? NaN : Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw httpError(400, message);
  return n;
}
const idParam = (req, name = "id") => posInt(req.params[name]);

function text(value, label, max) {
  const s = String(value || "").trim();
  if (!s || s.length > max) throw httpError(400, `${label} is required (max ${max} characters)`);
  return s;
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s);
const hms = (s) => (s.length === 5 ? s + ":00" : s);

async function onDup(message, work) {
  try { return await work(); } catch (err) { throw err.code === "ER_DUP_ENTRY" ? httpError(409, message) : err; }
}

async function getStudentId(userId) {
  const s = await queries.findStudentByUserId(userId);
  if (!s) throw httpError(403, "This account has no student profile");
  return s.student_id;
}

async function getOwnedEvent(eventId, userId, conn) {
  const e = await queries.findEventOwner(eventId, conn);
  if (!e) throw httpError(404, "Event not found");
  if (e.organizer_user_id !== userId) throw httpError(403, "You do not own this event");
  return e;
}

module.exports = { httpError, wrap, posInt, idParam, text, isDate, isTime, hms, onDup, getStudentId, getOwnedEvent };
