// --- START OF FILE public/js/game-ui.js ---

// Helper function to safely update stats bar
function updateStatsBar(phase, player, cycle, round) {
  const statsPhase = document.getElementById("stats-phase");
  const statsPlayer = document.getElementById("stats-player");
  const statsCycle = document.getElementById("stats-cycle");
  const statsRound = document.getElementById("stats-round");
  
  if (statsPhase) statsPhase.textContent = phase;
  if (statsPlayer) statsPlayer.textContent = player;
  if (statsCycle) statsCycle.textContent = cycle;
  if (statsRound) statsRound.textContent = round;
}

// UI Element References
let uiPanel,
  statsPhaseSpan,
  statsPlayerSpan,
  statsCycleSpan,
  statsRoundSpan,
  cardDefinitionUI,
  defRoundNumSpan,
  defPlayerNumSpan,
  confirmCardsBtn,
  cardInputsDivs;
let opponentWaitingUI,
  cardRevealUI,
  revealRoundNumSpan,
  yourRevealedCardsDiv,
  opponentRevealedCardsDiv,
  initiativePlayerSpan,
  initiativeReasonSpan;
let linkingUI,
  linkRoundNumSpan,
  linkPlayerNumSpan,
  availableCardsLinkingDiv,
  linkingStatusDiv;
let actionUI,
  actionPlayerNumSpan,
  selectedPawnInfoDiv;
// Removed: actionButtonsDiv, moveBtn, attackBtn, cancelActionBtn;
let gameOverDiv, chatInput, sendChatBtn, chatMessages;
let rpsTiebreakerUI,
  rpsRoundNumSpan,
  rpsScoreP1Span,
  rpsScoreP2Span,
  rpsInstructionP,
  rpsButtonsDiv,
  rpsChoiceBtns,
  rpsResultDiv;
// Nieuwe/Gewijzigde Referenties
let cardUiArea; // Toegevoegd voor card area border
let leftColumn; // Corrected ID reference for the left column containing info/chat
let presetSpeedyBtn, presetAttackersBtn, presetDefendersBtn;

// Preset Data
const CARD_PRESETS = {
  "preset-speedy": { hp: 1, stamina: 5, attack: 1 },
  "preset-attackers": { hp: 3, stamina: 1, attack: 3 },
  "preset-defenders": { hp: 4, stamina: 1, attack: 2 },
};

