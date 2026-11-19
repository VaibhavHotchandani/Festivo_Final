if (FestivoUI.goHomeIfNoUser()) throw new Error("Choose a demo account first");

async function studentData(root) {
  return FestivoUI.render(root, async () => {
    const [eventData, regData, festData, scheduleData, stallData] = await Promise.all([
      FestivoUI.call("GET", "/events"),
      FestivoUI.call("GET", "/registrations/me"),
      FestivoUI.call("GET", "/fests"),
      FestivoUI.call("GET", "/schedule"),
      FestivoUI.call("GET", "/stalls")
    ]);
    root.innerHTML = pageHead("Student overview", "Your events, registration status and upcoming schedule.") +
      `<div class="stats">
        ${statTile("ticket", (regData.registrations || []).filter(r => r.status !== "cancelled").length, "My active registrations")}
        ${statTile("calendar", (eventData.events || []).length, "Available events")}
        ${statTile("sparkle", (festData.fests || []).length, "Fests")}
        ${statTile("store", (stallData.stalls || []).length, "Stalls")}
      </div>
      <div class="two-col">
        <div class="panel"><div class="panel-head"><h2>${icon("ticket")} My recent registrations</h2><button class="btn small" data-goto="registrations">View all</button></div>
        ${studentRegistrationRows((regData.registrations || []).slice(0, 5))}</div>
        <div class="panel"><h2>${icon("calendar")} Upcoming schedule</h2>${studentScheduleRows((scheduleData.schedule || []).filter(s => String(s.event_date) >= new Date().toISOString().slice(0, 10)).slice(0, 6))}</div>
      </div>
      <div class="panel"><div class="panel-head"><h2>${icon("sparkle")} Explore events</h2><button class="btn small" data-goto="events">Browse all</button></div>
      ${studentEventCards((eventData.events || []).slice(0, 3), regData.registrations || [])}</div>`;
    root.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => goToTab(b.dataset.goto)));
    studentWireActions(root);
  });
}

function studentEventCards(events, registrations = []) {
  if (!events.length) return emptyState("No events found.");
  return `<div class="grid">${events.map(e => {
    const seats = Number(e.max_participants) - Number(e.registered_count || 0);
    const registered = registrations.some(r => Number(r.event_id) === Number(e.event_id) && r.status !== "cancelled");
    return `<div class="card"><div class="card-top"><span class="badge">${esc(e.category_name)}</span><span class="price">${money(e.registration_fee)}</span></div>
      <h3>${esc(e.event_name)}</h3><p class="meta">${esc(e.fest_name)} · ${esc(e.event_type)}</p>
      <p>${esc(e.description || "No description yet.")}</p>
      ${seatMeter(Number(e.registered_count || 0), Number(e.max_participants))}
      <p class="muted">Registration deadline: ${e.registration_deadline ? fmtDate(e.registration_deadline) : "—"}</p>
      <button class="btn small" data-student-register="${e.event_id}" ${seats <= 0 || registered ? "disabled" : ""}>${registered ? "Already registered" : seats <= 0 ? "Sold out" : "Register"}</button></div>`;
  }).join("")}</div>`;
}

function studentRegistrationRows(registrations) {
  if (!registrations.length) return emptyState("You have not registered for any events yet.");
  return `<div class="table-wrap"><table><thead><tr><th>Event</th><th>Fest</th><th>Fee</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>
    ${registrations.map(r => `<tr><td><b>${esc(r.event_name)}</b>${r.team_name ? `<small>Team: ${esc(r.team_name)}</small>` : ""}</td>
      <td>${esc(r.fest_name)}</td><td>${money(r.registration_fee)}</td><td>${badge(r.payment_status || (Number(r.registration_fee) === 0 ? "free" : "not paid"))}</td>
      <td>${badge(r.status)}</td><td><div class="row-actions">
        ${r.status === "pending" ? `<button class="btn small accent" data-student-pay="${r.registration_id}">Pay demo</button>` : ""}
        ${r.status !== "cancelled" ? `<button class="btn small ghost danger" data-student-cancel="${r.registration_id}">Cancel</button>` : ""}
      </div></td></tr>`).join("")}
    </tbody></table></div>`;
}

