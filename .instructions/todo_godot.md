# Fog of War - Godot Implementation TODO

## 🚀 Getting Started Guide for Humans

### Prerequisites
1. **Download Godot Engine** (https://godotengine.org/download)
   - Choose Godot 4.2 or newer (Standard version, not .NET)
   - No installation needed - just extract and run

2. **Create a new Godot Project**:
   - Open Godot
   - Click "New Project"
   - Project Name: "FogOfWar"
   - Choose project path
   - Renderer: Mobile (for better mobile performance)
   - Click "Create & Edit"

### Initial Project Setup
1. **Configure Project Settings**:
   - Project → Project Settings:
     - Application → Config → Name: "Fog of War"
     - Display → Window:
       - Size: Width: 720, Height: 1280
       - Stretch Mode: canvas_items
       - Aspect: expand
     - Rendering → Renderer: Mobile
     - Input Devices → Pointing:
       - Emulate Touch from Mouse: ON
       - Emulate Mouse from Touch: ON

2. **Import Existing Assets**:
   - Create folders in res://:
     ```
     res://
     ├── assets/
     │   ├── sprites/
     │   │   ├── pawns/
     │   │   ├── icons/
     │   │   └── ui/
     │   ├── audio/
     │   │   ├── music/
     │   │   └── sfx/
     │   └── fonts/
     ```
   - Drag all files from `public/assets/` to corresponding Godot folders
   - Let Godot import them (check Import tab for settings)

3. **Setup Version Control**:
   - Create `.gitignore` with Godot template
   - Initialize Git repository
   - Make initial commit

4. **Configure Import Presets**:
   - Select all sprites → Import tab:
     - Filter: Linear
     - Mipmaps: OFF (for pixel art)
   - Select all audio → Import tab:
     - Music: Loop = ON
     - SFX: Loop = OFF

---

## 📋 Development TODO List for AI

### Phase 1: Core Foundation (Week 1)

#### 1.1 Project Structure Setup
- [ ] Create folder structure:
  ```
  res://
  ├── scenes/
  │   ├── main/
  │   │   └── Main.tscn
  │   ├── board/
  │   │   ├── Board.tscn
  │   │   └── Tile.tscn
  │   ├── pawns/
  │   │   ├── Pawn.tscn
  │   │   └── PawnVisual.tscn
  │   ├── cards/
  │   │   ├── Card.tscn
  │   │   └── CardUI.tscn
  │   └── ui/
  │       ├── MainUI.tscn
  │       └── components/
  ├── scripts/
  │   ├── core/
  │   │   ├── GameConstants.gd
  │   │   ├── GameState.gd
  │   │   └── Enums.gd
  │   ├── board/
  │   │   ├── BoardManager.gd
  │   │   └── Tile.gd
  │   ├── pawns/
  │   │   ├── Pawn.gd
  │   │   └── PawnManager.gd
  │   ├── cards/
  │   │   ├── Card.gd
  │   │   └── CardManager.gd
  │   ├── ui/
  │   │   ├── UIManager.gd
  │   │   └── ToastManager.gd
  │   ├── network/
  │   │   └── NetworkManager.gd
  │   └── audio/
  │       └── AudioManager.gd
  └── resources/
      ├── themes/
      │   └── main_theme.tres
      └── shaders/
          └── highlight.gdshader
  ```

#### 1.2 Core Autoload Scripts
- [ ] Create `GameConstants.gd` (Singleton):
  ```gdscript
  extends Node
  
  const BOARD_SIZE := 11
  const CELL_SIZE := 60
  const PLAYER_1 := 1
  const PLAYER_2 := 2
  const STAT_TOTAL := 7
  const MIN_STAT := 1
  const MAX_STAT := 5
  ```

- [ ] Create `Enums.gd` (Singleton):
  - GamePhase enum
  - PlayerType enum  
  - PawnState enum
  - ActionType enum

- [ ] Create `GameState.gd` (Singleton):
  - Current phase tracking
  - Player management
  - Cycle/round tracking
  - Win condition checking

- [ ] Add Autoloads:
  - Project → Project Settings → Autoload
  - Add GameConstants, Enums, GameState

#### 1.3 Board System
- [ ] Create `Board.tscn`:
  - Root: Node2D
  - Add TileMap node
  - Configure tile size (60x60)
  - Create tile source with basic sprites

- [ ] Create `BoardManager.gd`:
  - Generate 11x11 grid
  - Handle coordinate conversion
  - Manage tile highlighting
  - Track haven zones

- [ ] Create `Tile.gd`:
  - Extend Area2D
  - Add collision shape
  - Handle input events
  - Manage visual states

### Phase 2: Game Pieces & Visuals (Week 1-2)

#### 2.1 Pawn Scene Structure
- [ ] Create `Pawn.tscn`:
  ```
  Pawn (Area2D)
  ├── CollisionShape2D
  ├── Visuals (Node2D)
  │   ├── Sprite2D (pawn sprite)
  │   ├── StatsContainer (Node2D)
  │   │   ├── HPBar (Node2D)
  │   │   ├── StaminaBar (Node2D)
  │   │   └── AttackLabel (Label)
  │   └── SelectionHighlight (Sprite2D)
  └── AnimationPlayer
  ```

- [ ] Create `Pawn.gd`:
  - Properties: player, grid_position, stats
  - Methods: take_damage(), move_to(), link_card()
  - Signals: selected, moved, attacked, eliminated

#### 2.2 Visual Feedback Systems
- [ ] Implement HP bars:
  - Create reusable BarSegment scene
  - 5 segments with fill states
  - Red color scheme

- [ ] Implement Stamina bars:
  - Gradient color system
  - Dynamic color based on value
  - Smooth depletion animation

- [ ] Create stat combination icons:
  - Load 15 icon textures
  - Display based on card combo
  - Overlay system

#### 2.3 Pawn Manager
- [ ] Create `PawnManager.gd`:
  - Spawn pawns at start positions
  - Track all pawns by player
  - Handle selection logic
  - Process eliminations

### Phase 3: Card System (Week 2)

#### 3.1 Card Scene Creation
- [ ] Create `Card.tscn`:
  - Root: Control
  - Add visual elements
  - Stat display labels
  - Background panel

- [ ] Create `Card.gd`:
  - Resource-based approach
  - Stat validation
  - Initiative calculation

#### 3.2 Card UI System
- [ ] Create `CardDefinitionUI.tscn`:
  - 3 card slots (HBoxContainer)
  - SpinBox for each stat
  - Real-time validation
  - Preset buttons

- [ ] Implement card definition panel:
  - Timer display (ProgressBar)
  - Confirm button
  - Total sum indicator
  - Visual feedback for invalid states

#### 3.3 Card Manager
- [ ] Create `CardManager.gd`:
  - Handle card creation/validation
  - Store cards per round
  - Calculate initiative
  - Manage linking process

### Phase 4: Game Flow & Phases (Week 2-3)

#### 4.1 Phase Management
- [ ] Create `PhaseManager.gd`:
  - State machine pattern
  - Phase transition logic
  - Timer management
  - Signal emissions

- [ ] Implement phase scenes:
  - SetupPhase.tscn
  - ActionPhase.tscn
  - Each with specific UI

#### 4.2 Turn System
- [ ] Create `TurnManager.gd`:
  - Track active player
  - Validate actions
  - Handle turn switching
  - Check cycle end conditions

- [ ] Implement action handlers:
  - Movement pathfinding (AStar2D)
  - Attack validation
  - Stamina management
  - Forced movement logic

### Phase 5: UI System (Week 3)

#### 5.1 Main UI Structure
- [ ] Create `MainUI.tscn`:
  ```
  UI (CanvasLayer)
  ├── TopBar (MarginContainer)
  │   └── StatsBar (HBoxContainer)
  ├── BottomPanel (PanelContainer)
  │   └── CardArea (MarginContainer)
  ├── SidePanel (PanelContainer)
  │   └── ChatBox (VBoxContainer)
  └── Notifications (Control)
      └── ToastContainer (VBoxContainer)
  ```

- [ ] Create responsive layouts:
  - Use anchors and margins
  - Size flags for scaling
  - Container nodes for organization

#### 5.2 Mobile UI Components
- [ ] Implement touch controls:
  - TouchScreenButton nodes
  - Gesture detection script
  - Visual touch feedback

- [ ] Create mobile-friendly elements:
  - Large touch targets (min 44x44)
  - Clear visual states
  - Haptic feedback calls

### Phase 6: Networking (Week 3-4)

#### 6.1 Network Foundation
- [ ] Create `NetworkManager.gd`:
  - WebSocketMultiplayerPeer setup
  - Connection handling
  - Message protocol
  - Error handling

- [ ] Implement multiplayer nodes:
  - MultiplayerSpawner for pawns
  - MultiplayerSynchronizer for state
  - RPC method definitions

#### 6.2 Lobby System
- [ ] Create `LobbyUI.tscn`:
  - Room creation/joining
  - Player ready states
  - Room code display
  - Start game button

- [ ] Implement matchmaking:
  - HTTPRequest for API calls
  - Room discovery
  - Player authentication

### Phase 7: Audio System (Week 4)

#### 7.1 Audio Manager Setup
- [ ] Create `AudioManager.gd`:
  - Bus configuration
  - Sound pooling
  - Music playlist
  - Volume controls

- [ ] Setup audio buses:
  - Master
  - SFX
  - Music
  - UI

#### 7.2 Sound Implementation
- [ ] Add AudioStreamPlayer nodes:
  - 2D for positional audio
  - Regular for UI sounds
  - Randomizer for variations

- [ ] Implement music system:
  - Playlist management
  - Crossfading
  - Loop points

### Phase 8: Polish & Effects (Week 4-5)

#### 8.1 Visual Polish
- [ ] Create particle effects:
  - Attack impact (CPUParticles2D)
  - Movement dust
  - Elimination burst
  - Selection glow

- [ ] Add animations:
  - Pawn movement (Tween)
  - Card flip (AnimationPlayer)
  - UI transitions
  - Camera shake

#### 8.2 Shaders & Effects
- [ ] Create highlight shader:
  - Outline effect
  - Glow effect
  - Team color tinting

- [ ] Implement post-processing:
  - Screen shake
  - Victory effects
  - Transition effects

### Phase 9: Optimization (Week 5)

#### 9.1 Performance Optimization
- [ ] Mobile-specific optimizations:
  - Texture atlasing
  - Draw call batching
  - Object pooling
  - LOD system

- [ ] Memory management:
  - Resource preloading
  - Unused asset cleanup
  - Scene management

#### 9.2 Platform-Specific Features
- [ ] Android features:
  - Back button handling
  - Immersive mode
  - Google Play integration

- [ ] iOS features:
  - Safe area handling
  - Game Center integration
  - Haptic feedback

### Phase 10: Testing & Export (Week 5-6)

#### 10.1 Testing Framework
- [ ] Create test scenes:
  - Unit tests for game logic
  - Integration tests
  - Performance benchmarks

- [ ] Device testing:
  - Export templates setup
  - Debug APK creation
  - iOS provisioning

#### 10.2 Export Configuration
- [ ] Android export:
  - Keystore generation
  - Permissions setup
  - Icon configuration
  - Google Play preparation

- [ ] iOS export:
  - Xcode project setup
  - Certificates/provisioning
  - App Store assets
  - TestFlight setup

---

## 🎮 Development Tips for Humans

### Daily Workflow
1. **Godot Best Practices**:
   - Use scene inheritance for variants
   - Prefer signals over direct references
   - Use groups for batch operations
   - Keep scenes small and focused

2. **Mobile Testing**:
   - Use Remote Debug
   - Enable "Deploy with Remote Debug"
   - Test on actual devices weekly
   - Profile with monitors

3. **Code Organization**:
   - One script per node
   - Use typed GDScript
   - Document with comments
   - Follow style guide

### Common Godot Pitfalls
1. **Performance Issues**:
   - Don't use Node2D.position in loops
   - Cache node references
   - Use object pooling
   - Minimize draw calls

2. **Mobile Specific**:
   - Test touch input early
   - Handle screen rotation
   - Manage app lifecycle
   - Optimize texture imports

3. **Networking**:
   - Use reliable RPC for critical data
   - Implement client prediction
   - Handle peer disconnection
   - Validate on server

### Useful Godot Resources
- Official Docs: https://docs.godotengine.org/
- GDQuest Tutorials: https://www.gdquest.com/
- Godot Discord: https://discord.gg/godotengine
- Mobile Export Guide: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html

### Quick Reference
- **Scene Tree**: Main → Board → Pawns → UI
- **Autoloads**: GameConstants, GameState, Managers
- **Input Actions**: touch, move_camera, zoom
- **Layers**: Default, Pawns, UI, Effects

---

## 📊 Progress Tracking

### Milestone 1: Core Prototype (Week 2)
- [ ] Board renders with grid
- [ ] Pawns spawn correctly
- [ ] Basic movement works
- [ ] Touch input functional

### Milestone 2: Game Loop (Week 3)
- [ ] All phases work
- [ ] Cards can be created/linked
- [ ] Combat system functional
- [ ] Win conditions detected

### Milestone 3: Multiplayer (Week 4)
- [ ] WebSocket connection works
- [ ] Games can be created/joined
- [ ] State synchronization stable
- [ ] Disconnection handled

### Milestone 4: Polish (Week 5)
- [ ] All audio implemented
- [ ] Visual effects complete
- [ ] Performance optimized
- [ ] Platform features work

### Milestone 5: Release (Week 6)
- [ ] Extensive testing done
- [ ] Export process documented
- [ ] Store assets ready
- [ ] Launch plan prepared

---

## 🛠️ Debugging Commands

### Useful Godot Debugging
```gdscript
# Print to console
print("Debug: ", variable)

# Visual debugging
get_tree().debug_collisions_hint = true

# Performance monitoring
Performance.get_monitor(Performance.TIME_FPS)

# Remote debugging
OS.has_feature("debug")
```

### Export Testing
```bash
# Android debug build
godot --export-debug "Android" game.apk

# Run with verbose output
godot --verbose --export "Android" game.apk
```