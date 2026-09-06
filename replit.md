# TechHunt 2026

## Run

The app is a single Node.js and Express server:

```bash
npm start
```

It listens on the `PORT` environment variable and defaults to port `5000` for Replit.

## Access

- Admin login: username `majen`, password `majen`
- Team login: any team code in the format `TEAM-...` (the team password is optional in the UI; `hunt` is accepted). Teams are created when they first sign in, so the event is not limited to a fixed number of teams.

## Current storage model

This first event-ready version intentionally has no MongoDB dependency or external authentication. Teams, sessions, challenge progress, and admin activity are held in memory and reset when the server restarts. The seeded event contains 10 distributed missions, and team routes are assigned as teams sign in.

## Main flows

- Admin: start, pause, resume, and reset controls with an event timer; live station pulse, team registry, team reset, station enable/disable, and leaderboard.
- Team: sign in with a team code, see the assigned location, wait for location-volunteer verification, receive one Coding question at a time, answer the Mystery quiz by selecting one option at a time, open the first riddle directly, scan the next two riddle QR codes, and follow the controlled route.
- Volunteers have location-scoped accounts. Checkpoints are Coding 1 · SM Block 310, Coding 2 · SM Block 311, Logical 1 · Sports Complex, Logical 2 · KP Ground, Puzzle · CCD, Crossword · Canteen Mangalore, Quiz 1 · D Block, and Quiz 2 · C Block. Demo examples are `coding1 / events`, `logic1 / events`, `puzzle1 / events`, and `mystery1 / events`.
- Coding verification starts a server-timed five-minute round; each team receives one of the 10 uploaded Coding questions from the shared pool, a correct answer before the deadline awards full points, wrong answers do not reduce points, and timer expiry awards 20% and advances the route. Logical checkpoints have 2 sets each; Puzzle and Crossword have 6 sets each. These missions expose only a set number in the team portal, while volunteers record a score such as `6/10` to release the next clue. Mystery verification starts the uploaded Set 1 or Set 2 quiz, with 20 questions in each set, showing one option question at a time and advancing immediately after selection without showing correctness or points. Riddles have 3 questions per round; they do not use a volunteer or physical location, the first pass opens automatically, and the next two passes require QR scans.
- Stations do not enforce a capacity limit. The leaderboard uses score first and total completion time second; attempts are not shown or used for ranking.
- Login and API requests do not use IP-based rate limits. The app is intended to support large event logins, subject to the runtime's available resources.

## Replit preview

The main workflow should run `npm start` as a webview on port `5000`.