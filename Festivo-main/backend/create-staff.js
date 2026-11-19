require("dotenv").config({ quiet: true });
const queries = require("./database/queries");

const [name, email, role] = process.argv.slice(2);

(async () => {
  if (!name || !email || !["organizer", "event_judge"].includes(role)) {
    return console.log('Usage: node create-staff.js "Full Name" email organizer|event_judge');
  }
  try {
    await queries.createStaff(name, email.trim().toLowerCase(), role);
    console.log(`Created ${role} account for ${email}`);
  } catch (err) {
    console.log(err.code === "ER_DUP_ENTRY" ? "That name or email already exists" : err.message);
  }
})().finally(() => queries.close());
