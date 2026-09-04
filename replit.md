# CodeHunt / The Orange Circuit

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
- Team: sign in with a team code, see the assigned location, wait for location-volunteer verification, submit Coding/Mystery answers, open the first riddle directly, scan the next two riddle QR codes, and follow the controlled route.
- Volunteers have location-scoped accounts. Demo examples are `coding1 / events` (C1 · LAB A), `logic1 / events` (L1 · NORTH HALL), `puzzle1 / events` (P1 · COURTYARD), and `mystery1 / events` (M1 · MAKER SPACE).
- Coding verification starts a server-timed five-minute round; a correct answer before the deadline awards full points, wrong answers do not reduce points, and timer expiry awards 20% and advances the route. Logic and Puzzle volunteers record a score such as `6/10` to release the next clue. Mystery verification starts the in-app quiz. Riddles do not use a volunteer or physical location; the first pass opens automatically and the next two passes require QR scans.
- Stations do not enforce a capacity limit. The leaderboard uses score first and total completion time second; attempts are not shown or used for ranking.
- Login and API requests do not use IP-based rate limits. The app is intended to support large event logins, subject to the runtime's available resources.

## Replit preview

The main workflow should run `npm start` as a webview on port `5000`.