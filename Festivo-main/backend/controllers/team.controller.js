const queries = require("../database/queries");
const { httpError, wrap, idParam, text, onDup, getStudentId } = require("./shared");

async function mine(req, res) {
  const studentId = await getStudentId(req.user.user_id);
  const teams = await queries.listStudentTeams(studentId);
  for (const t of teams) {
    t.members = await queries.listTeamMembers(t.team_id);
    t.is_captain = t.captain_student_id === studentId;
  }
  res.json({ teams });
}

async function getTeam(req, res) {
  const id = idParam(req);
  const team = await queries.findTeam(id);
  if (!team) throw httpError(404, "Team not found");
  const members = await queries.listTeamMembers(id);
  if (req.user.user_type === "student") { // students may only view their own teams
    const studentId = await getStudentId(req.user.user_id);
    if (!members.some((m) => m.student_id === studentId)) throw httpError(403, "You are not a member of this team");
  }
  res.json({ team: { ...team, members } });
}

async function create(req, res) {
  const name = text((req.body || {}).team_name, "Team name", 100);
  const studentId = await getStudentId(req.user.user_id);
  const teamId = await queries.withTransaction(async (conn) => {
    await queries.lockStudent(conn, studentId);
    const t = await onDup("A student can captain only one team",
      () => queries.insertTeam(conn, name, studentId));
    await queries.insertTeamMember(t.insertId, studentId, conn); // captain is a member too
    return t.insertId;
  });
  res.status(201).json({ message: "Team created", team_id: teamId });
}

async function captainOf(req) {
  const id = idParam(req);
  const studentId = await getStudentId(req.user.user_id);
  const t = await queries.findTeam(id);
  if (!t) throw httpError(404, "Team not found");
  if (t.captain_student_id !== studentId) throw httpError(403, "Only the team captain can do that");
  return { id, captain: t.captain_student_id };
}

async function addMember(req, res) {
  const { id } = await captainOf(req);
  const rollNo = String((req.body || {}).roll_no || "").trim();
  if (!rollNo) throw httpError(400, "Enter the member's roll number");
  const s = await queries.findStudentByRollNo(rollNo);
  if (!s) throw httpError(404, "No student found with that roll number");
  await onDup("That student is already in the team", () => queries.insertTeamMember(id, s.student_id));
  res.status(201).json({ message: "Member added" });
}

async function removeMember(req, res) {
  const { id, captain } = await captainOf(req);
  const studentId = idParam(req, "studentId");
  if (captain === studentId) throw httpError(400, "The captain cannot be removed");
  const r = await queries.deleteTeamMember(id, studentId);
  if (!r.affectedRows) throw httpError(404, "That student is not in the team");
  res.json({ message: "Member removed" });
}

module.exports = wrap({ mine, getTeam, create, addMember, removeMember });
