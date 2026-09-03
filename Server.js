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
    volunteerCode: 'NORTH-LOCK',
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
    volunteerCode: 'GARDEN-LOCK',
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
    volunteerCode: 'GRID-LOCK',
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
    volunteerCode: 'WEST-LOCK',
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

const QUESTION_SET_COUNT = 10;
const RIDDLE_QUESTIONS = [
  { prompt: 'I have hands but cannot clap. What am I?', answer: 'clock' },
  { prompt: 'I get wetter the more I dry. What am I?', answer: 'towel' },
  { prompt: 'I have one eye but cannot see. What am I?', answer: 'needle' },
  { prompt: 'I have a neck but no head. What am I?', answer: 'bottle' },
  { prompt: 'I can be cracked, made, told, and played. What am I?', answer: 'joke' },
  { prompt: 'I have cities but no houses and rivers but no water. What am I?', answer: 'map' },
];
const MYSTERY_POOL = [
  ['What is the capital of India?', ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'], 'New Delhi'],
  ['Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Saturn'], 'Mars'],
  ['What is the chemical symbol for gold?', ['Ag', 'Fe', 'Au', 'Go'], 'Au'],
  ['How many sides does a hexagon have?', ['Five', 'Six', 'Seven', 'Eight'], 'Six'],
  ['Who wrote Romeo and Juliet?', ['Dickens', 'Shakespeare', 'Austen', 'Frost'], 'Shakespeare'],
  ['What is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 'Pacific'],
  ['Which language runs in a web browser?', ['Python', 'JavaScript', 'C++', 'SQL'], 'JavaScript'],
  ['What is 12 × 8?', ['86', '96', '108', '112'], '96'],
  ['Which gas do plants absorb?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 'Carbon dioxide'],
  ['What is the first element on the periodic table?', ['Helium', 'Hydrogen', 'Oxygen', 'Carbon'], 'Hydrogen'],
  ['Which instrument has black and white keys?', ['Guitar', 'Piano', 'Flute', 'Drum'], 'Piano'],
  ['How many continents are there?', ['Five', 'Six', 'Seven', 'Eight'], 'Seven'],
  ['What is the square root of 144?', ['10', '11', '12', '14'], '12'],
  ['Which animal is called the ship of the desert?', ['Horse', 'Camel', 'Elephant', 'Yak'], 'Camel'],
  ['What is the hardest natural substance?', ['Iron', 'Diamond', 'Quartz', 'Granite'], 'Diamond'],
  ['Which organ pumps blood?', ['Lung', 'Brain', 'Heart', 'Liver'], 'Heart'],
  ['What is the freezing point of water in Celsius?', ['0', '10', '32', '100'], '0'],
  ['Which is the nearest star to Earth?', ['Sirius', 'The Sun', 'Polaris', 'Vega'], 'The Sun'],
  ['What is the binary representation of decimal 2?', ['00', '01', '10', '11'], '10'],
  ['Which shape has three sides?', ['Circle', 'Square', 'Triangle', 'Rectangle'], 'Triangle'],
  ['What is the largest mammal?', ['Elephant', 'Blue whale', 'Giraffe', 'Hippopotamus'], 'Blue whale'],
  ['Which country is famous for the pyramids of Giza?', ['Greece', 'Egypt', 'Mexico', 'Peru'], 'Egypt'],
  ['How many minutes are in one hour?', ['30', '45', '60', '90'], '60'],
  ['What does CPU stand for?', ['Central Processing Unit', 'Computer Power Utility', 'Core Program User', 'Central Print Unit'], 'Central Processing Unit'],
  ['Which number is prime?', ['21', '27', '29', '33'], '29'],
  ['What is the boiling point of water at sea level in Celsius?', ['50', '90', '100', '120'], '100'],
  ['Which direction does the sun rise from?', ['North', 'South', 'East', 'West'], 'East'],
  ['What is the main language used to style web pages?', ['HTML', 'CSS', 'JSON', 'XML'], 'CSS'],
  ['Which metal is liquid at room temperature?', ['Copper', 'Mercury', 'Aluminium', 'Zinc'], 'Mercury'],
  ['How many bytes are in a kilobyte in common computing usage?', ['100', '512', '1024', '2048'], '1024'],
  ['Which is a renewable energy source?', ['Coal', 'Solar power', 'Petrol', 'Natural gas'], 'Solar power'],
  ['What is the opposite of binary 1 in a bit?', ['0', '2', '10', 'False and true'], '0'],
  ['Which country gifted the Statue of Liberty to the United States?', ['France', 'Spain', 'Italy', 'Canada'], 'France'],
  ['What is the process by which plants make food?', ['Respiration', 'Photosynthesis', 'Digestion', 'Fermentation'], 'Photosynthesis'],
  ['Which device is used to measure temperature?', ['Barometer', 'Thermometer', 'Altimeter', 'Compass'], 'Thermometer'],
  ['How many players are on a football team on the field?', ['9', '10', '11', '12'], '11'],
  ['Which file extension is commonly used for JavaScript?', ['.css', '.js', '.py', '.java'], '.js'],
  ['What is 15% of 200?', ['15', '20', '30', '40'], '30'],
  ['Which planet is famous for its rings?', ['Mercury', 'Earth', 'Saturn', 'Neptune'], 'Saturn'],
  ['What does QR stand for in QR code?', ['Quick Response', 'Query Register', 'Quality Read', 'Quick Route'], 'Quick Response'],
].map(([prompt, options, answer], index) => ({ id: `mystery-${index + 1}`, prompt, options, answer }));

function makeQuestion(type, seed, index) {
  const n = seed * 10 + index + 1;
  const variant = index % 3;
  if (type === 'CODING') {
    if (variant === 0) {
      const left = (n % 17) + 3;
      const right = (n % 7) + 2;
      const add = n % 9;
      return { prompt: `What is the output of: ${left} * ${right} + ${add}?`, answer: String(left * right + add) };
    }
    if (variant === 1) {
      const count = (n % 6) + 4;
      return { prompt: `A loop adds every integer from 1 through ${count}. What is the final total?`, answer: String((count * (count + 1)) / 2) };
    }
    const values = [n % 11, (n + 3) % 11, (n + 6) % 11, (n + 9) % 11];
    const position = n % values.length;
    return { prompt: `An array is [${values.join(', ')}]. What value is at index ${position}?`, answer: String(values[position]) };
  }
  if (type === 'LOGIC') {
    if (variant === 0) {
      const start = (n % 20) + 2;
      const step = (n % 8) + 2;
      return { prompt: `Complete the sequence: ${start}, ${start + step}, ${start + step * 2}, ${start + step * 3}, __`, answer: String(start + step * 4) };
    }
    if (variant === 1) {
      const base = (n % 8) + 2;
      return { prompt: `The pattern is 1, ${base}, ${base * 2}, ${base * 3}. What comes next?`, answer: String(base * 4) };
    }
    const machines = (n % 8) + 3;
    return { prompt: `If ${machines} machines make ${machines} parts in ${machines} minutes, how many minutes do 100 machines need to make 100 parts?`, answer: String(machines) };
  }
  if (type === 'PUZZLE') {
    const words = ['planet', 'orange', 'signal', 'campus', 'cipher', 'garden', 'circle', 'bridge', 'window', 'binary', 'rocket', 'vector', 'random', 'monkey', 'silver', 'puzzle', 'hidden', 'magnet', 'switch', 'memory'];
    const word = words[n % words.length];
    if (variant === 0) return { prompt: `What word is formed when the letters of "${word}" are placed in alphabetical order?`, answer: word.split('').sort().join('') };
    if (variant === 1) return { prompt: `A ${word.length}-letter code starts with the first letter of "${word}" and ends with its last letter. What is the middle letter of "${word}"?`, answer: word[Math.floor(word.length / 2)] };
    return { prompt: `How many different letters are in the word "${word}"?`, answer: String(new Set(word.split('')).size) };
  }
  if (type === 'RIDDLE') {
    const riddles = [
      ['I have hands but cannot clap. What am I?', 'clock'],
      ['I get wetter the more I dry. What am I?', 'towel'],
      ['I have one eye but cannot see. What am I?', 'needle'],
      ['I have a neck but no head. What am I?', 'bottle'],
      ['I can be cracked, made, told, and played. What am I?', 'joke'],
      ['I have cities but no houses and rivers but no water. What am I?', 'map'],
      ['I am full of holes but still hold water. What am I?', 'sponge'],
      ['I fly without wings and cry without eyes. What am I?', 'cloud'],
      ['I have teeth but cannot bite. What am I?', 'comb'],
      ['I am always in front of you but cannot be seen. What am I?', 'future'],
      ['I have a thumb and four fingers but I am not alive. What am I?', 'glove'],
      ['I come down but never go up. What am I?', 'rain'],
      ['I have words but never speak. What am I?', 'book'],
      ['I have a head and a tail but no body. What am I?', 'coin'],
      ['I am lighter than a feather but no one can hold me for long. What am I?', 'breath'],
      ['I have many keys but cannot open a single lock. What am I?', 'piano'],
      ['I can run but never walk and have a bed but never sleep. What am I?', 'river'],
      ['I am tall when young and short when old. What am I?', 'candle'],
      ['I have branches but no fruit, trunk, or leaves. What am I?', 'bank'],
      ['I can travel around the world while staying in one corner. What am I?', 'stamp'],
    ];
    return { prompt: riddles[n % riddles.length][0], answer: riddles[n % riddles.length][1] };
  }
  const left = (n % 9) + 2;
  const right = (n % 5) + 2;
  if (variant === 0) return { prompt: `A box has ${left} red tokens and ${right} blue tokens. How many tokens are inside?`, answer: String(left + right) };
  if (variant === 1) return { prompt: `A team earns ${left} points in round one and twice that in round two. What is its total?`, answer: String(left * 3) };
  return { prompt: `A route has ${left + right} checkpoints. A team has cleared ${left}. How many remain?`, answer: String(right) };
}

function makeQuestionSets(challenge) {
  if (challenge.type === 'RIDDLE') {
    const start = challenge.number < 9 ? 0 : 3;
    return [RIDDLE_QUESTIONS.slice(start, start + 3)];
  }
  if (challenge.type === 'MYSTERY') {
    return [MYSTERY_POOL.slice(0, 20), MYSTERY_POOL.slice(20)];
  }
  const setCount = challenge.type === 'CODING' ? 5 : QUESTION_SET_COUNT;
  return Array.from({ length: setCount }, (_, setIndex) => (
    Array.from({ length: challenge.type === 'CODING' ? 1 : 3 }, (_, questionIndex) => (
      makeQuestion(challenge.type, challenge.number * 100 + setIndex * 3, questionIndex)
    ))
  ));
}

const baseRoute = challengeSeed.map((challenge) => challenge.id);
const challenges = new Map(challengeSeed.map((challenge) => [challenge.id, { ...challenge, questionSets: makeQuestionSets(challenge), disabled: false }]));
const teams = new Map();
const sessions = new Map();
const auditLog = [];
const state = {
  eventName: 'CodeHunt / The Orange Circuit',
  status: 'LIVE',
  startedAt: new Date(),
};

for (let i = 1; i <= 50; i += 1) {
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
    questionAssignments: {},
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
  const { answer, questionSets, volunteerCode, ...safeChallenge } = challenge;
  return safeChallenge;
}

function getTeamChallenge(team) {
  if (!team || team.currentIndex >= team.route.length) return null;
  return challenges.get(team.route[team.currentIndex]);
}

function assignedQuestions(team, challenge) {
  if (!challenge) return [];
  if (challenge.type === 'MYSTERY') {
    if (!team.mysteryOrder) {
      team.mysteryOrder = MYSTERY_POOL.map((_, index) => ({
        index,
        key: crypto.createHash('sha256').update(`${team.id}:mystery:${index}`).digest('hex'),
      })).sort((a, b) => a.key.localeCompare(b.key)).map((item) => item.index);
    }
    const start = challenge.number < 9 ? 0 : 20;
    return team.mysteryOrder.slice(start, start + 20).map((index) => MYSTERY_POOL[index]);
  }
  const assignment = team.questionAssignments[challenge.id] ?? 0;
  return challenge.questionSets[assignment] || challenge.questionSets[0] || [];
}

function assignQuestionSet(team, challenge) {
  if (team.questionAssignments[challenge.id] !== undefined) return team.questionAssignments[challenge.id];
  if (challenge.type === 'MYSTERY') {
    assignedQuestions(team, challenge);
    team.questionAssignments[challenge.id] = 0;
    return 0;
  }
  const usage = Array.from({ length: challenge.questionSets.length }, () => 0);
  for (const otherTeam of teams.values()) {
    const assigned = otherTeam.questionAssignments?.[challenge.id];
    if (assigned !== undefined && assigned < usage.length) usage[assigned] += 1;
  }
  const lowestUsage = Math.min(...usage);
  const available = usage.map((count, index) => count === lowestUsage ? index : -1).filter((index) => index >= 0);
  const selected = available[crypto.randomInt(available.length)];
  team.questionAssignments[challenge.id] = selected;
  return selected;
}

function secondsOnMission(team) {
  if (!team.currentChallenge || !team.startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(team.startedAt).getTime()) / 1000));
}

