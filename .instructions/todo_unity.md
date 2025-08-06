# Fog of War - Unity Implementation TODO

## 🚀 Getting Started Guide for Humans

### Prerequisites
1. **Install Unity Hub** (https://unity.com/download)
2. **Install Unity 2022.3 LTS** via Unity Hub
3. **Create a new Unity Project**:
   - Open Unity Hub
   - Click "New Project"
   - Select "2D Mobile" template
   - Name it "FogOfWar"
   - Choose save location
   - Click "Create Project"

### Initial Project Setup
1. **Configure Project Settings**:
   - File → Build Settings → Switch Platform to Android/iOS
   - Edit → Project Settings → Player:
     - Company Name: YourCompany
     - Product Name: Fog of War
     - Package Name: com.yourcompany.fogofwar
     - Target API Level: Android 8.0 (API 26)
     - Target iOS: 12.0

2. **Import Existing Assets**:
   - Create folders in Assets:
     - `Sprites/Pawns`
     - `Sprites/Icons`
     - `Sprites/UI`
     - `Audio/Music`
     - `Audio/SFX`
   - Drag all image files from `public/assets/images/` to `Sprites/`
   - Drag all icon files from `public/assets/icons/` to `Sprites/Icons/`
   - Import all audio files to respective folders

3. **Setup Version Control** (Recommended):
   - Initialize Git in project folder
   - Add Unity .gitignore
   - Make initial commit

---

## 📋 Development TODO List for AI

### Phase 1: Core Foundation (Week 1)

#### 1.1 Project Architecture Setup
- [ ] Create folder structure:
  ```
  Assets/
  ├── Scripts/
  │   ├── Core/
  │   │   ├── GameConstants.cs
  │   │   ├── GameState.cs
  │   │   └── Enums.cs
  │   ├── Board/
  │   │   ├── BoardManager.cs
  │   │   ├── Tile.cs
  │   │   └── GridHelper.cs
  │   ├── Pawns/
  │   │   ├── Pawn.cs
  │   │   ├── PawnVisual.cs
  │   │   └── PawnManager.cs
  │   ├── Cards/
  │   │   ├── Card.cs
  │   │   ├── CardManager.cs
  │   │   └── CardUI.cs
  │   ├── UI/
  │   │   ├── UIManager.cs
  │   │   ├── PhaseUI.cs
  │   │   └── ToastManager.cs
  │   ├── Network/
  │   │   ├── NetworkManager.cs
  │   │   ├── GameSession.cs
  │   │   └── MessageTypes.cs
  │   └── Audio/
  │       └── AudioManager.cs
  ```

#### 1.2 Core Game Classes
- [ ] Create `GameConstants.cs`:
  - Board size (11x11)
  - Player constants
  - Color definitions
  - Stat limits (HP: 1-5, Speed: 1-5, Attack: 1-5)
  - Timer durations

- [ ] Create `Enums.cs`:
  - GamePhase enum (PRE_GAME, SETUP_1_DEFINE, etc.)
  - PlayerType enum (PLAYER_1, PLAYER_2)
  - PawnState enum (INACTIVE, ACTIVE, ELIMINATED)
  - ActionType enum (MOVE, ATTACK)

- [ ] Create `GameState.cs`:
  - Current phase tracking
  - Current player
  - Cycle and round numbers
  - Initiative tracking
  - Win condition checking

#### 1.3 Board System
- [ ] Create `BoardManager.cs`:
  - Generate 11x11 grid
  - Instantiate tile GameObjects
  - Handle grid-to-world coordinate conversion
  - Highlight haven zones
  - Manage tile states (normal, haven, highlighted)

- [ ] Create `Tile.cs`:
  - Grid coordinates
  - Tile type (normal, haven)
  - Visual state management
  - Click/touch handling
  - Highlight system (move, attack, selected)

### Phase 2: Game Pieces & Visuals (Week 1-2)

#### 2.1 Pawn Implementation
- [ ] Create `Pawn.cs`:
  - Properties: ID, Player, GridX, GridY
  - Stats: CurrentHP, LinkedCard, RemainingStamina
  - State: IsActive, HasActedThisCycle
  - Methods: TakeDamage(), ResetStats(), LinkCard()

- [ ] Create `PawnVisual.cs`:
  - Sprite rendering
  - HP bar display (5 segments)
  - Stamina bar display (5 segments with color gradient)
  - Attack value display
  - Selection highlight
  - Animation system (movement, attack, elimination)
  - Touch/click detection

- [ ] Create `PawnManager.cs`:
  - Spawn 22 pawns per player
  - Track all pawns
  - Handle pawn selection
  - Validate movements
  - Process eliminations

#### 2.2 Visual Feedback Systems
- [ ] Implement stat bars:
  - HP bars (left side, red)
  - Stamina bars (right side, gradient colors)
  - Attack display (bottom center)

- [ ] Implement combination icons:
  - Load 15 stat combination sprites
  - Display based on card stats
  - Overlay on pawn sprite

- [ ] Create selection system:
  - Yellow highlight for selected pawn
  - Green tiles for valid moves
  - Red highlight for attack targets

### Phase 3: Card System (Week 2)

#### 3.1 Card Logic
- [ ] Create `Card.cs`:
  - Properties: ID, HP, Speed, Attack
  - Validation: Sum must equal 7, min 1 per stat
  - Card preset definitions

- [ ] Create `CardManager.cs`:
  - Handle card creation
  - Validate stat allocation
  - Store cards per round
  - Calculate initiative
  - Manage card-pawn linking

#### 3.2 Card UI
- [ ] Create `CardUI.cs`:
  - Card definition interface
  - Stat allocation controls (sliders/steppers)
  - Preset buttons (Speedy, Attackers, Defenders)
  - Card display during reveal phase
  - Linking interface

- [ ] Implement card definition panel:
  - 3 card slots
  - HP/Speed/Attack inputs per card
  - Real-time validation
  - Total sum display
  - Confirm button

### Phase 4: Game Flow & Phases (Week 2-3)

#### 4.1 Phase Management
- [ ] Create `PhaseManager.cs`:
  - Handle phase transitions
  - Manage timers
  - Trigger UI updates
  - Coordinate with network

- [ ] Implement Setup Phases:
  - Define Phase: Card creation UI, 30s timer
  - Reveal Phase: Show all cards, calculate initiative
  - Linking Phase: Alternate turns, 15s timer

- [ ] Implement Action Phase:
  - Turn management
  - Action validation
  - Stamina tracking
  - Auto-end when no actions available

#### 4.2 Turn System
- [ ] Create `TurnManager.cs`:
  - Track current player's turn
  - Validate available actions
  - Handle turn switching
  - Check for cycle end

- [ ] Implement action system:
  - Movement: Pathfinding, stamina cost
  - Attack: Range check, damage calculation
  - Forced movement after elimination

### Phase 5: UI System (Week 3)

#### 5.1 Main UI
- [ ] Create `UIManager.cs`:
  - Central UI controller
  - Screen layout management
  - Mobile responsive design

- [ ] Implement UI panels:
  - Stats bar (phase, player, cycle, round)
  - Card definition panel
  - Action buttons
  - Timer display
  - Toast notifications

#### 5.2 Mobile Optimization
- [ ] Touch input handling:
  - Tap to select/move/attack
  - Long press for details
  - Drag to pan camera
  - Pinch to zoom

- [ ] Responsive layout:
  - Portrait/landscape support
  - Dynamic UI scaling
  - Safe area handling (notches)

### Phase 6: Networking (Week 3-4)

#### 6.1 Network Foundation
- [ ] Create `NetworkManager.cs`:
  - WebSocket connection
  - Message serialization
  - Connection state management
  - Reconnection logic

- [ ] Create message types:
  - JoinGame, LeaveGame
  - DefineCards, LinkCard
  - GameAction (move/attack)
  - GameState updates

#### 6.2 Multiplayer Features
- [ ] Implement lobby system:
  - Create/join rooms
  - Room codes
  - Ready system
  - Player names

- [ ] Implement game synchronization:
  - State validation
  - Lag compensation
  - Action prediction
  - Spectator mode

### Phase 7: Audio System (Week 4)

#### 7.1 Audio Manager
- [ ] Create `AudioManager.cs`:
  - Sound effect pooling
  - Music playlist system
  - Volume controls
  - Mute functionality

- [ ] Implement sound categories:
  - Movement sounds
  - Combat sounds
  - UI feedback
  - Phase transitions
  - Victory/defeat

#### 7.2 Music System
- [ ] Background music player:
  - Playlist management
  - Crossfading
  - Loop handling
  - Low volume mixing

### Phase 8: Polish & Optimization (Week 4-5)

#### 8.1 Visual Polish
- [ ] Particle effects:
  - Attack impact
  - Elimination effect
  - Movement dust
  - Selection glow

- [ ] Animations:
  - Smooth pawn movement
  - Attack animation
  - Card flip effects
  - UI transitions

#### 8.2 Performance Optimization
- [ ] Mobile optimization:
  - Sprite atlasing
  - Draw call batching
  - LOD system
  - Texture compression

- [ ] Battery optimization:
  - Reduce FPS when idle
  - Efficient networking
  - Background throttling

### Phase 9: Platform Features (Week 5)

#### 9.1 Platform Integration
- [ ] iOS specific:
  - Game Center integration
  - Haptic feedback
  - Safe area handling

- [ ] Android specific:
  - Google Play Games
  - Back button handling
  - Various screen ratios

#### 9.2 Social Features
- [ ] Friends system:
  - Friend codes
  - Friend challenges
  - Online status

- [ ] Chat system:
  - Text chat
  - Emoji support
  - Quick messages

### Phase 10: Testing & Launch (Week 5-6)

#### 10.1 Testing
- [ ] Unit tests:
  - Game logic
  - Card validation
  - Win conditions

- [ ] Device testing:
  - Multiple screen sizes
  - Performance testing
  - Network conditions

#### 10.2 Launch Preparation
- [ ] App store assets:
  - Screenshots
  - App icon
  - Description
  - Keywords

- [ ] Analytics:
  - Player retention
  - Match statistics
  - Error tracking

---

## 🎮 Development Tips for Humans

### Daily Workflow
1. **Start each day by**:
   - Pulling latest changes
   - Reviewing current phase tasks
   - Setting daily goals

2. **Test frequently**:
   - Use Unity Remote for mobile testing
   - Test on actual devices weekly
   - Profile performance regularly

3. **Code Organization**:
   - Comment complex logic
   - Use regions for organization
   - Follow C# naming conventions
   - Keep methods under 30 lines

### Common Pitfalls to Avoid
1. **Performance**:
   - Don't instantiate/destroy objects frequently
   - Use object pooling for pawns and effects
   - Batch sprite draws

2. **Mobile Specific**:
   - Always test touch input on device
   - Account for different aspect ratios
   - Handle app pause/resume

3. **Networking**:
   - Never trust client input
   - Validate all actions server-side
   - Handle disconnections gracefully

### Resources
- Unity Learn: https://learn.unity.com/
- Unity Forums: https://forum.unity.com/
- Mobile Optimization Guide: https://docs.unity3d.com/Manual/MobileOptimization.html

### Quick Reference
- **Board Size**: 11x11
- **Pawns per Player**: 22
- **Stat Total**: 7 points
- **Haven Tiles**: 5 per player
- **Phases**: Define → Reveal → Link (x3) → Action → Reset

---

## 📊 Progress Tracking

### Milestone 1: Playable Prototype (Week 2)
- [ ] Board renders correctly
- [ ] Pawns can be placed
- [ ] Basic movement works
- [ ] Cards can be created

### Milestone 2: Core Game Loop (Week 3)
- [ ] All phases functional
- [ ] Combat system works
- [ ] Win conditions detected
- [ ] Basic UI complete

### Milestone 3: Multiplayer (Week 4)
- [ ] Network connection stable
- [ ] Games can be created/joined
- [ ] State synchronization works
- [ ] Disconnection handling

### Milestone 4: Polish (Week 5)
- [ ] All audio implemented
- [ ] Animations smooth
- [ ] Performance optimized
- [ ] Platform features integrated

### Milestone 5: Release Ready (Week 6)
- [ ] Extensive testing complete
- [ ] Store assets prepared
- [ ] Analytics integrated
- [ ] Launch plan ready