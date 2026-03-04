const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const path = require('path');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = 'mongodb+srv://pra:pra@pra.si69pt4.mongodb.net/?appName=pra';
const DB_NAME = 'codehunt';

// Web Push VAPID keys - MUST be set as environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Configure web push notifications if VAPID keys are provided
let notificationsEnabled = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:codehunt2k26@example.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    notificationsEnabled = true;
    console.log('📢 Web push notifications configured');
  } catch (err) {
    console.warn('⚠️  VAPID keys invalid, notifications disabled:', err.message);
    console.warn('⚠️  Generate keys with: node generate-vapid-keys.js');
  }
} else {
  console.warn('⚠️  VAPID keys not set, notifications disabled');
  console.warn('⚠️  Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables');
  console.warn('⚠️  Generate keys with: node generate-vapid-keys.js');
}

let db;
let dbConnected = false;

// ─── RATE LIMITERS ────────────────────────────────────────────────────────────
// Auth endpoints: 15 attempts per 15 minutes per IP (prevents brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' }
});

// General API: 300 requests per 15 minutes per IP (handles large event traffic)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});

// Leaderboard / game-state: 60 per minute (polled frequently by all teams)
const pollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Polling too fast. Please wait.' }
});

// ─── SESSION HELPERS ──────────────────────────────────────────────────────────
async function setSession(token, data) {
  await db.collection('sessions').insertOne({
    token, 
    role: data.role, 
    teamId: data.teamId || null, 
    username: data.username || null,
    checkpointType: data.checkpointType || null,
    createdAt: new Date(), 
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
}
async function getSession(token) {
  if (!token) return null;
  return db.collection('sessions').findOne({ token, expiresAt: { $gt: new Date() } });
}
async function deleteSession(token) {
  await db.collection('sessions').deleteOne({ token });
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
// Compress all responses (gzip/brotli) — reduces bandwidth ~70% under load
app.use(compression());

// Trust proxy (for correct IP detection on Render)
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));

// Apply rate limiters — auth routes strict, polling routes moderate, rest generous
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/leaderboard', pollLimiter);
app.use('/api/game-state', pollLimiter);
app.use('/api/', apiLimiter);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// PWA manifest and service worker
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  const mPath = require('fs').existsSync(path.join(__dirname, 'manifest.json'))
    ? path.join(__dirname, 'manifest.json')
    : path.join(__dirname, 'Manifest.json');
  res.sendFile(mPath);
});
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache'); // SW must always be fresh
  const swPath = require('fs').existsSync(path.join(__dirname, 'sw.js'))
    ? path.join(__dirname, 'sw.js')
    : path.join(__dirname, 'SW.js');
  res.sendFile(swPath);
});