// Cache UI elements
function cacheUIElements() {
  console.log("Attempting to cache UI elements..."); // Extra log
  let allFound = true;

  // Containers voor borders en layout
  cardUiArea = document.getElementById("card-ui-area");
  leftColumn = document.getElementById("left-column"); // Corrected ID
  if (!cardUiArea) {
    console.error("Cache Error: ID 'card-ui-area' not found!");
    allFound = false;
  }
  if (!leftColumn) { // Corrected variable name
    console.error("Cache Error: ID 'left-column' not found!"); // Corrected ID in message
    allFound = false;
  }

  // Game stats bar elements
  statsPhaseSpan = document.getElementById("stats-phase");
  statsPlayerSpan = document.getElementById("stats-player");
  statsCycleSpan = document.getElementById("stats-cycle");
  statsRoundSpan = document.getElementById("stats-round");
  
  if (!statsPhaseSpan) {
    console.warn("Warning: 'stats-phase' element not found during caching - will try again later");
  }
  if (!statsPlayerSpan) {
    console.warn("Warning: 'stats-player' element not found during caching - will try again later");
  }
  if (!statsCycleSpan) {
    console.warn("Warning: 'stats-cycle' element not found during caching - will try again later");
  }
  if (!statsRoundSpan) {
    console.warn("Warning: 'stats-round' element not found during caching - will try again later");
  }

  // Card definition UI (in card-ui-area)
  cardDefinitionUI = document.getElementById("card-definition-ui");
  if (cardDefinitionUI) {
    defRoundNumSpan = document.getElementById("def-round-num");
    defPlayerNumSpan = document.getElementById("def-player-num");
    confirmCardsBtn = document.getElementById("confirm-cards-btn");
    cardInputsDivs = cardDefinitionUI.querySelectorAll(".card-inputs");
    presetSpeedyBtn = document.getElementById("preset-speedy");
    presetAttackersBtn = document.getElementById("preset-attackers");
    presetDefendersBtn = document.getElementById("preset-defenders");
    if (
      !defRoundNumSpan ||
      !defPlayerNumSpan ||
      !confirmCardsBtn ||
      cardInputsDivs.length !== 3 ||
      !presetSpeedyBtn ||
      !presetAttackersBtn ||
      !presetDefendersBtn
    ) {
      console.error(
        "Cache Error: Elements within 'card-definition-ui' missing!"
      );
      allFound = false;
    }
  } else {
    console.error("Cache Error: ID 'card-definition-ui' not found!");
    allFound = false;
  }

  // Opponent waiting UI (in card-ui-area)
  opponentWaitingUI = document.getElementById("opponent-waiting");
  if (!opponentWaitingUI) {
    console.error("Cache Error: ID 'opponent-waiting' not found!");
    allFound = false;
  }

  // Card reveal UI (in card-ui-area)
  cardRevealUI = document.getElementById("card-reveal-ui");
  if (cardRevealUI) {
    revealRoundNumSpan = document.getElementById("reveal-round-num");
    yourRevealedCardsDiv = document.getElementById("your-revealed-cards");
    opponentRevealedCardsDiv = document.getElementById(
      "opponent-revealed-cards"
    );
    initiativePlayerSpan = document.getElementById("initiative-player");
    initiativeReasonSpan = document.getElementById("initiative-reason");
    if (
      !revealRoundNumSpan ||
      !yourRevealedCardsDiv ||
      !opponentRevealedCardsDiv ||
      !initiativePlayerSpan ||
      !initiativeReasonSpan
    ) {
      console.error("Cache Error: Elements within 'card-reveal-ui' missing!");
      allFound = false;
    }
  } else {
    console.error("Cache Error: ID 'card-reveal-ui' not found!");
    allFound = false;
  }

  // Linking UI (in card-ui-area)
  linkingUI = document.getElementById("linking-ui");
  if (linkingUI) {
    linkRoundNumSpan = document.getElementById("link-round-num");
    linkPlayerNumSpan = document.getElementById("link-player-num");
    availableCardsLinkingDiv = document.getElementById(
      "available-cards-linking"
    );
    linkingStatusDiv = document.getElementById("linking-status");
    if (
      !linkRoundNumSpan ||
      !linkPlayerNumSpan ||
      !availableCardsLinkingDiv ||
      !linkingStatusDiv
    ) {
      console.error("Cache Error: Elements within 'linking-ui' missing!");
      allFound = false;
    }
  } else {
    console.error("Cache Error: ID 'linking-ui' not found!");
    allFound = false;
  }

  // Action UI (in sidebar)
  actionUI = document.getElementById("action-ui");
  if (actionUI) {
    actionPlayerNumSpan = document.getElementById("action-player-num");
    selectedPawnInfoDiv = document.getElementById("selected-pawn-info");
    // Removed caching for actionButtonsDiv, moveBtn, attackBtn, cancelActionBtn
    if (
      !actionPlayerNumSpan ||
      !selectedPawnInfoDiv
      // Removed checks for actionButtonsDiv, moveBtn, attackBtn, cancelActionBtn
    ) {
      console.error("Cache Error: Core elements within 'action-ui' missing!"); // Updated error message slightly
      allFound = false;
    }
  } else {
    console.error("Cache Error: ID 'action-ui' not found!");
    allFound = false;
  }

  // Game over (in sidebar)
  gameOverDiv = document.getElementById("game-over");
  if (!gameOverDiv) {
    console.error("Cache Error: ID 'game-over' not found!");
    allFound = false;
  }

  // Chat (in chat-panel)
  chatInput = document.getElementById("chat-input");
  sendChatBtn = document.getElementById("send-chat-btn");
  chatMessages = document.getElementById("chat-messages");
  if (!chatInput || !sendChatBtn || !chatMessages) {
    console.error("Cache Error: Chat elements missing!");
    allFound = false;
  }

  // RPS UI Caching (Simplified)
  rpsTiebreakerUI = document.getElementById("rps-tiebreaker-ui");
  if (rpsTiebreakerUI) {
    // Removed: rpsRoundNumSpan, rpsScoreP1Span, rpsScoreP2Span
    rpsInstructionP = document.getElementById("rps-instruction");
    rpsButtonsDiv = document.getElementById("rps-buttons"); // Container div
    rpsChoiceBtns = rpsButtonsDiv
      ? rpsButtonsDiv.querySelectorAll(".rps-choice-btn")
      : []; // NodeList
    rpsResultDiv = document.getElementById("rps-result");
    // Updated check: removed round/score spans
    if (
      !rpsInstructionP ||
      !rpsButtonsDiv ||
      rpsChoiceBtns.length !== 3 ||
      !rpsResultDiv
    ) {
      console.error(
        "Cache Error: Core elements within 'rps-tiebreaker-ui' missing!"
      );
      allFound = false;
    } else {
      // Add hover sounds to RPS buttons if found
      rpsChoiceBtns.forEach(btn => {
        const choice = btn.dataset.choice; // Assuming buttons have data-choice="rock/paper/scissors"
        if (choice && typeof soundManager !== 'undefined') {
          // Remove old event listeners to avoid duplicates
          const oldBtn = btn.cloneNode(true);
          btn.parentNode.replaceChild(oldBtn, btn);

          // Add click sound
          oldBtn.addEventListener('click', () => {
            if (typeof soundManager !== 'undefined') {
              soundManager.playSound(`rps_${choice}`);
            }
          });
        } else if (!choice) {
          console.warn("RPS button missing data-choice attribute:", btn);
        }
      });

      // Update reference after replacing nodes
      rpsChoiceBtns = rpsButtonsDiv.querySelectorAll(".rps-choice-btn");
    }
  } else {
    console.warn(
      "Cache Warning: ID 'rps-tiebreaker-ui' not found! RPS feature disabled."
    );
  }

  // Eindresultaat loggen
  if (allFound) console.log("UI Elements Cached Successfully");
  else
    console.error(
      "!!! UI Element Caching Failed - Check IDs in HTML and cacheUIElements() !!!"
    );
}

