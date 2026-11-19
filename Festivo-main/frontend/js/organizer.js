// Organizer dashboard connected to MySQL via the Express API.
if (FestivoUI.goHomeIfNoUser()) throw new Error("Choose a demo account first");

async function orgLoad(root, fn) { return FestivoUI.render(root, fn); }

async function orgOverview(root) {
  return orgLoad(root, async () => {
    const [{ events }, { payments, summary }, { schedule }, { fests }] = await Promise.all([
      FestivoUI.call("GET", "/events/mine"), FestivoUI.call("GET", "/payments"),
      FestivoUI.call("GET", "/schedule"), FestivoUI.call("GET", "/fests")
    ]);
    const myIds = new Set(events.map(e => Number(e.event_id)));
    const rounds = schedule.filter(s => myIds.has(Number(s.event_id)));
    const registrations = events.reduce((n, e) => n + Number(e.registered_count || 0), 0);
    root.innerHTML = pageHead("Fest overview", "Monitor your events, registrations, payments and schedule.", `<button class="btn" id="orgCreateEvent">${icon("plus")} Create event</button>`) +
      `<div class="stats">${statTile("ticket", events.length, "My events")}${statTile("users", registrations, "Active registrations")}${statTile("rupee", rupees(summary.collected), "Revenue collected")}${statTile("clock", rupees(summary.pending), "Payments pending")}</div>
      <div class="two-col"><div class="panel"><h2>${icon("ticket")} My events</h2>${orgEventTable(events.slice(0, 6), false)}</div>
      <div class="panel"><h2>${icon("wallet")} Recent payments</h2>${orgPaymentTable(payments.slice(0, 6), false)}</div></div>
      <div class="panel"><h2>${icon("calendar")} My schedule</h2>${orgScheduleTable(rounds.slice(0, 8), false)}</div>
      <div class="panel"><h2>${icon("sparkle")} Fests</h2><div class="grid wide">${fests.filter(f => events.some(e => Number(e.fest_id) === Number(f.fest_id))).map(f => `<div class="card"><h3>${esc(f.fest_name)}</h3><p class="meta">${FestivoUI.date(f.start_date)} – ${FestivoUI.date(f.end_date)}</p></div>`).join("")}</div></div>`;
    root.querySelector("#orgCreateEvent").addEventListener("click", () => orgOpenEventForm());
    orgWireEventActions(root);
    orgWirePaymentActions(root);
  });
}

function orgEventTable(events, actions = true) {
  if (!events.length) return emptyState("No events found. Create your first event.");
  return `<div class="table-wrap"><table><thead><tr><th>Event</th><th>Fest</th><th>Fee</th><th>Seats</th>${actions ? "<th>Actions</th>" : ""}</tr></thead><tbody>
    ${events.map(e => `<tr><td><b>${esc(e.event_name)}</b><small>${esc(e.category_name)} · ${esc(e.event_type)}</small></td><td>${esc(e.fest_name)}</td><td>${money(e.registration_fee)}</td>
      <td>${seatMeter(Number(e.registered_count || 0), Number(e.max_participants))}</td>${actions ? `<td><div class="row-actions"><button class="btn small ghost" data-org-edit="${e.event_id}">Edit</button><button class="btn small ghost" data-org-judges="${e.event_id}">Judges</button><button class="btn small ghost" data-org-report="${e.event_id}">Reports</button><button class="btn small ghost danger" data-org-delete="${e.event_id}">Delete</button></div></td>` : ""}</tr>`).join("")}
    </tbody></table></div>`;
}

function orgPaymentTable(payments, actions = true) {
  if (!payments.length) return emptyState("No payment records found.");
  return `<div class="table-wrap"><table><thead><tr><th>Participant</th><th>Event</th><th>Transaction</th><th>Amount</th><th>Status</th>${actions ? "<th></th>" : ""}</tr></thead><tbody>
    ${payments.map(p => `<tr><td>${esc(p.student_name)}${p.team_name ? `<small>${esc(p.team_name)}</small>` : ""}</td><td>${esc(p.event_name)}</td><td>${esc(p.transaction_ref || "Not paid yet")}</td><td>${money(p.amount)}</td><td>${badge(p.payment_status)}</td>${actions ? `<td>${p.payment_status === "pending" && p.registration_status === "pending" ? `<button class="btn small" data-org-mark-paid="${p.payment_id}">Mark received</button>` : ""}</td>` : ""}</tr>`).join("")}
    </tbody></table></div>`;
}

