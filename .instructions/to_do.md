# Fog of War - PixiJS Implementatie TODO

## 1. Basis Setup & Initialisatie

- [x] **HTML Structuur:** Basis `index.html` aanwezig.
- [x] **PixiJS Setup:** Geïntegreerd en geïnitialiseerd.
- [x] **Canvas:** Zichtbaar.
- [x] **Basis Constanten:** Gedefinieerd (`game-constants.js`).
- [x] **Game State Manager:** Basis `gameState` object aanwezig (`game-constants.js`).

## 2. Bord & Visuele Elementen

- [x] **Grid Tekenen:** Functie aanwezig (`drawBoard` in `game-logic.js`).
- [x] **Haven Locaties:** Gedefinieerd (`HAVEN_X_COORDS` in `game-constants.js`).
- [x] **Haven Visualisatie:** Getekend (`drawBoard` in `game-logic.js`).
- [x] **Coördinaten Systeem:** Functies aanwezig (`gridToPixel`, `pixelToGrid` in `game-logic.js`).

## 3. Pion Management

- [x] **Pion Data Structuur:** `Pawn` klasse aanwezig (`game-classes.js`).
- [x] **Pion Visuals:** Cirkels met kleuren, HP/Speed/Attack tekst (`Pawn.createVisual`).
- [x] **Initialiseer Pionnen:** Functie aanwezig (`initializePawns` in `game-logic.js`).
- [x] **Pion Opslag:** Bijgehouden in `gameState.players[X].pawns`.
- [x] **Pion Verwijderen:** Functies aanwezig (`Pawn.destroyVisual`, `removePawnFromState` in `game-logic.js`, `removePawnServer` in `server.js`).
- [x] **Pion Verplaatsen (Visueel):** Functie met animatie aanwezig (`Pawn.animateMoveTo`).

## 4. Kaart Management

- [x] **Kaart Data Structuur:** `Card` klasse aanwezig (`game-classes.js`), en kaart-achtige objecten in game state/server state.
- [x] **Kaart Opslag:** `cardsDefinedThisRound`, `cardsAvailableForLinking` bijgehouden in `gameState` en server state.
- [x] **Kaart Definitie Logica:** Functies aanwezig (`handleConfirmCards` in `game-logic.js`, server validatie). Validatie voor min 1 stat is aanwezig.
- [x] **Kaart Creatie:** Gebeurt tijdens definitie en wordt doorgegeven.

## 5. Spel Logica & Toestand

- [x] **Spel Fasen:** Bijgehouden in `gameState.currentPhase`.
- [x] **Huidige Speler:** Bijgehouden in `gameState.currentPlayer`.
- [x] **Initiatief:** Bijgehouden in `gameState.initiativePlayer` (voor linking) en `gameState.cycleInitiativePlayer` (voor actie fase).
  - [ ] **Initiatief Tiebreaker C1R1:** Verifieer of de server expliciet P1 de tiebreaker geeft bij gelijkspel A/S in de allereerste ronde. (Waarschijnlijk wel via de default `initiativePlayer = 1` voor de berekening, maar dubbelchecken.)
- [x] **Pion Status Reset:** Gebeurt in `startCycle` (`game-logic.js`) en server's `newCycle`.
- [x] **Kaart Ontkoppelen:** Gebeurt logisch in `startCycle` en server's `newCycle` door `linkedCard = null`.

## 6. Game Flow Implementatie

- [x] **`startGame()` Functie:** Gebeurt via `initGame` in `main.js` na lobby.
- [x] **`startCycle()` Functie:** Aanwezig (`game-logic.js`). Server stuurt `newCycle`.
- [x] **`handleSetupRound()` Functie:** Georkestreerd door server via fasewisselingen en events (`yourTurnToDefine`, `cardsRevealed`, `startLinking`).
  - [x] **`handleDefinePhase()`:** Functie `handleCardDefinition` aanwezig (`game-logic.js`).
  - [x] **`handleRevealPhase()`:** Server berekent initiatief en stuurt `cardsRevealed`. Client update UI.
  - [x] **`handleLinkingPhase()`:** Logica aanwezig via `handleLinkingPawnClick`, `handleCardLinkSelection` (`game-logic.js`) en server events (`cardLinked`, `nextLinkTurn`). Eindigt correct via server logic.
- [x] **`startActionPhase()` Functie:** Server stuurt `startActionPhase`. Client roept `handlePlayerTurn` aan.
- [x] **`handlePlayerTurn()` Functie:** Aanwezig (`game-logic.js`).
- [x] **`handleActionChoice()` Functie:** Gebeurt via `onPawnClick` die leidt tot `onMoveTargetClick` of `onAttackTargetClick`.
- [x] **`handleMoveAction()` Functie:** Logica aanwezig in `onMoveTargetClick` en `handleMoveAction` (`game-logic.js`).
- [x] **`handleAttackAction()` Functie:** Logica aanwezig in `onAttackTargetClick` en `handleAttackAction` (`game-logic.js`). Adjacency check is impliciet via `getValidAttackTargets`. Schade/Eliminatie/Verplichte Move logica is aanwezig (server-side is leidend).
- [x] **`endTurn()` Functie:** Client versie (`endTurn`) checkt lokaal, maar server `gameAction` logic is leidend voor beurtwissel (inclusief skip logic).
- [x] **`startResetPhase()` Functie:** Gebeurt via server `newCycle` event trigger -> client `startCycle`.

## 7. Interactie & UI

- [x] **Pion Selectie:** Geïmplementeerd in `onPawnClick`. Visuele feedback via `setHighlight`.
- [x] **Actie Input:** Geïmplementeerd via klikken op pion (selectie) -> klikken op doel (move) of vijand (attack). Knoppen zijn alternatief maar huidige flow werkt.
- [x] **Doel Selectie (Bewegen/Aanval):** Geïmplementeerd via click handlers op highlights of vijandelijke pionnen.
- [x] **Validatie Feedback:** Via `showToast` en console logs. Kan verbeterd worden.
- [x] **Status Weergave:** `updateGameStatusUI`, `updateActionUI`.
- [x] **Kaart Definitie UI:** Input velden + presets aanwezig.
- [x] **Initiatief Weergave:** Aanwezig in `card-reveal-ui`.

## 8. Winnen & Verliezen

- [x] **Win Conditie Check:** `checkWinCondition` functie aanwezig (`game-logic.js`). Server stuurt `gameOver`.
- [x] **Win/Verlies Scherm:** Basale weergave via `showToast` en UI aanpassingen in `updateGameStatusUI`.

## 9. Refinements & Extra's

- [ ] **Animaties:** Basis animatie voor bewegen aanwezig. Aanval animatie kan verbeterd worden (bv. korte 'stoot' animatie).
- [ ] **Visuele Feedback:** Kan verder verbeterd worden (duidelijkere highlights, misschien pad tonen bij bewegen).
- [ ] **"Fog of War" Element (Optioneel):** Momenteel geen implementatie.
- [ ] **Sound Effects (Optioneel):** Niet aanwezig.
- [x] **Code Structuur:** Redelijk georganiseerd in bestanden. Kan altijd beter.
- [ ] **Testen:** Doorlopend proces. Meer formele tests zouden goed zijn. Randgevallen lijken redelijk gedekt door recente fixes.
