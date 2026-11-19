async function api(method, path, body) {
  const headers = { "Accept": "application/json", "X-Demo-User-Id": localStorage.getItem("festivo_user_id") || "" };
  if (body !== undefined && body !== null) headers["Content-Type"] = "application/json";
  try {
    const res = await fetch("/api" + (path.startsWith("/") ? path : "/" + path), { method, headers, body: body !== undefined && body !== null ? JSON.stringify(body) : undefined });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, status: 0, data: { message: "Cannot reach the server. Is it running?" } }; // server not running
  }
}

const esc = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const rupees = (amount) => "₹" + Number(amount).toLocaleString("en-IN"); // always shows ₹, even for 0
const money = (amount) => (Number(amount) === 0 ? "Free" : rupees(amount));
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (t) => String(t).slice(0, 5); // "10:00:00" -> "10:00"
const fmtDateTime = (t) =>
  new Date(String(t).replace(" ", "T")).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
