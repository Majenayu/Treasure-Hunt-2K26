# CodeHunt / The Orange Circuit

## Run

The app is a single Node.js and Express server:

```bash
npm start
```

It listens on the `PORT` environment variable and defaults to port `5000` for Replit.

## Access

- Admin login: username `majen`, password `majen`
- Demo team login: code `TEAM-01` (the team password is optional in the UI; `hunt` is accepted)

## Current storage model

This first event-ready version intentionally has no MongoDB dependency or external authentication. Teams, sessions, challenge progress, and admin activity are held in memory and reset when the server restarts. The seeded event contains 40 teams and 10 distributed missions.

## Main flows

- Admin: live station pulse, event pause/resume, team registry, team reset, station enable/disable, and leaderboard.
- Team: sign in with a team code, see the assigned location, wait for location-volunteer verification, submit coding/mystery answers, record riddle passes from partial QR codes, and follow the controlled route.
- Volunteers have location-scoped accounts. Demo examples are `coding1 / events` (C1 · LAB A), `logic1 / events` (L1 · NORTH HALL), `puzzle1 / events` (P1 · COURTYARD), and `mystery1 / events` (M1 · MAKER SPACE).
- Coding verification starts a server-timed five-minute round; submitting in the team portal stops the timer and awards the score. Logic and Puzzle volunteers record a score such as `6/10` to release the next clue. Mystery verification starts the in-app quiz. Riddles are QR-only and do not use a volunteer or physical location; three successful passes advance the route.

## Replit preview

The main workflow should run `npm start` as a webview on port `5000`.