function publicTeam(team) {
  const challenge = getTeamChallenge(team);
  const safeChallenge = publicChallenge(challenge);
  if (safeChallenge && team.currentChallenge === challenge.id) {
    const assignment = team.questionAssignments[challenge.id] ?? 0;
    if (challenge.type === 'MYSTERY') {
      safeChallenge.quizRound = challenge.number < 9 ? 1 : 2;
      safeChallenge.quizTotal = 20;
    } else {
      safeChallenge.questionSet = assignment + 1;
    }
    safeChallenge.questions = assignedQuestions(team, challenge).map(({ answer, ...question }) => question);
  }
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
    currentChallenge: safeChallenge,
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
    logic1: { checkpointType: 'logic', checkpointLabel: 'NORTH HALL' },
    logic2: { checkpointType: 'logic', checkpointLabel: 'EAST WING' },
    puzzle1: { checkpointType: 'puzzle', checkpointLabel: 'COURTYARD' },
    puzzle2: { checkpointType: 'puzzle', checkpointLabel: 'WEST STAIRS' },
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
    type: challenge.type.toLowerCase(),
    difficulty: challenge.type === 'CODING' ? 'hard' : 'medium',
    name: challenge.name,
    disabled: challenges.get(challenge.id).disabled,
    setCount: challenge.type === 'CODING' ? 5 : challenge.type === 'RIDDLE' ? 1 : challenge.type === 'MYSTERY' ? 'random per team' : QUESTION_SET_COUNT,
    questionsPerSet: challenge.type === 'MYSTERY' ? 20 : challenge.type === 'RIDDLE' ? 3 : challenge.type === 'CODING' ? 1 : 3,
    totalQuestions: challenge.type === 'MYSTERY' ? MYSTERY_POOL.length : challenge.type === 'RIDDLE' ? 3 : (challenge.type === 'CODING' ? 5 : QUESTION_SET_COUNT * 3),
    eventPoolQuestions: challenge.type === 'CODING' ? 10 : challenge.type === 'RIDDLE' ? RIDDLE_QUESTIONS.length : challenge.type === 'MYSTERY' ? MYSTERY_POOL.length : QUESTION_SET_COUNT * 3,
    eventPoolScope: challenge.type === 'RIDDLE' ? 'shared across both rounds' : challenge.type === 'MYSTERY' ? 'shared pool; randomized per team' : 'per round',
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
  challenges.set(id, { ...challenge, questionSets: makeQuestionSets(challenge), disabled: false });
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
    team.questionAssignments = {};
    team.mysteryOrder = null;
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
  team.questionAssignments = {};
  team.mysteryOrder = null;
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
  if (['PUZZLE', 'LOGIC'].includes(challenge.type)) {
    return res.status(409).json({ error: 'A checkpoint volunteer must unlock this clue.' });
  }
  if ((req.body.stationCode || '').trim().toUpperCase() !== challenge.stationCode) {
    return res.status(400).json({ error: `Wrong station. Scan the code at ${challenge.location}.` });
  }
  if (team.currentChallenge && team.startedAt) return res.json({ ok: true, team: publicTeam(team) });
  const stationTeams = [...teams.values()].filter((other) => getTeamChallenge(other)?.id === challenge.id && other.currentChallenge && other.startedAt);
  if (stationTeams.length >= (challenge.type === 'CODING' ? 5 : 10)) {
    return res.status(409).json({ error: `${challenge.station} is at capacity. Please wait for the next opening.` });
  }
  assignQuestionSet(team, challenge);
  team.currentChallenge = challenge.id;
  team.startedAt = new Date().toISOString();
  writeAudit('MISSION STARTED', `${team.id} unlocked ${challenge.name}`, team.id);
  res.json({ ok: true, team: publicTeam(team) });
});

