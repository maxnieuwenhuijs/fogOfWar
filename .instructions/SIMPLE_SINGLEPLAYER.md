# Simple Singleplayer Implementation Guide

## Overview

This document outlines a **minimalist approach** to implementing singleplayer mode for the Fog of War game. Instead of building complex AI systems and state management, we simply **intercept multiplayer events** and simulate server responses locally.

## Core Philosophy

**"Don't rebuild the game, just simulate the other player"**

The multiplayer game already works perfectly. For singleplayer, we:

1. Override the socket connection to handle events locally
2. Simulate server responses exactly as they would appear in multiplayer
3. Let the existing game logic handle everything else
4. Add simple AI decision-making where player 2 would normally act

## Architecture

### File Structure

```
public/js/
├── singleplayer-simple.js   # Core singleplayer implementation (~300 lines)
├── game-logic.js            # Existing game logic (minimal changes)
├── menu-system.js           # Menu system (1 line change)
└── [other existing files]   # No changes needed
```

### Key Components

#### 1. Socket Override (`singleplayer-simple.js`)

```javascript
window.socket = {
	emit: function (eventName, data) {
		// Intercept all socket emissions
		switch (eventName) {
			case "defineCards":
				handleSingleplayerDefineCards(data);
				break;
			case "linkCard":
				handleSingleplayerLinkCard(data);
				break;
			case "moveAction":
				handleSingleplayerMove(data);
				break;
			// ... etc
		}
	},
};
```

#### 2. Simple AI Decision Making

```javascript
// AI card definition - just use balanced presets
const aiCards = [
	{ hp: 3, stamina: 2, attack: 2 },
	{ hp: 2, stamina: 3, attack: 2 },
	{ hp: 1, stamina: 1, attack: 5 },
];

// AI linking - link cards to pawns in order
const card = aiCards[0];
const pawn = availablePawns[0];
linkCardToPawn(card, pawn);

// AI actions - simple forward movement
if (pawn.gridY < 10) {
	movePawn(pawn, pawn.gridX, pawn.gridY + 1);
}
```

## Implementation Steps

### Step 1: Create Socket Override

When singleplayer mode starts, replace the global `socket` object with a local handler:

```javascript
function overrideSocketForSingleplayer() {
	window.socket = {
		emit: function (eventName, data) {
			console.log("Singleplayer handling:", eventName);
			// Route to appropriate handler
			handleSingleplayerEvent(eventName, data);
		},
		on: function () {}, // Dummy function
	};

	// Also create fake session
	window.gameSession = {
		roomCode: "SINGLE",
		playerNumber: 1,
	};
}
```

### Step 2: Handle Game Events Locally

#### Card Definition Phase

```javascript
function handleSingleplayerDefineCards(data) {
	// 1. Store player's cards
	gameState.players[1].cardsDefinedThisRound = data.cards;

	// 2. Generate AI cards (simple balanced strategy)
	const aiCards = generateAICards();
	gameState.players[2].cardsDefinedThisRound = aiCards;

	// 3. Trigger the same UI updates as multiplayer
	setTimeout(() => {
		gameState.currentPhase = "SETUP1_LINKING";
		handleCardsRevealed({
			player1Cards: data.cards,
			player2Cards: aiCards,
		});
		handleLinkingPhase();
	}, 500);
}
```

#### Linking Phase

```javascript
function handleSingleplayerLinkCard(data) {
	// 1. Process player's link
	const pawn = findPawn(data.pawnId);
	const card = findCard(data.cardId);
	linkPawnWithCard(pawn, card);

	// 2. Check if player done linking
	if (playerDoneLinking()) {
		// 3. AI links its cards
		setTimeout(() => {
			aiLinkCards();
		}, 1000);
	}
}

function aiLinkCards() {
	// Simple strategy: link in order
	while (aiHasCardsToLink()) {
		const card = aiCards[0];
		const pawn = aiPawns[0];
		linkPawnWithCard(pawn, card);
	}

	// Check phase advancement
	if (bothPlayersDoneLinking()) {
		advancePhase();
	}
}
```

#### Action Phase

```javascript
function handleSingleplayerMove(data) {
	// Process player move
	movePawn(data.pawnId, data.toX, data.toY);

	// Check turn end
	if (playerTurnComplete()) {
		// AI takes turn
		setTimeout(() => aiTakeTurn(), 1000);
	}
}

function aiTakeTurn() {
	// Simple AI: move pawns forward
	for (const pawn of aiPawns) {
		if (canReachHaven(pawn)) {
			moveToHaven(pawn);
			return;
		}
		if (enemyAdjacent(pawn)) {
			attackEnemy(pawn);
			return;
		}
		moveForward(pawn);
	}
	endTurn();
}
```

### Step 3: Initialize Singleplayer Game

```javascript
function initSimpleSingleplayer() {
	// 1. Set initial state
	gameState.singleplayerMode = true;
	gameState.playerNumber = 1;
	gameState.currentPhase = "SETUP1_DEFINE";
	gameState.currentPlayer = 1;

	// 2. Override socket
	overrideSocketForSingleplayer();

	// 3. Show game screen
	showScreen("game");

	// 4. Initialize game normally
	initGame();
}
```

## Game Flow

### Phase Progression

