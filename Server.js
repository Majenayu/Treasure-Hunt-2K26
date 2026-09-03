const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);
const ADMIN_USERNAME = 'majen';
const ADMIN_PASSWORD = 'majen';
const TEAM_PASSWORD = 'hunt';

const challengeSeed = [
  {
    id: 'signal-01',
    number: 1,
    name: 'Signal Breaker',
    type: 'CODING',
    icon: '⌘',
    station: 'LAB A',
    stationCode: 'ORBIT-A',
    location: 'Innovation Lab · Block A',
    color: 'coral',
    timeLimit: 300,
    points: 100,
    prompt: 'Decode the next signal. What is the output of: 2 + 3 * 4?',
    answer: '14',
    hint: 'Multiplication gets priority.',
  },
  {
    id: 'logic-01',
    number: 2,
    name: 'Pattern Room',
    type: 'LOGIC',
    icon: '◈',
    station: 'NORTH HALL',
    stationCode: 'NORTH-07',
    location: 'North Hall · Level 1',
    color: 'amber',
    timeLimit: 0,
    points: 100,
    prompt: 'Complete the pattern: 2, 6, 12, 20, 30, __',
    answer: '42',
    hint: 'Look at the gap between each number.',
  },
  {
    id: 'puzzle-01',
    number: 3,
    name: 'Cipher Garden',
    type: 'PUZZLE',
    icon: '✦',
    station: 'COURTYARD',
    stationCode: 'GARDEN-03',
    location: 'Central Courtyard',
    color: 'mint',
    timeLimit: 0,
    points: 100,
    prompt: 'A word becomes shorter when you add two letters. What word is it?',
    answer: 'short',
    hint: 'The answer describes the result.',
  },
  {
    id: 'riddle-01',
    number: 4,
    name: 'Echo Chamber',
    type: 'RIDDLE',
    icon: '?',
    station: 'AUDITORIUM',
    stationCode: 'ECHO-12',
    location: 'Main Auditorium · Backstage',
    color: 'violet',
    timeLimit: 0,
    points: 100,
    prompt: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?',
    answer: 'echo',
    hint: 'You may hear it come back to you.',
  },
  {
    id: 'mystery-01',
    number: 5,
    name: 'Hidden Current',
    type: 'MYSTERY',
    icon: '⚡',
    station: 'MAKER SPACE',
    stationCode: 'CURRENT-05',
    location: 'Maker Space · Studio 2',
    color: 'sky',
    timeLimit: 0,
    points: 100,
    prompt: 'What has keys but cannot open locks, space but no room, and you can enter but not go inside?',
    answer: 'keyboard',
    hint: 'You are using one right now.',
  },
  {
    id: 'signal-02',
    number: 6,
    name: 'Signal Breaker II',
    type: 'CODING',
    icon: '⌘',
    station: 'LAB B',
    stationCode: 'ORBIT-B',
    location: 'Innovation Lab · Block C',
    color: 'coral',
    timeLimit: 300,
    points: 100,
    prompt: 'A loop starts at 1 and doubles four times. What number does it finish on?',
    answer: '16',
    hint: '1 → 2 → 4 → 8 → ?',
  },
  {
    id: 'logic-02',
    number: 7,
    name: 'Grid Theory',
    type: 'LOGIC',
    icon: '◈',
    station: 'EAST WING',
    stationCode: 'GRID-22',
    location: 'East Wing · Studio 4',
    color: 'amber',
    timeLimit: 0,
    points: 100,
    prompt: 'If five machines make five parts in five minutes, how long do 100 machines need to make 100 parts?',
    answer: '5',
    hint: 'Each machine works at the same speed.',
  },
  {
    id: 'puzzle-02',
    number: 8,
    name: 'Broken Compass',
    type: 'PUZZLE',
    icon: '✦',
    station: 'WEST STAIRS',
    stationCode: 'WEST-18',
    location: 'West Stairs · Landing',
    color: 'mint',
    timeLimit: 0,
    points: 100,
    prompt: 'What can travel around the world while staying in one corner?',
    answer: 'stamp',
    hint: 'Think of something attached to an envelope.',
  },
  {
    id: 'riddle-02',
    number: 9,
    name: 'Final Frequency',
    type: 'RIDDLE',
    icon: '?',
    station: 'ROOFTOP',
    stationCode: 'ROOF-09',
    location: 'Rooftop Garden · Gate 1',
    color: 'violet',
    timeLimit: 0,
    points: 100,
    prompt: 'The more you take, the more you leave behind. What are they?',
    answer: 'footsteps',
    hint: 'You make them while moving.',
  },
  {
    id: 'mystery-02',
    number: 10,
    name: 'The Last Door',
    type: 'MYSTERY',
    icon: '⚡',
    station: 'FINISH LINE',
    stationCode: 'FINISH-10',
    location: 'Main Quad · Finish Arch',
    color: 'sky',
    timeLimit: 0,
    points: 100,
    prompt: 'What belongs to you, but other people use it more than you do?',
    answer: 'name',
    hint: 'Someone says it when they want your attention.',
  },
];

