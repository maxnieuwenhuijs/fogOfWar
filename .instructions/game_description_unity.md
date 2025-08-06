# Fog of War - Unity Mobile Board Game - Detailed Game Description

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
- **Platform**: Mobile (iOS/Android) via Unity
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
- **Player 1**: Red pieces (sprite: p1_piece.png)
- **Player 2**: Blue pieces (sprite: p2_piece.png)
- **Size**: 80% of tile size for clear spacing

### Pawn States
1. **Inactive**: No linked card, cannot act
2. **Active**: Has linked card, can move/attack
3. **Eliminated**: Removed from board

### Visual Feedback
- **Stats Display**: 
  - HP bar (left side, red bars)
  - Stamina bar (right side, green-yellow-red gradient)
  - Attack value (bottom center)
- **Combination Icons**: 15 unique icons representing different stat combinations
- **Selection**: Yellow tint when selected
- **Hover State**: Shadow effect on mouseover/touch

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
- 30-second timer (auto-random if expired)
- UI: Card definition panel with stat sliders/inputs

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

### Main Game Screen Layout
1. **Game Board**: Center, maximum screen space
2. **Stats Bar**: Top - Shows phase, current player, cycle, round
3. **Card UI Area**: Bottom panel for card-related actions
4. **Chat/Info Panel**: Side panel (collapsible on mobile)

### Mobile-Optimized Controls
- **Tap to Select**: Tap pawn to select
- **Tap to Move**: Tap valid green tile
- **Tap to Attack**: Tap adjacent red enemy
- **Drag to Pan**: Camera movement (if zoomed)
- **Pinch to Zoom**: Board zoom (optional)
- **Long Press**: Show detailed pawn stats

### UI Elements
1. **Toast Notifications**: Top-center popups for game events
2. **Phase Timer**: Countdown display during timed phases
3. **Turn Indicator**: Clear visual showing whose turn
4. **Action Buttons**: Large, thumb-friendly buttons
5. **Card Slots**: Visual card representations during linking

### Responsive Design
- Portrait and landscape orientation support
- Adaptive UI scaling based on screen size
- Minimum touch target: 44x44 points
- High contrast colors for outdoor visibility

## Audio Design

### Sound Effects Categories

1. **Movement Sounds**
   - Pawn movement: Subtle sliding sound
   - Invalid move: Error beep

2. **Combat Sounds**
   - Attack: Sword clash
   - Elimination: Dramatic removal sound
   - HP damage: Impact sound

3. **UI Sounds**
   - Button clicks: Drum sounds (5 variations)
   - Card selection: Confirmation chime
   - Phase transitions: Fanfare sounds
   - Timer warnings: Escalating beeps

4. **Special Events**
   - Haven reached: Trumpet fanfare
   - Victory: Grand orchestral flourish
   - Cycle start: Rally call

### Background Music
- Classical music playlist (Strauss waltzes)
- Low volume (5% default)
- Seamless looping between tracks
- Mutable via settings

### Audio Settings
- Master volume slider
- SFX volume slider
- Music volume slider
- Mute all option

## Mobile-Specific Features

### Touch Optimizations
1. **Smart Touch Detection**
   - Distinguish tap vs drag
   - Touch prediction for smoother response
   - Multi-touch prevention during actions

2. **Visual Feedback**
   - Touch ripple effects
   - Haptic feedback on actions (device-dependent)
   - Clear touch zones around small elements

3. **Gesture Support**
   - Swipe to dismiss notifications
   - Double-tap to center board
   - Two-finger tap to zoom out fully

### Performance Optimizations
1. **Battery Life**
   - Reduced FPS when idle
   - Efficient sprite batching
   - Minimal particle effects

2. **Network Efficiency**
   - Delta state updates only
   - Message queuing for poor connections
   - Automatic reconnection handling

3. **Device Adaptation**
   - Low-end device detection
   - Quality settings (Low/Medium/High)
   - Automatic resolution scaling

### Platform-Specific Features
1. **iOS**
   - Game Center integration
   - iCloud save sync
   - iOS haptic engine support

2. **Android**
   - Google Play Games integration
   - Achievement system
   - Cloud save support

## Multiplayer Architecture

### Connection Types
1. **Online Multiplayer**
   - Real-time WebSocket connection
   - Matchmaking system
   - Ranked and casual modes

2. **Local Multiplayer**
   - Same device (pass and play)
   - Local network (LAN)
   - Bluetooth connection

### Network Features
1. **Lobby System**
   - Create/join rooms
   - Private room codes
   - Spectator mode support

2. **Synchronization**
   - Server-authoritative gameplay
   - Client-side prediction
   - Lag compensation

3. **Disconnection Handling**
   - 60-second reconnection window
   - AI takeover option
   - Game state persistence

### Social Features
1. **Friends List**
   - Add friends via codes
   - Challenge friends directly
   - View online status

2. **Chat System**
   - In-game text chat
   - Preset quick messages
   - Emoji support
   - Profanity filter

3. **Replay System**
   - Save interesting matches
   - Share replays
   - Learn from replays

## Technical Requirements

### Minimum Specifications
- **Unity Version**: 2022.3 LTS or newer
- **Target Platforms**: iOS 12+, Android 8+
- **RAM**: 2GB minimum
- **Storage**: 200MB
- **Network**: 3G or better for online play

### Recommended Specifications
- **RAM**: 4GB or more
- **Storage**: 500MB (with assets cache)
- **Network**: 4G/WiFi for optimal experience
- **Screen**: 5" or larger

### Development Considerations
1. **Asset Pipeline**
   - Texture atlasing for UI elements
   - Compressed audio formats
   - LOD system for complex scenes

2. **Code Architecture**
   - MVC pattern for clean separation
   - Event-driven communication
   - Modular system design

3. **Testing Requirements**
   - Unit tests for game logic
   - Integration tests for networking
   - Device testing matrix
   - Performance profiling

### Accessibility Features
1. **Visual**
   - Colorblind modes
   - High contrast option
   - Larger UI scaling
   - Screen reader support

2. **Motor**
   - Adjustable touch sensitivity
   - Longer touch hold times
   - One-handed mode option
   - Confirmations for critical actions

3. **Cognitive**
   - Tutorial mode
   - Undo last move (casual mode)
   - No-timer option
   - Simplified rule variant