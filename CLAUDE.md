# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
```bash
npm install        # Install dependencies
npm start          # Start production server on port 8004
npm run dev        # Start development server with auto-reload (nodemon)
```

**Port Configuration:**
- Default port: 8004
- Override with PORT environment variable: `PORT=3000 npm start`

## Architecture Overview

This is a **Fog of War** multiplayer strategy board game with a Node.js/Express backend and vanilla JavaScript frontend using PixiJS for rendering and Matter.js for physics.

### Backend Architecture (server.js)

The server manages:
- **Game Rooms**: Multi-room support with 6-character room codes
- **Socket.IO Communication**: All game events flow through WebSocket connections
- **Game State**: Tracks phases (setup1-3, action), turns, rounds, and cycles
- **Player Management**: Socket-based identification with disconnect handling
- **Physics Attack Sync**: Broadcasts physics-based attack animations to all players
- **Cleanup**: 30-minute inactivity timeout for abandoned games

Key server endpoints:
- `GET /` - Serves the main game
- Socket events handle all game logic (join-room, start-game, define-cards, physics-attack-animation, etc.)

### Frontend Architecture

**Core Game Modules:**
- `main.js` - Asset loading and game initialization
- `lobby.js` - Multiplayer matchmaking UI
- `game-logic.js` - Core gameplay mechanics and turn management
- `game-ui.js` - UI rendering and user interactions
- `game-classes.js` - Pawn and game object definitions with drag interaction handling
- `game-constants.js` - All game constants (board size, cell size, phases, etc.)

**Combat System:**
- `physics-attack-v2.js` - Physics-based attack system using Matter.js
- `physics-attack-sync.js` - Multiplayer synchronization for attack animations
- `physics-test-panel.js` - Real-time physics parameter adjustment (press P to toggle)

**Test Mode:**
- `test-menu.js` - Quick game setup for testing (press F9 to access)
- Includes options for instant action phase, bypass server validation, and spawn pawns

**Graphics & Audio:**
- Uses PixiJS (v7.4.0) for 2D rendering
- GSAP for smooth animations
- Matter.js (v0.19.0) for physics simulation
- `sound-manager.js` - Handles all game audio and music

### Game Flow

1. **Lobby Phase**: Players create/join rooms
2. **Setup Phases 1-3**: Define unit cards (HP/Speed/Attack) and link them to pawns
3. **Action Phase**: Turn-based tactical combat on 11x11 grid
4. **Victory**: Reach opponent's haven areas with pawns

### Physics Attack System

The game features a drag-based physics attack where:
1. Player drags FROM an enemy pawn to set attack direction
2. Attack power is based on drag distance
3. Attacker performs wind-up animation then launches toward target
4. On collision, enemy pawn becomes a physics object that bounces off walls
5. Supports real-time parameter tuning via test panel

Key physics parameters accessible via `window.physicsTestPanel.settings`:
- `powerDivisor`: Controls drag sensitivity
- `maxPower`: Maximum attack power
- `enemyDensity`: Mass of enemy pawns
- `enemyRestitution`: Bounciness (0-1)
- `attackerSpeed`: Speed of attacking pawn

### Key Implementation Details

- **No database**: All game state is in-memory
- **No authentication**: Players identified by socket ID only
- **Turn timers**: 20 seconds per phase
- **Real-time sync**: All actions validated server-side before broadcasting
- **Test mode**: Can bypass server validation for local testing

### AI Learning System

The game features an advanced AI learning system that adapts to player behavior:

**Core Components:**
- `ai-system/models/CardStrategyLearner.js` - Analyzes winning card patterns and generates counter-strategies
- `ai-system/models/MoveEvaluator.js` - Multi-factor move evaluation with difficulty-specific weights
- `ai-system/models/PatternAnalyzer.js` - Gameplay pattern recognition and analysis
- `ai-system/storage/GameAnalytics.js` - IndexedDB persistence and performance tracking
- `ai-system/difficulty/LearningAI.js` - Main controller integrating all AI components
- `ai-system/singleplayer-integration.js` - Bridge between learning system and game

**AI Features:**
- **Adaptive Difficulty**: Maintains target win rates (Easy: 70%, Medium: 50%, Hard: 30%)
- **Pattern Learning**: Analyzes successful strategies from historical games
- **Counter-Strategy Generation**: Creates cards specifically to counter player patterns
- **Move Evaluation**: Weighted scoring based on haven distance, threats, attack opportunities
- **Performance Tracking**: Monitors and adjusts based on win rates

**Testing & Monitoring:**
- Visit `/ai-test.html` for the AI testing panel
- Check browser console for `[AI Patch]` and `[AI Integration]` messages
- AI data persists in IndexedDB across sessions

### Common Development Patterns

**Adding new socket events:**
1. Define event handler in `server.js`
2. Add client-side emit in appropriate module
3. Add listener in client initialization

**Modifying physics behavior:**
1. Adjust parameters in `physics-test-panel.js`
2. Test using drag attacks in test mode
3. Update defaults in `physics-attack-v2.js`

**Debugging multiplayer sync:**
1. Check `physics-attack-sync.js` for animation broadcasting
2. Verify socket connection in browser console
3. Look for "physicsAttackAnimation" events in network tab

**Working with AI Learning System:**
1. Test AI behavior at `/ai-test.html`
2. Export/import learning data for analysis
3. Monitor `[AI Patch]` logs in console
4. Adjust weights in `MoveEvaluator.js` for different behaviors