function orgScheduleTable(rows, actions = true) {
  if (!rows.length) return emptyState("Nothing scheduled yet.");
  return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Time</th><th>Event</th><th>Round</th><th>Venue</th>${actions ? "<th></th>" : ""}</tr></thead><tbody>
    ${rows.map(s => `<tr><td>${FestivoUI.date(s.event_date)}</td><td>${FestivoUI.shortTime(s.start_time)}–${FestivoUI.shortTime(s.end_time)}</td><td>${esc(s.event_name)}</td><td>${esc(s.round_name)}</td><td>${esc(s.venue_name)}</td>${actions ? `<td><div class="row-actions"><button class="btn small ghost" data-org-edit-round="${s.schedule_id}">Edit</button><button class="btn small ghost danger" data-org-delete-round="${s.schedule_id}">Delete</button></div></td>` : ""}</tr>`).join("")}
    </tbody></table></div>`;
}

let orgMinimumRegistrations = 0;

async function orgRenderEvents(root) {
  return orgLoad(root, async () => {
    const { events } = await FestivoUI.call("GET", `/events/mine?min_registrations=${orgMinimumRegistrations}`);
    root.innerHTML = pageHead("Events", "Create, edit, assign judges and view event reports.", `<button class="btn" id="orgCreateEvent">${icon("plus")} Create event</button>`) +
      `<form id="orgMinimumForm" class="toolbar"><label for="orgMinimum">Minimum active registrations</label>
       <input id="orgMinimum" name="minimum" type="number" min="0" step="1" value="${orgMinimumRegistrations}" required>
       <button class="btn small" type="submit">Apply</button></form>` +
      (events.length || !orgMinimumRegistrations ? orgEventTable(events) : emptyState("No events meet this registration count."));
    root.querySelector("#orgCreateEvent").addEventListener("click", () => orgOpenEventForm());
    root.querySelector("#orgMinimumForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const minimum = Number(e.currentTarget.elements.minimum.value);
      if (!Number.isSafeInteger(minimum) || minimum < 0) return toast("Enter a valid minimum", "error");
      orgMinimumRegistrations = minimum;
      orgRenderEvents(root);
    });
    orgWireEventActions(root);
  });
}

async function orgOpenEventForm(eventId = null) {
  try {
    const [{ fests }, { events }, { judges }] = await Promise.all([
      FestivoUI.call("GET", "/fests"), FestivoUI.call("GET", "/events/mine"), FestivoUI.call("GET", "/judges")
    ]);
    const editing = eventId ? events.find(e => Number(e.event_id) === Number(eventId)) : null;
    let assigned = [];
    let fullEvent = editing;
    if (editing) {
      const response = await FestivoUI.call("GET", `/events/${eventId}`);
      fullEvent = response.event;
      assigned = (await FestivoUI.call("GET", `/events/${eventId}/judges`)).judges.map(j => Number(j.user_id));
    }
    const event = fullEvent || { fest_id: fests[0]?.fest_id || "", event_name: "", category_name: "Music", event_type: "Individual", registration_fee: 0, max_participants: 20, description: "", criteria: '["Creativity","Technique","Presentation"]' };
    const criteria = FestivoUI.criteria(event.criteria).join(", ");
    openModal(editing ? "Edit event" : "Create event", `<form id="orgEventForm">
      <div class="form-grid">
        <div class="field full"><label>Event name</label><input name="event_name" maxlength="150" required minlength="3" value="${esc(event.event_name)}"></div>
        <div class="field"><label>Fest</label><select name="fest_id" required ${editing ? "disabled" : ""}>${options(fests.map(f => ({ value: f.fest_id, label: f.fest_name })), event.fest_id)}</select>${editing ? `<input type="hidden" name="fest_id" value="${event.fest_id}">` : ""}</div>
        <div class="field"><label>Category</label><select name="category_name">${options(["Music", "Dance", "Technical", "Arts", "Literary", "Sports", "Gaming", "Other"].map(x => ({ value: x, label: x })), event.category_name)}</select></div>
        <div class="field"><label>Type</label><select name="event_type">${options([{ value: "Individual", label: "Individual" }, { value: "Team", label: "Team" }], event.event_type)}</select></div>
        <div class="field"><label>Registration fee (₹)</label><input name="registration_fee" type="number" min="0" step="0.01" required value="${Number(event.registration_fee)}"></div>
        <div class="field"><label>Maximum participants / teams</label><input name="max_participants" type="number" min="1" step="1" required value="${Number(event.max_participants)}"></div>
        <div class="field full"><label>Description</label><textarea name="description" maxlength="400">${esc(event.description || "")}</textarea></div>
        <div class="field full"><label>Scoring criteria (comma separated, 1–5)</label><input name="criteria" value="${esc(criteria)}" required></div>
        <div class="field full"><label>Assign judges</label><div class="chips">${judges.map(j => `<label class="check"><input type="checkbox" name="judge" value="${j.user_id}"${assigned.includes(Number(j.user_id)) ? " checked" : ""}> ${esc(j.name)}</label>`).join("") || "No judge accounts found."}</div></div>
      </div><div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" type="submit">${editing ? "Save changes" : "Create event"}</button></div></form>`, modal => {
      const form = modal.querySelector("#orgEventForm");
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        data.fest_id = Number(data.fest_id);
        data.registration_fee = Number(data.registration_fee);
        data.max_participants = Number(data.max_participants);
        data.criteria = data.criteria.split(",").map(s => s.trim()).filter(Boolean);
        const judgeIds = [...form.querySelectorAll("input[name=judge]:checked")].map(x => Number(x.value));
        try {
          let id = eventId;
          if (editing) await FestivoUI.call("PUT", `/events/${eventId}`, data);
          else id = (await FestivoUI.call("POST", "/events", data)).event_id;
          const old = editing ? (await FestivoUI.call("GET", `/events/${id}/judges`)).judges : [];
          for (const judge of old) if (!judgeIds.includes(Number(judge.user_id))) await FestivoUI.call("DELETE", `/events/${id}/judges/${judge.judge_id}`);
          for (const judgeId of judgeIds) if (!old.some(j => Number(j.user_id) === judgeId)) await FestivoUI.call("POST", `/events/${id}/judges`, { user_id: judgeId });
          closeModal(); toast(editing ? "Event updated" : "Event created"); refreshTab();
        } catch (error) { toast(error.message, "error"); }
      });
    }, true);
  } catch (error) { toast(error.message, "error"); }
}

