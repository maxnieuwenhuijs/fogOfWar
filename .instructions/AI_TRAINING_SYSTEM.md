# AI Training and Difficulty System Specification

## Overview
This document outlines the implementation of an intelligent bot training system with three difficulty levels for the Fog of War game. The system will analyze gameplay logs to improve AI decision-making and provide challenging opponents at different skill levels.

## Difficulty Levels

### 1. Easy (Beginner-Friendly)
- **Target Win Rate**: Player wins 70-80% of games
- **Behavior**: Predictable, makes occasional suboptimal moves
- **Implementation**: Uses basic heuristics with intentional mistakes

### 2. Medium (Balanced Challenge)  
- **Target Win Rate**: Player wins 45-55% of games
- **Behavior**: Solid tactical play with some strategic depth
- **Implementation**: Uses improved heuristics and pattern recognition

### 3. Hard (Expert Opponent)
- **Target Win Rate**: Player wins 20-30% of games  
- **Behavior**: Optimal play with advanced strategies
- **Implementation**: Uses learned patterns from successful games + Monte Carlo simulations

## Data Collection System

### Gameplay Logging Structure
The system already logs key events via `window.SpLogger`. Extend logging to capture:

```javascript
// Session metadata
{
  sessionId: string,
  timestamp: number,
  difficulty: "easy" | "medium" | "hard",
  winner: 1 | 2,
  totalCycles: number,
  totalTurns: number
}

// Card definition events  
{
  event: "cards.defined",
  player: number,
  round: number,
  cards: [{hp, stamina, attack}],
  initiative: boolean
}

// Linking decisions
{
  event: "link.decision",
  player: number,
  cardStats: {hp, stamina, attack},
  pawnPosition: {x, y},
  pawnId: string
}

// Action decisions
{
  event: "action.decision",
  player: number,
  actionType: "move" | "attack",
  pawnState: {hp, stamina, position},
  targetPosition: {x, y} | null,
  targetPawn: {hp, position} | null,
  boardState: object // Simplified board representation
}
```

### Storage Strategy
1. **Local Storage**: Store last 100 games for immediate analysis
2. **IndexedDB**: Archive gameplay data for long-term pattern extraction
3. **Export Format**: JSON lines format for external analysis

## AI Improvement Mechanisms

### 1. Card Definition Strategy Learning

#### Pattern Recognition
- Analyze winning card combinations from player games
- Track counter-strategies that defeated specific card sets
- Build a weighted decision tree of successful card allocations

#### Implementation
```javascript
class CardStrategyLearner {
  // Analyze historical games to find successful patterns
  analyzeCardPatterns(gameHistory) {
    // Group by outcome (win/loss)
    // Calculate success rates for different stat distributions
    // Weight by recency and opponent skill
  }
  
  // Generate cards based on difficulty
  generateCards(difficulty, opponentCards = null) {
    switch(difficulty) {
      case 'easy':
        return this.getRandomPreset(); // Basic presets
      case 'medium':
        return this.getCounterStrategy(opponentCards); // React to opponent
      case 'hard':
        return this.getOptimalStrategy(opponentCards); // Use learned patterns
    }
  }
}
```

### 2. Pawn Linking Intelligence

#### Spatial Strategy Patterns
- **Front-line**: Link high HP pawns to front positions
- **Flanking**: Link high stamina pawns to sides for mobility
- **Artillery**: Link high attack pawns to protected positions

#### Learning Approach
1. Cluster successful linking patterns by game outcome
2. Identify position-stat correlations that lead to victories
3. Build position preference matrix for each card type

### 3. Action Phase Decision Making

#### Move Evaluation System
```javascript
class MoveEvaluator {
  evaluateMove(pawn, targetPos, gameState, difficulty) {
    const scores = {
      havenDistance: this.getHavenProximityScore(targetPos),
      threatLevel: this.getThreatScore(targetPos, gameState),
      attackOpportunity: this.getAttackPotential(targetPos, gameState),
      territoryControl: this.getControlScore(targetPos)
    };
    
    // Weight scores based on difficulty
    const weights = this.getDifficultyWeights(difficulty);
    return this.calculateWeightedScore(scores, weights);
  }
}
```

#### Attack Decision Matrix
- **Easy**: Attack if damage > 0, ignore counterattack risk
- **Medium**: Consider HP trade-offs, basic risk assessment  
- **Hard**: Full minimax evaluation of attack consequences

## Implementation Phases

### Phase 1: Data Collection Infrastructure (Week 1)
1. Extend SpLogger to capture all required events
2. Implement IndexedDB storage layer
3. Create data export/import utilities
4. Add session replay functionality for debugging

### Phase 2: Basic Difficulty System (Week 2)
1. Implement three difficulty presets with fixed strategies
2. Add difficulty selector to game UI
3. Create CardStrategyLearner with basic patterns
4. Implement position-based linking preferences

### Phase 3: Learning System (Week 3-4)
1. Build pattern analysis engine
2. Implement win rate tracking and adjustment
3. Create adaptive difficulty that adjusts based on player performance
4. Add Monte Carlo tree search for hard mode decisions

