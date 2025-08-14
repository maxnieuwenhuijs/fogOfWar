// --- START OF FILE public/js/game-logic.js ---

// Game Setup Variables
// 'app' and 'highlightContainer' are assumed to be global or accessible via 'main.js' scope
let selectedCardToLink = null;
let rpsTimerId = null; // Timer for RPS choices
const rpsOptions = ['rock', 'paper', 'scissors']; // Available RPS choices

const TimerManager = {
  timerId: null,
  timerDiv: null,
  timerCount: null,

  init() {
    this.timerDiv = document.getElementById("phase-timer");
    this.timerCount = document.getElementById("phase-timer-count");
    console.log("⏰ TimerManager initialized.");
  },

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.timerDiv) {
      this.timerDiv.style.display = "none";
    }
  },

  start(seconds, onEndCallback) {
    this.stop();

    if (!this.timerDiv || !this.timerCount) {
      this.init();
      if (!this.timerDiv || !this.timerCount) {
        console.error("Timer UI elements not found, cannot start timer.");
        return;
      }
    }

    this.timerDiv.style.display = "block";
    this.timerCount.textContent = seconds;

    let remaining = seconds;
    this.timerId = setInterval(() => {
      remaining--;
      this.timerCount.textContent = remaining;

      if (remaining <= 0) {
        this.stop();
        if (onEndCallback) {
          console.log("⏰ Timer ended, executing callback.");
          onEndCallback();
        }
      }
    }, 1000);
  }
};

function autoLinkAction() {
  if (gameState.currentPhase.endsWith("LINKING") && gameState.currentPlayer === gameState.playerNumber) {
    const availableCards = (gameState.players[gameState.playerNumber]?.cardsAvailableForLinking || []).filter(card => card && !card.isLinked);
    const availablePawns = (gameState.players[gameState.playerNumber]?.pawns || []).filter(pawn => pawn && !pawn.isActive && !pawn.linkedCard);

    if (availableCards.length > 0 && availablePawns.length > 0 && typeof socket !== "undefined" && typeof gameSession !== "undefined") {
      const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      const randomPawn = availablePawns[Math.floor(Math.random() * availablePawns.length)];
      showToast("⏳ Time's up! Randomly linking a card.");
      socket.emit("linkCard", { roomCode: gameSession.roomCode, cardId: randomCard.id, pawnId: randomPawn.id });
      if (typeof soundManager !== "undefined") { soundManager.playSound("ui_link"); }
    } else {
      showToast("⏳ Time's up! Skipping linking.");
      socket.emit("playerCannotLink", { roomCode: gameSession.roomCode });
    }
  }
}

// --- Helper Functions ---
function gridToPixel(x, y) {
  const size = typeof CELL_SIZE !== "undefined" ? CELL_SIZE : 50;
  return { x: x * size, y: y * size };
}

function pixelToGrid(x, y) {
  const size = typeof CELL_SIZE !== "undefined" ? CELL_SIZE : 50;

  // Account for stage scaling and offset when converting pixel to grid
  if (typeof app !== "undefined" && app && app.stage) {
    // Get the current stage transformation
    const stageScale = app.stage.scale.x; // Assuming uniform scaling
    const stageOffsetX = app.stage.x;
    const stageOffsetY = app.stage.y;

    // Convert screen coordinates to stage coordinates
    const stageX = (x - stageOffsetX) / stageScale;
    const stageY = (y - stageOffsetY) / stageScale;

    return {
      x: Math.floor(stageX / size),
      y: Math.floor(stageY / size)
    };
  }

  // Fallback to simple conversion if no stage available
  return { x: Math.floor(x / size), y: Math.floor(y / size) };
}

// Helper function to convert global screen coordinates to stage-local coordinates
function globalToStageCoords(globalX, globalY) {
  if (typeof app !== "undefined" && app && app.stage) {
    const stageScale = app.stage.scale.x;
    const stageOffsetX = app.stage.x;
    const stageOffsetY = app.stage.y;

    return {
      x: (globalX - stageOffsetX) / stageScale,
      y: (globalY - stageOffsetY) / stageScale
    };
  }

  // Fallback - return global coords unchanged
  return { x: globalX, y: globalY };
}
function isValidCoord(x, y) {
  const size = typeof BOARD_SIZE !== "undefined" ? BOARD_SIZE : 11;
  return x >= 0 && x < size && y >= 0 && y < size;
}
function isOccupied(x, y) {
  // Check if gameState and player pawn arrays exist
  if (
    typeof gameState === "undefined" ||
    !gameState.players?.[PLAYER_1]?.pawns ||
    !gameState.players?.[PLAYER_2]?.pawns
  ) {
    console.warn("isOccupied check failed: gameState or pawns missing.");
    return true; // Assume occupied if state is invalid to prevent errors
  }
  // Check both player pawn lists for a pawn at the given coordinates
  return [
    ...(gameState.players[PLAYER_1].pawns || []),
    ...(gameState.players[PLAYER_2].pawns || []),
  ]
    .filter((p) => p) // Filter out null/undefined entries if any
    .some((p) => p.gridX === x && p.gridY === y); // Check if any pawn matches coords
}
function getPawnAt(x, y) {
  // Check if gameState and player pawn arrays exist
  if (
    typeof gameState === "undefined" ||
    !gameState.players?.[PLAYER_1]?.pawns ||
    !gameState.players?.[PLAYER_2]?.pawns
  ) {
    console.warn("getPawnAt check failed: gameState or pawns missing.");
    return null;
  }
  // Find the first pawn matching the coordinates
  return (
    [
      ...(gameState.players[PLAYER_1].pawns || []),
      ...(gameState.players[PLAYER_2].pawns || []),
    ].find((p) => p && p.gridX === x && p.gridY === y) || null
  ); // Return null if not found
}
function getPawnById(id) {
  // Check if gameState and player pawn arrays exist
  if (
    typeof gameState === "undefined" ||
    !gameState.players?.[PLAYER_1]?.pawns ||
    !gameState.players?.[PLAYER_2]?.pawns
  ) {
    console.warn("getPawnById check failed: gameState or pawns missing.");
    return null;
  }
  // Find the first pawn matching the ID
  return (
    [
      ...(gameState.players[PLAYER_1].pawns || []),
      ...(gameState.players[PLAYER_2].pawns || []),
    ].find((p) => p && p.id === id) || null
  ); // Return null if not found
}
function setCursor(cursorStyle) {
  try {
    // Use optional chaining for safety
    if (app?.view?.style) {
      app.view.style.cursor = cursorStyle;
    }
  } catch (e) {
    console.error("Error setting cursor:", e);
  }
}
function showToast(message, duration = 3000) {
  try {
    const toast = document.getElementById("toast-notification");
    const toastMsg = document.getElementById("toast-message");
    if (toast && toastMsg) {
      toastMsg.textContent = message;
      toast.classList.remove("toast-hidden");
      toast.classList.add("toast-visible");
      if (toast.timerId) {
        clearTimeout(toast.timerId);
      }
      toast.timerId = setTimeout(() => {
        toast.classList.remove("toast-visible");
        toast.classList.add("toast-hidden");
        toast.timerId = null;
      }, duration);
    } else {
      console.warn(`Toast UI elements not found. Msg: ${message}`);
    }
  } catch (e) {
    console.error("Error showing toast:", e);
  }
}
// --- End Helper Functions ---

// --- Camera Shake Logic ---
let isShaking = false;
function triggerCameraShake(intensity = 5, duration = 150) {
  if (isShaking || typeof app === "undefined" || !app?.stage) {
    // Added check for app.stage
    console.warn(
      "Camera shake skipped: Already shaking or Pixi app/stage not ready."
    );
    return;
  }
  console.log(
    `💥 Triggering camera shake (Intensity: ${intensity}, Duration: ${duration})`
  );
  isShaking = true;
  const startTime = Date.now();
  const originalX = app.stage.x;
  const originalY = app.stage.y;
  function shake() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;
    if (progress >= 1) {
      // Ensure stage exists before resetting position
      if (app?.stage) {
        app.stage.x = originalX;
        app.stage.y = originalY;
      }
      isShaking = false;
      console.log("💥 Camera shake finished.");
      return;
    }
    const randomX = (Math.random() * 2 - 1) * intensity * (1 - progress);
    const randomY = (Math.random() * 2 - 1) * intensity * (1 - progress);
    // Ensure stage exists before setting position
    if (app?.stage) {
      app.stage.x = originalX + randomX;
      app.stage.y = originalY + randomY;
    }
    requestAnimationFrame(shake);
  }
  requestAnimationFrame(shake);
}
// --- End Camera Shake ---

