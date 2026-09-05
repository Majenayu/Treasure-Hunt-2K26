const express = require('express');
const compression = require('compression');
const crypto = require('crypto');
const path = require('path');
const QRCode = require('qrcode');

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
    name: 'Coding 1',
    type: 'CODING',
    icon: '⌘',
    station: 'SM BLOCK 310',
    stationCode: 'ORBIT-A',
    location: 'SM Block 310',
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
    name: 'Logical 1',
    type: 'LOGIC',
    icon: '◈',
    station: 'SPORTS COMPLEX',
    stationCode: 'NORTH-07',
    volunteerCode: 'NORTH-LOCK',
    location: 'Sports Complex',
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
    name: 'Puzzle',
    type: 'PUZZLE',
    icon: '✦',
    station: 'CCD',
    stationCode: 'GARDEN-03',
    volunteerCode: 'GARDEN-LOCK',
    location: 'CCD',
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
    name: 'Riddle 1',
    type: 'RIDDLE',
    icon: '?',
    station: 'RIDDLE QR',
    stationCode: 'ECHO-12',
    location: '',
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
    name: 'Quiz 1',
    type: 'MYSTERY',
    icon: '⚡',
    station: 'D BLOCK',
    stationCode: 'CURRENT-05',
    location: 'D Block',
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
    name: 'Coding 2',
    type: 'CODING',
    icon: '⌘',
    station: 'SM BLOCK 311',
    stationCode: 'ORBIT-B',
    location: 'SM Block 311',
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
    name: 'Logical 2',
    type: 'LOGIC',
    icon: '◈',
    station: 'KP GROUND',
    stationCode: 'GRID-22',
    volunteerCode: 'GRID-LOCK',
    location: 'KP Ground',
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
    name: 'Crossword',
    type: 'PUZZLE',
    icon: '✦',
    station: 'CANTEEN MANGALORE',
    stationCode: 'WEST-18',
    volunteerCode: 'WEST-LOCK',
    location: 'Canteen Mangalore',
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
    name: 'Riddle 2',
    type: 'RIDDLE',
    icon: '?',
    station: 'RIDDLE QR',
    stationCode: 'ROOF-09',
    location: '',
    color: 'violet',
    timeLimit: 0,
    points: 100,
    prompt: 'I have a neck but no head. What am I?',
    answer: 'bottle',
    hint: 'It can hold a drink.',
  },
  {
    id: 'mystery-02',
    number: 10,
    name: 'Quiz 2',
    type: 'MYSTERY',
    icon: '⚡',
    station: 'C BLOCK',
    stationCode: 'FINISH-10',
    location: 'C Block',
    color: 'sky',
    timeLimit: 0,
    points: 100,
    prompt: 'What belongs to you, but other people use it more than you do?',
    answer: 'name',
    hint: 'Someone says it when they want your attention.',
  },
];

