# Mobile UI Test Flow

## Overview
A completely redesigned mobile-first UI for Fog of War with touch-optimized controls and responsive design.

## Testing the Mobile UI

### Quick Start
1. Open `mobile-test.html` in your browser
2. Use Chrome DevTools to enable mobile device emulation (F12 → Toggle device toolbar)
3. Select a mobile device preset (e.g., iPhone 12 Pro, Pixel 5)

### Test Features

#### Navigation
- **Hamburger Menu** (☰): Slide-out menu with game options
- **Info Button** (ⓘ): Pull-down panel showing game stats
- **Swipe Gestures**: 
  - Swipe right from left edge to open menu
  - Swipe left to close menu
  - Swipe up on card panel handle to open cards
  - Swipe down to close cards

#### Lobby Features
- **Create Battle**: Creates a new game with room code
- **Join Battle**: Enter 6-letter room code to join
- **Quick Play**: Instant matchmaking
- **Active Games List**: Shows public games with refresh button

#### Game Features
- **Touch-Optimized Board**: Pinch to zoom, drag to pan
- **Card Panel**: Swipe-up panel for unit management
  - Preset configurations (Scout, Tank, Assault)
  - Touch-friendly number inputs
  - Visual validation (red for invalid totals)
- **Action Bar**: Quick access buttons at bottom
  - Cards, Chat, End Turn
- **Chat System**: Slide-in chat panel with notifications

#### Mobile-Specific Optimizations
- Large touch targets (min 44px)
- No hover states on touch devices
- Optimized for portrait and landscape
- Responsive breakpoints:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

### Test Functions (Console)
```javascript
// Available via window.mobileTest
mobileTest.showVictory()     // Show victory screen
mobileTest.startGame()        // Start a game
mobileTest.showToast('msg')   // Show toast notification
mobileTest.toggleCardPanel()  // Toggle card panel
mobileTest.toggleChat()       // Toggle chat panel
mobileTest.addMessage('msg')  // Add chat message
mobileTest.state             // View current state
```

## Key Improvements Over Original UI

### Mobile-First Design
- **Responsive Layout**: Adapts to any screen size
- **Touch Gestures**: Native swipe and drag interactions
- **Thumb-Friendly**: Bottom navigation for easy reach
- **No Desktop Clutter**: Hidden panels that slide in when needed

### Better Organization
- **Contextual UI**: Only shows relevant controls for current phase
- **Progressive Disclosure**: Information appears when needed
- **Clear Visual Hierarchy**: Important actions are prominent
- **Consistent Patterns**: Similar interactions throughout

### Performance
- **Hardware Acceleration**: CSS transforms for smooth animations
- **Touch Optimization**: Disabled zoom, fast tap response
- **Efficient Rendering**: Only visible content is rendered

### Accessibility
- **Large Touch Targets**: Minimum 44px for all interactive elements
- **High Contrast**: Clear text on all backgrounds
- **Visual Feedback**: Active states for all interactions
- **Screen Reader Support**: ARIA labels where needed

## Color Scheme
- Primary: `#2c3e50` (Dark blue-gray)
- Secondary: `#34495e` (Lighter blue-gray)
- Player 1: `#e74c3c` (Red)
- Player 2: `#3498db` (Blue)
- Success: `#27ae60` (Green)
- Warning: `#f39c12` (Orange)

## Typography
- Headers: Cinzel (decorative serif)
- Body: Inter (clean sans-serif)
- Monospace: System mono (room codes)

## Testing Checklist
- [ ] Portrait mode navigation
- [ ] Landscape mode layout
- [ ] Swipe gestures work smoothly
- [ ] Card panel drag interaction
- [ ] Chat notifications appear
- [ ] Unit selection and validation
- [ ] Room code copy functionality
- [ ] Loading states display correctly
- [ ] Toast notifications are visible
- [ ] Victory screen animations

## Browser Support
- iOS Safari 12+
- Chrome Mobile 80+
- Firefox Mobile 68+
- Samsung Internet 10+

## Known Limitations
- This is a test UI without server connection
- Game board is placeholder (simple grid)
- No actual multiplayer functionality
- Physics not implemented in test