// Update Game Status UI (MET TURN INDICATOR BORDERS)
function updateGameStatusUI() {
  // Always update the medal regardless of other UI elements
  updateTurnMedal();

  // Check if essential elements exist for the rest of the UI updates
  if (!cardUiArea || !leftColumn) { // Corrected variable name
    console.warn("updateGameStatusUI: Some UI elements missing, but medal was updated.");
    return;
  }

  if (
    typeof gameState === "undefined" ||
    gameState.currentPhase === undefined
  ) {
    console.warn(
      "updateGameStatusUI: gameState or gameState.currentPhase is undefined."
    );
    return;
  }

  // --- Turn Indicator Borders ---
  const phasesForBorder = [
    "ACTION",
    "AWAITING_ACTION_TARGET",
    "SETUP_1_LINKING",
    "SETUP_2_LINKING",
    "SETUP_3_LINKING",
    "SETUP_1_DEFINE",
    "SETUP_2_DEFINE",
    "SETUP_3_DEFINE",
  ];
  const showBorder = phasesForBorder.some((phase) =>
    gameState.currentPhase.startsWith(phase)
  );

  // Reset borders eerst
  cardUiArea.classList.remove("player1-turn-border", "player2-turn-border");
  leftColumn.classList.remove("player1-turn-border", "player2-turn-border"); // Corrected variable name
  // Padding wordt nu door CSS afgehandeld via de border-classes

  if (showBorder && gameState.currentPlayer) {
    const borderClass =
      gameState.currentPlayer === PLAYER_1
        ? "player1-turn-border"
        : "player2-turn-border";
    cardUiArea.classList.add(borderClass);
    leftColumn.classList.add(borderClass); // Corrected variable name
  } else if (gameState.currentPhase === "GAME_OVER" && gameState.winner) {
    const borderClass =
      gameState.winner === PLAYER_1
        ? "player1-turn-border"
        : "player2-turn-border";
    cardUiArea.classList.add(borderClass);
    leftColumn.classList.add(borderClass); // Corrected variable name
  }
  // --- End Turn Indicator Borders ---

  // Update player indicator dot color
  const playerIndicator = document.getElementById("player-indicator");
  if (playerIndicator && gameState.playerNumber) {
    playerIndicator.style.backgroundColor =
      gameState.playerNumber === PLAYER_1 ? "#ff0000" : "#0000ff";
  }

  // Update pawn count display
  if (typeof updatePawnCountDisplay === "function") {
    updatePawnCountDisplay();
  }

  // Update game status text and hide/show panels
  if (gameState.currentPhase === "GAME_OVER") {
    updateStatsBar("GAME OVER", `P${gameState.winner || "?"} WINS!`, "-", "-");
    if (gameOverDiv) {
      // Update the winner name in the victory screen
      const winnerNameSpan = document.getElementById('winner-name');
      if (winnerNameSpan) {
        winnerNameSpan.textContent = gameState.winner || "?";

        // Set appropriate color class based on winner
        gameOverDiv.className = gameState.winner === PLAYER_1 ? "player1-victory" : "player2-victory";

        // Trigger fireworks animation by adding the active class
        const fireworks = gameOverDiv.querySelectorAll('.firework');
        fireworks.forEach(fw => fw.classList.add('active'));

        // Play victory sound if sound manager is available
        if (typeof soundManager !== "undefined") {
          soundManager.playSound("ui_winner");
        }
      }
      gameOverDiv.style.display = "block";
      // On mobile, also surface the card panel as a summary if available
      try { if (window.MobileUI && window.MobileUI.setDrawerOpen) { window.MobileUI.setDrawerOpen(true); } } catch (_) {}
    }
    // Verberg andere panelen (zowel kaart als actie)
    if (cardDefinitionUI) cardDefinitionUI.style.display = "none";
    if (opponentWaitingUI) opponentWaitingUI.style.display = "none";
    if (cardRevealUI) cardRevealUI.style.display = "none";
    if (linkingUI) linkingUI.style.display = "none";
    if (actionUI) actionUI.style.display = "none";
    if (rpsTiebreakerUI) rpsTiebreakerUI.style.display = "none"; // Hide RPS too
  } else {
    updateStatsBar(
      gameState.currentPhase || "WAITING",
      gameState.currentPlayer ?? "N/A",
      gameState.cycleNumber || "-",
      gameState.roundNumber || "-"
    );
    if (gameOverDiv) gameOverDiv.style.display = "none";
    // showUIPanel regelt welke panelen zichtbaar zijn
  }
}

// Separate function to update just the medal
function updateTurnMedal() {
  if (
    typeof gameState === "undefined" ||
    gameState.currentPlayer === undefined
  ) {
    console.warn("updateTurnMedal: gameState or currentPlayer is undefined.");
    return;
  }

  // Update turn medal indicator
  const p1Medal = document.getElementById("p1-medal");
  const p2Medal = document.getElementById("p2-medal");

  if (p1Medal && p2Medal) {
    console.log(`🏅 MEDAL UPDATE: Showing medal for Player ${gameState.currentPlayer} (I am Player ${gameState.playerNumber})`);
    console.log(`🏅 Current game phase: ${gameState.currentPhase}, Round: ${gameState.roundNumber}, Cycle: ${gameState.cycleNumber}`);

    // Show the appropriate medal based on current player
    if (gameState.currentPlayer === PLAYER_1) {
      p1Medal.style.display = "block";
      p2Medal.style.display = "none";
      console.log(`🏅 Showing P1 medal, hiding P2 medal`);
    } else {
      p1Medal.style.display = "none";
      p2Medal.style.display = "block";
      console.log(`🏅 Showing P2 medal, hiding P1 medal`);
    }
  } else {
    console.warn("updateTurnMedal: Medal elements not found in DOM.");
  }
}

// Show appropriate UI panel based on game phase
function showUIPanel(panelToShow) {
  // Panelen in #card-ui-area
  if (cardDefinitionUI)
    cardDefinitionUI.style.display =
      panelToShow === "define" ? "block" : "none";
  if (opponentWaitingUI)
    opponentWaitingUI.style.display =
      panelToShow === "waiting" ? "block" : "none";
  if (cardRevealUI)
    cardRevealUI.style.display = panelToShow === "reveal" ? "block" : "none";
  if (linkingUI)
    linkingUI.style.display = panelToShow === "link" ? "block" : "none";
  // NIEUW: RPS UI tonen/verbergen
  if (rpsTiebreakerUI)
    rpsTiebreakerUI.style.display = panelToShow === "rps" ? "block" : "none";

  // Panelen in #ui-sidebar
  if (actionUI)
    actionUI.style.display =
      panelToShow === "action" || panelToShow === "awaiting_target"
        ? "block"
        : "none";
  // Game Over wordt direct beheerd door updateGameStatusUI

  // Update altijd de algemene status en borders
  updateGameStatusUI();
}