const QUESTION_SET_COUNT = 10;
const LOGIC_SET_COUNT = 2;
const PUZZLE_SET_COUNT = 6;
const CODING_QUESTIONS = [
  {
    prompt: 'Q1 — The Missing Identification Number\nInput: 1 2 3 4 5 7 8 9 10\nOutput: 6\nWrite the program described and enter the output for the supplied input.',
    answer: '6',
  },
  {
    prompt: 'Q2 — The Final Champion\nInput: 45 82 61\nOutput: 82\nFind and enter the highest score.',
    answer: '82',
  },
  {
    prompt: 'Q3 — The Selective Attendance Register\nInput: 7 11 24 35 42 51 68 73\nOutput: 24 42 68\nEnter the even values in their original order.',
    answer: '24 42 68',
  },
  {
    prompt: 'Q4 — The Lost Registration Number\nInput: 5 10 25 17 42 31 42\nOutput: 3\nEnter the first index where the requested value is found.',
    answer: '3',
  },
  {
    prompt: 'Q5 — The Classroom Matrix\nInput: 2 3 10 20 30 5 15 25\nOutput: 105\nEnter the sum of all values in the matrix.',
    answer: '105',
  },
  {
    prompt: 'Q6 — The Duplicate Identity Check\nInput: RAHUL RAHUL\nOutput: MATCH\nEnter the result of comparing the two strings.',
    answer: 'MATCH',
  },
  {
    prompt: 'Q7 — The Modular Scoring Machine\nInput: 24 18\nOutput: 42\nEnter the value returned by the addition function.',
    answer: '42',
  },
  {
    prompt: 'Q8 — The Exchange Without Losing the Originals\nInput: 10 25\nOutput: 25 10\nEnter the two values after the pointer-based swap.',
    answer: '25 10',
  },
  {
    prompt: 'Q9 — The Complete Student Profile\nInput: 101 Arun CSE 45000\nOutput: 101 Arun CSE 45000\nEnter the formatted student record.',
    answer: '101 Arun CSE 45000',
  },
  {
    prompt: 'Q10 — The Symmetric Access Passcode\nInput: RADAR\nOutput: PALINDROME\nEnter the palindrome check result.',
    answer: 'PALINDROME',
  },
];
const LOGIC_QUESTIONS = [
  ['Complete: 2, 4, 8, 16, __', '32'],
  ['Complete: 3, 6, 11, 18, 27, __', '38'],
  ['If five machines make five parts in five minutes, how long do 100 machines need to make 100 parts?', '5'],
  ['A clock shows 3:15. What is the smaller angle between its hands?', '7.5'],
  ['A is older than B. B is older than C. Who is youngest?', 'C'],
  ['Complete: 1, 4, 9, 16, 25, __', '36'],
  ['A train travels 60 km in 1 hour. How far does it travel in 3 hours?', '180'],
  ['If today is Monday, what day is it 10 days from today?', 'Thursday'],
  ['A basket has 12 apples. Half are removed. How many remain?', '6'],
  ['Complete: 5, 10, 20, 40, __', '80'],
  ['Two fathers and two sons share three apples equally. How many people are there?', '3'],
  ['A room has four corners. One cat sits in each corner. How many cats are in the room?', '4'],
  ['If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops Lazzies?', 'yes'],
  ['A team scores 8 points in each of 6 rounds. What is the total?', '48'],
  ['Complete: 100, 90, 81, 73, __', '66'],
  ['A shirt costs 800 and is discounted by 25%. What is the sale price?', '600'],
  ['There are 24 students in 4 equal groups. How many students per group?', '6'],
  ['A number is greater than 20 and less than 30, and divisible by 3 and 4. What is it?', '24'],
  ['Complete: 1, 1, 2, 3, 5, 8, __', '13'],
  ['A farmer has chickens and cows: 10 heads and 28 legs. How many cows?', '4'],
  ['If 3 pencils cost 15, what do 8 pencils cost at the same rate?', '40'],
  ['A meeting starts at 10:20 and lasts 45 minutes. When does it end?', '11:05'],
  ['Complete: 7, 14, 28, 56, __', '112'],
  ['A box contains 3 red, 4 blue, and 5 green balls. How many balls total?', '12'],
  ['You face north, turn right, then turn around. Which direction do you face?', 'south'],
  ['A bus has 18 passengers. 7 leave and 4 enter. How many are on the bus?', '15'],
  ['Complete: 81, 27, 9, 3, __', '1'],
  ['A code has 4 digits, each can be 0 or 1. How many different codes are possible?', '16'],
  ['If 2 workers finish a job in 6 days, how many worker-days is the job?', '12'],
  ['A rectangle is 8 units long and 3 units wide. What is its area?', '24'],
].map(([prompt, answer]) => ({ prompt, answer }));
const PUZZLE_QUESTIONS = [
  ['What word becomes shorter when you add two letters to it?', 'short'],
  ['What can travel around the world while staying in one corner?', 'stamp'],
  ['What has keys but cannot open locks, space but no room, and you can enter but not go inside?', 'keyboard'],
  ['I speak without a mouth and hear without ears. What am I?', 'echo'],
  ['I get wetter the more I dry. What am I?', 'towel'],
  ['I have hands but cannot clap. What am I?', 'clock'],
  ['I have one eye but cannot see. What am I?', 'needle'],
  ['I have a neck but no head. What am I?', 'bottle'],
  ['I have a head and a tail but no body. What am I?', 'coin'],
  ['I have cities but no houses and rivers but no water. What am I?', 'map'],
  ['What word is spelled incorrectly in every dictionary?', 'incorrectly'],
  ['What begins with E, ends with E, but contains only one letter?', 'envelope'],
  ['What appears once in a minute, twice in a moment, and never in a thousand years?', 'm'],
  ['What has four legs in the morning, two at noon, and three in the evening?', 'human'],
  ['What can be cracked, made, told, and played?', 'joke'],
  ['Rearrange LISTEN to form a word meaning quiet.', 'silent'],
  ['What has a thumb and four fingers but is not alive?', 'glove'],
  ['What goes up but never comes down?', 'age'],
  ['What is full of holes but still holds water?', 'sponge'],
  ['What has a ring but no finger?', 'telephone'],
  ['What has a face and two hands but no arms or legs?', 'clock'],
  ['What is always in front of you but cannot be seen?', 'future'],
  ['What has branches but no fruit, trunk, or leaves?', 'bank'],
  ['What can you catch but not throw?', 'cold'],
  ['What is black when clean and white when dirty?', 'blackboard'],
  ['What has many teeth but cannot bite?', 'comb'],
  ['What runs but never walks and has a bed but never sleeps?', 'river'],
  ['What belongs to you but other people use it more than you do?', 'name'],
  ['What gets bigger the more you take away from it?', 'hole'],
  ['What has an eye but cannot see and is used for sewing?', 'needle'],
].map(([prompt, answer]) => ({ prompt, answer }));
const RIDDLE_QUESTIONS = [
  { prompt: 'I have hands but cannot clap. What am I?', answer: 'clock' },
  { prompt: 'I get wetter the more I dry. What am I?', answer: 'towel' },
  { prompt: 'I have one eye but cannot see. What am I?', answer: 'needle' },
  { prompt: 'I have a neck but no head. What am I?', answer: 'bottle' },
  { prompt: 'I can be cracked, made, told, and played. What am I?', answer: 'joke' },
  { prompt: 'I have cities but no houses and rivers but no water. What am I?', answer: 'map' },
];
const MYSTERY_QUIZ_SETS = [
  [
    ['What will be the output?\nint x = 5;\nx++;\nprintf("%d", x);', ['4', '5', '6', '7'], '6'],
    ['Which is the largest organ in the human body?', ['Liver', 'Brain', 'Skin', 'Lungs'], 'Skin'],
    ['In Avengers: Endgame, what does Tony Stark say before snapping his fingers?', ['Avengers, assemble!', 'I can do this all day', 'I am Iron Man', 'We are inevitable'], 'I am Iron Man'],
    ['What can run but never walks?', ['A car', 'A river', 'A dog', 'A person'], 'A river'],
    ['Which keyword is used to return a value from a function in C?', ['break', 'return', 'exit', 'continue'], 'return'],
    ['Which planet rotates in the opposite direction to most planets?', ['Mars', 'Jupiter', 'Venus', 'Mercury'], 'Venus'],
    ['Who is the only cricketer to have scored 100 international centuries?', ['Virat Kohli', 'Ricky Ponting', 'Sachin Tendulkar', 'Brian Lara'], 'Sachin Tendulkar'],
    ['What has an eye but cannot see?', ['A camera', 'A needle', 'A storm', 'A potato'], 'A needle'],
    ['Which of these is a Python list?', ['{1, 2, 3}', '(1, 2, 3)', '[1, 2, 3]', '<1, 2, 3>'], '[1, 2, 3]'],
    ["In 3 Idiots, what is Rancho's real name?", ['Raju Rastogi', 'Farhan Qureshi', 'Chatur Ramalingam', 'Phunsukh Wangdu'], 'Phunsukh Wangdu'],
    ['What is the hardest naturally occurring substance?', ['Iron', 'Diamond', 'Quartz', 'Graphite'], 'Diamond'],
    ['What is the output?\nfor i in range(3):\n    print(i)', ['1 2 3', '0 1 2', '0 1 2 3', '3 2 1'], '0 1 2'],
    ['Velcro was inspired by what?', ['Spider webs', 'Tree bark', 'Burrs sticking to animal fur', 'Fish scales'], 'Burrs sticking to animal fur'],
    ['Which loop in C is guaranteed to execute at least once?', ['for', 'while', 'do-while', 'nested loop'], 'do-while'],
    ['Which animal can have a tongue longer than its body?', ['Chameleon', 'Giraffe', 'Frog', 'Snake'], 'Chameleon'],
    ['What is the first index of an array in C?', ['0', '1', '-1', 'Depends on the array'], '0'],
    ['Which function is used in Python to find the length of a list or string?', ['count()', 'size()', 'length()', 'len()'], 'len()'],
    ['What does this print?\nprint("Python"[0])', ['P', 'y', 'Python', '0'], 'P'],
    ['Which keyword is commonly used for decision-making in Python?', ['when', 'if', 'check', 'decide'], 'if'],
    ['What data type is used to store a decimal number in C?', ['int', 'char', 'float', 'double'], 'float'],
  ],
  [
    ['What will be the output?\nint x = 5;\nx++;\nprintf("%d", x);', ['4', '5', '6', '7'], '6'],
    ['Which animal has three hearts?', ['Dolphin', 'Octopus', 'Shark', 'Whale'], 'Octopus'],
    ['In Avengers: Endgame, what does Tony Stark say before snapping his fingers?', ['Avengers, assemble!', 'I can do this all day', 'I am Iron Man', 'We are inevitable'], 'I am Iron Man'],
    ['Which planet rotates in the opposite direction to most planets?', ['Mars', 'Jupiter', 'Venus', 'Mercury'], 'Venus'],
    ['Which keyword is used to return a value from a function in C?', ['break', 'return', 'exit', 'continue'], 'return'],
    ['Who is the only cricketer to have scored 100 international centuries?', ['Virat Kohli', 'Ricky Ponting', 'Sachin Tendulkar', 'Brian Lara'], 'Sachin Tendulkar'],
    ['Which of these is a Python list?', ['{1, 2, 3}', '(1, 2, 3)', '[1, 2, 3]', '<1, 2, 3>'], '[1, 2, 3]'],
    ['Which is the largest organ in the human body?', ['Liver', 'Brain', 'Skin', 'Lungs'], 'Skin'],
    ['What can run but never walks?', ['A car', 'A river', 'A dog', 'A person'], 'A river'],
    ['Which loop in C is guaranteed to execute at least once?', ['for', 'while', 'do-while', 'nested loop'], 'do-while'],
    ["In 3 Idiots, what is Rancho's real name?", ['Raju Rastogi', 'Farhan Qureshi', 'Chatur Ramalingam', 'Phunsukh Wangdu'], 'Phunsukh Wangdu'],
    ['What is the hardest naturally occurring substance?', ['Iron', 'Diamond', 'Quartz', 'Graphite'], 'Diamond'],
    ['What does this print?\nprint("Python"[0])', ['P', 'y', 'Python', '0'], 'P'],
    ['Velcro was inspired by what?', ['Spider webs', 'Tree bark', 'Burrs sticking to animal fur', 'Fish scales'], 'Burrs sticking to animal fur'],
    ['What is the first index of an array in C?', ['0', '1', '-1', 'Depends on the array'], '0'],
    ['Which animal can have a tongue longer than its body?', ['Chameleon', 'Giraffe', 'Frog', 'Snake'], 'Chameleon'],
    ['Which function is used in Python to find the length of a list or string?', ['count()', 'size()', 'length()', 'len()'], 'len()'],
    ['What is the hardest naturally occurring substance?', ['Iron', 'Diamond', 'Quartz', 'Graphite'], 'Diamond'],
    ['Which keyword is commonly used for decision-making in Python?', ['when', 'if', 'check', 'decide'], 'if'],
    ['What has an eye but cannot see?', ['A camera', 'A needle', 'A storm', 'A potato'], 'A needle'],
  ],
].map((set, setIndex) => set.map(([prompt, options, answer], index) => ({
  id: `mystery-${setIndex + 1}-${index + 1}`,
  prompt,
  options,
  answer,
})));
const MYSTERY_POOL = MYSTERY_QUIZ_SETS.flat();

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
  if (challenge.type === 'CODING') {
    return [CODING_QUESTIONS];
  }
  if (challenge.type === 'RIDDLE') {
    const start = challenge.number < 9 ? 0 : 3;
    return [RIDDLE_QUESTIONS.slice(start, start + 3)];
  }
  if (challenge.type === 'MYSTERY') {
    return [challenge.number < 9 ? MYSTERY_QUIZ_SETS[0] : MYSTERY_QUIZ_SETS[1]];
  }
  if (challenge.type === 'LOGIC' || challenge.type === 'PUZZLE') {
    const bank = challenge.type === 'LOGIC' ? LOGIC_QUESTIONS : PUZZLE_QUESTIONS;
    const setCount = challenge.type === 'LOGIC' ? LOGIC_SET_COUNT : PUZZLE_SET_COUNT;
    return Array.from({ length: setCount }, (_, setIndex) => (
      Array.from({ length: 3 }, (_, questionIndex) => bank[(setIndex * 3 + questionIndex) % bank.length])
    ));
  }
  const setCount = QUESTION_SET_COUNT;
  return Array.from({ length: setCount }, (_, setIndex) => (
    Array.from({ length: 3 }, (_, questionIndex) => (
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
  status: 'PAUSED',
  startedAt: null,
  elapsedSeconds: 0,
  totalPausedSeconds: 0,
  pauseStartedAt: null,
};

function createTeam(teamId) {
  const teamNumber = teams.size + 1;
  // Rotating the route distributes starting stations while preserving the
  // separation between the two coding labs.
  const offset = (teamNumber * 2) % baseRoute.length;
  const route = baseRoute.slice(offset).concat(baseRoute.slice(0, offset));
  const team = {
    id: teamId,
    name: `Team ${teamId.replace(/^TEAM[-_]?/i, '') || teamId}`,
    route,
    currentIndex: 0,
    score: 0,
    attempts: 0,
    totalSeconds: 0,
    active: false,
    completedAt: null,
    currentChallenge: null,
    questionAssignments: {},
    mysteryProgress: {},
    mysteryCorrect: {},
    riddleProgress: {},
    riddleScanUnlocked: {},
    startedAt: null,
    startedPauseSeconds: 0,
    completedChallenges: [],
  };
  teams.set(teamId, team);
  return team;
}

app.use(compression());
app.use(express.json({ limit: '50mb' }));
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
  if (challenge.type === 'RIDDLE') {
    delete safeChallenge.location;
    delete safeChallenge.station;
  }
  return safeChallenge;
}

function publicQuestion(question) {
  if (!question) return null;
  const { answer, ...safeQuestion } = question;
  return safeQuestion;
}

function questionOptions(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(values.map((option) => String(option).trim()).filter(Boolean))];
}

function adminQuestionFrom(body = {}) {
  const prompt = String(body.prompt || '').trim();
  const answer = String(body.answer || '').trim();
  const options = questionOptions(body.options);
  if (!prompt) throw new Error('A question prompt is required.');
  if (!answer) throw new Error('An answer is required.');
  if (options.length && !options.some((option) => option.toLowerCase() === answer.toLowerCase())) {
    throw new Error('The answer must match one of the provided options.');
  }
  return options.length ? { prompt, options, answer } : { prompt, answer };
}

function nextChallengeNumber() {
  return challengeSeed.reduce((highest, challenge) => Math.max(highest, challenge.number), 0) + 1;
}

function addChallengeToTeamRoutes(id) {
  baseRoute.push(id);
  for (const team of teams.values()) team.route.push(id);
}

function createAdminChallenge(body = {}) {
  const number = nextChallengeNumber();
  const type = String(body.type || 'ACTIVITY').trim().toUpperCase();
  const allowedTypes = ['CODING', 'LOGIC', 'PUZZLE', 'RIDDLE', 'MYSTERY', 'ACTIVITY'];
  if (!allowedTypes.includes(type)) throw new Error('Choose a valid checkpoint type.');
  const question = adminQuestionFrom(body);
  const challenge = {
    id: `custom-${number}`,
    number,
    name: String(body.name || 'New mission').trim(),
    type,
    icon: '✦',
    station: String(body.station || 'NEW STATION').trim(),
    stationCode: String(body.stationCode || `NEW-${String(number).padStart(2, '0')}`).trim().toUpperCase(),
    location: String(body.location || 'To be announced').trim(),
    color: 'amber',
    timeLimit: Math.max(0, Number(body.timeLimit) || 0),
    points: Math.max(0, Number(body.points) || 100),
    prompt: question.prompt,
    answer: question.answer,
    hint: String(body.hint || 'Ask the mission controller.').trim(),
  };
  const questionSets = makeQuestionSets(challenge).map((set) => set.map((item, index) => index === 0 ? question : item));
  challengeSeed.push(challenge);
  challenges.set(challenge.id, { ...challenge, questionSets, disabled: false });
  addChallengeToTeamRoutes(challenge.id);
  return challenge;
}

function getTeamChallenge(team) {
  if (!team || team.currentIndex >= team.route.length) return null;
  return challenges.get(team.route[team.currentIndex]);
}

function assignedQuestions(team, challenge) {
  if (!challenge) return [];
  if (challenge.type === 'MYSTERY') {
    const quizSet = challenge.questionSets[0] || [];
    const progress = team.mysteryProgress?.[challenge.id] || 0;
    return quizSet.slice(progress, progress + 1);
  }
  if (challenge.type === 'CODING') {
    const questionIndex = team.questionAssignments[challenge.id] ?? 0;
    const question = challenge.questionSets[0]?.[questionIndex];
    return question ? [question] : [];
  }
  const assignment = team.questionAssignments[challenge.id] ?? 0;
  if (challenge.type === 'RIDDLE') {
    if (!team.riddleScanUnlocked?.[challenge.id]) return [];
    const riddles = challenge.questionSets[0] || [];
    const step = Math.min(team.riddleProgress?.[challenge.id] || 0, Math.max(0, riddles.length - 1));
    return riddles[step] ? [riddles[step]] : [];
  }
  return challenge.questionSets[assignment] || challenge.questionSets[0] || [];
}

function assignQuestionSet(team, challenge) {
  if (team.questionAssignments[challenge.id] !== undefined) return team.questionAssignments[challenge.id];
  if (challenge.type === 'MYSTERY') {
    assignedQuestions(team, challenge);
    team.questionAssignments[challenge.id] = 0;
    return 0;
  }
  const assignmentCount = challenge.type === 'CODING'
    ? challenge.questionSets[0]?.length || 1
    : challenge.questionSets.length;
  const usage = Array.from({ length: assignmentCount }, () => 0);
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

function activePausedSeconds() {
  return state.totalPausedSeconds + (state.pauseStartedAt ? Math.max(0, Date.now() - new Date(state.pauseStartedAt).getTime()) / 1000 : 0);
}

function eventElapsedSeconds() {
  if (!state.startedAt) return Math.max(0, Math.floor(state.elapsedSeconds));
  return Math.max(0, Math.floor(state.elapsedSeconds + (Date.now() - new Date(state.startedAt).getTime()) / 1000));
}

function secondsOnMission(team) {
  if (!team.currentChallenge || !team.startedAt) return 0;
  const wallSeconds = (Date.now() - new Date(team.startedAt).getTime()) / 1000;
  const pausedSeconds = Math.max(0, activePausedSeconds() - (team.startedPauseSeconds || 0));
  return Math.max(0, Math.floor(wallSeconds - pausedSeconds));
}

function unlockRiddle(team, challenge) {
  if (!team || !challenge || challenge.type !== 'RIDDLE' || state.status !== 'LIVE') return;
  assignQuestionSet(team, challenge);
  team.currentChallenge = challenge.id;
  team.startedAt = new Date().toISOString();
  team.startedPauseSeconds = state.totalPausedSeconds;
  team.riddleScanUnlocked[challenge.id] = true;
  writeAudit('RIDDLE SCANNED', `${team.id} unlocked ${challenge.name} pass ${(team.riddleProgress?.[challenge.id] || 0) + 1}`, team.id);
}

function publicTeam(team) {
  const challenge = getTeamChallenge(team);
  const safeChallenge = publicChallenge(challenge);
  const missionStarted = Boolean(safeChallenge && team.currentChallenge === challenge.id && team.startedAt);
  if (safeChallenge?.type === 'RIDDLE') {
    safeChallenge.riddleStep = (team.riddleProgress?.[challenge.id] || 0) + 1;
    safeChallenge.riddleTotal = challenge.questionSets[0]?.length || 3;
    safeChallenge.riddleScanRequired = !team.riddleScanUnlocked?.[challenge.id];
  }
  if (missionStarted) {
    const assignment = team.questionAssignments[challenge.id] ?? 0;
    if (challenge.type === 'MYSTERY') {
      safeChallenge.quizRound = challenge.number < 9 ? 1 : 2;
      safeChallenge.quizTotal = 20;
      safeChallenge.quizQuestion = (team.mysteryProgress?.[challenge.id] || 0) + 1;
    } else {
      safeChallenge.questionSet = assignment + 1;
    }
    safeChallenge.questions = ['LOGIC', 'PUZZLE'].includes(challenge.type)
      ? []
      : assignedQuestions(team, challenge).map(({ answer, ...question }) => question);
  }
  return {
    id: team.id,
    name: team.name,
    score: team.score,
    totalSeconds: team.totalSeconds,
    currentIndex: team.currentIndex,
    completed: team.completedChallenges.length,
    totalMissions: team.route.length,
    active: team.active,
    completedAt: team.completedAt,
    currentChallenge: safeChallenge,
    missionStarted,
    missionStartedAt: team.startedAt,
    missionSeconds: secondsOnMission(team),
  };
}

function completeChallenge(team, challenge, elapsed, earnedPoints) {
  team.score += earnedPoints;
  team.totalSeconds += elapsed;
  team.completedChallenges.push({ id: challenge.id, seconds: elapsed, at: new Date().toISOString() });
  team.currentIndex += 1;
  team.currentChallenge = null;
  team.startedAt = null;
  team.startedPauseSeconds = 0;
  team.attempts = 0;
  if (team.currentIndex >= team.route.length) {
    team.completedAt = new Date().toISOString();
    team.active = false;
  }
}

function leaderboard() {
  return [...teams.values()]
    .sort((a, b) => b.score - a.score || a.totalSeconds - b.totalSeconds)
    .map((team, index) => ({
      rank: index + 1,
      id: team.id,
      name: team.name,
      score: team.score,
      completed: team.completedChallenges.length,
      totalMissions: team.route.length,
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
    eventElapsedSeconds: eventElapsedSeconds(),
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
      color: challenge.color,
    })),
    challenges: challengeSeed.map((challenge) => ({
      ...publicChallenge(challenges.get(challenge.id)),
      activeTeams: activeMissions.filter((team) => getTeamChallenge(team)?.id === challenge.id).length,
    })),
    activity: auditLog.slice(0, 8),
  };
}

app.post('/api/login', (req, res) => {
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
    coding1: { checkpointType: 'coding', checkpointId: 'C1', checkpointLabel: 'SM BLOCK 310' },
    coding2: { checkpointType: 'coding', checkpointId: 'C2', checkpointLabel: 'SM BLOCK 311' },
    logic1: { checkpointType: 'logic', checkpointId: 'L1', checkpointLabel: 'SPORTS COMPLEX' },
    logic2: { checkpointType: 'logic', checkpointId: 'L2', checkpointLabel: 'KP GROUND' },
    puzzle1: { checkpointType: 'puzzle', checkpointId: 'P1', checkpointLabel: 'CCD' },
    puzzle2: { checkpointType: 'puzzle', checkpointId: 'P2', checkpointLabel: 'CANTEEN MANGALORE' },
    mystery1: { checkpointType: 'mystery', checkpointId: 'M1', checkpointLabel: 'D BLOCK' },
    mystery2: { checkpointType: 'mystery', checkpointId: 'M2', checkpointLabel: 'C BLOCK' },
    activity1: { checkpointType: 'activity', checkpointId: 'A1', checkpointLabel: 'T4' },
    activity2: { checkpointType: 'activity', checkpointId: 'A2', checkpointLabel: 'T5' },
    activity3: { checkpointType: 'activity', checkpointId: 'A3', checkpointLabel: 'T6' },
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
  if (!/^TEAM[-_][A-Z0-9_-]{1,48}$/.test(teamId)) {
    return res.status(400).json({ error: 'Use a team code such as TEAM-01.' });
  }
  if (password && password !== TEAM_PASSWORD) {
    return res.status(401).json({ error: 'That team password is not recognised.' });
  }
  const team = teams.get(teamId) || createTeam(teamId);
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
    elapsedSeconds: eventElapsedSeconds(),
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
  const rounds = challengeSeed.map((challenge) => {
    const stored = challenges.get(challenge.id);
    return {
    _id: challenge.id,
    questionNumber: challenge.number,
    code: challenge.stationCode,
    type: challenge.type.toLowerCase(),
    difficulty: challenge.type === 'CODING' ? 'hard' : 'medium',
    name: challenge.name,
    disabled: challenges.get(challenge.id).disabled,
    setCount: challenge.type === 'CODING' ? 1 : challenge.type === 'RIDDLE' ? 1 : challenge.type === 'MYSTERY' ? 1 : challenge.type === 'LOGIC' ? LOGIC_SET_COUNT : challenge.type === 'PUZZLE' ? PUZZLE_SET_COUNT : QUESTION_SET_COUNT,
    questionsPerSet: challenge.type === 'MYSTERY' ? 20 : challenge.type === 'RIDDLE' ? 3 : challenge.type === 'CODING' ? 10 : 3,
    totalQuestions: challenge.type === 'MYSTERY' ? 20 : challenge.type === 'RIDDLE' ? 3 : challenge.type === 'CODING' ? 10 : (challenge.type === 'LOGIC' ? LOGIC_SET_COUNT : challenge.type === 'PUZZLE' ? PUZZLE_SET_COUNT : QUESTION_SET_COUNT) * 3,
    eventPoolQuestions: challenge.type === 'CODING' ? 10 : challenge.type === 'RIDDLE' ? RIDDLE_QUESTIONS.length : challenge.type === 'MYSTERY' ? MYSTERY_POOL.length : (challenge.type === 'LOGIC' ? LOGIC_SET_COUNT : challenge.type === 'PUZZLE' ? PUZZLE_SET_COUNT : QUESTION_SET_COUNT) * 3,
    eventPoolScope: challenge.type === 'RIDDLE' ? 'shared across both rounds' : challenge.type === 'MYSTERY' ? 'uploaded Set 1 or Set 2; sequential per team' : challenge.type === 'CODING' ? 'shared 10-question pool; one serial per team' : 'per checkpoint',
    sets: stored.questionSets.map((set, setIndex) => ({
      setNumber: setIndex + 1,
      questions: set.map(publicQuestion),
    })),
  };
  });
  res.json({
    rounds,
    plan: {
      coding: { total: 10, roundOne: 10, roundTwo: 10, perTeam: 1, mode: 'shared pool · one serial per team' },
      riddles: { total: 6, roundOne: 3, roundTwo: 3, perTeam: 3, mode: 'fixed order · no mixing' },
      puzzles: { total: 36, setsPerRound: 6, questionsPerSet: 3, perTeam: 0, mode: 'assigned set · volunteer score' },
      logic: { total: 12, setsPerRound: 2, questionsPerSet: 3, perTeam: 0, mode: 'assigned set · volunteer score' },
      mystery: { total: 40, roundOne: 20, roundTwo: 20, perTeam: 20, mode: 'uploaded set · one at a time' },
    },
  });
});

app.post('/api/admin/questions', requireAuth, requireAdmin, (req, res) => {
  try {
    const challenge = createAdminChallenge(req.body);
    writeAudit('MISSION ADDED', `${challenge.name} added to the route`);
    res.status(201).json(publicChallenge(challenge));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/admin/questions/:id', requireAuth, requireAdmin, (req, res) => {
  const stored = challenges.get(req.params.id);
  if (!stored) return res.status(404).json({ error: 'Mission not found.' });
  const setIndex = Number(req.body.setIndex);
  const questionIndex = Number(req.body.questionIndex);
  const current = stored.questionSets[setIndex]?.[questionIndex];
  if (!current) return res.status(404).json({ error: 'Question item not found.' });
  const prompt = String(req.body.prompt || '').trim();
  const options = questionOptions(req.body.options);
  if (!prompt) return res.status(400).json({ error: 'A question prompt is required.' });
  const answer = String(req.body.answer || '').trim() || current.answer;
  if (options.length && !options.some((option) => option.toLowerCase() === answer.toLowerCase())) {
    return res.status(400).json({ error: 'The answer must match one of the provided options.' });
  }
  stored.questionSets[setIndex][questionIndex] = options.length ? { prompt, options, answer } : { prompt, answer };
  if (setIndex === 0 && questionIndex === 0) {
    stored.prompt = prompt;
    stored.answer = answer;
    const seed = challengeSeed.find((challenge) => challenge.id === stored.id);
    if (seed) {
      seed.prompt = prompt;
      seed.answer = answer;
    }
  }
  writeAudit('QUESTION UPDATED', `${stored.name} · set ${setIndex + 1}, question ${questionIndex + 1}`);
  res.json({ ok: true, question: publicQuestion(stored.questionSets[setIndex][questionIndex]) });
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
    id: challenge.id,
    number: challenge.number,
    label: challenge.station,
    name: challenge.name,
    locationHint: challenge.location,
    type: challenge.type.toLowerCase(),
    stationCode: challenge.stationCode,
    disabled: challenges.get(challenge.id).disabled,
  })));
});