// --- Socket Event Initialization ---
function initializeGameSocketEvents() {
  if (typeof socket === "undefined" || !socket) {
    console.error("Socket not initialized!");
    setTimeout(initializeGameSocketEvents, 200);
    return;
  }
  console.log("Initializing game socket event listeners...");

  // Verwijder oude listeners om duplicaten te voorkomen
  socket.off("actionPerformed");
  socket.off("opponentCardsReady");
  socket.off("yourTurnToDefine");
  socket.off("cardsRevealed");
  socket.off("startLinking");
  socket.off("cardLinked");
  socket.off("nextLinkTurn");
  socket.off("nextRound");
  socket.off("startActionPhase");
  socket.off("nextTurn");
  // 'newCycle' wordt afgehandeld door de patch, daar niet off() doen tenzij de patch ook off() doet
  socket.off("gameOver");
  socket.off("error");
  // RPS Listeners
  socket.off("startRpsTiebreaker");
  socket.off("rpsChoiceConfirmed");
  socket.off("waitingForOpponentRpsChoice");
  socket.off("rpsRoundResult");
  socket.off("rpsTie"); // Add listener for ties
  // VERWIJDERD: socket.off('nextRpsRound');
  // VERWIJDERD: socket.off('rpsGameOver');

  // --- actionPerformed handler (met sound/shake integratie) ---
  socket.on("actionPerformed", (data) => {
    console.log("Action performed received:", data);
    try {
      if (window.SpLogger) {
        if (data.actionType === 'move') {
          SpLogger.log('action.server.move', {
            pawnId: data.pawnId,
            player: data.playerNum,
            to: { x: data.targetX, y: data.targetY },
            updated: data.updatedPawn || null,
            cycle: gameState.cycleNumber,
            round: gameState.roundNumber,
          });
        } else if (data.actionType === 'attack') {
          SpLogger.log('action.server.attack', {
            pawnId: data.pawnId,
            player: data.playerNum,
            attackerMovedTo: data.attackerMovedTo || null,
            damage: data.damageDealt || null,
            eliminated: data.eliminatedPawnIDs || [],
            updated: data.updatedPawn || null,
            cycle: gameState.cycleNumber,
            round: gameState.roundNumber,
          });
        }
      }
    } catch (_) { }
    let eliminationOccurred = false;

    // --- Show Floating Damage Text & Play Bleed Sound ---
    if (data.actionType === "attack" && data.damageDealt) {
      console.log("Processing damage dealt data:", data.damageDealt);
      const attackerPawn = getPawnById(data.damageDealt.attackerId);
      const defenderPawn = getPawnById(data.damageDealt.defenderId);
      let bleedSoundPlayed = false;

      // --- NIEUW: Bereken definitieve HP waarden (client-side, gebaseerd op server data) ---
      let finalAttackerHP = null;
      let finalDefenderHP = null;

      if (attackerPawn) {
        // Bereken HP na schade (mag niet onder 0)
        // In singleplayer, the mock already applied HP to local state; respect flag to avoid double-applying
        finalAttackerHP = Math.max(
          0,
          (attackerPawn.currentHP ?? attackerPawn.linkedCard?.hp ?? 0) -
          (data.hpAlreadyApplied ? 0 : data.damageDealt.damageToAttacker)
        );
        // Update de logische HP state van de pion
        if (attackerPawn.currentHP !== null) {
          // Alleen updaten als het al een waarde had
          attackerPawn.currentHP = finalAttackerHP;
        }
      }
      if (defenderPawn) {
        if (defenderPawn.isActive && defenderPawn.linkedCard) {
          // Alleen als verdediger actief was
          finalDefenderHP = Math.max(
            0,
            (defenderPawn.currentHP ?? defenderPawn.linkedCard.hp) -
            (data.hpAlreadyApplied ? 0 : data.damageDealt.damageToDefender)
          );
          if (defenderPawn.currentHP !== null) {
            defenderPawn.currentHP = finalDefenderHP;
          }
        } else if (data.damageDealt.damageToDefender === 999) {
          // Inactieve verdediger geëlimineerd
          finalDefenderHP = 0; // Wordt toch verwijderd
          if (defenderPawn.currentHP !== null) {
            // Als het HP had (onwaarschijnlijk), zet op 0
            defenderPawn.currentHP = 0;
          }
        }
      }
      // --- EINDE BEREKENING HP ---

      // Toon floating text & speel geluid af
      if (
        attackerPawn &&
        data.damageDealt.damageToAttacker > 0 &&
        !data.eliminatedPawnIDs?.includes(attackerPawn.id)
      ) {
        if (typeof showFloatingDamageText === "function")
          showFloatingDamageText(
            attackerPawn,
            data.damageDealt.damageToAttacker
          );
        if (typeof soundManager !== "undefined")
          soundManager.playSound("ui_bleed"); // Corrected sound category
        bleedSoundPlayed = true;
        // --- UPDATE PERSISTENTE DISPLAY AANVALLER ---
        if (
          typeof attackerPawn.updateStatsDisplay === "function" &&
          attackerPawn.linkedCard
        ) {
          console.log(
            ` -> Updating ATK persistent display for ${attackerPawn.id} to HP ${finalAttackerHP}`
          );
          attackerPawn.updateStatsDisplay(
            attackerPawn.linkedCard,
            finalAttackerHP
          );
        }
        // --- EINDE UPDATE ---
      }
      if (
        defenderPawn &&
        data.damageDealt.damageToDefender > 0 &&
        !data.eliminatedPawnIDs?.includes(defenderPawn.id)
      ) {
        if (typeof showFloatingDamageText === "function") {
          const d =
            data.damageDealt.damageToDefender === 999
              ? "X"
              : data.damageDealt.damageToDefender;
          showFloatingDamageText(defenderPawn, d);
        }
        if (!bleedSoundPlayed && typeof soundManager !== "undefined")
          soundManager.playSound("ui_bleed"); // Corrected sound category
        // --- UPDATE PERSISTENTE DISPLAY VERDEDIGER ---
        if (
          typeof defenderPawn.updateStatsDisplay === "function" &&
          defenderPawn.linkedCard
        ) {
          console.log(
            ` -> Updating DEF persistent display for ${defenderPawn.id} to HP ${finalDefenderHP}`
          );
          // Geef de berekende finalDefenderHP mee
          defenderPawn.updateStatsDisplay(
            defenderPawn.linkedCard,
            finalDefenderHP
          );
        }
        // --- EINDE UPDATE ---
      }
    }
    // --- End Damage/Bleed Logic ---

    // --- Process Eliminations & Effects ---
    if (
      data.eliminatedPawnIDs &&
      Array.isArray(data.eliminatedPawnIDs) &&
      data.eliminatedPawnIDs.length > 0
    ) {
      eliminationOccurred = true;
      console.log(
        `Processing eliminations: [${data.eliminatedPawnIDs.join(", ")}]`
      );
      data.eliminatedPawnIDs.forEach((id) => {
        const pawn = getPawnById(id);
        if (pawn) {
          console.log(`Client removing eliminated pawn ${id}`);
          if (typeof pawn.destroyVisual === "function") pawn.destroyVisual();
          if (typeof removePawnFromState === "function")
            removePawnFromState(pawn);
        } else console.warn(`Eliminated pawn ${id} not found locally.`);
      });
      console.log("Elimination occurred, triggering effects.");
      triggerCameraShake();
      if (typeof soundManager !== "undefined")
        soundManager.playSound("elimination");
    }

    // --- Update Acting Pawn (als het overleefde) ---
    const actingPawn = getPawnById(data.pawnId);
    console.log("[actionPerformed] actingPawn lookup", { id: data.pawnId, found: !!actingPawn });
    if (actingPawn) {
      if (data.updatedPawn) {
        const before = { hp: actingPawn.currentHP, rs: actingPawn.remainingStamina };
        actingPawn.currentHP = data.updatedPawn.currentHP;
        actingPawn.remainingStamina = data.updatedPawn.remainingStamina;
        console.log("[actionPerformed] applying updatedPawn", { before, updated: data.updatedPawn });
        if (typeof actingPawn.updateBars === "function") actingPawn.updateBars();
        console.log("[actionPerformed] after update", { id: actingPawn.id, hp: actingPawn.currentHP, rs: actingPawn.remainingStamina });
      }

      console.log(
        `Updating acting pawn ${actingPawn.id} state/visuals.`
      );
      let targetX = actingPawn.gridX,
        targetY = actingPawn.gridY,
        needsUpdate = false;
      if (
        data.actionType === "move" &&
        data.targetX !== undefined &&
        data.targetY !== undefined
      ) {
        targetX = data.targetX;
        targetY = data.targetY;
        needsUpdate = true;
        console.log(` -> MOVE confirm`);
      } else if (data.actionType === "attack" && data.attackerMovedTo) {
        targetX = data.attackerMovedTo.x;
        targetY = data.attackerMovedTo.y;
        needsUpdate = true;
        console.log(` -> ATTACK+MOVE confirm`);
      }

      if (needsUpdate) {
        if (
          data.playerNum !== gameState.playerNumber &&
          typeof actingPawn.animateMoveTo === "function"
        ) {
          actingPawn.animateMoveTo(targetX, targetY, () => {
            if (actingPawn.pixiObject) {
              // Apply alpha transparency only when stamina is 0
              if (actingPawn.remainingStamina === 0) {
                actingPawn.pixiObject.alpha = 0.6; // Semi-transparent for no stamina
              } else {
                actingPawn.pixiObject.alpha = 1.0; // Full opacity
              }
              // Always reset tint to normal
              if (actingPawn.graphics) {
                actingPawn.graphics.tint = 0xFFFFFF; // Always reset to normal (no tint)
              }
            }
            console.log(
              ` -> Opponent move animation finished for ${actingPawn.id}`
            );
            if (typeof checkWinCondition === "function") checkWinCondition();
          });
        } else {
          const currentVisX = actingPawn.pixiObject
            ? actingPawn.pixiObject.x - CELL_SIZE / 2
            : -1;
          const currentVisY = actingPawn.pixiObject
            ? actingPawn.pixiObject.y - CELL_SIZE / 2
            : -1;
          if (
            Math.abs(currentVisX - targetX * CELL_SIZE) > 1 ||
            Math.abs(currentVisY - targetY * CELL_SIZE) > 1
          ) {
            if (typeof actingPawn.updatePosition === "function")
              actingPawn.updatePosition(targetX, targetY);
          } else {
            actingPawn.gridX = targetX;
            actingPawn.gridY = targetY;
          }
          if (actingPawn.pixiObject) {
            // Apply alpha transparency only when stamina is 0
            if (actingPawn.remainingStamina === 0) {
              actingPawn.pixiObject.alpha = 0.6; // Semi-transparent for no stamina
            } else {
              actingPawn.pixiObject.alpha = 1.0; // Full opacity
            }
            // Always reset tint to normal
            if (actingPawn.graphics) {
              actingPawn.graphics.tint = 0xFFFFFF; // Always reset to normal (no tint)
            }
          }
          if (typeof checkWinCondition === "function") checkWinCondition();
        }
      } else {
        if (actingPawn.pixiObject) {
          // Apply alpha transparency only when stamina is 0
          if (actingPawn.remainingStamina === 0) {
            actingPawn.pixiObject.alpha = 0.6; // Semi-transparent for no stamina
          } else {
            actingPawn.pixiObject.alpha = 1.0; // Full opacity
          }
          // Always reset tint to normal
          if (actingPawn.graphics) {
            actingPawn.graphics.tint = 0xFFFFFF; // Always reset to normal (no tint)
          }
        }
        if (typeof checkWinCondition === "function") checkWinCondition();
      }

    } else {
      console.log(`Acting pawn ${data.pawnId} eliminated or not found.`);
    }

    // Turn switching is now handled automatically by the server after each action
    // No need for client-side endTurn calls

    // Altijd win check aan het einde?
    if (typeof checkWinCondition === "function") {
      checkWinCondition();
    }

    console.log("actionPerformed handler finished processing.");
  }); // End actionPerformed handler

  // --- Andere Socket Listeners ---
  socket.on("opponentCardsReady", () => {
    console.log("Opponent defined cards");
    showToast("Opponent defined cards");
  });
  socket.on("yourTurnToDefine", (data) => {
    console.log("Received 'yourTurnToDefine':", data);
    gameState.currentPlayer = data.currentPlayer;
    gameState.roundNumber = data.roundNumber;
    gameState.currentPhase = `SETUP_${gameState.roundNumber}_DEFINE`;
    console.log(
      `State updated: Phase=${gameState.currentPhase}, P=${gameState.currentPlayer}, R=${gameState.roundNumber}`
    );

    // Directly update the medal for turn change
    if (typeof updateTurnMedal === "function") updateTurnMedal();

    setTimeout(() => {
      if (typeof handleCardDefinition === "function") handleCardDefinition();
      else console.error("handleCardDefinition missing!");
      // Auto-open the drawer on mobile for DEFINE phase
      try { if (window.MobileUI && window.MobileUI.setDrawerOpen) { window.MobileUI.setDrawerOpen(true); } } catch (_) {}
    }, 50);
  });
  socket.on("cardsRevealed", (data) => {
    console.log("Cards revealed", data);
    if (!gameState.players[PLAYER_1])
      gameState.players[PLAYER_1] = { pawns: [], cardsAvailableForLinking: [] }; // Use constant
    if (!gameState.players[PLAYER_2])
      gameState.players[PLAYER_2] = { pawns: [], cardsAvailableForLinking: [] }; // Use constant
    const yourCards =
      gameState.playerNumber === PLAYER_1
        ? data.player1Cards
        : data.player2Cards;
    const oppCards =
      gameState.playerNumber === PLAYER_1
        ? data.player2Cards
        : data.player1Cards;
    gameState.players[PLAYER_1].cardsAvailableForLinking =
      data.player1Cards || [];
    gameState.players[PLAYER_2].cardsAvailableForLinking =
      data.player2Cards || [];

    if (typeof updateRevealedCardsUI === "function") {
      const span = document.getElementById("reveal-round-num");
      if (span) span.textContent = gameState.roundNumber;
      updateRevealedCardsUI(
        yourCards,
        oppCards,
        data.initiativePlayer,
        data.p1TotalAttack,
        data.p2TotalAttack,
        data.p1TotalStamina,
        data.p2TotalStamina
      );

      // Only show the reveal UI if we're not in RPS_TIEBREAKER phase
      if (gameState.currentPhase !== "RPS_TIEBREAKER") {
        if (typeof showUIPanel === "function") showUIPanel("reveal");
        else console.error("showUIPanel missing!");
      } else {
        console.log("In RPS_TIEBREAKER phase, not showing reveal UI");
      }
    } else {
      console.error("updateRevealedCardsUI missing!");
    }
  });
  socket.on("startLinking", (data) => {
    console.log("Starting linking phase received:", data);
    gameState.initiativePlayer = data.initiativePlayer;
    gameState.currentPhase = data.currentPhase;
    gameState.currentPlayer = data.initiativePlayer;

    // Directly update the medal for turn change
    if (typeof updateTurnMedal === "function") updateTurnMedal();

    // *** START MODIFICATION ***
    let canLink = false;
    if (gameState.currentPlayer === gameState.playerNumber) {
      const myPawns = gameState.players[gameState.playerNumber]?.pawns || [];
      // Check if there's at least one pawn that is NOT active AND doesn't have a linked card
      canLink = myPawns.some(p => p && !p.isActive && !p.linkedCard);
      console.log(`Checking if P${gameState.playerNumber} can link: ${canLink}`);

      if (!canLink) {
        console.log(`Player ${gameState.playerNumber} has no available pawns to link. Notifying server.`);
        showToast("No pawns available to link. Waiting...");
        if (typeof socket !== "undefined" && typeof gameSession !== "undefined") {
          socket.emit('playerCannotLink', { roomCode: gameSession.roomCode });
          // Optionally set phase to waiting locally? Server should handle turn progression.
          // gameState.currentPhase = "WAITING_FOR_TURN";
        } else {
          console.error("Cannot emit playerCannotLink - socket/session missing.");
          showToast("Error: Cannot notify server about inability to link.");
        }
        // Still update the UI, but it might show no selectable pawns/cards correctly
        if (typeof showUIPanel === "function" && typeof updateLinkingUI === "function") {
          showUIPanel("link"); // Show the linking panel, even if empty/disabled
          updateLinkingUI(); // Update UI to reflect the state (likely showing no options)
        } else {
          console.error("showUIPanel or updateLinkingUI missing!");
        }
        return; // Exit the handler early as this player cannot act
      }
    }
    // *** END MODIFICATION ***

    // If it's the opponent's turn OR this player CAN link, proceed normally
    if (
      typeof showUIPanel === "function" &&
      typeof updateLinkingUI === "function"
    ) {
      showUIPanel("link");
      updateLinkingUI();
      try { window.MobileUI?.setDrawerOpen?.(gameState.currentPlayer === gameState.playerNumber); } catch (_) { }
      if (gameState.currentPlayer === gameState.playerNumber) {
        TimerManager.start(40, autoLinkAction);
      }
    } else {
      console.error("showUIPanel or updateLinkingUI missing!");
    }
  });
  socket.on("cardLinked", (data) => {
    console.log("Card linked received:", data);
    const pawn = getPawnById(data.pawnId);
    const playerState = gameState.players[data.playerNum];
    const card = playerState?.cardsAvailableForLinking?.find(
      (c) => c?.id === data.cardId
    ); // Added ?. for card id safety

    if (pawn && card) {
      pawn.isActive = true;
      pawn.currentHP = card.hp;
      pawn.linkedCard = { ...card };
      pawn.hasActedThisCycle = false;
      // Initialize stamina from the card's speed value
      pawn.remainingStamina = card.stamina;
      if (typeof pawn.updateStatsDisplay === "function")
        pawn.updateStatsDisplay(card, card.hp);
      card.isLinked = true; // Markeer in bronlijst

      // Log applied link with pawn position and card stats
      try {
        if (window.SpLogger) {
          SpLogger.log("link.applied", {
            player: data.playerNum,
            pawnId: pawn.id,
            cardId: card.id,
            position: { x: pawn.gridX, y: pawn.gridY },
            stats: { hp: card.hp, stamina: card.stamina, attack: card.attack },
            cycle: gameState.cycleNumber,
            round: gameState.roundNumber,
          });
          SpLogger.log("link.decision", {
            player: data.playerNum,
            cardStats: { hp: card.hp, stamina: card.stamina, attack: card.attack },
            pawnPosition: { x: pawn.gridX, y: pawn.gridY },
            pawnId: pawn.id,
            cycle: gameState.cycleNumber,
            round: gameState.roundNumber,
          });
          const p1 = (gameState.players[PLAYER_1]?.pawns || [])
            .map((p) => p ? { id: p.id, pl: p.player, x: p.gridX, y: p.gridY, act: !!p.isActive, hp: p.currentHP, rs: p.remainingStamina } : null)
            .filter(Boolean);
          const p2 = (gameState.players[PLAYER_2]?.pawns || [])
            .map((p) => p ? { id: p.id, pl: p.player, x: p.gridX, y: p.gridY, act: !!p.isActive, hp: p.currentHP, rs: p.remainingStamina } : null)
            .filter(Boolean);
          SpLogger.log("board.snapshot", { when: "after.link", cycle: gameState.cycleNumber, round: gameState.roundNumber, p1, p2 });
        }
      } catch (_) { }

      // Update activePawnsThisCycle (optioneel, als client dit bijhoudt)
      // if (!gameState.activePawnsThisCycle[data.playerNum]) gameState.activePawnsThisCycle[data.playerNum] = [];
      // if (!gameState.activePawnsThisCycle[data.playerNum].some(ap => ap?.id === pawn.id)) {
      //      gameState.activePawnsThisCycle[data.playerNum].push(pawn);
      // }

      if (data.playerNum === gameState.playerNumber) selectedCardToLink = null;

      // Instead of calling updateLinkingUI which updates all cards,
      // directly find and update only the specific card element
      const cardElement = document.querySelector(
        `.card-item[data-card-id="${card.id}"]`
      );
      if (cardElement) {
        if (gameState.currentPlayer === gameState.playerNumber) {
          TimerManager.start(40, autoLinkAction);
        }
        // Only add the linked class if it's not already linked
        if (!cardElement.classList.contains("linked")) {
          cardElement.classList.add("linked");
        }
        // Remove click handler
        cardElement.onclick = null;
        cardElement.style.cursor = "not-allowed";
      } else {
        // If we can't find the specific card element, fall back to updating the whole UI
        if (typeof updateLinkingUI === "function") {
          updateLinkingUI();
        }
      }
    } else {
      console.warn(
        `Local link fail on 'cardLinked': Pawn=${!!pawn} (ID: ${data.pawnId
        }), Card=${!!card} (ID: ${data.cardId}) in P${data.playerNum} list`
      );
      console.log(
        "P1 Cards:",
        gameState.players[PLAYER_1]?.cardsAvailableForLinking
      );
      console.log(
        "P2 Cards:",
        gameState.players[PLAYER_2]?.cardsAvailableForLinking
      );
    }
  });
  socket.on("nextLinkTurn", (data) => {
    console.log("Next linking turn received:", data);
    gameState.currentPlayer = data.currentPlayer;
    selectedCardToLink = null;

    // Directly update the medal for turn change
    if (typeof updateTurnMedal === "function") updateTurnMedal();

    if (typeof updateLinkingUI === "function") {
      if (typeof showUIPanel === "function") showUIPanel("link");
      updateLinkingUI();
      try { window.MobileUI?.setDrawerOpen?.(gameState.currentPlayer === gameState.playerNumber); } catch (_) { }
      if (gameState.currentPlayer === gameState.playerNumber) {
        TimerManager.start(40, autoLinkAction);
      }
    }
  });
  socket.on("nextRound", (data) => {
    console.log("Next round received:", data);
    gameState.roundNumber = data.roundNumber;
    gameState.currentPhase = data.currentPhase;
    gameState.currentPlayer = data.currentPlayer;
    selectedCardToLink = null;
    gameState.players[PLAYER_1].cardsAvailableForLinking = []; // Clear lists
    gameState.players[PLAYER_2].cardsAvailableForLinking = [];
    console.log(
      `State updated: Phase=${gameState.currentPhase}, P=${gameState.currentPlayer}, R=${gameState.roundNumber}`
    );
    setTimeout(() => {
      if (typeof handleCardDefinition === "function") handleCardDefinition();
      else console.error("handleCardDefinition missing!");
      // Auto-open the card drawer on DEFINE phases
      try { if (gameState.currentPhase && gameState.currentPhase.endsWith('DEFINE')) { window.MobileUI?.setDrawerOpen?.(true); } } catch (_) { }
    }, 50);
  });
  socket.on("startActionPhase", (data) => {
    console.log("Starting action phase received:", data);
    gameState.currentPhase = data.currentPhase;
    gameState.currentPlayer = data.currentPlayer;
    selectedCardToLink = null;
    gameState.players[PLAYER_1].cardsAvailableForLinking = [];
    gameState.players[PLAYER_2].cardsAvailableForLinking = [];

    // Directly update the medal for turn change
    if (typeof updateTurnMedal === "function") updateTurnMedal();

    // Play action phase start sound
    if (typeof soundManager !== "undefined") {
      soundManager.playSound("ui_action_phase");
    }

    // Reset timer when action phase starts
    if (gameState.currentPlayer === gameState.playerNumber) {
      TimerManager.start(40, () => {
        showToast("⏳ Time's up! Ending turn.");
        if (typeof window.endTurn === 'function') window.endTurn();
      });
      console.log("Timer started for action phase");
    }
    // Reset hasActed flag, stamina, and alpha lokaal
    console.log(
      "Resetting local hasActed flags, stamina, and alpha for action phase start."
    );
    [
      ...(gameState.players[PLAYER_1]?.pawns || []),
      ...(gameState.players[PLAYER_2]?.pawns || []),
    ].forEach((p) => {
      if (p) {
        p.hasActedThisCycle = false; // Belangrijk!
        // Reset stamina to full from the card value
        if (p.isActive && p.linkedCard && p.linkedCard.stamina) {
          p.remainingStamina = p.linkedCard.stamina;
          console.log(`Reset stamina for ${p.id} to ${p.remainingStamina}`);
          p.updateBars();
        }
      }
      if (p?.pixiObject) {
        // Apply alpha transparency only when stamina is 0
        if (p.isActive && p.remainingStamina === 0) {
          p.pixiObject.alpha = 0.6; // Semi-transparent for pawns with no stamina
        } else {
          p.pixiObject.alpha = 1.0; // Full opacity for all other pawns
        }

        // Reset tint to normal for all pawns
        if (p.graphics) {
          p.graphics.tint = 0xFFFFFF; // Always reset to white (no tint)
        }
      }
    });

    if (
      typeof showUIPanel === "function" &&
      typeof handlePlayerTurn === "function"
    ) {
      showUIPanel("action");
      handlePlayerTurn();
    } else {
      console.error("showUIPanel or handlePlayerTurn missing!");
    }
  });
  // In initializeGameSocketEvents()

  socket.on("nextTurn", (data) => {
    console.log("Next turn received:", data);

    // *** BELANGRIJKE CHECK TOEGEVOEGD ***
    if (gameState.currentPhase === "GAME_OVER") {
      console.warn(
        "Received 'nextTurn' while game is already marked as over locally. Ignoring."
      );
      return; // Doe niets als het spel lokaal al voorbij is
    }
    // *** EINDE CHECK ***

    gameState.currentPlayer = data.currentPlayer;
    gameState.currentPhase = "ACTION"; // Alleen fase updaten als spel nog bezig is

    // Directly update the medal for turn change
    if (typeof updateTurnMedal === "function") updateTurnMedal();

    // Reset the timer when turn changes
    if (gameState.currentPlayer === gameState.playerNumber) {
      TimerManager.start(40, () => {
        showToast("⏳ Time's up! Ending turn.");
        if (typeof window.endTurn === 'function') window.endTurn();
      });
      console.log("Timer reset due to turn change to next player");
    }

    console.log(`Phase set to ACTION for P${gameState.currentPlayer}'s turn.`);
    if (typeof handlePlayerTurn === "function") handlePlayerTurn();
    try {
      if (window.SpLogger) {
        const p1 = (gameState.players[PLAYER_1]?.pawns || []).map((p) => p ? { id: p.id, pl: p.player, x: p.gridX, y: p.gridY, act: !!p.isActive, hp: p.currentHP, rs: p.remainingStamina } : null).filter(Boolean);
        const p2 = (gameState.players[PLAYER_2]?.pawns || []).map((p) => p ? { id: p.id, pl: p.player, x: p.gridX, y: p.gridY, act: !!p.isActive, hp: p.currentHP, rs: p.remainingStamina } : null).filter(Boolean);
        SpLogger.log('board.snapshot', { when: 'turn.switch', currentPlayer: gameState.currentPlayer, cycle: gameState.cycleNumber, round: gameState.roundNumber, p1, p2 });
      }
    } catch (_) { }
  });
  // 'newCycle' wordt afgehandeld door de patch
  socket.on("gameOver", (data) => {
    console.log("Game over received:", data);
    gameState.winner = data.winner;
    gameState.currentPhase = "GAME_OVER";

    try { if (window.SpLogger) SpLogger.log("game.over", { winner: data.winner, winnerName: data.winnerName || null, reason: data.reason || null, cycle: gameState.cycleNumber, round: gameState.roundNumber }); } catch (_) { }
    try { if (window.SpLogger) SpLogger.endSession({ winner: data.winner, reason: data.reason || null }); } catch (_) { }

    // Play winner sound
    if (typeof soundManager !== "undefined") {
      soundManager.playSound("ui_winner");
    }

    showToast(
      `Game Over! Player ${data.winner} (${data.winnerName || ""}) wins! ${data.reason || ""
      }`,
      10000
    );
    if (typeof updateGameStatusUI === "function") updateGameStatusUI();
    if (typeof clearHighlights === "function") clearHighlights();
    setCursor(CURSOR_DEFAULT);
    isShaking = false; // Stop shake
  });
  socket.on("error", (errorMessage) => {
    console.error("Socket error received:", errorMessage);
    showToast(`Server Error: ${errorMessage}`);
    if (
      errorMessage.includes("already acted") &&
      gameState.currentPhase === "WAITING_FOR_TURN"
    ) {
      console.warn(
        "Received 'already acted' error, resetting local phase to ACTION."
      );
      gameState.currentPhase = "ACTION";
      if (typeof updateActionUI === "function") updateActionUI(null);
      if (
        gameState.selectedPawn &&
        typeof gameState.selectedPawn.setHighlight === "function"
      )
        gameState.selectedPawn.setHighlight(false);
      gameState.selectedPawn = null;
      if (typeof clearHighlights === "function") clearHighlights(); // Clear highlights too
    }
  });

  // --- AANGEPASTE RPS LISTENERS ---

  socket.off("startRpsTiebreaker");
  socket.on("startRpsTiebreaker", (data) => {
    // Geen scores/ronde data meer nodig
    console.log("Received 'startRpsTiebreaker'");
    gameState.currentPhase = "RPS_TIEBREAKER";
    if (typeof cancelActionSelection === "function") cancelActionSelection();
    if (typeof clearHighlights === "function") clearHighlights();

    if (typeof updateRpsDisplay === "function") {
      updateRpsDisplay("Choose your move!"); // Vereenvoudigde aanroep
    }
    if (typeof enableRpsButtons === "function") enableRpsButtons(true);
    if (typeof showUIPanel === "function") showUIPanel("rps");
    if (typeof setupRpsButtonListeners === "function") {
      setupRpsButtonListeners(); // Zet listeners (opnieuw)
    } else {
      console.error("setupRpsButtonListeners function is missing!");
    }
    if (typeof updateGameStatusUI === "function") updateGameStatusUI();

    // --- Start RPS Timer ---
    if (rpsTimerId) { // Clear any existing timer first
      clearTimeout(rpsTimerId);
      rpsTimerId = null;
      console.log("Cleared previous RPS timer.");
    }

    console.log("Starting 10-second RPS timer...");
    rpsTimerId = setTimeout(() => {
      // Check if we are still in RPS phase and buttons are enabled (meaning player hasn't chosen)
      if (gameState.currentPhase === "RPS_TIEBREAKER" && rpsChoiceBtns && !rpsChoiceBtns[0]?.disabled) {
        console.log("RPS Timer expired! Making random choice.");
        const randomChoice = rpsOptions[Math.floor(Math.random() * rpsOptions.length)];

        // Play sounds
        if (typeof soundManager !== 'undefined') {
          soundManager.playSound("ui_click"); // Generic click sound
          soundManager.playSound(`rps_${randomChoice}`); // Specific choice sound
        }

        enableRpsButtons(false); // Disable buttons
        if (rpsInstructionP) rpsInstructionP.textContent = `Time's up! Randomly chose ${randomChoice}. Waiting...`;
        if (rpsResultDiv) rpsResultDiv.innerHTML = ""; // Clear previous result

        // Emit the random choice
        if (typeof socket !== "undefined" && typeof gameSession !== "undefined") {
          socket.emit("submitRpsChoice", {
            roomCode: gameSession.roomCode,
            choice: randomChoice,
          });
          console.log(`Emitted random RPS choice: ${randomChoice}`);
        } else {
          console.error("Cannot submit random RPS choice: Socket/Session missing.");
          if (rpsInstructionP) rpsInstructionP.textContent = `Error sending choice!`;
          enableRpsButtons(true); // Re-enable on error? Maybe not ideal.
        }
      } else {
        console.log("RPS Timer expired, but choice already made or phase changed.");
      }
      rpsTimerId = null; // Clear timer ID after execution
    }, 10000); // 10 seconds timeout
    // --- End RPS Timer ---

  });

  // rpsChoiceConfirmed & waitingForOpponentRpsChoice blijven hetzelfde
  socket.off("rpsChoiceConfirmed");
  socket.on("rpsChoiceConfirmed", (data) => {
    // console.log(`Server confirmed RPS choice: ${data.choice}`); // Minder console spam
    // Knoppen zijn al disabled, UI toont "Waiting..."
    if (rpsInstructionP)
      rpsInstructionP.textContent = `You chose ${data.choice}. Waiting for opponent...`;
    enableRpsButtons(false); // Zeker weten uit
  });

  socket.off("waitingForOpponentRpsChoice");
  socket.on("waitingForOpponentRpsChoice", () => {
    // console.log("Opponent has chosen RPS."); // Minder console spam
    // Update UI alleen als JIJ nog moet kiezen (knoppen zijn dan enabled)
    if (rpsInstructionP && !rpsChoiceBtns[0]?.disabled) {
      // Check of eerste knop enabled is
      rpsInstructionP.textContent = "Opponent has chosen. Your turn!";
    }
  });

  socket.off("rpsRoundResult");
  socket.on("rpsRoundResult", (data) => {
    console.log("Received 'rpsRoundResult'", data);
    // Validatie: check of choices en roundWinner bestaan
    if (!data || !data.choices || data.roundWinner === undefined) {
      // Removed score check
      console.error("Invalid rpsRoundResult data received", data);
      return;
    }

    // Clear the RPS timer as the round is resolved
    if (rpsTimerId) {
      clearTimeout(rpsTimerId);
      rpsTimerId = null;
      console.log("Cleared RPS timer on round result.");
    }

    // Reset the phase timer when RPS ends
    TimerManager.stop();

    // Toon het resultaat van deze ENIGE ronde
    if (typeof showRpsResult === "function") {
      // Geen scores meegeven
      showRpsResult(data.choices, data.roundWinner);
    }
    // Knoppen blijven disabled, want RPS is nu klaar
    enableRpsButtons(false);

    // Update instructie om aan te geven dat we wachten
    if (rpsInstructionP) {
      const winnerName =
        data.roundWinner === gameState.playerNumber ? "You" : "Opponent";
      rpsInstructionP.textContent = `${winnerName} won initiative! Starting next phase...`;
      rpsInstructionP.style.color =
        data.roundWinner === gameState.playerNumber ? "green" : "orange";
    }

    // Wacht op het 'startLinking' event van de server
    console.log("RPS Finished. Waiting for server 'startLinking' event...");
  });

  // --- NIEUW: Handler voor RPS Gelijkspel ---
  socket.on("rpsTie", (data) => {
    console.log("Received 'rpsTie'", data);
    if (!data || !data.choices) {
      console.error("Invalid rpsTie data received", data);
      return;
    }

    // Clear the previous timer before starting a new one for the tie-breaker round
    if (rpsTimerId) {
      clearTimeout(rpsTimerId);
      rpsTimerId = null;
      console.log("Cleared previous RPS timer on tie.");
    }

    // Toon het gelijkspel resultaat
    if (typeof showRpsResult === "function") {
      // Geef 'null' mee als winnaar om gelijkspel aan te duiden
      showRpsResult(data.choices, null);
    }

    // Update instructie en heractiveer knoppen
    if (rpsInstructionP) {
      rpsInstructionP.textContent = "It's a Tie! Choose again.";
      rpsInstructionP.style.color = "black"; // Reset kleur
    }
    if (typeof enableRpsButtons === "function") {
      enableRpsButtons(true); // Knoppen weer actief maken
    }
    // UI panel blijft 'rps'

    // --- Restart RPS Timer for Tie ---
    console.log("Starting 10-second RPS timer for tie round...");
    rpsTimerId = setTimeout(() => {
      // Check if we are still in RPS phase and buttons are enabled
      if (gameState.currentPhase === "RPS_TIEBREAKER" && rpsChoiceBtns && !rpsChoiceBtns[0]?.disabled) {
        console.log("RPS Tie Timer expired! Making random choice.");
        const randomChoice = rpsOptions[Math.floor(Math.random() * rpsOptions.length)];

        // Play sounds
        if (typeof soundManager !== 'undefined') {
          soundManager.playSound("ui_click");
          soundManager.playSound(`rps_${randomChoice}`);
        }

        enableRpsButtons(false); // Disable buttons
        if (rpsInstructionP) rpsInstructionP.textContent = `Time's up! Randomly chose ${randomChoice}. Waiting...`;
        if (rpsResultDiv) rpsResultDiv.innerHTML = ""; // Clear previous result

        // Emit the random choice
        if (typeof socket !== "undefined" && typeof gameSession !== "undefined") {
          socket.emit("submitRpsChoice", {
            roomCode: gameSession.roomCode,
            choice: randomChoice,
          });
          console.log(`Emitted random RPS choice: ${randomChoice}`);
        } else {
          console.error("Cannot submit random RPS choice: Socket/Session missing.");
          if (rpsInstructionP) rpsInstructionP.textContent = `Error sending choice!`;
          enableRpsButtons(true);
        }
      } else {
        console.log("RPS Tie Timer expired, but choice already made or phase changed.");
      }
      rpsTimerId = null; // Clear timer ID
    }, 10000); // 10 seconds timeout
    // --- End Restart RPS Timer ---
  });
  // --- EINDE NIEUWE TIE HANDLER ---

  // VERWIJDERD: socket.off('nextRpsRound'); socket.on('nextRpsRound', ...);
  // VERWIJDERD: socket.off('rpsGameOver'); socket.on('rpsGameOver', ...);

  // --- EINDE AANGEPASTE RPS LISTENERS ---

  console.log("Game socket event listeners initialized/re-initialized.");
} // --- END initializeGameSocketEvents ---