// --- Card Definition UI ---
function resetCardInputFields() {
  if (!cardInputsDivs || cardInputsDivs.length === 0) return;

  cardInputsDivs.forEach((d, i) => {
    const hp = d.querySelector(`#card${i + 1}-hp`);
    const spd = d.querySelector(`#card${i + 1}-stamina`);
    const atk = d.querySelector(`#card${i + 1}-attack`);
    const sum = d.querySelector(`#card${i + 1}-sum`);

    // Default waarden
    if (hp) hp.value = i === 0 ? 3 : i === 1 ? 2 : 2;
    if (spd) spd.value = i === 0 ? 2 : i === 1 ? 3 : 2;
    if (atk) atk.value = i === 0 ? 2 : i === 1 ? 2 : 3;

    // Herbereken som
    if (sum && hp && spd && atk) {
      const currentSum =
        (parseInt(hp.value, 10) || 0) +
        (parseInt(spd.value, 10) || 0) +
        (parseInt(atk.value, 10) || 0);
      sum.textContent = `Sum: ${currentSum}`;
      sum.style.color = currentSum === 7 ? "#555" : "red";
    }
  });
}

const cardInputListeners = [];
const presetButtonListeners = [];

function setupCardInputListeners() {
  // Verwijder bestaande input listeners
  cardInputListeners.forEach(({ element, handler }) =>
    element.removeEventListener("input", handler)
  );
  cardInputListeners.length = 0;

  // Voeg input listeners toe
  if (cardInputsDivs && cardInputsDivs.length > 0) {
    // Check of cardInputsDivs bestaat
    cardInputsDivs.forEach((d, i) => {
      const hp = d.querySelector(`#card${i + 1}-hp`);
      const spd = d.querySelector(`#card${i + 1}-stamina`);
      const atk = d.querySelector(`#card${i + 1}-attack`);
      [hp, spd, atk].forEach((input) => {
        if (input) {
          const handler = (e) => adjustCardValuesHandler(e);
          input.addEventListener("input", handler);
          cardInputListeners.push({ element: input, handler });
        }
      });
    });
  } else {
    console.warn("setupCardInputListeners: cardInputsDivs not found or empty.");
  }
  
  // --- Setup Arrow Button Listeners for mobile ---
  const arrowButtons = document.querySelectorAll('.arrow-btn');
  arrowButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const inputId = btn.dataset.input;
      const input = document.getElementById(inputId);
      if (!input) return;
      
      let currentVal = parseInt(input.value, 10) || 1;
      if (btn.classList.contains('up')) {
        currentVal = Math.min(5, currentVal + 1);
      } else if (btn.classList.contains('down')) {
        currentVal = Math.max(1, currentVal - 1);
      }
      
      input.value = currentVal;
      // Trigger the input event to update the sum
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Reset the timer when using arrow buttons
      if (typeof startPhaseTimer === "function") {
        startPhaseTimer(40);
        console.log("Timer reset due to arrow button click");
      }
    });
  });

  // --- Setup Preset Button Listeners ---
  presetButtonListeners.forEach(({ element, handler }) =>
    element.removeEventListener("click", handler)
  );
  presetButtonListeners.length = 0;
  [presetSpeedyBtn, presetAttackersBtn, presetDefendersBtn].forEach(
    (button) => {
      if (button) {
        const handler = () => applyCardPreset(button.id);
        button.replaceWith(button.cloneNode(true)); // Verwijder oude listeners
        const newButton = document.getElementById(button.id);
        if (newButton) {
          newButton.addEventListener("click", handler);
          presetButtonListeners.push({ element: newButton, handler });
        } else
          console.error(
            `Could not re-attach listener to button ID: ${button.id}`
          );
      } else {
        // Log welke knop ontbreekt indien nodig
        // if (button === presetSpeedyBtn) console.warn("Preset speedy button not found"); etc.
      }
    }
  );
}

function applyCardPreset(presetId) {
  const presetStats = CARD_PRESETS[presetId];
  if (!presetStats || !cardInputsDivs) return;

  console.log(`Applying preset: ${presetId}`);

  cardInputsDivs.forEach((d, i) => {
    const hpInput = d.querySelector(`#card${i + 1}-hp`);
    const staminaInput = d.querySelector(`#card${i + 1}-stamina`);
    const attackInput = d.querySelector(`#card${i + 1}-attack`);
    const sumSpan = d.querySelector(`#card${i + 1}-sum`);
    if (hpInput && staminaInput && attackInput && sumSpan) {
      hpInput.value = presetStats.hp;
      // Use stamina from preset but apply to the speed input
      // (since the UI still calls it speed but the game logic treats it as stamina)
      staminaInput.value = presetStats.stamina;
      attackInput.value = presetStats.attack;
      sumSpan.textContent = "Total: 7";
      sumSpan.style.color = "#555";
      sumSpan.title = "";
    }
  });

  // Reset the timer when a preset is applied
  if (typeof startPhaseTimer === "function") {
    startPhaseTimer(40);
    console.log("Timer reset due to preset application");
  }
}

function adjustCardValuesHandler(event) {
  const input = event.target;
  const div = input.closest(".card-inputs");
  if (!div) return;
  const hp = div.querySelector('input[id$="-hp"]');
  const spd = div.querySelector('input[id$="-stamina"]');
  const atk = div.querySelector('input[id$="-attack"]');
  const sum = div.querySelector('span[id$="-sum"]');
  if (hp && spd && atk && sum) adjustCardValues(input, hp, spd, atk, sum);

  // Reset the timer when card value changes
  if (typeof startPhaseTimer === "function") {
    startPhaseTimer(40);
    console.log("Timer reset due to card value change");
  }
}

function adjustCardValues(
  changedInput,
  hpInput,
  staminaInput,
  attackInput,
  sumSpan
) {
  // Simply validate min/max bounds and update sum display
  // No longer auto-adjust to keep sum at 7
  
  // Validate the changed value (min 1, max 5)
  let valChanged = parseInt(changedInput.value, 10);
  if (isNaN(valChanged)) valChanged = 1;
  valChanged = Math.max(1, Math.min(5, valChanged));
  changedInput.value = valChanged;

  // Get current values (with min 1 and max 5)
  let vH = Math.max(1, Math.min(5, parseInt(hpInput.value, 10) || 1));
  let vS = Math.max(1, Math.min(5, parseInt(staminaInput.value, 10) || 1));
  let vA = Math.max(1, Math.min(5, parseInt(attackInput.value, 10) || 1));
  hpInput.value = vH;
  staminaInput.value = vS;
  attackInput.value = vA;

  // Calculate and display sum
  const finalSum = vH + vS + vA;
  sumSpan.textContent = `Total: ${finalSum}`;
  
  // Show red color if sum is not exactly 7
  if (finalSum !== 7) {
    sumSpan.style.color = "red";
    sumSpan.title = finalSum > 7 ? "Total exceeds 7 points" : "Total is less than 7 points";
  } else {
    sumSpan.style.color = "#555";
    sumSpan.title = "";
  }
}