app.post('/api/admin/checkpoints', requireAuth, requireAdmin, (req, res) => {
  try {
    const challenge = createAdminChallenge({
      ...req.body,
      name: req.body?.name || 'New checkpoint',
      location: req.body?.locationHint || 'To be announced',
      station: req.body?.station || 'NEW STATION',
      stationCode: req.body?.stationCode,
      type: req.body?.type || 'ACTIVITY',
      prompt: req.body?.prompt || 'Reach this checkpoint and complete the mission.',
      answer: req.body?.answer || 'complete',
      hint: req.body?.hint || 'Ask the mission controller.',
    });
    writeAudit('LOCATION ADDED', `${challenge.name} · ${challenge.location}`);
    res.status(201).json({ ok: true, checkpoint: challenge });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/admin/checkpoints/:number', requireAuth, requireAdmin, (req, res) => {
  const challenge = challengeSeed.find((item) => item.number === Number(req.params.number));
  if (!challenge) return res.status(404).json({ error: 'Checkpoint not found.' });
  const stored = challenges.get(challenge.id);
  const name = String(req.body.name || '').trim();
  const station = String(req.body.station || '').trim();
  const stationCode = String(req.body.stationCode || '').trim().toUpperCase();
  const locationHint = String(req.body.locationHint || '').trim();
  if (!name || !station || !stationCode || !locationHint) {
    return res.status(400).json({ error: 'Name, station, code, and location are required.' });
  }
  Object.assign(challenge, { name, station, stationCode, location: locationHint });
  Object.assign(stored, { name, station, stationCode, location: locationHint });
  writeAudit('LOCATION UPDATED', `${challenge.name} · ${challenge.location}`);
  res.json({ ok: true, checkpoint: { id: challenge.id, number: challenge.number, label: challenge.station, name: challenge.name, locationHint: challenge.location, stationCode: challenge.stationCode, type: challenge.type.toLowerCase() } });
});

app.get('/api/admin/progress', requireAuth, requireAdmin, (req, res) => {
  res.json(leaderboard().map((entry) => ({
    ...entry,
    currentMission: teams.get(entry.id) ? publicChallenge(getTeamChallenge(teams.get(entry.id)))?.name || 'Finished' : '—',
  })));
});

app.post('/api/admin/event', requireAuth, requireAdmin, (req, res) => {
  if (state.status === 'LIVE') {
    state.elapsedSeconds = eventElapsedSeconds();
    state.startedAt = null;
    state.pauseStartedAt = new Date();
    state.status = 'PAUSED';
  } else {
    if (state.pauseStartedAt) state.totalPausedSeconds += Math.max(0, Date.now() - new Date(state.pauseStartedAt).getTime()) / 1000;
    state.startedAt = new Date();
    state.pauseStartedAt = null;
    state.status = 'LIVE';
  }
  writeAudit(state.status === 'LIVE' ? 'EVENT RESUMED' : 'EVENT PAUSED', `Circuit is now ${state.status.toLowerCase()}`);
  res.json({ ok: true, status: state.status, elapsedSeconds: eventElapsedSeconds() });
});

app.post('/api/admin/start-event', requireAuth, requireAdmin, (req, res) => {
  state.status = 'LIVE';
  if (state.pauseStartedAt) state.totalPausedSeconds += Math.max(0, Date.now() - new Date(state.pauseStartedAt).getTime()) / 1000;
  if (!state.startedAt) state.startedAt = new Date();
  state.pauseStartedAt = null;
  writeAudit('EVENT STARTED', 'The Orange Circuit is live');
  res.json({ ok: true, started: true, elapsedSeconds: eventElapsedSeconds() });
});

app.post('/api/admin/reset-event', requireAuth, requireAdmin, (req, res) => {
  for (const team of teams.values()) {
    team.currentIndex = 0; team.score = 0; team.attempts = 0; team.totalSeconds = 0;
    team.active = false; team.completedAt = null; team.currentChallenge = null;
    team.startedAt = null; team.completedChallenges = [];
    team.questionAssignments = {};
    team.riddleProgress = {};
    team.riddleScanUnlocked = {};
    team.startedPauseSeconds = 0;
    team.mysteryProgress = {};
    team.mysteryCorrect = {};
  }
  state.status = 'PAUSED';
  state.startedAt = null;
  state.elapsedSeconds = 0;
  state.totalPausedSeconds = 0;
  state.pauseStartedAt = null;
  writeAudit('EVENT RESET', 'All team progress was cleared');
  res.json({ ok: true });
});

app.post('/api/admin/toggle-round', requireAuth, requireAdmin, (req, res) => {
  if (state.status === 'LIVE') {
    state.elapsedSeconds = eventElapsedSeconds();
    state.startedAt = null;
    state.pauseStartedAt = new Date();
    state.status = 'PAUSED';
  } else {
    if (state.pauseStartedAt) state.totalPausedSeconds += Math.max(0, Date.now() - new Date(state.pauseStartedAt).getTime()) / 1000;
    state.startedAt = new Date();
    state.pauseStartedAt = null;
    state.status = 'LIVE';
  }
  writeAudit(state.status === 'LIVE' ? 'ROUND RESUMED' : 'ROUND PAUSED', `Round is now ${state.status.toLowerCase()}`);
  res.json({ ok: true, roundPaused: state.status === 'PAUSED', elapsedSeconds: eventElapsedSeconds() });
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
  team.startedPauseSeconds = 0;
  team.completedChallenges = [];
  team.questionAssignments = {};
  team.riddleProgress = {};
  team.riddleScanUnlocked = {};
  team.mysteryProgress = {};
  team.mysteryCorrect = {};
  writeAudit('TEAM RESET', `${team.id} progress cleared`);
  res.json({ ok: true, team: publicTeam(team) });
});

app.get('/api/team/state', requireAuth, (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Team access required.' });
  const team = teams.get(req.user.teamId);
  res.json({ team: publicTeam(team), leaderboard: leaderboard().slice(0, 5), event: state });
});

app.get('/api/riddle-qr/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Team access required.' });
  const challenge = challenges.get(req.params.id);
  if (!challenge || challenge.type !== 'RIDDLE') return res.status(404).json({ error: 'Riddle QR not found.' });
  try {
    const dataUrl = await QRCode.toDataURL(challenge.stationCode, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 220,
    });
    res.json({ stationCode: challenge.stationCode, dataUrl });
  } catch (_) {
    res.status(500).json({ error: 'Unable to prepare the riddle QR.' });
  }
});

