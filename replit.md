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
- Team: sign in with a team code, scan the current station code, start the mission, submit an answer, and follow the controlled route.
- Timed coding missions are server-timed with a five-minute limit.

## Replit preview

The main workflow should run `npm start` as a webview on port `5000`.