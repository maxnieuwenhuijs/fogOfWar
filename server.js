// --- START OF FILE server.js ---

// Fixed server.js file with particular focus on the Action Phase

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// --- Game Constants (Server-Side) ---
const BOARD_SIZE = 11;
const PLAYER_1 = 1;
const PLAYER_2 = 2;

// --- Timer Constants ---
const DEFINE_PHASE_TIME = 20000; // 20 seconds for card definition
const LINKING_PHASE_TIME = 20000; // 20 seconds for pawn linking
const ACTION_PHASE_TIME = 20000; // 20 seconds per move in action phase

// --- Haven Coördinaten (Server-Side Mirror) ---
const MID_HAVEN_1_COORDS = [
  { x: 4, y: 0 },
  { x: 5, y: 0 },
  { x: 6, y: 0 },
];
const MID_HAVEN_2_COORDS = [
  { x: 4, y: 10 },
  { x: 5, y: 10 },
  { x: 6, y: 10 },
];
const CORNER_TL_COORD = { x: 0, y: 0 };
const CORNER_TR_COORD = { x: 10, y: 0 };
const CORNER_BL_COORD = { x: 0, y: 10 };
const CORNER_BR_COORD = { x: 10, y: 10 };

const ALL_TARGET_HAVENS_P1 = [
  /* Kopieer de inhoud van de client constante */ ...MID_HAVEN_1_COORDS,
  CORNER_TL_COORD,
  CORNER_TR_COORD,
];
const ALL_TARGET_HAVENS_P2 = [
  /* Kopieer de inhoud van de client constante */ ...MID_HAVEN_2_COORDS,
  CORNER_BL_COORD,
  CORNER_BR_COORD,
];
// --- End Game Constants ---

// Game rooms storage
const gameRooms = new Map();

// --- Helper Functions ---
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getDefiningPlayerForRound(roundNumber) {
  // Odd rounds (1,3): Player 1 defines first
  // Even rounds (2): Player 2 defines first
  return roundNumber % 2 === 1 ? PLAYER_1 : PLAYER_2;
}

// Helper to get a pawn object from the room state by ID
function getPawnByIdServer(room, pawnId) {
  if (!room || !pawnId) return null;
  // Ensure allPawns arrays exist before spreading
  const p1Pawns = room.player1?.allPawns || [];
  const p2Pawns = room.player2?.allPawns || [];
  // Find the pawn, ensuring p exists before accessing p.id
  return [...p1Pawns, ...p2Pawns].find((p) => p && p.id === pawnId) || null;
}

// Helper to remove a pawn from all relevant server lists
function removePawnServer(room, pawnToRemove) {
  if (!room || !pawnToRemove) {
    console.warn("removePawnServer called with invalid room or pawnToRemove");
    return;
  }
  console.log(
    `Server: Removing pawn ${pawnToRemove.id} (Player ${pawnToRemove.player})`
  );

  // Remove from master list (allPawns)
  const playerAllPawnsList =
    pawnToRemove.player === PLAYER_1
      ? room.player1?.allPawns
      : room.player2?.allPawns; // Added optional chaining
  if (playerAllPawnsList) {
    const idxAll = playerAllPawnsList.findIndex(
      (p) => p && p.id === pawnToRemove.id
    );
    if (idxAll > -1) {
      playerAllPawnsList.splice(idxAll, 1);
      console.log(
        ` -> Removed ${pawnToRemove.id} from player ${pawnToRemove.player} allPawns list.`
      );
    } else {
      console.log(
        ` -> ${pawnToRemove.id} not found in player ${pawnToRemove.player} allPawns list.`
      );
    }
  } else {
    console.warn(` -> Player ${pawnToRemove.player} allPawns list not found.`);
  }

  // Remove from cycle activePawns list (list of IDs linked this cycle)
  const cycleActiveList =
    pawnToRemove.player === PLAYER_1
      ? room.player1?.activePawns
      : room.player2?.activePawns; // Added optional chaining
  if (cycleActiveList) {
    const activeIdx = cycleActiveList.indexOf(pawnToRemove.id);
    if (activeIdx > -1) {
      cycleActiveList.splice(activeIdx, 1);
      console.log(
        ` -> Removed ${pawnToRemove.id} from player ${pawnToRemove.player} activePawns (cycle link) list.`
      );
    } else {
      console.log(
        ` -> ${pawnToRemove.id} not found in player ${pawnToRemove.player} activePawns (cycle link) list.`
      );
    }
  } else {
    // This might be normal if the cycle hasn't started linking yet or the player object is missing
    // console.warn(` -> Player ${pawnToRemove.player} activePawns (cycle link) list not found.`);
  }

  // Remove from initialActivePawnIDs list for cycle end check
  if (room.gameState?.initialActivePawnIDs) {
    // Added optional chaining
    const initialIdx = room.gameState.initialActivePawnIDs.indexOf(
      pawnToRemove.id
    );
    if (initialIdx > -1) {
      room.gameState.initialActivePawnIDs.splice(initialIdx, 1);
      console.log(
        ` -> Removed ${pawnToRemove.id} from gameState initialActivePawnIDs list.`
      );
    } else {
      console.log(
        ` -> ${pawnToRemove.id} not found in gameState initialActivePawnIDs list.`
      );
    }
  } else {
    console.warn(" -> gameState initialActivePawnIDs list not found.");
  }

  // Remove from acted list if present
  if (room.gameState?.actedPawnIDsThisCycle) {
    // Added optional chaining
    const actedIdx = room.gameState.actedPawnIDsThisCycle.indexOf(
      pawnToRemove.id
    );
    if (actedIdx > -1) {
      room.gameState.actedPawnIDsThisCycle.splice(actedIdx, 1);
      console.log(
        ` -> Removed ${pawnToRemove.id} from gameState actedPawnIDsThisCycle list.`
      );
    } else {
      console.log(
        ` -> ${pawnToRemove.id} not found in gameState actedPawnIDsThisCycle list.`
      );
    }
  } else {
    console.warn(" -> gameState actedPawnIDsThisCycle list not found.");
  }
}

// Helper functie om RPS ronde winnaar te bepalen
function determineRpsRoundWinner(choice1, choice2) {
  if (!choice1 || !choice2) return null; // Kan niet bepalen als keuze mist
  if (choice1 === choice2) return 0; // Draw
  if (
    (choice1 === "rock" && choice2 === "scissors") ||
    (choice1 === "scissors" && choice2 === "paper") ||
    (choice1 === "paper" && choice2 === "rock")
  ) {
    return PLAYER_1; // Player 1 wins
  }
  return PLAYER_2; // Player 2 wins
}

