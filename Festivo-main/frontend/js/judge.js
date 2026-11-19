if (FestivoUI.goHomeIfNoUser()) throw new Error("Choose a demo account first");

async function judgeRenderEvents(root) {
  return FestivoUI.render(root, async () => {
    const { events } = await FestivoUI.call("GET", "/judges/events");
    root.innerHTML = pageHead("My assigned events", "Choose an event to review participants and submit scores.") +
      `<div class="grid wide">${events.map(e => `<div class="card"><div class="card-top"><span class="badge">${esc(e.fest_name)}</span>${icon("clipboard", 18)}</div>
        <h3>${esc(e.event_name)}</h3><p class="muted">Event #${e.event_id}</p>
        <button class="btn" data-judge-open="${e.event_id}">Open scoring sheet ${icon("arrowRight", 16)}</button></div>`).join("") || emptyState("No events have been assigned to this judge account yet.")}</div>`;
    root.querySelectorAll("[data-judge-open]").forEach(b => b.addEventListener("click", () => {
      localStorage.setItem("festivo_judge_event_id", b.dataset.judgeOpen);
      goToTab("scoring");
    }));
  });
}

async function judgeRenderScoring(root) {
  return FestivoUI.render(root, async () => {
    const eventId = localStorage.getItem("festivo_judge_event_id");
    if (!eventId) {
      root.innerHTML = pageHead("Scoring sheet", "Select one of your assigned events first.") + '<button class="btn" id="judgeChooseEvent">Choose event</button>';
      root.querySelector("#judgeChooseEvent").addEventListener("click", () => goToTab("events"));
      return;
    }

    const [{ event }, { registrations }] = await Promise.all([
      FestivoUI.call("GET", `/events/${eventId}`),
      FestivoUI.call("GET", `/judges/events/${eventId}/registrations`)
    ]);
    const criteria = FestivoUI.criteria(event.criteria);
    root.innerHTML = pageHead("Scoring sheet", `${event.event_name} · ${event.fest_name}`, `<button class="btn ghost" id="judgeChangeEvent">Change event</button>`) +
      `<div class="panel"><p>${esc(event.description || "No description yet.")}</p><p class="muted">Enter a score from 0 to 100 for each criterion. Your scores are saved to MySQL.</p></div>
      <div class="panel"><h2>${icon("users")} Confirmed participants (${registrations.length})</h2>
      ${registrations.length ? `<div class="grid wide">${registrations.map(r => `<div class="card"><div class="card-top"><span class="badge">${esc(r.roll_no)}</span><b>Total: ${Number(r.total_score || 0).toFixed(1)}</b></div>
        <h3>${esc(r.student_name)}</h3><form class="judgeScoreForm" data-registration="${r.registration_id}">
          ${criteria.map((criterion, i) => {
            const old = (r.scores || []).find(s => s.criteria === criterion);
            return `<div class="field"><label>${esc(criterion)}</label><input type="number" name="score-${i}" data-criterion="${esc(criterion)}" min="0" max="100" step="0.5" required value="${old ? Number(old.score) : ""}" placeholder="0–100"></div>`;
          }).join("")}
          <button class="btn" type="submit">Save scores</button></form></div>`).join("")}</div>` : emptyState("There are no confirmed participants to score yet.")}</div>`;
    root.querySelector("#judgeChangeEvent").addEventListener("click", () => goToTab("events"));
    root.querySelectorAll(".judgeScoreForm").forEach(form => form.addEventListener("submit", async e => {
      e.preventDefault();
      const fields = [...form.querySelectorAll("[data-criterion]")];
      try {
        for (const field of fields) {
          await FestivoUI.call("POST", "/judges/scores", {
            event_id: Number(eventId), registration_id: Number(form.dataset.registration),
            criteria: field.dataset.criterion, score: Number(field.value)
          });
        }
        toast("Scores saved");
        refreshTab();
      } catch (error) { toast(error.message, "error"); }
    }));
  });
}

startDashboard({
  roleLabel: "Judge", roleIcon: "clipboard", theme: "judge", apiMode: true,
  person: FestivoUI.personHtml(),
  tabs: [
    { id: "events", label: "My Events", icon: "ticket", render: judgeRenderEvents },
    { id: "scoring", label: "Scoring Sheet", icon: "trophy", render: judgeRenderScoring }
  ]
});
