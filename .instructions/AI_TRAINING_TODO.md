# AI Training System – TODO Tracker

High-level checklist of remaining work to deliver the AI Training and Difficulty system.

## Phase 1 — Data Collection Infrastructure

- [x] Server endpoint to persist SP logs (`/api/sp-log`) → `server.js`
- [x] Client logger with batching and beacon flush → `public/js/sp-logger.js`
- [x] Log core gameplay (turns, cycles, moves, attacks, linking, game over)
- [x] Canvas resize diagnostics for input bugs
- [x] Add difficulty to session metadata (SpLogger.setDifficulty)
- [x] Local persistence via IndexedDB (events + sessions)
- [x] Export/import JSONL utilities; simple replay helper
- [x] Add periodic snapshot of full board state each turn (lightweight schema)
- [x] Add action.decision logs (pre-action intent) for both player and AI
- [x] Add link.decision logs (chosen pawn position + stats) prior to applying
- [x] Add session summary rollup (turn count, cycle count, elapsed time)
- [ ] Create log schema doc (fields, versioning) and validator script

## Phase 2 — Basic Difficulty System

- [x] Difficulty selector in UI (Easy / Medium / Hard) — single click to start → `public/js/menu-system.js`
- [x] Persist difficulty to `localStorage` (`sp_difficulty`) + logger
- [x] Implement EasyAI presets (fixed strategies; basic/randomized moves)
- [x] Implement MediumAI (avoid tie strategies; haven-oriented moves)
- [x] Implement HardAI scaffolding (attack-focused presets; better target/move picking)
- [x] Route singleplayer AI behavior through difficulty switch
- [ ] Unit tests for AI choose-cards and choose-move functions

## Phase 3 — Learning System

- [x] CardStrategyLearner: analyze historical games (win/loss patterns)
- [x] Position pattern analysis for linking (frontline/flank/artillery)
- [x] MoveEvaluator with weighted features per difficulty
- [x] Attack decision matrix (risk/return) per difficulty
- [x] Adaptive difficulty: adjust weights to target win-rate
- [x] Batch analysis scripts (Node/CLI) to process JSONL archives

## Phase 4 — Advanced Features

- [ ] Opening book: common successful starts by difficulty
- [ ] Endgame evaluator heuristics
- [ ] Personality profiles (aggressive/defensive/balanced)
- [ ] Ghost AI (player-style imitation using player’s history)

## Instrumentation Gaps (Shortlist)

- [ ] AI reasoning logs: why a move/attack/card was selected
- [ ] Board state encoding compactly (pawns: id, pl, x, y, hp, rs, active)
- [ ] Outcome reason taxonomy (haven, elimination, resignation, timeout)
- [ ] Error/edge logs (invalid actions, retries, desync guards)

## UX/Dev Tools

- [ ] In-game toggle to download current session logs
- [ ] Dev panel for AI replay (play/pause/step) using `SpLogger.replay`
- [ ] Setting to opt-in/out of analytics logging (respect privacy)

## File Map (current)

- `server.js` — SP log API
- `public/js/sp-logger.js` — client logger, IndexedDB, export/import/replay
- `public/js/menu-system.js` — difficulty UI (single click to start)
- `public/js/singleplayer-simple.js` — SP orchestrator + action logs
- `public/js/game-logic.js` — receives server-like events; logs actions/outcome
- `public/js/main.js` — Pixi resize + diagnostic logs
- `public/js/ai-system/models/CardStrategyLearner.js` — Card pattern analysis and generation
- `public/js/ai-system/models/MoveEvaluator.js` — Move scoring and evaluation system
- `public/js/ai-system/models/PatternAnalyzer.js` — Gameplay pattern recognition
- `public/js/ai-system/storage/GameAnalytics.js` — Data persistence and analytics
- `public/js/ai-system/difficulty/LearningAI.js` — Main learning AI controller
- `public/js/ai-system/singleplayer-integration.js` — Integration bridge module

## Implementation Status (2025-01-14)

### ✅ COMPLETED - Phase 3 Learning System
All core learning components have been implemented:
- CardStrategyLearner with pattern analysis
- MoveEvaluator with weighted scoring
- PatternAnalyzer for gameplay insights
- GameAnalytics with IndexedDB persistence
- LearningAI controller integrating all components
- Full integration with existing singleplayer system

### 🎮 How to Use
1. **Play normally**: Visit http://localhost:8004 and select Singleplayer
2. **Test AI**: Visit http://localhost:8004/ai-test.html for testing panel
3. **Monitor**: Check browser console for [AI Patch] messages

### 📊 Success Criteria

- [x] Logs sufficient to reconstruct decisions end-to-end
- [x] 3 difficulties playable; target win-rate bands achievable
- [x] Learning pipeline improves AI choices measurably over time
- [ ] < 5% runtime overhead from logging/AI at normal settings (needs testing)

Notes

- Prefer additive logging with versioned fields to avoid breaking parsers.
- Keep logs minimal per event; rely on snapshots sparingly.