function orgWireEventActions(root) {
  root.querySelectorAll("[data-org-edit]").forEach(b => b.addEventListener("click", () => orgOpenEventForm(Number(b.dataset.orgEdit))));
  root.querySelectorAll("[data-org-delete]").forEach(b => b.addEventListener("click", () => confirmDialog("Delete this event? The backend will reject deletion if registrations exist.", async () => {
    try { const r = await FestivoUI.call("DELETE", `/events/${b.dataset.orgDelete}`); toast(r.message); refreshTab(); }
    catch (error) { toast(error.message, "error"); }
  }, "Delete event")));
  root.querySelectorAll("[data-org-judges]").forEach(b => b.addEventListener("click", async () => {
    try {
      const { judges } = await FestivoUI.call("GET", `/events/${b.dataset.orgJudges}/judges`);
      openModal("Assigned judges", judges.length ? `<ul class="list">${judges.map(j => `<li><div class="grow"><b>${esc(j.name)}</b><small>${esc(j.email)}</small></div><button class="btn small ghost danger" data-remove-judge="${j.judge_id}">Remove</button></li>`).join("")}</ul>` : emptyState("No judges assigned."), modal => {
        modal.querySelectorAll("[data-remove-judge]").forEach(x => x.addEventListener("click", async () => {
          try { await FestivoUI.call("DELETE", `/events/${b.dataset.orgJudges}/judges/${x.dataset.removeJudge}`); toast("Judge removed"); closeModal(); refreshTab(); }
          catch (error) { toast(error.message, "error"); }
        }));
      });
    } catch (error) { toast(error.message, "error"); }
  }));
  root.querySelectorAll("[data-org-report]").forEach(b => b.addEventListener("click", async () => {
    try {
      const id = b.dataset.orgReport;
      const [registrations, board, feedback] = await Promise.all([
        FestivoUI.call("GET", `/events/${id}/registrations`), FestivoUI.call("GET", `/events/${id}/leaderboard`), FestivoUI.call("GET", `/events/${id}/feedback`)
      ]);
      openModal("Event reports", `<h3>Registrations (${registrations.registrations.length})</h3>${registrations.registrations.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Roll no</th><th>Team</th><th>Status</th><th>Payment</th></tr></thead><tbody>${registrations.registrations.map(r => `<tr><td>${esc(r.student_name)}</td><td>${esc(r.roll_no)}</td><td>${esc(r.team_name || "—")}</td><td>${badge(r.status)}</td><td>${badge(r.payment_status || "free")}</td></tr>`).join("")}</tbody></table></div>` : emptyState("No registrations")}
        <h3>Leaderboard</h3>${board.leaderboard.length ? `<ul class="list">${board.leaderboard.map(r => `<li>#${Number(r.event_rank)} · ${esc(r.student_name)} — ${Number(r.total_score).toFixed(1)}</li>`).join("")}</ul>` : emptyState("No scores submitted")}
        <h3>Feedback</h3><p>${feedback.feedback_count} reviews · average ${feedback.average_rating ?? "—"}</p>${(feedback.feedback || []).map(r => `<p><b>${Number(r.rating)}/5</b> ${esc(r.comments || "")}</p>`).join("")}`);
    } catch (error) { toast(error.message, "error"); }
  }));
}

async function orgRenderRegistrations(root) {
  return orgLoad(root, async () => {
    const { events } = await FestivoUI.call("GET", "/events/mine");
    const results = await Promise.all(events.map(e => FestivoUI.call("GET", `/events/${e.event_id}/registrations`)));
    const rows = results.flatMap((r, i) => r.registrations.map(x => ({ ...x, event_name: events[i].event_name })));
    root.innerHTML = pageHead("Registrations", "Participants signed up for events you organise.", `<button class="btn ghost" id="orgExportRegs">${icon("download")} Export CSV</button>`) +
      (rows.length ? `<div class="table-wrap"><table><thead><tr><th>Participant</th><th>Roll no</th><th>Event</th><th>Team</th><th>Registered</th><th>Status</th><th>Payment</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.student_name)}</b><small>${esc(r.department || "")} ${r.year ? "Y" + r.year : ""}</small></td><td>${esc(r.roll_no)}</td><td>${esc(r.event_name)}</td><td>${esc(r.team_name || "—")}</td><td>${r.registration_date ? fmtDateTime(r.registration_date) : "—"}</td><td>${badge(r.status)}</td><td>${badge(r.payment_status || "free")}</td></tr>`).join("")}</tbody></table></div>` : emptyState("No registrations yet."));
    root.querySelector("#orgExportRegs").addEventListener("click", () => downloadCSV("festivo-registrations.csv", [["Participant", "Roll no", "Event", "Team", "Registered", "Status", "Payment"], ...rows.map(r => [r.student_name, r.roll_no, r.event_name, r.team_name, r.registration_date, r.status, r.payment_status]) ]));
  });
}