// --- Game initialization, Board drawing, Pawn Initialization ---

function drawBoard() {
  console.log("Attempting to draw board...");
  try {
    if (typeof PIXI === "undefined" || !PIXI.Graphics)
      throw new Error("PIXI Graphics missing");
    if (typeof app === "undefined" || !app?.stage)
      throw new Error("PIXI App/Stage missing");
    if (!COLORS) throw new Error("COLORS missing");
    // Use new constants for drawing
    if (
      !MID_HAVEN_1_COORDS ||
      !MID_HAVEN_2_COORDS ||
      !CORNER_TL_COORD ||
      !CORNER_TR_COORD ||
      !CORNER_BL_COORD ||
      !CORNER_BR_COORD
    )
      throw new Error("Haven coords missing");
    if (
      CELL_SIZE === undefined ||
      BOARD_SIZE === undefined ||
      BOARD_HEIGHT === undefined ||
      BOARD_WIDTH === undefined
    )
      throw new Error("Board dimensions missing");
    if (typeof gridToPixel !== "function")
      throw new Error("gridToPixel missing");

    console.log(" -> Prerequisites checked for drawBoard.");
    const gfx = new PIXI.Graphics();
    console.log(" -> Graphics created for board.");

    // --- Teken Centrale Havens ---
    gfx.beginFill(COLORS.haven1); // Kleur voor P1 doel (boven)
    MID_HAVEN_1_COORDS.forEach((c) => {
      const p = gridToPixel(c.x, c.y);
      gfx.drawRect(p.x, p.y, CELL_SIZE, CELL_SIZE);
    });
    gfx.endFill();

    gfx.beginFill(COLORS.haven2); // Kleur voor P2 doel (onder)
    MID_HAVEN_2_COORDS.forEach((c) => {
      const p = gridToPixel(c.x, c.y);
      gfx.drawRect(p.x, p.y, CELL_SIZE, CELL_SIZE);
    });
    gfx.endFill();
    console.log(" -> Mid-Havens drawn.");

    // --- NIEUW: Teken Enkele Hoek Havens ---
    // Gebruik COLORS.haven1 voor P1's doel (bovenste hoeken)
    gfx.beginFill(COLORS.haven1);
    let p_tl = gridToPixel(CORNER_TL_COORD.x, CORNER_TL_COORD.y);
    gfx.drawRect(p_tl.x, p_tl.y, CELL_SIZE, CELL_SIZE);
    let p_tr = gridToPixel(CORNER_TR_COORD.x, CORNER_TR_COORD.y);
    gfx.drawRect(p_tr.x, p_tr.y, CELL_SIZE, CELL_SIZE);
    gfx.endFill();

    // Gebruik COLORS.haven2 voor P2's doel (onderste hoeken)
    gfx.beginFill(COLORS.haven2);
    let p_bl = gridToPixel(CORNER_BL_COORD.x, CORNER_BL_COORD.y);
    gfx.drawRect(p_bl.x, p_bl.y, CELL_SIZE, CELL_SIZE);
    let p_br = gridToPixel(CORNER_BR_COORD.x, CORNER_BR_COORD.y);
    gfx.drawRect(p_br.x, p_br.y, CELL_SIZE, CELL_SIZE);
    gfx.endFill();
    console.log(" -> Single Corner-Havens drawn.");

    // --- Draw Grid Lines using PixiJS with the correct color ---
    const gridLineColor = 0xac8130; // Correct brown color from test.css
    gfx.lineStyle(1, gridLineColor, 1); // Use the correct color
    for (let i = 0; i <= BOARD_SIZE; i++) {
      gfx.moveTo(i * CELL_SIZE, 0);
      gfx.lineTo(i * CELL_SIZE, BOARD_HEIGHT);
      gfx.moveTo(0, i * CELL_SIZE);
      gfx.lineTo(BOARD_WIDTH, i * CELL_SIZE);
    }
    console.log(" -> PixiJS grid lines drawn with correct color.");

    // Add graphics (havens and grid lines) to the stage at the bottom (layer 0)
    app.stage.addChildAt(gfx, 0);
    console.log("Board (Havens & Grid) drawn and added successfully.");
  } catch (error) {
    console.error("!!! ERROR IN drawBoard !!!", error.message, error.stack);
    showToast("Error drawing board: " + error.message);
    const el = document.getElementById("game-container");
    if (el) {
      const err = document.createElement("div");
      err.textContent = `Board Error: ${error.message}`;
      err.style.color = "red";
      el.appendChild(err);
    }
  }
}

