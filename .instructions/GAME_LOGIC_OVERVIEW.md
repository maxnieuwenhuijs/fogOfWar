# Game Logic Overview

This document provides a detailed breakdown of the game's structure, phases, and the key functions that control the game flow.

## Game Structure: Cycles and Rounds

The game is divided into **Cycles**. A cycle represents a full sequence of play, from setting up forces to combat, and concludes when no pawns can act. A new cycle begins after the previous one ends, resetting the board for a new round of setup and action.

Each cycle contains a **Setup Phase** which is composed of three **Rounds**.

-   **Cycle**: The main loop of the game. A cycle ends when all pawns have exhausted their stamina.
-   **Round**: Each Setup Phase has three rounds of card definition and linking, allowing players to build up their forces.

---

## Game Phases

The game progresses through a series of distinct phases, managed by the server and communicated to the clients.

### 1. Pre-Game (`PRE_GAME` & `WAITING_FOR_PLAYER2`)

-   **Description**: The initial state when a game room is created. The game waits for two players to join and ready up.
-   **Events**: `createGame`, `joinGame`, `playerReady`.
-   **Result**: When both players are ready, the server initiates the first cycle and the game transitions to the Setup Phase.

### 2. Setup Phase (`SETUP_1_DEFINE` -> `SETUP_3_LINKING`)

This phase repeats for three rounds. Each round allows players to define a set of three cards and link them to pawns on the board.

#### a. Define Phase (`SETUP_X_DEFINE`)

-   **Description**: Players secretly allocate stats (HP, Stamina, Attack) for their three cards for the round. The total for each card must sum to 7. Turns alternate, with Player 1 defining in rounds 1 and 3, and Player 2 in round 2.
-   **Client Logic**: `handleCardDefinition()` manages the UI for inputting card stats.
-   **Server Logic**: The `defineCards` event handler collects card data from each player.

#### b. Reveal Phase (`SETUP_X_REVEAL`)

-   **Description**: Once both players submit their cards, the server reveals them to both players. It calculates the total Attack and Stamina for each player's set of cards to determine who has the **initiative** for the linking phase.
-   **Initiative Rules**:
    1.  Highest total Attack wins initiative.
    2.  If Attack is tied, highest total Stamina wins.
    3.  If both are tied, a **Rock-Paper-Scissors (`RPS_TIEBREAKER`)** round occurs.
-   **Server Logic**: The server compares stats and emits a `cardsRevealed` event with all card data and the initiative winner.

#### c. Linking Phase (`SETUP_X_LINKING`)

-   **Description**: The player with initiative goes first. Players take turns linking their newly defined cards to their pawns on the board. A linked pawn becomes "active" for the upcoming Action Phase. A player can only link one card per turn.
-   **Client Logic**: `handleLinkingPawnClick()` and `handleCardLinkSelection()` manage the UI for selecting a card and then a pawn to link it to.
-   **Server Logic**:
    -   The `linkCard` event handler validates and applies the link, making the server-side pawn active and assigning it the card's stats.
    -   `advanceLinkingTurnOrPhase()` is called to switch the turn to the other player.
    -   This continues until all defined cards from both players have been linked.

After three full rounds of Defining and Linking, the game transitions to the Action Phase.

### 3. Action Phase (`ACTION`)

-   **Description**: This is the combat phase. The player who won initiative in the final round (Round 3) of the Setup Phase gets the first turn. Players take alternating turns moving their pawns and attacking opponents.
-   **Turn Flow**:
    1.  A player selects an active pawn with `remainingStamina > 0`.
    2.  They perform a **move** or an **attack**.
    3.  The action is sent to the server.
    4.  The server validates, calculates the outcome (stamina cost, damage), and updates the game state.
    5.  The server broadcasts the result to both players via `actionPerformed`.
    6.  The server's `advanceTurnOrCycle` function is called. It checks if the opponent can act. If so, the turn switches. If not, the current player may act again.
-   **Stamina**: Stamina is the key resource in this phase. Moving costs stamina equal to the distance moved. Attacking costs 1 stamina. A pawn with 0 stamina cannot act.
-   **Ending the Phase**: The Action Phase ends and a `newCycle` begins when **no pawns on either team can take an action**. This occurs if all of a player's pawns either have 0 stamina, are unable to move to a valid spot (i.e., blocked), or have been eliminated.

---

## Key Functions

### Server-Side (`server.js`)

-   `advanceTurnOrCycle(io, room, roomCode, triggeredByPlayerCannotAct)`
    -   **The core of the action phase turn logic.**
    -   It is called after every `gameAction` or when a player manually ends their turn (`playerCannotAct`).
    -   It checks if the opponent can act. If so, it switches the turn to them.
    -   If the opponent cannot act, it checks if the current player can still act. If so, the turn continues for the same player.
    -   If neither player can act, it calls `startNewCycle()`.

-   `startNewCycle(io, room, roomCode)`
    -   Resets the game state for a new cycle.
    -   Increments the `cycleNumber`, resets `roundNumber` to 1.
    -   Resets all surviving pawns to be inactive, clearing their `currentHP`, `linkedCard`, and `remainingStamina`.
    -   Emits the `newCycle` event to clients to signal the start of a new Setup Phase.

-   `gameAction` (socket event handler)
    -   Processes player moves and attacks.
    -   Validates the action is legal.
    -   Calculates stamina deduction based on move distance or attack cost.
    -   Calculates combat outcomes (damage dealt, pawn elimination).
    -   Broadcasts the results via the `actionPerformed` event.
    -   Calls `advanceTurnOrCycle()` to determine the next turn.

### Client-Side (`public/js/game-logic.js`)

-   `initializeGameSocketEvents()`
    -   Sets up all the listeners for events from the server, such as `nextTurn`, `actionPerformed`, and `newCycle`. This function is the primary way the client reacts to changes in the game state.

-   `handlePlayerTurn()`
    -   Called when the client receives a `nextTurn` event.
    -   It unlocks the UI for the current player and checks if they have any valid moves available using `canPlayerAct()`.
    -   If no moves are available, it automatically informs the server by emitting `playerCannotAct`.

-   `onPawnClick(pawn)`
    -   A versatile handler that determines what to do when a pawn is clicked based on the current game phase.
    -   During the **Linking Phase**, it calls `handleLinkingPawnClick()`.
    -   During the **Action Phase**, it selects the pawn for a move/attack.

-   `handleMoveAction(pawn, targetGridX, targetGridY)` & `handleAttackAction(attackerPawn, defenderPawn)`
    -   These functions are called after a player has selected a pawn and a valid target.
    -   They lock the UI to prevent further input ("Waiting for Turn").
    -   They emit the `gameAction` event to the server with the action details.
    -   They trigger optimistic local animations for the action.