async function orgRenderPayments(root) {
  return orgLoad(root, async () => {
    const { payments, summary } = await FestivoUI.call("GET", "/payments");
    root.innerHTML = pageHead("Payments & revenue", "Review demo payments and record cash received.", `<button class="btn ghost" id="orgExportPayments">${icon("download")} Export CSV</button>`) +
      `<div class="stats">${statTile("rupee", rupees(summary.collected), "Collected")}${statTile("clock", rupees(summary.pending), "Pending")}${statTile("card", summary.transaction_count, "Transactions")}</div>${orgPaymentTable(payments)}`;
    root.querySelector("#orgExportPayments").addEventListener("click", () => downloadCSV("festivo-payments.csv", [["Participant", "Event", "Transaction", "Method", "Amount", "Status", "Date"], ...payments.map(p => [p.student_name, p.event_name, p.transaction_ref, p.payment_method, p.amount, p.payment_status, p.payment_date])]));
    orgWirePaymentActions(root);
  });
}

function orgWirePaymentActions(root) {
  root.querySelectorAll("[data-org-mark-paid]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Record this pending payment as received in cash?")) return;
    try { const r = await FestivoUI.call("PATCH", `/payments/${b.dataset.orgMarkPaid}/mark-received`); toast(r.message); refreshTab(); }
    catch (error) { toast(error.message, "error"); }
  }));
}