// --- Update revealed cards display ---
function updateRevealedCardsUI(
  yourCards,
  opponentCards,
  initiativePlayer,
  p1Attack,
  p2Attack,
  p1Stamina,
  p2Stamina
) {
  if (
    !yourRevealedCardsDiv ||
    !opponentRevealedCardsDiv ||
    !initiativePlayerSpan ||
    !initiativeReasonSpan
  ) {
    console.warn("Missing UI elements for card reveal.");
    return;
  }

  // Updated createCardElement for Revealed Cards
  const createCardElement = (card, index, playerNum) => {
    const cardDiv = document.createElement("div");
    // Use the new base class and add player-specific class
    cardDiv.className = `card-item player-${playerNum}`;
    // Use the new HTML structure with emojis
    cardDiv.innerHTML = `
            <strong class="card-title">Unit ${index + 1}</strong>
            <div class="card-stats">
                <span><span class="emoji-icon">🛡️</span> <span class="value">${card.hp}</span></span>
                <span><span class="emoji-icon">🔋</span> <span class="value">${card.stamina || card.stamina}</span></span>
                <span><span class="emoji-icon">⚔️</span> <span class="value">${card.attack}</span></span>
            </div>
        `;
    return cardDiv;
  };

  yourRevealedCardsDiv.innerHTML = ""; // Clear previous cards
  opponentRevealedCardsDiv.innerHTML = ""; // Clear previous cards

  // Determine player numbers for adding classes
  const yourPlayerNum = gameState.playerNumber;
  const opponentPlayerNum = yourPlayerNum === PLAYER_1 ? PLAYER_2 : PLAYER_1;

  if (Array.isArray(yourCards)) {
    yourCards.forEach((card, i) => {
      if (card) yourRevealedCardsDiv.appendChild(createCardElement(card, i, yourPlayerNum));
    });
  }
  if (Array.isArray(opponentCards)) {
    opponentCards.forEach((card, i) => {
      if (card) opponentRevealedCardsDiv.appendChild(createCardElement(card, i, opponentPlayerNum));
    });
  }

  initiativePlayerSpan.textContent = initiativePlayer;
  let yourTotal, opponentTotal;
  if (typeof gameState !== "undefined" && gameState.playerNumber === PLAYER_1) {
    yourTotal = { attack: p1Attack, stamina: p1Stamina };
    opponentTotal = { attack: p2Attack, stamina: p2Stamina };
  } else {
    yourTotal = { attack: p2Attack, stamina: p2Stamina };
    opponentTotal = { attack: p1Attack, stamina: p1Stamina };
  }
  if (yourTotal.attack !== opponentTotal.attack) {
    initiativeReasonSpan.textContent = `(Atk: ${yourTotal.attack} vs ${opponentTotal.attack})`;
  } else {
    initiativeReasonSpan.textContent = `(Atk Tie, Stamina: ${yourTotal.stamina} vs ${opponentTotal.stamina})`;
  }
}

