# API reference

This inventory is derived from the route handlers currently present in the source. Request and response schemas should be confirmed against the implementation before integration.

## Endpoints

- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `GET /api/session`
- `GET /api/game-state`
- `GET /api/leaderboard`
- `GET /api/health`
- `Admin routes under /api/admin/* require authenticated admin access`

## Conventions

- The local server uses the port configured by `PORT` where supported.
- JSON endpoints should send `Content-Type: application/json`; upload endpoints use `multipart/form-data`.
- Treat identifiers, location data, account data, and uploaded files as sensitive.
- Authentication and authorization requirements are implementation-specific; verify them before exposing an endpoint publicly.
