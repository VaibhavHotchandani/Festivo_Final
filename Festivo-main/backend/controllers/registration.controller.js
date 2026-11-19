const queries = require("../database/queries");
const { httpError, wrap, posInt, idParam, getStudentId } = require("./shared");

// The existing page sends a roster name. Resolve it within the captain's scope.
async function resolveTeam(conn, studentId, eventId, teamName) {
  await queries.lockStudent(conn, studentId);
  const team = await queries.lockTeamByCaptain(conn, studentId);
  if (!team) {
    const result = await queries.insertTeam(conn, teamName, studentId, eventId);
    await queries.insertTeamMember(result.insertId, studentId, conn);
    return result.insertId;
  }
  if (team.team_name.toLowerCase() !== teamName.toLowerCase()) {
    throw httpError(409, `You already captain "${team.team_name}". Enter that team name to register.`);
  }
  if (team.event_id !== null && Number(team.event_id) !== eventId) {
    throw httpError(409, "Your team is already assigned to a different event");
  }
  if (team.event_id === null) await queries.assignTeamEvent(conn, team.team_id, eventId);
  return team.team_id;
}

async function create(req, res) {
  const eventId = posInt((req.body || {}).event_id, "event_id is required");
  const teamName = String((req.body || {}).team_name || "").trim().slice(0, 100) || null;
  const studentId = await getStudentId(req.user.user_id);

  const status = await queries.withTransaction(async (conn) => {
    const ev = await queries.lockRegistrationEvent(conn, eventId);
    if (!ev) throw httpError(404, "Event not found");
    if (ev.status !== "open") throw httpError(409, "This event is not open for registration");
    if (ev.closed) throw httpError(409, "The registration deadline has passed");
    if (ev.event_type === "Team" && !teamName) throw httpError(400, "Enter a team name for this team event");

    const existing = await queries.lockExistingRegistration(conn, eventId, studentId);
    if (existing && existing.status !== "cancelled") throw httpError(409, "You are already registered for this event");

    const count = await queries.countActiveRegistrations(conn, eventId);
    if (count.n >= ev.max_participants) throw httpError(409, "This event is full");

    const teamId = ev.event_type === "Team" ? await resolveTeam(conn, studentId, eventId, teamName) : null;
    const newStatus = Number(ev.registration_fee) === 0 ? "confirmed" : "pending"; // paid events are confirmed after payment
    let registrationId;
    if (existing) { 
      registrationId = existing.registration_id;
      await queries.reactivateRegistration(conn, registrationId, newStatus, teamId);
    } else {
      const inserted = await queries.insertRegistration(conn, eventId, studentId, teamId, newStatus);
      registrationId = inserted.insertId;
    }
    if (newStatus === "pending") {
      await queries.insertPendingPayment(conn, registrationId, ev.registration_fee);
    }
    return newStatus;
  });

  res.status(201).json({
    message: status === "confirmed" ? "You are registered!" : "Registered. Pay from My registrations to confirm your spot.",
    status,
  });
}

async function mine(req, res) {
  const registrations = await queries.listStudentRegistrations(await getStudentId(req.user.user_id));
  res.json({ registrations: registrations.map((r) => ({ ...r, has_feedback: !!r.has_feedback })) });
}

async function activity(req, res) {
  const studentId = await getStudentId(req.user.user_id);
  const activities = await queries.listStudentActivity(studentId);
  res.json({ activities });
}

async function cancel(req, res) {
  const id = idParam(req);
  const studentId = await getStudentId(req.user.user_id);
  await queries.withTransaction(async (conn) => {
    const reg = await queries.lockRegistrationForCancellation(conn, id);
    if (!reg) throw httpError(404, "Registration not found");
    if (reg.student_id !== studentId) throw httpError(403, "This is not your registration");
    if (reg.status === "cancelled") throw httpError(409, "This registration is already cancelled");
    if (reg.started) throw httpError(409, "The event has already started, so it can no longer be cancelled");
    await queries.cancelRegistration(conn, id);
    await queries.cancelPayments(conn, id);
  });
  res.json({ message: "Registration cancelled" });
}

module.exports = wrap({ create, mine, activity, cancel });
