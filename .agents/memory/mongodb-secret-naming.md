---
name: MongoDB secret naming
description: The secret naming constraint needed for this app to start in the managed Replit workflow.
---

The MongoDB connection string must be stored as the `MONGODB_URI` secret for the managed application workflow to inject it reliably. A differently named MongoDB secret may exist in the workspace but is not a dependable substitute for startup.

**Why:** The imported server refuses to start without its configured MongoDB URI, and the workflow did not expose the existing differently named secret to the app under the expected variable.

**How to apply:** When setting up or moving this app, confirm `MONGODB_URI` exists before restarting the application workflow; keep `MONGODB_DB` optional because the server defaults it to `techhunt`.