// Helper function to check if a player can currently link a card
function canPlayerLink(room, playerNum) {
  if (!room || !playerNum || !room.player1 || !room.player2) { // Ensure both player objects exist for safety
    console.warn(`canPlayerLink: Invalid arguments or player data missing for P${playerNum}.`);
    return false;
  }
  const player = playerNum === PLAYER_1 ? room.player1 : room.player2;

  // Check 1: Does the player have any cards defined for this round that are not yet linked?
  const hasUnlinkedCards = player.cards?.some((c) => c && !c.isLinked);
  if (!hasUnlinkedCards) {
    // console.log(`canPlayerLink check: P${playerNum} has no unlinked cards.`);
    return false;
  }

  // Check 2: Does the player have any pawns that are not currently active (i.e., available to be linked to)?
  const hasInactivePawns = player.allPawns?.some((p) => p && !p.isActive);
  if (!hasInactivePawns) {
    // console.log(`canPlayerLink check: P${playerNum} has no inactive pawns.`);
    return false;
  }

  // If both checks pass, the player can link.
  // console.log(`canPlayerLink check: P${playerNum} can link.`);
  return true;
}

// Helper to get all valid move coordinates for a single pawn
function getValidMovesForPawn(pawn, allPawns) {
  if (!pawn || !pawn.isActive || pawn.remainingStamina <= 0) {
    return [];
  }

  const validMoves = [];
  const { gridX, gridY, remainingStamina } = pawn;
  const occupiedCoords = new Set(allPawns.map(p => `${p.gridX},${p.gridY}`));

  // Check all tiles within stamina range
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      const distance = Math.abs(x - gridX) + Math.abs(y - gridY);
      if (distance > 0 && distance <= remainingStamina) {
        if (!occupiedCoords.has(`${x},${y}`)) {
          validMoves.push({ x, y });
        }
      }
    }
  }
  return validMoves;
}

// Helper to check if a pawn can attack any adjacent enemy
function canPawnAttack(pawn, allPawns) {
  if (!pawn || !pawn.isActive || pawn.remainingStamina <= 0) {
    return false;
  }

  const { gridX, gridY, player } = pawn;
  const adjacentCoords = [
    { x: gridX + 1, y: gridY },
    { x: gridX - 1, y: gridY },
    { x: gridX, y: gridY + 1 },
    { x: gridX, y: gridY - 1 },
  ];

  return allPawns.some(otherPawn =>
    otherPawn && otherPawn.isActive &&
    otherPawn.player !== player &&
    adjacentCoords.some(coord => coord.x === otherPawn.gridX && coord.y === otherPawn.gridY)
  );
}

// Upgraded helper to determine if a player has any valid action
function canPlayerStillAct(player, allPawns) {
  if (!player || !player.allPawns) {
    return false;
  }

  return player.allPawns.some(pawn => {
    if (!pawn || !pawn.isActive || pawn.remainingStamina <= 0) {
      return false;
    }
    // Check for valid moves OR a valid attack
    const hasValidMove = getValidMovesForPawn(pawn, allPawns).length > 0;
    const hasValidAttack = canPawnAttack(pawn, allPawns);
    return hasValidMove || hasValidAttack;
  });
}

// --- End Helper Functions ---

// --- State Transition Helper Functions (Global Scope) ---

// Helper function to advance linking turn or phase
function advanceLinkingTurnOrPhase(io, room, roomCode, playerWhoJustActedOrCannotAct) {
  if (!io || !room || !roomCode || !room.gameState) {
    console.error("advanceLinkingTurnOrPhase: Invalid arguments (io, room, roomCode, or gameState missing).");
    return;
  }

  const p1Cards = room.player1?.cards || [];
  const p2Cards = room.player2?.cards || [];
  const totalLinked =
    p1Cards.filter((c) => c && c.isLinked).length +
    p2Cards.filter((c) => c && c.isLinked).length;
  const totalDefined = p1Cards.length + p2Cards.length;
  // --- Add Detailed Debug Logging ---
  const p1LinkedCount = p1Cards.filter(c => c?.isLinked).length;
  const p2LinkedCount = p2Cards.filter(c => c?.isLinked).length;
  console.log(` -> advanceLinkingTurnOrPhase Check:`);
  console.log(` -> P1 Cards: Defined=${p1Cards.length}, Linked=${p1LinkedCount}`);
  console.log(` -> P2 Cards: Defined=${p2Cards.length}, Linked=${p2LinkedCount}`);
  console.log(` -> Totals: totalLinked=${totalLinked}, totalDefined=${totalDefined}`);
  // --- End Debug Logging ---
  console.log(`Server Link Check: Linked this round: ${totalLinked} / ${totalDefined}`);

  // Check if the round is over (all defined cards are linked)
  if (totalDefined > 0 && totalLinked >= totalDefined) {
    // Alle kaarten zijn gelinkt, ronde is voorbij
    if (typeof finishLinkingPhase === "function") {
      finishLinkingPhase(io, room, roomCode);
    } else {
      console.error("!!! Critical Error: finishLinkingPhase function reference missing in advanceLinkingTurnOrPhase !!!");
    }
  } else {
    // Niet alle kaarten zijn gelinkt, bepaal wie aan de beurt is
    const nextPlayerNum = playerWhoJustActedOrCannotAct === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    const nextPlayerCanLink = canPlayerLink(room, nextPlayerNum);
    const actingPlayerCanLinkAgain = canPlayerLink(room, playerWhoJustActedOrCannotAct);

    if (nextPlayerCanLink) {
      room.gameState.currentPlayer = nextPlayerNum;
      console.log(`Server switching link turn to P${nextPlayerNum}`);
      io.to(roomCode).emit("nextLinkTurn", {
        currentPlayer: room.gameState.currentPlayer,
      });
    } else if (actingPlayerCanLinkAgain) {
      room.gameState.currentPlayer = playerWhoJustActedOrCannotAct;
      console.log(
        `Player ${nextPlayerNum} cannot link. Player ${playerWhoJustActedOrCannotAct} can still link. Keeping turn with P${playerWhoJustActedOrCannotAct}.`
      );
      io.to(roomCode).emit("nextLinkTurn", {
        currentPlayer: room.gameState.currentPlayer,
      });
    } else {
      console.log(
        `Neither Player ${nextPlayerNum} nor Player ${playerWhoJustActedOrCannotAct} can link anymore. Ending linking phase.`
      );
      if (typeof finishLinkingPhase === "function") {
        finishLinkingPhase(io, room, roomCode);
      } else {
        console.error("!!! Critical Error: finishLinkingPhase function reference missing when ending link phase !!!");
      }
    }
  }
}

