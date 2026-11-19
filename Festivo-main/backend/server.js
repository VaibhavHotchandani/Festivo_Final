require("dotenv").config({ quiet: true });
const PORT = process.env.PORT || 3000;
require("./app").listen(PORT, () => console.log("Festivo running at http://localhost:" + PORT));
