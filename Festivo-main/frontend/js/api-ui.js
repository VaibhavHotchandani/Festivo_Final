window.FestivoUI = {
  async call(method, path, body) {
    const result = await api(method, path, body);
    if (!result.ok) throw new Error(result.data.message || `Request failed (${result.status})`);
    return result.data;
  },
  user() {
    return {
      id: localStorage.getItem("festivo_user_id") || "",
      name: localStorage.getItem("festivo_user_name") || "Demo user",
      role: localStorage.getItem("festivo_user_role") || ""
    };
  },
  personHtml() {
    const user = this.user();
    return `<div class="person"><span class="avatar">${initials(user.name)}</span><div><b>${esc(user.name)}</b><small>Demo account · API mode</small></div></div>`;
  },
  criteria(value) {
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) && parsed.length ? parsed : ["Creativity", "Technique", "Presentation"];
    } catch {
      return String(value || "Creativity, Technique, Presentation").split(",").map(s => s.trim()).filter(Boolean);
    }
  },
  fail(root, error) {
    root.innerHTML = `<div class="panel"><h2>Could not load data</h2><p>${esc(error.message || String(error))}</p><p class="muted">Check that the backend is running, MySQL is connected, and you selected a demo user from the home page.</p><button class="btn" id="retryLoad">Retry</button></div>`;
    root.querySelector("#retryLoad").addEventListener("click", () => refreshTab());
  },
  async render(root, work) {
    root.innerHTML = '<div class="panel"><p>Loading data from MySQL…</p></div>';
    try { await work(); } catch (error) { this.fail(root, error); }
  },
  date(value) {
    if (!value) return "—";
    return fmtDate(String(value).slice(0, 10));
  },
  shortTime(value) { return value ? String(value).slice(0, 5) : "—"; },
  goHomeIfNoUser() {
    if (!this.user().id) { location.href = "/pages/index.html"; return true; }
    return false;
  }
};