function initializePawns() {
  console.log("Initializing pawns...");
  if (typeof Pawn === "undefined") {
    console.error("Pawn class missing!");
    return;
  }
  if (typeof gameState === "undefined" || !gameState.players) {
    console.error("Cannot initialize pawns: gameState.players missing!");
    return;
  }

  // Zorg dat de pawn arrays bestaan
  if (!gameState.players[PLAYER_1])
    gameState.players[PLAYER_1] = {
      pawns: [],
      cardsDefinedThisRound: [],
      cardsAvailableForLinking: [],
    };
  else gameState.players[PLAYER_1].pawns = []; // Leegmaken voor nieuwe initialisatie
  if (!gameState.players[PLAYER_2])
    gameState.players[PLAYER_2] = {
      pawns: [],
      cardsDefinedThisRound: [],
      cardsAvailableForLinking: [],
    };
  else gameState.players[PLAYER_2].pawns = []; // Leegmaken

  let id1 = 0;
  let id2 = 0;

  try {
    // Player 1 Pawns (Bottom rows)
    for (let y = BOARD_SIZE - 2; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const id = `p1_${id1++}`;
        const p = new Pawn(id, PLAYER_1, x, y);
        if (typeof p.createVisual === "function")
          p.createVisual(); // Maakt visual en voegt toe aan app.stage
        else console.warn(`Pawn ${id} missing createVisual method.`);
        gameState.players[PLAYER_1].pawns.push(p);
      }
    }

    // Player 2 Pawns (Top rows)
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const id = `p2_${id2++}`;
        const p = new Pawn(id, PLAYER_2, x, y);
        if (typeof p.createVisual === "function") p.createVisual();
        else console.warn(`Pawn ${id} missing createVisual method.`);
        gameState.players[PLAYER_2].pawns.push(p);
      }
    }
  } catch (e) {
    console.error("Error during pawn creation/visualization:", e);
    showToast("Error creating pawns.");
  }

  console.log(
    `Pawns initialized: P1(${gameState.players[PLAYER_1].pawns.length}), P2(${gameState.players[PLAYER_2].pawns.length})`
  );

  // Update pawn count display
  if (typeof updatePawnCountDisplay === "function") {
    updatePawnCountDisplay();
  }
}
// ***** EINDE drawBoard en initializePawns *****

// --- startCycle (aangeroepen door 'newCycle' event) ---
// Note: startCycle is likely NOT called anymore due to game-patch.js overriding the 'newCycle' handler.
// Sound playback is now handled within the patched 'newCycle' handler in game-patch.js.
function startCycle() {
  // Win check aan het begin? Server zou dit al moeten afvangen.
  // if (typeof checkWinCondition === 'function' && checkWinCondition()) { console.log("startCycle: Win condition met."); return; }

  // gameState.cycleNumber wordt al geüpdatet door 'newCycle' handler

  console.log(`--- Preparing Client for Cycle ${gameState.cycleNumber} ---`);
  const p1Pawns = gameState.players[PLAYER_1]?.pawns || [];
  const p2Pawns = gameState.players[PLAYER_2]?.pawns || [];

  // Reset visual/card state for all SURVIVING pawns
  [...p1Pawns, ...p2Pawns].forEach((p) => {
    if (p?.pixiObject) {
      // Check if pawn still exists visually
      p.isActive = false;
      p.currentHP = null;
      p.linkedCard = null;
      p.hasActedThisCycle = false; // Belangrijk voor UI state
      if (typeof p.hideStatsDisplay === "function") p.hideStatsDisplay();
      if (typeof p.setHighlight === "function") p.setHighlight(false);
      p.pixiObject.alpha = 1.0; // Reset alpha voor zichtbaarheid
      // Reset tint to normal
      if (p.graphics) {
        p.graphics.tint = 0xFFFFFF; // Reset to white (no tint)
      }
    }
  });

  // gameState.activePawnsThisCycle wordt idealiter geleegd door server state / niet lokaal gebruikt
  // gameState.activePawnsThisCycle[PLAYER_1] = [];
  // gameState.activePawnsThisCycle[PLAYER_2] = [];

  // gameState.roundNumber, gameState.currentPhase, gameState.currentPlayer worden gezet door 'newCycle' event

  console.log(
    `Client ready for Cycle ${gameState.cycleNumber}. Phase: ${gameState.currentPhase}, Player: ${gameState.currentPlayer}`
  );

  // Trigger de UI voor de startfase (Define)
  if (gameState.currentPhase?.endsWith("DEFINE")) {
    if (typeof handleCardDefinition === "function") {
      handleCardDefinition();
    } else {
      console.error("handleCardDefinition missing in startCycle!");
    }
  } else {
    console.warn(
      `New cycle started but phase is not DEFINE: ${gameState.currentPhase}`
    );
    // Mogelijk direct naar Action phase indien geen setup nodig? Onwaarschijnlijk.
    if (typeof updateGameStatusUI === "function") updateGameStatusUI(); // Update UI iig
  }
}
// --- End startCycle ---

// --- Interaction Handlers (met sound & bugfix) ---
function onBackgroundClick(event) {
  // Prevent cancelling selection if not actually clicking the stage background
  if (event.target !== app.stage) return;

  if (
    gameState.isAnimating ||
    gameState.currentPhase === "GAME_OVER" ||
    gameState.currentPhase === "WAITING_FOR_TURN"
  )
    return;
  if (gameState.currentPhase === "AWAITING_ACTION_TARGET") {
    console.log("Background clicked during target selection. Cancelling.");
    if (typeof soundManager !== "undefined")
      soundManager.playSound("ui_deselect");
    if (typeof cancelActionSelection === "function") cancelActionSelection();
  }
}

