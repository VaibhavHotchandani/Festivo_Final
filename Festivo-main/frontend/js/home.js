const HOME_ROLES = [
  { key: "student", userType: "student", title: "Student", iconName: "user", link: "student-dashboard.html", text: "Browse events, register, pay and leave feedback." },
  { key: "judge", userType: "event_judge", title: "Judge", iconName: "clipboard", link: "judge-dashboard.html", text: "Open assigned events and submit scores." },
  { key: "organizer", userType: "organizer", title: "Organizer", iconName: "chart", link: "organizer-dashboard.html", text: "Manage events, registrations, payments and schedules." }
];

async function loadHome() {
  const roles = document.getElementById("roleGrid");
  roles.innerHTML = '<div class="panel"><p>Loading Festivo from MySQL…</p></div>';
  try {
    const [userData, overview] = await Promise.all([
      FestivoUI.call("GET", "/demo-users"),
      FestivoUI.call("GET", "/overview")
    ]);
    const users = userData.users || [];
    const stats = overview.stats || {};
    document.getElementById("homeStats").innerHTML = [
      [stats.fests, "Fests"], [stats.events, "Events"], [stats.venues, "Venues"], [stats.registrations, "Active registrations"]
    ].map(([value, label]) => `<div class="home-stat"><b>${Number(value || 0)}</b><span>${esc(label)}</span></div>`).join("");

    document.getElementById("festCards").innerHTML = (overview.fests || []).map(fest => `
      <div class="card fest-card"><div class="banner"><h3>${esc(fest.fest_name)}</h3><span>${Number(fest.event_count)} events</span></div>
      <p class="meta">${icon("calendar", 16)} ${fmtDate(fest.start_date)} – ${fmtDate(fest.end_date)}</p>
      <p class="meta">${icon("ticket", 16)} Registration closes ${fest.registration_deadline ? fmtDate(fest.registration_deadline) : "—"}</p></div>`).join("") || emptyState("No fests found. Check database/sample-data.sql.");

        const first = (overview.fests || [])[0];
    document.getElementById("eyebrow").innerHTML = first
      ? `${icon("sparkle", 16)} ${esc(first.fest_name)}`
      : `${icon("sparkle", 16)} College fest management`;

    roles.innerHTML = HOME_ROLES.map(role => {
      const roleUsers = users.filter(user => user.user_type === role.userType);
      return `<div class="role-card ${role.key}">
        <span class="role-icon">${icon(role.iconName, 28)}</span><h2>${role.title}</h2><p>${esc(role.text)}</p>
        <label for="user-${role.key}">Choose demo account</label>
        <select id="user-${role.key}" ${roleUsers.length ? "" : "disabled"}>
          ${roleUsers.map(u => `<option value="${u.user_id}" data-name="${esc(u.name)}">${esc(u.name)}${u.roll_no ? " · " + esc(u.roll_no) : ""}</option>`).join("")}
        </select>
        <button class="btn" data-enter="${role.key}" ${roleUsers.length ? "" : "disabled"}>Continue as ${role.title} ${icon("arrowRight", 18)}</button>
      </div>`;
    }).join("");

    roles.querySelectorAll("[data-enter]").forEach(button => button.addEventListener("click", () => {
      const role = HOME_ROLES.find(item => item.key === button.dataset.enter);
      const select = roles.querySelector(`#user-${role.key}`);
      const selected = users.find(user => String(user.user_id) === select.value);
      if (!selected) return toast("No demo account is available for this role.", "error");
      localStorage.setItem("festivo_user_id", selected.user_id);
      localStorage.setItem("festivo_user_name", selected.name);
      localStorage.setItem("festivo_user_role", selected.user_type);
      location.href = role.link;
    }));
  } catch (error) {
    roles.innerHTML = `<div class="panel"><h2>Backend connection failed</h2><p>${esc(error.message)}</p><p>Start the backend with <code>npm start</code>, check your <code>.env</code>, then refresh this page.</p></div>`;
    document.getElementById("homeStats").innerHTML = "";
    document.getElementById("festCards").innerHTML = "";
  }
}

loadHome();