function studentScheduleRows(schedule) {
  if (!schedule.length) return emptyState("No schedule information available.");
  return `<ul class="list">${schedule.map(s => `<li><div class="grow"><b>${esc(s.event_name)}</b><small>${FestivoUI.date(s.event_date)} · ${FestivoUI.shortTime(s.start_time)}–${FestivoUI.shortTime(s.end_time)} · ${esc(s.venue_name)}</small></div><span class="muted">${esc(s.round_name)}</span></li>`).join("")}</ul>`;
}

async function studentRenderEvents(root) {
  return FestivoUI.render(root, async () => {
    const [{ events }, { fests }, { registrations }] = await Promise.all([FestivoUI.call("GET", "/events"), FestivoUI.call("GET", "/fests"), FestivoUI.call("GET", "/registrations/me")]);
    root.innerHTML = pageHead("Events", "Browse events and register using the database-backed API.") +
      `<div class="toolbar"><input id="studentEventSearch" placeholder="Search events…"><select id="studentFestFilter"><option value="all">All fests</option>${options(fests.map(f => ({ value: f.fest_id, label: f.fest_name })), "all")}</select></div><div id="studentEventsBox"></div>`;
    const search = root.querySelector("#studentEventSearch");
    const festFilter = root.querySelector("#studentFestFilter");
    const box = root.querySelector("#studentEventsBox");
    const draw = (list) => {
      box.innerHTML = studentEventCards(list, registrations);
      studentWireActions(box);
    };
    let pending, generation = 0;
    const searchEvents = () => {
      clearTimeout(pending);
      const current = ++generation;
      pending = setTimeout(async () => {
        const query = new URLSearchParams();
        if (search.value.trim()) query.set("q", search.value.trim());
        if (festFilter.value !== "all") query.set("fest_id", festFilter.value);
        try {
          const result = await FestivoUI.call("GET", "/events?" + query);
          if (current === generation && box.isConnected) draw(result.events);
        } catch (error) {
          if (current === generation && box.isConnected) toast(error.message, "error");
        }
      }, 200);
    };
    search.addEventListener("input", searchEvents);
    festFilter.addEventListener("change", searchEvents);
    draw(events);
  });
}

async function studentRenderRegistrations(root) {
  return FestivoUI.render(root, async () => {
    const [{ registrations }, { activities }] = await Promise.all([
      FestivoUI.call("GET", "/registrations/me"), FestivoUI.call("GET", "/registrations/activity")
    ]);
    root.innerHTML = pageHead("My registrations", "Manage your event bookings and demo payments.") + studentRegistrationRows(registrations) +
      `<div class="panel"><h2>Recent activity</h2>${activities.length ? `<ul class="list">${activities.map(a =>
        `<li><div class="grow"><b>${esc(a.activity_type)} · ${esc(a.event_name)}</b><small>${fmtDateTime(a.activity_date)}</small></div>${badge(a.status)}</li>`
      ).join("")}</ul>` : emptyState("No activity yet.")}</div>`;
    studentWireActions(root);
  });
}

async function studentRenderSchedule(root) {
  return FestivoUI.render(root, async () => {
    const [{ schedule }, { venues }] = await Promise.all([FestivoUI.call("GET", "/schedule"), FestivoUI.call("GET", "/venues")]);
    root.innerHTML = pageHead("Venues & schedule", "All event rounds and their venues.") +
      `<div class="panel"><h2>Venues</h2><div class="grid">${venues.map(v => `<div class="card"><h3>${icon("pin")} ${esc(v.venue_name)}</h3><p class="meta">Capacity ${Number(v.capacity).toLocaleString("en-IN")}</p></div>`).join("")}</div></div>` +
      `<div class="panel"><h2>Schedule</h2>${studentScheduleTable(schedule)}</div>`;
  });
}