function onPawnClick(pawn) {
  console.log(
    `Clicked pawn: ${pawn?.id || "UNKNOWN"} in phase: ${gameState.currentPhase}`
  );
  if (!pawn) return;

  if (gameState.isAnimating || gameState.currentPhase === "GAME_OVER") {
    console.log("Input blocked (Animating or Game Over).");
    return;
  }
  if (gameState.currentPhase === "WAITING_FOR_TURN") {
    console.log("Input blocked (Waiting for Turn/Server).");
    showToast("Waiting for opponent or server...");
    return;
  }

  // --- Linking Phase ---
  if (
    gameState.currentPhase.startsWith("SETUP") &&
    gameState.currentPhase.endsWith("LINKING")
  ) {
    if (gameState.currentPlayer !== gameState.playerNumber) {
      console.log("Not your turn to link.");
      showToast("Wait for opponent to link.");
      return;
    }
    if (typeof handleLinkingPawnClick === "function")
      handleLinkingPawnClick(pawn);
    else console.error("handleLinkingPawnClick missing!");
    return;
  }

  // --- Action Phase ---
  if (gameState.currentPhase === "ACTION") {
    if (gameState.currentPlayer !== gameState.playerNumber) {
      console.log("Not your turn to act.");
      if (pawn.player !== gameState.playerNumber)
        console.log(`Clicked opponent pawn ${pawn.id}.`);
      else showToast("Waiting for opponent.");
      return;
    }

    if (pawn.player === gameState.currentPlayer) {
      // Is het een eigen pion?
      if (!pawn.isActive) {
        showToast(`Pawn ${pawn.id} is not active.`);
        return;
      }
      if (pawn.remainingStamina <= 0) {
        showToast(`Pawn ${pawn.id} has no stamina left.`);
        return;
      }

      if (gameState.selectedPawn === pawn) {
        // Opnieuw klikken op geselecteerde pion
        console.log("Re-clicked selected pawn. Cancelling selection.");
        if (typeof soundManager !== "undefined")
          soundManager.playSound("ui_deselect");
        if (typeof cancelActionSelection === "function")
          cancelActionSelection();
      } else {
        // Selecteer nieuwe pion direct zonder eerst te deselecteren
        // Deselecteer oude pion indien nodig
        if (gameState.selectedPawn && typeof gameState.selectedPawn.setHighlight === "function") {
          gameState.selectedPawn.setHighlight(false);
        }

        // Selecteer nieuwe pion
        if (typeof soundManager !== "undefined")
          soundManager.playSound("ui_click"); // Use ui_click sound
        gameState.selectedPawn = pawn;
        if (typeof pawn.setHighlight === "function") pawn.setHighlight(true);
        console.log(`Selected ${pawn.id}`);
        gameState.currentPhase = "AWAITING_ACTION_TARGET";
        if (typeof updateActionUI === "function") updateActionUI(pawn);
        if (typeof showActionTargets === "function") showActionTargets(pawn);
      }
    } else {
      console.log(`Clicked opponent pawn ${pawn.id} during your turn.`);
    } // Klik op tegenstander pion
    return;
  }

  // --- Awaiting Target Phase ---
  if (gameState.currentPhase === "AWAITING_ACTION_TARGET") {
    if (!gameState.selectedPawn) {
      console.warn("Clicked target but no pawn selected. Resetting.");
      if (typeof cancelActionSelection === "function") cancelActionSelection();
      return;
    }
    if (pawn === gameState.selectedPawn) {
      console.log(
        "Clicked selected pawn again while awaiting target. Cancelling."
      );
      if (typeof soundManager !== "undefined")
        soundManager.playSound("ui_deselect");
      if (typeof cancelActionSelection === "function") cancelActionSelection();
      return;
    }
    if (pawn.player !== gameState.currentPlayer) {
      console.log(`Targeted enemy pawn ${pawn.id} for attack.`);
      if (typeof onAttackTargetClick === "function") onAttackTargetClick(pawn);
      else console.error("onAttackTargetClick missing!");
      return;
    }
    if (pawn.player === gameState.currentPlayer) {
      console.log(`Clicked friendly pawn ${pawn.id}. Ignoring.`);
      showToast("Select a move target (green) or enemy target.");
      return;
    }
  }

  console.log(`Pawn click in unhandled phase: ${gameState.currentPhase}`);
} // End onPawnClick

function handleLinkingPawnClick(pawn) {
  if (gameState.currentPlayer !== gameState.playerNumber) {
    showToast("Not turn to link.");
    return;
  }
  const div = document.getElementById("linking-status");
  if (!selectedCardToLink) {
    const msg = "Select a card first!";
    if (div) div.textContent = msg;
    else showToast(msg);
    try { if (window.SpLogger) SpLogger.log('link.debug.noCard', { clickPawnId: pawn?.id, phase: gameState.currentPhase, currentPlayer: gameState.currentPlayer, me: gameState.playerNumber }); } catch (_) { }
    return;
  }
  if (pawn.player !== gameState.currentPlayer) {
    const msg = "Cannot link opponent pawn.";
    if (div) div.textContent = msg;
    else showToast(msg);
    return;
  }
  // --- Strengthened Check ---
  if (pawn.isActive || pawn.linkedCard) {
    // Check both isActive flag and if it already has a linkedCard object
    const msg = `Pawn ${pawn.id} is already linked.`;
    if (div) div.textContent = msg;
    else showToast(msg);
    return;
  }
  console.log(`Attempting link: Card ${selectedCardToLink.id} to Pawn ${pawn.id}`);
  try { if (window.SpLogger) SpLogger.log('link.debug.attempt', { cardId: selectedCardToLink.id, pawnId: pawn.id }); } catch (_) { }
  if (div) div.textContent = `Linking card...`;
  if (typeof socket !== "undefined" && typeof gameSession !== "undefined") {
    try { console.log('[link.emit]', { roomCode: gameSession.roomCode, cardId: selectedCardToLink.id, pawnId: pawn.id }); } catch (_) { }
    socket.emit("linkCard", {
      roomCode: gameSession.roomCode,
      cardId: selectedCardToLink.id,
      pawnId: pawn.id,
    });

    // Play linking sound
    if (typeof soundManager !== "undefined") {
      soundManager.playSound("ui_link");
    }
  } else {
    console.error("Socket/Session missing and not single player mode.");
    if (div) div.textContent = "Error linking.";
    else showToast("Error linking.");
  }
} // End handleLinkingPawnClick

function onEnemyPawnHover(targetPawn) {
  if (
    gameState.selectedPawn &&
    gameState.possibleAttackTargets?.some((p) => p === targetPawn)
  )
    setCursor(CURSOR_ATTACK);
  else setCursor(CURSOR_DEFAULT); // Reset if not a valid target
}

function onEnemyPawnOut(targetPawn) {
  setCursor(CURSOR_DEFAULT);
}

function handleCardLinkSelection(card, cardDiv) {
  if (
    !gameState.currentPhase.endsWith("LINKING") ||
    gameState.currentPlayer !== gameState.playerNumber ||
    card.isLinked
  ) {
    return; // Ignore clicks if not linking phase, not player's turn, or card already linked
  }
  
  // Block cards with more than 7 total points from being linked
  const totalPoints = (card.hp || 0) + (card.stamina || 0) + (card.attack || 0);
  if (totalPoints > 7) {
    console.log(`Card ${card.id} blocked from linking: Total points ${totalPoints} exceeds 7`);
    showToast("Cannot link card: Total points exceed 7");
    if (typeof soundManager !== "undefined") soundManager.playSound("ui_error");
    return;
  }

  const previouslySelectedCardId = selectedCardToLink?.id;

  if (selectedCardToLink === card) {
    // --- Deselecting the currently selected card ---
    console.log(`Deselecting card ${card.id}`);
    selectedCardToLink = null;
    if (cardDiv) {
      cardDiv.classList.remove("card-selected");
    } else {
      // Fallback if cardDiv wasn't passed correctly (shouldn't happen ideally)
      const el = document.querySelector(
        `.card-item[data-card-id="${card.id}"]`
      );
      if (el) el.classList.remove("card-selected");
    }
    if (typeof soundManager !== "undefined")
      soundManager.playSound("ui_deselect");
  } else {
    // --- Selecting a new card ---
    console.log(`Selecting card ${card.id}`);

    // Remove highlight from previously selected card element
    if (previouslySelectedCardId) {
      const prevEl = document.querySelector(
        `.card-item[data-card-id="${previouslySelectedCardId}"]`
      );
      if (prevEl) prevEl.classList.remove("card-selected");
    }

    // Set new selection and add highlight
    selectedCardToLink = card;
    if (cardDiv) {
      cardDiv.classList.add("card-selected");
    } else {
      // Fallback
      const el = document.querySelector(
        `.card-item[data-card-id="${card.id}"]`
      );
      if (el) el.classList.add("card-selected");
    }

    if (typeof soundManager !== "undefined") soundManager.playSound("ui_click"); // Use ui_click sound
  }

  // No longer call updateLinkingUI here, as it redraws everything and loses the class state.
  // updateLinkingUI should handle adding the class on initial draw/refresh.
} // End handleCardLinkSelection

// Plaats deze functie ergens in game-logic.js
function setupRpsButtonListeners() {
  if (!rpsButtonsDiv) {
    // Check of container bestaat
    console.warn("RPS buttons container not found, cannot add listeners.");
    return;
  }
  const currentChoiceBtns = rpsButtonsDiv.querySelectorAll(".rps-choice-btn"); // Haal knoppen opnieuw op
  if (currentChoiceBtns.length !== 3) {
    console.warn("Could not find exactly 3 RPS choice buttons.");
    return;
  }

  currentChoiceBtns.forEach((btn) => {
    // Verwijder eerst oude listeners door te klonen (simpele manier)
    btn.replaceWith(btn.cloneNode(true));
  });

  // Haal de GEKLOONDE knoppen op om listeners aan toe te voegen
  const newChoiceBtns = rpsButtonsDiv.querySelectorAll(".rps-choice-btn");

  newChoiceBtns.forEach((btn) => {
    // No hover sound anymore

    btn.addEventListener("click", () => {
      // Check of we in de juiste fase zijn en knoppen niet al disabled zijn
      if (gameState.currentPhase !== "RPS_TIEBREAKER" || btn.disabled) return;

      const choice = btn.dataset.choice;
      if (!choice) return;

      // Clear the timer because the player made a manual choice
      if (rpsTimerId) {
        clearTimeout(rpsTimerId);
        rpsTimerId = null;
        console.log("Cleared RPS timer due to manual choice.");
      }

      // Play both click sound and the specific RPS choice sound
      if (typeof soundManager !== 'undefined') {
        soundManager.playSound("ui_click");
        soundManager.playSound(`rps_${choice}`); // Play the specific choice sound
      }

      console.log(`Player chose RPS: ${choice}`);
      enableRpsButtons(false); // Disable na keuze
      if (rpsInstructionP)
        rpsInstructionP.textContent = `You chose ${choice}... Waiting for opponent...`;
      if (rpsResultDiv) rpsResultDiv.innerHTML = ""; // Wis vorig resultaat

      // Verstuur naar server
      if (typeof socket !== "undefined" && typeof gameSession !== "undefined") {
        socket.emit("submitRpsChoice", {
          roomCode: gameSession.roomCode,
          choice: choice,
        });
      } else {
        console.error("Cannot submit RPS choice: Socket/Session missing.");
        if (rpsInstructionP)
          rpsInstructionP.textContent = `Error sending choice!`;
        enableRpsButtons(true); // Re-enable on error
      }
    });
  });
  console.log("RPS button listeners attached/re-attached.");
}

// BELANGRIJK: Roep setupRpsButtonListeners() aan op het juiste moment!
// Dit moet gebeuren NADAT de UI gecached is EN de RPS UI voor het eerst getoond wordt.
// De beste plek is BINNEN de 'startRpsTiebreaker' socket listener (zie volgende punt).

// --- Action Phase Functions (met sound) ---
function cancelActionSelection() {
  console.log("Cancelling selection.");
  if (gameState.selectedPawn) {
    if (typeof soundManager !== "undefined")
      soundManager.playSound("ui_deselect");
    if (typeof gameState.selectedPawn.setHighlight === "function")
      gameState.selectedPawn.setHighlight(false);
    gameState.selectedPawn = null;
  }
  if (gameState.currentPhase === "AWAITING_ACTION_TARGET")
    gameState.currentPhase = "ACTION";
  if (typeof clearHighlights === "function") clearHighlights();
  if (typeof updateActionUI === "function") updateActionUI(null);
  if (typeof updateGameStatusUI === "function") updateGameStatusUI();
  setCursor(CURSOR_DEFAULT);
} // End cancelActionSelection

function clearHighlights() {
  if (highlightContainer && !highlightContainer.destroyed) {
    // Check if container exists and is not destroyed
    highlightContainer.removeChildren();
  } else if (!highlightContainer) {
    console.warn("clearHighlights: highlightContainer not found.");
  }
  gameState.possibleAttackTargets = [];
  setCursor(CURSOR_DEFAULT);
} // End clearHighlights

