# CodeHunt 2k26 - Points System Explanation

## Overview
The leaderboard is based on **totalPoints** accumulated by each team. Teams earn points by completing different types of checkpoints, with time-based scoring that rewards speed.

---

## Checkpoint Types & Point Values

### 1. **Tracing Rounds (T1, T2, T3)**
**Maximum Points: 200 per round**

**Scoring Logic:**
- **≤ 2 minutes**: Full 200 points
- **2-5 minutes**: Lose 10 points per minute over 2 minutes
  - 3 minutes = 190 points (200 - 10)
  - 4 minutes = 180 points (200 - 20)
  - 5 minutes = 170 points (200 - 30)
- **> 5 minutes**: Lose 5 points per minute after 5 minutes
  - 6 minutes = 165 points (200 - 30 - 5)
  - 7 minutes = 160 points (200 - 30 - 10)
  - 8 minutes = 155 points (200 - 30 - 15)
  - And so on...
- **Minimum**: 0 points (never negative)

**Timer Behavior:**
- Timer **auto-starts** when the clue/location is first revealed
- Time is tracked continuously until correct answer is submitted

---

### 2. **Activity Checkpoints (T4, T5, T6, T7)**
**Maximum Points: 200 per checkpoint**

**Scoring Logic:**
- Uses the **same formula as Tracing** (calcTracingPoints)
- ≤ 2 minutes = 200 points
- Same deduction tiers as tracing

**Timer Behavior:**
- Timer **auto-starts** when location is revealed
- Teams must reach the physical location and get the code from volunteers
- Submit the code to complete

---

### 3. **Coding Rounds (C1, C2)**
**Maximum Points: 300 per round**

**Scoring Logic:**
- **≤ 2 minutes**: Full 300 points
- **2-5 minutes**: Lose 10 points per minute over 2 minutes
  - 3 minutes = 290 points
  - 4 minutes = 280 points
  - 5 minutes = 270 points
- **> 5 minutes**: Lose 5 points per minute after 5 minutes
  - 6 minutes = 265 points
  - 7 minutes = 260 points
  - And so on...
- **Minimum**: 0 points

**Timer Behavior:**
- Timer is **manually started by organizer** when team is ready
- Can be paused/resumed by organizer
- Only elapsed time counts (paused time doesn't count)

**Deferred Coding Penalty:**
- If a team defers a coding round and completes it later: **20% penalty**
- Formula: `points = Math.floor(points * 0.8)`
- Example: If they would earn 300 points, they get 240 points instead

---

### 4. **Final Coding Challenge (FC)**
**Fixed Points: 400**

**Scoring Logic:**
- **Flat 400 points** - NO time-based deductions
- All teams who complete it get the same points
- This is the final checkpoint (position 10)

**Timer Behavior:**
- 10-minute timer (600 seconds)
- Teams submit their answer
- Organizer manually marks as completed after verification

---

## Leaderboard Ranking

Teams are ranked by:
1. **Total Points** (highest first)
2. **Completed Checkpoints Count** (tiebreaker)

```javascript
// Sorting logic
board.sort((a, b) => 
  b.totalPoints - a.totalPoints ||           // Primary: Total points
  b.completedCount - a.completedCount        // Tiebreaker: Completed count
);
```

---

## Point Calculation Examples

### Example 1: Fast Tracing Round
- Time taken: 1 minute 30 seconds (90 seconds)
- Points earned: **200** (full points)

### Example 2: Medium Tracing Round
- Time taken: 4 minutes (240 seconds)
- Points earned: **180** (200 - 20)

### Example 3: Slow Activity Checkpoint
- Time taken: 7 minutes (420 seconds)
- Points earned: **160** (200 - 30 - 10)

### Example 4: Fast Coding Round
- Time taken: 1 minute 45 seconds
- Points earned: **300** (full points)

### Example 5: Deferred Coding Round
- Time taken: 3 minutes (would normally be 290 points)
- With 20% penalty: **232** points (290 × 0.8)

### Example 6: Final Challenge
- Time taken: Any time (doesn't matter)
- Points earned: **400** (always)

---

## Maximum Possible Points

If a team completes everything perfectly (≤2 minutes each):
- 3 Tracing rounds: 3 × 200 = **600 points**
- 4 Activity checkpoints: 4 × 200 = **800 points**
- 2 Coding rounds: 2 × 300 = **600 points**
- 1 Final challenge: **400 points**

**Total Maximum: 2,400 points**

---

## Key Features

### Swap System
- Teams get **3 swaps** total for the entire event
- Can swap tracing or coding questions (not activity or final)
- Max **1 swap per checkpoint**
- Swapping doesn't affect points - only the question changes

### Timer Management
- **Tracing & Activity**: Auto-start, continuous tracking
- **Coding**: Manual start by organizer, can pause/resume
- **Final**: 10-minute countdown, no deductions

### Difficulty Adaptation
- Questions are assigned based on:
  - College (VVCE vs Other)
  - Year of study (1st, 2nd, 3rd)
  - Current performance (dynamic difficulty)
- Each team gets a mix of easy/medium/hard questions
- Points are the same regardless of difficulty (fairness through balanced assignment)

---

## Summary

The points system rewards **speed and accuracy**:
- Faster completion = More points
- First 2 minutes = Full points
- Minutes 2-5 = Steep penalty (-10/min)
- After 5 minutes = Gentler penalty (-5/min)
- Deferring coding = 20% penalty
- Final challenge = Fixed 400 points (no time pressure)

This creates exciting competition where every second counts, especially in the first 5 minutes of each checkpoint!