app.post('/api/team/start', requireAuth, (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ error: 'Team access required.' });
  if (state.status !== 'LIVE') return res.status(409).json({ error: 'The circuit is currently paused.' });
  const team = teams.get(req.user.teamId);
  const challenge = getTeamChallenge(team);
  if (!challenge) return res.status(409).json({ error: 'Your circuit is complete.' });
  if (challenge.disabled) return res.status(409).json({ error: 'This station is temporarily offline.' });
  if (challenge.type === 'RIDDLE') {
    if (team.riddleScanUnlocked?.[challenge.id]) return res.json({ ok: true, team: publicTeam(team) });
    if ((req.body.stationCode || '').trim().toUpperCase() !== challenge.stationCode) {
      return res.status(400).json({ error: 'Wrong QR code. Scan the riddle QR at this checkpoint.' });
    }
    unlockRiddle(team, challenge);
    return res.json({ ok: true, team: publicTeam(team) });
  }
  if (['CODING', 'LOGIC', 'PUZZLE', 'MYSTERY'].includes(challenge.type)) {
    return res.status(409).json({ error: 'A location volunteer must verify your team before this mission starts.' });
  }
  if ((req.body.stationCode || '').trim().toUpperCase() !== challenge.stationCode) {
    const scanTarget = challenge.type === 'RIDDLE' ? 'the partial riddle QR code' : `the code at ${challenge.location}`;
    return res.status(400).json({ error: `Wrong scan. Scan ${scanTarget}.` });
  }
  if (team.currentChallenge && team.startedAt) return res.json({ ok: true, team: publicTeam(team) });
  assignQuestionSet(team, challenge);
  team.currentChallenge = challenge.id;
  team.startedAt = new Date().toISOString();
  team.startedPauseSeconds = state.totalPausedSeconds;
  writeAudit('MISSION STARTED', `${team.id} unlocked ${challenge.name}`, team.id);
  res.json({ ok: true, team: publicTeam(team) });
});