function showActionTargets(pawn) {
  if (typeof clearHighlights === "function") clearHighlights();
  if (!pawn?.linkedCard) {
    console.warn("showActionTargets invalid pawn/card.");
    return;
  }

  const moves =
    typeof getPossibleMoves === "function" ? getPossibleMoves(pawn) : [];
  gameState.possibleAttackTargets =
    typeof getValidAttackTargets === "function"
      ? getValidAttackTargets(pawn)
      : [];

  console.log(
    `Moves for ${pawn.id}: ${moves.length}`,
    moves.map((m) => `[${m.x},${m.y}]`)
  );
  console.log(
    `Targets for ${pawn.id}: ${gameState.possibleAttackTargets.length}`,
    gameState.possibleAttackTargets.map((t) => t.id)
  );

  if (
    gameState.currentPlayer === gameState.playerNumber &&
    highlightContainer &&
    !highlightContainer.destroyed
  ) {
    // Check container
    if (typeof PIXI === "undefined" || !PIXI.Graphics) {
      console.error("PIXI Graphics missing.");
      return;
    }
    moves.forEach((m) => {
      const p = gridToPixel(m.x, m.y);
      const hl = new PIXI.Graphics()
        .beginFill(COLORS.moveHighlight, 0.4)
        .drawRect(0, 0, CELL_SIZE, CELL_SIZE)
        .endFill();
      hl.position.set(p.x, p.y);
      hl.eventMode = "static";
      hl.cursor = CURSOR_POINTER;

      // Add stamina cost text
      if (m.staminaCost !== undefined) {
        const staminaText = new PIXI.Text(m.staminaCost.toString(), {
          fontFamily: 'Arial',
          fontSize: 14, // Smaller font
          fontWeight: 'normal', // Less bold
          fill: 0x004400, // Dark green text to blend better
          stroke: 0xFFFFFF, // White outline for visibility
          strokeThickness: 1 // Thinner stroke
        });
        staminaText.anchor.set(0.5, 0.5);
        staminaText.position.set(CELL_SIZE / 2, CELL_SIZE / 2 - 2);
        staminaText.alpha = 0.8; // Semi-transparent
        hl.addChild(staminaText);

        // Add remaining stamina text in smaller font below
        const remainingText = new PIXI.Text(`(${m.remainingStamina})`, {
          fontFamily: 'Arial',
          fontSize: 10, // Even smaller
          fill: 0x004400, // Dark green to match
          stroke: 0xFFFFFF,
          strokeThickness: 0.5 // Very thin stroke
        });
        remainingText.anchor.set(0.5, 0.5);
        remainingText.position.set(CELL_SIZE / 2, CELL_SIZE / 2 + 10);
        remainingText.alpha = 0.7; // More transparent
        hl.addChild(remainingText);
      }

      // Gebruik een closure om de correcte m.x, m.y vast te houden
      hl.on(
        "pointerdown",
        ((moveX, moveY) => (e) => {
          if (
            gameState.isAnimating ||
            gameState.currentPhase === "WAITING_FOR_TURN"
          )
            return;
          if (gameState.currentPhase === "AWAITING_ACTION_TARGET") {
            e.stopPropagation(); // Voorkom dat background click triggert
            console.log(`Move highlight clicked for [${moveX}, ${moveY}]`);
            if (typeof onMoveTargetClick === "function")
              onMoveTargetClick(moveX, moveY);
          }
        })(m.x, m.y)
      ); // Geef m.x, m.y mee aan de closure
      highlightContainer.addChild(hl);
    });

    // Add attack highlighting (red)
    gameState.possibleAttackTargets.forEach((target) => {
      const p = gridToPixel(target.gridX, target.gridY);
      const hl = new PIXI.Graphics()
        .beginFill(COLORS.attackHighlight, 0.5) // Red color with transparency
        .drawRect(0, 0, CELL_SIZE, CELL_SIZE)
        .endFill();
      hl.position.set(p.x, p.y);
      hl.eventMode = "static";
      hl.cursor = CURSOR_POINTER;

      // Add click handler for attack
      hl.on("pointerdown", (e) => {
        if (
          gameState.isAnimating ||
          gameState.currentPhase === "WAITING_FOR_TURN"
        )
          return;
        if (gameState.currentPhase === "AWAITING_ACTION_TARGET") {
          e.stopPropagation();
          console.log(`Attack target clicked: ${target.id}`);
          if (typeof onAttackTargetClick === "function")
            onAttackTargetClick(target);
        }
      });

      highlightContainer.addChild(hl);
    });
  }
  setCursor(CURSOR_DEFAULT);
} // End showActionTargets

function getPossibleMoves(pawn) {
  const moves = [];
  // Check if stamina is available - use either stamina or speed for backwards compatibility
  const stamina = pawn?.linkedCard?.stamina;
  if (!stamina || stamina <= 0) return moves;

  // Make sure remaining stamina is initialized
  if (pawn.remainingStamina === undefined && pawn.isActive) {
    pawn.remainingStamina = stamina; // Initialize if not set yet
  }

  // Check if pawn has remaining stamina for this turn
  if (!pawn.remainingStamina || pawn.remainingStamina <= 0) return moves;

  // With stamina system, we look for moves up to stamina steps away
  // but only highlight adjacent cells for simplicity
  const dirs = [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ];

  // Use breadth-first search to find all reachable positions within stamina steps
  const queue = [{ x: pawn.gridX, y: pawn.gridY, dist: 0 }];
  const visited = new Set([`${pawn.gridX},${pawn.gridY}`]);

  while (queue.length > 0) {
    const current = queue.shift();

    // If we've used a step, we can check adjacent cells
    if (current.dist > 0) {
      // Add this position as a move target with stamina cost
      moves.push({
        x: current.x,
        y: current.y,
        staminaCost: current.dist,
        remainingStamina: pawn.remainingStamina - current.dist
      });
    }

    // Only explore further if we haven't reached max stamina
    if (current.dist < pawn.remainingStamina) {
      for (const dir of dirs) {
        const nextX = current.x + dir.x;
        const nextY = current.y + dir.y;
        const nextKey = `${nextX},${nextY}`;

        // Check if valid position and not visited
        if (isValidCoord(nextX, nextY) && !visited.has(nextKey)) {
          visited.add(nextKey);

          // Only add to queue if not occupied
          if (!isOccupied(nextX, nextY)) {
            queue.push({ x: nextX, y: nextY, dist: current.dist + 1 });
          }
        }
      }
    }
  }

  // Remove the starting position from moves if it was added
  return moves;
} // End getPossibleMoves

function getValidAttackTargets(attackerPawn) {
  const targets = [];
  // Check attack stat and if enough stamina is left
  if (!attackerPawn?.linkedCard?.attack || attackerPawn.linkedCard.attack <= 0)
    return targets; // Check attack > 0

  // Check if pawn has remaining stamina for this turn
  if (!attackerPawn.remainingStamina || attackerPawn.remainingStamina <= 0)
    return targets;

  const dirs = [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ];
  const opponentPlayer = attackerPawn.player === PLAYER_1 ? PLAYER_2 : PLAYER_1;

  dirs.forEach((d) => {
    const targetX = attackerPawn.gridX + d.x;
    const targetY = attackerPawn.gridY + d.y;
    if (isValidCoord(targetX, targetY)) {
      const targetPawn = getPawnAt(targetX, targetY);
      // Check of er een pion is EN of het een tegenstander is
      if (targetPawn && targetPawn.player === opponentPlayer) {
        targets.push(targetPawn);
      }
    }
  });
  return targets;
} // End getValidAttackTargets

// Get all enemy pawns as valid targets for physics attacks
function getAllEnemyPawns(attackerPawn) {
  const targets = [];

  // Check attack stat
  if (!attackerPawn?.linkedCard?.attack || attackerPawn.linkedCard.attack <= 0)
    return targets;

  // Check if pawn has remaining stamina for this turn
  if (!attackerPawn.remainingStamina || attackerPawn.remainingStamina <= 0)
    return targets;

  const opponentPlayer = attackerPawn.player === PLAYER_1 ? PLAYER_2 : PLAYER_1;

  // Get all opponent pawns
  if (gameState.players[opponentPlayer] && gameState.players[opponentPlayer].pawns) {
    gameState.players[opponentPlayer].pawns.forEach(pawn => {
      if (pawn && !pawn.destroyed) {
        targets.push(pawn);
      }
    });
  }

  return targets;
} // End getAllEnemyPawns

// In public/js/game-logic.js
function onMoveTargetClick(targetGridX, targetGridY) {
  // Check of interactie geblokkeerd is
  if (
    gameState.currentPhase === "WAITING_FOR_TURN" ||
    gameState.currentPhase === "WAITING_FOR_ANIM" ||
    gameState.isAnimating
  )
    return;
  // Check of de staat correct is voor deze actie
  if (
    gameState.currentPhase !== "AWAITING_ACTION_TARGET" ||
    !gameState.selectedPawn
  ) {
    console.warn("Move target clicked in invalid state or no pawn selected.");
    if (typeof cancelActionSelection === "function") cancelActionSelection();
    return;
  }
  // Check of doel bezet is
  if (isOccupied(targetGridX, targetGridY)) {
    showToast("Target square is occupied.");
    return;
  }

  // Roep ALTIJD handleMoveAction aan; die functie bepaalt de flow.
  if (typeof handleMoveAction === "function") {
    handleMoveAction(gameState.selectedPawn, targetGridX, targetGridY);
  } else {
    console.error("handleMoveAction function N/A.");
  }
}

// Highlight attackable targets in red
function highlightAttackTargets(attackingPawn) {
  if (!attackingPawn || !attackingPawn.linkedCard) return;

  // Get all pawns in attack range
  const attackTargets = getAttackTargets(attackingPawn);

  if (
    gameState.currentPlayer === gameState.playerNumber &&
    highlightContainer &&
    !highlightContainer.destroyed
  ) {
    attackTargets.forEach((target) => {
      const p = gridToPixel(target.gridX, target.gridY);
      const hl = new PIXI.Graphics()
        .beginFill(COLORS.attackHighlight, 0.5) // Red color with transparency
        .drawRect(0, 0, CELL_SIZE, CELL_SIZE)
        .endFill();
      hl.position.set(p.x, p.y);
      hl.eventMode = "static";
      hl.cursor = CURSOR_POINTER;

      // Add click handler for attack
      hl.on("pointerdown", (e) => {
        if (
          gameState.isAnimating ||
          gameState.currentPhase === "WAITING_FOR_TURN"
        )
          return;
        if (gameState.currentPhase === "AWAITING_ACTION_TARGET") {
          e.stopPropagation();
          console.log(`Attack target clicked: ${target.id}`);
          if (typeof onAttackTargetClick === "function")
            onAttackTargetClick(target);
        }
      });

      highlightContainer.addChild(hl);
    });
  }
}

// Get pawns that can be attacked by the given pawn
function getAttackTargets(attackingPawn) {
  if (!attackingPawn || !attackingPawn.linkedCard) return [];

  const targets = [];
  const allPawns = [
    ...(gameState.players[PLAYER_1]?.pawns || []),
    ...(gameState.players[PLAYER_2]?.pawns || [])
  ];

  // Check adjacent squares for enemy pawns
  const adjacentPositions = [
    { x: attackingPawn.gridX - 1, y: attackingPawn.gridY }, // Left
    { x: attackingPawn.gridX + 1, y: attackingPawn.gridY }, // Right
    { x: attackingPawn.gridX, y: attackingPawn.gridY - 1 }, // Up
    { x: attackingPawn.gridX, y: attackingPawn.gridY + 1 }  // Down
  ];

  adjacentPositions.forEach(pos => {
    if (isValidCoord(pos.x, pos.y)) {
      const targetPawn = allPawns.find(p =>
        p && p.isActive && p.gridX === pos.x && p.gridY === pos.y && p.player !== attackingPawn.player
      );
      if (targetPawn) {
        targets.push(targetPawn);
      }
    }
  });

  return targets;
}











// In public/js/game-logic.js
function onAttackTargetClick(targetPawn) {
  // Check of interactie geblokkeerd is
  if (
    gameState.currentPhase === "WAITING_FOR_TURN" ||
    gameState.currentPhase === "WAITING_FOR_ANIM" ||
    gameState.isAnimating
  )
    return;
  // Check of de staat correct is
  if (
    gameState.currentPhase !== "AWAITING_ACTION_TARGET" ||
    !gameState.selectedPawn
  ) {
    console.warn("Attack target clicked in invalid state or no pawn selected.");
    if (typeof cancelActionSelection === "function") cancelActionSelection();
    return;
  }

  // Physics attack integration removed

  // Basis validatie (is target adjacent & opponent?)
  const attacker = gameState.selectedPawn;
  const dx = Math.abs(attacker.gridX - targetPawn.gridX);
  const dy = Math.abs(attacker.gridY - targetPawn.gridY);
  const isAdj = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  const isOpponent = targetPawn.player !== attacker.player;
  if (!isAdj || !isOpponent) {
    showToast("Invalid attack target.");
    return;
  }
  if (!attacker.linkedCard || attacker.linkedCard.attack < 1) {
    showToast("Cannot attack with 0 attack power.");
    return;
  }

  // Roep ALTIJD handleAttackAction aan; die functie bepaalt de flow.
  if (typeof handleAttackAction === "function") {
    handleAttackAction(attacker, targetPawn);
  } else {
    console.error("handleAttackAction function N/A.");
  }
}