// --- Update linking UI (Refactored to update existing elements for transitions) ---
function updateLinkingUI() {
  if (
    !availableCardsLinkingDiv ||
    !linkingStatusDiv ||
    !linkRoundNumSpan ||
    !linkPlayerNumSpan
  ) {
    console.warn("Missing UI elements for linking UI.");
    return;
  }

  linkRoundNumSpan.textContent = gameState.roundNumber;
  linkPlayerNumSpan.textContent = gameState.currentPlayer;

  const isYourTurn = gameState.currentPlayer === gameState.playerNumber;
  const yourPlayerNum = gameState.playerNumber;
  const yourPawns = gameState.players?.[yourPlayerNum]?.pawns || [];
  const yourCards =
    gameState.players?.[yourPlayerNum]?.cardsAvailableForLinking || [];

  // --- Check if the current player has any valid moves ---
  const hasUnlinkedCards = yourCards.some((card) => card && !card.isLinked);
  const hasUnlinkedPawns = yourPawns.some((pawn) => pawn && !pawn.isActive);
  const canLink = isYourTurn && hasUnlinkedCards && hasUnlinkedPawns;

  // --- Find or Create Containers ---
  let p1CardList = availableCardsLinkingDiv.querySelector(
    '.player-cards-container[data-player="1"] .card-list-container'
  );
  let p2CardList = availableCardsLinkingDiv.querySelector(
    '.player-cards-container[data-player="2"] .card-list-container'
  );

  // If containers don't exist, create the initial structure
  if (!p1CardList || !p2CardList) {
    console.log("Creating initial linking UI structure.");
    availableCardsLinkingDiv.innerHTML = "<h4>All Cards:</h4>"; // Reset only if structure missing

    const cardsContainer = document.createElement("div");
    cardsContainer.className = "all-cards-container";
    cardsContainer.style.display = "flex";
    cardsContainer.style.flexDirection = "column";
    cardsContainer.style.gap = "15px";
    availableCardsLinkingDiv.appendChild(cardsContainer);

    // Container voor P2 kaarten (bovenaan)
    const p2CardsContainer = document.createElement("div");
    p2CardsContainer.className = "player-cards-container";
    p2CardsContainer.dataset.player = PLAYER_2; // Add data attribute
    p2CardsContainer.innerHTML =
      '<h5 style="color: #0d1697; margin: 0 0 5px 0;">Player 2 Cards:</h5>';
    p2CardList = document.createElement("div");
    p2CardList.className = "card-list-container";
    p2CardsContainer.appendChild(p2CardList);
    cardsContainer.appendChild(p2CardsContainer);

    // Container voor P1 kaarten (onderaan)
    const p1CardsContainer = document.createElement("div");
    p1CardsContainer.className = "player-cards-container";
    p1CardsContainer.dataset.player = PLAYER_1; // Add data attribute
    p1CardsContainer.innerHTML =
      '<h5 style="color: #a91414; margin: 10px 0 5px 0;">Player 1 Cards:</h5>';
    p1CardList = document.createElement("div");
    p1CardList.className = "card-list-container";
    p1CardsContainer.appendChild(p1CardList);
    cardsContainer.appendChild(p1CardsContainer);
  }

  // --- Defer DOM updates slightly to allow rendering after display change ---
  requestAnimationFrame(() => {
    // --- Map Existing DOM Elements ---
    const currentElementsMap = {};
    availableCardsLinkingDiv
      .querySelectorAll(".card-item[data-card-id]")
      .forEach((el) => {
        currentElementsMap[el.dataset.cardId] = el;
      });

    // --- Process Cards from Game State ---
    const p1Cards =
      gameState.players?.[PLAYER_1]?.cardsAvailableForLinking || [];
    const p2Cards =
      gameState.players?.[PLAYER_2]?.cardsAvailableForLinking || [];
    // const allCards = [...p1Cards, ...p2Cards]; // Not strictly needed with current logic

    // Updated createLinkCardElement for Linking Phase
    const createLinkCardElement = (card, index, playerNum) => {
      const cardDiv = document.createElement("div");
      // Use new base class and player class
      cardDiv.className = `card-item player-${playerNum}`;
      cardDiv.dataset.cardId = card.id; // Keep data-id

      // Generate the combination icon HTML
      let combinationIconHTML = '';
      const statKey = `h${card.hp}_s${card.stamina}_a${card.attack}`;
      const iconAlias = STAT_COMBINATION_TO_ICON_ALIAS[statKey];
      if (iconAlias) {
        const iconPath = getCombinationIconPath(iconAlias);
        if (iconPath) {
          combinationIconHTML = `<img src="${iconPath}" class="combination-icon" alt="Combination Icon" />`;
        }
      }

      // Generate the new static HTML structure with combination icon
      cardDiv.innerHTML = `
            ${combinationIconHTML}
            <strong class="card-title">Unit ${index + 1}</strong>
            <div class="card-stats">
                <span><span class="emoji-icon">🛡️</span> <span class="value">${card.hp}</span></span>
                <span><span class="emoji-icon">🐎</span> <span class="value">${card.stamina}</span></span>
                <span><span class="emoji-icon">⚔️</span> <span class="value">${card.attack}</span></span>
            </div>
            ${card.isLinked ? '<div class="linked-overlay">ASSIGNED</div>' : ''}
        `; // Conditionally add overlay

      // Add click handler ONLY if it's your turn, the card isn't linked, AND you have pawns/cards to link
      if (
        !card.isLinked &&
        isYourTurn &&
        playerNum === yourPlayerNum &&
        canLink // Only allow clicking if linking is possible
      ) {
        cardDiv.onclick = () => handleCardLinkSelection(card, cardDiv);
        cardDiv.style.cursor = "pointer";
      } else {
        cardDiv.onclick = null; // Remove handler otherwise
        cardDiv.style.cursor = card.isLinked ? "not-allowed" : "default";
      }

      // Use window.selectedCardToLink to access the global variable
      cardDiv.classList.toggle("card-selected", window.selectedCardToLink === card);

      return cardDiv;
    };

    // Update or Add elements for each player
    const processPlayerCards = (cards, playerNum, listContainer) => {
      cards.forEach((card, i) => {
        if (!card) return; // Skip if card data is missing

        let cardElement = currentElementsMap[card.id];

        if (cardElement) {
          // --- UPDATE EXISTING ELEMENT ---
          const currentlyLinked = cardElement.classList.contains("linked");

          // Check if card exceeds 7 points
          const totalPoints = (card.hp || 0) + (card.stamina || 0) + (card.attack || 0);
          const isBlocked = totalPoints > 7;
          
          // Update linked/blocked status class and overlay
          const overlay = cardElement.querySelector('.linked-overlay, .blocked-overlay');
          if (card.isLinked) {
            cardElement.classList.add("linked");
            cardElement.classList.remove("blocked");
            if (!overlay || !overlay.classList.contains('linked-overlay')) {
              if (overlay) overlay.remove();
              const newOverlay = document.createElement('div');
              newOverlay.className = 'linked-overlay';
              newOverlay.textContent = 'ASSIGNED';
              cardElement.appendChild(newOverlay);
            }
            cardElement.onclick = null;
            cardElement.style.cursor = "not-allowed";
          } else if (isBlocked) {
            cardElement.classList.add("blocked");
            cardElement.classList.remove("linked");
            if (!overlay || !overlay.classList.contains('blocked-overlay')) {
              if (overlay) overlay.remove();
              const newOverlay = document.createElement('div');
              newOverlay.className = 'blocked-overlay';
              newOverlay.textContent = 'INVALID';
              newOverlay.title = 'Total points exceed 7';
              cardElement.appendChild(newOverlay);
            }
            cardElement.onclick = null;
            cardElement.style.cursor = "not-allowed";
          } else {
            cardElement.classList.remove("linked");
            cardElement.classList.remove("blocked");
            if (overlay) {
              overlay.remove();
            }
            // Click handler re-added below if applicable
          }

          // Update selected status class
          cardElement.classList.toggle("card-selected", window.selectedCardToLink === card);

          // Update click handler and cursor - only for unlinked, unblocked cards that belong to the current player IF they can link
          if (
            !card.isLinked &&
            !isBlocked &&
            isYourTurn &&
            playerNum === yourPlayerNum &&
            canLink // Check if linking is possible
          ) {
            // Ensure click handler is attached if it should be clickable
            cardElement.onclick = () =>
              handleCardLinkSelection(card, cardElement);
            cardElement.style.cursor = "pointer";
          } else {
            // Remove handler and set cursor for non-clickable cards (linked, blocked, not your turn, or no pawns/cards available)
            cardElement.onclick = null;
            cardElement.style.cursor = (card.isLinked || isBlocked) ? "not-allowed" : "default";
          }

          // Move to correct container (appendChild moves the element)
          listContainer.appendChild(cardElement);

          // Remove from map so we know it's handled
          delete currentElementsMap[card.id];
        } else {
          // --- ADD NEW ELEMENT --- (Should be rare in linking phase)
          console.log(`Creating new card element for ID: ${card.id}`);
          const newElement = createLinkCardElement(card, i, playerNum);
          listContainer.appendChild(newElement);
        }
      });
    };

    // Ensure lists are clear before potentially adding/moving elements back
    // (This might cause a flicker, alternative is more complex DOM diffing)
    // Let's try without clearing first, relying on appendChild to move existing.
    // p1CardList.innerHTML = '';
    // p2CardList.innerHTML = '';

    processPlayerCards(p1Cards, PLAYER_1, p1CardList);
    processPlayerCards(p2Cards, PLAYER_2, p2CardList);

    // --- Remove Old Elements ---
    Object.values(currentElementsMap).forEach((oldElement) => {
      console.log(`Removing old card element ID: ${oldElement.dataset.cardId}`);
      oldElement.remove();
    });

    // --- Update Status Text ---
    if (isYourTurn) {
      if (!canLink) {
        linkingStatusDiv.textContent =
          "No valid pawns or cards left to link. Waiting...";
        // Optionally, emit an event here if the server should auto-pass the turn
        // if (typeof socket !== 'undefined' && typeof gameSession !== 'undefined') {
        //     socket.emit('passLinkingTurn', { roomCode: gameSession.roomCode });
        // }
      } else if (window.selectedCardToLink) {
        linkingStatusDiv.textContent = `Selected (H:${window.selectedCardToLink.hp} S:${window.selectedCardToLink.stamina} A:${window.selectedCardToLink.attack}). Click an unlinked pawn.`;
      } else {
        linkingStatusDiv.textContent = `Your turn. Select one of your cards to link.`;
      }
    } else {
      linkingStatusDiv.textContent = `Waiting for Player ${gameState.currentPlayer}...`;
    }

    // updateGameStatusUI(); // Already called by showUIPanel, avoid duplicate call if possible
  }); // End of requestAnimationFrame

  // Update general status and borders (might be called before rAF, which is fine)
  updateGameStatusUI();
}

