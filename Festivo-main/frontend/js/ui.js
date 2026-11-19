
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  trophy: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 14v4M8 21h8M9 18h6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 4v7h-7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>'
};

function icon(name, size = 18) {
  return `<svg class="icon" width="${size}" height="${size}"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${ICONS[name] || ""}
  </svg>`;
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2)
    .map(word => word[0].toUpperCase()).join("");
}

function options(list, selected) {
  return list.map(item =>
    `<option value="${esc(item.value)}"
    ${String(item.value) === String(selected) ? "selected" : ""}>
    ${esc(item.label)}</option>`
  ).join("");
}

function emptyState(message) {
  return `<div class="empty">${icon("search", 28)}
    <p>${esc(message)}</p></div>`;
}

function badge(status) {
  const colours = {
    confirmed: "ok",
    available: "ok",
    success: "ok",
    pending: "warn",
    booked: "warn",
    cancelled: "bad",
    failed: "bad",
    full: "bad"
  };

  return `<span class="badge ${colours[status] || ""}">
    ${esc(status)}</span>`;
}

// 5. SEAT METER: Show occupied and remaining seats
function seatMeter(taken, total) {
  const percent = total > 0
    ? Math.min(100, Math.round(taken / total * 100)) : 0;

  const remaining = Math.max(0, total - taken);
  const message = remaining === 0
    ? "Sold out"
    : `${remaining} seats left`;

  return `<div class="meter-wrap">
    <div class="meter">
      <span style="width:${percent}%"></span>
    </div>
    <small>${taken} / ${total} filled · ${message}</small>
  </div>`;
}

// 6. TOAST: Display a short success or error message
function toast(message, type = "success") {
  let container = document.getElementById("toasts");

  if (!container) {
    container = document.createElement("div");
    container.id = "toasts";
    document.body.appendChild(container);
  }

  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  container.appendChild(item);

  setTimeout(() => item.remove(), 3000);
}

// 7. MODAL: Open and close popup windows
function closeModal() {
  document.getElementById("modal-root")?.remove();
  document.body.classList.remove("modal-open");
}

function openModal(title, bodyHtml, onMount) {
  closeModal();

  const root = document.createElement("div");
  root.id = "modal-root";
  root.className = "modal-backdrop";

  root.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2>${esc(title)}</h2>
        <button class="icon-btn" data-close>×</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
    </div>`;

  document.body.appendChild(root);
  document.body.classList.add("modal-open");

  root.addEventListener("click", event => {
    if (event.target === root ||
        event.target.closest("[data-close]")) {
      closeModal();
    }
  });

  if (onMount) onMount(root.querySelector(".modal"));
}

// 8. CONFIRMATION: Ask before performing an important action
function confirmDialog(message, onConfirm) {
  openModal("Please confirm", `
    <p>${esc(message)}</p>
    <div class="modal-actions">
      <button class="btn ghost" data-close>Cancel</button>
      <button class="btn danger" id="confirmYes">Confirm</button>
    </div>`, modal => {
      modal.querySelector("#confirmYes").addEventListener("click", () => {
        closeModal();
        onConfirm();
      });
    });
}

// Close popup when Escape is pressed
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

// 9. DASHBOARD: Create the common layout and navigation
function startDashboard(config) {
  const app = document.getElementById("app");
  document.body.classList.add(`theme-${config.theme}`);

  const links = config.tabs.map(tab => `
    <a href="#${tab.id}" class="side-link" data-tab="${tab.id}">
      ${icon(tab.icon)}
      <span>${esc(tab.label)}</span>
    </a>`).join("");

  app.innerHTML = `
    <header class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="index.html">FEST<span>IVO</span></a>
        <span class="role-pill">
          ${icon(config.roleIcon, 16)}${esc(config.roleLabel)}
        </span>
        <div class="topbar-right">
          <div id="person">${config.person || ""}</div>
          <a class="btn small light" href="index.html">
            ${icon("refresh", 15)} Switch role
          </a>
        </div>
      </div>
    </header>
    <div class="shell">
      <aside class="sidebar"><nav>${links}</nav></aside>
      <main class="content" id="content"></main>
    </div>`;

  const content = document.getElementById("content");

  // Display the selected dashboard tab
  function showTab() {
    const tabId = location.hash.slice(1) || config.tabs[0].id;
    const tab = config.tabs.find(item => item.id === tabId)
      || config.tabs[0];

    document.querySelectorAll(".side-link").forEach(link => {
      link.classList.toggle("active", link.dataset.tab === tab.id);
    });

    content.innerHTML = "";
    tab.render(content);
  }

  // Allow other functions to navigate or refresh the dashboard
  window.goToTab = id => {
    if (location.hash === `#${id}`) showTab();
    else location.hash = id;
  };

  window.refreshTab = showTab;
  window.addEventListener("hashchange", showTab);
  showTab();
}

// 10. PAGE HEADING: Show title, subtitle and optional action button
function pageHead(title, subtitle, rightHtml = "") {
  return `<div class="page-head">
    <div>
      <h1>${esc(title)}</h1>
      <p>${esc(subtitle || "")}</p>
    </div>
    ${rightHtml ? `<div class="head-actions">${rightHtml}</div>` : ""}
  </div>`;
}

// 11. STAT TILE: Show a number with an icon and label
function statTile(iconName, value, label) {
  return `<div class="stat">
    <span class="stat-icon">${icon(iconName, 20)}</span>
    <div><b>${value}</b><span>${esc(label)}</span></div>
  </div>`;
}