// --- handleMoveAction (initieert server call & local state change) ---
function handleMoveAction(pawn, targetGridX, targetGridY) {
  if (gameState.currentPhase === "GAME_OVER" || !pawn || !pawn.pixiObject) {
    console.warn("handleMoveAction invalid state/pawn.");
    return;
  }
  const isLocalPlayerAction = pawn.player === gameState.playerNumber;
  console.log(
    `Handling move: ${pawn.id} to [${targetGridX}, ${targetGridY}] (Local: ${isLocalPlayerAction})`
  );

  if (isLocalPlayerAction) {
    if (typeof soundManager !== "undefined")
      soundManager.playSound("pawn_move");

    // Check if the pawn is moving into a haven
    const isP1 = pawn.player === PLAYER_1;
    const targetHavens = isP1 ? ALL_TARGET_HAVENS_P1 : ALL_TARGET_HAVENS_P2;
    const isMovingToHaven = targetHavens.some(
      (c) => c.x === targetGridX && c.y === targetGridY
    );

    if (isMovingToHaven && typeof soundManager !== "undefined") {
      soundManager.playSound("pawn_in_haven");
    }

    if (typeof clearHighlights === "function") clearHighlights();

    // Lock input BEFORE emitting
    gameState.selectedPawn = null;
    gameState.currentPhase = "WAITING_FOR_TURN";
    if (typeof updateActionUI === "function") updateActionUI(null);
    console.log("Local move action initiated. Input locked.");

    // In test mode, skip server communication
    if (gameState.testMode) {
      console.log("Test mode: Skipping server communication");

      // Simulate server response after animation
      setTimeout(() => {
        // Update pawn position
        pawn.gridX = targetGridX;
        pawn.gridY = targetGridY;
        pawn.remainingStamina = Math.max(0, (pawn.remainingStamina || 0) - 1);

        // In test mode, reset stamina if it reaches 0
        if (pawn.remainingStamina <= 0) {
          pawn.remainingStamina = pawn.linkedCard?.stamina || 5;
        }

        // Update UI
        if (typeof pawn.updateBars === "function") {
          pawn.updateBars();
        }

        // Reset phase for continued testing
        gameState.currentPhase = "ACTION";
        gameState.selectedPawn = null;
        if (typeof updateActionUI === "function") updateActionUI(null);

        // Check win conditions
        if (typeof checkWinCondition === "function") {
          checkWinCondition();
        }
      }, 500);
    } else {
      // Normal server communication
      if (typeof socket !== "undefined" && typeof gameSession !== "undefined") {
        socket.emit("gameAction", {
          roomCode: gameSession.roomCode,
          actionType: "move",
          pawnId: pawn.id,
          targetX: targetGridX,
          targetY: targetGridY,
        });
      } else {
        console.error("Socket/Session N/A for move action.");
        // Unlock if emit fails?
        gameState.currentPhase = "ACTION"; // Revert phase
        if (typeof updateActionUI === "function") updateActionUI(pawn); // Show pawn again
        showToast("Error sending action to server.");
        return;
      }
    }

    // Start local animation optimistically
    if (typeof pawn.animateMoveTo === "function") {
      const actionInitiatedCycle = gameState.cycleNumber;
      pawn.animateMoveTo(targetGridX, targetGridY, () => {
        console.log(
          `Local move animation finished for ${pawn.id}. Cycle: ${gameState.cycleNumber}.`
        );
      });
    } else {
      console.warn(`Pawn ${pawn.id} missing animateMoveTo.`);
      if (typeof pawn.updatePosition === "function")
        pawn.updatePosition(targetGridX, targetGridY);
    }
  } else {
    console.error(
      "handleMoveAction called for non-local player action. This shouldn't happen."
    );
  }
} // End handleMoveAction

// --- handleAttackAction (initieert server call & local state change) ---
function handleAttackAction(attackerPawn, defenderPawn) {
  if (gameState.currentPhase === "GAME_OVER") {
    console.log("Attack ignored: Game Over.");
    return;
  }
  if (!attackerPawn || !attackerPawn.linkedCard || !attackerPawn.pixiObject) {
    console.error("handleAttackAction: Attacker invalid.");
    if (
      typeof cancelActionSelection === "function" &&
      attackerPawn?.player === gameState.playerNumber
    )
      cancelActionSelection();
    return;
  }
  if (!defenderPawn || !defenderPawn.pixiObject) {
    console.error(`handleAttackAction: Defender invalid.`);
    if (attackerPawn.player === gameState.playerNumber) {
      showToast("Target invalid.");
      if (typeof cancelActionSelection === "function") cancelActionSelection();
    }
    return;
  }
  if (attackerPawn.player === defenderPawn.player) {
    console.error("handleAttackAction: Cannot attack own pawn.");
    if (
      attackerPawn.player === gameState.playerNumber &&
      typeof cancelActionSelection === "function"
    )
      cancelActionSelection();
    return;
  }

  const isLocalPlayerAction = attackerPawn.player === gameState.playerNumber;
  console.log(
    `Handling Attack: ${attackerPawn.id}(A:${attackerPawn.linkedCard.attack}) vs ${defenderPawn.id} (Local: ${isLocalPlayerAction})`
  );

  if (isLocalPlayerAction) {
    if (typeof soundManager !== "undefined") soundManager.playSound("attack");
    if (typeof clearHighlights === "function") clearHighlights();

    // Add screen shake for impact
    if (app && app.stage) {
      const originalX = app.stage.x;
      const originalY = app.stage.y;
      if (typeof gsap !== "undefined") {
        gsap.to(app.stage, {
          x: originalX + (Math.random() - 0.5) * 10,
          y: originalY + (Math.random() - 0.5) * 10,
          duration: 0.1,
          yoyo: true,
          repeat: 3,
          ease: "power2.out",
          onComplete: () => {
            app.stage.x = originalX;
            app.stage.y = originalY;
          }
        });
      }
    }

    // Lock input BEFORE emitting
    gameState.selectedPawn = null;
    gameState.currentPhase = "WAITING_FOR_TURN";
    if (typeof updateActionUI === "function") updateActionUI(null);
    console.log("Local attack action emitted. Input locked.");

    // In test mode, simulate attack locally
    if (gameState.testMode) {
      console.log("Test mode: Simulating attack locally");

      // Calculate damage
      const attackPower = attackerPawn.linkedCard.attack || 0;
      const defenderHP = defenderPawn.currentHP || defenderPawn.linkedCard?.hp || 0;
      const counterAttack = defenderPawn.linkedCard?.attack || 0;

      // Simulate attack results
      setTimeout(() => {
        // Apply damage to defender
        defenderPawn.currentHP = Math.max(0, defenderHP - attackPower);

        // Apply counter damage to attacker if defender survives
        if (defenderPawn.currentHP > 0 && counterAttack > 0) {
          const attackerHP = attackerPawn.currentHP || attackerPawn.linkedCard?.hp || 0;
          attackerPawn.currentHP = Math.max(0, attackerHP - counterAttack);
        }

        // Handle elimination
        if (defenderPawn.currentHP <= 0) {
          // Move attacker to defender position
          const targetX = defenderPawn.gridX;
          const targetY = defenderPawn.gridY;

          // Destroy defender
          defenderPawn.destroyVisual();
          const defenderIndex = gameState.players[defenderPawn.player].pawns.indexOf(defenderPawn);
          if (defenderIndex > -1) {
            gameState.players[defenderPawn.player].pawns.splice(defenderIndex, 1);
          }

          // Move attacker
          if (typeof attackerPawn.animateMoveTo === "function") {
            attackerPawn.animateMoveTo(targetX, targetY, () => {
              attackerPawn.gridX = targetX;
              attackerPawn.gridY = targetY;
            });
          }
        }

        // Handle attacker elimination
        if (attackerPawn.currentHP <= 0) {
          attackerPawn.destroyVisual();
          const attackerIndex = gameState.players[attackerPawn.player].pawns.indexOf(attackerPawn);
          if (attackerIndex > -1) {
            gameState.players[attackerPawn.player].pawns.splice(attackerIndex, 1);
          }
        }

        // Update UI
        if (attackerPawn.currentHP > 0) {
          attackerPawn.updateStatsDisplay(attackerPawn.linkedCard, attackerPawn.currentHP);
          attackerPawn.updateBars();
          attackerPawn.hasActedThisCycle = true;
        }

        if (defenderPawn.currentHP > 0) {
          defenderPawn.updateStatsDisplay(defenderPawn.linkedCard, defenderPawn.currentHP);
          defenderPawn.updateBars();
        }

        // Reset phase for continued testing
        gameState.currentPhase = "ACTION";
        gameState.selectedPawn = null;
        if (typeof updateActionUI === "function") updateActionUI(null);

        // Check win conditions
        if (typeof checkWinCondition === "function") {
          checkWinCondition();
        }
      }, 500);
    } else {
      // Normal server communication
      if (typeof socket !== "undefined" && typeof gameSession !== "undefined") {
        socket.emit("gameAction", {
          roomCode: gameSession.roomCode,
          actionType: "attack",
          pawnId: attackerPawn.id,
          targetPawnId: defenderPawn.id,
        });
      } else {
        console.error("Socket/Session N/A for attack action.");
        gameState.currentPhase = "ACTION"; // Unlock
        if (typeof updateActionUI === "function") updateActionUI(attackerPawn);
        showToast("Error sending action to server.");
        return;
      }
    }

    // Optimistic animation prediction for attacker move
    const attackerAttackPower = attackerPawn.linkedCard.attack || 0;
    const defenderHasCard = defenderPawn.isActive && defenderPawn.linkedCard;
    const defenderAttackPower = defenderHasCard
      ? defenderPawn.linkedCard?.attack || 0
      : 0;
    const attackerOriginalHP = attackerPawn.currentHP;
    const defenderOriginalHP = defenderHasCard ? defenderPawn.currentHP : 0;
    const attackerWouldBeEliminated = defenderAttackPower >= attackerOriginalHP;
    const defenderWouldBeEliminated =
      (defenderHasCard && attackerAttackPower >= defenderOriginalHP) ||
      (!defenderHasCard && attackerAttackPower > 0);
    const attackerMightMove =
      defenderWouldBeEliminated && !attackerWouldBeEliminated;
    let defenderOriginalX = defenderPawn.gridX;
    let defenderOriginalY = defenderPawn.gridY;

    if (attackerMightMove) {
      console.log(
        ` -> Client predicts attacker ${attackerPawn.id} might move to [${defenderOriginalX}, ${defenderOriginalY}] (starting animation optimistically)`
      );
      if (typeof attackerPawn.animateMoveTo === "function") {
        attackerPawn.animateMoveTo(defenderOriginalX, defenderOriginalY, () => {
          console.log(
            `Optimistic move anim finished for ${attackerPawn?.id || "?"}.`
          );
        });
      } else {
        if (typeof attackerPawn.updatePosition === "function")
          attackerPawn.updatePosition(defenderOriginalX, defenderOriginalY);
      }
    } else {
      console.log(
        ` -> Client predicts attacker ${attackerPawn.id} does not move.`
      );
    }
  } else {
    console.error(
      "handleAttackAction called for non-local player action. This shouldn't happen."
    );
  }
} // End handleAttackAction

// --- removePawnFromState ---
function removePawnFromState(pawnToRemove) {
  if (!pawnToRemove || typeof gameState === "undefined" || !gameState.players)
    return;
  console.log(
    `Removing pawn ${pawnToRemove.id} (Player ${pawnToRemove.player}) from client state.`
  );

  const playerPawns = gameState.players[pawnToRemove.player]?.pawns;
  if (playerPawns) {
    const idx = playerPawns.findIndex((p) => p?.id === pawnToRemove.id);
    if (idx > -1) {
      console.log(
        ` -> Found in player ${pawnToRemove.player} pawns list at index ${idx}. Splicing.`
      );
      playerPawns.splice(idx, 1);
    } else {
      console.log(` -> Not found in player ${pawnToRemove.player} pawns list.`);
    }
  } else {
    console.log(` -> Player ${pawnToRemove.player} pawn list not found.`);
  }

  // Update pawn count display after removing a pawn
  if (typeof updatePawnCountDisplay === "function") {
    updatePawnCountDisplay();
  }

  // Optioneel: Verwijder ook uit activePawnsThisCycle als je die lokaal bijhoudt
  // const activePawns = gameState.activePawnsThisCycle[pawnToRemove.player];
  // if (activePawns) { const idx2 = activePawns.findIndex(p => p?.id === pawnToRemove.id); if (idx2 > -1) activePawns.splice(idx2, 1); }
} // End removePawnFromState

// --- endTurn function is now handled by game-patch.js ---
// Removed original endTurn definition to prevent conflicts with the patch

// --- Win Condition Check ---
function checkWinCondition() {
  // Alleen checken als het spel niet al voorbij is
  if (gameState.winner !== null || gameState.currentPhase === "GAME_OVER")
    return true; // Al gewonnen

  let winner = null;
  let reason = "";
  const p1Pawns =
    gameState.players[PLAYER_1]?.pawns?.filter((p) => p && p.pixiObject) || [];
  const p2Pawns =
    gameState.players[PLAYER_2]?.pawns?.filter((p) => p && p.pixiObject) || [];

  // --- Haven Check (GEWIJZIGD voor 5 doelvakjes) ---
  // Check hoeveel P1 pionnen in P1's *doel* havens staan (boven midden + boven hoeken)
  let p1InTargetHavenCount = p1Pawns.filter(
    (p) => ALL_TARGET_HAVENS_P1.some((c) => c.x === p.gridX && c.y === p.gridY) // Gebruik nieuwe lijst
  ).length;

  // Check hoeveel P2 pionnen in P2's *doel* havens staan (onder midden + onder hoeken)
  let p2InTargetHavenCount = p2Pawns.filter(
    (p) => ALL_TARGET_HAVENS_P2.some((c) => c.x === p.gridX && c.y === p.gridY) // Gebruik nieuwe lijst
  ).length;

  console.log("--- Win Condition Check (Mid + Single Corners) ---");
  console.log(
    `Counts: P1 in Target Havens=${p1InTargetHavenCount}, P2 in Target Havens=${p2InTargetHavenCount}`
  );

  // Win conditie blijft hetzelfde (>= 2)
  if (p1InTargetHavenCount >= 2) {
    winner = PLAYER_1;
    reason = "Haven capture";
  } else if (p2InTargetHavenCount >= 2) {
    winner = PLAYER_2;
    reason = "Haven capture";
  }

  // Eliminatie Check (alleen als geen haven winst)
  if (winner === null) {
    const p1Total = p1Pawns.length;
    const p2Total = p2Pawns.length;
    console.log(`Elim Check: P1 Pawns=${p1Total}, P2 Pawns=${p2Total}`);
    if (p2Total === 0 && p1Total > 0) {
      winner = PLAYER_1;
      reason = "Opponent eliminated";
    } else if (p1Total === 0 && p2Total > 0) {
      winner = PLAYER_2;
      reason = "Opponent eliminated";
    } else if (p1Total === 0 && p2Total === 0) {
      // Draw condition - should ideally not happen if win is checked after each action
      console.warn("DRAW condition met? Both players have 0 pawns.");
      winner = 0;
      reason = "Mutual elimination (Draw)"; // Use 0 for draw
    }
  }

  // Verwerk winnaar
  if (winner !== null) {
    console.log(
      `!!! GAME OVER DETECTED (Client Side) - Winner: ${winner === 0 ? "DRAW" : "Player " + winner
      }, Reason: ${reason} !!!`
    );
    try { if (window.SpLogger) SpLogger.log("game.over.client", { winner, reason, cycle: gameState.cycleNumber, round: gameState.roundNumber }); } catch (_) { }
    gameState.winner = winner;
    gameState.currentPhase = "GAME_OVER";
    if (typeof updateGameStatusUI === "function") updateGameStatusUI();
    if (typeof clearHighlights === "function") clearHighlights();
    if (gameState.selectedPawn?.setHighlight)
      gameState.selectedPawn.setHighlight(false);
    setCursor(CURSOR_DEFAULT);
    isShaking = false; // Stop eventuele shake
    // Belangrijk: Server MOET ook gameOver event sturen voor officiële afhandeling.
    // Client kan dit loggen maar wacht idealiter op server event.
    return true;
  }

  console.log("--- Win Check END (No Winner) ---");
  return false;
} // End checkWinCondition