const baseRoute = challengeSeed.map((challenge) => challenge.id);
const challenges = new Map(challengeSeed.map((challenge) => [challenge.id, { ...challenge, disabled: false }]));
const teams = new Map();
const sessions = new Map();
const auditLog = [];
const state = {
  eventName: 'CodeHunt / The Orange Circuit',
  status: 'LIVE',
  startedAt: new Date(),
};

for (let i = 1; i <= 40; i += 1) {
  const teamId = `TEAM-${String(i).padStart(2, '0')}`;
  // Rotating the route distributes starting stations while preserving the
  // separation between the two coding labs.
  const offset = (i * 2) % baseRoute.length;
  const route = baseRoute.slice(offset).concat(baseRoute.slice(0, offset));
  teams.set(teamId, {
    id: teamId,
    name: `Team ${String(i).padStart(2, '0')}`,
    route,
    currentIndex: 0,
    score: 0,
    attempts: 0,
    totalSeconds: 0,
    active: false,
    completedAt: null,
    currentChallenge: null,
    startedAt: null,
    completedChallenges: [],
  });
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(limiter);
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.use(express.static(__dirname, { maxAge: '1h', etag: true }));
app.get('/manifest.json', (req, res) => {
  res.type('application/manifest+json').send({
    name: 'CodeHunt / The Orange Circuit',
    short_name: 'CodeHunt',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f3ed',
    theme_color: '#f26a3d',
  });
});
app.get('/favicon.ico', (req, res) => res.status(204).end());

function writeAudit(action, detail, actor = 'admin') {
  auditLog.unshift({ id: crypto.randomUUID(), action, detail, actor, at: new Date().toISOString() });
  if (auditLog.length > 30) auditLog.pop();
}

function sessionUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return token ? sessions.get(token) : null;
}

function requireAuth(req, res, next) {
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.user = user;
  return next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  return next();
}

function publicChallenge(challenge) {
  if (!challenge) return null;
  const { answer, ...safeChallenge } = challenge;
  return safeChallenge;
}

function getTeamChallenge(team) {
  if (!team || team.currentIndex >= team.route.length) return null;
  return challenges.get(team.route[team.currentIndex]);
}

function secondsOnMission(team) {
  if (!team.currentChallenge || !team.startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(team.startedAt).getTime()) / 1000));
}

function publicTeam(team) {
  const challenge = getTeamChallenge(team);
  return {
    id: team.id,
    name: team.name,
    score: team.score,
    attempts: team.attempts,
    totalSeconds: team.totalSeconds,
    currentIndex: team.currentIndex,
    completed: team.completedChallenges.length,
    active: team.active,
    completedAt: team.completedAt,
    currentChallenge: publicChallenge(challenge),
    missionStartedAt: team.startedAt,
    missionSeconds: secondsOnMission(team),
  };
}

function leaderboard() {
  return [...teams.values()]
    .sort((a, b) => b.score - a.score || a.totalSeconds - b.totalSeconds || a.attempts - b.attempts)
    .map((team, index) => ({
      rank: index + 1,
      id: team.id,
      name: team.name,
      score: team.score,
      completed: team.completedChallenges.length,
      totalSeconds: team.totalSeconds,
      status: team.completedAt ? 'FINISHED' : team.active ? 'ON MISSION' : 'READY',
    }));
}

function overview() {
  const allTeams = [...teams.values()];
  const activeMissions = allTeams.filter((team) => team.active);
  const stationCounts = challengeSeed.reduce((result, challenge) => {
    result[challenge.station] = activeMissions.filter((team) => getTeamChallenge(team)?.station === challenge.station).length;
    return result;
  }, {});
  return {
    event: state,
    stats: {
      registered: allTeams.length,
      active: allTeams.filter((team) => team.active).length,
      completed: allTeams.filter((team) => team.completedAt).length,
      totalPoints: allTeams.reduce((sum, team) => sum + team.score, 0),
    },
    stations: challengeSeed.map((challenge) => ({
      name: challenge.station,
      type: challenge.type,
      count: stationCounts[challenge.station] || 0,
      capacity: challenge.type === 'CODING' ? 5 : 10,
      color: challenge.color,
    })),
    challenges: challengeSeed.map((challenge) => ({
      ...publicChallenge(challenges.get(challenge.id)),
      activeTeams: activeMissions.filter((team) => getTeamChallenge(team)?.id === challenge.id).length,
    })),
    activity: auditLog.slice(0, 8),
  };
}

