# Festivo — College Fest Management (DBMS Project)

**Stack:** HTML, CSS, vanilla JavaScript, Node.js, Express, MySQL 8 (`mysql2/promise`). The dashboards now use the backend API and MySQL rather than browser mock data. For this classroom demo there is no password login: the user selects one of the seeded demo accounts, and the frontend sends its ID in `X-Demo-User-Id`. This is a demo identity mechanism, not production security.

## 1. Database setup

### Fresh database

Use MySQL 8.0.16 or later. Open and execute these files in MySQL Workbench in this order:

1. `database/schema.sql`
2. Set `festivo_clean` as the default schema in Workbench.
3. `database/views.sql`
4. `database/triggers.sql`
5. `database/sample-data.sql`

`database/queries.sql` is optional and contains read-only viva examples. Seed dates are relative to the day you run the seed script, so the registration demo starts with future deadlines.

### Updating from FESTIVO_Queries_Refactored

1. Stop Node and back up the existing MySQL database. Select the existing schema in Workbench.
2. Execute `database/migration_er_alignment.sql` once. It links old team registrations by captain, preserves existing rosters, and backfills the event on scores. If the migration reports conflicting data, resolve the reported conflict before retrying. It checks for those conflicts before any table changes. MySQL commits DDL separately, so restore the backup before retrying if an unexpected DDL error leaves a partially upgraded schema.
3. Execute `database/views.sql` and `database/triggers.sql` in the same schema to refresh the views and restore the scoring trigger. Then start the updated backend using the same `DB_NAME`.

### Updating from FESTIVO_Final.zip

Select your existing schema and rerun `database/triggers.sql`. This updates the schedule triggers so the database's time-order CHECK can report invalid times before an overlap error. Then follow the update steps above.

### Existing database from before the DBMS changes

1. Set your existing database as the default schema in Workbench. Keep its name in `backend/.env`.
2. For a legacy database missing `event.description`, `event.criteria` and `registration.team_name`, run `database/migration_api_integration.sql` first. Its `USE festivo` line targets that legacy database. Adjust the name if required.
3. Open `database/migration_dbms_constraints.sql`. Run its three preflight SELECTs separately and resolve any rows they return. Then run the ALTER statements once.
4. Run `database/views.sql` and `database/triggers.sql` with the existing database selected. Then follow the update steps above.

### ER mapping in this ZIP

- `TEAM.event_id` is optional until the captain registers the roster for a team event. Once assigned, the existing registration flow uses that event. `captain_student_id` implements the diagram's unique `captain_id`. `TEAM_MEMBER` stores team and student IDs.
- `REGISTRATION.team_id` is nullable for individual entries. The foreign key also checks the team event. The student's existing team-name prompt resolves the captain's roster, and response queries still return its name.
- `EVENT_JUDGE.judge_id` identifies one assignment. `SCORE.event_id` must match both the judge assignment and registration. The scoring criterion is retained for the existing scoring screen.
- `EVENT_FEEDBACK.registration_id` is required and unique. The composite foreign key also enforces the event match.
- `organizer_user_id` implements the diagram's `EVENT.user_id`. Event status defaults to open, subject to the existing fest deadline. Stall owner names are nullable for existing stalls.

## 2. Backend setup

Open a terminal in `Festivo-main/backend`:

```bash
npm install
```

Copy `.env.example` to `.env` and set the actual MySQL credentials:

```env
PORT=3000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=festivo_clean
NODE_ENV=development
```

Start the server:

```bash
npm start
```

Open **http://localhost:3000**. Do not double-click the HTML files when testing API integration; use the Express-served URL so the frontend and `/api` share the same origin. Check **http://localhost:3000/api/health** and look for `{"status":"ok","database":"connected"}`.

## 3. Demo accounts

Use the home page to choose a role and a demo account. The backend reads the selected ID from the `X-Demo-User-Id` header.

- Students: `student@festivo.test`, `student2@festivo.test`
- Organizers: `organizer@festivo.test`, `organizer2@festivo.test`
- Judges: `judge@festivo.test`, `judge2@festivo.test`

The sample data seeds these users. The API intentionally has no real authentication or password validation.

## 4. Request flow

`frontend/js/student.js` / `organizer.js` / `judge.js` → `frontend/js/api.js` (`fetch`) → `backend/app.js` → `backend/routes/*.routes.js` → role middleware (for protected routes) → `backend/controllers/*.controller.js` → named functions in `backend/database/queries.js` → `backend/config/db.js` → MySQL → JSON response → dashboard refresh.

`frontend/js/api-ui.js` contains small shared UI/API helpers. `mock-data.js` and `store.js` remain only as legacy reference files and are no longer included by the dashboard HTML pages.

## 5. Included features

- Public event, fest, venue, schedule and stall browsing.
- Student registration, team name for team events, cancellation, demo payment, feedback and team membership management.
- Organizer event creation/editing/deletion, judge assignment, registration reports, leaderboard/feedback reports, payment review and schedule create/edit/delete.
- Judge assigned-event view and per-criterion scoring.
- CSV export for organizer registrations and payments.
- Backend-side checks for role, event ownership, capacity, registration deadline, venue clash and assigned-judge scoring.