async function orgRenderSchedule(root) {
  return orgLoad(root, async () => {
    const [{ events }, { schedule }, { venues }, { fests }] = await Promise.all([
      FestivoUI.call("GET", "/events/mine"), FestivoUI.call("GET", "/schedule"), FestivoUI.call("GET", "/venues"), FestivoUI.call("GET", "/fests")
    ]);
    const ids = new Set(events.map(e => Number(e.event_id)));
    const rows = schedule.filter(s => ids.has(Number(s.event_id)));
    root.innerHTML = pageHead("Schedule", "Add or edit rounds. The backend checks fest dates and venue clashes.", `<button class="btn" id="orgAddRound">${icon("plus")} Add round</button>`) + orgScheduleTable(rows);
    root.querySelector("#orgAddRound").addEventListener("click", () => orgOpenRoundForm(null, events, venues, fests));
    root.querySelectorAll("[data-org-edit-round]").forEach(b => b.addEventListener("click", () => orgOpenRoundForm(rows.find(x => Number(x.schedule_id) === Number(b.dataset.orgEditRound)), events, venues, fests)));
    root.querySelectorAll("[data-org-delete-round]").forEach(b => b.addEventListener("click", () => confirmDialog("Remove this schedule round?", async () => {
      try { const r = await FestivoUI.call("DELETE", `/schedule/${b.dataset.orgDeleteRound}`); toast(r.message); refreshTab(); }
      catch (error) { toast(error.message, "error"); }
    }, "Delete round")));
  });
}

function orgOpenRoundForm(round, events, venues, fests) {
  if (!events.length || !venues.length) return toast("Add an event and a venue first.", "error");
  const row = round || { event_id: events[0].event_id, venue_id: venues[0].venue_id, round_name: "", event_date: "", start_time: "10:00", end_time: "12:00" };
  openModal(round ? "Edit round" : "Add round", `<form id="orgRoundForm"><div class="form-grid">
    <div class="field full"><label>Event</label><select name="event_id">${options(events.map(e => ({ value: e.event_id, label: e.event_name })), row.event_id)}</select></div>
    <div class="field full"><label>Round name</label><input name="round_name" required minlength="2" maxlength="100" value="${esc(row.round_name)}"></div>
    <div class="field full"><label>Venue</label><select name="venue_id">${options(venues.map(v => ({ value: v.venue_id, label: `${v.venue_name} (capacity ${v.capacity})` })), row.venue_id)}</select></div>
    <div class="field"><label>Date</label><input type="date" name="event_date" required value="${esc(String(row.event_date || "").slice(0, 10))}"></div>
    <div class="field"><label>Start time</label><input type="time" name="start_time" required value="${FestivoUI.shortTime(row.start_time)}"></div>
    <div class="field"><label>End time</label><input type="time" name="end_time" required value="${FestivoUI.shortTime(row.end_time)}"></div>
    </div><p class="muted">Round date must fall within its fest. A venue cannot host overlapping rounds.</p>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" type="submit">${round ? "Save changes" : "Add round"}</button></div></form>`, modal => {
    modal.querySelector("#orgRoundForm").addEventListener("submit", async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      data.event_id = Number(data.event_id); data.venue_id = Number(data.venue_id);
      try {
        const result = round ? await FestivoUI.call("PUT", `/schedule/${round.schedule_id}`, data) : await FestivoUI.call("POST", "/schedule", data);
        closeModal(); toast(result.message); refreshTab();
      } catch (error) { toast(error.message, "error"); }
    });
  }, true);
}

startDashboard({
  roleLabel: "Organizer", roleIcon: "chart", theme: "organizer", apiMode: true,
  person: FestivoUI.personHtml(),
  tabs: [
    { id: "overview", label: "Fest Overview", icon: "grid", render: orgOverview },
    { id: "events", label: "Events", icon: "ticket", render: orgRenderEvents },
    { id: "registrations", label: "Registrations", icon: "users", render: orgRenderRegistrations },
    { id: "payments", label: "Payments & Revenue", icon: "wallet", render: orgRenderPayments },
    { id: "schedule", label: "Schedule", icon: "calendar", render: orgRenderSchedule }
  ]
});
