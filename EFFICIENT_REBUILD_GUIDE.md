# Fog of War: Efficient Rebuild Architecture

## 🎯 Core Philosophy

Build a **clean, modular, event-driven architecture** that eliminates the complexity and patch-heavy approach of the current codebase. Focus on:
- **Single responsibility principle** for each module
- **Event-driven communication** instead of direct coupling
- **State management pattern** with centralized game state
- **Unified game modes** - no separate single/multiplayer logic
- **Configuration-driven behavior** instead of hardcoded logic

## 🏗️ New Architecture Overview

```
Game Engine Core
├── StateManager (Centralized state with observers)
├── EventBus (Decoupled communication)
├── GameModes (Unified interface for SP/MP)
├── InputController (Unified input handling)
└── RenderEngine (Optimized rendering pipeline)

Game Logic Layer  
├── GameRules (Pure game logic functions)
├── PhysicsEngine (Self-contained physics)
├── AIEngine (Pluggable AI strategies)
└── AudioEngine (Event-driven sound system)

Interface Layer
├── UIManager (Component-based UI)
├── MenuSystem (State-based navigation)
└── AssetManager (Efficient loading/caching)

Network Layer (Optional)
├── NetworkAdapter (Abstracts local vs remote)
└── MessageProtocol (Consistent message format)
```

## 🚀 Technology Stack (Modernized)

### Core Engine
```javascript
// Modern ES6+ modules with clean imports
import { StateManager } from './core/StateManager.js';
import { EventBus } from './core/EventBus.js';
import { GameEngine } from './core/GameEngine.js';
```

### Libraries (Simplified)
- **PixiJS 8.x** - Latest rendering engine
- **Matter.js** - Physics (contained within physics module)
- **Howler.js** - Audio (wrapped in AudioEngine)
- **Socket.IO** - Only for multiplayer (optional dependency)

### No More Dependencies
- Remove GSAP (use CSS animations + PixiJS tweening)
- Remove jQuery-style DOM manipulation
- Remove patch files and runtime fixes

## 🎮 Game State Architecture

### Centralized State Management
```javascript
// StateManager.js - Single source of truth
export class StateManager {
    constructor() {
        this.state = {
            // Game flow
            gameMode: null, // 'singleplayer' | 'multiplayer' | 'spectator'
            gamePhase: 'MENU', // 'MENU' | 'SETUP' | 'PLAY' | 'GAMEOVER'
            
            // Players (unified for SP/MP)
            players: new Map(),
            currentPlayer: null,
            
            // Board state
            board: new Board(),
            
            // Game rules
            rules: new GameRules(),
            
            // UI state
            ui: {
                selectedPawn: null,
                hoveredTile: null,
                dragState: null
            }
        };
        
        this.observers = new Set();
        this.history = []; // For undo/replay
    }
    
    // Immutable state updates with automatic observer notification
    setState(updater) {
        const newState = updater(this.state);
        this.history.push(this.state);
        this.state = Object.freeze(newState);
        this.notifyObservers();
    }
    
    // Subscribe to state changes
    subscribe(observer) {
        this.observers.add(observer);
        return () => this.observers.delete(observer);
    }
}
```

### Event-Driven Communication
```javascript
// EventBus.js - Decoupled messaging
export class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }
    
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }
    
    // Type-safe events
    static EVENTS = {
        GAME_START: 'game:start',
        TURN_START: 'turn:start',
        PAWN_MOVE: 'pawn:move',
        PAWN_ATTACK: 'pawn:attack',
        CARD_DEFINE: 'card:define',
        UI_UPDATE: 'ui:update',
        AUDIO_PLAY: 'audio:play'
    };
}
```

## 🎯 Unified Game Modes

