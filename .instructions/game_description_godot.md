# Fog of War - Godot Mobile Board Game - Detailed Game Description

## Table of Contents
1. [Game Overview](#game-overview)
2. [Core Mechanics](#core-mechanics)
3. [Game Board & Visual Design](#game-board--visual-design)
4. [Pawns (Game Pieces)](#pawns-game-pieces)
5. [Card System](#card-system)
6. [Game Flow & Phases](#game-flow--phases)
7. [Combat & Movement](#combat--movement)
8. [Win Conditions](#win-conditions)
9. [UI/UX Design](#uiux-design)
10. [Audio Design](#audio-design)
11. [Mobile-Specific Features](#mobile-specific-features)
12. [Multiplayer Architecture](#multiplayer-architecture)
13. [Technical Requirements](#technical-requirements)

## Game Overview

**Fog of War** is a strategic 2-player turn-based board game designed for mobile devices. Players command armies of 22 pawns on an 11x11 grid battlefield, using a unique card-driven activation system to outmaneuver their opponent. The game combines tactical positioning with resource management through a stat allocation system.

### Core Concept
- **Genre**: Turn-based tactical strategy
- **Players**: 2 (multiplayer)
- **Platform**: Mobile (iOS/Android) via Godot Engine
- **Theme**: Abstract military strategy with minimalist aesthetic
- **Session Length**: 15-30 minutes per game

### Unique Selling Points
1. **Dynamic Card System**: Players create new cards each cycle by allocating 7 points across HP, Speed, and Attack
2. **Dual Win Conditions**: Victory through territorial control OR total elimination
3. **Initiative System**: Card stats determine turn order, adding strategic depth to stat allocation
4. **Cycle-Based Gameplay**: Matches consist of multiple cycles, each with setup and action phases

## Core Mechanics

### 1. Stat Allocation System
Each card has exactly 7 points distributed across three stats:
- **HP (Health Points)**: 1-5 - Determines pawn durability
- **Speed/Stamina**: 1-5 - Movement points and action capacity
- **Attack**: 1-5 - Damage dealt to enemies

### 2. Initiative System
- Total attack values of revealed cards determine turn order
- Tiebreaker: Total speed values
- Ultimate tiebreaker: Previous round's initiative winner (or Player 1 in first round)

### 3. Linking System
- Cards must be linked to pawns to activate them
- Each pawn can only receive one card per cycle
- Unlinked pawns cannot act but can be eliminated

## Game Board & Visual Design

### Board Layout
- **Grid**: 11x11 square tiles (121 total)
- **Tile Size**: Optimized for mobile touch (minimum 44x44 points for accessibility)
- **Visual Style**: Clean, minimalist design with clear contrast

### Starting Positions
- **Player 1 (Red)**: Bottom two rows (rows 9-10)
- **Player 2 (Blue)**: Top two rows (rows 0-1)
- **22 pawns per player**: 11 pawns per row

### Haven Zones (Victory Locations)
- **Player 1 Target Havens** (Player 1 must reach these):
  - Top center: Tiles (4,0), (5,0), (6,0)
  - Top corners: Tiles (0,0), (10,0)
- **Player 2 Target Havens** (Player 2 must reach these):
  - Bottom center: Tiles (4,10), (5,10), (6,10)
  - Bottom corners: Tiles (0,10), (10,10)

### Visual Indicators
- Grid lines: Light grey (#CCCCCC)
- Background: Light grey (#EEEEEE)
- Haven zones: Highlighted with player-specific tints
- Active pawns: Yellow highlight
- Valid moves: Green overlay
- Attack targets: Red overlay

## Pawns (Game Pieces)

### Visual Design
- **Shape**: Circular pieces with player-specific sprites
- **Player 1**: Red pieces (texture: p1_piece.png)
- **Player 2**: Blue pieces (texture: p2_piece.png)
- **Size**: 80% of tile size for clear spacing

### Pawn States
1. **Inactive**: No linked card, cannot act
2. **Active**: Has linked card, can move/attack
3. **Eliminated**: Removed from board

### Visual Feedback (Godot Implementation)
- **Stats Display**: 
  - HP bar (left side, red bars) - Using NinePatchRect nodes
  - Stamina bar (right side, green-yellow-red gradient) - Using ProgressBar nodes
  - Attack value (bottom center) - Using Label node
- **Combination Icons**: 15 unique icons representing different stat combinations - TextureRect nodes
- **Selection**: Modulate property for yellow tint
- **Hover State**: AnimationPlayer for shadow effect

### Stat Bars
- **HP Bars**: 5 segments, depleting from top
- **Stamina Bars**: 5 segments with color gradient:
  - 5 stamina: Green
  - 4 stamina: Yellow-Green
  - 3 stamina: Yellow
  - 2 stamina: Orange
  - 1 stamina: Red
  - 0 stamina: Dark grey

## Card System

### Card Creation Rules
- Total stats must equal exactly 7
- Each stat minimum: 1
- Each stat maximum: 5
- Examples: (5/1/1), (3/2/2), (2/3/2), (1/1/5)

### Card Presets (Quick Selection)
1. **Speedy**: HP:1, Speed:5, Attack:1 (Glass cannons)
2. **Attackers**: HP:3, Speed:1, Attack:3 (Heavy hitters)
3. **Defenders**: HP:4, Speed:1, Attack:2 (Tanks)

### Card Lifecycle
1. **Definition**: Players allocate stats
2. **Reveal**: Both players' cards shown simultaneously
3. **Linking**: Cards assigned to specific pawns
4. **Active**: Pawns use card stats during action phase
5. **Reset**: Cards discarded at cycle end

## Game Flow & Phases

### Game Structure
```
Game Start
└── Cycle 1
    ├── Setup Round 1
    │   ├── Define Phase
    │   ├── Reveal Phase
    │   └── Linking Phase
    ├── Setup Round 2
    │   └── (same sub-phases)
    ├── Setup Round 3
    │   └── (same sub-phases)
    └── Action Phase
        └── Reset → Next Cycle
```

### Phase Details

#### 1. Setup Phase (3 rounds per cycle)
Each round consists of:

**a) Define Phase**
- Both players simultaneously create 3 cards
- 30-second timer (Timer node with timeout signal)
- UI: Card definition panel with SpinBox nodes for stats

**b) Reveal Phase**
- Cards shown to both players
- Initiative calculated and displayed
- 5-second viewing period

**c) Linking Phase**
- Players alternate linking cards to pawns
- Initiative winner goes first
- 15-second timer per turn
- Cannot link to already-active pawns

#### 2. Action Phase
- Initiative winner from Round 3 goes first
- Players alternate taking actions
- Available actions:
  - **Move**: Up to Speed value in orthogonal steps
  - **Attack**: Adjacent enemy, costs 1 stamina
- Turn passes when current player cannot act
- Phase ends when no pawns can act

#### 3. Reset Phase
- All cards unlinked
- Pawn stats reset (except eliminated pawns)
- New cycle begins

## Combat & Movement

### Movement Rules
- **Direction**: Orthogonal only (up, down, left, right)
- **Distance**: Up to pawn's Speed value
- **Cost**: 1 stamina per tile moved
- **Blocking**: Cannot move through any pawns
- **Destination**: Cannot end on occupied tile

### Combat Rules
- **Range**: Adjacent tiles only (orthogonal)
- **Damage**: Attacker's Attack value
- **Cost**: 1 stamina
- **Target Types**:
  - Active enemy: Damage reduces HP
  - Inactive enemy: Instant elimination
- **Elimination**: When HP ≤ 0
- **Forced Movement**: Attacker must move to eliminated pawn's tile

### Stamina System
- Starting stamina = Speed value
- Costs:
  - Move 1 tile: 1 stamina
  - Attack: 1 stamina
- Cannot act with 0 stamina
- Refreshes each cycle

## Win Conditions

### Primary Victory: Haven Control
- Get 2+ of your pawns into opponent's haven zones
- Must be your own pawns (not captured pieces)
- Checked after each action

### Secondary Victory: Total Elimination
- Eliminate all enemy pawns
- Immediate victory

### No Draw Possible
- Game continues until one player achieves victory
- Cycles repeat indefinitely if needed

## UI/UX Design

### Godot Scene Structure
```
Main (Node2D)
├── Board (Node2D)
│   └── TileMap (TileMap node for grid)
├── PawnContainer (Node2D)
│   └── [Pawn instances]
├── UI (CanvasLayer)
│   ├── TopBar (Control)
│   │   └── StatsDisplay (HBoxContainer)
│   ├── CardPanel (PanelContainer)
│   │   └── CardDefinitionUI (Control)
│   └── SidePanel (Control)
│       └── ChatBox (VBoxContainer)
└── Effects (Node2D)
    └── [Particle effects]
```

### Mobile-Optimized Controls
- **Tap to Select**: _input_event() on Area2D nodes
- **Tap to Move**: Input handling on tile nodes
- **Tap to Attack**: Touch detection on enemy pawns
- **Drag to Pan**: Camera2D with drag enabled
- **Pinch to Zoom**: MultiTouch gesture handling
- **Long Press**: Timer-based input detection

### UI Elements (Godot Nodes)
1. **Toast Notifications**: RichTextLabel with AnimationPlayer
2. **Phase Timer**: ProgressBar with Timer node
3. **Turn Indicator**: TextureRect with glow shader
4. **Action Buttons**: TextureButton nodes
5. **Card Slots**: GridContainer with custom card scenes

### Responsive Design
- Use anchors and margins for adaptive layouts
- ViewportContainer for consistent rendering
- Control nodes with size flags for scaling
- Theme system for consistent styling

## Audio Design

### Sound Effects (AudioStreamPlayer2D nodes)

1. **Movement Sounds**
   - Pawn movement: Positional audio
   - Invalid move: UI feedback sound

2. **Combat Sounds**
   - Attack: Positional clash sound
   - Elimination: Dramatic removal with particles
   - HP damage: Impact with screen shake

3. **UI Sounds** (AudioStreamPlayer nodes)
   - Button clicks: Random selection from array
   - Card selection: Confirmation chime
   - Phase transitions: Fanfare sounds
   - Timer warnings: Escalating pitch

4. **Special Events**
   - Haven reached: Trumpet fanfare
   - Victory: Grand orchestral flourish
   - Cycle start: Rally call

### Background Music (AudioStreamPlayer)
- Music playlist using AudioStreamRandomizer
- Low volume (5% default)
- Crossfade between tracks
- Bus system for audio mixing

### Audio Settings
- Master AudioBus with sub-buses
- SFX bus
- Music bus
- Adjustable via AudioServer

## Mobile-Specific Features

### Touch Optimizations
1. **Godot Touch Handling**
   - InputEventScreenTouch processing
   - Gesture recognition via GestureDetector
   - Touch point visualization for debugging

2. **Visual Feedback**
   - TouchScreenButton nodes for UI
   - Haptic feedback via OS.vibrate_handheld()
   - Input buffering for responsiveness

3. **Input Mapping**
   - Project Settings → Input Map configuration
   - Multi-touch support enabled
   - Gesture priorities defined

### Performance Optimizations
1. **Godot Mobile Rendering**
   - Mobile renderer selected
   - Texture compression (ETC2/ASTC)
   - Batching enabled
   - LOD system using visibility ranges

2. **Battery Optimization**
   - Low processor mode when idle
   - Reduced physics tick rate
   - Particle pooling

3. **Device Adaptation**
   - OS.get_model_name() for device detection
   - Dynamic quality settings
   - Resolution scaling

### Platform Export Settings
1. **Android Export**
   - Min SDK: 23 (Android 6.0)
   - Target SDK: 33
   - Permissions: Internet, Vibrate
   - App Bundle (.aab) format

2. **iOS Export**
   - Minimum iOS: 12.0
   - Capabilities: GameKit
   - Export via Xcode project

## Multiplayer Architecture

### Godot Networking
1. **WebSocketMultiplayerPeer**
   - Real-time connection
   - JSON message protocol
   - Automatic reconnection

2. **High-Level Multiplayer API**
   - RPC calls for actions
   - MultiplayerSynchronizer for state
   - MultiplayerSpawner for pawns

### Network Features
1. **Lobby System**
   - HTTPRequest for matchmaking
   - Room code generation
   - Player authentication

2. **State Synchronization**
   - Delta compression
   - Interpolation for smooth movement
   - Rollback for prediction

3. **Connection Handling**
   - Peer connected/disconnected signals
   - Timeout detection
   - Graceful degradation

### Social Features
1. **Friends System**
   - REST API integration
   - Friend code sharing
   - Online status polling

2. **Chat System**
   - RichTextLabel for display
   - BBCode support
   - Chat command parsing

## Technical Requirements

### Minimum Specifications
- **Godot Version**: 4.2 or newer
- **Target Platforms**: Android 6+, iOS 12+
- **RAM**: 2GB minimum
- **Storage**: 200MB
- **Network**: 3G or better

### Recommended Specifications
- **RAM**: 4GB or more
- **Storage**: 500MB
- **Network**: 4G/WiFi
- **Screen**: 5" or larger

### Godot Project Settings
1. **Rendering**
   - Renderer: Mobile
   - Shadow Atlas: 2048
   - MSAA: 2x

2. **Physics**
   - Physics FPS: 30
   - Enable 2D physics

3. **Display**
   - Window mode: Fullscreen
   - Orientation: Both
   - Stretch mode: canvas_items

### Development Architecture
1. **Scene Organization**
   - Separate scenes for game phases
   - Inherited scenes for pawns
   - Resource files for cards

2. **Script Structure**
   - Singleton autoloads for managers
   - Signals for decoupled communication
   - Composition over inheritance

3. **Asset Pipeline**
   - Import presets for textures
   - Audio bus layout
   - Theme resources for UI

### Accessibility Features
1. **Visual**
   - ColorRect overlays for colorblind modes
   - Font size scaling
   - High contrast theme variant
   - TTS support via OS.tts_speak()

2. **Motor**
   - Adjustable touch deadzone
   - Tap-and-hold alternatives
   - Simplified gesture mode
   - Confirmation dialogs

3. **Cognitive**
   - Tutorial with GDQuest's Tour plugin
   - Hint system
   - Adjustable timers
   - Practice mode