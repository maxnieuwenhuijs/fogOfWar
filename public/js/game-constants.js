// Game Constants
const BOARD_SIZE = 11; // 11x11 grid
const CELL_SIZE = 60; // Increased size of each cell in pixels for larger pawns and bar spacing
const BOARD_WIDTH = BOARD_SIZE * CELL_SIZE;
const BOARD_HEIGHT = BOARD_SIZE * CELL_SIZE;

const PLAYER_1 = 1;
const PLAYER_2 = 2;

const COLORS = {
    background: 0xeeeeee, // Light grey background
    gridLines: 0xcccccc, // Medium grey grid lines
    player1: 0xa91414,   // Red
    player2: 0x0d1697,   // Blue
    haven1: 0xb14747,   // Light red (Target for P1)
    haven2: 0x3940a5,   // Light blue (Target for P2)
    activeHighlight: 0xffff00, // Yellow highlight for active/selected
    moveHighlight: 0x00ff00,   // Green highlight for possible moves
    attackHighlight: 0xff0000, // Red highlight for attack targets
};

// Mapping from "hX_stY_aZ" string to the asset alias used for loading

const STAT_COMBINATION_TO_ICON_ALIAS = {
    "h1_s1_a5": "icon_1_1_5", "h1_s2_a4": "icon_1_2_4", "h1_s3_a3": "icon_1_3_3",
    "h1_s4_a2": "icon_1_4_2", "h1_s5_a1": "icon_1_5_1",
    "h2_s1_a4": "icon_2_1_4", "h2_s2_a3": "icon_2_2_3", "h2_s3_a2": "icon_2_3_2",
    "h2_s4_a1": "icon_2_4_1",
    "h3_s1_a3": "icon_3_1_3", "h3_s2_a2": "icon_3_2_2", "h3_s3_a1": "icon_3_3_1",
    "h4_s1_a2": "icon_4_1_2", "h4_s2_a1": "icon_4_2_1",
    "h5_s1_a1": "icon_5_1_1",
};

// Helper function to generate the asset paths (adjust path if needed)
function getCombinationIconPath(alias) {
    // Example: alias "icon_3_2_2" becomes "assets/icons/combinations/icon_h3_st2_a2.png" (st for stamina)
    const parts = alias.split('_');
    if (parts.length === 4 && parts[0] === 'icon') {
        // *** ENSURE THIS PATH IS CORRECT ***
        return `assets/icons/combinations/icon_h${parts[1]}_s${parts[2]}_a${parts[3]}.png`;
    }
    console.warn(`Could not generate path for alias: ${alias}`);
    return null; // Or a default path
}

// Cursor Styles
const CURSOR_DEFAULT = 'default';
const CURSOR_POINTER = 'pointer';
const CURSOR_ATTACK = 'crosshair';

// In public/js/game-constants.js

// --- Definieer de Haven Segmenten ---
const MID_HAVEN_1_COORDS = [{ x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }];   // Top Midden
const MID_HAVEN_2_COORDS = [{ x: 4, y: 10 }, { x: 5, y: 10 }, { x: 6, y: 10 }]; // Bodem Midden

const CORNER_TL_COORD = { x: 0, y: 0 };    // Top Left (enkel vakje)
const CORNER_TR_COORD = { x: 10, y: 0 };   // Top Right (enkel vakje)
const CORNER_BL_COORD = { x: 0, y: 10 };   // Bottom Left (enkel vakje)
const CORNER_BR_COORD = { x: 10, y: 10 };  // Bottom Right (enkel vakje)

// --- Gecombineerde Doel Havens (5 vakjes per speler) ---
// Speler 1 (Rood) moet naar de BOVENKANT (Midden + Hoeken)
const ALL_TARGET_HAVENS_P1 = [
    ...MID_HAVEN_1_COORDS,
    CORNER_TL_COORD,
    CORNER_TR_COORD
];

// Speler 2 (Blauw) moet naar de ONDERKANT (Midden + Hoeken)
const ALL_TARGET_HAVENS_P2 = [
    ...MID_HAVEN_2_COORDS,
    CORNER_BL_COORD,
    CORNER_BR_COORD
];

// --- Optioneel: Verwijder oude/ongebruikte constanten zoals HAVEN_1_COORDS, CORNER_TL_COORDS (met 'S') ---
// om verwarring te voorkomen.

// Game State
const gameState = {
    currentPlayer: PLAYER_1,
    currentPhase: 'PRE_GAME', // PRE_GAME, SETUP_X_..., ACTION, AWAITING_ACTION_TARGET, GAME_OVER
    cycleNumber: 0,
    roundNumber: 0,
    initiativePlayer: null,
    cycleInitiativePlayer: null,
    players: {
        [PLAYER_1]: { pawns: [], cardsDefinedThisRound: [], cardsAvailableForLinking: [] },
        [PLAYER_2]: { pawns: [], cardsDefinedThisRound: [], cardsAvailableForLinking: [] },
    },
    activePawnsThisCycle: { [PLAYER_1]: [], [PLAYER_2]: [] },
    selectedPawn: null,
    winner: null,
    possibleAttackTargets: [],
    isAnimating: false,
    playerNumber: null, // Current player's number (1 or 2)
    isSpectator: false // Whether current user is spectating
};
