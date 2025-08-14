# AI Learning System

An adaptive AI system for the Fog of War game that learns from gameplay patterns and adjusts difficulty dynamically.

## Features

### 🧠 Intelligent Decision Making
- **Card Strategy Learning**: Analyzes winning patterns and generates counter-strategies
- **Move Evaluation**: Multi-factor scoring system considering haven distance, threats, and opportunities
- **Pattern Recognition**: Identifies and learns from successful gameplay patterns
- **Adaptive Difficulty**: Maintains target win rates for each difficulty level

### 📊 Performance Targets
- **Easy Mode**: 70-80% player win rate (player-friendly)
- **Medium Mode**: 45-55% player win rate (balanced)
- **Hard Mode**: 20-30% player win rate (challenging)

## Architecture

```
ai-system/
├── models/
│   ├── CardStrategyLearner.js    # Card pattern analysis
│   ├── MoveEvaluator.js          # Move scoring system
│   └── PatternAnalyzer.js        # Gameplay pattern recognition
├── storage/
│   └── GameAnalytics.js          # Data persistence & analytics
├── difficulty/
│   └── LearningAI.js             # Main AI controller
└── singleplayer-integration.js   # Game integration bridge
```

## How It Works

### 1. Data Collection
Every game generates events that are logged and analyzed:
- Card definitions and strategies
- Pawn linking decisions
- Movement patterns
- Attack decisions
- Game outcomes

### 2. Pattern Analysis
The system identifies successful patterns:
- Winning card combinations
- Effective positioning strategies
- Successful move sequences
- Counter-strategies that work

### 3. Adaptive Learning
The AI adjusts its behavior based on performance:
- Updates decision weights when win rates deviate from targets
- Learns counter-strategies for player patterns
- Builds an opening book of successful starts
- Improves target selection and positioning

## Usage

### Playing with Learning AI
1. Start the game server: `npm start`
2. Visit http://localhost:8004
3. Select "Singleplayer" from the menu
4. Choose your difficulty level
5. The AI will automatically learn and adapt!

### Testing & Development
Visit the AI Test Panel at http://localhost:8004/ai-test.html to:
- Generate and test AI cards
- Visualize move evaluation
- Analyze historical patterns
- Export/import learning data
- Monitor performance statistics

### Console Monitoring
Look for these messages in the browser console:
```
[AI Patch] Learning AI system initialized successfully
[AI Integration] Learning AI initialized with difficulty: medium
[AI Patch] Using learning AI for card generation
[AI Patch] Using learning AI for move selection
```

## API Reference

### Global Functions (available in browser console)

```javascript
// Check if learning AI is enabled
isLearningAIEnabled()  // returns boolean

// Get AI performance statistics
await getAIStats()  // returns stats object

// Export learning data
await exportAIData()  // downloads JSON file

// Import learning data
await importAIData(data)  // loads JSON data

// Set difficulty
setSingleplayerDifficulty('easy' | 'medium' | 'hard')
```

## Data Persistence

The AI system uses IndexedDB to store:
- Game history and events
- Learned patterns and strategies
- Performance metrics
- Win rate statistics

Data persists across browser sessions and improves over time.

## Customization

### Adjusting Difficulty Weights
Edit `models/MoveEvaluator.js` to modify decision weights:
```javascript
weights: {
    easy: {
        havenDistance: 0.4,      // Focus on reaching haven
        threatLevel: 0.1,         // Ignore threats
        attackOpportunity: 0.2,   // Some aggression
        territoryControl: 0.1,    // Basic positioning
        pawnSafety: 0.1,         // Minimal safety
        randomness: 0.1          // Add unpredictability
    }
}
```

### Modifying Card Strategies
Edit `models/CardStrategyLearner.js` to add new presets or strategies.

### Changing Win Rate Targets
Edit `difficulty/LearningAI.js`:
```javascript
getTargetWinRate() {
    switch (this.difficulty) {
        case 'easy': return 0.25;    // AI wins 25% (player wins 75%)
        case 'medium': return 0.5;   // AI wins 50%
        case 'hard': return 0.75;    // AI wins 75%
    }
}
```

## Performance

The learning system is designed to have minimal impact on game performance:
- Async operations for data storage
- Caching of frequently used evaluations
- Batch processing of historical data
- Fallback to standard AI if learning fails

## Future Enhancements

- [ ] Neural network integration for deeper learning
- [ ] Player-specific adaptation (ghost AI)
- [ ] Real-time difficulty adjustment
- [ ] Advanced endgame evaluation
- [ ] Tournament mode with AI personalities

## Troubleshooting

### AI Not Learning
1. Check browser console for errors
2. Verify IndexedDB is enabled in browser
3. Clear browser cache and reload
4. Check that `singleplayer-ai-patch.js` is loaded

### Performance Issues
1. Export and clear old game data
2. Reduce historical game limit in analytics
3. Disable learning temporarily with console

### Data Issues
1. Export current data as backup
2. Clear all data with `clearAILearningData()`
3. Reimport backup if needed