// --- Update action UI ---
function updateActionUI(pawn) {
  // Removed check for actionButtonsDiv
  if (!actionPlayerNumSpan || !selectedPawnInfoDiv) return;

  actionPlayerNumSpan.textContent = gameState.currentPlayer;
  // --- DEBUG LOG ---
  console.log(`updateActionUI Check: CurrentPlayer=${gameState.currentPlayer}, PlayerNumber=${gameState.playerNumber}, ComparisonResult=${gameState.currentPlayer === gameState.playerNumber}`);
  // --- END DEBUG LOG ---
  const isYourTurn = gameState.currentPlayer === gameState.playerNumber;

  if (
    pawn &&
    isYourTurn &&
    gameState.currentPhase === "AWAITING_ACTION_TARGET"
  ) {
    selectedPawnInfoDiv.innerHTML = `
            Selected: <strong>${pawn.id}</strong><br>
            <div class="pawn-stats">
                <span><span class="emoji-icon">🛡️</span> ${pawn.currentHP ?? "?"}</span>
                <span><span class="emoji-icon">🐎</span> ${pawn.remainingStamina ?? "?"}</span>
                <span><span class="emoji-icon">⚔️</span> ${pawn.linkedCard?.attack ?? "?"}</span>
            </div>
        `;
    // Removed manipulation of actionButtonsDiv.style.display
  } else { // No pawn selected or not awaiting target
    // Removed manipulation of actionButtonsDiv.style.display
    if (!isYourTurn) {
      selectedPawnInfoDiv.textContent = "Waiting for opponent's move...";
    } else {
      // It IS your turn, no pawn selected
      if (gameState.currentPhase === "ACTION") {
        selectedPawnInfoDiv.textContent = "Select a regiment to command.";
      } else {
        // Your turn, but not ACTION phase (e.g., WAITING_FOR_TURN after acting)
        selectedPawnInfoDiv.textContent = "Waiting..."; // Or another appropriate status
      }
    }
  }
}

