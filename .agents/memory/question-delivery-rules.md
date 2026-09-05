---
name: Question delivery rules
description: The event’s station-specific rules for exposing questions to teams.
---

Mystery quizzes expose exactly one uploaded multiple-choice question at a time and advance on option selection without revealing correctness or points. Each quiz round owns one 20-question set. Coding owns one shared 10-question pool and exposes one assigned serial/question; Logic owns 2 sets per checkpoint, while Puzzle and Crossword own 6 sets each. Logic, Puzzle, and Crossword expose only an assigned set number and no questions.

**Why:** Station volunteers control Logic/Puzzle/Crossword scoring, while Quiz and Coding need controlled, sequential participant interaction.

**How to apply:** Keep server payloads and participant UI aligned; do not reintroduce full quiz sets or internal volunteer question content into team responses.