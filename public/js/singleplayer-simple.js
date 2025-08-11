// --- START OF FILE public/js/singleplayer-simple.js ---
(function () {
  const SP_LOG_PREFIX = "[SP]";

  // Simple event bus to mimic Socket.IO client interface
  function createMockSocket() {
    const handlers = new Map(); // eventName -> Set<fn>
    return {
      on(eventName, fn) {
        if (!handlers.has(eventName)) handlers.set(eventName, new Set());
        handlers.get(eventName).add(fn);
      },
      off(eventName) {
        if (eventName) handlers.delete(eventName);
        else handlers.clear();
      },
      hasListeners(eventName) {
        const fns = handlers.get(eventName);
        return !!(fns && fns.size > 0);
      },
      emit: handleClientEmit,
      _dispatch(eventName, data) {
        const fns = handlers.get(eventName);
        try {
          console.log(SP_LOG_PREFIX, "dispatch:", eventName, {
            listeners: fns ? fns.size : 0,
            payload: data,
          });
          no
        } catch (_) { }
        if (!fns || fns.size === 0) return;
        for (const fn of fns) {
          try {
            fn(data);
          } catch (e) {
            console.error(SP_LOG_PREFIX, `Error in handler for ${eventName}:`, e);
          }
        }
      },
    };
  }

  // --- Internal SP state ---
  const spState = {
    initiativePlayerPerRound: {},
    cycleInitiativePlayer: null,
    aiCardsByRound: {},
    difficulty: 'easy',
  };

  // --- Utility helpers ---
  function getClientPawnById(pawnId) {
    try {
      const gs = (typeof window !== 'undefined' && window.gameState) ? window.gameState : (typeof gameState !== 'undefined' ? gameState : null);
      if (!gs || !gs.players) {
        console.warn(SP_LOG_PREFIX, "getClientPawnById: gameState/players missing", { pawnId, hasWindowGS: !!(typeof window !== 'undefined' && window.gameState), hasGSConst: typeof gameState !== 'undefined' });
        return null;
      }
      const p1 = gs.players[PLAYER_1]?.pawns || [];
      const p2 = gs.players[PLAYER_2]?.pawns || [];
      const found = [...p1, ...p2].find((p) => p && p.id === pawnId) || null;
      console.log(SP_LOG_PREFIX, "getClientPawnById", { pawnId, found: !!found, inP1: !!p1.find(p => p && p.id === pawnId), inP2: !!p2.find(p => p && p.id === pawnId) });
      return found;
    } catch (e) {
      console.error(SP_LOG_PREFIX, "getClientPawnById error", e);
      return null;
    }
  }

  function sumStats(cards) {
    const totals = cards.reduce(
      (acc, c) => {
        if (!c) return acc;
        acc.attack += c.attack || 0;
        acc.stamina += c.stamina || 0;
        return acc;
      },
      { attack: 0, stamina: 0 }
    );
    return totals;
  }

  function chooseAICardsAvoidingTie(playerCards) {
    // Presets from SIMPLE_SINGLEPLAYER.md
    const strategies = [
      [
        { hp: 3, stamina: 2, attack: 2 },
        { hp: 2, stamina: 3, attack: 2 },
        { hp: 1, stamina: 1, attack: 5 },
      ],
      [
        { hp: 2, stamina: 2, attack: 3 },
        { hp: 2, stamina: 1, attack: 4 },
        { hp: 1, stamina: 2, attack: 4 },
      ],
      [
        { hp: 4, stamina: 1, attack: 2 },
        { hp: 3, stamina: 2, attack: 2 },
        { hp: 2, stamina: 3, attack: 2 },
      ],
    ];

    const playerTotals = sumStats(playerCards || []);

    // Try each preset; prefer one that decisively wins attack or stamina to avoid RPS
    for (const preset of strategies) {
      const aiTotals = sumStats(preset);
      const attackDiff = aiTotals.attack - playerTotals.attack;
      const staminaDiff = aiTotals.stamina - playerTotals.stamina;
      if (attackDiff !== 0 || staminaDiff !== 0) {
        return preset.map((c, i) => ({ ...c, id: `ai_c${i}_${Date.now()}` }));
      }
    }

    // If still tied, nudge the first card to break tie
    const fallback = strategies[0].map((c) => ({ ...c }));
    fallback[0].attack = Math.max(1, (fallback[0].attack || 0) + 1);
    fallback[0].stamina = Math.max(1, (fallback[0].stamina || 1) - 1);
    return fallback.map((c, i) => ({ ...c, id: `ai_c${i}_${Date.now()}` }));
  }

  // Pick an AI preset without considering player cards (used when AI defines first)
  function chooseAICardsPresetOnly() {
    const presets = [
      [
        { hp: 3, stamina: 2, attack: 2 },
        { hp: 2, stamina: 3, attack: 2 },
        { hp: 1, stamina: 1, attack: 5 },
      ],
      [
        { hp: 2, stamina: 2, attack: 3 },
        { hp: 2, stamina: 1, attack: 4 },
        { hp: 1, stamina: 2, attack: 4 },
      ],
      [
        { hp: 4, stamina: 1, attack: 2 },
        { hp: 3, stamina: 2, attack: 2 },
        { hp: 2, stamina: 3, attack: 2 },
      ],
    ];
    const pick = presets[Math.floor(Math.random() * presets.length)];
    return pick.map((c, i) => ({ ...c, id: `ai_c${i}_${Date.now()}` }));
  }

  function chooseAICardsByDifficulty(playerCards) {
    const diff = spState.difficulty || 'easy';
    let ai;
    if (diff === 'easy') {
      ai = chooseAICardsPresetOnly();
      if (Math.random() < 0.3) ai = ai.map((c) => ({ ...c, attack: Math.max(1, (c.attack || 1) - 1) }));
    } else if (diff === 'medium') {
      ai = chooseAICardsAvoidingTie(playerCards);
    } else {
      const candidateA = [
        { hp: 2, stamina: 1, attack: 4 },
        { hp: 2, stamina: 2, attack: 3 },
        { hp: 1, stamina: 2, attack: 4 },
      ];
      const candidateB = [
        { hp: 3, stamina: 2, attack: 2 },
        { hp: 2, stamina: 3, attack: 2 },
        { hp: 2, stamina: 1, attack: 4 },
      ];
      const options = [candidateA, candidateB, ...[chooseAICardsAvoidingTie(playerCards)]];
      const scored = options.map((arr) => {
        const s = arr.reduce((acc, c) => ({ atk: acc.atk + (c.attack || 0), st: acc.st + (c.stamina || 0) }), { atk: 0, st: 0 });
        return { arr, score: s.atk * 10 + s.st };
      }).sort((a, b) => b.score - a.score);
      ai = scored[0].arr.map((c, i) => ({ ...c, id: `ai_c${i}_${Date.now()}` }));
    }
    try { if (window.SpLogger) SpLogger.log('action.decision', { actor: 'AI', type: 'defineCards', difficulty: diff, cards: ai }); } catch (_) { }
    return ai;
  }

  function computeInitiative(p1Cards, p2Cards) {
    const p1 = sumStats(p1Cards);
    const p2 = sumStats(p2Cards);
    if (p1.attack > p2.attack) return PLAYER_1;
    if (p2.attack > p1.attack) return PLAYER_2;
    if (p1.stamina > p2.stamina) return PLAYER_1;
    if (p2.stamina > p1.stamina) return PLAYER_2;
    // Should be avoided by AI selection, but fallback to P1
    return PLAYER_1;
  }

  // When AI must define first in a round, define now and notify the client that it's player's turn
  function aiDefineForCurrentRound() {
    const round = gameState.roundNumber;
    // Pick AI cards for this round independently
    const aiCards = chooseAICardsByDifficulty([]);
    // Store into P2 available list for later linking
    gameState.players[PLAYER_2].cardsAvailableForLinking = aiCards.map((c) => ({ ...c }));
    // Notify that opponent defined
    socket._dispatch("opponentCardsReady", {});
    // Give the turn to the player to define cards
    gameState.currentPlayer = PLAYER_1;
    gameState.currentPhase = currentRoundDefinePhaseLabel(round);
    socket._dispatch("yourTurnToDefine", { currentPlayer: PLAYER_1, roundNumber: round });
  }

  function currentRoundDefinePhaseLabel(roundNum) {
    return `SETUP_${roundNum}_DEFINE`;
  }
  function currentRoundLinkPhaseLabel(roundNum) {
    return `SETUP_${roundNum}_LINKING`;
  }

  function canPlayerLinkLocal(playerNum) {
    const player = gameState.players[playerNum];
    if (!player) return false;
    const hasUnlinkedCard = (player.cardsAvailableForLinking || []).some((c) => c && !c.isLinked);
    const hasInactivePawn = (player.pawns || []).some((p) => p && !p.isActive);
    return hasUnlinkedCard && hasInactivePawn;
  }

  function linkFirstAvailableForPlayer(playerNum) {
    const cards = gameState.players[playerNum]?.cardsAvailableForLinking || [];
    const pawns = gameState.players[playerNum]?.pawns || [];
    const card = cards.find((c) => c && !c.isLinked);
    // First round preference: choose IDs p?_11..p?_21
    let pawn = null;
    if (gameState.roundNumber === 1) {
      pawn = pawns.find((p) => {
        if (!p || p.isActive || !p.id) return false;
        const parts = String(p.id).split("_");
        const idx = parts.length > 1 ? parseInt(parts[1], 10) : NaN;
        return Number.isFinite(idx) && idx >= 11 && idx <= 21;
      });
    }
    // If not first round or no match, prefer second-row by Y
    if (!pawn) {
      const preferredY = playerNum === PLAYER_2 ? 1 : (BOARD_SIZE - 2);
      pawn = pawns.find((p) => p && !p.isActive && p.gridY === preferredY) ||
        pawns.find((p) => p && !p.isActive);
    }
    if (!card || !pawn) return false;
    try { if (window.SpLogger && playerNum === PLAYER_2) SpLogger.log('link.decision', { player: playerNum, cardStats: { hp: card.hp, stamina: card.stamina, attack: card.attack }, pawnPosition: { x: pawn.gridX, y: pawn.gridY }, pawnId: pawn.id }); } catch (_) { }
    // Mark linked via dispatch so client updates its state/UI uniformly
    socket._dispatch("cardLinked", { cardId: card.id, pawnId: pawn.id, playerNum });
    return true;
  }

  function finishLinkingOrNextTurn(playerWhoJustActed) {
    const roundNum = gameState.roundNumber;
    const totalDefined = (gameState.players[PLAYER_1].cardsAvailableForLinking?.length || 0) + (gameState.players[PLAYER_2].cardsAvailableForLinking?.length || 0);
    const totalLinked =
      (gameState.players[PLAYER_1].cardsAvailableForLinking || []).filter((c) => c?.isLinked).length +
      (gameState.players[PLAYER_2].cardsAvailableForLinking || []).filter((c) => c?.isLinked).length;

    if (totalDefined > 0 && totalLinked >= totalDefined) {
      // Round finished
      if (roundNum < 3) {
        // Next round
        gameState.roundNumber = roundNum + 1;
        gameState.currentPhase = currentRoundDefinePhaseLabel(gameState.roundNumber);
        // Clear linking lists
        gameState.players[PLAYER_1].cardsAvailableForLinking = [];
        gameState.players[PLAYER_2].cardsAvailableForLinking = [];
        // Server would also clear cards on players; keep UI consistent by relying on above lists
        const nextDefiner = gameState.roundNumber % 2 === 1 ? PLAYER_1 : PLAYER_2;
        gameState.currentPlayer = nextDefiner;
        socket._dispatch("nextRound", {
          roundNumber: gameState.roundNumber,
          currentPhase: gameState.currentPhase,
          currentPlayer: gameState.currentPlayer,
        });
        // If AI defines this round first, simulate AI definition immediately and hand turn to player
        setTimeout(() => {
          if (gameState.currentPlayer === PLAYER_2) {
            aiDefineForCurrentRound();
          }
        }, 100);
      } else {
        // Start action phase
        gameState.currentPhase = "ACTION";
        gameState.currentPlayer = spState.cycleInitiativePlayer || PLAYER_1;
        // Clear linking lists
        gameState.players[PLAYER_1].cardsAvailableForLinking = [];
        gameState.players[PLAYER_2].cardsAvailableForLinking = [];
        socket._dispatch("startActionPhase", {
          currentPhase: gameState.currentPhase,
          currentPlayer: gameState.currentPlayer,
        });
        // After client applies resets, ensure whoever starts can act; if P2 starts, kick AI
        setTimeout(ensureStartingTurnActable, 200);
      }
      return;
    }

    // Otherwise, switch linking turn based on availability
    const nextPlayer = playerWhoJustActed === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    if (canPlayerLinkLocal(nextPlayer)) {
      gameState.currentPlayer = nextPlayer;
      socket._dispatch("nextLinkTurn", { currentPlayer: gameState.currentPlayer });
      // If it's AI's turn after switching, let AI link one
      if (gameState.currentPlayer === PLAYER_2) {
        setTimeout(ensureAILinkingIfTurn, 150);
      }
    } else if (canPlayerLinkLocal(playerWhoJustActed)) {
      gameState.currentPlayer = playerWhoJustActed;
      socket._dispatch("nextLinkTurn", { currentPlayer: gameState.currentPlayer });
    } else {
      // No one can link -> finish linking (will recurse into finish path above next dispatch)
      if (gameState.roundNumber < 3) {
        gameState.roundNumber += 1;
        gameState.currentPhase = currentRoundDefinePhaseLabel(gameState.roundNumber);
        gameState.players[PLAYER_1].cardsAvailableForLinking = [];
        gameState.players[PLAYER_2].cardsAvailableForLinking = [];
        const nextDefiner = gameState.roundNumber % 2 === 1 ? PLAYER_1 : PLAYER_2;
        gameState.currentPlayer = nextDefiner;
        socket._dispatch("nextRound", {
          roundNumber: gameState.roundNumber,
          currentPhase: gameState.currentPhase,
          currentPlayer: gameState.currentPlayer,
        });
        setTimeout(() => {
          if (gameState.currentPlayer === PLAYER_2) {
            aiDefineForCurrentRound();
          }
        }, 100);
      } else {
        gameState.currentPhase = "ACTION";
        gameState.currentPlayer = spState.cycleInitiativePlayer || PLAYER_1;
        gameState.players[PLAYER_1].cardsAvailableForLinking = [];
        gameState.players[PLAYER_2].cardsAvailableForLinking = [];
        socket._dispatch("startActionPhase", {
          currentPhase: gameState.currentPhase,
          currentPlayer: gameState.currentPlayer,
        });
        setTimeout(ensureStartingTurnActable, 200);
      }
    }
  }

  function ensureAILinkingIfTurn() {
    if (!gameState.currentPhase || !String(gameState.currentPhase).endsWith("LINKING")) return;
    if (gameState.currentPlayer !== PLAYER_2) return;
    if (!canPlayerLinkLocal(PLAYER_2)) {
      finishLinkingOrNextTurn(PLAYER_2);
      return;
    }
    const didLink = linkFirstAvailableForPlayer(PLAYER_2);
    if (didLink) {
      setTimeout(() => finishLinkingOrNextTurn(PLAYER_2), 150);
    } else {
      finishLinkingOrNextTurn(PLAYER_2);
    }
  }

  function distanceToAny(targets, x, y) {
    let best = Infinity;
    for (const t of targets) {
      const d = Math.abs((t?.x ?? 0) - x) + Math.abs((t?.y ?? 0) - y);
      if (d < best) best = d;
    }
    return best;
  }

  function aiTakeOneMove() {
    // Very simple: pick first active pawn with stamina and move closer to its haven
    const aiNum = PLAYER_2;
    const pawns = (gameState.players[aiNum]?.pawns || []).filter((p) => p && p.isActive && p.remainingStamina > 0);
    if (pawns.length === 0) return false;
    // Choose pawn with a valid move closer to haven
    const targetHavens = ALL_TARGET_HAVENS_P2;
    const diff = spState.difficulty || 'easy';
    for (const pawn of pawns) {
      // Try an attack first if adjacent enemies exist
      let targets = (typeof getAttackTargets === "function") ? getAttackTargets(pawn) : [];
      if (targets && targets.length > 0) {
        if (diff === 'hard') {
          targets = [...targets].sort((a, b) => {
            const atk = pawn.linkedCard?.attack || 0;
            const aHP = a.currentHP ?? a.linkedCard?.hp ?? 0;
            const bHP = b.currentHP ?? b.linkedCard?.hp ?? 0;
            return (Math.min(atk, bHP)) - (Math.min(atk, aHP));
          }).reverse();
        }
        const targetPawn = targets[0];
        // Resolve attack locally (basic server mirror)
        const attackerAttack = pawn.linkedCard?.attack || 0;
        const defenderHP = targetPawn.currentHP ?? targetPawn.linkedCard?.hp ?? 0;
        const defenderAttack = targetPawn.linkedCard?.attack || 0;
        const attackerHP = pawn.currentHP ?? pawn.linkedCard?.hp ?? 0;

        const newDefHP = Math.max(0, defenderHP - attackerAttack);
        const newAtkHP = newDefHP > 0 && defenderAttack > 0 ? Math.max(0, attackerHP - defenderAttack) : attackerHP;

        // Apply results
        targetPawn.currentHP = newDefHP;
        pawn.currentHP = newAtkHP;
        pawn.remainingStamina = Math.max(0, (pawn.remainingStamina || 0) - 1);
        if (typeof pawn.updateBars === "function") pawn.updateBars();
        if (typeof targetPawn.updateBars === "function") targetPawn.updateBars();

        // Optional random hit animation on defender
        try { applyRandomHitAnimation(targetPawn); } catch (_) { }

        // Eliminations and attacker move into defender square if defender died and attacker survived
        let eliminated = [];
        let attackerMovedTo = null;
        if (newDefHP <= 0) {
          eliminated.push(targetPawn.id);
          const tx = targetPawn.gridX;
          const ty = targetPawn.gridY;
          // Do NOT remove locally here; let client actionPerformed handle it uniformly
          // Move attacker if alive
          if (newAtkHP > 0) {
            pawn.gridX = tx;
            pawn.gridY = ty;
            attackerMovedTo = { x: tx, y: ty };
          }
        }
        // Handle attacker elimination as well
        if (newAtkHP <= 0) {
          eliminated.push(pawn.id);
        }

        try { if (window.SpLogger) SpLogger.log('action.decision', { actor: 'AI', type: 'attack', attackerId: pawn.id, targetId: targetPawn.id, difficulty: diff, pre: { attackerHP, defenderHP, attackerAttack, defenderAttack } }); } catch (_) { }
        socket._dispatch("actionPerformed", {
          actionType: "attack",
          pawnId: pawn.id,
          playerNum: aiNum,
          attackerMovedTo,
          damageDealt: {
            attackerId: pawn.id,
            defenderId: targetPawn.id,
            damageToAttacker: (newAtkHP < attackerHP) ? (attackerHP - newAtkHP) : 0,
            damageToDefender: (defenderHP - newDefHP) || 0,
          },
          eliminatedPawnIDs: eliminated,
          updatedPawn: { currentHP: pawn.currentHP, remainingStamina: pawn.remainingStamina },
          hpAlreadyApplied: true,
        });
        console.log(SP_LOG_PREFIX, "[AI] attack dispatched", {
          attacker: pawn.id,
          defender: targetPawn.id,
          movedTo: attackerMovedTo,
          atkHP: pawn.currentHP,
          defHP: targetPawn.currentHP,
          atkRS: pawn.remainingStamina,
        });
        return true;
      }
      let moves = (typeof getPossibleMoves === "function") ? getPossibleMoves(pawn) : [];
      if (!moves || moves.length === 0) continue;
      if (diff === 'easy' && Math.random() < 0.3) {
        moves = [moves[Math.floor(Math.random() * moves.length)]];
      } else if (diff === 'hard') {
        moves = [...moves].sort((a, b) => distanceToAny(targetHavens, a.x, a.y) - distanceToAny(targetHavens, b.x, b.y));
      }
      const best = moves[0] || null;
      if (best) {
        // Apply move locally and dispatch as if from server
        const cost = Math.max(1, Math.abs(best.x - pawn.gridX) + Math.abs(best.y - pawn.gridY));
        try { if (window.SpLogger) SpLogger.log('action.decision', { actor: 'AI', type: 'move', pawnId: pawn.id, from: { x: pawn.gridX, y: pawn.gridY }, to: { x: best.x, y: best.y }, cost, difficulty: diff }); } catch (_) { }
        pawn.gridX = best.x;
        pawn.gridY = best.y;
        pawn.remainingStamina = Math.max(0, (pawn.remainingStamina || 0) - cost);
        if (typeof pawn.updateBars === "function") pawn.updateBars();
        socket._dispatch("actionPerformed", {
          actionType: "move",
          pawnId: pawn.id,
          playerNum: aiNum,
          targetX: pawn.gridX,
          targetY: pawn.gridY,
          updatedPawn: { currentHP: pawn.currentHP, remainingStamina: pawn.remainingStamina },
          eliminatedPawnIDs: [],
        });
        console.log(SP_LOG_PREFIX, "[AI] move dispatched", {
          pawnId: pawn.id,
          to: { x: pawn.gridX, y: pawn.gridY },
          rs: pawn.remainingStamina,
        });
        return true;
      }
    }
    return false;
  }

  function applyRandomHitAnimation(defenderPawn) {
    const obj = defenderPawn && defenderPawn.pixiObject;
    if (!obj || obj.destroyed) return;
    const choice = Math.floor(Math.random() * 3);
    if (choice === 0) {
      // Quick red flash
      const hasGfx = defenderPawn && defenderPawn.graphics && !defenderPawn.graphics.destroyed;
      const originalTint = hasGfx ? defenderPawn.graphics.tint : 0xFFFFFF;
      if (hasGfx) defenderPawn.graphics.tint = 0xFF4444;
      setTimeout(() => {
        if (defenderPawn && defenderPawn.graphics && !defenderPawn.graphics.destroyed) {
          defenderPawn.graphics.tint = originalTint;
        }
      }, 120);
    } else if (choice === 1) {
      // Small shake
      const ox = obj.x, oy = obj.y;
      let i = 0;
      const id = setInterval(() => {
        i += 1;
        if (!defenderPawn || !defenderPawn.pixiObject || defenderPawn.pixiObject.destroyed) {
          clearInterval(id);
          return;
        }
        const o = defenderPawn.pixiObject;
        o.x = ox + (i % 2 === 0 ? 2 : -2);
        o.y = oy + (i % 2 === 0 ? -2 : 2);
        if (i >= 6) {
          clearInterval(id);
          if (defenderPawn && defenderPawn.pixiObject && !defenderPawn.pixiObject.destroyed) {
            defenderPawn.pixiObject.x = ox;
            defenderPawn.pixiObject.y = oy;
          }
        }
      }, 16);
    } else {
      // Brief scale pop
      const sX = obj.scale.x, sY = obj.scale.y;
      obj.scale.set(sX * 1.12, sY * 1.12);
      setTimeout(() => {
        if (defenderPawn && defenderPawn.pixiObject && !defenderPawn.pixiObject.destroyed) {
          defenderPawn.pixiObject.scale.set(sX, sY);
        }
      }, 120);
    }
  }

  function switchTurnTo(playerNum) {
    if (gameState.currentPhase === "GAME_OVER") {
      console.log(SP_LOG_PREFIX, "switchTurnTo ignored - GAME_OVER");
      return;
    }
    const fromPlayer = gameState.currentPlayer;
    gameState.currentPlayer = playerNum;
    gameState.currentPhase = "ACTION";
    console.log(SP_LOG_PREFIX, "switchTurnTo", { playerNum });
    try { if (window.SpLogger) { SpLogger.log("turn.switched", { from: fromPlayer, to: playerNum, cycle: gameState.cycleNumber, round: gameState.roundNumber }); SpLogger.noteTurnSwitch(); } } catch (_) { }
    socket._dispatch("nextTurn", { currentPlayer: playerNum });
    // If switching to AI, ensure it acts or passes immediately
    if (playerNum === PLAYER_2) {
      setTimeout(ensureAiTurnSequence, 120);
    }
  }

  function handlePlayerCannotAct() {
    const other = gameState.currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    // Check if opponent can act; if yes, switch. Otherwise keep or end cycle
    if (typeof canPlayerAct === "function") {
      const currentCan = canPlayerAct(gameState.currentPlayer);
      const otherCan = canPlayerAct(other);
      if (otherCan) {
        switchTurnTo(other);
        return;
      }
      if (currentCan) {
        switchTurnTo(gameState.currentPlayer);
        return;
      }
      // Neither can: end cycle (simplified newCycle)
      startNewCycleLocal();
    } else {
      switchTurnTo(other);
    }
  }

  function ensureAiTurnSequence() {
    if (gameState.currentPhase === "GAME_OVER") return;
    if (typeof canPlayerAct !== "function") return;
    // Only proceed if it's AI's turn
    if (gameState.currentPlayer !== PLAYER_2 || gameState.currentPhase !== "ACTION") return;
    const aiCan = canPlayerAct(PLAYER_2);
    const playerCan = canPlayerAct(PLAYER_1);
    if (!aiCan) {
      if (playerCan) {
        switchTurnTo(PLAYER_1);
      } else {
        startNewCycleLocal();
      }
      return;
    }
    // AI can act → perform one action
    const acted = aiTakeOneMove();
    // After one AI action, run unified post-action evaluation
    if (acted) {
      setTimeout(() => postActionTurnEvaluation(PLAYER_2), 160);
    }
  }

  // Unified post-action evaluator used by both P1 and AI actions
  function postActionTurnEvaluation(lastActorPlayerNum) {
    try {
      console.log(SP_LOG_PREFIX, "post-action turn evaluation start", { lastActor: lastActorPlayerNum, phase: gameState.currentPhase });
      if (gameState.currentPhase === "GAME_OVER") {
        console.log(SP_LOG_PREFIX, "post-action evaluation aborted - GAME_OVER");
        return;
      }
      if (typeof canPlayerAct === "function") {
        const aiCan = canPlayerAct(PLAYER_2);
        const playerCan = canPlayerAct(PLAYER_1);
        console.log(SP_LOG_PREFIX, "post-action canPlayerAct results", { aiCan, playerCan });
        if (!aiCan && !playerCan) {
          startNewCycleLocal();
          return;
        }
        if (aiCan && playerCan) {
          // Alternate: give turn to the other player from the last actor
          const next = lastActorPlayerNum === PLAYER_1 ? PLAYER_2 : PLAYER_1;
          switchTurnTo(next);
          return;
        }
        if (aiCan) {
          switchTurnTo(PLAYER_2);
          return;
        }
        if (playerCan) {
          switchTurnTo(PLAYER_1);
          return;
        }
      } else {
        // Fallback strict alternation if canPlayerAct not available
        const next = lastActorPlayerNum === PLAYER_1 ? PLAYER_2 : PLAYER_1;
        switchTurnTo(next);
      }
    } catch (e) {
      console.warn(SP_LOG_PREFIX, "postActionTurnEvaluation error", e);
    }
  }

  function ensureStartingTurnActable() {
    if (typeof canPlayerAct !== "function") {
      if (gameState.currentPlayer === PLAYER_2) ensureAiTurnSequence();
      return;
    }
    const current = gameState.currentPlayer;
    const other = current === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    const currentCan = canPlayerAct(current);
    const otherCan = canPlayerAct(other);
    if (!currentCan && otherCan) {
      switchTurnTo(other);
      return;
    }
    if (current === PLAYER_2) ensureAiTurnSequence();
  }

  function startNewCycleLocal() {
    gameState.cycleNumber = (gameState.cycleNumber || 1) + 1;
    gameState.roundNumber = 1;
    gameState.currentPhase = currentRoundDefinePhaseLabel(1);
    try { if (window.SpLogger) { SpLogger.log("cycle.start", { cycle: gameState.cycleNumber }); SpLogger.noteCycleStart(); } } catch (_) { }
    // Reset pawns to inactive for both players
    [PLAYER_1, PLAYER_2].forEach((pn) => {
      (gameState.players[pn]?.pawns || []).forEach((p) => {
        if (!p) return;
        p.isActive = false;
        p.currentHP = null;
        p.linkedCard = null;
        p.hasActedThisCycle = false;
        p.remainingStamina = null;
        if (typeof p.hideStatsDisplay === "function") p.hideStatsDisplay();
        if (typeof p.updateBars === "function") p.updateBars();
        if (p.pixiObject) p.pixiObject.alpha = 1.0;
      });
      gameState.activePawnsThisCycle[pn] = [];
    });
    // Clear linking queues
    gameState.players[PLAYER_1].cardsAvailableForLinking = [];
    gameState.players[PLAYER_2].cardsAvailableForLinking = [];
    // First definer of round 1 is P1
    gameState.currentPlayer = PLAYER_1;
    // Simulate newCycle → yourTurnToDefine
    if (typeof updateGameStatusUI === "function") updateGameStatusUI();
    socket._dispatch("yourTurnToDefine", { currentPlayer: PLAYER_1, roundNumber: 1 });
  }

  // --- Client emit handler (core router) ---
  function handleClientEmit(event, data) {
    console.log(SP_LOG_PREFIX, "emit:", event, data);
    switch (event) {
      case "defineCards": {
        // Store player's defined cards for this round
        const round = gameState.roundNumber;
        const playerCards = (data && data.cards) || [];
        try { if (window.SpLogger) SpLogger.log("define.cards", { round, cards: playerCards }); } catch (_) { }
        // Give cards temporary ids if missing
        playerCards.forEach((c, i) => {
          if (!c.id) c.id = `p${PLAYER_1}_r${round}_c${i}_${Date.now()}`;
        });

        // Select AI cards per difficulty
        const aiCards = chooseAICardsByDifficulty(playerCards);
        try { if (window.SpLogger) SpLogger.log('action.decision', { actor: 'P1', type: 'defineCards', round, cards: playerCards }); } catch (_) { }

        // Update available lists as in client 'cardsRevealed'
        gameState.players[PLAYER_1].cardsAvailableForLinking = playerCards.map((c) => ({ ...c }));
        gameState.players[PLAYER_2].cardsAvailableForLinking = aiCards.map((c) => ({ ...c }));

        // Compute initiative for this round
        const initiative = computeInitiative(playerCards, aiCards);
        spState.initiativePlayerPerRound[round] = initiative;
        if (round === 3) spState.cycleInitiativePlayer = initiative;

        // Dispatch reveal (mirrors server payload)
        const p1Totals = sumStats(playerCards);
        const p2Totals = sumStats(aiCards);
        const revealPayload = {
          player1Cards: playerCards,
          player2Cards: aiCards,
          initiativePlayer: initiative,
          p1TotalAttack: p1Totals.attack,
          p2TotalAttack: p2Totals.attack,
          p1TotalStamina: p1Totals.stamina,
          p2TotalStamina: p2Totals.stamina,
        };
        socket._dispatch("cardsRevealed", revealPayload);
        try { if (window.SpLogger) SpLogger.log("cards.revealed", { round, ...revealPayload }); } catch (_) { }

        // Advance to linking
        setTimeout(() => {
          gameState.currentPhase = currentRoundLinkPhaseLabel(round);
          gameState.currentPlayer = initiative;
          const linkingPayload = {
            initiativePlayer: initiative,
            currentPhase: gameState.currentPhase,
            currentPlayer: gameState.currentPlayer,
          };
          socket._dispatch("startLinking", linkingPayload);
          try { if (window.SpLogger) SpLogger.log("phase.link.start", linkingPayload); } catch (_) { }
          // If AI starts linking, auto-link one
          if (initiative === PLAYER_2) {
            setTimeout(ensureAILinkingIfTurn, 150);
          }
        }, 150);
        break;
      }
      case "linkCard": {
        // Player links one card
        const cardId = data?.cardId;
        const pawnId = data?.pawnId;
        if (!cardId || !pawnId) return;
        try {
          const p = getClientPawnById(pawnId);
          if (window.SpLogger) {
            SpLogger.log("link.decision", { player: PLAYER_1, round: gameState.roundNumber, cardId, pawnId, pawnPosition: p ? { x: p.gridX, y: p.gridY } : null });
            SpLogger.log("link.card", { player: PLAYER_1, round: gameState.roundNumber, cardId, pawnId });
          }
        } catch (_) { }
        socket._dispatch("cardLinked", { cardId, pawnId, playerNum: PLAYER_1 });
        // After player's link, advance turn logic; AI will link on its turn exactly once
        setTimeout(() => {
          finishLinkingOrNextTurn(PLAYER_1);
        }, 150);
        break;
      }
      case "playerCannotLink": {
        // Player cannot link; advance turn logic; AI links on its turn
        try { if (window.SpLogger) SpLogger.log("link.cannot", { player: PLAYER_1, round: gameState.roundNumber }); } catch (_) { }
        setTimeout(() => {
          finishLinkingOrNextTurn(PLAYER_1);
        }, 150);
        break;
      }
      case "gameAction": {
        // Handle move or attack
        const { actionType, pawnId, targetX, targetY, targetPawnId } = data || {};
        console.log(SP_LOG_PREFIX, "gameAction received", { actionType, pawnId, targetX, targetY, targetPawnId, currentPlayer: gameState.currentPlayer });
        const actingPawn = getClientPawnById(pawnId);
        if (!actingPawn) {
          console.warn(SP_LOG_PREFIX, "actingPawn not found for gameAction", { pawnId });
          switchTurnTo(PLAYER_2);
          return;
        }
        if (actionType === "move") {
          console.log(SP_LOG_PREFIX, "[P1] move received", { pawnId, before: { x: actingPawn.gridX, y: actingPawn.gridY, rs: actingPawn.remainingStamina }, targetX, targetY });
          try { if (window.SpLogger) SpLogger.log('action.decision', { actor: 'P1', type: 'move', pawnId, from: { x: actingPawn.gridX, y: actingPawn.gridY }, to: { x: targetX, y: targetY } }); } catch (_) { }
          // Determine move cost from client's computed paths when available
          let cost = 1;
          const fromX = actingPawn.gridX, fromY = actingPawn.gridY;
          if (typeof getPossibleMoves === "function") {
            const options = getPossibleMoves(actingPawn) || [];
            const match = options.find((m) => m && m.x === targetX && m.y === targetY);
            console.log(SP_LOG_PREFIX, "[P1] possibleMoves", { count: options.length, sample: options.slice(0, 5) });
            if (match && Number.isFinite(match.staminaCost)) cost = Math.max(1, match.staminaCost);
            else cost = Math.max(1, Math.abs((targetX ?? actingPawn.gridX) - actingPawn.gridX) + Math.abs((targetY ?? actingPawn.gridY) - actingPawn.gridY));
          } else {
            cost = Math.max(1, Math.abs((targetX ?? actingPawn.gridX) - actingPawn.gridX) + Math.abs((targetY ?? actingPawn.gridY) - actingPawn.gridY));
          }
          console.log(SP_LOG_PREFIX, "[P1] computed cost", { cost });
          actingPawn.gridX = targetX;
          actingPawn.gridY = targetY;
          const beforeRS = actingPawn.remainingStamina;
          actingPawn.remainingStamina = Math.max(0, (actingPawn.remainingStamina || 0) - cost);
          try { if (window.SpLogger) SpLogger.log("action.move", { actor: PLAYER_1, pawnId, from: { x: fromX, y: fromY }, to: { x: targetX, y: targetY }, cost, rsBefore: beforeRS, rsAfter: actingPawn.remainingStamina, cycle: gameState.cycleNumber, round: gameState.roundNumber }); } catch (_) { }
          console.log(SP_LOG_PREFIX, "[P1] apply stamina", { beforeRS, afterRS: actingPawn.remainingStamina });
          if (typeof actingPawn.updateBars === "function") {
            console.log(SP_LOG_PREFIX, "[P1] calling updateBars after move");
            actingPawn.updateBars();
          }
          console.log(SP_LOG_PREFIX, "[P1] move cost applied", { cost, after: { x: actingPawn.gridX, y: actingPawn.gridY, rs: actingPawn.remainingStamina } });
          console.log(SP_LOG_PREFIX, "has actionPerformed listeners?", socket.hasListeners("actionPerformed"));
          socket._dispatch("actionPerformed", {
            actionType: "move",
            pawnId: actingPawn.id,
            playerNum: PLAYER_1,
            targetX: actingPawn.gridX,
            targetY: actingPawn.gridY,
            updatedPawn: { currentHP: actingPawn.currentHP, remainingStamina: actingPawn.remainingStamina },
            eliminatedPawnIDs: [],
          });
          // Ensure bars reflect immediately
          if (typeof actingPawn.updateBars === "function") {
            console.log(SP_LOG_PREFIX, "[P1] calling updateBars post-dispatch");
            actingPawn.updateBars();
          }
          // Turn advancement handled in unified post-action logic below
        } else if (actionType === "attack") {
          console.log(SP_LOG_PREFIX, "[P1] attack received", { pawnId, targetPawnId, attackerBefore: { hp: actingPawn.currentHP, rs: actingPawn.remainingStamina } });
          const targetPawn = getClientPawnById(targetPawnId);
          if (!targetPawn) {
            console.warn(SP_LOG_PREFIX, "targetPawn not found for attack", { targetPawnId });
            switchTurnTo(PLAYER_2);
            return;
          }
          try { if (window.SpLogger) SpLogger.log('action.decision', { actor: 'P1', type: 'attack', attackerId: actingPawn.id, targetId: targetPawn.id }); } catch (_) { }
          const attackerAttack = actingPawn.linkedCard?.attack || 0;
          const defenderHP = targetPawn.currentHP ?? targetPawn.linkedCard?.hp ?? 0;
          const defenderAttack = targetPawn.linkedCard?.attack || 0;
          const attackerHP = actingPawn.currentHP ?? actingPawn.linkedCard?.hp ?? 0;

          const newDefHP = Math.max(0, defenderHP - attackerAttack);
          const newAtkHP = newDefHP > 0 && defenderAttack > 0 ? Math.max(0, attackerHP - defenderAttack) : attackerHP;

          try { applyRandomHitAnimation(targetPawn); } catch (_) { }

          targetPawn.currentHP = newDefHP;
          actingPawn.currentHP = newAtkHP;
          const beforeRSAtk = actingPawn.remainingStamina;
          actingPawn.remainingStamina = Math.max(0, (actingPawn.remainingStamina || 0) - 1);
          let eliminated = [];
          let attackerMovedTo = null;
          if (newDefHP <= 0) {
            eliminated.push(targetPawn.id);
            const tx = targetPawn.gridX;
            const ty = targetPawn.gridY;
            // Do NOT remove locally here; let client actionPerformed handle it uniformly
            if (newAtkHP > 0) {
              actingPawn.gridX = tx;
              actingPawn.gridY = ty;
              attackerMovedTo = { x: tx, y: ty };
            }
          }
          // Handle attacker elimination as well
          if (newAtkHP <= 0) {
            eliminated.push(actingPawn.id);
          }
          try { if (window.SpLogger) SpLogger.log("action.attack", { actor: PLAYER_1, attackerId: actingPawn.id, defenderId: targetPawn.id, attackerHPBefore: attackerHP, defenderHPBefore: defenderHP, attackerHPAfter: newAtkHP, defenderHPAfter: newDefHP, eliminated, movedTo: attackerMovedTo, rsBefore: beforeRSAtk, rsAfter: actingPawn.remainingStamina, cycle: gameState.cycleNumber, round: gameState.roundNumber }); } catch (_) { }
          console.log(SP_LOG_PREFIX, "[P1] attack stamina", { beforeRS: beforeRSAtk, afterRS: actingPawn.remainingStamina });
          if (typeof actingPawn.updateBars === "function") actingPawn.updateBars();
          if (typeof targetPawn.updateBars === "function") targetPawn.updateBars();
          console.log(SP_LOG_PREFIX, "[P1] attack applied", { newAtkHP, newDefHP, attackerAfter: { hp: actingPawn.currentHP, rs: actingPawn.remainingStamina } });
          console.log(SP_LOG_PREFIX, "has actionPerformed listeners?", socket.hasListeners("actionPerformed"));

          socket._dispatch("actionPerformed", {
            actionType: "attack",
            pawnId: actingPawn.id,
            playerNum: PLAYER_1,
            attackerMovedTo,
            damageDealt: {
              attackerId: actingPawn.id,
              defenderId: targetPawn.id,
              damageToAttacker: (newAtkHP < attackerHP) ? (attackerHP - newAtkHP) : 0,
              damageToDefender: (defenderHP - newDefHP) || 0,
            },
            eliminatedPawnIDs: eliminated,
            updatedPawn: { currentHP: actingPawn.currentHP, remainingStamina: actingPawn.remainingStamina },
            hpAlreadyApplied: true,
          });
          // Ensure bars reflect immediately
          if (typeof actingPawn.updateBars === "function") actingPawn.updateBars();
        }
        // After player's action, always hand to unified evaluator
        setTimeout(() => {
          if (gameState.currentPhase === "GAME_OVER") return;
          // Prefer AI next if both can act; evaluator will decide
          postActionTurnEvaluation(PLAYER_1);
        }, 120);
        break;
      }
      case "playerCannotAct": {
        try { if (window.SpLogger) SpLogger.log("turn.cannotAct", { player: gameState.currentPlayer, cycle: gameState.cycleNumber, round: gameState.roundNumber }); } catch (_) { }
        handlePlayerCannotAct();
        break;
      }
      case "submitRpsChoice": {
        // Not expected due to AI avoiding tie; ignore gracefully
        break;
      }
      case "sendMessage": {
        // Echo chat locally as if server broadcasted
        const messageText = data?.message || "";
        const playerNum = data?.playerNum || gameState.playerNumber || PLAYER_1;
        socket._dispatch("newMessage", {
          playerNum,
          text: messageText,
          timestamp: Date.now(),
        });
        break;
      }
      default:
        console.warn(SP_LOG_PREFIX, "Unhandled emit:", event, data);
        break;
    }
  }

  // --- Entry point ---
  window.initSimpleSingleplayer = function () {
    console.log(SP_LOG_PREFIX, "Initializing singleplayer...");
    // Mark mode
    gameState.singleplayerMode = true;
    try { if (window.SpLogger) SpLogger.log("session.start", { mode: "singleplayer" }); } catch (_) { }
    // Ensure window.gameState points to the same object for scripts that read from window
    try {
      if (typeof window !== 'undefined') {
        if (!window.gameState) {
          window.gameState = gameState;
          console.log(SP_LOG_PREFIX, "window.gameState attached to const gameState");
        } else {
          // Best-effort sync if a different object exists
          if (window.gameState !== gameState) {
            console.warn(SP_LOG_PREFIX, "window.gameState existed as a different object; syncing key fields to const gameState reference");
            window.gameState = gameState;
          }
        }
      }
    } catch (e) {
      console.warn(SP_LOG_PREFIX, "Unable to attach window.gameState", e);
    }
    // Ensure we are not in test mode which bypasses server-like flows
    gameState.testMode = false;
    gameState.playerNumber = PLAYER_1;
    gameState.cycleNumber = 1;
    gameState.roundNumber = 1;
    gameState.currentPhase = currentRoundDefinePhaseLabel(1);
    gameState.currentPlayer = PLAYER_1; // Round 1 definer

    // Ensure a shared session object used by other scripts (mutate existing const if present)
    try {
      if (typeof gameSession === "object" && gameSession) {
        gameSession.roomCode = "SINGLE";
        gameSession.playerNumber = PLAYER_1;
        gameSession.initialGameState = {
          currentPhase: gameState.currentPhase,
          cycleNumber: gameState.cycleNumber,
          roundNumber: gameState.roundNumber,
          currentPlayer: gameState.currentPlayer,
        };
      } else {
        window.gameSession = {
          roomCode: "SINGLE",
          playerNumber: PLAYER_1,
          initialGameState: {
            currentPhase: gameState.currentPhase,
            cycleNumber: gameState.cycleNumber,
            roundNumber: gameState.roundNumber,
            currentPlayer: gameState.currentPlayer,
          },
        };
      }
    } catch (e) {
      window.gameSession = {
        roomCode: "SINGLE",
        playerNumber: PLAYER_1,
        initialGameState: {
          currentPhase: gameState.currentPhase,
          cycleNumber: gameState.cycleNumber,
          roundNumber: gameState.roundNumber,
          currentPlayer: gameState.currentPlayer,
        },
      };
    }

    // Override socket for both window.socket and global `socket` variable
    const mock = createMockSocket();
    window.socket = mock;
    try {
      // Assign to global binding declared in lobby.js (let socket;)
      socket = mock; // Do not guard; the binding exists and is assignable
    } catch (_) {
      // ignore
    }

    // Show game and start normal initialization
    if (typeof showScreen === "function") showScreen("game");
    setTimeout(() => {
      if (typeof initGame === "function") initGame();
      else console.error(SP_LOG_PREFIX, "initGame not found");
    }, 50);
  };
})();

// --- END OF FILE public/js/singleplayer-simple.js ---
