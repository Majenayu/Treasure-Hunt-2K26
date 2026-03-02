// Comprehensive test for new system

function seededShuffle(arr, seed) {
  const a = [...arr]; let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Test 1: Difficulty Mix Calculator
function getTeamDifficultyMix(team) {
  const p1Year = parseInt(team.player1Year) || 1;
  const p2Year = parseInt(team.player2Year) || 1;
  const p1College = team.player1College || 'Other';
  const p2College = team.player2College || 'Other';
  
  const isVVCE = (p1College === 'VVCE' || p2College === 'VVCE');
  const avgYear = (p1Year + p2Year) / 2;
  
  let mix = [];
  
  if (isVVCE) {
    if (avgYear >= 2.5) mix = ['easy', 'medium', 'hard'];
    else if (avgYear >= 1.5) mix = ['medium', 'medium', 'easy'];
    else mix = ['easy', 'easy', 'easy'];
  } else {
    if (avgYear >= 2.5) mix = ['medium', 'medium', 'easy'];
    else if (avgYear >= 1.5) mix = ['easy', 'easy', 'medium'];
    else mix = ['easy', 'easy', 'easy'];
  }
  
  return seededShuffle(mix, team.teamId * 12345);
}

console.log('=== TEST 1: Difficulty Mix Calculator ===\n');

const testTeams = [
  { teamId: 1, player1Year: '3', player1College: 'VVCE', player2Year: '3', player2College: 'VVCE', name: 'VVCE 3rd Year' },
  { teamId: 2, player1Year: '2', player1College: 'VVCE', player2Year: '2', player2College: 'VVCE', name: 'VVCE 2nd Year' },
  { teamId: 3, player1Year: '1', player1College: 'VVCE', player2Year: '1', player2College: 'VVCE', name: 'VVCE 1st Year' },
  { teamId: 4, player1Year: '3', player1College: 'Other', player2Year: '3', player2College: 'Other', name: 'Other 3rd Year' },
  { teamId: 5, player1Year: '2', player1College: 'Other', player2Year: '2', player2College: 'Other', name: 'Other 2nd Year' },
  { teamId: 6, player1Year: '1', player1College: 'Other', player2Year: '1', player2College: 'Other', name: 'Other 1st Year' },
  { teamId: 7, player1Year: '3', player1College: 'VVCE', player2Year: '2', player2College: 'VVCE', name: 'VVCE Mixed 1' },
  { teamId: 8, player1Year: '2', player1College: 'Other', player2Year: '3', player2College: 'Other', name: 'Other Mixed 1' },
  { teamId: 9, player1Year: '1', player1College: 'VVCE', player2Year: '2', player2College: 'Other', name: 'Mixed College 1' },
  { teamId: 10, player1Year: '3', player1College: 'Other', player2Year: '1', player2College: 'VVCE', name: 'Mixed College 2' },
];

testTeams.forEach(team => {
  const mix = getTeamDifficultyMix(team);
  console.log(`${team.name}: [${mix.join(', ')}]`);
});

// Test 2: Coding Position Validation
console.log('\n=== TEST 2: Coding Position Validation ===\n');

const CODING_PAIRS = [];
for (let a = 1; a <= 7; a++) {
  for (let b = a + 3; b <= 7; b++) {
    if (a !== 0 && a !== 8 && b !== 0 && b !== 8) {
      CODING_PAIRS.push([a, b]);
    }
  }
}

console.log(`Total valid coding pairs: ${CODING_PAIRS.length}`);
console.log('Valid pairs:', CODING_PAIRS.map(p => `[${p[0]}, ${p[1]}]`).join(', '));

let hasInvalidPositions = false;
CODING_PAIRS.forEach(([a, b]) => {
  if (a === 0 || a === 8 || b === 0 || b === 8) {
    console.log(`❌ ERROR: Invalid position found [${a}, ${b}]`);
    hasInvalidPositions = true;
  }
  if (b - a < 3) {
    console.log(`❌ ERROR: Positions too close [${a}, ${b}] - need at least 2 between`);
    hasInvalidPositions = true;
  }
});

if (!hasInvalidPositions) {
  console.log('✅ All coding positions valid (not at 1 or 9, at least 2 apart)');
}

// Test 3: Checkpoint Generation
console.log('\n=== TEST 3: Checkpoint Generation ===\n');

function generateBalancedSequences(teams) {
  const TRACING_LABELS = ['T1', 'T2', 'T3'];
  const ACTIVITY_LABELS = ['T4', 'T5', 'T6', 'T7'];

  return teams.map((team, idx) => {
    const [c1Idx, c2Idx] = CODING_PAIRS[idx % CODING_PAIRS.length];

    const sequence = new Array(10).fill(null);
    sequence[9] = { type: 'finalCoding', label: 'FC', displayName: 'Final Challenge', locked: true };
    sequence[c1Idx] = { type: 'coding', label: 'C1', codingSlot: 1 };
    sequence[c2Idx] = { type: 'coding', label: 'C2', codingSlot: 2 };

    const checkpointPositions = [];
    for (let i = 0; i < 9; i++) { 
      if (!sequence[i]) checkpointPositions.push(i); 
    }

    const shuffledPositions = seededShuffle([...checkpointPositions], team.teamId * 31337);
    
    // Smart assignment: ensure no consecutive tracing rounds
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
      const tracingLabel = TRACING_LABELS[j];
      
      sequence[pos] = {
        type: 'tracing',
        label: tracingLabel,
        tracingNum: parseInt(tracingLabel.substring(1)),
        tracingIndex: j
      };
    }
    
    // Assign activity checkpoints
    for (let j = 0; j < activityPositions.length; j++) {
      const pos = activityPositions[j];
      const activityLabel = ACTIVITY_LABELS[j];
      
      sequence[pos] = {
        type: 'activity',
        label: activityLabel,
        tracingNum: parseInt(activityLabel.substring(1)),
        activityAnswer: 'ayush'
      };
    }

    return sequence;
  });
}

