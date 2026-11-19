const queries = require("./database/queries");
const path = require("path");
const express = require("express");

const app = express();
app.use(express.json()); 

app.get("/api/health", async (req, res) => {
  try {
    await queries.healthCheck();
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(500).json({ status: "error", database: "not connected" });
  }
});

app.use("/api/events", require("./routes/event.routes"));
app.use("/api", require("./routes/home.routes"));
app.use("/api/registrations", require("./routes/registration.routes"));
app.use("/api/teams", require("./routes/team.routes"));
app.use("/api/feedback", require("./routes/feedback.routes"));
app.use("/api/stalls", require("./routes/stall.routes"));
app.use("/api/payments", require("./routes/payment.routes"));
app.use("/api/judges", require("./routes/judge.routes"));
app.use("/api", require("./routes/schedule.routes")); 
app.use("/api", (req, res) => res.status(404).json({ message: "Not found" }));

app.use(express.static(path.join(__dirname, "..", "frontend")));
app.get("/", (req, res) => res.redirect("/pages/index.html"));

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "That record already exists" });
  const triggerErrors = {
    "Venue is already booked for that time": [409, "Venue is already booked for that time"],
    "Only judge accounts can be assigned": [400, "That account is not a judge account"],
    "Score requires a confirmed registration in the assigned event": [409, "Only confirmed participants can be scored"],
  };
  const triggerError = err.code === "ER_SIGNAL_EXCEPTION" && triggerErrors[err.sqlMessage];
  if (triggerError) {
    const [status, message] = triggerError;
    return res.status(status).json({ message });
  }
  if (err.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
    const constraintMessages = {
      chk_score_range: "Score must be between 0 and 100",
      chk_event_type: "Choose Individual or Team",
      chk_event_fee: "Registration fee cannot be negative",
      chk_event_capacity: "Maximum participants must be greater than zero",
      chk_schedule_time: "End time must be after start time",
    };
    const name = Object.keys(constraintMessages).find(key => err.sqlMessage?.includes(key));
    return res.status(400).json({ message: constraintMessages[name] || "A database validation rule rejected the value" });
  }
  if (err.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(409).json({ message: "Other records still refer to this item" });
  }
  console.log(err);
  res.status(500).json({ message: "Something went wrong on the server" });
});

module.exports = app;
