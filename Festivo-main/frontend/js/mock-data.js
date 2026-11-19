

const MOCK_DATA = (function () {
  const today = "2026-11-10";

  const fests = [
    {
      fest_id: 1, fest_name: "Festivo 2026", start_date: "2026-11-20", end_date: "2026-11-22",
      registration_deadline: "2026-11-15",
      tagline: "Three days of music, dance, art and laughter.",
      description: "The flagship cultural fest of the campus with live bands, street dance battles, photography and open-mic nights.",
      sponsors: ["Nimbus Telecom", "GreenLeaf Foods"],
    },
    {
      fest_id: 2, fest_name: "Techno Sprint 2026", start_date: "2026-12-05", end_date: "2026-12-06",
      registration_deadline: "2026-12-01",
      tagline: "Build it. Break it. Race it.",
      description: "A two-day technical fest: a 24-hour hackathon, debugging sprints and the crowd-favourite Robo Race.",
      sponsors: ["ByteForge Labs"],
    },
  ];

  const venues = [
    { venue_id: 1, venue_name: "Main Auditorium", capacity: 800 },
    { venue_id: 2, venue_name: "Seminar Hall A", capacity: 150 },
    { venue_id: 3, venue_name: "Open Air Theatre", capacity: 1200 },
    { venue_id: 4, venue_name: "Computer Lab 2", capacity: 60 },
  ];

  // Staff accounts (no passwords - there is no login in this phase).
  const staff = [
    { user_id: 2, name: "Arjun Mehta", user_type: "organizer", title: "Cultural Committee Head" },
    { user_id: 6, name: "Meera Iyer", user_type: "organizer", title: "Tech Committee Head" },
    { user_id: 3, name: "Dr. Kavita Rao", user_type: "event_judge", title: "Professor, Performing Arts" },
    { user_id: 5, name: "Prof. Sameer Jain", user_type: "event_judge", title: "Music Director" },
    { user_id: 7, name: "Leena D'Souza", user_type: "event_judge", title: "Senior Engineer, ByteForge Labs" },
  ];

  // Student 1 is the demo student who is "logged in" on the student dashboard.
  const studentRows = [
    ["Riya Sharma", "21CS101", "CSE", 3], ["Neel Kapoor", "21EC045", "ECE", 2],
    ["Aarav Singh", "21ME210", "ME", 3], ["Ishita Verma", "22CS144", "CSE", 2],
    ["Kabir Malhotra", "21EE077", "EEE", 3], ["Sana Khan", "22BT032", "BT", 2],
    ["Rohan Das", "20CS012", "CSE", 4], ["Ananya Pillai", "22EC101", "ECE", 2],
    ["Vikram Joshi", "21CE055", "CE", 3], ["Tanya Bhatt", "23CS220", "CSE", 1],
    ["Dev Patel", "22ME118", "ME", 2], ["Priya Nair", "21IT066", "IT", 3],
    ["Harsh Vardhan", "20EE031", "EEE", 4], ["Meghna Rao", "23EC009", "ECE", 1],
    ["Zoya Ali", "22CS301", "CSE", 2], ["Karan Arora", "21IT090", "IT", 3],
    ["Nisha Reddy", "22BT054", "BT", 2], ["Yash Gupta", "20ME144", "ME", 4],
    ["Aditi Kulkarni", "23IT015", "IT", 1], ["Sahil Bansal", "21EE102", "EEE", 3],
  ];
  const students = studentRows.map(function (r, i) {
    return { student_id: i + 1, name: r[0], roll_no: r[1], department: r[2], year: r[3] };
  });

  const events = [
    { event_id: 1, fest_id: 1, organizer_user_id: 2, event_name: "Battle of Bands", category_name: "Music", event_type: "Team", registration_fee: 500, max_participants: 8,
      description: "Live band face-off. 20 minutes on stage, original or cover sets welcome.", criteria: ["Musicianship", "Stage Presence", "Originality"] },
    { event_id: 2, fest_id: 1, organizer_user_id: 2, event_name: "Solo Singing", category_name: "Music", event_type: "Individual", registration_fee: 100, max_participants: 15,
      description: "Sing any genre for up to 4 minutes. Karaoke tracks or live instruments allowed.", criteria: ["Vocals", "Stage Presence", "Creativity"] },
    { event_id: 3, fest_id: 1, organizer_user_id: 2, event_name: "Street Dance Showdown", category_name: "Dance", event_type: "Team", registration_fee: 400, max_participants: 10,
      description: "Crews of 4 to 8 battle it out with a 6-minute routine.", criteria: ["Choreography", "Energy", "Synchronisation"] },
    { event_id: 4, fest_id: 1, organizer_user_id: 2, event_name: "Photography Walk", category_name: "Arts", event_type: "Individual", registration_fee: 0, max_participants: 20,
      description: "A guided campus walk followed by a photo submission. Theme revealed on the day.", criteria: ["Composition", "Creativity", "Storytelling"] },
    { event_id: 5, fest_id: 2, organizer_user_id: 6, event_name: "Hackathon 24", category_name: "Technical", event_type: "Team", registration_fee: 300, max_participants: 12,
      description: "24 hours to build a working prototype. Teams of up to 4.", criteria: ["Innovation", "Technical Depth", "Presentation"] },
    { event_id: 6, fest_id: 2, organizer_user_id: 6, event_name: "Code Debugging Sprint", category_name: "Technical", event_type: "Individual", registration_fee: 50, max_participants: 15,
      description: "Find and fix as many bugs as you can in 90 minutes.", criteria: ["Accuracy", "Speed", "Code Quality"] },
    { event_id: 7, fest_id: 2, organizer_user_id: 6, event_name: "Robo Race", category_name: "Technical", event_type: "Team", registration_fee: 600, max_participants: 8,
      description: "Race your line-following robot through an obstacle track.", criteria: ["Speed", "Accuracy", "Design"] },
    { event_id: 8, fest_id: 1, organizer_user_id: 2, event_name: "Stand-up Open Mic", category_name: "Literary", event_type: "Individual", registration_fee: 0, max_participants: 10,
      description: "Five minutes, one microphone, zero mercy. Clean humour only.", criteria: ["Originality", "Delivery", "Crowd Response"] },
  ];

  // judge_id is the assignment id, user_id is the judge's account (same as schema.sql).
  const event_judges = [
    { judge_id: 1, user_id: 3, event_id: 2 },
    { judge_id: 2, user_id: 3, event_id: 4 },
    { judge_id: 3, user_id: 5, event_id: 1 },
    { judge_id: 4, user_id: 5, event_id: 3 },
    { judge_id: 5, user_id: 7, event_id: 5 },
    { judge_id: 6, user_id: 7, event_id: 6 },
  ];

  const schedule = [
    [1, 3, "Prelims", "2026-11-20", "16:00", "19:00"],
    [1, 1, "Finals", "2026-11-22", "18:00", "21:00"],
    [2, 2, "Auditions", "2026-11-21", "10:00", "13:00"],
    [2, 1, "Grand Finale", "2026-11-22", "14:00", "16:00"],
    [3, 3, "Finals", "2026-11-21", "17:00", "19:30"],
    [4, 3, "Walk + Submission", "2026-11-22", "07:00", "10:00"],
    [5, 4, "Hacking Round", "2026-12-05", "09:00", "21:00"],
    [6, 4, "Round 1", "2026-12-06", "10:00", "12:00"],
    [7, 3, "Race Day", "2026-12-06", "14:00", "17:00"],
    [8, 2, "Open Mic", "2026-11-21", "19:00", "21:00"],
  ].map(function (r, i) {
    return { schedule_id: i + 1, event_id: r[0], venue_id: r[1], round_name: r[2], event_date: r[3], start_time: r[4], end_time: r[5] };
  });

  const stalls = [
    [1, "Chai & Chill", "Food & Beverage", "98765 43210", 3000, "09:00", "21:00", "booked"],
    [1, "Pixel Prints", "Merchandise", "98123 45670", 2000, "10:00", "20:00", "available"],
    [1, "Henna Corner", "Arts & Crafts", "99887 76655", 1200, "11:00", "19:00", "available"],
    [1, "Gaming Zone", "Games", "90000 11122", 4500, "10:00", "22:00", "booked"],
    [1, "Momo Mania", "Food & Beverage", "98100 55512", 2800, "11:00", "21:00", "booked"],
    [1, "Tattoo & Face Art", "Arts & Crafts", "98990 12121", 1500, "12:00", "20:00", "available"],
    [2, "Gadget Bazaar", "Merchandise", "97000 22211", 2500, "09:00", "18:00", "available"],
    [2, "Dosa Junction", "Food & Beverage", "96000 33344", 3200, "09:00", "20:00", "closed"],
    [2, "Circuit Corner", "Merchandise", "95000 44455", 1800, "09:00", "18:00", "booked"],
  ].map(function (r, i) {
    return { stall_id: i + 1, fest_id: r[0], stall_name: r[1], stall_type: r[2], contact_number: r[3], rental_fee: r[4], start_time: r[5], end_time: r[6], status: r[7] };
  });

  // ---- registrations: [event, student, status, team name] ----
  const regRows = [
    // Battle of Bands (team event, 8 slots)
    [1, 2, "confirmed", "Static Waves"], [1, 5, "confirmed", "Raga Rebels"], [1, 7, "confirmed", "Midnight Echo"],
    [1, 9, "pending", "The Backbenchers"], [1, 12, "confirmed", "Blue Monsoon"], [1, 15, "cancelled", "Decibel Dreams"],
    [1, 17, "confirmed", "Octave Nine"],
    // Solo Singing (15 slots) - Riya is registered
    [2, 1, "confirmed"], [2, 4, "confirmed"], [2, 6, "confirmed"], [2, 8, "confirmed"], [2, 10, "confirmed"],
    [2, 13, "confirmed"], [2, 14, "confirmed"], [2, 16, "pending"], [2, 18, "cancelled"],
    // Street Dance (10 slots, almost full)
    [3, 3, "confirmed", "Beat Breakers"], [3, 11, "confirmed", "Urban Tribe"], [3, 19, "confirmed", "Flow State"],
    [3, 20, "confirmed", "Groove Gang"], [3, 8, "confirmed", "Rhythm Riot"], [3, 10, "confirmed", "Hip Hop Hustle"],
    [3, 12, "confirmed", "Footloose"], [3, 14, "confirmed", "Step Up"], [3, 16, "pending", "Dance Dynasty"],
    // Photography Walk (free) - Riya is registered
    [4, 1, "confirmed"], [4, 2, "confirmed"], [4, 5, "confirmed"], [4, 7, "confirmed"], [4, 9, "confirmed"],
    [4, 13, "confirmed"], [4, 17, "confirmed"], [4, 18, "confirmed"],
    // Hackathon 24
    [5, 3, "confirmed", "Null Pointers"], [5, 7, "confirmed", "Code Blooded"], [5, 9, "confirmed", "Byte Me"],
    [5, 12, "confirmed", "Git Happens"], [5, 20, "confirmed", "Stack Overflowers"], [5, 5, "pending", "Dark Mode"],
    // Code Debugging Sprint - Riya has a pending (unpaid) registration
    [6, 1, "pending"], [6, 4, "confirmed"], [6, 6, "confirmed"], [6, 13, "confirmed"], [6, 7, "confirmed"],
    [6, 12, "confirmed"], [6, 19, "confirmed"],
    // Robo Race (8 slots, sold out)
    [7, 3, "confirmed", "Turbo Bots"], [7, 5, "confirmed", "Line Chasers"], [7, 9, "confirmed", "Bolt Brigade"],
    [7, 11, "confirmed", "Gear Heads"], [7, 13, "confirmed", "Volt Vipers"], [7, 15, "confirmed", "Circuit Breakers"],
    [7, 17, "confirmed", "Robo Rangers"], [7, 20, "confirmed", "Mech Mavericks"],
    // Open Mic (free)
    [8, 2, "confirmed"], [8, 8, "confirmed"], [8, 10, "confirmed"], [8, 14, "confirmed"], [8, 18, "confirmed"],
  ];

  const registrations = regRows.map(function (r, i) {
    const day = 1 + (i * 3) % 27; // spread the sign-up dates through October
    return {
      registration_id: i + 1, event_id: r[0], student_id: r[1], team_name: r[3] || "",
      registration_date: "2026-10-" + String(day).padStart(2, "0") + " " + String(9 + (i % 9)).padStart(2, "0") + ":" + String((i * 7) % 60).padStart(2, "0"),
      status: r[2],
    };
  });

  // ---- payments: one per paid registration (free events have none) ----
  const payments = [];
  const methods = ["upi", "card", "upi", "demo"];
  registrations.forEach(function (reg) {
    const event = events.find(function (e) { return e.event_id === reg.event_id; });
    if (event.registration_fee <= 0) return;
    const status = { confirmed: "success", pending: "pending", cancelled: "refunded" }[reg.status];
    const id = payments.length + 1;
    payments.push({
      payment_id: id, registration_id: reg.registration_id, amount: event.registration_fee,
      payment_method: methods[id % methods.length],
      transaction_ref: status === "pending" ? "" : "TXN2026" + String(1000 + id * 37),
      payment_status: status, payment_date: reg.registration_date,
    });
  });

  // Find a registration id by (event, student) so the seed scores below are easy to read.
  function regId(eventId, studentId) {
    return registrations.find(function (r) { return r.event_id === eventId && r.student_id === studentId; }).registration_id;
  }

  // ---- scores: [judge user, event, student, [criterion 1, 2, 3]] ----
  const scoreRows = [
    [3, 2, 4, [88, 82, 90]], [3, 2, 6, [76, 80, 72]], [3, 2, 8, [92, 90, 94]], [3, 2, 10, [70, 68, 75]], [3, 2, 13, [84, 79, 81]],
    [3, 4, 2, [80, 85, 78]], [3, 4, 5, [90, 88, 92]], [3, 4, 9, [72, 70, 74]],
    [5, 1, 2, [85, 90, 80]], [5, 1, 5, [78, 82, 88]], [5, 1, 7, [91, 87, 85]],
  ];
  const scores = [];
  scoreRows.forEach(function (row) {
    const event = events.find(function (e) { return e.event_id === row[1]; });
    row[3].forEach(function (value, i) {
      scores.push({ score_id: scores.length + 1, judge_user_id: row[0], registration_id: regId(row[1], row[2]), criteria: event.criteria[i], score: value });
    });
  });

  const feedback = [
    { feedback_id: 1, event_id: 2, registration_id: regId(2, 4), rating: 5, comments: "Brilliant organisation and a great audience.", submitted_at: "2026-10-30 18:20" },
    { feedback_id: 2, event_id: 2, registration_id: regId(2, 8), rating: 4, comments: "Loved it. Sound check could be faster.", submitted_at: "2026-10-30 19:05" },
    { feedback_id: 3, event_id: 4, registration_id: regId(4, 5), rating: 5, comments: "The theme reveal was a lovely surprise.", submitted_at: "2026-10-31 09:40" },
    { feedback_id: 4, event_id: 8, registration_id: regId(8, 10), rating: 4, comments: "Fun crowd, would do it again!", submitted_at: "2026-10-31 21:10" },
  ];

  return { today, fests, venues, staff, students, events, event_judges, schedule, stalls, registrations, payments, feedback, scores };
})();
