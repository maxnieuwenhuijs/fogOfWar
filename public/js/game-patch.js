// --- START OF FILE public/js/game-patch.js ---

console.log("🔧 Game patch loading...");

// Function to patch the game when it's ready
function patchGame() {
  // Don't start patching until we're actually in a game mode
  if (!window.gameStarted) {
    return;
  }

  // Don't patch multiple times
  if (window._gamePatched) {
    return;
  }

  // In single player mode, we don't need socket
  if (typeof gameSession === "undefined" || (typeof socket === "undefined" && !window.gameState?.singleplayerMode)) {
    // Reduce console spam
    if (!window._patchRetryCount) window._patchRetryCount = 0;
    if (window._patchRetryCount++ % 10 === 0) {
      console.log("Game not ready, waiting...");
    }
    setTimeout(patchGame, 100);
    return;
  }

  window._gamePatched = true;
  console.log("🔧 Patching game...");
  if (typeof gameSession.initialGameState === "undefined") {
    gameSession.initialGameState = null;
  }

  // Only set up socket handlers for multiplayer
  if (!window.gameState?.singleplayerMode) {
    if (socket && socket.off) {
      console.log("🔧 Removing existing gameStart handlers.");
      socket.off("gameStart");
    } else {
      console.log("🔧 Could not remove existing gameStart handlers.");
    }

    socket.on("gameStart", function (receivedGameState) {
      console.log("🔧 PATCHED - gameStart received:", receivedGameState);
      if (
        receivedGameState.currentPlayer === undefined ||
        receivedGameState.currentPlayer === null
      ) {
        console.error("!!! Server missing 'currentPlayer' in 'gameStart' !!!");
      }
      gameSession.initialGameState = {
        currentPhase: receivedGameState.currentPhase,
        cycleNumber: receivedGameState.cycleNumber,
        roundNumber: receivedGameState.roundNumber,
        currentPlayer: receivedGameState.currentPlayer,
      };
      console.log("🔧 Captured initial state:", gameSession.initialGameState);
      if (typeof showScreen === "function" && typeof initGame === "function") {
        showScreen("game");
        initGame();
      } else {
        console.error("!!! showScreen or initGame not found !!!");
      }
    });
  }
  console.log("🔧 Game patched successfully.");
}

// Mark patch function as ready but don't start it yet
window.patchGameReady = true;

// Start patching only when game mode is selected
window.startGamePatch = function () {
  window.gameStarted = true;
  patchGame();
};

// Define endTurn function immediately (before fixAllCycles needs it)
console.log("🔧 Patching window.endTurn...");
window.endTurn = function () {
  // Safety checks
  if (typeof gameState === "undefined") {
    console.log("🔧 endTurn called but gameState not available yet");
    return;
  }
  if (
    gameState.currentPhase === "GAME_OVER" ||
    gameState.currentPhase === "WAITING_FOR_TURN"
  )
    return;
  console.log(`🔧 Patched endTurn check triggered`);

  // Turn should switch after each pawn action - simplified version for now
  console.log("🔧 Patched endTurn: Requesting turn switch after pawn action.");

  const gameOver =
    typeof checkWinCondition === "function" ? checkWinCondition() : false;
  if (
    !gameOver &&
    typeof socket !== "undefined" &&
    typeof gameSession !== "undefined"
  ) {
    console.log("🔧 Sending playerCannotAct event because End Turn button was pressed.");
    socket.emit("playerCannotAct", { roomCode: gameSession.roomCode });
  } else if (gameOver) {
    console.log("🔧 Game over, not sending playerCannotAct.");
  } else {
    console.error("🔧 Cannot emit endCycle - socket/gameSession missing.");
  }
};

// Helper function to check if a player's pawns can act
function canPlayerAct(pawns) {
  const activePawns = pawns.filter(p => p?.isActive && p.remainingStamina > 0);

  return activePawns.some(pawn => {
    // Check if pawn can move (has valid moves available)
    const possibleMoves = typeof getPossibleMoves === 'function' ? getPossibleMoves(pawn) : [];
    if (possibleMoves.length > 0) return true;

    // Check if pawn can attack (has valid attack targets)
    const attackTargets = typeof getValidAttackTargets === 'function' ? getValidAttackTargets(pawn) : [];
    if (attackTargets.length > 0) return true;

    return false;
  });
}