app.post('/api/organizer/verify', requireAuth, (req, res) => {
  if (!['organizer', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Organizer access required.' });
  if (state.status !== 'LIVE') return res.status(409).json({ error: 'The circuit is currently paused.' });
  const team = teams.get(String(req.body.teamId || '').trim().toUpperCase());
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const challenge = getTeamChallenge(team);
  if (!challenge || !['CODING', 'LOGIC', 'PUZZLE', 'MYSTERY'].includes(challenge.type)) {
    return res.status(409).json({ error: 'This team is not waiting at a volunteer checkpoint.' });
  }
  if (req.user.checkpointType && req.user.checkpointType !== challenge.type.toLowerCase()) {
    return res.status(403).json({ error: 'This team is assigned to another checkpoint type.' });
  }
  if (req.user.checkpointLabel && req.user.checkpointLabel !== challenge.station) {
    return res.status(403).json({ error: 'This team is assigned to another location.' });
  }
  if (team.currentChallenge && team.startedAt) return res.json({ ok: true, team: publicTeam(team) });
  assignQuestionSet(team, challenge);
  team.currentChallenge = challenge.id;
  team.startedAt = new Date().toISOString();
  team.startedPauseSeconds = state.totalPausedSeconds;
  writeAudit('TEAM VERIFIED', `${team.id} verified at ${challenge.station} for ${challenge.type.toLowerCase()}`, req.user.username);
  res.json({ ok: true, team: publicTeam(team) });
});

app.post('/api/organizer/score', requireAuth, (req, res) => {
  if (!['organizer', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Organizer access required.' });
  const team = teams.get(String(req.body.teamId || '').trim().toUpperCase());
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const challenge = getTeamChallenge(team);
  if (!challenge || !['PUZZLE', 'LOGIC'].includes(challenge.type) || team.currentChallenge !== challenge.id || !team.startedAt) {
    return res.status(409).json({ error: 'Verify this team before recording a Logic or Puzzle score.' });
  }
  if (req.user.checkpointType && req.user.checkpointType !== challenge.type.toLowerCase()) {
    return res.status(403).json({ error: 'This team is assigned to another checkpoint type.' });
  }
  if (req.user.checkpointLabel && req.user.checkpointLabel !== challenge.station) {
    return res.status(403).json({ error: 'This team is assigned to another location.' });
  }
  const scoreText = String(req.body.score ?? '').trim();
  const match = scoreText.match(/^(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*(\d+(?:\.\d+)?)?$/i);
  const score = Number(match ? match[1] : scoreText);
  const maxScore = Number(req.body.maxScore || (match && match[2]) || 10);
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) {
    return res.status(400).json({ error: 'Enter a score from 0 to the maximum, such as 6/10.' });
  }
  const elapsed = secondsOnMission(team);
  const earnedPoints = Math.round((score / maxScore) * challenge.points);
  completeChallenge(team, challenge, elapsed, earnedPoints);
  writeAudit('MISSION SCORED', `${team.id} scored ${score}/${maxScore} at ${challenge.station}`, req.user.username);
  res.json({ ok: true, score, maxScore, earnedPoints, team: publicTeam(team) });
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
  if (challenge.type === 'RIDDLE' && !team.riddleScanUnlocked?.[challenge.id]) {
    return res.status(409).json({ error: 'Scan the QR code to unlock this riddle pass.' });
  }
  if (challenge.type === 'MYSTERY') {
    const answer = String(submittedAnswers[0] || '').trim();
    if (!answer || !expectedQuestions[0]) {
      return res.json({ ok: true, quizAwaitingAnswer: true, team: publicTeam(team) });
    }
    const progress = team.mysteryProgress?.[challenge.id] || 0;
    const correct = answer.toLowerCase() === expectedQuestions[0].answer.toLowerCase();
    team.mysteryProgress[challenge.id] = progress + 1;
    team.mysteryCorrect[challenge.id] = (team.mysteryCorrect[challenge.id] || 0) + (correct ? 1 : 0);
    const totalQuestions = MYSTERY_QUIZ_SETS[challenge.number < 9 ? 0 : 1].length;
    if (progress + 1 < totalQuestions) {
      return res.json({ ok: true, quizAdvanced: true, quizQuestion: progress + 2, quizTotal: totalQuestions, team: publicTeam(team) });
    }
    const earnedPoints = Math.round(((team.mysteryCorrect[challenge.id] || 0) / totalQuestions) * challenge.points);
    completeChallenge(team, challenge, elapsed, earnedPoints);
    writeAudit('QUIZ COMPLETED', `${team.id} completed ${challenge.name}`, team.id);
    return res.json({ ok: true, quizComplete: true, team: publicTeam(team) });
  }
  if (timedOut && challenge.timeLimit > 0) {
    const earnedPoints = Math.round(challenge.points * 0.2);
    completeChallenge(team, challenge, elapsed, earnedPoints);
    writeAudit('MISSION TIMED OUT', `${team.id} received 20% for ${challenge.name}`, team.id);
    return res.json({ ok: true, correct: false, timedOut: true, completed: true, earnedPoints, score: team.score, team: publicTeam(team) });
  }
  const correctAnswers = expectedQuestions.reduce((count, question, index) => (
    count + (String(submittedAnswers[index] || '').trim().toLowerCase() === question.answer.toLowerCase() ? 1 : 0)
  ), 0);
  const correct = !timedOut
    && submittedAnswers.length === expectedQuestions.length && correctAnswers === expectedQuestions.length;
  if (!correct) {
    writeAudit('ANSWER MISSED', `${team.id} attempted ${challenge.name}`, team.id);
    return res.json({ ok: true, correct: false, timedOut: false, team: publicTeam(team) });
  }
  if (challenge.type === 'RIDDLE') {
    const step = team.riddleProgress?.[challenge.id] || 0;
    const total = challenge.questionSets[0]?.length || 3;
    if (step + 1 < total) {
      team.riddleProgress[challenge.id] = step + 1;
      team.riddleScanUnlocked[challenge.id] = false;
      writeAudit('RIDDLE PASSED', `${team.id} passed riddle ${step + 1}/${total}`, team.id);
      return res.json({ ok: true, correct: true, riddleAdvanced: true, riddleStep: step + 2, riddleTotal: total, team: publicTeam(team) });
    }
  }
  const earnedPoints = challenge.points;
  completeChallenge(team, challenge, elapsed, earnedPoints);
  writeAudit('MISSION CLEARED', `${team.id} completed ${challenge.name}`, team.id);
  res.json({ ok: true, correct: true, correctAnswers, totalQuestions: expectedQuestions.length, earnedPoints, score: team.score, team: publicTeam(team) });
});

app.get('/api/organizer/checkpoint-teams', requireAuth, (req, res) => {
  if (!['organizer', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Organizer access required.' });
  const station = req.user.checkpointLabel;
  const rows = [...teams.values()]
    .filter((team) => {
      const challenge = getTeamChallenge(team);
      return team.active && challenge
        && (!req.user.checkpointType || challenge.type.toLowerCase() === req.user.checkpointType)
        && (!station || challenge.station === station);
    })
    .map((team) => ({ ...publicTeam(team), checkpointId: req.user.checkpointId || 'ALL', checkpointLabel: station || 'ALL' }));
  res.json({ checkpointId: req.user.checkpointId || 'ALL', checkpointLabel: station || 'ALL', teams: rows });
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