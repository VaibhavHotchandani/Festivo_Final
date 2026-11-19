const pool = require("../config/db");

async function run(sql, values = [], conn = pool) {
  const [result] = await conn.query(sql, values);
  return result;
}

async function one(sql, values, conn) {
  const [row] = await run(sql, values, conn);
  return row;
}

async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

const eventFields = event => [
  event.event_name, event.category_name, event.event_type, event.registration_fee,
  event.max_participants, event.description, JSON.stringify(event.criteria || []),
];

const roundFields = r => [r.event_id, r.venue_id, r.round_name, r.event_date, r.start_time, r.end_time];

module.exports = {
  withTransaction,
  close: () => pool.end(),

  healthCheck: () => run("SELECT 1"),
  createStaff: (name, email, role) => run("INSERT INTO user_account (name, email, password_hash, user_type) VALUES (?, ?, 'no-login', ?)", [name, email, role]),
  findDemoUser: (userId) => one("SELECT user_id, name, user_type FROM user_account WHERE user_id = ?", [userId]),

  readOverview: () => one(`SELECT
      (SELECT COUNT(*) FROM fest) AS fests,
      (SELECT COUNT(*) FROM event) AS events,
      (SELECT COUNT(*) FROM venue) AS venues,
      (SELECT COUNT(*) FROM registration WHERE status <> 'cancelled') AS registrations`),
  listFestEventCounts: () => run(`SELECT f.fest_id, f.fest_name, f.start_date, f.end_date, f.registration_deadline,
        (SELECT COUNT(*) FROM event e WHERE e.fest_id = f.fest_id) AS event_count
      FROM fest f ORDER BY f.start_date`),
  listDemoUsers: () => run(`SELECT ua.user_id, ua.name, ua.user_type,
        s.roll_no, s.department
      FROM user_account ua LEFT JOIN student s ON s.user_id = ua.user_id
      ORDER BY FIELD(ua.user_type, 'student', 'event_judge', 'organizer'), ua.name`),

  listEvents(search, festId) {
    const filters = [], values = [];
    if (search) {
      filters.push("CONCAT_WS(' ', event_name, category_name, fest_name) LIKE ? ESCAPE '!'");
      values.push("%" + search.replace(/[!%_]/g, "!$&") + "%");
    }
    if (festId !== undefined) {
      filters.push("fest_id = ?");
      values.push(festId);
    }
    const where = filters.length ? "WHERE " + filters.join(" AND ") : "";
    return run(`SELECT * FROM v_event_registration_summary ${where} ORDER BY event_id`, values);
  },
  listOrganizerEvents(organizerId, minimum) {
    const filter = minimum ? `AND event_id IN (
      SELECT event_id FROM registration WHERE status <> 'cancelled'
      GROUP BY event_id HAVING COUNT(*) >= ?
    )` : "";
    return run(`SELECT * FROM v_event_registration_summary
      WHERE organizer_user_id = ? ${filter} ORDER BY event_id`,
      minimum ? [organizerId, minimum] : [organizerId]);
  },
  findEvent: (eventId) => one("SELECT * FROM v_event_registration_summary WHERE event_id = ?", [eventId]),
  listEventRounds: (eventId) => run("SELECT * FROM event_schedule WHERE event_id = ?", [eventId]),
  insertEvent: (event, organizerId) => run(`INSERT INTO event
      (fest_id, organizer_user_id, event_name, category_name,
       event_type, registration_fee, max_participants,
       description, criteria, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'open'))`, [event.fest_id, organizerId, ...eventFields(event), event.status ?? null]),
  updateEvent: (eventId, event) => run(`UPDATE event SET
       fest_id = ?, event_name = ?, category_name = ?,
       event_type = ?, registration_fee = ?,
       max_participants = ?, description = ?, criteria = ?, status = COALESCE(?, status)
      WHERE event_id = ?`, [event.fest_id, ...eventFields(event), event.status ?? null, eventId]),
  deleteEvent: (eventId) => run("DELETE FROM event WHERE event_id = ?", [eventId]),
  listEventRegistrations: (eventId) => run(`SELECT r.*, t.team_name, ua.name AS student_name, s.roll_no, s.department, s.year,
             (SELECT p.payment_status FROM payment p WHERE p.registration_id = r.registration_id
              ORDER BY p.payment_id DESC LIMIT 1) AS payment_status
      FROM registration r
      LEFT JOIN team t ON t.team_id = r.team_id
      JOIN student s ON r.student_id = s.student_id
      JOIN user_account ua ON s.user_id = ua.user_id
      WHERE r.event_id = ?`, [eventId]),
  listLeaderboard: (eventId) => run(`SELECT r.registration_id, ua.name AS student_name,
             SUM(sc.score) AS total_score,
             RANK() OVER (ORDER BY SUM(sc.score) DESC) AS event_rank
      FROM score sc
      JOIN registration r ON sc.registration_id = r.registration_id
      JOIN student s ON r.student_id = s.student_id
      JOIN user_account ua ON s.user_id = ua.user_id
      WHERE r.event_id = ?
      GROUP BY r.registration_id, ua.name
      ORDER BY event_rank, r.registration_id`, [eventId]),
  listVisibleFeedback: (eventId) => run(`SELECT rating, comments, submitted_at
      FROM event_feedback
      WHERE event_id = ? AND status = 'visible'`, [eventId]),
  readFeedbackSummary: (eventId) => one(`SELECT COUNT(*) AS feedback_count, ROUND(AVG(rating), 2) AS average_rating
      FROM event_feedback WHERE event_id = ? AND status = 'visible'`, [eventId]),

  listSchedule(eventId) {
    const filter = eventId !== undefined;
    return run(`SELECT es.schedule_id, es.event_id, e.event_name, e.fest_id, f.fest_name,
        es.venue_id, v.venue_name, v.capacity, es.round_name, es.event_date, es.start_time, es.end_time
      FROM event_schedule es JOIN event e ON e.event_id = es.event_id
      JOIN fest f ON f.fest_id = e.fest_id JOIN venue v ON v.venue_id = es.venue_id
      ${filter ? "WHERE es.event_id = ?" : ""} ORDER BY es.event_date, es.start_time`,
      filter ? [eventId] : []);
  },
  listVenues: () => run("SELECT venue_id, venue_name, capacity FROM venue ORDER BY venue_name"),
  listFestsWithSponsors: () => run(`SELECT f.fest_id, f.fest_name, f.start_date, f.end_date, f.registration_deadline,
      (SELECT GROUP_CONCAT(s.sponsor_name ORDER BY s.sponsor_name SEPARATOR ', ') FROM sponsor s WHERE s.fest_id = f.fest_id) AS sponsors
      FROM fest f ORDER BY f.start_date`),
  lockVenue: (conn, venueId) => one("SELECT venue_id FROM venue WHERE venue_id = ? FOR UPDATE", [venueId], conn),
  insertRound: (conn, round) => run(`INSERT INTO event_schedule (event_id, venue_id, round_name, event_date, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?)`, roundFields(round), conn),
  findRound: (scheduleId) => one("SELECT event_id FROM event_schedule WHERE schedule_id = ?", [scheduleId]),
  updateRound: (conn, scheduleId, round) => run(`UPDATE event_schedule
      SET event_id = ?, venue_id = ?, round_name = ?, event_date = ?, start_time = ?, end_time = ?
      WHERE schedule_id = ?`, [...roundFields(round), scheduleId], conn),
  deleteRound: (scheduleId) => run("DELETE FROM event_schedule WHERE schedule_id = ?", [scheduleId]),

  cancelPayments: (conn, registrationId) => run(`UPDATE payment
      SET payment_status = CASE WHEN payment_status = 'success' THEN 'refunded' ELSE 'failed' END
      WHERE registration_id = ? AND payment_status IN ('success', 'pending')`, [registrationId], conn),
  lockRegistrationEvent: (conn, eventId) => one(`SELECT e.registration_fee, e.max_participants, e.event_type, e.status,
           (f.registration_deadline IS NOT NULL AND CURDATE() > f.registration_deadline) AS closed
      FROM event e JOIN fest f ON f.fest_id = e.fest_id WHERE e.event_id = ? FOR UPDATE`, [eventId], conn),
  lockExistingRegistration: (conn, eventId, studentId) => one("SELECT registration_id, status FROM registration WHERE event_id = ? AND student_id = ? FOR UPDATE", [eventId, studentId], conn),
  countActiveRegistrations: (conn, eventId) => one("SELECT COUNT(*) AS n FROM registration WHERE event_id = ? AND status <> 'cancelled'", [eventId], conn),
  reactivateRegistration: (conn, registrationId, status, teamId) => run("UPDATE registration SET status = ?, team_id = ?, registration_date = CURRENT_TIMESTAMP WHERE registration_id = ?", [status, teamId, registrationId], conn),
  insertRegistration: (conn, eventId, studentId, teamId, status) => run("INSERT INTO registration (event_id, student_id, team_id, status) VALUES (?, ?, ?, ?)", [eventId, studentId, teamId, status], conn),
  insertPendingPayment: (conn, registrationId, amount) => run("INSERT INTO payment (registration_id, amount, payment_method, payment_status) VALUES (?, ?, 'demo', 'pending')", [registrationId, amount], conn),
  listStudentRegistrations: (studentId) => run(`SELECT r.registration_id, r.event_id, r.team_id, t.team_name, e.event_type, e.event_name, f.fest_name, e.registration_fee, r.registration_date, r.status,
            (SELECT p.payment_status FROM payment p WHERE p.registration_id = r.registration_id ORDER BY p.payment_id DESC LIMIT 1) AS payment_status,
            EXISTS (SELECT 1 FROM event_feedback ef WHERE ef.registration_id = r.registration_id) AS has_feedback,
            (SELECT MIN(es.event_date) FROM event_schedule es WHERE es.event_id = r.event_id AND es.event_date >= CURDATE()) AS next_date
       FROM registration r JOIN event e ON e.event_id = r.event_id JOIN fest f ON f.fest_id = e.fest_id
       LEFT JOIN team t ON t.team_id = r.team_id
      WHERE r.student_id = ? ORDER BY r.registration_date DESC`, [studentId]),
  listStudentActivity: (studentId) => run(`SELECT 'Registration' AS activity_type, r.registration_date AS activity_date,
             e.event_name, CAST(r.status AS CHAR) AS status
      FROM registration r JOIN event e ON e.event_id = r.event_id
      WHERE r.student_id = ?
      UNION ALL
      SELECT 'Payment', p.payment_date, e.event_name, CAST(p.payment_status AS CHAR)
      FROM payment p JOIN registration r ON r.registration_id = p.registration_id
      JOIN event e ON e.event_id = r.event_id
      WHERE r.student_id = ?
      UNION ALL
      SELECT 'Feedback', ef.submitted_at, e.event_name, CAST(ef.status AS CHAR)
      FROM event_feedback ef JOIN registration r ON r.registration_id = ef.registration_id
      JOIN event e ON e.event_id = ef.event_id
      WHERE r.student_id = ?
      ORDER BY activity_date DESC, activity_type, event_name
      LIMIT 30`, [studentId, studentId, studentId]),
  lockRegistrationForCancellation: (conn, registrationId) => one(`SELECT r.student_id, r.status,
           ((SELECT MIN(es.event_date) FROM event_schedule es WHERE es.event_id = r.event_id) <= CURDATE()) AS started
      FROM registration r WHERE r.registration_id = ? FOR UPDATE`, [registrationId], conn),
  cancelRegistration: (conn, registrationId) => run("UPDATE registration SET status = 'cancelled' WHERE registration_id = ?", [registrationId], conn),

  lockRegistrationForPayment: (conn, registrationId) => one(`SELECT r.student_id, r.status, e.registration_fee,
        (SELECT COUNT(*) FROM payment p WHERE p.registration_id = r.registration_id AND p.payment_status = 'success') AS paid
      FROM registration r JOIN event e ON e.event_id = r.event_id
      WHERE r.registration_id = ? FOR UPDATE`, [registrationId], conn),
  lockPendingPayment: (conn, registrationId) => one(`SELECT payment_id FROM payment
      WHERE registration_id = ? AND payment_status = 'pending'
      ORDER BY payment_id DESC LIMIT 1 FOR UPDATE`, [registrationId], conn),
  completeDemoPayment: (conn, paymentId, amount, transactionRef) => run(`UPDATE payment
      SET amount = ?, payment_method = 'demo', transaction_ref = ?, payment_status = 'success',
          payment_date = CURRENT_TIMESTAMP
      WHERE payment_id = ?`, [amount, transactionRef, paymentId], conn),
  insertDemoPayment: (conn, registrationId, amount, transactionRef) => run("INSERT INTO payment (registration_id, amount, payment_method, transaction_ref, payment_status) VALUES (?, ?, 'demo', ?, 'success')", [registrationId, amount, transactionRef], conn),
  confirmRegistration: (conn, registrationId) => run("UPDATE registration SET status = 'confirmed' WHERE registration_id = ?", [registrationId], conn),
  listOrganizerPayments: (organizerId) => run(`SELECT p.payment_id, p.registration_id, p.amount, p.payment_method,
        p.transaction_ref, p.payment_status, p.payment_date, r.event_id, r.status AS registration_status,
        r.team_id, t.team_name, ua.name AS student_name, e.event_name, e.organizer_user_id
      FROM payment p JOIN registration r ON r.registration_id = p.registration_id
      LEFT JOIN team t ON t.team_id = r.team_id
      JOIN student s ON s.student_id = r.student_id JOIN user_account ua ON ua.user_id = s.user_id
      JOIN event e ON e.event_id = r.event_id
      WHERE e.organizer_user_id = ? ORDER BY p.payment_date DESC, p.payment_id DESC`, [organizerId]),
  readOrganizerPaymentSummary: (organizerId) => one(`SELECT collected, pending, transaction_count
      FROM v_organizer_payment_summary WHERE organizer_user_id = ?`, [organizerId]),
  lockPayment: (conn, paymentId) => one(`SELECT p.payment_id, p.payment_status, p.registration_id,
        r.status AS registration_status, r.event_id
      FROM payment p JOIN registration r ON r.registration_id = p.registration_id
      WHERE p.payment_id = ? FOR UPDATE`, [paymentId], conn),
  recordCashPayment: (conn, paymentId, transactionRef) => run(`UPDATE payment
      SET payment_status = 'success', payment_method = 'cash', transaction_ref = ?,
          payment_date = CURRENT_TIMESTAMP
      WHERE payment_id = ?`, [transactionRef, paymentId], conn),

  listJudgeAccounts: () => run("SELECT user_id, name, email FROM user_account WHERE user_type = 'event_judge' ORDER BY name"),
  listEventJudges: (eventId) => run(`SELECT ej.judge_id, ua.user_id, ua.name, ua.email FROM event_judge ej JOIN user_account ua ON ua.user_id = ej.user_id
      WHERE ej.event_id = ? ORDER BY ua.name`, [eventId]),
  insertJudgeAssignment: (userId, eventId) => run(`INSERT INTO event_judge (user_id, event_id)
      SELECT user_id, ? FROM user_account WHERE user_id = ?`, [eventId, userId]),
  findScoreForAssignment: (judgeId) => one("SELECT 1 FROM score WHERE judge_id = ? LIMIT 1", [judgeId]),
  deleteJudgeAssignment: (judgeId, eventId) => run("DELETE FROM event_judge WHERE judge_id = ? AND event_id = ?", [judgeId, eventId]),
  findJudgeAssignment: (userId, eventId) => one("SELECT judge_id FROM event_judge WHERE user_id = ? AND event_id = ?", [userId, eventId]),
  listAssignedEvents: (userId) => run(`SELECT ej.judge_id, e.event_id, e.event_name, f.fest_name
       FROM event_judge ej JOIN event e ON e.event_id = ej.event_id JOIN fest f ON f.fest_id = e.fest_id
      WHERE ej.user_id = ? ORDER BY e.event_name`, [userId]),
  listConfirmedParticipants: (eventId) => run(`SELECT r.registration_id, ua.name AS student_name, s.roll_no
       FROM registration r JOIN student s ON s.student_id = r.student_id JOIN user_account ua ON ua.user_id = s.user_id
      WHERE r.event_id = ? AND r.status = 'confirmed' ORDER BY ua.name`, [eventId]),
  listJudgeScores: (judgeId, eventId) => run(`SELECT registration_id, criteria, score FROM score
      WHERE judge_id = ? AND event_id = ? ORDER BY score_id`, [judgeId, eventId]),
  upsertScore: (judgeId, registrationId, eventId, criteria, score) => run(`INSERT INTO score (judge_id, registration_id, event_id, criteria, score)
      SELECT ?, registration_id, event_id, ?, ? FROM registration
      WHERE event_id = ? AND registration_id = ? ON DUPLICATE KEY UPDATE score = ?`, [judgeId, criteria, score, eventId, registrationId, score]),

  findRegistrationForFeedback: (registrationId) => one("SELECT event_id, student_id, status FROM registration WHERE registration_id = ?", [registrationId]),
  insertFeedback: (eventId, registrationId, rating, comments) => run(`INSERT INTO event_feedback (event_id, registration_id, rating, comments)
      VALUES (?, ?, ?, ?)`, [eventId, registrationId, rating, comments]),
  listStudentFeedback: (studentId) => run(`SELECT ef.feedback_id, ef.registration_id, ef.event_id, ef.rating, ef.comments, ef.submitted_at, e.event_name
      FROM event_feedback ef JOIN registration r ON r.registration_id = ef.registration_id
      JOIN event e ON e.event_id = ef.event_id
      WHERE r.student_id = ? ORDER BY ef.submitted_at DESC`, [studentId]),

  listTeamMembers: (teamId) => run(`SELECT s.student_id, s.roll_no, ua.name
       FROM team_member tm JOIN student s ON s.student_id = tm.student_id JOIN user_account ua ON ua.user_id = s.user_id
      WHERE tm.team_id = ? ORDER BY tm.team_member_id`, [teamId]),
  listStudentTeams: (studentId) => run(`SELECT t.team_id, t.team_name, t.captain_student_id, t.event_id FROM team t JOIN team_member tm ON tm.team_id = t.team_id
      WHERE tm.student_id = ? ORDER BY t.team_id`, [studentId]),
  findTeam: (teamId) => one("SELECT team_id, team_name, captain_student_id, event_id FROM team WHERE team_id = ?", [teamId]),
  lockStudent: (conn, studentId) => one("SELECT student_id FROM student WHERE student_id = ? FOR UPDATE", [studentId], conn),
  lockTeamByCaptain: (conn, captainId) => one("SELECT team_id, team_name, event_id FROM team WHERE captain_student_id = ? FOR UPDATE", [captainId], conn),
  assignTeamEvent: (conn, teamId, eventId) => run("UPDATE team SET event_id = ? WHERE team_id = ?", [eventId, teamId], conn),
  insertTeam: (conn, name, captainId, eventId = null) => run("INSERT INTO team (team_name, captain_student_id, event_id) VALUES (?, ?, ?)", [name, captainId, eventId], conn),
  insertTeamMember: (teamId, studentId, conn = pool) => run("INSERT INTO team_member (team_id, student_id) VALUES (?, ?)", [teamId, studentId], conn),
  findStudentByRollNo: (rollNo) => one("SELECT student_id FROM student WHERE roll_no = ?", [rollNo]),
  deleteTeamMember: (teamId, studentId) => run("DELETE FROM team_member WHERE team_id = ? AND student_id = ?", [teamId, studentId]),

  listStalls: () => run(`SELECT s.stall_id, s.fest_id, f.fest_name, s.stall_name, s.stall_type, s.owner_name, s.contact_number, s.rental_fee, s.start_time, s.end_time, s.status
      FROM stall s JOIN fest f ON f.fest_id = s.fest_id ORDER BY f.start_date, s.stall_name`),

  findStudentByUserId: (userId) => one("SELECT student_id FROM student WHERE user_id = ?", [userId]),
  findEventOwner: (eventId, conn = pool) => one(`SELECT e.*, f.start_date AS fest_start, f.end_date AS fest_end
      FROM event e JOIN fest f ON f.fest_id = e.fest_id WHERE e.event_id = ?`, [eventId], conn),
};
