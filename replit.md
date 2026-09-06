# TechHunt 2026

## Run

The app is a single Node.js and Express server:

```bash
npm start
```

It listens on the `PORT` environment variable and defaults to port `5000` for Replit.

## Access

- Admin and volunteer access details are provided privately to event staff.
- Team login: enter a unique team code/username in the format `TEAM-...`, a unique team name, and the default password `play`. Team codes are normalized to uppercase, so `team-01`, `Team-01`, and `TEAM-01` open the same account. The same three values can be used on multiple phones to open the same team account. A team name cannot be registered twice.

## Current storage model

The app uses MongoDB for persistent event state. Set the `MONGODB_URI` secret to the MongoDB connection string and optionally set `MONGODB_DB` to choose the database; it defaults to `techhunt`. Teams, sessions, challenge progress, and admin activity are persisted in the `app_state` collection.

The server also stores login sessions in the `sessions` collection, so a session remains valid when a user moves between server instances. Event-state writes use a short MongoDB lock and every API request refreshes the latest snapshot before serving it. This keeps multiple app instances from overwriting each other's team progress.

## Running three Render services

For `codehuntv2`, `codehuntv3`, and any additional Render service:

1. Use the same repository and the `npm start` start command.
2. Set the same `MONGODB_URI` secret on every service.
3. Set the same `MONGODB_DB` value on every service (for example, `techhunt`).
4. Keep the services pointed at the same MongoDB cluster and database. Do not use separate databases if the records must be shared.
5. Set the same `SESSION_SECRET` on every service if other application features use it, and never commit any secret to the repository.

The app does not impose its own MongoDB connection-pool size. The MongoDB Node driver and the selected MongoDB tier control the pool behavior. With three services, size the MongoDB cluster for the combined traffic and provider connection limits. The `/api/health` endpoint reports whether the app connected to MongoDB.

## Main flows

- Admin: start, pause, resume, end, and reset controls with an event timer; live station pulse, team registry, team reset, station enable/disable, and leaderboard. Ending the event locks the circuit and publishes final standings.
- Team: sign in with a team code, see the assigned location, wait for location-volunteer verification, receive one Coding question at a time, answer the Mystery quiz by selecting one option at a time, travel to each physical riddle QR spot, scan the QR with the in-app camera scanner, and follow the controlled route.
- Before the event starts, team accounts see a full-page event gate with no clues, locations, missions, or leaderboard exposed. After the organizer ends the event, the team shell is locked and only the final-rank dialog is shown; the team can return to the start screen.
- Participant accounts do not receive leaderboard data or leaderboard navigation. Their portal shows live score, stations cleared, teams in the circuit, and a server-synced time-on-route counter instead.
- Volunteers have location-scoped accounts. Checkpoints are Coding 1 · SM Block 310, Coding 2 · SM Block 311, Logical 1 · Sports Complex, Logical 2 · KP Ground, Puzzle · CCD, Crossword · Canteen Mangalore, Quiz 1 · D Block, and Quiz 2 · C Block. Demo examples are `coding1 / events`, `logic1 / events`, `puzzle1 / events`, and `mystery1 / events`.
- The special volunteer account is `surprise1 / events` at M510. Surprise rounds open every 10 minutes after the event starts, select up to five not-yet-selected active teams, freeze team mission timers for the 10-minute window, and allow each selected team up to three rejections. Accepted teams are verified and awarded 50, 75, 100, 125, 150, 175, or 200 points from the M510 console after the window closes.
- Coding verification starts a server-timed five-minute round; each team receives one of the 10 uploaded Coding questions from the shared pool, a correct answer before the deadline awards full points, wrong answers do not reduce points, and timer expiry awards 20% and advances the route. Logical checkpoints have 2 sets each; Puzzle and Crossword have 6 sets each. These missions expose only a set number in the team portal, while volunteers record a score such as `6/10` to release the next clue. Mystery verification starts the uploaded Set 1 or Set 2 quiz, with 20 questions in each set, showing one option question at a time and advancing immediately after selection without showing correctness or points. Riddle clues appear on the team screen first; teams follow each clue to its physical spot, scan the matching QR, and receive the next riddle. The final QR completes the round.
- Stations do not enforce a capacity limit. The leaderboard uses score first and total completion time second; attempts are not shown or used for ranking.
- Login and API requests do not use IP-based rate limits. The app is intended to support large event logins, subject to the runtime's available resources. JSON request bodies are capped at 2 MB and database waits are bounded so overload returns a retryable error instead of growing memory without limit.

## Replit preview

The main workflow should run `npm start` as a webview on port `5000`.