```
SETUP1_DEFINE → SETUP1_LINKING →
SETUP2_DEFINE → SETUP2_LINKING →
SETUP3_DEFINE → SETUP3_LINKING →
ACTION
```

### Turn Flow in Each Phase

#### Define Phase

1. Player defines 3 cards
2. AI automatically defines 3 cards
3. Both cards revealed
4. Advance to linking

#### Linking Phase

1. Player links cards to pawns (up to 3)
2. When player done, AI links its cards
3. Repeat until all 9 cards linked
4. Advance to next phase

#### Action Phase

1. Player moves/attacks with pawns
2. Player ends turn
3. AI moves/attacks with its pawns
4. AI ends turn
5. Repeat until game ends

## AI Strategy

### Card Definition

Use pre-defined balanced card sets:

```javascript
const strategies = [
	// Balanced
	[
		{ hp: 3, stamina: 2, attack: 2 },
		{ hp: 2, stamina: 3, attack: 2 },
		{ hp: 1, stamina: 1, attack: 5 },
	],
	// Aggressive
	[
		{ hp: 2, stamina: 2, attack: 3 },
		{ hp: 2, stamina: 1, attack: 4 },
		{ hp: 1, stamina: 2, attack: 4 },
	],
	// Defensive
	[
		{ hp: 4, stamina: 1, attack: 2 },
		{ hp: 3, stamina: 2, attack: 2 },
		{ hp: 2, stamina: 3, attack: 2 },
	],
];
```

### Pawn Linking

- High HP cards → Front row pawns
- High attack cards → Middle pawns
- High stamina cards → Side pawns

### Action Phase Decisions

Priority order:

1. **Win**: If can reach enemy haven, do it
2. **Attack**: If enemy adjacent, attack
3. **Advance**: Move toward enemy haven
4. **Position**: Move to better position

## Testing Checklist

### Phase Transitions

- [ ] SETUP1_DEFINE → SETUP1_LINKING works
- [ ] SETUP1_LINKING → SETUP2_DEFINE works
- [ ] SETUP2_LINKING → SETUP3_DEFINE works
- [ ] SETUP3_LINKING → ACTION works

### Card Definition

- [ ] Player can define cards
- [ ] AI defines cards automatically
- [ ] Cards are revealed correctly
- [ ] UI updates properly

### Linking

- [ ] Player can link cards to pawns
- [ ] AI links cards after player
- [ ] Visual feedback works
- [ ] Phase advances after 9 cards linked

### Action Phase

- [ ] Player can move pawns
- [ ] Player can attack
- [ ] AI takes turns
- [ ] Turn switching works
- [ ] Game ends properly

## Common Issues & Solutions

### Issue: Socket is undefined

**Solution**: Ensure `overrideSocketForSingleplayer()` is called before any game logic

### Issue: AI doesn't respond

**Solution**: Check that `gameState.currentPlayer` is being switched correctly

### Issue: UI doesn't update

**Solution**: Call the same UI functions that multiplayer uses (e.g., `handleCardsRevealed`)

### Issue: Phase doesn't advance

**Solution**: Ensure both players have completed their actions for the phase

## Benefits of This Approach

1. **Minimal Code Changes**: ~300 lines of new code, 1 line changed in existing code
2. **Maintains Compatibility**: Multiplayer still works exactly as before
3. **Easy to Debug**: All logic flows through the same paths as multiplayer
4. **Simple AI**: No complex decision trees or state machines
5. **Fast Development**: Can be implemented in hours, not days

## Future Enhancements

Once the basic singleplayer works, you can enhance:

1. **Smarter AI**: Add difficulty levels with different strategies
2. **AI Personalities**: Aggressive, defensive, balanced playstyles
3. **Performance**: Cache AI decisions for faster response
4. **Visual Polish**: Add "thinking" animations for AI turns
5. **Statistics**: Track win/loss ratios per difficulty

## Code Example: Complete Minimal Implementation

```javascript
// singleplayer-simple.js - Complete minimal implementation
(function () {
	// Initialize singleplayer
	window.initSimpleSingleplayer = function () {
		gameState.singleplayerMode = true;
		gameState.playerNumber = 1;
		gameState.currentPhase = "SETUP1_DEFINE";
		gameState.currentPlayer = 1;

		// Override socket
		window.socket = {
			emit: handleEmit,
			on: function () {},
		};

		window.gameSession = {
			roomCode: "SINGLE",
			playerNumber: 1,
		};

		// Start game
		showScreen("game");
		setTimeout(initGame, 100);
	};

	// Handle all socket emissions
	function handleEmit(event, data) {
		console.log("Singleplayer:", event);

		switch (event) {
			case "defineCards":
				// Store player cards
				gameState.players[1].cards = data.cards;

				// AI defines cards
				gameState.players[2].cards = [
					{ hp: 3, stamina: 2, attack: 2 },
					{ hp: 2, stamina: 3, attack: 2 },
					{ hp: 1, stamina: 1, attack: 5 },
				];

				// Advance to linking
				setTimeout(() => {
					gameState.currentPhase = "SETUP1_LINKING";
					handleLinkingPhase();
				}, 500);
				break;

			// ... handle other events
		}
	}
})();
```

## Conclusion

This simple approach leverages the existing, working multiplayer code by just simulating the missing player. It's maintainable, debuggable, and can be enhanced incrementally without breaking the core game.