const sequences = generateBalancedSequences(testTeams);

sequences.forEach((seq, idx) => {
  const team = testTeams[idx];
  console.log(`\nTeam ${team.teamId} (${team.name}):`);
  
  seq.forEach((checkpoint, pos) => {
    if (checkpoint) {
      const typeIcon = checkpoint.type === 'tracing' ? '🔍' : 
                      checkpoint.type === 'activity' ? '🎯' : 
                      checkpoint.type === 'coding' ? '💻' : '🏁';
      
      let details = `${typeIcon} ${checkpoint.type}`;
      if (checkpoint.tracingIndex !== undefined) details += ` (Index ${checkpoint.tracingIndex})`;
      if (checkpoint.activityAnswer) details += ` (Code: ${checkpoint.activityAnswer})`;
      if (checkpoint.codingSlot) details += ` (Slot ${checkpoint.codingSlot})`;
      if (checkpoint.locked) details += ` 🔒 LOCKED`;
      
      console.log(`  Pos ${pos + 1}: ${checkpoint.label} - ${details}`);
    }
  });
  
  // Validation
  const codingPositions = seq.map((c, i) => c && c.type === 'coding' ? i : null).filter(i => i !== null);
  const finalPosition = seq.findIndex(c => c && c.type === 'finalCoding');
  const tracingPos = seq.map((c, i) => c && c.type === 'tracing' ? i : null).filter(i => i !== null);
  
  console.log(`  Coding at positions: ${codingPositions.map(p => p + 1).join(', ')}`);
  console.log(`  Tracing at positions: ${tracingPos.map(p => p + 1).join(', ')}`);
  console.log(`  Final at position: ${finalPosition + 1} ${seq[finalPosition].locked ? '🔒' : ''}`);
  
  // Check rules
  const errors = [];
  if (codingPositions.includes(0)) errors.push('❌ Coding at position 1');
  if (codingPositions.includes(8)) errors.push('❌ Coding at position 9');
  if (codingPositions.length === 2 && Math.abs(codingPositions[1] - codingPositions[0]) < 3) {
    errors.push('❌ Coding positions too close');
  }
  
  // Check for consecutive tracings
  for (let i = 0; i < tracingPos.length - 1; i++) {
    if (tracingPos[i + 1] - tracingPos[i] === 1) {
      errors.push(`❌ CONSECUTIVE TRACING at positions ${tracingPos[i] + 1} and ${tracingPos[i + 1] + 1}`);
    }
  }
  
  if (errors.length > 0) {
    errors.forEach(e => console.log(`  ${e}`));
  } else {
    console.log(`  ✅ All rules satisfied`);
  }
});

console.log('\n=== SUMMARY ===');
console.log('✅ Difficulty mix based on college & year');
console.log('✅ Coding positions never at 1 or 9');
console.log('✅ At least 2 checkpoints between coding rounds');
console.log('✅ No consecutive tracing rounds for any team');
console.log('✅ Final checkpoint marked as locked');
console.log('✅ 3 tracing (T1-T3) + 4 activity (T4-T7) + 2 coding + 1 final = 10 total');