// --- Chat Functions ---
function addChatMessage(message) {
  if (!chatMessages) return;
  const msgDiv = document.createElement("div");
  msgDiv.className = "chat-message";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sanitizedText = document.createElement("span");
  sanitizedText.textContent = message.text;

  // --- Get Player Name from gameSession ---
  let playerName = `Player ${message.playerNum}`; // Default fallback
  if (typeof gameSession !== 'undefined' && gameSession.playerNumber !== null) {
    // Check if the message sender is the current client
    if (message.playerNum === gameSession.playerNumber) {
      playerName = gameSession.playerName || `Player ${message.playerNum}`; // Use current player's name
    } else {
      playerName = gameSession.opponentName || `Player ${message.playerNum}`; // Use opponent's name
    }
  } else {
    console.warn("gameSession or playerNumber not available for chat name lookup.");
  }
  // --- End Get Player Name ---

  // Add player-specific class (p1 or p2) to the player-name span and use the retrieved name
  msgDiv.innerHTML = `<span class="player-name p${message.playerNum}">General ${playerName}:</span> <span class="message-text">${sanitizedText.innerHTML}</span> <span class="message-time">${time}</span>`;
  chatMessages.appendChild(msgDiv);
  if (
    chatMessages.scrollHeight - chatMessages.scrollTop <=
    chatMessages.clientHeight + 50
  ) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function setupChat() {
  if (
    !chatInput ||
    !sendChatBtn ||
    !chatMessages ||
    typeof socket === "undefined" ||
    typeof gameSession === "undefined"
  ) {
    console.warn("Chat UI/socket/session missing.");
    return;
  }

  // Listener setup met cloneNode om duplicates te voorkomen
  const currentSendBtn = document.getElementById("send-chat-btn");
  const currentChatInput = document.getElementById("chat-input");
  if (!currentSendBtn || !currentChatInput) {
    console.error(
      "Cannot find chat input/button after potential DOM manipulation."
    );
    return;
  }

  const newSendBtn = currentSendBtn.cloneNode(true);
  currentSendBtn.parentNode.replaceChild(newSendBtn, currentSendBtn);
  const newChatInput = currentChatInput.cloneNode(true);
  currentChatInput.parentNode.replaceChild(newChatInput, currentChatInput);
  // Update globale referenties indien nodig (hoewel ze hier niet direct gebruikt worden)
  // chatInput = newChatInput; sendChatBtn = newSendBtn;

  newSendBtn.addEventListener("click", () => {
    const message = newChatInput.value.trim();
    if (message && socket && gameSession.roomCode && gameSession.playerNumber) {
      socket.emit("sendMessage", {
        roomCode: gameSession.roomCode,
        message: message,
        playerNum: gameSession.playerNumber,
      });
      newChatInput.value = "";
    } else if (!message) {
    } else {
      console.error("Chat send error.");
    }
  });
  newChatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") newSendBtn.click();
  });

  // Setup message listener
  if (socket && !socket.hasListeners("newMessage")) {
    socket.on("newMessage", (message) => {
      if (!message?.playerNum || !message?.text) {
        console.warn("Invalid message:", message);
        return;
      }
      // message.playerName is no longer needed here as addChatMessage retrieves it directly

      // Play notification sound when receiving a message
      if (typeof soundManager !== "undefined") {
        soundManager.playSound("ui_chat");
      }

      addChatMessage(message);
    });
  }
}

// In game-ui.js

// Update de RPS display (VEREENVOUDIGD)
function updateRpsDisplay(instruction = "Choose your move!") {
  if (!rpsTiebreakerUI) return;
  // Verwijderd: Ronde en score updates
  if (rpsInstructionP) rpsInstructionP.textContent = instruction;
  if (rpsResultDiv) rpsResultDiv.innerHTML = ""; // Wis vorige resultaten
  // console.log(`UI Updated: RPS Instruction: ${instruction}`); // Minder console spam
}

// Activeer of deactiveer de RPS keuze knoppen
function enableRpsButtons(enable) {
  if (!rpsChoiceBtns) return;
  rpsChoiceBtns.forEach((btn) => (btn.disabled = !enable));
  // console.log(`RPS buttons ${enable ? 'enabled' : 'disabled'}`); // Minder console spam
}

// Toon het resultaat van een RPS ronde (VEREENVOUDIGD)
function showRpsResult(choices, roundWinner) {
  // Geen scores meer nodig
  if (!rpsResultDiv) return;

  const choiceMap = { rock: "🪨", paper: "📄", scissors: "✂️" };
  const p1ChoiceStr = choiceMap[choices[PLAYER_1]] || "?";
  const p2ChoiceStr = choiceMap[choices[PLAYER_2]] || "?";

  let outcomeText = "";
  // Bepaal wie P1/P2 is relatief aan deze client
  const isPlayer1 = gameState.playerNumber === PLAYER_1;
  let outcomeClass = "rps-outcome-draw"; // Default to draw class
  let initiativeText = ""; // Text to show who gets initiative

  // Bepaal tekst en class gebaseerd op de WINNAAR
  if (roundWinner === null) {
    // Het is een gelijkspel
    outcomeText = "It's a Tie!";
    // outcomeClass blijft 'rps-outcome-draw'
    if (typeof soundManager !== 'undefined') soundManager.playSound('rps_tie');
  } else if (roundWinner === gameState.playerNumber) {
    // JIJ hebt gewonnen
    outcomeText = "You Win!";
    outcomeClass = "rps-outcome-win";
    initiativeText = `(You get initiative)`;
    if (typeof soundManager !== 'undefined') soundManager.playSound('rps_win');
  } else {
    // Tegenstander heeft gewonnen
    outcomeText = "Opponent Wins.";
    outcomeClass = "rps-outcome-lose";
    initiativeText = `(Opponent gets initiative)`;
    if (typeof soundManager !== 'undefined') soundManager.playSound('rps_lose');
  }

  // Toon resultaat
  rpsResultDiv.innerHTML = `
        P1: <span class="rps-choice-p1">${p1ChoiceStr}</span>
        vs
        P2: <span class="rps-choice-p2">${p2ChoiceStr}</span>
        <br>
        <span class="rps-outcome ${outcomeClass}">
            ${outcomeText} ${initiativeText}
        </span>
    `;
  console.log(`UI Show Result: ${outcomeText}`);
}
// Using getCombinationIconPath from game-constants.js

// --- Pawn Count Display ---
function updatePawnCountDisplay() {
  const p1CountElement = document.getElementById('p1-pawn-count');
  const p2CountElement = document.getElementById('p2-pawn-count');

  if (!p1CountElement || !p2CountElement || typeof gameState === "undefined") {
    return;
  }

  const p1Pawns = gameState.players?.[PLAYER_1]?.pawns?.filter(p => p && p.pixiObject) || [];
  const p2Pawns = gameState.players?.[PLAYER_2]?.pawns?.filter(p => p && p.pixiObject) || [];

  p1CountElement.textContent = p1Pawns.length;
  p2CountElement.textContent = p2Pawns.length;
}

// --- END OF FILE public/js/game-ui.js ---