app.post('/api/organizer/unlock', requireAuth, (req, res) => {
  if (!['organizer', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Organizer access required.' });
  const team = teams.get(String(req.body.teamId || '').trim().toUpperCase());
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const challenge = getTeamChallenge(team);
  if (!challenge || !['PUZZLE', 'LOGIC'].includes(challenge.type)) {
    return res.status(409).json({ error: 'This team is not waiting at a Puzzle or Logic checkpoint.' });
  }
  if (req.user.checkpointType && req.user.checkpointType !== challenge.type.toLowerCase()) {
    return res.status(403).json({ error: 'This team is assigned to another checkpoint type.' });
  }
  if (String(req.body.secretCode || '').trim().toUpperCase() !== challenge.volunteerCode) {
    return res.status(400).json({ error: 'That volunteer code is not valid for this checkpoint.' });
  }
  if (team.currentChallenge && team.startedAt) return res.json({ ok: true, team: publicTeam(team) });
  assignQuestionSet(team, challenge);
  team.currentChallenge = challenge.id;
  team.startedAt = new Date().toISOString();
  writeAudit('CLUE UNLOCKED', `${team.id} received the ${challenge.type.toLowerCase()} clue`, req.user.username);
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
  const submittedAnswers = Array.isArray(req.body.answers) ? req.body.answers : [req.body.answer];
  const expectedQuestions = assignedQuestions(team, challenge);
  const correctAnswers = expectedQuestions.reduce((count, question, index) => (
    count + (String(submittedAnswers[index] || '').trim().toLowerCase() === question.answer.toLowerCase() ? 1 : 0)
  ), 0);
  const isMysteryQuiz = challenge.type === 'MYSTERY';
  const quizComplete = isMysteryQuiz
    && submittedAnswers.length === expectedQuestions.length
    && expectedQuestions.every((_, index) => String(submittedAnswers[index] || '').trim().length > 0);
  const correct = !timedOut
    && (isMysteryQuiz ? quizComplete : submittedAnswers.length === expectedQuestions.length && correctAnswers === expectedQuestions.length);
  team.attempts += 1;
  if (!correct) {
    writeAudit('ANSWER MISSED', `${team.id} attempted ${challenge.name}`, team.id);
    return res.json({ ok: true, correct: false, timedOut, attempts: team.attempts, team: publicTeam(team) });
  }
  const earnedPoints = isMysteryQuiz
    ? Math.round((correctAnswers / expectedQuestions.length) * challenge.points)
    : Math.max(20, challenge.points - (team.attempts - 1) * 20);
  team.score += earnedPoints;
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
  res.json({ ok: true, correct: true, correctAnswers, totalQuestions: expectedQuestions.length, earnedPoints, score: team.score, team: publicTeam(team) });
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