// Function to finish the linking phase and move to the next round or action phase
function finishLinkingPhase(io, room, roomCode) {
  if (!io || !room || !roomCode || !room.gameState) {
    console.error("finishLinkingPhase called with invalid arguments (io, room, roomCode, or gameState missing).");
    return;
  }
  console.log(
    `Finishing linking phase for R${room.gameState.roundNumber}...`
  );
  if (room.player1) {
    room.player1.cards = [];
    room.player1.cardsReady = false;
  }
  if (room.player2) {
    room.player2.cards = [];
    room.player2.cardsReady = false;
  }

  if (room.gameState.roundNumber < 3) {
    room.gameState.roundNumber++;
    room.gameState.currentPhase = `SETUP_${room.gameState.roundNumber}_DEFINE`;
    room.gameState.currentPlayer = getDefiningPlayerForRound(
      room.gameState.roundNumber
    );
    console.log(
      `Moving to R${room.gameState.roundNumber}, P${room.gameState.currentPlayer} defines.`
    );
    io.to(roomCode).emit("nextRound", {
      roundNumber: room.gameState.roundNumber,
      currentPhase: room.gameState.currentPhase,
      currentPlayer: room.gameState.currentPlayer,
    });
  } else {
    // Start Action Phase logic
    room.gameState.currentPhase = "ACTION";
    if (room.gameState.cycleInitiativePlayer === null) {
      console.warn(
        "!!! cycleInitiativePlayer is null at start of Action Phase. Defaulting to P1. !!!"
      );
      room.gameState.cycleInitiativePlayer = PLAYER_1;
    }
    room.gameState.currentPlayer = room.gameState.cycleInitiativePlayer;
    room.gameState.initialActivePawnIDs = [
      ...(room.player1?.activePawns || []),
      ...(room.player2?.activePawns || []),
    ];
    room.gameState.actedPawnIDsThisCycle = [];

    // --- Stamina Initialization for All Active Pawns ---
    console.log("Server resetting remainingStamina for all active pawns.");
    const allPawns = [...(room.player1?.allPawns || []), ...(room.player2?.allPawns || [])];
    allPawns.forEach(pawn => {
      if (pawn && pawn.isActive && pawn.linkedCard) {
        pawn.remainingStamina = pawn.linkedCard.stamina;
        console.log(` -> Set stamina for ${pawn.id} to ${pawn.remainingStamina}`);
      }
    });
    // --- End Stamina Initialization ---

    console.log(
      `Starting action phase, P${room.gameState.currentPlayer} starts. Initial active: ${room.gameState.initialActivePawnIDs.length}`
    );

    if (room.gameState.initialActivePawnIDs.length === 0) {
      console.warn(
        "No pawns active at the start of the action phase. Starting new cycle immediately."
      );
      // Trigger new cycle logic directly (using advanceTurnOrCycle for consistency)
      advanceTurnOrCycle(io, room, roomCode); // Pass io and room
    } else {
      io.to(roomCode).emit("startActionPhase", {
        currentPlayer: room.gameState.currentPlayer,
        currentPhase: room.gameState.currentPhase,
      });
    }
  }
}

// Function to Advance Turn or Start New Cycle
function advanceTurnOrCycle(io, room, roomCode) {
  if (!io || !room || !roomCode || !room.gameState) {
    console.error("advanceTurnOrCycle: Invalid arguments or io/room/gameState missing.");
    return;
  }

  // This is the single source of truth for turn progression.
  // It is called after a game action OR when a player manually passes.

  // Clear any previous "cannot act" flags as we are re-evaluating the entire board state.
  if (room.gameState.playersWhoCannotAct) {
    room.gameState.playersWhoCannotAct.clear();
  }
  const currentPlayerNum = room.gameState.currentPlayer;
  const currentPlayer = currentPlayerNum === PLAYER_1 ? room.player1 : room.player2;
  const opponentPlayerNum = currentPlayerNum === PLAYER_1 ? PLAYER_2 : PLAYER_1;
  const opponent = opponentPlayerNum === PLAYER_1 ? room.player1 : room.player2;

  const allPawns = [...(room.player1?.allPawns || []), ...(room.player2?.allPawns || [])];

  const currentPlayerCanAct = canPlayerStillAct(currentPlayer, allPawns);
  const opponentCanAct = canPlayerStillAct(opponent, allPawns);

  if (!currentPlayerCanAct && !opponentCanAct) {
    // If neither player can act, end the cycle.
    console.log(`Server: No active pawns on either team have remaining stamina. Ending cycle.`);
    startNewCycle(io, room, roomCode);
    return;
  }

  // Decide next player
  if (opponentCanAct) {
    // If the opponent can act, switch the turn to them.
    room.gameState.currentPlayer = opponentPlayerNum;
    console.log(`Server: Opponent P${opponentPlayerNum} can act. Switching turn.`);
    io.to(roomCode).emit('nextTurn', { currentPlayer: room.gameState.currentPlayer });
  } else if (currentPlayerCanAct) {
    // If opponent cannot act, but the current player still can, it remains their turn.
    console.log(`Server: Opponent cannot act, but P${currentPlayerNum} can still act. Turn continues.`);
    io.to(roomCode).emit('nextTurn', { currentPlayer: room.gameState.currentPlayer });
  } else {
    // This case should be covered by the initial check, but as a fallback, end cycle.
    console.log(`Server: Fallback. Neither player can act. Ending cycle.`);
    startNewCycle(io, room, roomCode);
  }
}

function startNewCycle(io, room, roomCode) {
  console.log("Preparing to start new cycle...");
  if (room.player1) room.player1.activePawns = [];
  if (room.player2) room.player2.activePawns = [];
  room.gameState.cycleNumber++;
  room.gameState.roundNumber = 1;
  room.gameState.currentPhase = `SETUP_${room.gameState.roundNumber}_DEFINE`;
  room.gameState.currentPlayer = getDefiningPlayerForRound(1);
  room.gameState.initialActivePawnIDs = [];
  room.gameState.actedPawnIDsThisCycle = [];
  if (room.player1) { room.player1.cardsReady = false; room.player1.cards = []; }
  if (room.player2) { room.player2.cardsReady = false; room.player2.cards = []; }
  room.gameState.cycleInitiativePlayer = null;
  room.gameState.initiativePlayer = null;

  console.log("Resetting pawn states for new cycle...");
  const allSurvivingPawns = [...(room.player1?.allPawns || []), ...(room.player2?.allPawns || [])];
  allSurvivingPawns.forEach(pawn => {
    if (pawn) {
      pawn.isActive = false;
      pawn.currentHP = null;
      pawn.linkedCard = null;
      pawn.remainingStamina = null;
    }
  });

  console.log(`Server starting new cycle ${room.gameState.cycleNumber}`);
  io.to(roomCode).emit('newCycle', {
    cycleNumber: room.gameState.cycleNumber,
    roundNumber: room.gameState.roundNumber,
    currentPhase: room.gameState.currentPhase,
    currentPlayer: room.gameState.currentPlayer
  });
}
// --- End State Transition Helper Functions ---


// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Handle game creation
  socket.on("createGame", (playerName) => {
    const roomCode = generateRoomCode();
    gameRooms.set(roomCode, {
      id: roomCode,
      player1: {
        id: socket.id,
        name: playerName,
        ready: false,
        cards: [],
        cardsReady: false,
        activePawns: [],
        allPawns: [],
      },
      player2: null,
      gameState: {
        currentPhase: "WAITING_FOR_PLAYER2",
        roundNumber: 0,
        cycleNumber: 0,
        currentPlayer: null,
        initiativePlayer: null,
        cycleInitiativePlayer: null,
        initialActivePawnIDs: [],
        actedPawnIDsThisCycle: [],
        rpsState: null,
        rpsChoices: { 1: null, 2: null },
      },
      messages: [],
      lastActionTime: Date.now(),
    });
    socket.join(roomCode);
    socket.emit("gameCreated", {
      roomCode: roomCode,
      playerNumber: 1,
      playerName: playerName,
    });
    console.log(`Game created: ${roomCode} by ${playerName}`);
  });

  // Handle joining a game
  socket.on("joinGame", ({ roomCode, playerName }) => {
    if (!gameRooms.has(roomCode)) {
      socket.emit("error", "Game room not found");
      return;
    }
    const room = gameRooms.get(roomCode);
    if (room.player2) {
      socket.emit("error", "Game room is full");
      return;
    }

    socket.join(roomCode);
    room.player2 = {
      id: socket.id,
      name: playerName,
      ready: false,
      cards: [],
      cardsReady: false,
      activePawns: [],
      allPawns: [],
    };
    room.gameState.currentPhase = "PRE_GAME";

    socket.emit("gameJoined", {
      roomCode: roomCode,
      playerNumber: 2,
      player1Name: room.player1?.name || "Player 1",
      playerName: playerName,
    });
    if (room.player1?.id)
      io.to(room.player1.id).emit("playerJoined", { player2Name: playerName });
    console.log(`Player ${playerName} joined room: ${roomCode}`);
  });

  // Handle player readiness
  socket.on("playerReady", (roomCode) => {
    if (!gameRooms.has(roomCode)) {
      socket.emit("error", "Game room not found");
      return;
    }
    const room = gameRooms.get(roomCode);
    let playerNum = 0;
    if (room.player1 && room.player1.id === socket.id) {
      room.player1.ready = true;
      playerNum = 1;
    } else if (room.player2 && room.player2.id === socket.id) {
      room.player2.ready = true;
      playerNum = 2;
    } else {
      return;
    }
    console.log(`Player ${playerNum} in room ${roomCode} is ready.`);

    if (
      room.player1?.ready &&
      room.player2?.ready &&
      !room.gameState.cycleNumber
    ) {
      room.gameState.cycleNumber = 1;
      room.gameState.roundNumber = 1;
      room.gameState.currentPhase = "SETUP_1_DEFINE";
      room.gameState.currentPlayer = getDefiningPlayerForRound(1);

      console.log("Initializing server-side pawn states...");
      room.player1.allPawns = [];
      room.player2.allPawns = [];
      let p1IdCounter = 0;
      let p2IdCounter = 0;
      for (let y = BOARD_SIZE - 2; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          room.player1.allPawns.push({
            id: `p1_${p1IdCounter++}`,
            player: 1,
            gridX: x,
            gridY: y,
            currentHP: null,
            linkedCard: null,
            isActive: false,
          });
        }
      }
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          room.player2.allPawns.push({
            id: `p2_${p2IdCounter++}`,
            player: 2,
            gridX: x,
            gridY: y,
            currentHP: null,
            linkedCard: null,
            isActive: false,
          });
        }
      }
      console.log(
        `Server pawns initialized: P1(${room.player1.allPawns.length}), P2(${room.player2.allPawns.length})`
      );

      console.log(
        `Both players ready. Starting game. P${room.gameState.currentPlayer} defines first.`
      );
      io.to(roomCode).emit("gameStart", {
        currentPhase: room.gameState.currentPhase,
        cycleNumber: room.gameState.cycleNumber,
        roundNumber: room.gameState.roundNumber,
        currentPlayer: room.gameState.currentPlayer,
      });
    } else {
      io.to(roomCode).emit("playerIsReady", { playerNum });
    }
  });

  // Handle card definitions
  socket.on("defineCards", ({ roomCode, cards, playerNum }) => {
    if (!gameRooms.has(roomCode)) {
      socket.emit("error", "Game room not found");
      return;
    }
    const room = gameRooms.get(roomCode);
    room.lastActionTime = Date.now();
    if (room.gameState.currentPlayer !== playerNum) {
      console.warn(
        `P${playerNum} define fail: P${room.gameState.currentPlayer}'s turn.`
      );
      socket.emit("error", "Not your turn");
      return;
    }
    if (!room.gameState.currentPhase.endsWith("DEFINE")) {
      console.warn(
        `P${playerNum} define fail: Phase ${room.gameState.currentPhase}.`
      );
      socket.emit("error", "Wrong phase");
      return;
    }

    console.log(`P${playerNum} defined cards R${room.gameState.roundNumber}`);
    const player = playerNum === 1 ? room.player1 : room.player2;
    player.cards = cards;
    player.cardsReady = true;

    const otherPlayerNum = playerNum === 1 ? 2 : 1;
    const otherPlayerId = playerNum === 1 ? room.player2?.id : room.player1?.id;
    if (otherPlayerId) io.to(otherPlayerId).emit("opponentCardsReady");

    if (room.player1?.cardsReady && room.player2?.cardsReady) {
      console.log(`Both defined for R${room.gameState.roundNumber}. Reveal.`);
      room.gameState.currentPhase = `SETUP_${room.gameState.roundNumber}_REVEAL`;

      const p1Cards = room.player1.cards || [];
      const p2Cards = room.player2.cards || [];
      const p1TotalAttack = p1Cards.reduce(
        (sum, card) => sum + (card?.attack || 0),
        0
      );
      const p2TotalAttack = p2Cards.reduce(
        (sum, card) => sum + (card?.attack || 0),
        0
      );
      const p1TotalStamina = p1Cards.reduce(
        (sum, card) => sum + (card?.stamina || 0),
        0
      );
      const p2TotalStamina = p2Cards.reduce(
        (sum, card) => sum + (card?.stamina || 0),
        0
      );

      let initiativePlayer = null;
      let startRps = false;

      if (p1TotalAttack > p2TotalAttack) initiativePlayer = PLAYER_1;
      else if (p2TotalAttack > p1TotalAttack) initiativePlayer = PLAYER_2;
      else if (p1TotalStamina > p2TotalStamina) initiativePlayer = PLAYER_1;
      else if (p2TotalStamina > p1TotalStamina) initiativePlayer = PLAYER_2;
      else {
        console.log(
          `!!! Initiative Tiebreaker Detected (Round ${room.gameState.roundNumber}) -> Starting RPS !!!`
        );
        startRps = true;
      }

      if (!startRps) {
        room.gameState.initiativePlayer = initiativePlayer;
        if (room.gameState.roundNumber === 3) {
          room.gameState.cycleInitiativePlayer = initiativePlayer;
          console.log(`Cycle initiative set directly: P${initiativePlayer}`);
        }
        console.log(
          `R${room.gameState.roundNumber} Initiative: P${initiativePlayer}`
        );

        io.to(roomCode).emit("cardsRevealed", {
          player1Cards: room.player1.cards || [],
          player2Cards: room.player2.cards || [],
          initiativePlayer: initiativePlayer,
          p1TotalAttack,
          p2TotalAttack,
          p1TotalStamina,
          p2TotalStamina,
        });

        room.gameState.currentPhase = `SETUP_${room.gameState.roundNumber}_LINKING`;
        room.gameState.currentPlayer = initiativePlayer;
        console.log(
          `Moving to Linking R${room.gameState.roundNumber}. P${room.gameState.currentPlayer} starts.`
        );
        io.to(roomCode).emit("startLinking", {
          initiativePlayer,
          currentPhase: room.gameState.currentPhase,
          currentPlayer: room.gameState.currentPlayer,
        });
      } else {
        room.gameState.rpsState = "ACTIVE";
        room.gameState.rpsChoices = { 1: null, 2: null };
        room.gameState.currentPhase = "RPS_TIEBREAKER";
        room.gameState.initiativePlayer = null;
        room.gameState.currentPlayer = null;

        console.log(
          `Server transitioning to RPS_TIEBREAKER phase for Round ${room.gameState.roundNumber}.`
        );

        io.to(roomCode).emit("startRpsTiebreaker", {
          roundNumber: room.gameState.roundNumber,
        });

        io.to(roomCode).emit("cardsRevealed", {
          player1Cards: room.player1.cards || [],
          player2Cards: room.player2.cards || [],
          initiativePlayer: null,
          p1TotalAttack,
          p2TotalAttack,
          p1TotalStamina,
          p2TotalStamina,
        });
      }
    } else {
      room.gameState.currentPlayer = otherPlayerNum;
      console.log(
        `Waiting for P${otherPlayerNum}. P1 Ready: ${room.player1.cardsReady}, P2 Ready: ${room.player2.cardsReady}`
      );
      if (otherPlayerId)
        io.to(otherPlayerId).emit("yourTurnToDefine", {
          currentPlayer: otherPlayerNum,
          roundNumber: room.gameState.roundNumber,
        });
    }
  });

  // Handle card linking
  socket.on("linkCard", ({ roomCode, cardId, pawnId }) => {
    if (!gameRooms.has(roomCode)) {
      socket.emit("error", "Room not found");
      return;
    }
    const room = gameRooms.get(roomCode);
    room.lastActionTime = Date.now();
    const playerNum = room.gameState.currentPlayer;
    const player = playerNum === 1 ? room.player1 : room.player2;
    if (socket.id !== player?.id) {
      socket.emit("error", "Not your turn");
      return;
    }

    const card = player.cards?.find((c) => c.id === cardId);
    if (!card) {
      socket.emit("error", "Card not found");
      return;
    }
    if (card.isLinked) {
      socket.emit("error", "Card already linked");
      return;
    }

    const serverPawn = getPawnByIdServer(room, pawnId);
    if (!serverPawn) {
      socket.emit("error", `Pawn ${pawnId} not found`);
      return;
    }
    if (serverPawn.isActive) {
      socket.emit("error", `Pawn ${pawnId} already active`);
      return;
    }
    if (serverPawn.player !== playerNum) {
      socket.emit("error", "Cannot link opponent pawn");
      return;
    }

    serverPawn.isActive = true;
    serverPawn.currentHP = card.hp;
    serverPawn.linkedCard = {
      id: card.id,
      hp: card.hp,
      stamina: card.stamina,
      attack: card.attack,
    };
    serverPawn.remainingStamina = card.stamina; // Initialize stamina
    if (!player.activePawns.includes(pawnId)) {
      player.activePawns.push(pawnId);
    }
    card.isLinked = true;
    console.log(
      `Server linked P${playerNum}'s card ${cardId} to pawn ${pawnId}`
    );
    io.to(roomCode).emit("cardLinked", { cardId, pawnId, playerNum });

    // Call the global helper function, passing 'io'
    advanceLinkingTurnOrPhase(io, room, roomCode, playerNum);
  });

  // Handle playerCannotLink
  socket.on("playerCannotLink", ({ roomCode }) => {
    if (!gameRooms.has(roomCode)) {
      socket.emit("error", "Room not found");
      return;
    }
    const room = gameRooms.get(roomCode);
    const playerNum = room.gameState.currentPlayer;
    const player = playerNum === PLAYER_1 ? room.player1 : room.player2;

    if (!player || socket.id !== player.id) {
      socket.emit("error", "Not your turn or player invalid");
      return;
    }
    if (!room.gameState.currentPhase?.endsWith("LINKING")) {
      socket.emit("error", "Not linking phase");
      return;
    }

    console.log(`Server received 'playerCannotLink' from P${playerNum} in room ${roomCode}.`);
    room.lastActionTime = Date.now();

    const serverConfirmsCannotLink = !canPlayerLink(room, playerNum);
    if (!serverConfirmsCannotLink) {
      console.warn(`Server disagrees: P${playerNum} *can* link according to server state. Ignoring 'playerCannotLink'.`);
      return;
    }

    // Call the global helper function, passing 'io'
    advanceLinkingTurnOrPhase(io, room, roomCode, playerNum);
  });

  // Handle game actions
  socket.on(
    "gameAction",
    ({ roomCode, actionType, pawnId, targetX, targetY, targetPawnId }) => {
      if (!gameRooms.has(roomCode)) {
        socket.emit("error", "Room not found");
        return;
      }
      const room = gameRooms.get(roomCode);
      room.lastActionTime = Date.now();
      const playerNum = room.gameState.currentPlayer;
      const player = playerNum === PLAYER_1 ? room.player1 : room.player2;

      if (!player || socket.id !== player.id) {
        socket.emit("error", "Not your turn or player invalid");
        return;
      }
      if (room.gameState.currentPhase !== "ACTION") {
        socket.emit("error", "Not action phase");
        return;
      }
      const actingPawn = getPawnByIdServer(room, pawnId);
      if (!actingPawn) {
        socket.emit("error", `Pawn ${pawnId} not found`);
        return;
      }
      if (actingPawn.player !== playerNum) {
        socket.emit("error", "Cannot act with opponent pawn");
        return;
      }
      if (!actingPawn.isActive || !actingPawn.linkedCard) {
        socket.emit("error", `Pawn ${pawnId} not active or no card`);
        return;
      }
      if (actingPawn.remainingStamina <= 0) {
        socket.emit("error", `Pawn ${pawnId} has no stamina left`);
        return;
      }

      let actionDataForClient = { actionType, pawnId, playerNum };
      let eliminatedPawnsInfo = [];
      let attackerMoved = false;
      let attackerMovedToPos = null;

      try {
        if (actionType === "move") {
          if (
            targetX < 0 ||
            targetX >= BOARD_SIZE ||
            targetY < 0 ||
            targetY >= BOARD_SIZE
          ) {
            socket.emit(
              "error",
              `Invalid target coordinates [${targetX}, ${targetY}]`
            );
            return;
          }
          const occupiedPawn = [
            ...(room.player1?.allPawns || []),
            ...(room.player2?.allPawns || []),
          ].find((p) => p && p.gridX === targetX && p.gridY === targetY);
          if (occupiedPawn) {
            socket.emit(
              "error",
              `Target square [${targetX}, ${targetY}] is occupied by ${occupiedPawn.id}`
            );
            return;
          }

          const distance = Math.abs(targetX - actingPawn.gridX) + Math.abs(targetY - actingPawn.gridY);
          console.log(
            `Server processing P${playerNum} move ${pawnId} from [${actingPawn.gridX}, ${actingPawn.gridY}] to [${targetX}, ${targetY}], distance: ${distance}`
          );

          actingPawn.gridX = targetX;
          actingPawn.gridY = targetY;
          actionDataForClient.targetX = targetX;
          actionDataForClient.targetY = targetY;

          if (actingPawn.linkedCard && actingPawn.linkedCard.stamina) {
            const currentStamina = actingPawn.remainingStamina || actingPawn.linkedCard.stamina;
            actingPawn.remainingStamina = Math.max(0, currentStamina - distance);
            console.log(`Server: Pawn ${actingPawn.id} stamina after move (${distance} distance): ${actingPawn.remainingStamina}`);

            if (actingPawn.remainingStamina === 0) {
              console.log(`Server: Pawn ${actingPawn.id} became inactive due to 0 stamina`);
            }
          }
        } else if (actionType === "attack") {
          const originalAttackerX = actingPawn.gridX;
          const originalAttackerY = actingPawn.gridY;

          const defendingPawn = getPawnByIdServer(room, targetPawnId);
          if (!defendingPawn) {
            socket.emit("error", `Defender ${targetPawnId} not found`);
            return;
          }
          if (defendingPawn.player === playerNum) {
            socket.emit("error", "Cannot attack own pawn");
            return;
          }

          const dx = Math.abs(actingPawn.gridX - defendingPawn.gridX);
          const dy = Math.abs(actingPawn.gridY - defendingPawn.gridY);
          if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) {
            socket.emit(
              "error",
              `Target ${targetPawnId} is not adjacent to attacker ${pawnId}`
            );
            return;
          }

          console.log(
            `Server calculating attack: ${pawnId}(A:${actingPawn.linkedCard?.attack
            }, HP:${actingPawn.currentHP}) vs ${targetPawnId}(A:${defendingPawn.linkedCard?.attack || "N/A"
            }, HP:${defendingPawn.currentHP})`
          );
          const attackerAttack = actingPawn.linkedCard?.attack || 0;
          const defenderHasCard =
            defendingPawn.isActive && defendingPawn.linkedCard;

          let defenderAttack = defenderHasCard
            ? Math.max(0, (defendingPawn.linkedCard?.attack || 0) - 1)
            : 0;

          console.log(
            ` -> Defender attack reduced by 1 due to pawn attack rule: ${defendingPawn.linkedCard?.attack || 0} -> ${defenderAttack}`
          );

          const attackerHPBefore = actingPawn.currentHP;
          const defenderHPBefore = defendingPawn.currentHP;

          let finalAttackerHP = attackerHPBefore - defenderAttack;
          let finalDefenderHP = defenderHasCard
            ? defenderHPBefore - attackerAttack
            : null;

          const damageToAttacker = defenderAttack;
          let damageToDefender = 0;
          if (defenderHasCard) {
            damageToDefender = attackerAttack;
          } else if (attackerAttack > 0) {
            damageToDefender = 999;
          }

          actingPawn.currentHP = finalAttackerHP;
          if (defenderHasCard) defendingPawn.currentHP = finalDefenderHP;

          console.log(
            `Server HP After: Attacker ${finalAttackerHP}, Defender ${finalDefenderHP === null ? "Inactive" : finalDefenderHP
            }`
          );
          console.log(
            ` -> Damage dealt: To Attacker(${actingPawn.id}) = ${damageToAttacker}, To Defender(${defendingPawn.id}) = ${damageToDefender}`
          );

          let attackerEliminated = finalAttackerHP <= 0;
          let defenderEliminated =
            (defenderHasCard && finalDefenderHP <= 0) ||
            (!defenderHasCard && attackerAttack > 0);

          if (attackerEliminated) {
            eliminatedPawnsInfo.push({
              id: actingPawn.id,
              player: actingPawn.player,
            });
            actingPawn.currentHP = 0;
            console.log(` -> Attacker ${actingPawn.id} eliminated.`);
          }
          if (defenderEliminated) {
            eliminatedPawnsInfo.push({
              id: defendingPawn.id,
              player: defendingPawn.player,
            });
            if (defendingPawn.isActive) defendingPawn.currentHP = 0;
            console.log(` -> Defender ${defendingPawn.id} eliminated.`);
          }

          attackerMoved = defenderEliminated && !attackerEliminated;
          if (attackerMoved) {
            const oldDefX = defendingPawn.gridX;
            const oldDefY = defendingPawn.gridY;
            const occupiedCheck = [
              ...(room.player1?.allPawns || []),
              ...(room.player2?.allPawns || []),
            ].find(
              (p) =>
                p &&
                p.id !== defendingPawn.id &&
                p.gridX === oldDefX &&
                p.gridY === oldDefY
            );
            if (!occupiedCheck) {
              actingPawn.gridX = oldDefX;
              actingPawn.gridY = oldDefY;
              attackerMovedToPos = { x: actingPawn.gridX, y: actingPawn.gridY };
              actionDataForClient.attackerMovedTo = attackerMovedToPos;
              console.log(
                `Server: Attacker ${pawnId} moved to [${actingPawn.gridX}, ${actingPawn.gridY}] after eliminating ${targetPawnId}`
              );
            } else {
              console.warn(
                `Server: Attacker ${pawnId} could not move to [${oldDefX}, ${oldDefY}] after elimination, square became occupied by ${occupiedCheck.id}.`
              );
              attackerMoved = false;
            }
          }

          actionDataForClient.targetPawnId = targetPawnId;
          actionDataForClient.damageDealt = {
            attackerId: actingPawn.id,
            defenderId: defendingPawn.id,
            damageToAttacker: damageToAttacker,
            damageToDefender: damageToDefender,
          };

          if (actingPawn.linkedCard && actingPawn.linkedCard.stamina) {
            let staminaCost = 1; // Base attack cost is always 1

            // Only add movement cost if attacker moved for reasons OTHER than taking eliminated defender's spot
            if (attackerMoved && attackerMovedToPos && !defenderEliminated) {
              const moveDistance = Math.abs(attackerMovedToPos.x - originalAttackerX) + Math.abs(attackerMovedToPos.y - originalAttackerY);
              staminaCost += moveDistance;
              console.log(`Server: Attack + voluntary move from [${originalAttackerX},${originalAttackerY}] to [${attackerMovedToPos.x},${attackerMovedToPos.y}], distance: ${moveDistance}, total stamina cost: ${staminaCost}`);
            } else if (attackerMoved && attackerMovedToPos && defenderEliminated) {
              console.log(`Server: Attack + taking eliminated defender's spot from [${originalAttackerX},${originalAttackerY}] to [${attackerMovedToPos.x},${attackerMovedToPos.y}], stamina cost: 1 (fixed)`);
            }

            const currentStamina = actingPawn.remainingStamina || actingPawn.linkedCard.stamina;
            actingPawn.remainingStamina = Math.max(0, currentStamina - staminaCost);
            console.log(`Server: Pawn ${actingPawn.id} stamina after attack (${staminaCost} total): ${actingPawn.remainingStamina}`);

            if (actingPawn.remainingStamina === 0) {
              console.log(`Server: Pawn ${actingPawn.id} became inactive due to 0 stamina`);
            }
          }
        } else {
          socket.emit("error", "Invalid action type");
          return;
        }
      } catch (error) {
        console.error("Error executing action:", error);
        socket.emit("error", "Server error processing action");
        return;
      }

      eliminatedPawnsInfo.forEach((info) => {
        const pawnToRemove = getPawnByIdServer(room, info.id);
        if (pawnToRemove) {
          console.log(
            `Calling removePawnServer for eliminated pawn: ${info.id}`
          );
          removePawnServer(room, pawnToRemove);
        } else {
          console.warn(
            `Could not find eliminated pawn ${info.id} to remove from server state.`
          );
        }
      });

      actionDataForClient.eliminatedPawnIDs = eliminatedPawnsInfo.map(
        (p) => p.id
      );
      actionDataForClient.updatedPawn = {
        id: actingPawn.id,
        currentHP: actingPawn.currentHP,
        remainingStamina: actingPawn.remainingStamina,
      };
      console.log(`Broadcasting actionPerformed:`, actionDataForClient);
      io.to(roomCode).emit("actionPerformed", actionDataForClient);

      console.log(`Server checking stamina and switching turn after P${playerNum} action`);
      advanceTurnOrCycle(io, room, roomCode);
    }
  );

  // Handle playerCannotAct
  socket.on("playerCannotAct", ({ roomCode }) => {
    if (!gameRooms.has(roomCode)) {
      socket.emit("error", "Room not found");
      return;
    }
    const room = gameRooms.get(roomCode);
    const playerNum = room.gameState.currentPlayer;
    const player = playerNum === PLAYER_1 ? room.player1 : room.player2;

    if (!player || socket.id !== player.id) {
      socket.emit("error", "Not your turn or player invalid");
      return;
    }
    if (room.gameState.currentPhase !== "ACTION") {
      socket.emit("error", "Not action phase");
      return;
    }

    console.log(`Server received 'playerCannotAct' from P${playerNum} in room ${roomCode}.`);
    room.lastActionTime = Date.now();

    const activePlayerPawns = room.gameState.initialActivePawnIDs
      .map(id => getPawnByIdServer(room, id))
      .filter(pawn => pawn && pawn.player === playerNum && !room.gameState.actedPawnIDsThisCycle.includes(pawn.id));

    // Let advanceTurnOrCycle handle the logic based on the true game state.
    console.log(`Player P${playerNum} passed the turn. Re-evaluating board state.`);

    // Call the global helper function.
    advanceTurnOrCycle(io, room, roomCode);
  });

  // Handle endCycle - simple turn switching after each action
  socket.on("endCycle", ({ roomCode }) => {
    if (!gameRooms.has(roomCode)) {
      socket.emit("error", "Room not found");
      return;
    }
    const room = gameRooms.get(roomCode);
    const playerNum = room.gameState.currentPlayer;
    const player = playerNum === PLAYER_1 ? room.player1 : room.player2;

    if (!player || socket.id !== player.id) {
      socket.emit("error", "Not your turn or player invalid");
      return;
    }
    if (room.gameState.currentPhase !== "ACTION") {
      socket.emit("error", "Not action phase");
      return;
    }

    console.log(`Server received 'endCycle' from P${playerNum} in room ${roomCode}. Switching turn.`);
    room.lastActionTime = Date.now();

    // Simple turn switching - alternate between players
    const nextPlayer = playerNum === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    room.gameState.currentPlayer = nextPlayer;

    console.log(`Server switching turn from P${playerNum} to P${nextPlayer}`);
    io.to(roomCode).emit('nextTurn', { currentPlayer: room.gameState.currentPlayer });
  });

  // Handle RPS choice submission
  socket.on("submitRpsChoice", ({ roomCode, choice }) => {
    if (!gameRooms.has(roomCode)) return;
    const room = gameRooms.get(roomCode);
    let playerNum = 0;
    if (room.player1?.id === socket.id) playerNum = PLAYER_1;
    else if (room.player2?.id === socket.id) playerNum = PLAYER_2;
    else return;

    if (
      room.gameState.rpsState !== "ACTIVE" ||
      room.gameState.currentPhase !== "RPS_TIEBREAKER"
    ) {
      console.warn(
        `[${roomCode}] RPS Choice from P${playerNum} ignored: Not in active RPS state.`
      );
      socket.emit("error", "Not in RPS game.");
      return;
    }
    if (!["rock", "paper", "scissors"].includes(choice)) {
      console.warn(
        `[${roomCode}] Invalid RPS Choice from P${playerNum}: ${choice}`
      );
      socket.emit("error", "Invalid RPS choice.");
      return;
    }
    if (room.gameState.rpsChoices[playerNum] !== null) {
      console.warn(
        `[${roomCode}] P${playerNum} already chose for this RPS tiebreaker.`
      );
      socket.emit("error", "Already chose.");
      return;
    }

    room.gameState.rpsChoices[playerNum] = choice;
    console.log(`[${roomCode}] P${playerNum} chose RPS: ${choice}`);
    socket.emit("rpsChoiceConfirmed", { choice });
    const opponentId =
      playerNum === PLAYER_1 ? room.player2?.id : room.player1?.id;
    if (opponentId) io.to(opponentId).emit("waitingForOpponentRpsChoice");

    const choice1 = room.gameState.rpsChoices[PLAYER_1];
    const choice2 = room.gameState.rpsChoices[PLAYER_2];

    if (choice1 && choice2) {
      console.log(
        `[${roomCode}] Both players chose RPS. P1: ${choice1}, P2: ${choice2}`
      );
      let rpsWinner = determineRpsRoundWinner(choice1, choice2);

      if (rpsWinner === 0) {
        console.log(` -> RPS round is a draw! Starting new RPS round.`);
        room.gameState.rpsChoices = { 1: null, 2: null };
        io.to(roomCode).emit("rpsTie", {
          round: room.gameState.roundNumber,
          choices: { [PLAYER_1]: choice1, [PLAYER_2]: choice2 },
        });
      } else {
        console.log(` -> RPS winner: P${rpsWinner}.`);
        room.gameState.rpsState = null;
        room.gameState.rpsChoices = { 1: null, 2: null };
        room.gameState.initiativePlayer = rpsWinner;
        room.gameState.currentPhase = `SETUP_${room.gameState.roundNumber}_LINKING`;
        room.gameState.currentPlayer = rpsWinner;

        if (room.gameState.roundNumber === 3) {
          room.gameState.cycleInitiativePlayer = rpsWinner;
          console.log(`Cycle initiative set via RPS: P${rpsWinner}`);
        }

        console.log(`RPS finished. Assigning initiative to P${rpsWinner}.`);
        console.log(
          ` -> Transitioning to ${room.gameState.currentPhase}. P${room.gameState.currentPlayer} starts linking.`
        );

        io.to(roomCode).emit("rpsRoundResult", {
          round: room.gameState.roundNumber,
          choices: { [PLAYER_1]: choice1, [PLAYER_2]: choice2 },
          roundWinner: rpsWinner,
          isGameOver: true,
        });

        const winnerCanLink = canPlayerLink(room, rpsWinner);
        const loser = rpsWinner === PLAYER_1 ? PLAYER_2 : PLAYER_1;
        const loserCanLink = canPlayerLink(room, loser);

        if (winnerCanLink) {
          console.log(
            ` -> Winner P${rpsWinner} can link. Starting linking phase.`
          );
          setTimeout(() => {
            io.to(roomCode).emit("startLinking", {
              initiativePlayer: room.gameState.initiativePlayer,
              currentPhase: room.gameState.currentPhase,
              currentPlayer: room.gameState.currentPlayer,
            });
          }, 2500);
        } else if (loserCanLink) {
          console.log(
            ` -> Winner P${rpsWinner} cannot link. Loser P${loser} can. Starting linking phase with P${loser}.`
          );
          room.gameState.currentPlayer = loser;
          setTimeout(() => {
            io.to(roomCode).emit("startLinking", {
              initiativePlayer: room.gameState.initiativePlayer,
              currentPhase: room.gameState.currentPhase,
              currentPlayer: room.gameState.currentPlayer,
            });
          }, 2500);
        } else {
          console.log(
            ` -> Neither winner P${rpsWinner} nor loser P${loser} can link. Skipping linking phase for R${room.gameState.roundNumber}.`
          );
          if (typeof finishLinkingPhase === "function") {
            // Pass 'io' to finishLinkingPhase
            finishLinkingPhase(io, room, roomCode);
          } else {
            console.error(
              "!!! Critical Error: finishLinkingPhase function reference missing within submitRpsChoice !!!"
            );
          }
        }
      }
    }
  });

  // Handle gameWon claim
  socket.on("gameWon", ({ roomCode, winner }) => {
    console.log(
      `Received 'gameWon' claim from client ${socket.id} for room ${roomCode}, winner P${winner}`
    );
    if (!gameRooms.has(roomCode)) {
      console.warn(` -> Room ${roomCode} not found for gameWon claim.`);
      return;
    }
    const room = gameRooms.get(roomCode);

    const claimantPlayerObj = winner === PLAYER_1 ? room.player1 : room.player2;
    if (!claimantPlayerObj || claimantPlayerObj.id !== socket.id) {
      console.warn(
        ` -> Invalid 'gameWon' claim: Claimant socket ${socket.id} does not match claimed winner P${winner}.`
      );
      return;
    }
    console.log(
      ` -> Client claim received. Server should have already determined win state after the last action.`
    );
  });

  // Handle physics attack animation sync
  socket.on("physicsAttackAnimation", (data) => {
    if (!data || !data.attackerId || !data.targetId) {
      console.warn("Invalid physics attack animation data");
      return;
    }

    // Find which room this socket is in
    let foundRoomCode = null;
    for (const [roomCode, room] of gameRooms) {
      if (room.player1?.id === socket.id || room.player2?.id === socket.id) {
        foundRoomCode = roomCode;
        break;
      }
    }

    if (!foundRoomCode) {
      console.warn("Could not find room for physics attack animation");
      return;
    }

    // Broadcast to all other players in the room
    socket.to(foundRoomCode).emit("physicsAttackAnimation", data);
    console.log(`Broadcasting physics attack animation in room ${foundRoomCode}`);
  });

  // Handle chat messages
  socket.on("sendMessage", ({ roomCode, message, playerNum }) => {
    if (!gameRooms.has(roomCode)) {
      console.warn(`Room ${roomCode} not found for sendMessage.`);
      return;
    }
    const room = gameRooms.get(roomCode);
    const sendingPlayer = playerNum === PLAYER_1 ? room.player1 : room.player2;

    if (!sendingPlayer || sendingPlayer.id !== socket.id) {
      console.warn(
        `Invalid sendMessage: Sender socket ${socket.id} does not match playerNum ${playerNum}.`
      );
      return;
    }
    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      console.warn(
        `Invalid sendMessage: Empty or invalid message from P${playerNum}.`
      );
      return;
    }

    const sanitizedMessage = message.trim().substring(0, 200);

    const messageData = {
      playerNum: playerNum,
      playerName: sendingPlayer.name || `Player ${playerNum}`,
      text: sanitizedMessage,
      timestamp: Date.now(),
    };

    console.log(
      `Broadcasting message in room ${roomCode} from P${playerNum}: ${sanitizedMessage}`
    );
    io.to(roomCode).emit("newMessage", messageData);
  });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    let roomCodeToRemove = null;
    let disconnectedPlayerNum = null;
    let remainingPlayerId = null;
    let roomFound = null;

    for (const [code, room] of gameRooms.entries()) {
      if (room.player1 && room.player1.id === socket.id) {
        roomCodeToRemove = code;
        roomFound = room;
        disconnectedPlayerNum = PLAYER_1;
        remainingPlayerId = room.player2?.id;
        break;
      } else if (room.player2 && room.player2.id === socket.id) {
        roomCodeToRemove = code;
        roomFound = room;
        disconnectedPlayerNum = PLAYER_2;
        remainingPlayerId = room.player1?.id;
        break;
      }
    }

    if (roomCodeToRemove && roomFound) {
      console.log(
        ` -> Player ${disconnectedPlayerNum} disconnected from room ${roomCodeToRemove}.`
      );

      gameRooms.delete(roomCodeToRemove);
      console.log(` -> Room ${roomCodeToRemove} removed.`);

      if (
        remainingPlayerId &&
        roomFound.gameState.currentPhase !== "PRE_GAME" &&
        roomFound.gameState.currentPhase !== "WAITING_FOR_PLAYER2"
      ) {
        if (roomFound.gameState.currentPhase !== "GAME_OVER") {
          const winner =
            disconnectedPlayerNum === PLAYER_1 ? PLAYER_2 : PLAYER_1;
          const winnerName =
            winner === PLAYER_1
              ? roomFound.player1?.name
              : roomFound.player2?.name;

          console.log(
            ` -> Notifying remaining player ${remainingPlayerId} about opponent disconnect and win.`
          );
          io.to(remainingPlayerId).emit("gameOver", {
            winner: winner,
            winnerName: winnerName || `Player ${winner}`,
            reason: `Opponent Player ${disconnectedPlayerNum} disconnected.`,
          });
        } else {
          console.log(
            ` -> Game in room ${roomCodeToRemove} was already over. No disconnect notification sent.`
          );
        }

        if (remainingPlayerId)
          io.to(remainingPlayerId).emit("playerDisconnected", {
            playerNum: disconnectedPlayerNum,
          });
      } else if (remainingPlayerId) {
        console.log(
          ` -> Disconnect happened before game fully started or only player left. Notifying opponent.`
        );
        if (remainingPlayerId)
          io.to(remainingPlayerId).emit("playerDisconnected", {
            playerNum: disconnectedPlayerNum,
          });
      } else {
        console.log(` -> Player 1 disconnected before Player 2 joined.`);
      }
    } else {
      console.log(
        ` -> Disconnected client ${socket.id} was not found in any active game room.`
      );
    }
  });
}); // End io.on('connection')

// --- Interval Checks (Optional Sanity/Cleanup) ---
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes

  for (const [code, room] of gameRooms.entries()) {
    if (now - room.lastActionTime > timeout) {
      console.log(`Room ${code} timed out due to inactivity. Removing.`);
      // Notify players if possible before removing
      if (room.player1?.id) io.to(room.player1.id).emit('error', 'Game timed out due to inactivity.');
      if (room.player2?.id) io.to(room.player2.id).emit('error', 'Game timed out due to inactivity.');
      gameRooms.delete(code);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Start the server
const PORT = process.env.PORT || 8004;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- END OF FILE server.js ---