console.log("🔧 endTurn patched (cycle check only).");

// Function to patch cycle logic
function fixAllCycles() {
  // Don't start until game has started
  if (!window.gameStarted) {
    return;
  }

  // Don't run multiple times
  if (window._cyclesFixed) {
    return;
  }

  console.log("🔧 Setting up complete cycle fix...");

  // In single player mode, we don't need socket
  if (
    typeof gameState === "undefined" ||
    (typeof socket === "undefined" && !window.gameState?.singleplayerMode)
  ) {
    setTimeout(fixAllCycles, 500);
    return;
  }

  window._cyclesFixed = true;



  // endTurn is now defined globally above, no need to redefine here

  // Patch newCycle listener only for multiplayer
  if (socket && !window.gameState?.singleplayerMode) {
    socket.off("newCycle");
    console.log("🔧 Cleared old newCycle listeners.");
    socket.on("newCycle", function (data) {
      console.log("🔧 PATCHED newCycle received:", data);

      // --- FIX: Check if game is already over locally ---
      if (gameState.currentPhase === "GAME_OVER") {
        console.log("🔧 PATCHED newCycle: Game already over locally. Ignoring.");
        return; // Do nothing if game is finished
      }
      // --- END FIX ---

      gameState.cycleNumber = data.cycleNumber;
      gameState.roundNumber = data.roundNumber;
      gameState.currentPhase = data.currentPhase;
      gameState.currentPlayer = data.currentPlayer;
      console.log(
        `🔧 Starting cycle ${gameState.cycleNumber}, R${gameState.roundNumber}, P${gameState.currentPlayer}`
      );

      // Play setup sound at the start of EACH cycle via the patch
      if (typeof soundManager !== "undefined") {
        console.log(
          `🔊 Playing setup sound for Cycle ${gameState.cycleNumber} start (via patch).`
        );
        soundManager.playSound("ui_setup");
      }

      (gameState.players?.[1]?.pawns || []).forEach((p) => {
        if (p?.pixiObject) {
          p.isActive = false;
          p.currentHP = null;
          p.linkedCard = null;
          p.hasActedThisCycle = false;
          if (typeof p.hideStatsDisplay === "function") p.hideStatsDisplay();
          if (typeof p.updateBars === "function") p.updateBars();
          if (typeof p.setHighlight === "function") p.setHighlight(false);
          p.pixiObject.alpha = 1.0;
        }
      });
      (gameState.players?.[2]?.pawns || []).forEach((p) => {
        if (p?.pixiObject) {
          p.isActive = false;
          p.currentHP = null;
          p.linkedCard = null;
          p.hasActedThisCycle = false;
          if (typeof p.hideStatsDisplay === "function") p.hideStatsDisplay();
          if (typeof p.updateBars === "function") p.updateBars();
          if (typeof p.setHighlight === "function") p.setHighlight(false);
          p.pixiObject.alpha = 1.0;
        }
      });
      gameState.activePawnsThisCycle[1] = [];
      gameState.activePawnsThisCycle[2] = [];
      if (typeof handleCardDefinition === "function") {
        handleCardDefinition();
        try { if (gameState.currentPhase && gameState.currentPhase.endsWith('DEFINE')) { window.MobileUI?.setDrawerOpen?.(true); } } catch (_) { }
      } else {
        console.error("handleCardDefinition function not found!");
      }
    });
    console.log("🔧 Patched newCycle handler installed.");
  } else {
    console.error("🔧 Socket not ready for patching newCycle.");
  }
  console.log("🔧 Complete cycle fix installed.");
}

console.log("🔧 Cycle fix ready, will start when game starts.");
// Don't start immediately, wait for game to start
window.startCycleFix = function () {
  setTimeout(fixAllCycles, 150);
};

// --- END OF FILE public/js/game-patch.js ---