### Phase 4: Advanced Features (Week 5+)
1. Implement opening book for common starting patterns
2. Add endgame evaluation for optimal finishing moves
3. Create personality profiles (aggressive, defensive, balanced)
4. Build performance dashboard showing AI improvement metrics

## Difficulty-Specific Behaviors

### Easy Mode AI
```javascript
class EasyAI {
  // Intentionally suboptimal decisions
  makeMove() {
    const moves = this.getAllPossibleMoves();
    if (Math.random() < 0.3) {
      // 30% chance of random move
      return moves[Math.floor(Math.random() * moves.length)];
    }
    // Basic greedy strategy
    return this.getClosestToHavenMove();
  }
  
  defineCards() {
    // Use simple balanced presets
    return [
      {hp: 3, stamina: 2, attack: 2},
      {hp: 2, stamina: 3, attack: 2},
      {hp: 2, stamina: 2, attack: 3}
    ];
  }
}
```

### Medium Mode AI
```javascript
class MediumAI {
  makeMove() {
    // Evaluate immediate consequences
    const moves = this.getAllPossibleMoves();
    return moves.reduce((best, move) => {
      const score = this.evaluatePosition(move);
      return score > best.score ? {move, score} : best;
    }, {move: null, score: -Infinity}).move;
  }
  
  defineCards(opponentHistory) {
    // Adapt to opponent's previous choices
    if (opponentHistory.length > 0) {
      return this.counterLastStrategy(opponentHistory);
    }
    return this.getBalancedStrategy();
  }
}
```

### Hard Mode AI
```javascript
class HardAI {
  makeMove() {
    // Use minimax with alpha-beta pruning
    const bestMove = this.minimax(
      this.gameState,
      3, // Look 3 moves ahead
      -Infinity,
      Infinity,
      true
    );
    return bestMove.action;
  }
  
  defineCards(fullGameHistory) {
    // Use learned patterns and counter-strategies
    const patterns = this.analyzer.getWinningPatterns(fullGameHistory);
    const prediction = this.predictOpponentCards(fullGameHistory);
    return this.getOptimalCounter(prediction, patterns);
  }
  
  minimax(state, depth, alpha, beta, maximizing) {
    if (depth === 0 || state.isTerminal()) {
      return {score: this.evaluate(state), action: null};
    }
    
    if (maximizing) {
      let maxEval = -Infinity;
      let bestAction = null;
      for (const action of state.getPossibleActions()) {
        const newState = state.apply(action);
        const eval = this.minimax(newState, depth-1, alpha, beta, false);
        if (eval.score > maxEval) {
          maxEval = eval.score;
          bestAction = action;
        }
        alpha = Math.max(alpha, eval.score);
        if (beta <= alpha) break; // Pruning
      }
      return {score: maxEval, action: bestAction};
    } else {
      // Minimizing logic...
    }
  }
}
```

## Performance Metrics

### AI Quality Indicators
1. **Win Rate Stability**: Maintaining target win rates across 100+ games
2. **Decision Time**: Sub-200ms for easy/medium, sub-1000ms for hard
3. **Strategy Diversity**: Using at least 10 different card patterns
4. **Adaptation Rate**: Adjusting to player patterns within 5 games

### Learning Effectiveness
1. **Pattern Recognition**: Identify 80%+ of winning strategies
2. **Counter-Strategy Success**: Win 60%+ when countering known patterns
3. **Novel Strategy Discovery**: Find new winning patterns monthly

## Testing Strategy

### Unit Tests
- Test each difficulty level's decision making
- Verify learning algorithm convergence
- Validate move evaluation scoring

### Integration Tests  
- Simulate 1000 games per difficulty
- Verify win rate targets
- Test adaptation mechanisms

### A/B Testing
- Compare learned AI vs fixed strategies
- Measure player engagement and retention
- Track difficulty progression patterns

## Future Enhancements

### Neural Network Integration
- Train a lightweight neural network on gameplay data
- Use for position evaluation and move prediction
- Deploy via TensorFlow.js for client-side inference

### Multiplayer Ghost AI
- Train AI on specific player's gameplay style
- Create "ghost" opponents that play like real players
- Enable asynchronous multiplayer via AI proxies

### Dynamic Difficulty Adjustment
- Real-time difficulty scaling based on player performance
- Rubber-band AI that provides close matches
- Personalized challenge curves for player retention

## Implementation Notes

1. **Start Simple**: Begin with rule-based difficulty levels before adding learning
2. **Incremental Learning**: Update AI knowledge after each game, not batch processing
3. **Performance First**: Ensure AI decisions don't lag gameplay
4. **Transparent Difficulty**: Show players what difficulty they're facing
5. **Optional Analytics**: Allow players to opt-in to contributing gameplay data

## File Structure
```
/ai-system/
  /models/
    - CardStrategyLearner.js
    - MoveEvaluator.js  
    - PatternAnalyzer.js
  /difficulty/
    - EasyAI.js
    - MediumAI.js
    - HardAI.js
  /storage/
    - GameLogger.js
    - DataStore.js
    - Analytics.js
  /tests/
    - ai.test.js
    - learning.test.js
```

## Success Criteria
- Players report AI feels "smart but fair"
- Each difficulty provides appropriate challenge
- AI improves measurably over time
- System maintains <5% performance overhead
- Win rates stay within target ranges