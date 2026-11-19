const queries = require("../database/queries");

const allowRoles = (...roles) => async (req, res, next) => {
  try {
    const id = Number(req.get("X-Demo-User-Id"));
    const user = Number.isInteger(id) && id > 0
      ? await queries.findDemoUser(id)
      : undefined;
    if (!user) return res.status(401).json({ message: "Choose who you are first" });
    if (roles.length && !roles.includes(user.user_type)) return res.status(403).json({ message: "Access denied" });
    req.user = user;
    next();
  } catch (err) { next(err); }
};

module.exports = allowRoles;