// Cache static assets aggressively
app.use(express.static(__dirname, {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.use((req, res, next) => {
  if (!dbConnected || !db) {
    return res.status(503).json({ error: 'Server is starting up. Please wait a moment and try again.' });
  }
  next();
});

// ─── DB CONNECTION ────────────────────────────────────────────────────────────
async function connectDB() {
  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    tls: true,
  });
  await client.connect();
  db = client.db(DB_NAME);
  dbConnected = true;
  console.log('✅ Connected to MongoDB');

  client.on('close', () => {
    dbConnected = false;
    console.warn('⚠️  MongoDB connection closed. Reconnecting...');
    setTimeout(() => tryConnect(5), 5000);
  });

  await initializeDB();
}

async function tryConnect(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`🔌 MongoDB connection attempt ${i}/${retries}...`);
      await connectDB();
      console.log(`🚀 CodeHunt 2k26 ready on port ${PORT}`);
      return;
    } catch (err) {
      console.error(`❌ Attempt ${i} failed: ${err.message}`);
      if (i === retries) {
        console.error('💀 All connection attempts failed.');
        process.exit(1);
      }
      const wait = Math.min(5000 * i, 30000);
      console.log(`⏳ Retrying in ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// ─── DB INITIALISATION ────────────────────────────────────────────────────────
async function initializeDB() {
  const teamsCol = db.collection('teams');

  // ── STEP 1: Drop any existing teamId index (so we can recreate clean) ────
  try {
    await teamsCol.dropIndex('teamId_1');
    console.log('🗑️  Dropped old teamId index');
  } catch (e) { /* didn't exist — fine */ }

  // ── STEP 2: Aggressively remove ALL duplicate teamId documents ────────────
  const allDocs = await teamsCol.find({}).toArray();
  const seen = new Map(); // teamId → best doc to keep
  for (const doc of allDocs) {
    const tid = doc.teamId;
    if (!seen.has(tid)) {
      seen.set(tid, doc);
    } else {
      const existing = seen.get(tid);
      // Keep whichever is registered; else keep the one with the lower _id (older)
      if (doc.registered && !existing.registered) {
        seen.set(tid, doc);
      }
    }
  }
  // Build set of _ids to keep
  const keepIds = new Set([...seen.values()].map(d => d._id.toString()));
  const toDelete = allDocs.filter(d => !keepIds.has(d._id.toString()));
  if (toDelete.length > 0) {
    const deleteIds = toDelete.map(d => d._id);
    await teamsCol.deleteMany({ _id: { $in: deleteIds } });
    console.log(`🧹 Removed ${toDelete.length} duplicate team document(s). Teams now: ${await teamsCol.countDocuments()}`);
  }

  // ── STEP 3: Create unique index now that duplicates are gone ─────────────
  try {
    await teamsCol.createIndex({ teamId: 1 }, { unique: true });
    console.log('✅ Unique index on teamId created');
  } catch (e) {
    console.warn('⚠️  Unique index error:', e.message);
  }

  // ── Seed teams if empty ─────────────────────────────────────────────────
  const count = await teamsCol.countDocuments();
  if (count === 0) {
    const teams = [];
    for (let i = 1; i <= 50; i++) {
      teams.push({
        teamId: i,
        name: `Team ${i}`,
        password: 'codehunt',
        category: 'unset',
        difficultyOverride: null,
        members: [],
        registered: false,
        player1Name: '', player1Year: '', player1College: '',
        player2Name: '', player2Year: '', player2College: ''
      });
    }
    await teamsCol.insertMany(teams);
    console.log('✅ Seeded 50 teams');
  } else {
    // Migration: ensure fields exist on older docs
    await teamsCol.updateMany(
      { registered: { $exists: false } },
      { $set: { registered: false, player1Name: '', player1Year: '', player1College: '', player2Name: '', player2Year: '', player2College: '', members: [] } }
    );
    // Migration: add college fields to existing teams
    await teamsCol.updateMany(
      { player1College: { $exists: false } },
      { $set: { player1College: '', player2College: '' } }
    );
  }

  // ── Clean duplicate team_progress records on startup ────────────────────
  const progressCol = db.collection('team_progress');
  const allProgress = await progressCol.find({}).toArray();
  const pgGrouped = {};
  for (const doc of allProgress) {
    const tid = doc.teamId;
    if (!pgGrouped[tid]) pgGrouped[tid] = [];
    pgGrouped[tid].push(doc);
  }
  let progressDupesRemoved = 0;
  for (const docs of Object.values(pgGrouped)) {
    if (docs.length <= 1) continue;
    docs.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0) || (b.currentIndex || 0) - (a.currentIndex || 0));
    const [, ...discard] = docs;
    await progressCol.deleteMany({ _id: { $in: discard.map(d => d._id) } });
    progressDupesRemoved += discard.length;
  }
  if (progressDupesRemoved > 0) console.log(`🧹 Removed ${progressDupesRemoved} duplicate team_progress record(s)`);

  // Migration: add swaps fields to existing progress docs
  await db.collection('team_progress').updateMany(
    { swapsRemaining: { $exists: false } },
    { $set: { swapsRemaining: 3, swapsUsedPerCheckpoint: {} } }
  );

  // TTL index for expired sessions
  await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  // Create push_subscriptions collection for notifications
  const subsCol = db.collection('push_subscriptions');
  try {
    await subsCol.createIndex({ username: 1, endpoint: 1 }, { unique: true });
  } catch(e) { /* index may already exist */ }

  // Init game state if missing
  const gs = db.collection('game_state');
  if (!(await gs.findOne({ key: 'main' }))) {
    await gs.insertOne({
      key: 'main',
      started: false,
      startTime: null,
      finalCodingStarted: false,
      finalCodingStartTime: null,
      roundPaused: false,
      pausedAt: null
    });
    console.log('✅ Game state initialized');
  }
}

// ─── MIDDLEWARE HELPERS ───────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  getSession(token).then(session => {
    if (!session) return res.status(401).json({ error: 'Session expired. Please log in again.' });
    req.user = { 
      role: session.role, 
      teamId: session.teamId, 
      username: session.username,
      checkpointType: session.checkpointType || null
    };
    next();
  }).catch(() => res.status(500).json({ error: 'Auth error' }));
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
function orgOrAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'organizer') return res.status(403).json({ error: 'Access denied' });
  next();
}

// ─── AUTO CATEGORY FROM YEAR ──────────────────────────────────────────────────
function deriveCategoryFromYears(y1, y2) {
  const avgYear = ((parseInt(y1) || 1) + (parseInt(y2) || 1)) / 2;
  return avgYear <= 2 ? 'junior' : 'senior';
}

// ─── GAME LOGIC ───────────────────────────────────────────────────────────────
// ─── POINT CALCULATION HELPERS ───────────────────────────────────────────────
// Tracing: 200 pts if ≤2 min; -10/min for min 2–5; -5/min after 5 min
function calcTracingPoints(elapsedSeconds) {
  const mins = elapsedSeconds / 60;
  if (mins <= 2) return 200;
  const minutesOver2 = Math.floor(mins - 2);
  const phase1 = Math.min(minutesOver2, 3); // 3 minutes of -10 (covers min 2→5)
  const phase2 = Math.max(0, minutesOver2 - 3); // beyond 5 min: -5/min
  return Math.max(0, 200 - phase1 * 10 - phase2 * 5);
}

// Coding: 300 pts if ≤2 min; same deduction tiers as tracing
function calcCodingPoints(timerUsedSeconds) {
  const mins = timerUsedSeconds / 60;
  if (mins <= 2) return 300;
  const minutesOver2 = Math.floor(mins - 2);
  const phase1 = Math.min(minutesOver2, 3);
  const phase2 = Math.max(0, minutesOver2 - 3);
  return Math.max(0, 300 - phase1 * 10 - phase2 * 5);
}

function seededShuffle(arr, seed) {
  const a = [...arr]; let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CODING_PAIRS = [];
// Generate valid coding positions: not at 1 or 9, at least 2 apart
// Valid positions: 2-8 (indices 1-7 in 0-8 range)
// Must have at least 2 checkpoints between them
for (let a = 1; a <= 7; a++) {
  for (let b = a + 3; b <= 7; b++) { // +3 ensures at least 2 checkpoints between
    // Skip if either position is 1 or 9 (indices 0 or 8)
    if (a !== 0 && a !== 8 && b !== 0 && b !== 8) {
      CODING_PAIRS.push([a, b]);
    }
  }
}

function generateBalancedSequences(teams) {
  // Only 3 checkpoints will be active for tracing (T1, T2, T3)
  const TRACING_LABELS = ['T1', 'T2', 'T3'];
  // Remaining 4 checkpoints for activity (T4, T5, T6, T7)
  const ACTIVITY_LABELS = ['T4', 'T5', 'T6', 'T7'];
  // Activity types for each checkpoint
  const ACTIVITY_TYPES = {
    'T4': { type: 'crossword', displayName: 'Activity 1 - Crossword', sets: 3 },
    'T5': { type: 'questions', displayName: 'Activity 2 - Questions', sets: 2 },
    'T6': { type: 'wordpuzzle', displayName: 'Activity 3 - Word Puzzle', sets: 6 },
    'T7': { type: 'encoding', displayName: 'Activity 4 - Encoding', sets: 3 }
  };

  // Load balancing: track how many teams hit each position
  const stepLoad = {};
  for (let i = 0; i < 10; i++) {
    stepLoad[i] = 0;
  }

  return teams.map((team, idx) => {
    // Select coding pair ensuring they're not at positions 1 or 9
    const [c1Idx, c2Idx] = CODING_PAIRS[idx % CODING_PAIRS.length];

    const sequence = new Array(10).fill(null);
    sequence[9] = { type: 'finalCoding', label: 'FC', displayName: 'Final Challenge', locked: true };
    sequence[c1Idx] = { type: 'coding', label: 'C1', codingSlot: 1 };
    sequence[c2Idx] = { type: 'coding', label: 'C2', codingSlot: 2 };

    // Get available positions (excluding coding and final)
    const checkpointPositions = [];
    for (let i = 0; i < 9; i++) { 
      if (!sequence[i]) checkpointPositions.push(i); 
    }

    // Shuffle positions per team
    const shuffledPositions = seededShuffle([...checkpointPositions], team.teamId * 31337);
    
    // Smart assignment: ensure no consecutive tracing rounds
    // We need to place 3 tracing and 4 activity checkpoints
    const tracingPositions = [];
    const activityPositions = [];
    
    // Helper function to check if a position would create consecutive tracings
    const wouldCreateConsecutiveTracing = (pos) => {
      // Check if previous or next position already has tracing assigned
      if (pos > 0 && tracingPositions.includes(pos - 1)) return true;
      if (pos < 9 && tracingPositions.includes(pos + 1)) return true;
      return false;
    };
    
    // First pass: try to assign tracings to positions that don't create consecutives
    for (const pos of shuffledPositions) {
      if (tracingPositions.length < 3 && !wouldCreateConsecutiveTracing(pos)) {
        tracingPositions.push(pos);
      } else {
        activityPositions.push(pos);
      }
    }
    
    // If we couldn't place all 3 tracings, we need a different strategy
    // This should rarely happen with 7 available positions and only 3 tracings needed
    if (tracingPositions.length < 3) {
      // Reset and use a greedy approach: place tracings with maximum spacing
      tracingPositions.length = 0;
      activityPositions.length = 0;
      
      // Sort positions to try placing tracings with gaps
      const sortedPositions = [...shuffledPositions].sort((a, b) => a - b);
      
      for (const pos of sortedPositions) {
        if (tracingPositions.length < 3) {
          // Check if this position is safe (not adjacent to existing tracings)
          const isSafe = !tracingPositions.some(tp => Math.abs(tp - pos) === 1);
          if (isSafe) {
            tracingPositions.push(pos);
          } else {
            activityPositions.push(pos);
          }
        } else {
          activityPositions.push(pos);
        }
      }
    }
    
    // Assign tracing checkpoints
    for (let j = 0; j < tracingPositions.length; j++) {
      const pos = tracingPositions[j];
      stepLoad[pos]++;
      const tracingLabel = TRACING_LABELS[j];
      
      sequence[pos] = {
        type: 'tracing',
        label: tracingLabel,
        tracingNum: parseInt(tracingLabel.substring(1)),
        tracingIndex: j // Track which tracing checkpoint this is (0, 1, or 2)
      };
    }
    
    // Assign activity checkpoints
    for (let j = 0; j < activityPositions.length; j++) {
      const pos = activityPositions[j];
      stepLoad[pos]++;
      const activityLabel = ACTIVITY_LABELS[j];
      const activityInfo = ACTIVITY_TYPES[activityLabel];
      
      sequence[pos] = {
        type: 'activity',
        label: activityLabel,
        tracingNum: parseInt(activityLabel.substring(1)),
        activityType: activityInfo.type,
        activityDisplayName: activityInfo.displayName,
        activitySets: activityInfo.sets,
        activityAnswer: 'ayush'
      };
    }

    return sequence;
  });
}

// ─── DIFFICULTY CALCULATION BY COLLEGE & YEAR ────────────────────────────────
function getTeamDifficultyMix(team) {
  // Returns array of difficulties for 3 tracing questions in random order
  // Based on college and year of both players
  
  const p1Year = parseInt(team.player1Year) || 1;
  const p2Year = parseInt(team.player2Year) || 1;
  const p1College = team.player1College || 'Other';
  const p2College = team.player2College || 'Other';
  
  // Determine if team is primarily VVCE or Other
  const isVVCE = (p1College === 'VVCE' || p2College === 'VVCE');
  
  // Use average year for determining difficulty
  const avgYear = (p1Year + p2Year) / 2;
  
  let mix = [];
  
  if (isVVCE) {
    // VVCE Students
    if (avgYear >= 2.5) {
      // 3rd year: 1 easy, 1 medium, 1 hard
      mix = ['easy', 'medium', 'hard'];
    } else if (avgYear >= 1.5) {
      // 2nd year: 2 medium, 1 easy
      mix = ['medium', 'medium', 'easy'];
    } else {
      // 1st year: 3 easy
      mix = ['easy', 'easy', 'easy'];
    }
  } else {
    // Other College Students
    if (avgYear >= 2.5) {
      // 3rd year: 2 medium, 1 easy
      mix = ['medium', 'medium', 'easy'];
    } else if (avgYear >= 1.5) {
      // 2nd year: 2 easy, 1 medium
      mix = ['easy', 'easy', 'medium'];
    } else {
      // 1st year: 3 easy
      mix = ['easy', 'easy', 'easy'];
    }
  }
  
  // Shuffle the mix for random order
  return seededShuffle(mix, team.teamId * 12345);
}

async function getTeamDifficulty(teamId) {
  const team = await db.collection('teams').findOne({ teamId });
  if (!team) return 'easy';
  if (team.difficultyOverride) return team.difficultyOverride;

  const y1 = parseInt(team.player1Year) || 1;
  const y2 = parseInt(team.player2Year) || y1;
  const avgYear = (y1 + y2) / 2;
  let base;
  if (avgYear <= 1.5)      base = 'easy';
  else if (avgYear <= 2.5) base = 'medium';
  else                     base = 'hard';

  const allP = await db.collection('team_progress')
    .find({}, { projection: { teamId: 1, totalPoints: 1 } }).toArray();

  if (allP.length >= 3) {
    allP.sort((a, b) => b.totalPoints - a.totalPoints);
    const rank = allP.findIndex(p => p.teamId === teamId) + 1;
    const pct  = rank / allP.length;
    if (pct <= 0.2) {
      if (base === 'easy') return 'medium';
      if (base === 'medium') return 'hard';
      return 'hard';
    }
    if (pct >= 0.8) {
      if (base === 'hard') return 'medium';
      if (base === 'medium') return 'easy';
      return 'easy';
    }
  }

  return base;
}

async function assignQuestion(teamId, type, isFinal = false, tracingIndex = null) {
  if (isFinal) {
    // Final round: assign one of the 10 final questions by cycling teamId
    const finalQs = await db.collection('questions')
      .find({ type: 'finalCoding' })
      .sort({ questionNumber: 1 })
      .toArray();
    if (finalQs.length === 0) return null;
    const idx = (teamId - 1) % finalQs.length;
    return finalQs[idx];
  }
  
  if (type === 'tracing' && tracingIndex !== null) {
    // Get team's difficulty mix
    const team = await db.collection('teams').findOne({ teamId });
    if (!team) return null;
    
    const difficultyMix = getTeamDifficultyMix(team);
    const targetDifficulty = difficultyMix[tracingIndex]; // Get difficulty for this specific tracing checkpoint
    
    // Find a question of the target difficulty that hasn't been used by this team
    const q = await db.collection('questions').findOne({
      type: 'tracing',
      difficulty: targetDifficulty,
      usedBy: { $not: { $elemMatch: { $eq: teamId } } }
    });
    
    if (q) {
      await db.collection('questions').updateOne({ _id: q._id }, { $push: { usedBy: teamId } });
      return q;
    }
    
    // Fallback: try any difficulty if target not available
    const fallbackDifficulties = ['easy', 'medium', 'hard'].filter(d => d !== targetDifficulty);
    for (const d of fallbackDifficulties) {
      const fallbackQ = await db.collection('questions').findOne({
        type: 'tracing',
        difficulty: d,
        usedBy: { $not: { $elemMatch: { $eq: teamId } } }
      });
      if (fallbackQ) {
        await db.collection('questions').updateOne({ _id: fallbackQ._id }, { $push: { usedBy: teamId } });
        return fallbackQ;
      }
    }
  }
  
  // For coding questions (shouldn't reach here as coding uses fixed answer)
  if (type === 'coding') {
    const q = await db.collection('questions').findOne({
      type: 'coding',
      usedBy: { $not: { $elemMatch: { $eq: teamId } } }
    });
    if (q) {
      await db.collection('questions').updateOne({ _id: q._id }, { $push: { usedBy: teamId } });
      return q;
    }
  }
  
  return null;
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username === 'majen' && password === 'majen') {
      const token = crypto.randomBytes(32).toString('hex');
      await setSession(token, { role: 'admin', username: 'majen' });
      return res.json({ token, role: 'admin' });
    }

    // Organizer accounts for different checkpoint types
    const organizerAccounts = [
      { username: 'tracing1', role: 'organizer', checkpointType: 'tracing' },
      { username: 'tracing2', role: 'organizer', checkpointType: 'tracing' },
      { username: 'tracing3', role: 'organizer', checkpointType: 'tracing' },
      { username: 'coding1', role: 'organizer', checkpointType: 'coding' },
      { username: 'coding2', role: 'organizer', checkpointType: 'coding' },
      { username: 'activity1', role: 'organizer', checkpointType: 'activity' },
      { username: 'activity2', role: 'organizer', checkpointType: 'activity' },
      { username: 'activity3', role: 'organizer', checkpointType: 'activity' },
      { username: 'activity4', role: 'organizer', checkpointType: 'activity' },
    ];

    const organizerAccount = organizerAccounts.find(acc => acc.username === username);
    if (organizerAccount && password === 'events') {
      const token = crypto.randomBytes(32).toString('hex');
      await setSession(token, { 
        role: 'organizer', 
        username: organizerAccount.username,
        checkpointType: organizerAccount.checkpointType 
      });
      return res.json({ 
        token, 
        role: 'organizer',
        checkpointType: organizerAccount.checkpointType 
      });
    }

    const teamNum = parseInt(username);
    if (isNaN(teamNum) || teamNum < 1 || teamNum > 50) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let team = await db.collection('teams').findOne({ teamId: teamNum });

    if (!team) {
      try {
        await db.collection('teams').insertOne({
          teamId: teamNum, name: `Team ${teamNum}`, password: 'codehunt',
          category: 'unset', difficultyOverride: null, members: [],
          registered: false, player1Name: '', player1Year: '', player1College: '', player2Name: '', player2Year: '', player2College: ''
        });
      } catch (e) { /* unique constraint — already exists */ }
      team = await db.collection('teams').findOne({ teamId: teamNum });
    }

    const correctPassword = team.password || 'codehunt';
    if (password !== correctPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!team.registered) {
      return res.json({ needsRegistration: true, teamId: teamNum });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await setSession(token, { role: 'team', teamId: teamNum, username: team.name });
    return res.json({ token, role: 'team', teamId: teamNum, teamName: team.name, category: team.category });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { teamId, teamName, player1Name, player1Year, player1College, player2Name, player2Year, player2College } = req.body;

    const teamNum = parseInt(teamId);
    if (isNaN(teamNum) || teamNum < 1 || teamNum > 50) {
      return res.status(400).json({ error: 'Invalid team number' });
    }
    if (!teamName || !teamName.trim()) return res.status(400).json({ error: 'Team name is required' });
    if (!player1Name || !player1Name.trim()) return res.status(400).json({ error: 'Player 1 name is required' });
    if (!player1Year) return res.status(400).json({ error: 'Player 1 year of study is required' });
    if (!player1College) return res.status(400).json({ error: 'Player 1 college is required' });
    if (!player2Name || !player2Name.trim()) return res.status(400).json({ error: 'Player 2 name is required' });
    if (!player2Year) return res.status(400).json({ error: 'Player 2 year of study is required' });
    if (!player2College) return res.status(400).json({ error: 'Player 2 college is required' });

    const team = await db.collection('teams').findOne({ teamId: teamNum });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Auto-detect junior/senior from year of study
    const category = deriveCategoryFromYears(player1Year, player2Year);

    await db.collection('teams').updateOne(
      { teamId: teamNum },
      {
        $set: {
          name: teamName.trim(),
          player1Name: player1Name.trim(), player1Year: player1Year.toString(), player1College: player1College,
          player2Name: player2Name.trim(), player2Year: player2Year.toString(), player2College: player2College,
          members: [player1Name.trim(), player2Name.trim()],
          category,
          registered: true,
          registeredAt: new Date()
        }
      }
    );

    console.log(`✅ Team ${teamNum} registered as "${teamName.trim()}" (${category})`);

    const token = crypto.randomBytes(32).toString('hex');
    await setSession(token, { role: 'team', teamId: teamNum, username: teamName.trim() });
    return res.json({ token, role: 'team', teamId: teamNum, teamName: teamName.trim(), category });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/logout', auth, async (req, res) => {
  await deleteSession(req.headers['authorization']);
  res.json({ success: true });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ 
    role: req.user.role, 
    teamId: req.user.teamId, 
    username: req.user.username,
    checkpointType: req.user.checkpointType || null
  });
});

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
app.get('/api/vapid-public-key', (req, res) => {
  if (!notificationsEnabled || !VAPID_PUBLIC_KEY) {
    return res.status(503).json({ 
      error: 'Notifications not configured',
      message: 'VAPID keys not set. Notifications are disabled.'
    });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/subscribe-notifications', auth, async (req, res) => {
  if (!notificationsEnabled) {
    return res.status(503).json({ 
      error: 'Notifications not configured',
      message: 'VAPID keys not set. Notifications are disabled.'
    });
  }
  
  try {
    const { subscription } = req.body;
    const username = req.user.username;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }
    
    // Store subscription in database (for both organizers and teams)
    await db.collection('push_subscriptions').updateOne(
      { username, endpoint: subscription.endpoint },
      { 
        $set: { 
          subscription,
          role: req.user.role,
          checkpointType: req.user.checkpointType,
          teamId: req.user.teamId || null,
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );
    
    res.json({ success: true, message: 'Notifications enabled!' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

app.post('/api/unsubscribe-notifications', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const username = req.user.username;
    
    await db.collection('push_subscriptions').deleteOne({ username, endpoint });
    
    res.json({ success: true, message: 'Notifications disabled' });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Helper function to send notifications
async function sendNotificationToOrganizers(checkpointType, title, body, data = {}) {
  if (!notificationsEnabled) {
    console.log('📢 Notification skipped (VAPID not configured):', title);
    return;
  }
  
  try {
    const subscriptions = await db.collection('push_subscriptions')
      .find({ role: 'organizer', checkpointType })
      .toArray();
    
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data,
      timestamp: Date.now()
    });
    
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
      } catch (err) {
        console.error('Failed to send notification:', err);
        // Remove invalid subscriptions
        if (err.statusCode === 410) {
          await db.collection('push_subscriptions').deleteOne({ _id: sub._id });
        }
      }
    });
    
    await Promise.all(sendPromises);
  } catch (err) {
    console.error('Notification error:', err);
  }
}

// Helper function to send broadcast notifications to ALL users (teams + organizers)
async function sendBroadcastNotification(title, body, data = {}) {
  if (!notificationsEnabled) {
    console.log('📢 Broadcast skipped (VAPID not configured):', title);
    return;
  }
  
  try {
    const subscriptions = await db.collection('push_subscriptions').find({}).toArray();
    
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data,
      timestamp: Date.now(),
      requireInteraction: true
    });
    
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
      } catch (err) {
        console.error('Failed to send notification:', err);
        if (err.statusCode === 410) {
          await db.collection('push_subscriptions').deleteOne({ _id: sub._id });
        }
      }
    });
    
    await Promise.all(sendPromises);
    console.log(`📢 Broadcast sent to ${subscriptions.length} subscribers`);
  } catch (err) {
    console.error('Broadcast error:', err);
  }
}

// ─── GAME STATE ───────────────────────────────────────────────────────────────
app.get('/api/game-state', async (req, res) => {
  const gs = await db.collection('game_state').findOne({ key: 'main' });
  res.json({
    started: gs.started,
    startTime: gs.startTime,
    finalCodingStarted: gs.finalCodingStarted,
    finalCodingStartTime: gs.finalCodingStartTime,
    roundPaused: gs.roundPaused || false,
    pausedAt: gs.pausedAt || null
  });
});

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  const allProgress = await db.collection('team_progress').find({}).toArray();
  const teams = await db.collection('teams').find({}).toArray();

  // Deduplicate teams by teamId (keep registered one)
  const tm = {};
  for (const t of teams) {
    if (!tm[t.teamId] || t.registered) tm[t.teamId] = t;
  }

  // Deduplicate team_progress by teamId — keep the one with the most points / furthest along
  const pm = {};
  for (const p of allProgress) {
    const tid = p.teamId;
    if (!pm[tid]) {
      pm[tid] = p;
    } else {
      const existing = pm[tid];
      const existingPoints = existing.totalPoints || 0;
      const newPoints = p.totalPoints || 0;
      // Keep whichever has more points; if tied, keep the one further along
      if (newPoints > existingPoints || (newPoints === existingPoints && (p.currentIndex || 0) > (existing.currentIndex || 0))) {
        pm[tid] = p;
      }
    }
  }

  const board = Object.values(pm).map(p => ({
    teamId: p.teamId,
    name: tm[p.teamId]?.name || `Team ${p.teamId}`,
    category: tm[p.teamId]?.category || 'unset',
    totalPoints: p.totalPoints || 0,
    completedCount: (p.completedCheckpoints || []).length,
    currentIndex: p.currentIndex || 0
  })).sort((a, b) => b.totalPoints - a.totalPoints || b.completedCount - a.completedCount);
  res.json(board);
});

// ─── ADMIN: Questions ─────────────────────────────────────────────────────────
app.get('/api/admin/questions', auth, adminOnly, async (req, res) => {
  res.json(await db.collection('questions').find({}).sort({ type: 1, difficulty: 1 }).toArray());
});

app.post('/api/admin/questions', auth, adminOnly, async (req, res) => {
  const { questionNumber, answer, difficulty, type, subType } = req.body;
  if (!answer || !type) return res.status(400).json({ error: 'Missing fields' });

  // For finalCoding, difficulty is not required
  if (type !== 'finalCoding' && !difficulty) return res.status(400).json({ error: 'Difficulty required for tracing/coding questions' });

  // Auto-generate volunteer code
  let code = '';
  if (type === 'finalCoding') {
    const existingCount = await db.collection('questions').countDocuments({ type: 'finalCoding' });
    code = `F${existingCount + 1}`;
  } else if (type === 'tracing') {
    const diffLetter = difficulty === 'easy' ? 'E' : difficulty === 'medium' ? 'M' : 'H';
    const existingCount = await db.collection('questions').countDocuments({ difficulty, type });
    code = `${diffLetter}T${existingCount + 1}`;  // e.g. ET1, MT2, HT3
  } else {
    const diffLetter = difficulty === 'easy' ? 'E' : difficulty === 'medium' ? 'M' : 'H';
    const existingCount = await db.collection('questions').countDocuments({ difficulty, type });
    code = `${diffLetter}C${existingCount + 1}`;
  }

  const result = await db.collection('questions').insertOne({
    questionNumber: questionNumber ? questionNumber.toString() : null,
    answer: answer.trim(),
    difficulty: type === 'finalCoding' ? 'final' : difficulty,
    type,
    subType: type === 'tracing' && subType ? subType : null,
    code,
    usedBy: []
  });
  res.json({ success: true, id: result.insertedId, code });
});

app.put('/api/admin/questions/:id', auth, adminOnly, async (req, res) => {
  const { questionNumber, answer, difficulty, type, subType } = req.body;
  const upd = { questionNumber: questionNumber?.toString(), answer: answer?.trim(), difficulty, type };
  if (type === 'tracing') upd.subType = subType || null;
  await db.collection('questions').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: upd }
  );
  res.json({ success: true });
});

app.delete('/api/admin/questions/:id', auth, adminOnly, async (req, res) => {
  await db.collection('questions').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// ─── ADMIN: Checkpoints ───────────────────────────────────────────────────────
app.get('/api/admin/checkpoints', auth, adminOnly, async (req, res) => {
  res.json(await db.collection('checkpoints').find({}).toArray());
});

app.post('/api/admin/checkpoints', auth, adminOnly, async (req, res) => {
  const { label, name, locationHint, activityAnswer } = req.body;
  const existing = await db.collection('checkpoints').findOne({ label });
  const update = { name, locationHint };
  // Store activityAnswer for T4-T7 checkpoints (activity locations)
  if (['T4','T5','T6','T7'].includes(label) && activityAnswer !== undefined) update.activityAnswer = activityAnswer.trim() || 'ayush';
  // Store codingAnswer for C1, C2 checkpoints (coding locations)
  if (['C1','C2'].includes(label) && activityAnswer !== undefined) update.codingAnswer = activityAnswer.trim() || 'ayush';
  if (existing) await db.collection('checkpoints').updateOne({ label }, { $set: update });
  else await db.collection('checkpoints').insertOne({ label, ...update });
  res.json({ success: true });
});

// ─── ADMIN: Teams ─────────────────────────────────────────────────────────────
app.get('/api/admin/teams', auth, adminOnly, async (req, res) => {
  const teams = await db.collection('teams').find({}).sort({ teamId: 1 }).toArray();
  // Deduplicate: keep one per teamId
  const seen = new Set();
  const unique = teams.filter(t => {
    if (seen.has(t.teamId)) return false;
    seen.add(t.teamId);
    return true;
  });
  const progress = await db.collection('team_progress').find({}).toArray();
  const pm = {}; progress.forEach(p => pm[p.teamId] = p);
  res.json(unique.map(t => ({ ...t, progress: pm[t.teamId] || null })));
});

app.put('/api/admin/teams/:teamId', auth, adminOnly, async (req, res) => {
  const { difficultyOverride, name } = req.body;
  const upd = {};
  if (difficultyOverride !== undefined) upd.difficultyOverride = difficultyOverride || null;
  if (name !== undefined) upd.name = name;
  await db.collection('teams').updateOne({ teamId: parseInt(req.params.teamId) }, { $set: upd });
  res.json({ success: true });
});

app.post('/api/admin/reset-registration/:teamId', auth, adminOnly, async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  await db.collection('teams').updateOne(
    { teamId },
    { $set: { registered: false, name: `Team ${teamId}`, category: 'unset', player1Name: '', player1Year: '', player1College: '', player2Name: '', player2Year: '', player2College: '', members: [] } }
  );
  res.json({ success: true });
});

// ─── ADMIN: Fix duplicate team_progress records ───────────────────────────────
app.post('/api/admin/fix-progress', auth, adminOnly, async (req, res) => {
  const progressCol = db.collection('team_progress');
  const allDocs = await progressCol.find({}).toArray();

  // Group by teamId
  const grouped = {};
  for (const doc of allDocs) {
    const tid = doc.teamId;
    if (!grouped[tid]) grouped[tid] = [];
    grouped[tid].push(doc);
  }

  let totalRemoved = 0;
  for (const [tid, docs] of Object.entries(grouped)) {
    if (docs.length <= 1) continue;

    // Keep the best doc: highest points, then furthest index
    docs.sort((a, b) =>
      (b.totalPoints || 0) - (a.totalPoints || 0) ||
      (b.currentIndex || 0) - (a.currentIndex || 0)
    );
    const [keep, ...discard] = docs;
    const discardIds = discard.map(d => d._id);
    await progressCol.deleteMany({ _id: { $in: discardIds } });
    totalRemoved += discardIds.length;
    console.log(`🧹 Team ${tid}: kept _id=${keep._id}, removed ${discardIds.length} duplicate(s)`);
  }

  res.json({ success: true, message: `Removed ${totalRemoved} duplicate progress record(s)` });
});

// ADMIN: Force-fix duplicate teams (callable from admin panel)
app.post('/api/admin/fix-teams', auth, adminOnly, async (req, res) => {
  const teamsCol = db.collection('teams');
  const allDocs = await teamsCol.find({}).toArray();
  const seen = new Map();
  for (const doc of allDocs) {
    const tid = doc.teamId;
    if (!seen.has(tid)) { seen.set(tid, doc); }
    else {
      const existing = seen.get(tid);
      if (doc.registered && !existing.registered) seen.set(tid, doc);
    }
  }
  const keepIds = new Set([...seen.values()].map(d => d._id.toString()));
  const toDelete = allDocs.filter(d => !keepIds.has(d._id.toString()));
  if (toDelete.length > 0) {
    await teamsCol.deleteMany({ _id: { $in: toDelete.map(d => d._id) } });
  }
  // Re-create unique index
  try { await teamsCol.dropIndex('teamId_1'); } catch(e){}
  try { await teamsCol.createIndex({ teamId: 1 }, { unique: true }); } catch(e){}
  const finalCount = await teamsCol.countDocuments();
  res.json({ success: true, removed: toDelete.length, totalNow: finalCount });
});

// ─── ADMIN: Progress ──────────────────────────────────────────────────────────
app.get('/api/admin/progress', auth, adminOnly, async (req, res) => {
  const allProgress = await db.collection('team_progress').find({}).toArray();
  const teams = await db.collection('teams').find({}).toArray();
  const tm = {};
  for (const t of teams) {
    if (!tm[t.teamId] || t.registered) tm[t.teamId] = t;
  }
  // Deduplicate progress by teamId before returning
  const pm = {};
  for (const p of allProgress) {
    const tid = p.teamId;
    if (!pm[tid] || (p.totalPoints || 0) > (pm[tid].totalPoints || 0)) pm[tid] = p;
  }
  res.json(Object.values(pm).map(p => ({ ...p, teamName: tm[p.teamId]?.name || `Team ${p.teamId}` })));
});

// ─── ADMIN: Event Control ─────────────────────────────────────────────────────
app.post('/api/admin/start-event', auth, adminOnly, async (req, res) => {
  const gs = await db.collection('game_state').findOne({ key: 'main' });
  if (gs.started) return res.json({ success: true, message: 'Already started' });

  // Only use registered teams (deduplicated)
  const allTeams = await db.collection('teams').find({}).sort({ teamId: 1 }).toArray();
  const seen = new Set();
  const teams = allTeams.filter(t => { if (seen.has(t.teamId)) return false; seen.add(t.teamId); return true; });
  const now = new Date();
  const sequences = generateBalancedSequences(teams);

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    if (!(await db.collection('team_progress').findOne({ teamId: team.teamId }))) {
      await db.collection('team_progress').insertOne({
        teamId: team.teamId,
        sequence: sequences[i],
        currentIndex: 0,
        checkpoints: [],
        completedCheckpoints: [],
        totalPoints: 0,
        startTime: now,
        deferredCoding: [],
        swapsRemaining: 3,
        swapsUsedPerCheckpoint: {}
      });
    }
  }
  await db.collection('game_state').updateOne({ key: 'main' }, { $set: { started: true, startTime: now } });
  res.json({ success: true });
});

app.post('/api/admin/reset-event', auth, adminOnly, async (req, res) => {
  await db.collection('team_progress').deleteMany({});
  await db.collection('questions').updateMany({}, { $set: { usedBy: [] } });
  await db.collection('game_state').updateOne({ key: 'main' }, { $set: { started: false, startTime: null, finalCodingStarted: false, finalCodingStartTime: null } });
  res.json({ success: true });
});

app.post('/api/admin/final-coding-start', auth, adminOnly, async (req, res) => {
  await db.collection('game_state').updateOne({ key: 'main' }, { $set: { finalCodingStarted: true, finalCodingStartTime: new Date() } });
  res.json({ success: true });
});

// ─── ADMIN: Broadcast Time Alerts ─────────────────────────────────────────────
app.post('/api/admin/broadcast-alert', auth, adminOnly, async (req, res) => {
  const { alertType } = req.body;
  
  let title, body, icon;
  
  switch(alertType) {
    case '1hour':
      title = '⏰ 1 Hour Remaining!';
      body = 'Only 1 hour left in the event. Keep pushing!';
      icon = '⏰';
      break;
    case '30min':
      title = '⚡ 30 Minutes Left!';
      body = 'Half an hour remaining. Time to speed up!';
      icon = '⚡';
      break;
    case '5min':
      title = '🔥 Final 5 Minutes!';
      body = 'Last 5 minutes! Give it your all!';
      icon = '🔥';
      break;
    default:
      return res.status(400).json({ error: 'Invalid alert type' });
  }
  
  await sendBroadcastNotification(title, body, { type: 'time_alert', alertType });
  
  res.json({ success: true, message: `${title} broadcast sent to all participants!` });
});

// ─── ADMIN: Pause/Resume Round (Round Over) ──────────────────────────────────
app.post('/api/admin/toggle-round', auth, adminOnly, async (req, res) => {
  const gs = await db.collection('game_state').findOne({ key: 'main' });
  const newPausedState = !gs.roundPaused;
  
  await db.collection('game_state').updateOne(
    { key: 'main' },
    { 
      $set: { 
        roundPaused: newPausedState,
        pausedAt: newPausedState ? new Date() : null
      } 
    }
  );
  
  if (newPausedState) {
    // Round paused - send "Round Over" notification
    await sendBroadcastNotification(
      '🏁 Round Over!',
      'The round has ended. Check the leaderboard!',
      { type: 'round_over', paused: true }
    );
  } else {
    // Round resumed - send "Round Resumed" notification
    await sendBroadcastNotification(
      '▶️ Round Resumed!',
      'The event has resumed. Continue your progress!',
      { type: 'round_resumed', paused: false }
    );
  }
  
  res.json({ 
    success: true, 
    roundPaused: newPausedState,
    message: newPausedState ? 'Round paused. All teams see leaderboard.' : 'Round resumed. Teams can continue.'
  });
});

// ─── TEAM: Game State ─────────────────────────────────────────────────────────
app.get('/api/team/state', auth, async (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Teams only' });
  const teamId = req.user.teamId;
  const gs = await db.collection('game_state').findOne({ key: 'main' });
  
  // Check if round is paused
  if (gs.roundPaused) {
    return res.json({ 
      gameStarted: true, 
      roundPaused: true,
      pausedAt: gs.pausedAt,
      message: 'Round is paused. Check the leaderboard!'
    });
  }
  
  if (!gs.started) return res.json({ gameStarted: false });
  let progress = await db.collection('team_progress').findOne({ teamId });
  if (!progress) return res.json({ gameStarted: true, noProgress: true });
  const idx = progress.currentIndex;
  if (idx >= 10) return res.json({ gameStarted: true, finished: true, totalPoints: progress.totalPoints, completedCheckpoints: progress.completedCheckpoints });

  const seqEntry = progress.sequence[idx];
  
  // Check if final checkpoint is locked (need to complete first 9)
  if (idx === 9 && seqEntry.locked) {
    const completedFirst9 = progress.completedCheckpoints.filter(i => i < 9).length;
    if (completedFirst9 < 9) {
      return res.json({ 
        gameStarted: true, 
        finalLocked: true, 
        message: `Final checkpoint locked. Complete all ${9 - completedFirst9} remaining checkpoints first!`,
        completedCheckpoints: progress.completedCheckpoints,
        totalPoints: progress.totalPoints
      });
    }
  }
  
  let cpData = progress.checkpoints.find(c => c.index === idx);
  if (!cpData) {
    let q = null;
    if (seqEntry.type === 'tracing') q = await assignQuestion(teamId, 'tracing', false, seqEntry.tracingIndex);
    else if (seqEntry.type === 'finalCoding') q = await assignQuestion(teamId, 'coding', true);
    // Coding checkpoints use fixed answer from checkpoint metadata (like activity)
    const cpMeta = await db.collection('checkpoints').findOne({ label: seqEntry.label });
    cpData = {
      index: idx, type: seqEntry.type, label: seqEntry.label,
      locationName: cpMeta?.name || seqEntry.label,
      locationHint: cpMeta?.locationHint || '',
      questionId: q?._id?.toString() || null,
      questionCode: q?.code || null,
      questionNumber: q?.questionNumber || null,
      questionAnswer: seqEntry.type === 'activity' ? (cpMeta?.activityAnswer || 'ayush') : 
                      seqEntry.type === 'coding' ? (cpMeta?.codingAnswer || 'ayush') :
                      (q?.answer || null),
      // Tracing & activity timer auto-starts when clue/location is first revealed
      status: (seqEntry.type === 'tracing' || seqEntry.type === 'activity') ? 'in-progress' : 'pending',
      timerStartedAt: (seqEntry.type === 'tracing' || seqEntry.type === 'activity') ? new Date() : null,
      timerPausedAt: null,
      timerUsed: 0, submittedAnswer: null, completedAt: null, pointsEarned: 0
    };
    await db.collection('team_progress').updateOne({ teamId }, { $push: { checkpoints: cpData } });
    progress = await db.collection('team_progress').findOne({ teamId });
    cpData = progress.checkpoints.find(c => c.index === idx);
  }

  let timerElapsed = cpData.timerUsed || 0;
  if (cpData.timerStartedAt && !cpData.timerPausedAt)
    timerElapsed += (Date.now() - new Date(cpData.timerStartedAt).getTime()) / 1000;

  // Check if activity checkpoint has been active for 20+ minutes and send notification
  if (seqEntry.type === 'activity' && cpData.timerStartedAt && !cpData.notified20Min) {
    const elapsedMinutes = timerElapsed / 60;
    if (elapsedMinutes >= 20) {
      // Mark as notified to avoid spam
      await db.collection('team_progress').updateOne(
        { teamId, 'checkpoints.index': idx },
        { $set: { 'checkpoints.$.notified20Min': true } }
      );
      
      // Send notification to activity organizers
      const team = await db.collection('teams').findOne({ teamId });
      await sendNotificationToOrganizers(
        'activity',
        '⏰ Team Stuck Alert',
        `${team?.name || 'Team ' + teamId} has been at ${cpData.locationName || seqEntry.label} for over 20 minutes!`,
        { teamId, checkpointIndex: idx, teamName: team?.name || 'Team ' + teamId }
      );
    }
  }

  res.json({
    gameStarted: true, 
    teamId, 
    currentIndex: idx, 
    totalCheckpoints: 10, 
    seqEntry,
    cpData: { ...cpData, timerElapsed: Math.floor(timerElapsed) },
    completedCheckpoints: progress.completedCheckpoints, 
    totalPoints: progress.totalPoints,
    sequence: progress.sequence.map((s, i) => ({
      ...s, index: i,
      status: (progress.completedCheckpoints || []).includes(i) ? 'completed' : i === idx ? 'current' : i < idx ? 'skipped' : 'pending'
    })),
    deferredCoding: progress.deferredCoding || [],
    swapsRemaining: progress.swapsRemaining ?? 3,
    swapsUsedAtCurrentCheckpoint: (progress.swapsUsedPerCheckpoint || {})[idx] || 0,
    finalCodingStarted: gs.finalCodingStarted, 
    finalCodingStartTime: gs.finalCodingStartTime,
    roundPaused: gs.roundPaused || false
  });
});

// ─── TEAM: Submit ─────────────────────────────────────────────────────────────
app.post('/api/team/submit', auth, async (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Teams only' });
  const teamId = req.user.teamId;
  const { answer } = req.body;
  const progress = await db.collection('team_progress').findOne({ teamId });
  if (!progress) return res.status(400).json({ error: 'No progress' });
  const idx = progress.currentIndex;
  const cpData = progress.checkpoints.find(c => c.index === idx);
  if (!cpData) return res.status(400).json({ error: 'No active checkpoint' });
  const gs = await db.collection('game_state').findOne({ key: 'main' });

  if (cpData.type === 'tracing') {
    const correct = answer.trim().toLowerCase() === (cpData.questionAnswer || '').trim().toLowerCase();
    if (!correct) return res.json({ correct: false, message: 'Wrong answer, try again!' });
    // Calculate points based on time elapsed since clue was revealed (timer auto-started)
    let elapsedSeconds = cpData.timerUsed || 0;
    if (cpData.timerStartedAt && !cpData.timerPausedAt)
      elapsedSeconds += (Date.now() - new Date(cpData.timerStartedAt).getTime()) / 1000;
    const points = calcTracingPoints(elapsedSeconds);
    await db.collection('team_progress').updateOne(
      { teamId, 'checkpoints.index': idx },
      { $set: { 'checkpoints.$.status': 'completed', 'checkpoints.$.completedAt': new Date(), 'checkpoints.$.pointsEarned': points }, $push: { completedCheckpoints: idx }, $inc: { totalPoints: points } }
    );
    await db.collection('team_progress').updateOne({ teamId }, { $set: { currentIndex: idx + 1 } });
    return res.json({ correct: true, message: `Correct! +${points} points`, points });
  }

  // Activity checkpoints: password set per-location by admin (default 'ayush') — same point rules as tracing
  if (cpData.type === 'activity') {
    const correctAnswer = (cpData.questionAnswer || 'ayush').trim().toLowerCase();
    const correct = answer.trim().toLowerCase() === correctAnswer;
    if (!correct) return res.json({ correct: false, message: 'Wrong code, try again!' });
    let elapsedSeconds = cpData.timerUsed || 0;
    if (cpData.timerStartedAt && !cpData.timerPausedAt)
      elapsedSeconds += (Date.now() - new Date(cpData.timerStartedAt).getTime()) / 1000;
    const points = calcTracingPoints(elapsedSeconds);
    await db.collection('team_progress').updateOne(
      { teamId, 'checkpoints.index': idx },
      { $set: { 'checkpoints.$.status': 'completed', 'checkpoints.$.completedAt': new Date(), 'checkpoints.$.pointsEarned': points }, $push: { completedCheckpoints: idx }, $inc: { totalPoints: points } }
    );
    await db.collection('team_progress').updateOne({ teamId }, { $set: { currentIndex: idx + 1 } });
    return res.json({ correct: true, message: `Activity complete! +${points} points. Proceed to next checkpoint!`, points });
  }

  if (cpData.type === 'coding') {
    // Coding checkpoints now use fixed answer code (like activity)
    const correctAnswer = (cpData.questionAnswer || 'ayush').trim().toLowerCase();
    const correct = answer.trim().toLowerCase() === correctAnswer;
    if (!correct) return res.json({ correct: false, message: 'Wrong code, try again!' });
    
    // Calculate points based on timer
    let timerElapsed = cpData.timerUsed || 0;
    if (cpData.timerStartedAt && !cpData.timerPausedAt)
      timerElapsed += (Date.now() - new Date(cpData.timerStartedAt).getTime()) / 1000;
    const points = calcCodingPoints(timerElapsed);
    
    await db.collection('team_progress').updateOne(
      { teamId, 'checkpoints.index': idx },
      { $set: { 'checkpoints.$.status': 'completed', 'checkpoints.$.completedAt': new Date(), 'checkpoints.$.pointsEarned': points }, $push: { completedCheckpoints: idx }, $inc: { totalPoints: points } }
    );
    await db.collection('team_progress').updateOne({ teamId }, { $set: { currentIndex: idx + 1 } });
    return res.json({ correct: true, message: `Coding complete! +${points} points`, points });
  }
  
  if (cpData.type === 'finalCoding') {
    let timerElapsed = cpData.timerUsed || 0;
    if (cpData.timerStartedAt && !cpData.timerPausedAt)
      timerElapsed += (Date.now() - new Date(cpData.timerStartedAt).getTime()) / 1000;
    const timerExpired = timerElapsed >= 600;
    await db.collection('team_progress').updateOne(
      { teamId, 'checkpoints.index': idx },
      { $set: { 'checkpoints.$.submittedAnswer': answer, 'checkpoints.$.submittedAt': new Date(), 'checkpoints.$.timerExpired': timerExpired, 'checkpoints.$.status': 'submitted' } }
    );
    return res.json({ success: true, message: 'Answer submitted! Waiting for organizer to confirm.', timerExpired });
  }
  res.json({ success: false });
});

// ─── TEAM: Defer Coding ───────────────────────────────────────────────────────
app.post('/api/team/defer-coding', auth, async (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Teams only' });
  const teamId = req.user.teamId;
  const progress = await db.collection('team_progress').findOne({ teamId });
  if (!progress) return res.status(400).json({ error: 'No progress' });
  const idx = progress.currentIndex;
  const seqEntry = progress.sequence[idx];
  if (seqEntry.type !== 'coding') return res.status(400).json({ error: 'Can only defer non-final coding rounds' });
  
  await db.collection('team_progress').updateOne({ teamId, 'checkpoints.index': idx }, { $set: { 'checkpoints.$.status': 'deferred' } });
  await db.collection('team_progress').updateOne({ teamId }, { $set: { currentIndex: idx + 1 }, $push: { deferredCoding: { originalIndex: idx, label: seqEntry.label, deferredAt: new Date(), completed: false } } });
  
  // Send notification to coding organizers
  const team = await db.collection('teams').findOne({ teamId });
  await sendNotificationToOrganizers(
    'coding',
    '⏭️ Coding Deferred',
    `${team?.name || 'Team ' + teamId} has deferred ${seqEntry.label} coding checkpoint`,
    { teamId, checkpointIndex: idx, teamName: team?.name || 'Team ' + teamId, action: 'deferred' }
  );
  
  res.json({ success: true, message: 'Coding round deferred. Complete it before the final checkpoint!' });
});

app.post('/api/team/activate-deferred', auth, async (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Teams only' });
  const { originalIndex } = req.body;
  const teamId = req.user.teamId;
  const progress = await db.collection('team_progress').findOne({ teamId });
  if (!progress) return res.status(400).json({ error: 'No progress' });
  const deferred = progress.deferredCoding.find(d => d.originalIndex === originalIndex && !d.completed);
  if (!deferred) return res.status(400).json({ error: 'Deferred round not found' });
  const cpData = progress.checkpoints.find(c => c.index === originalIndex);
  if (cpData) {
    await db.collection('team_progress').updateOne({ teamId, 'checkpoints.index': originalIndex }, { $set: { 'checkpoints.$.status': 'pending', 'checkpoints.$.timerRequested': true } });
  }
  
  // Send notification to coding organizers
  const team = await db.collection('teams').findOne({ teamId });
  const seqEntry = progress.sequence[originalIndex];
  await sendNotificationToOrganizers(
    'coding',
    '🔔 Timer Request',
    `${team?.name || 'Team ' + teamId} is ready to start deferred ${seqEntry?.label || 'coding'} checkpoint`,
    { teamId, checkpointIndex: originalIndex, teamName: team?.name || 'Team ' + teamId, action: 'timer_request' }
  );
  
  res.json({ success: true, message: 'Activated! Ask organizer to start your timer.' });
});

// ─── ORGANIZER ────────────────────────────────────────────────────────────────
// Get teams at specific checkpoint types (filtered by organizer's checkpoint type)
app.get('/api/organizer/checkpoint-teams', auth, orgOrAdmin, async (req, res) => {
  const checkpointType = req.user.checkpointType || req.query.type; // Admin can query any type
  
  const allProgress = await db.collection('team_progress').find({}).toArray();
  const teams = await db.collection('teams').find({}).toArray();
  const tm = {};
  for (const t of teams) { if (!tm[t.teamId] || t.registered) tm[t.teamId] = t; }
  
  const result = [];
  
  for (const p of allProgress) {
    const idx = p.currentIndex;
    const seq = p.sequence?.[idx];
    if (!seq) continue;
    
    const cpData = p.checkpoints.find(c => c.index === idx);
    
    // Filter by checkpoint type
    if (checkpointType && seq.type !== checkpointType) {
      // For coding organizers, also check deferred coding
      if (checkpointType === 'coding') {
        for (const def of (p.deferredCoding || [])) {
          if (def.completed) continue;
          const dc = p.checkpoints.find(c => c.index === def.originalIndex && (c.timerRequested || c.status === 'in-progress' || c.status === 'submitted'));
          if (dc) {
            result.push({ 
              teamId: p.teamId, 
              name: tm[p.teamId]?.name || `Team ${p.teamId}`, 
              currentIndex: def.originalIndex, 
              seq: p.sequence[def.originalIndex], 
              cpData: dc, 
              isDeferred: true, 
              deferred: p.deferredCoding || [],
              canSkip: false
            });
          }
        }
      }
      continue;
    }
    
    // Calculate if team can skip (only for activity checkpoints)
    let canSkip = false;
    if (seq.type === 'activity' && cpData && cpData.timerStartedAt) {
      const elapsedMinutes = (Date.now() - new Date(cpData.timerStartedAt).getTime()) / (1000 * 60);
      canSkip = elapsedMinutes >= 20;
    }
    
    result.push({ 
      teamId: p.teamId, 
      name: tm[p.teamId]?.name || `Team ${p.teamId}`, 
      currentIndex: idx, 
      seq, 
      cpData, 
      isDeferred: false, 
      deferred: p.deferredCoding || [],
      canSkip
    });
    
    // For coding organizers, also include deferred coding
    if (checkpointType === 'coding' || !checkpointType) {
      for (const def of (p.deferredCoding || [])) {
        if (def.completed) continue;
        const dc = p.checkpoints.find(c => c.index === def.originalIndex && (c.timerRequested || c.status === 'in-progress' || c.status === 'submitted'));
        if (dc) {
          result.push({ 
            teamId: p.teamId, 
            name: tm[p.teamId]?.name || `Team ${p.teamId}`, 
            currentIndex: def.originalIndex, 
            seq: p.sequence[def.originalIndex], 
            cpData: dc, 
            isDeferred: true, 
            deferred: p.deferredCoding || [],
            canSkip: false
          });
        }
      }
    }
  }
  
  res.json(result);
});

app.post('/api/organizer/start-timer', auth, orgOrAdmin, async (req, res) => {
  const { teamId, checkpointIndex } = req.body;
  await db.collection('team_progress').updateOne(
    { teamId: parseInt(teamId), 'checkpoints.index': parseInt(checkpointIndex) },
    { $set: { 'checkpoints.$.timerStartedAt': new Date(), 'checkpoints.$.timerPausedAt': null, 'checkpoints.$.timerUsed': 0, 'checkpoints.$.status': 'in-progress' } }
  );
  res.json({ success: true });
});

app.post('/api/organizer/timer-control', auth, orgOrAdmin, async (req, res) => {
  const { teamId, checkpointIndex, action } = req.body;
  const idx = parseInt(checkpointIndex);
  const progress = await db.collection('team_progress').findOne({ teamId: parseInt(teamId) });
  const cpData = progress?.checkpoints.find(c => c.index === idx);
  if (!cpData) return res.status(400).json({ error: 'Not found' });
  if (action === 'pause') {
    const elapsed = (cpData.timerUsed || 0) + (cpData.timerStartedAt && !cpData.timerPausedAt ? (Date.now() - new Date(cpData.timerStartedAt).getTime()) / 1000 : 0);
    await db.collection('team_progress').updateOne({ teamId: parseInt(teamId), 'checkpoints.index': idx }, { $set: { 'checkpoints.$.timerPausedAt': new Date(), 'checkpoints.$.timerUsed': elapsed } });
  } else {
    await db.collection('team_progress').updateOne({ teamId: parseInt(teamId), 'checkpoints.index': idx }, { $set: { 'checkpoints.$.timerStartedAt': new Date(), 'checkpoints.$.timerPausedAt': null } });
  }
  res.json({ success: true });
});

app.post('/api/organizer/mark-status', auth, orgOrAdmin, async (req, res) => {
  const { teamId, checkpointIndex, status } = req.body;
  const idx = parseInt(checkpointIndex); const teamIdInt = parseInt(teamId);
  const progress = await db.collection('team_progress').findOne({ teamId: teamIdInt });
  const cpData = progress?.checkpoints.find(c => c.index === idx);
  if (!cpData) return res.status(400).json({ error: 'Not found' });
  if (status === 'completed') {
    const isDeferred = (progress.deferredCoding || []).find(d => d.originalIndex === idx && !d.completed);
    // Calculate coding points based on actual timer used (pausing pauses the deduction)
    let timerUsed = cpData.timerUsed || 0;
    if (cpData.timerStartedAt && !cpData.timerPausedAt)
      timerUsed += (Date.now() - new Date(cpData.timerStartedAt).getTime()) / 1000;
    let points = calcCodingPoints(timerUsed);
    if (isDeferred) points = Math.floor(points * 0.8); // 20% penalty for deferred
    await db.collection('team_progress').updateOne(
      { teamId: teamIdInt, 'checkpoints.index': idx },
      { $set: { 'checkpoints.$.status': 'completed', 'checkpoints.$.completedAt': new Date(), 'checkpoints.$.pointsEarned': points }, $inc: { totalPoints: points } }
    );
    if (progress.currentIndex === idx) {
      await db.collection('team_progress').updateOne({ teamId: teamIdInt }, { $set: { currentIndex: idx + 1 }, $push: { completedCheckpoints: idx } });
    } else {
      await db.collection('team_progress').updateOne({ teamId: teamIdInt, 'deferredCoding.originalIndex': idx }, { $set: { 'deferredCoding.$.completed': true } });
      await db.collection('team_progress').updateOne({ teamId: teamIdInt }, { $push: { completedCheckpoints: idx } });
    }
    return res.json({ success: true, points });
  }
  await db.collection('team_progress').updateOne({ teamId: teamIdInt, 'checkpoints.index': idx }, { $set: { 'checkpoints.$.status': status } });
  res.json({ success: true });
});

app.post('/api/organizer/mark-final', auth, orgOrAdmin, async (req, res) => {
  const { teamId, status } = req.body;
  const teamIdInt = parseInt(teamId);
  const progress = await db.collection('team_progress').findOne({ teamId: teamIdInt });
  const cpData = progress?.checkpoints.find(c => c.index === 9);
  if (!cpData) return res.status(400).json({ error: 'Final checkpoint not yet started' });
  if (status === 'completed') {
    const gs = await db.collection('game_state').findOne({ key: 'main' });
    // Final round: flat 400 points, no time-based deduction
    const points = 400;
    await db.collection('team_progress').updateOne(
      { teamId: teamIdInt, 'checkpoints.index': 9 },
      { $set: { 'checkpoints.$.status': 'completed', 'checkpoints.$.completedAt': new Date(), 'checkpoints.$.pointsEarned': points }, $inc: { totalPoints: points } }
    );
    await db.collection('team_progress').updateOne({ teamId: teamIdInt }, { $set: { currentIndex: 10 }, $push: { completedCheckpoints: 9 } });
    return res.json({ success: true, points });
  }
  await db.collection('team_progress').updateOne({ teamId: teamIdInt, 'checkpoints.index': 9 }, { $set: { 'checkpoints.$.status': status } });
  res.json({ success: true });
});

// ─── ORGANIZER: Skip Activity Checkpoint (after 20 mins) ─────────────────────
app.post('/api/organizer/skip-activity', auth, orgOrAdmin, async (req, res) => {
  const { teamId, checkpointIndex } = req.body;
  const teamIdInt = parseInt(teamId);
  const idx = parseInt(checkpointIndex);
  
  const progress = await db.collection('team_progress').findOne({ teamId: teamIdInt });
  if (!progress) return res.status(400).json({ error: 'Team progress not found' });
  
  const seq = progress.sequence?.[idx];
  if (!seq || seq.type !== 'activity') {
    return res.status(400).json({ error: 'Can only skip activity checkpoints' });
  }
  
  const cpData = progress.checkpoints.find(c => c.index === idx);
  if (!cpData || !cpData.timerStartedAt) {
    return res.status(400).json({ error: 'Activity not started yet' });
  }
  
  // Check if 20 minutes have passed
  const elapsedMinutes = (Date.now() - new Date(cpData.timerStartedAt).getTime()) / (1000 * 60);
  if (elapsedMinutes < 20) {
    return res.status(400).json({ 
      error: `Cannot skip yet. Team must wait ${Math.ceil(20 - elapsedMinutes)} more minutes.` 
    });
  }
  
  // Award 50 points and mark as completed
  const points = 50;
  await db.collection('team_progress').updateOne(
    { teamId: teamIdInt, 'checkpoints.index': idx },
    { 
      $set: { 
        'checkpoints.$.status': 'skipped', 
        'checkpoints.$.completedAt': new Date(), 
        'checkpoints.$.pointsEarned': points,
        'checkpoints.$.skippedByOrganizer': true
      } 
    }
  );
  
  await db.collection('team_progress').updateOne(
    { teamId: teamIdInt },
    { 
      $set: { currentIndex: idx + 1 },
      $push: { completedCheckpoints: idx },
      $inc: { totalPoints: points }
    }
  );
  
  res.json({ 
    success: true, 
    message: `Activity skipped. Team awarded ${points} points and moved to next checkpoint.`,
    points 
  });
});

// ─── TEAM: Swap / Regenerate Question ────────────────────────────────────────
app.post('/api/team/swap-question', auth, async (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Teams only' });
  const teamId = req.user.teamId;
  const progress = await db.collection('team_progress').findOne({ teamId });
  if (!progress) return res.status(400).json({ error: 'No progress found' });

  const idx = progress.currentIndex;
  const seqEntry = progress.sequence[idx];

  // Final round and activity checkpoints cannot be swapped
  if (seqEntry.type === 'finalCoding' || seqEntry.type === 'activity') {
    return res.status(400).json({ error: 'Cannot swap this checkpoint.' });
  }

  // Check global swaps remaining
  const swapsRemaining = progress.swapsRemaining ?? 3;
  if (swapsRemaining <= 0) {
    return res.status(400).json({ error: 'No swaps remaining! You have used all 3 swaps.' });
  }

  // Check per-checkpoint swap limit (max 1 per checkpoint)
  const swapsUsedHere = (progress.swapsUsedPerCheckpoint || {})[idx] || 0;
  if (swapsUsedHere >= 1) {
    return res.status(400).json({ error: 'You have already used your swap for this checkpoint.' });
  }

  // Get current question to exclude it
  const cpData = progress.checkpoints.find(c => c.index === idx);
  const currentQuestionId = cpData?.questionId;

  // Assign a new question (different from current), respecting subType for tracing
  const difficulty = await getTeamDifficulty(teamId);
  const order = difficulty === 'easy' ? ['easy','medium','hard']
    : difficulty === 'medium' ? ['medium','easy','hard']
    : ['hard','medium','easy'];

  const swapFilter = {
    type: seqEntry.type,
    usedBy: { $not: { $elemMatch: { $eq: teamId } } },
    ...(currentQuestionId ? { _id: { $ne: new ObjectId(currentQuestionId) } } : {}),
    ...(seqEntry.type === 'tracing' && seqEntry.subType ? { subType: seqEntry.subType } : {})
  };

  let newQ = null;
  for (const d of order) {
    const q = await db.collection('questions').findOne({ ...swapFilter, difficulty: d });
    if (q) { newQ = q; break; }
  }

  if (!newQ) {
    return res.status(400).json({ error: 'No alternative question available for swap.' });
  }

  // Mark new question as used by this team
  await db.collection('questions').updateOne({ _id: newQ._id }, { $push: { usedBy: teamId } });

  // Release old question from usedBy (if it existed)
  if (currentQuestionId) {
    try {
      await db.collection('questions').updateOne(
        { _id: new ObjectId(currentQuestionId) },
        { $pull: { usedBy: teamId } }
      );
    } catch(e) { /* ignore */ }
  }

  // Update checkpoint data with new question
  const swapKey = `swapsUsedPerCheckpoint.${idx}`;
  if (cpData) {
    await db.collection('team_progress').updateOne(
      { teamId, 'checkpoints.index': idx },
      {
        $set: {
          'checkpoints.$.questionId': newQ._id.toString(),
          'checkpoints.$.questionCode': newQ.code || null,
          'checkpoints.$.questionNumber': newQ.questionNumber || null,
          'checkpoints.$.questionAnswer': newQ.answer || null,
        }
      }
    );
  } else {
    // cpData doesn't exist yet — create it
    const cpMeta = await db.collection('checkpoints').findOne({ label: seqEntry.label });
    const newCp = {
      index: idx, type: seqEntry.type, label: seqEntry.label,
      locationName: cpMeta?.name || seqEntry.label,
      locationHint: cpMeta?.locationHint || '',
      questionId: newQ._id.toString(),
      questionCode: newQ.code || null,
      questionNumber: newQ.questionNumber || null,
      questionAnswer: newQ.answer || null,
      status: (seqEntry.type === 'tracing' || seqEntry.type === 'activity') ? 'in-progress' : 'pending',
      timerStartedAt: (seqEntry.type === 'tracing' || seqEntry.type === 'activity') ? new Date() : null,
      timerPausedAt: null,
      timerUsed: 0, submittedAnswer: null, completedAt: null, pointsEarned: 0
    };
    await db.collection('team_progress').updateOne({ teamId }, { $push: { checkpoints: newCp } });
  }

  // Deduct swap
  await db.collection('team_progress').updateOne(
    { teamId },
    {
      $inc: { swapsRemaining: -1, [swapKey]: 1 }
    }
  );

  const updatedProgress = await db.collection('team_progress').findOne({ teamId });
  res.json({
    success: true,
    message: `Question swapped! New code: ${newQ.code}`,
    newCode: newQ.code,
    swapsRemaining: updatedProgress.swapsRemaining
  });
});

// ─── ADMIN: Grant extra swaps to a team ───────────────────────────────────────
app.post('/api/admin/teams/:teamId/add-swaps', auth, adminOnly, async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  const { amount = 1 } = req.body;
  const n = parseInt(amount);
  if (isNaN(n) || n < 1 || n > 10) return res.status(400).json({ error: 'Amount must be 1–10' });

  const result = await db.collection('team_progress').updateOne(
    { teamId },
    { $inc: { swapsRemaining: n } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ error: 'Team progress not found. Has event started?' });

  const updated = await db.collection('team_progress').findOne({ teamId });
  res.json({ success: true, swapsRemaining: updated.swapsRemaining });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 CodeHunt 2k26 server started on port ${PORT}`);
  console.log('🔌 Connecting to MongoDB...');
  tryConnect();
});