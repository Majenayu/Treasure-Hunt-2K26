# CodeHunt Implementation Plan - New Requirements

## 1. Registration Changes
- Add `player1College` and `player2College` fields (VVCE or Other)
- Update registration form with college dropdowns
- Store college information in database

## 2. Difficulty Rules by College & Year

### VVCE Students:
- **3rd Year**: 1 Easy, 1 Medium, 1 Hard (tracing)
- **2nd Year**: 2 Medium, 1 Easy
- **1st Year**: 3 Easy

### Other College Students:
- **3rd Year**: 2 Medium, 1 Easy
- **2nd Year**: 2 Easy, 1 Medium
- **1st Year**: 3 Easy

## 3. Coding Questions
- No difficulty levels
- Use code "ayush" (changeable by admin per checkpoint)
- Store coding answer in checkpoint metadata like activity checkpoints

## 4. Checkpoint Generation Rules

### Constraints:
1. **10th checkpoint (Final)**: Inactive until first 9 completed
2. **Position 1 (index 0)**: Cannot be coding
3. **Position 9 (index 8)**: Cannot be coding
4. **Spacing**: At least 2 checkpoints between any two coding rounds
5. **No consecutive same types**: No tracing-tracing or coding-coding
6. **Load balancing**: 8-10 teams per checkpoint

### Valid Patterns:
- T-T-C-T-T-C-T-T-T-F (Tracing, Coding at positions 3 & 6)
- T-T-T-C-T-T-C-T-T-F (Coding at positions 4 & 7)
- etc.

## 5. Implementation Steps

### Step 1: Database Schema
```javascript
team: {
  player1College: 'VVCE' | 'Other',
  player2College: 'VVCE' | 'Other',
  // ... existing fields
}

checkpoint: {
  codingAnswer: 'ayush', // For C1, C2 checkpoints
  // ... existing fields
}
```

### Step 2: Difficulty Calculator
```javascript
function getTeamDifficultyMix(team) {
  // Based on college and year, return array like:
  // ['easy', 'medium', 'hard'] or ['easy', 'easy', 'medium']
}
```

### Step 3: Checkpoint Generator
```javascript
function generateBalancedSequences(teams) {
  // 1. Generate valid coding positions (not at 1 or 9, spaced by 2+)
  // 2. Assign 3 tracing + 4 activity to remaining positions
  // 3. Ensure load balancing (8-10 teams per checkpoint)
}
```

### Step 4: Question Assignment
```javascript
function assignQuestion(teamId, type, checkpointIndex) {
  if (type === 'tracing') {
    // Get difficulty mix for this team
    // Assign question based on which tracing checkpoint (1st, 2nd, or 3rd)
  }
  // Coding uses fixed answer from checkpoint metadata
}
```

## 6. Testing Requirements
- Test all college/year combinations
- Verify coding positions never at 1 or 9
- Verify spacing between coding rounds
- Verify load balancing
- Test difficulty assignment

## 7. UI Changes
- Registration form: Add college dropdowns
- Admin panel: Show college info in team list
- Checkpoint admin: Add coding answer field for C1, C2