app.post('/api/login', loginLimiter, (req, res) => {
  const { role = 'team', username = '', password = '' } = req.body || {};
  if (role === 'admin') {
    if (username.trim().toLowerCase() !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'That admin credential is not recognised.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { role: 'admin', username: ADMIN_USERNAME });
    writeAudit('ADMIN SIGN IN', 'Mission control access granted');
    return res.json({ token, user: { role: 'admin', username: ADMIN_USERNAME } });
  }

  const organizerAccounts = {
    tracing1: { checkpointType: 'tracing', checkpointLabel: 'T1' },
    tracing2: { checkpointType: 'tracing', checkpointLabel: 'T2' },
    coding1: { checkpointType: 'coding', checkpointLabel: 'C1' },
    coding2: { checkpointType: 'coding', checkpointLabel: 'C2' },
    activity1: { checkpointType: 'activity', checkpointLabel: 'T4' },
    activity2: { checkpointType: 'activity', checkpointLabel: 'T5' },
    activity3: { checkpointType: 'activity', checkpointLabel: 'T6' },
  };
  if (role === 'organizer') {
    const account = organizerAccounts[username.trim().toLowerCase()];
    if (!account || password !== 'events') return res.status(401).json({ error: 'Use a valid organizer account.' });
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { role: 'organizer', username: username.trim().toLowerCase(), ...account });
    writeAudit('ORGANIZER CONNECTED', `${account.checkpointLabel} checkpoint console opened`);
    return res.json({ token, user: { role: 'organizer', username: username.trim().toLowerCase(), ...account } });
  }

  const teamId = username.trim().toUpperCase();
  const team = teams.get(teamId);
  if (!team || (password && password !== TEAM_PASSWORD)) {
    return res.status(401).json({ error: 'Use a valid team code, for example TEAM-01.' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { role: 'team', teamId });
  team.active = true;
  writeAudit('TEAM CONNECTED', `${teamId} joined the circuit`, teamId);
  return res.json({ token, user: { role: 'team', teamId, name: team.name } });
});

app.post('/api/logout', requireAuth, (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => res.json(req.user));

app.get('/api/session', requireAuth, (req, res) => {
  const team = req.user.role === 'team' ? teams.get(req.user.teamId) : null;
  res.json({ user: req.user, team: team ? publicTeam(team) : null });
});

app.get('/api/game-state', (req, res) => {
  res.json({
    started: state.status === 'LIVE',
    status: state.status,
    eventName: state.eventName,
    finalCodingStarted: false,
    roundPaused: state.status === 'PAUSED',
  });
});

app.get('/api/leaderboard', (req, res) => res.json({ leaderboard: leaderboard() }));

app.get('/api/admin/overview', requireAuth, requireAdmin, (req, res) => {
  res.json(overview());
});

app.get('/api/admin/teams', requireAuth, requireAdmin, (req, res) => {
  res.json({ teams: [...teams.values()].map(publicTeam) });
});

app.get('/api/admin/questions', requireAuth, requireAdmin, (req, res) => {
  res.json(challengeSeed.map((challenge) => ({
    _id: challenge.id,
    questionNumber: challenge.number,
    code: challenge.stationCode,
    answer: challenge.answer,
    type: challenge.type.toLowerCase(),
    difficulty: challenge.type === 'CODING' ? 'hard' : 'medium',
    name: challenge.name,
    disabled: challenges.get(challenge.id).disabled,
  })));
});

app.post('/api/admin/questions', requireAuth, requireAdmin, (req, res) => {
  const { answer = '', name = 'New mission', type = 'mystery' } = req.body || {};
  const nextNumber = challengeSeed.length + 1;
  const id = `custom-${nextNumber}`;
  const challenge = {
    id, number: nextNumber, name, type: String(type).toUpperCase(), icon: '✦',
    station: 'NEW STATION', stationCode: `NEW-${String(nextNumber).padStart(2, '0')}`,
    location: 'To be announced', color: 'amber', timeLimit: 0, points: 100,
    prompt: 'A new mission is ready for your event.', answer: String(answer).toLowerCase(), hint: 'Ask the mission controller.',
  };
  challengeSeed.push(challenge);
  baseRoute.push(id);
  challenges.set(id, { ...challenge, disabled: false });
  writeAudit('MISSION ADDED', `${challenge.name} added to the route`);
  res.status(201).json(challenge);
});

app.delete('/api/admin/questions/:id', requireAuth, requireAdmin, (req, res) => {
  const index = challengeSeed.findIndex((challenge) => challenge.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Mission not found.' });
  const [removed] = challengeSeed.splice(index, 1);
  challenges.delete(removed.id);
  const routeIndex = baseRoute.indexOf(removed.id);
  if (routeIndex >= 0) baseRoute.splice(routeIndex, 1);
  writeAudit('MISSION REMOVED', `${removed.name} removed from the route`);
  res.json({ ok: true });
});

app.get('/api/admin/checkpoints', requireAuth, requireAdmin, (req, res) => {
  res.json(challengeSeed.map((challenge) => ({
    label: challenge.station,
    name: challenge.name,
    locationHint: challenge.location,
    type: challenge.type.toLowerCase(),
    stationCode: challenge.stationCode,
    capacity: challenge.type === 'CODING' ? 5 : 10,
    disabled: challenges.get(challenge.id).disabled,
  })));
});

app.post('/api/admin/checkpoints', requireAuth, requireAdmin, (req, res) => {
  const { name = 'New checkpoint', locationHint = 'To be announced' } = req.body || {};
  writeAudit('LOCATION NOTE ADDED', `${name} · ${locationHint}`);
  res.status(201).json({ ok: true, message: 'Location note saved.' });
});

app.get('/api/admin/progress', requireAuth, requireAdmin, (req, res) => {
  res.json(leaderboard().map((entry) => ({
    ...entry,
    currentMission: teams.get(entry.id) ? publicChallenge(getTeamChallenge(teams.get(entry.id)))?.name || 'Finished' : '—',
    attempts: teams.get(entry.id)?.attempts || 0,
  })));
});

app.post('/api/admin/event', requireAuth, requireAdmin, (req, res) => {
  state.status = state.status === 'LIVE' ? 'PAUSED' : 'LIVE';
  writeAudit(state.status === 'LIVE' ? 'EVENT RESUMED' : 'EVENT PAUSED', `Circuit is now ${state.status.toLowerCase()}`);
  res.json({ ok: true, status: state.status });
});

app.post('/api/admin/start-event', requireAuth, requireAdmin, (req, res) => {
  state.status = 'LIVE';
  state.startedAt = new Date();
  writeAudit('EVENT STARTED', 'The Orange Circuit is live');
  res.json({ ok: true, started: true });
});

app.post('/api/admin/reset-event', requireAuth, requireAdmin, (req, res) => {
  for (const team of teams.values()) {
    team.currentIndex = 0; team.score = 0; team.attempts = 0; team.totalSeconds = 0;
    team.active = false; team.completedAt = null; team.currentChallenge = null;
    team.startedAt = null; team.completedChallenges = [];
  }
  state.status = 'PAUSED';
  writeAudit('EVENT RESET', 'All team progress was cleared');
  res.json({ ok: true });
});

app.post('/api/admin/toggle-round', requireAuth, requireAdmin, (req, res) => {
  state.status = state.status === 'LIVE' ? 'PAUSED' : 'LIVE';
  writeAudit(state.status === 'LIVE' ? 'ROUND RESUMED' : 'ROUND PAUSED', `Round is now ${state.status.toLowerCase()}`);
  res.json({ ok: true, roundPaused: state.status === 'PAUSED' });
});

app.post('/api/admin/challenges/:number/toggle', requireAuth, requireAdmin, (req, res) => {
  const challenge = challengeSeed.find((item) => item.number === Number(req.params.number));
  if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });
  const stored = challenges.get(challenge.id);
  stored.disabled = !stored.disabled;
  writeAudit(stored.disabled ? 'STATION DISABLED' : 'STATION ENABLED', `${stored.station} · ${stored.name}`);
  res.json({ ok: true, disabled: stored.disabled });
});

app.post('/api/admin/teams/:id/reset', requireAuth, requireAdmin, (req, res) => {
  const team = teams.get(req.params.id.toUpperCase());
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  team.currentIndex = 0;
  team.score = 0;
  team.attempts = 0;
  team.totalSeconds = 0;
  team.active = false;
  team.completedAt = null;
  team.currentChallenge = null;
  team.startedAt = null;
  team.completedChallenges = [];
  writeAudit('TEAM RESET', `${team.id} progress cleared`);
  res.json({ ok: true, team: publicTeam(team) });
});

app.get('/api/team/state', requireAuth, (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Team access required.' });
  const team = teams.get(req.user.teamId);
  res.json({ team: publicTeam(team), leaderboard: leaderboard().slice(0, 5), event: state });
});

app.post('/api/team/start', requireAuth, (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Team access required.' });
  if (state.status !== 'LIVE') return res.status(409).json({ error: 'The circuit is currently paused.' });
  const team = teams.get(req.user.teamId);
  const challenge = getTeamChallenge(team);
  if (!challenge) return res.status(409).json({ error: 'Your circuit is complete.' });
  if (challenge.disabled) return res.status(409).json({ error: 'This station is temporarily offline.' });
  if ((req.body.stationCode || '').trim().toUpperCase() !== challenge.stationCode) {
    return res.status(400).json({ error: `Wrong station. Scan the code at ${challenge.location}.` });
  }
  if (team.currentChallenge && team.startedAt) return res.json({ ok: true, team: publicTeam(team) });
  const stationTeams = [...teams.values()].filter((other) => getTeamChallenge(other)?.id === challenge.id && other.currentChallenge && other.startedAt);
  if (stationTeams.length >= (challenge.type === 'CODING' ? 5 : 10)) {
    return res.status(409).json({ error: `${challenge.station} is at capacity. Please wait for the next opening.` });
  }
  team.currentChallenge = challenge.id;
  team.startedAt = new Date().toISOString();
  writeAudit('MISSION STARTED', `${team.id} unlocked ${challenge.name}`, team.id);
  res.json({ ok: true, team: publicTeam(team) });
});

app.post('/api/team/submit', requireAuth, (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Team access required.' });
  if (state.status !== 'LIVE') return res.status(409).json({ error: 'The circuit is currently paused.' });
  const team = teams.get(req.user.teamId);
  const challenge = getTeamChallenge(team);
  if (!challenge || team.currentChallenge !== challenge.id || !team.startedAt) {
    return res.status(409).json({ error: 'Unlock the station before submitting.' });
  }
  const elapsed = secondsOnMission(team);
  const timedOut = challenge.timeLimit > 0 && elapsed > challenge.timeLimit;
  const submitted = String(req.body.answer || '').trim().toLowerCase();
  const correct = !timedOut && submitted === challenge.answer.toLowerCase();
  team.attempts += 1;
  if (!correct) {
    writeAudit('ANSWER MISSED', `${team.id} attempted ${challenge.name}`, team.id);
    return res.json({ ok: true, correct: false, timedOut, attempts: team.attempts, team: publicTeam(team) });
  }
  team.score += Math.max(20, challenge.points - (team.attempts - 1) * 20);
  team.totalSeconds += elapsed;
  team.completedChallenges.push({ id: challenge.id, seconds: elapsed, at: new Date().toISOString() });
  team.currentIndex += 1;
  team.currentChallenge = null;
  team.startedAt = null;
  team.attempts = 0;
  if (team.currentIndex >= team.route.length) {
    team.completedAt = new Date().toISOString();
    team.active = false;
  }
  writeAudit('MISSION CLEARED', `${team.id} completed ${challenge.name}`, team.id);
  res.json({ ok: true, correct: true, score: team.score, team: publicTeam(team) });
});

app.get('/api/organizer/checkpoint-teams', requireAuth, (req, res) => {
  if (!['organizer', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Organizer access required.' });
  const station = req.user.checkpointLabel;
  const rows = [...teams.values()].filter((team) => !req.user.checkpointType || getTeamChallenge(team)?.type.toLowerCase() === req.user.checkpointType)
    .map((team) => ({ ...publicTeam(team), checkpointLabel: station }));
  res.json({ checkpointLabel: station || 'ALL', teams: rows });
});

app.post('/api/organizer/mark-status', requireAuth, (req, res) => {
  if (!['organizer', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Organizer access required.' });
  const team = teams.get(String(req.body.teamId || '').toUpperCase());
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  writeAudit('CHECKPOINT UPDATED', `${team.id} marked ${req.body.status || 'complete'}`, req.user.username);
  res.json({ ok: true, points: req.body.status === 'completed' ? 100 : 0 });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CodeHunt Mission Control running on port ${PORT}`);
  console.log('Demo admin login: majen / majen');
});