### Single Interface for All Modes
```javascript
// GameMode.js - Unified game mode interface
export class GameMode {
    constructor(type, config) {
        this.type = type; // 'singleplayer' | 'multiplayer'
        this.config = config;
        this.players = [];
    }
    
    // All modes implement the same interface
    async initialize() { throw new Error('Must implement'); }
    handlePlayerAction(action) { throw new Error('Must implement'); }
    getNextPlayer() { throw new Error('Must implement'); }
    isGameOver() { throw new Error('Must implement'); }
}

// SinglePlayerMode.js
export class SinglePlayerMode extends GameMode {
    constructor(aiDifficulty) {
        super('singleplayer', { aiDifficulty });
        this.players = [
            new HumanPlayer(1, 'Player'),
            new AIPlayer(2, 'AI Commander', aiDifficulty)
        ];
    }
    
    async initialize() {
        // Set up AI opponent
        this.aiEngine = new AIEngine(this.config.aiDifficulty);
        
        // Initialize game state
        StateManager.setState(state => ({
            ...state,
            gameMode: 'singleplayer',
            players: new Map(this.players.map(p => [p.id, p]))
        }));
    }
    
    handlePlayerAction(action) {
        // Validate action
        if (!this.isValidAction(action)) return false;
        
        // Apply action
        this.applyAction(action);
        
        // Trigger AI turn if needed
        if (this.getCurrentPlayer().type === 'AI') {
            setTimeout(() => this.handleAITurn(), 500);
        }
        
        return true;
    }
    
    async handleAITurn() {
        const aiAction = await this.aiEngine.getNextAction(StateManager.state);
        this.handlePlayerAction(aiAction);
    }
}

// MultiplayerMode.js  
export class MultiplayerMode extends GameMode {
    constructor(networkAdapter) {
        super('multiplayer', { networkAdapter });
        this.networkAdapter = networkAdapter;
    }
    
    handlePlayerAction(action) {
        // Validate action locally
        if (!this.isValidAction(action)) return false;
        
        // Send to network
        this.networkAdapter.send('playerAction', action);
        return true;
    }
}
```

## 🧠 AI Engine (Pluggable Architecture)

```javascript
// AIEngine.js - Modular AI system
export class AIEngine {
    constructor(difficulty) {
        this.strategy = this.createStrategy(difficulty);
        this.evaluator = new PositionEvaluator();
    }
    
    createStrategy(difficulty) {
        const strategies = {
            easy: new RandomStrategy(),
            medium: new MinimaxStrategy(3), // 3-ply lookahead
            hard: new AlphaBetaStrategy(5)  // 5-ply with pruning
        };
        return strategies[difficulty];
    }
    
    async getNextAction(gameState) {
        // AI decision pipeline
        const possibleActions = this.generateActions(gameState);
        const evaluatedActions = possibleActions.map(action => ({
            action,
            score: this.strategy.evaluate(gameState, action)
        }));
        
        // Add some randomness to prevent predictability
        const bestActions = this.selectTopActions(evaluatedActions, 3);
        return this.strategy.selectFromBest(bestActions);
    }
    
    generateActions(gameState) {
        const actions = [];
        const currentPlayer = gameState.currentPlayer;
        
        // Generate all possible moves and attacks
        gameState.players.get(currentPlayer).pawns.forEach(pawn => {
            if (!pawn.isActive) return;
            
            // Movement actions
            const moves = this.getPossibleMoves(pawn, gameState);
            moves.forEach(move => actions.push({
                type: 'MOVE',
                pawnId: pawn.id,
                target: move
            }));
            
            // Attack actions
            const attacks = this.getPossibleAttacks(pawn, gameState);
            attacks.forEach(attack => actions.push({
                type: 'ATTACK',
                pawnId: pawn.id,
                target: attack.target,
                direction: attack.direction
            }));
        });
        
        return actions;
    }
}

// Pluggable AI strategies
class MinimaxStrategy {
    constructor(depth) {
        this.depth = depth;
    }
    
    evaluate(gameState, action) {
        return this.minimax(gameState, action, this.depth, true);
    }
    
    minimax(state, action, depth, isMaximizing) {
        if (depth === 0 || this.isTerminal(state)) {
            return this.evaluatePosition(state);
        }
        
        // Implement minimax algorithm
        // ... minimax logic
    }
}
```

## 🎨 Component-Based UI System