function studentScheduleTable(rows) {
  if (!rows.length) return emptyState("No schedule information available.");
  return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Time</th><th>Event</th><th>Round</th><th>Venue</th></tr></thead><tbody>
    ${rows.map(s => `<tr><td>${FestivoUI.date(s.event_date)}</td><td>${FestivoUI.shortTime(s.start_time)}–${FestivoUI.shortTime(s.end_time)}</td><td>${esc(s.event_name)}</td><td>${esc(s.round_name)}</td><td>${esc(s.venue_name)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

async function studentRenderFests(root) {
  return FestivoUI.render(root, async () => {
    const { fests } = await FestivoUI.call("GET", "/fests");
    root.innerHTML = pageHead("Fests", "Fest dates, registration deadlines and sponsors.") + `<div class="grid wide">${fests.map(f => `<div class="card fest-card"><div class="banner"><h3>${esc(f.fest_name)}</h3></div>
      <div class="detail-list"><div>${icon("calendar")}<span>${FestivoUI.date(f.start_date)} – ${FestivoUI.date(f.end_date)}</span></div>
      <div>${icon("clock")}<span>Registration deadline: ${f.registration_deadline ? FestivoUI.date(f.registration_deadline) : "Not set"}</span></div>
      <div>${icon("star")}<span>Sponsors: ${esc(f.sponsors || "To be announced")}</span></div></div></div>`).join("")}</div>`;
  });
}

async function studentRenderStalls(root) {
  return FestivoUI.render(root, async () => {
    const { stalls } = await FestivoUI.call("GET", "/stalls");
    root.innerHTML = pageHead("Stalls", "Explore stalls at each fest.") + `<div class="grid">${stalls.map(s => `<div class="card"><div class="card-top"><span class="badge">${esc(s.stall_type)}</span>${badge(s.status)}</div>
      <h3>${esc(s.stall_name)}</h3><p class="meta">${esc(s.fest_name)}</p><p class="meta">${FestivoUI.shortTime(s.start_time)}–${FestivoUI.shortTime(s.end_time)}</p>
      <p>${esc(s.contact_number || "Contact not available")}</p><div class="foot"><span>Rent</span><b>${money(s.rental_fee)}</b></div></div>`).join("") || emptyState("No stalls found.")}</div>`;
  });
}

async function studentRenderFeedback(root) {
  return FestivoUI.render(root, async () => {
    const [{ registrations }, { feedback }] = await Promise.all([FestivoUI.call("GET", "/registrations/me"), FestivoUI.call("GET", "/feedback/me")]);
    const eligible = registrations.filter(r => r.status === "confirmed" && !r.has_feedback);
    root.innerHTML = pageHead("Feedback", "Give feedback for confirmed registrations.") + `<div class="two-col">
      <div class="panel"><h2>Submit feedback</h2>${eligible.length ? `<form id="studentFeedbackForm">
        <div class="field"><label>Registration / event</label><select name="registration_id">${options(eligible.map(r => ({ value: r.registration_id, label: `${r.event_name} (${r.fest_name})` })), eligible[0].registration_id)}</select></div>
        <div class="field"><label>Rating</label><select name="rating"><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Okay</option><option value="2">2 - Poor</option><option value="1">1 - Bad</option></select></div>
        <div class="field"><label>Comments</label><textarea name="comments" maxlength="1000"></textarea></div><button class="btn" type="submit">Submit feedback</button></form>` : emptyState("No confirmed registrations are waiting for feedback.")}</div>
      <div class="panel"><h2>Your feedback</h2>${feedback.length ? `<ul class="list">${feedback.map(f => `<li><div class="grow"><b>${esc(f.event_name)}</b>${stars(Number(f.rating))}<small>${esc(f.comments || "No comment")}</small></div></li>`).join("")}</ul>` : emptyState("No feedback submitted yet.")}</div>
    </div>`;
    const form = root.querySelector("#studentFeedbackForm");
    if (form) form.addEventListener("submit", async e => {
      e.preventDefault();
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        await FestivoUI.call("POST", "/feedback", { ...data, registration_id: Number(data.registration_id), rating: Number(data.rating) });
        toast("Feedback submitted");
        refreshTab();
      } catch (error) { toast(error.message, "error"); }
    });
  });
}

async function studentRenderTeams(root) {
  return FestivoUI.render(root, async () => {
    const { teams } = await FestivoUI.call("GET", "/teams/mine");
    root.innerHTML = pageHead("My teams", "Create a team and manage members for team events.", `<button class="btn" id="studentNewTeam">${icon("plus")} Create team</button>`) +
      `<div class="grid wide">${teams.map(t => `<div class="card"><h3>${esc(t.team_name)}</h3><p class="muted">${t.is_captain ? "Team captain" : "Member"}</p>
        <ul class="list">${(t.members || []).map(m => `<li><div class="grow"><b>${esc(m.name)}</b><small>${esc(m.roll_no)}</small></div>${t.is_captain && m.student_id !== t.captain_student_id ? `<button class="btn small ghost danger" data-remove-member="${t.team_id}" data-student="${m.student_id}">Remove</button>` : ""}</li>`).join("")}</ul>
        ${t.is_captain ? `<form class="teamAddForm" data-team="${t.team_id}"><input name="roll_no" placeholder="Member roll number" required><button class="btn small">Add member</button></form>` : ""}</div>`).join("") || emptyState("You have not created or joined a team yet.")}</div>`;
    root.querySelector("#studentNewTeam").addEventListener("click", async () => {
      const name = prompt("Enter a team name:");
      if (!name || !name.trim()) return;
      try { await FestivoUI.call("POST", "/teams", { team_name: name.trim() }); toast("Team created"); refreshTab(); }
      catch (error) { toast(error.message, "error"); }
    });
    root.querySelectorAll(".teamAddForm").forEach(form => form.addEventListener("submit", async e => {
      e.preventDefault();
      try { await FestivoUI.call("POST", `/teams/${form.dataset.team}/members`, { roll_no: form.roll_no.value.trim() }); toast("Member added"); refreshTab(); }
      catch (error) { toast(error.message, "error"); }
    }));
    root.querySelectorAll("[data-remove-member]").forEach(button => button.addEventListener("click", async () => {
      if (!confirm("Remove this team member?")) return;
      try { await FestivoUI.call("DELETE", `/teams/${button.dataset.removeMember}/members/${button.dataset.student}`); toast("Member removed"); refreshTab(); }
      catch (error) { toast(error.message, "error"); }
    }));
  });
}

function studentWireActions(root) {
  root.querySelectorAll("[data-student-register]").forEach(button => button.addEventListener("click", async () => {
    const card = button.closest(".card");
    let teamName = "";
    const eventId = Number(button.dataset.studentRegister);
    try {
      const { event } = await FestivoUI.call("GET", `/events/${eventId}`);
      if (event.event_type === "Team") {
        teamName = prompt("Enter your team name:") || "";
        if (teamName.trim().length < 2) return toast("Enter a team name with at least 2 characters.", "error");
      }
      const result = await FestivoUI.call("POST", "/registrations", { event_id: eventId, team_name: teamName.trim() });
      toast(result.message);
      if (location.hash === "#events") refreshTab(); else goToTab("registrations");
    } catch (error) { toast(error.message, "error"); }
  }));
  root.querySelectorAll("[data-student-pay]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("Record a demo payment? No real money will be charged.")) return;
    try { const result = await FestivoUI.call("POST", "/payments/demo", { registration_id: Number(button.dataset.studentPay) }); toast(result.message); refreshTab(); }
    catch (error) { toast(error.message, "error"); }
  }));
  root.querySelectorAll("[data-student-cancel]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("Cancel this registration? Successful demo payments will be marked refunded.")) return;
    try { const result = await FestivoUI.call("PATCH", `/registrations/${button.dataset.studentCancel}/cancel`); toast(result.message); refreshTab(); }
    catch (error) { toast(error.message, "error"); }
  }));
}

startDashboard({
  roleLabel: "Student", roleIcon: "user", theme: "student", apiMode: true,
  person: FestivoUI.personHtml(),
  tabs: [
    { id: "overview", label: "Overview", icon: "grid", render: studentData },
    { id: "events", label: "Events", icon: "ticket", render: studentRenderEvents },
    { id: "registrations", label: "My registrations", icon: "wallet", render: studentRenderRegistrations },
    { id: "schedule", label: "Venues & Schedule", icon: "calendar", render: studentRenderSchedule },
    { id: "fests", label: "Fests", icon: "sparkle", render: studentRenderFests },
    { id: "stalls", label: "Stalls", icon: "store", render: studentRenderStalls },
    { id: "feedback", label: "Feedback", icon: "message", render: studentRenderFeedback },
    { id: "teams", label: "Teams", icon: "users", render: studentRenderTeams }
  ]
});