// --- Card Definition UI Handling ---
function handleCardDefinition() {
  console.log(
    `handleCardDefinition: Phase=${gameState.currentPhase}, P=${gameState.currentPlayer}, Me=${gameState.playerNumber}`
  );
  if (
    !gameState.currentPhase ||
    gameState.currentPlayer === null ||
    gameState.playerNumber === null
  ) {
    console.error("handleCardDefinition: Critical state missing!");
    showToast("Error: State invalid.");
    return;
  }

  // Stop any existing timer before proceeding
  TimerManager.stop();

  if (gameState.currentPhase.endsWith("DEFINE")) {
    if (gameState.currentPlayer === gameState.playerNumber) {
      console.log(
        `My turn (P${gameState.playerNumber}) to define cards for R${gameState.roundNumber}.`
      );
      // Sound is now played in startCycle
      if (typeof showUIPanel === "function") showUIPanel("define");
      if (typeof resetCardInputFields === "function") resetCardInputFields();
      if (typeof setupCardInputListeners === "function")
        setupCardInputListeners();
      const roundS = document.getElementById("def-round-num");
      const playerS = document.getElementById("def-player-num");
      if (roundS) roundS.textContent = gameState.roundNumber;
      if (playerS) playerS.textContent = gameState.playerNumber;
      const btn = document.getElementById("confirm-cards-btn");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Confirm Cards";
        // Ensure only one click handler
        btn.replaceWith(btn.cloneNode(true)); // Remove old listeners
        document.getElementById("confirm-cards-btn").onclick = () => handleConfirmCards(); // Add new one

        // ⏳ Auto-submit or disable after 40 seconds
        TimerManager.start(40, () => {
          showToast("⏳ Time's up! Auto-submitting cards.");
          handleConfirmCards();
        });
      } else console.error("Confirm button missing!");
    } else {
      console.log(
        `Waiting for P${gameState.currentPlayer} to define cards for R${gameState.roundNumber}.`
      );
      if (typeof showUIPanel === "function") showUIPanel("waiting");
    }
  } else {
    console.log(
      `Not DEFINE phase (${gameState.currentPhase}). Hiding definition UI.`
    );
    const cdUI = document.getElementById("card-definition-ui");
    const owUI = document.getElementById("opponent-waiting");
    if (cdUI) cdUI.style.display = "none";
    if (owUI) owUI.style.display = "none";
  }
} // End handleCardDefinition

function handleConfirmCards() {
  console.log(`Confirm cards clicked by P${gameState.playerNumber}`);
  const cards = [];
  let allValid = true;
  const btn = document.getElementById("confirm-cards-btn");

  for (let i = 1; i <= 3; i++) {
    const hpI = document.getElementById(`card${i}-hp`);
    const spI = document.getElementById(`card${i}-stamina`);
    const atI = document.getElementById(`card${i}-attack`);
    if (!hpI || !spI || !atI) {
      showToast(`Input fields missing for Card ${i}!`);
      allValid = false;
      break;
    }
    const hp = parseInt(hpI.value, 10);
    const spd = parseInt(spI.value, 10);
    const atk = parseInt(atI.value, 10);

    if (
      isNaN(hp) ||
      isNaN(spd) ||
      isNaN(atk) ||
      hp < 1 ||
      spd < 1 ||
      atk < 1 ||
      hp + spd + atk !== 7
    ) {
      showToast(
        `Card ${i} invalid! Sum must be 7, min 1 per stat. (H:${hp || "?"} S:${spd || "?"
        } A:${atk || "?"})`
      );
      allValid = false;
      break;
    }
    // Gebruik unieke ID (server-side zou dit moeten overschrijven/valideren)
    const card = {
      id: `p${gameState.playerNumber}_r${gameState.roundNumber}_c${i - 1
        }_${Date.now()}`,
      player: gameState.playerNumber,
      hp,
      stamina: spd,
      attack: atk,
      isLinked: false,
    };
    cards.push(card);
    console.log(` -> Validated C${i}: H=${hp}, S=${spd}, A=${atk}`);
  }

  if (allValid) {
    console.log("Submitting cards...");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Submitting...";
    }
    console.log('🔍 Socket/session check:', {
      hasSocket: typeof socket !== "undefined",
      socket: socket,
      hasGameSession: typeof gameSession !== "undefined",
      gameSession: gameSession,
    });

    if (typeof socket !== "undefined" && typeof gameSession !== "undefined") {
      // Play confirmation sound
      if (typeof soundManager !== "undefined") {
        soundManager.playSound("ui_confirm_cards");
      }

      if (socket && socket.emit) {
        socket.emit("defineCards", {
          roomCode: gameSession?.roomCode || 'SINGLE',
          cards: cards,
          playerNum: gameState.playerNumber,
        });
      }
      if (typeof showUIPanel === "function") showUIPanel("waiting"); // Ga naar wachtscherm na verzenden
    } else {
      console.error("Cannot emit defineCards - socket/session missing.");
      console.error('🔍 Detailed error info:', {
        socketType: typeof socket,
        sessionType: typeof gameSession,
        socketExists: !!window.socket,
        sessionExists: !!window.gameSession,
      });
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Confirm Cards";
      } // Enable button on error
      showToast("Error sending cards to server.");
    }
  } else {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Confirm Cards";
    } // Enable button if validation failed
  }
} // End handleConfirmCards

// --- Player Turn Handling ---
function handlePlayerTurn() {
  if (gameState.currentPhase === "GAME_OVER") return;
  console.log(
    `--- Player ${gameState.currentPlayer}'s Turn --- Phase: ${gameState.currentPhase}`
  );
  gameState.currentPhase = "ACTION"; // Ensure phase is ACTION

  // Reset selectie en highlights
  if (gameState.selectedPawn) {
    if (typeof gameState.selectedPawn.setHighlight === "function")
      gameState.selectedPawn.setHighlight(false);
    gameState.selectedPawn = null;
  }
  if (typeof clearHighlights === "function") clearHighlights();
  if (typeof showUIPanel === "function") showUIPanel("action");
  if (typeof updateActionUI === "function") updateActionUI(null); // Update UI to show it's turn, no pawn selected
  if (typeof updateGameStatusUI === "function") updateGameStatusUI();

  // Check if this player *can* act
  if (gameState.currentPlayer === gameState.playerNumber) {
    // *** MODIFIED BLOCK START ***
    if (canPlayerAct(gameState.playerNumber)) {
      // Player has at least one pawn that can make a move or attack
      console.log(`P${gameState.currentPlayer}, select a regiment to command.`);
      showToast("Your turn. Select a regiment to command.");

      // ⏳ Auto-end turn after 40 seconds if no action
      TimerManager.start(40, () => {
        showToast("⏳ Time's up! Ending turn.");
        if (typeof window.endTurn === "function") {
          window.endTurn();
        }
      });
    } else {
      // Player has active, unacted pawns, but NONE of them can move or attack
      console.log(
        `P${gameState.currentPlayer} has active pawns, but none have valid moves or targets.`
      );
      showToast("No available moves this turn.");

      // Notify the server that the player cannot act
      if (typeof socket !== "undefined" && typeof gameSession !== "undefined") {
        console.log(" -> Emitting 'playerCannotAct' to server.");
        socket.emit("playerCannotAct", { roomCode: gameSession.roomCode });
        // Set phase to waiting to prevent further local actions until server responds
        gameState.currentPhase = "WAITING_FOR_TURN";
        if (typeof updateActionUI === "function") updateActionUI(null); // Update UI to reflect waiting state
      } else {
        console.error("Cannot emit playerCannotAct - socket/session missing.");
        // Handle error case? Maybe allow player to try again? For now, just log.
      }
    }
    // *** MODIFIED BLOCK END ***
  } else {
    console.log(`Waiting for Player ${gameState.currentPlayer} to act...`);
    showToast(`Waiting for Player ${gameState.currentPlayer}...`);
  }
} // End handlePlayerTurn

// --- NEW: Check if a player has any valid actions ---
function canPlayerAct(playerNum) {
  if (!gameState || !gameState.players || !gameState.players[playerNum]) {
    console.warn(`canPlayerAct: Invalid player data for P${playerNum}`);
    return false; // Cannot act if data is missing
  }

  const playerPawns = gameState.players[playerNum].pawns || [];
  const activePawnsWithStamina = playerPawns.filter(
    (p) => p?.isActive && p.remainingStamina > 0
  );

  if (activePawnsWithStamina.length === 0) {
    return false; // No pawns that *could* act
  }

  for (const pawn of activePawnsWithStamina) {
    const possibleMoves = getPossibleMoves(pawn);
    const possibleTargets = getValidAttackTargets(pawn);
    if (possibleMoves.length > 0 || possibleTargets.length > 0) {
      // console.log(`canPlayerAct: P${playerNum} can act with pawn ${pawn.id}.`);
      return true; // Found at least one possible action
    }
  }

  // console.log(`canPlayerAct: P${playerNum} has active, unacted pawns, but none have valid moves/targets.`);
  return false; // No actions found for any relevant pawn
}
// --- END NEW FUNCTION ---


// --- showFloatingDamageText ---
function showFloatingDamageText(pawn, damageAmount) {
  if (
    !pawn ||
    !pawn.pixiObject ||
    typeof PIXI === "undefined" ||
    damageAmount === 0
  )
    return; // Check damage != 0
  if (!app || !app.stage) {
    console.warn("Cannot show damage text: PIXI app/stage missing.");
    return;
  }

  const displayText =
    typeof damageAmount === "number" && damageAmount > 0
      ? `-${damageAmount}`
      : damageAmount === "X"
        ? "X"
        : "?"; // Handle 'X' or invalid
  if (displayText === "?") return; // Don't show if invalid

  console.log(`Showing damage text "${displayText}" for ${pawn.id}`);
  const style = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 16,
    fontWeight: "bold",
    fill: "#ff0000",
    stroke: "#000000",
    strokeThickness: 3,
    align: "center",
  });
  const damageText = new PIXI.Text(displayText, style);
  damageText.anchor.set(0.5);
  const startY =
    pawn.pixiObject.y - (pawn.graphics?.height || CELL_SIZE * 0.4) - 10;
  const startX = pawn.pixiObject.x;
  damageText.position.set(startX, startY);
  damageText.alpha = 1;
  app.stage.addChild(damageText);

  const duration = 1000;
  const floatDistance = 30;
  const startTime = Date.now();
  function animateDamageText() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = progress * (2 - progress);
    damageText.y = startY - easeProgress * floatDistance;
    damageText.alpha = 1 - progress;
    if (progress < 1) {
      requestAnimationFrame(animateDamageText);
    } else {
      if (app?.stage) app.stage.removeChild(damageText);
      if (!damageText.destroyed) damageText.destroy();
      console.log(`Damage text for ${pawn.id} removed.`);
    }
  }
  requestAnimationFrame(animateDamageText);
} // End showFloatingDamageText

// --- Movement Options Preview (on hover) ---
let previewHighlightContainer = null;

function showMovementOptionsPreview(pawn) {
  // Don't show preview during animation or in certain game phases
  if (gameState.isAnimating ||
    gameState.currentPhase === "GAME_OVER" ||
    gameState.currentPhase === "WAITING_FOR_TURN" ||
    gameState.currentPhase === "AWAITING_ACTION_TARGET") {
    return;
  }

  // Clear any existing preview
  clearMovementOptionsPreview();

  // Create container if it doesn't exist
  if (!previewHighlightContainer) {
    previewHighlightContainer = new PIXI.Container();
    previewHighlightContainer.zIndex = -1; // Below pawns
    if (app?.stage) {
      app.stage.addChild(previewHighlightContainer);
    } else {
      console.warn("Cannot add preview container: app.stage missing");
      return;
    }
  }

  // Get possible moves
  const moves = typeof getPossibleMoves === "function" ? getPossibleMoves(pawn) : [];
  if (moves.length === 0) return; // No moves to show

  // Create gray highlight for each possible move
  moves.forEach(m => {
    const p = gridToPixel(m.x, m.y);
    const hl = new PIXI.Graphics()
      .beginFill(0x888888, 0.3) // Gray with 30% opacity
      .drawRect(0, 0, CELL_SIZE, CELL_SIZE)
      .endFill();
    hl.position.set(p.x, p.y);

    // Add stamina cost text for preview as well
    if (m.staminaCost !== undefined) {
      const staminaText = new PIXI.Text(m.staminaCost.toString(), {
        fontFamily: 'Arial',
        fontSize: 12, // Smaller font for preview
        fontWeight: 'normal', // Less bold
        fill: 0xCCCCCC, // Light gray text to blend with gray background
        stroke: 0x000000, // Black outline
        strokeThickness: 0.5 // Thinner stroke
      });
      staminaText.anchor.set(0.5, 0.5);
      staminaText.position.set(CELL_SIZE / 2, CELL_SIZE / 2);
      staminaText.alpha = 0.8; // Semi-transparent
      hl.addChild(staminaText);
    }

    previewHighlightContainer.addChild(hl);
  });
}

function clearMovementOptionsPreview() {
  if (previewHighlightContainer) {
    previewHighlightContainer.removeChildren();
  }
}

// --- END OF FILE public/js/game-logic.js ---