## 6. API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Server/database health |
| GET | `/api/overview` | Home page counts and fests |
| GET | `/api/demo-users` | Demo accounts for the role picker |
| GET | `/api/events`, `/api/events/:id` | Browse events/details. The list accepts optional `q` and `fest_id`. |
| GET/POST | `/api/events/mine`, `/api/events` | Organizer list/create. The list accepts `min_registrations`. |
| PUT/DELETE | `/api/events/:id` | Organizer update/delete (owner checks apply) |
| GET | `/api/events/:id/registrations`, `/leaderboard`, `/feedback` | Organizer reports |
| GET/POST/DELETE | `/api/events/:id/judges...` | Manage event judges |
| GET | `/api/fests`, `/api/venues`, `/api/schedule`, `/api/stalls` | Public data |
| POST/PUT/DELETE | `/api/schedule`, `/api/schedule/:id` | Organizer schedule management |
| POST/GET/PATCH | `/api/registrations`, `/api/registrations/me`, `/api/registrations/:id/cancel` | Student registration actions |
| GET | `/api/registrations/activity` | Student registration, payment and feedback activity |
| POST | `/api/payments/demo` | Student demo payment |
| GET/PATCH | `/api/payments`, `/api/payments/:id/mark-received` | Organizer payment review |
| GET/POST | `/api/feedback/me`, `/api/feedback` | Student feedback history/submission |
| GET/POST | `/api/teams`, `/api/teams/mine` | Team listing/creation and membership APIs |
| GET/POST | `/api/judges/events`, `/api/judges/events/:eventId/registrations`, `/api/judges/scores` | Judge work and scoring |

## 7. Notes

- Demo payments never charge real money or collect card details.
- API-connected dashboards read from MySQL; the old localStorage mock store is no longer used by the HTML pages.
- This is a college demonstration. Do not expose this no-password demo identity mechanism on a public production deployment.

## 8. Where the SQL lives

- `backend/database/queries.js` contains every SQL statement issued by the running application. It includes the named database functions used by controllers, the role middleware, the health endpoint, and the staff CLI. Transaction helpers use the same connection for all statements in a transaction.
- `database/schema.sql`, `views.sql`, `triggers.sql`, and the migration files install database objects. `database/sample-data.sql` loads demo rows. `database/queries.sql` contains optional read-only examples for the viva.

For example, the event controller calls `queries.listEvents(search, festId)` and the query module builds the SQL and binds the values. The controllers still handle request parsing, ownership, and responses. The schedule CHECK handles start/end ordering, and triggers check judge-account type and scoring eligibility. Range checks for raw score and feedback inputs run before MySQL rounds or converts values to column types.

## 9. SQL features and CRUD by caller

- **CHECK and keys** in `database/schema.sql` cover score range, event type, fees, dates, capacity, ratings, duplicate prevention, and matching a feedback row to its registration's event.
- **Triggers** in `database/triggers.sql` block overlapping rounds, assignments to non-judge accounts, and scores for unconfirmed or wrong-event registrations. Schedule writes through the API lock the venue row before the write so that bookings for the same venue are checked in sequence.
- **Views** supply event counts and remaining seats using a LEFT JOIN, and organizer payment totals using SUM(CASE ...) and GROUP BY.
- **Queries in the UI** include LIKE in event search, HAVING in the organizer's minimum-registration filter, RANK on the leaderboard, a score upsert, and UNION ALL in the student's recent activity.
- **Transactions** group registration/payment changes, cancellation/refund, demo or cash payment confirmation, and team creation with its first member.

| File | CRUD | Main operations |
|---|---|---|
| `event.controller.js` | C/R/U/D | Events, event details, participants, leaderboard and feedback |
| `schedule.controller.js` | C/R/U/D | Schedule rounds, venues and fest/sponsor data |
| `registration.controller.js` | C/R/U | Registration, reactivation, cancellation, pending payments and activity |
| `payment.controller.js` | C/R/U | Payment attempts, reports and registration confirmation |
| `judge.controller.js` | C/R/U/D | Assignments, participants, score upsert and removal of assignments |
| `team.controller.js` | C/R/D | Teams and membership, including deleting membership rows |
| `feedback.controller.js` | C/R | Feedback submission and history |
| `home.controller.js`, `stall.controller.js` | R | Overview, demo identities and stall directory |
| `shared.js`, `role.middleware.js` | R | Student, event ownership and role lookups |
| `create-staff.js` | C | Demo staff accounts |
| `database/sample-data.sql` | C | Seed rows |
| `database/migration_api_integration.sql` | U and DDL | Backfill criteria and alter the legacy schema |
| `database/schema.sql`, `views.sql`, `triggers.sql`, `migration_dbms_constraints.sql` | DDL | Tables, constraints, indexes, views and triggers |

These files call the named functions in `backend/database/queries.js`. The frontend reaches those operations through the API. Cancelling a registration is an UPDATE. Deleting a team membership, round, event or judge assignment is a DELETE.
