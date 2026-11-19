

const STORE_KEY = "festivo-frontend-demo-v1";
let DB = null;

function loadStore() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      DB = JSON.parse(saved);
      return;
    }
  } catch (error) {
  }
  DB = JSON.parse(JSON.stringify(MOCK_DATA)); // deep copy, so MOCK_DATA stays untouched
}

function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(DB));
  } catch (error) {
  }
}

function resetStore() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch (error) {
  }
  loadStore();
}

function nextId(list, key) {
  return list.reduce(function (max, row) { return Math.max(max, row[key]); }, 0) + 1;
}

loadStore();

function getFest(id) { return DB.fests.find(function (f) { return f.fest_id === Number(id); }); }
function getEvent(id) { return DB.events.find(function (e) { return e.event_id === Number(id); }); }
function getVenue(id) { return DB.venues.find(function (v) { return v.venue_id === Number(id); }); }
function getStudent(id) { return DB.students.find(function (s) { return s.student_id === Number(id); }); }
function getStaff(id) { return DB.staff.find(function (u) { return u.user_id === Number(id); }); }
function getRegistration(id) { return DB.registrations.find(function (r) { return r.registration_id === Number(id); }); }

function staffByType(type) {
  return DB.staff.filter(function (u) { return u.user_type === type; });
}

function activeRegistrations(eventId) {
  return DB.registrations.filter(function (r) { return r.event_id === Number(eventId) && r.status !== "cancelled"; });
}
function confirmedRegistrations(eventId) {
  return DB.registrations.filter(function (r) { return r.event_id === Number(eventId) && r.status === "confirmed"; });
}
function seatsTaken(eventId) { return activeRegistrations(eventId).length; }
function seatsLeft(eventId) { return getEvent(eventId).max_participants - seatsTaken(eventId); }

function myRegistration(studentId, eventId) {
  return DB.registrations.find(function (r) {
    return r.student_id === Number(studentId) && r.event_id === Number(eventId) && r.status !== "cancelled";
  });
}

function registrationOpen(eventId) {
  const fest = getFest(getEvent(eventId).fest_id);
  return !fest.registration_deadline || DB.today <= fest.registration_deadline;
}

function paymentFor(registrationId) {
  const rows = DB.payments.filter(function (p) { return p.registration_id === Number(registrationId); });
  return rows.length ? rows[rows.length - 1] : undefined;
}

function eventRevenue(eventId) {
  let total = 0;
  DB.registrations.forEach(function (r) {
    if (r.event_id !== Number(eventId)) return;
    const p = paymentFor(r.registration_id);
    if (p && p.payment_status === "success") total += Number(p.amount);
  });
  return total;
}

function newTransactionRef() {
  return "TXN2026-" + Math.floor(10000 + Math.random() * 89999);
}

function cancelRegistration(registrationId) {
  const reg = getRegistration(registrationId);
  reg.status = "cancelled";
  const payment = paymentFor(registrationId);
  if (payment && payment.payment_status === "success") payment.payment_status = "refunded";
  if (payment && payment.payment_status === "pending") payment.payment_status = "failed";
  saveStore();
}

function eventRating(eventId) {
  const rows = DB.feedback.filter(function (f) { return f.event_id === Number(eventId); });
  if (!rows.length) return null;
  return rows.reduce(function (sum, f) { return sum + f.rating; }, 0) / rows.length;
}

function scheduleFor(eventId) {
  return DB.schedule.filter(function (s) { return s.event_id === Number(eventId); });
}
function firstRound(eventId) {
  const rows = scheduleFor(eventId).slice().sort(function (a, b) {
    return (a.event_date + a.start_time).localeCompare(b.event_date + b.start_time);
  });
  return rows[0];
}

function judgeEvents(userId) {
  return DB.event_judges
    .filter(function (j) { return j.user_id === Number(userId); })
    .map(function (j) { return getEvent(j.event_id); });
}
function judgesOfEvent(eventId) {
  return DB.event_judges
    .filter(function (j) { return j.event_id === Number(eventId); })
    .map(function (j) { return getStaff(j.user_id); });
}

function scoreSummary(registrationId, judgeUserId) {
  let rows = DB.scores.filter(function (s) { return s.registration_id === Number(registrationId); });
  if (judgeUserId) rows = rows.filter(function (s) { return s.judge_user_id === Number(judgeUserId); });
  if (!rows.length) return { scored: false, average: 0, criteria: {} };

  const sums = {};
  const counts = {};
  rows.forEach(function (s) {
    sums[s.criteria] = (sums[s.criteria] || 0) + Number(s.score);
    counts[s.criteria] = (counts[s.criteria] || 0) + 1;
  });
  const criteria = {};
  let total = 0;
  Object.keys(sums).forEach(function (name) {
    criteria[name] = sums[name] / counts[name];
    total += criteria[name];
  });
  return { scored: true, average: total / Object.keys(criteria).length, criteria: criteria };
}

function participantLabel(reg) {
  const student = getStudent(reg.student_id);
  return reg.team_name ? reg.team_name : student.name;
}