```javascript
// UIManager.js - Component-based UI
export class UIManager {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.components = new Map();
        
        // Subscribe to state changes
        stateManager.subscribe(this.handleStateChange.bind(this));
    }
    
    registerComponent(name, component) {
        this.components.set(name, component);
        component.setEventBus(this.eventBus);
    }
    
    handleStateChange(newState) {
        // Update only components that care about changed state
        this.components.forEach(component => {
            if (component.shouldUpdate(newState)) {
                component.render(newState);
            }
        });
    }
}

// Component base class
export class UIComponent {
    constructor(container) {
        this.container = container;
        this.eventBus = null;
        this.lastState = null;
    }
    
    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }
    
    shouldUpdate(newState) {
        // Override in subclasses to optimize re-renders
        return true;
    }
    
    render(state) {
        // Override in subclasses
        throw new Error('Must implement render method');
    }
    
    emit(event, data) {
        if (this.eventBus) {
            this.eventBus.emit(event, data);
        }
    }
}

// Example: GameBoard component
export class GameBoardComponent extends UIComponent {
    constructor(pixiContainer) {
        super(pixiContainer);
        this.boardSprites = new Map();
        this.pawnSprites = new Map();
    }
    
    shouldUpdate(newState) {
        // Only re-render if board or pawns changed
        return newState.board !== this.lastState?.board ||
               newState.players !== this.lastState?.players;
    }
    
    render(state) {
        this.renderBoard(state.board);
        this.renderPawns(state.players);
        this.lastState = state;
    }
    
    renderBoard(board) {
        // Efficient board rendering with sprite reuse
        board.tiles.forEach((tile, position) => {
            let sprite = this.boardSprites.get(position);
            if (!sprite) {
                sprite = this.createTileSprite(tile);
                this.boardSprites.set(position, sprite);
                this.container.addChild(sprite);
            }
            this.updateTileSprite(sprite, tile);
        });
    }
}
```

## ⚡ Physics Engine (Self-Contained)

```javascript
// PhysicsEngine.js - Clean physics system
export class PhysicsEngine {
    constructor() {
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        this.world.gravity.y = 0;
        
        this.bodies = new Map();
        this.animations = new Set();
        
        this.setupBoundaries();
    }
    
    // Simplified physics attack
    async executePhysicsAttack(attacker, target, force, direction) {
        return new Promise((resolve) => {
            // Create physics bodies
            const attackerBody = this.createPawnBody(attacker);
            const targetBody = this.createPawnBody(target);
            
            // Apply force
            Matter.Body.applyForce(targetBody, targetBody.position, {
                x: direction.x * force,
                y: direction.y * force
            });
            
            // Animate until settled
            const animation = {
                attacker: attackerBody,
                target: targetBody,
                onComplete: resolve
            };
            
            this.animations.add(animation);
            this.startAnimation(animation);
        });
    }
    
    update(deltaTime) {
        Matter.Engine.update(this.engine, deltaTime);
        
        // Update ongoing animations
        this.animations.forEach(animation => {
            this.updateAnimation(animation);
        });
    }
    
    // Clean up physics bodies after animation
    cleanup() {
        this.bodies.clear();
        this.animations.clear();
        Matter.World.clear(this.world);
    }
}
```

## 🔊 Audio Engine (Event-Driven)

```javascript
// AudioEngine.js - Clean audio system
export class AudioEngine {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.sounds = new Map();
        this.music = null;
        this.settings = {
            masterVolume: 1.0,
            sfxVolume: 1.0,
            musicVolume: 1.0,
            muted: false
        };
        
        // Listen for audio events
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on(EventBus.EVENTS.AUDIO_PLAY, (data) => {
            this.playSound(data.sound, data.volume);
        });
        
        this.eventBus.on(EventBus.EVENTS.GAME_START, () => {
            this.playMusic('background');
        });
    }
    
    async loadSounds(soundMap) {
        const promises = Object.entries(soundMap).map(([name, url]) => 
            this.loadSound(name, url)
        );
        await Promise.all(promises);
    }
    
    playSound(name, volume = 1.0) {
        if (this.settings.muted) return;
        
        const sound = this.sounds.get(name);
        if (sound) {
            sound.volume(volume * this.settings.sfxVolume * this.settings.masterVolume);
            sound.play();
        }
    }
}
```

## 🌐 Network Abstraction

```javascript
// NetworkAdapter.js - Abstract networking
export class NetworkAdapter {
    constructor(type) {
        this.type = type; // 'local' | 'socket'
        this.messageQueue = [];
        this.handlers = new Map();
    }
    
    // Unified interface for local and network play
    send(event, data) {
        if (this.type === 'local') {
            // Handle locally with AI
            this.handleLocal(event, data);
        } else {
            // Send over network
            this.socket.emit(event, data);
        }
    }
    
    on(event, handler) {
        this.handlers.set(event, handler);
        
        if (this.type === 'socket' && this.socket) {
            this.socket.on(event, handler);
        }
    }
}

// LocalNetworkAdapter.js - For single player
export class LocalNetworkAdapter extends NetworkAdapter {
    constructor(aiEngine) {
        super('local');
        this.aiEngine = aiEngine;
    }
    
    handleLocal(event, data) {
        // Process player action immediately
        const handler = this.handlers.get(event);
        if (handler) {
            handler(data);
        }
        
        // Trigger AI response if needed
        if (this.shouldTriggerAI(event)) {
            setTimeout(() => this.handleAIResponse(event, data), 500);
        }
    }
}
```

## 📁 File Structure (Simplified)

```
src/
├── core/
│   ├── GameEngine.js          # Main game engine
│   ├── StateManager.js        # Centralized state
│   ├── EventBus.js           # Event system
│   └── AssetManager.js       # Asset loading
├── game/
│   ├── GameRules.js          # Pure game logic
│   ├── Board.js              # Board representation
│   ├── Player.js             # Player classes
│   └── GameMode.js           # Game mode interface
├── modes/
│   ├── SinglePlayerMode.js   # SP implementation
│   └── MultiplayerMode.js    # MP implementation  
├── ai/
│   ├── AIEngine.js           # AI system
│   ├── strategies/           # AI strategies
│   └── evaluators/           # Position evaluation
├── physics/
│   └── PhysicsEngine.js      # Self-contained physics
├── ui/
│   ├── UIManager.js          # Component manager
│   ├── components/           # UI components
│   └── MenuSystem.js         # Menu navigation
├── audio/
│   └── AudioEngine.js        # Audio system
├── network/
│   ├── NetworkAdapter.js     # Network abstraction
│   └── adapters/             # Specific adapters
└── utils/
    ├── Config.js             # Game configuration
    └── Logger.js             # Logging system
```

## 🚀 Implementation Order

### Phase 1: Core Foundation
1. **StateManager** - Centralized state with observers
2. **EventBus** - Decoupled communication system
3. **GameEngine** - Main game loop and initialization
4. **AssetManager** - Efficient asset loading

### Phase 2: Game Logic
1. **GameRules** - Pure game logic functions
2. **Board** - Board representation and operations
3. **Player** - Player classes (Human/AI)
4. **GameMode** - Unified game mode interface

### Phase 3: Game Modes
1. **SinglePlayerMode** - Local game mode
2. **AIEngine** - Pluggable AI system
3. **MultiplayerMode** - Network game mode
4. **NetworkAdapter** - Network abstraction

### Phase 4: Interface & Polish
1. **UIManager** - Component-based UI system
2. **PhysicsEngine** - Clean physics implementation
3. **AudioEngine** - Event-driven audio
4. **MenuSystem** - State-based menus

## ✅ Benefits of New Architecture

### 🎯 **Eliminated Problems**
- ❌ No more patch files or runtime fixes
- ❌ No more socket initialization loops
- ❌ No more hardcoded game mode switches
- ❌ No more tightly coupled components
- ❌ No more global state mutations

### ✅ **New Advantages**
- ✅ **Unified codebase** - Single/multiplayer use same logic
- ✅ **Event-driven** - Components don't know about each other
- ✅ **Testable** - Pure functions and dependency injection
- ✅ **Extensible** - Easy to add new features/modes
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Performant** - Optimized rendering and state updates

### 🔧 **Development Experience**
- Hot-reloadable modules
- Type-safe event system
- Comprehensive logging
- Built-in debugging tools
- Automated testing support

## 🎮 Usage Example

```javascript
// main.js - Clean initialization
import { GameEngine } from './core/GameEngine.js';
import { SinglePlayerMode } from './modes/SinglePlayerMode.js';

async function startGame() {
    const engine = new GameEngine();
    await engine.initialize();
    
    // Start single player game
    const gameMode = new SinglePlayerMode('medium');
    await engine.setGameMode(gameMode);
    
    // Game runs automatically through event system
    engine.start();
}

startGame();
```

This architecture eliminates all the complexity we encountered and creates a clean, maintainable, and extensible game engine that can handle both single player and multiplayer seamlessly!