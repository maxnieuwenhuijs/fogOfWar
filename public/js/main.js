// --- START OF FILE public/js/main.js ---

// Main.js - Entry point for the Fog of War game

// This file orchestrates the initialization of the game
// and handles transitions between lobby and game phases

// Globale referentie naar Pixi app (nodig voor camera shake)
let app;
let highlightContainer; // Ook globaal maken of doorgeven indien nodig

// Global object to store loaded icon textures (keyed by alias like "icon_1_1_5")
// IMPORTANT: Reuse a single global so assets loaded by other modules (e.g., loading-screen)
// are not lost when this file evaluates. Never overwrite if it already exists.
window.ICON_TEXTURES = window.ICON_TEXTURES || {};
const ICON_TEXTURES = window.ICON_TEXTURES;

document.addEventListener('DOMContentLoaded', async function () {
    console.log('Main.js loaded - DOM fully parsed.');

    // Show loading screen and load assets
    await loadingScreen.loadAssets();

    // Hide all screens initially
    document.getElementById('lobby-screen').classList.remove('active');
    document.getElementById('waiting-screen').classList.remove('active');
    document.getElementById('game-lobby-screen').classList.remove('active');
    document.getElementById('game-screen').classList.remove('active');

    // Hide loading screen and show main menu
    loadingScreen.hide();
    menuSystem.showMainMenu();

    // Handle window resizing for responsive canvas (optional)
    window.addEventListener('resize', function () {
        if (typeof app !== 'undefined' && app && app.renderer) {
            // Add resizing logic if needed, bijv. app.renderer.resize(...)
        }
    });

    // Setup keyboard shortcuts/controls (optional)
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            // Check if we are in a state where cancel is appropriate
            if (typeof gameState !== 'undefined' && gameState.currentPhase === 'AWAITING_ACTION_TARGET') {
                if (typeof cancelActionSelection === 'function') {
                    console.log("Escape key pressed - cancelling action selection.");
                    cancelActionSelection();
                } else {
                    console.warn("Cancel function not available for Escape key.");
                }
            }
        }
    });

    // --- Setup Volume Slider Listener --- Moved here from initGame
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValueSpan = document.getElementById('volume-value');
    if (volumeSlider && volumeValueSpan && typeof soundManager !== 'undefined' && typeof soundManager.setVolume === 'function') {
        // Set initial display based on soundManager's default volume (if soundManager is ready)
        if (soundManager.globalVolume !== undefined) {
            volumeSlider.value = soundManager.globalVolume;
            volumeValueSpan.textContent = `${Math.round(soundManager.globalVolume * 100)}%`;
        } else {
            // Fallback if soundManager isn't ready yet (should be rare here)
            volumeSlider.value = 0.5;
            volumeValueSpan.textContent = `50%`;
        }

        // Add the input event listener directly to the original slider element
        volumeSlider.addEventListener('input', (event) => {
            const newVolume = parseFloat(event.target.value);
            // Ensure soundManager exists before calling setVolume
            if (typeof soundManager !== 'undefined' && typeof soundManager.setVolume === 'function') {
                soundManager.setVolume(newVolume);
            }
            // Use the volumeValueSpan variable captured from the outer scope
            if (volumeValueSpan) {
                volumeValueSpan.textContent = `${Math.round(newVolume * 100)}%`;
            } else {
                // This case should be rare if the initial check passed, but log just in case
                console.warn("🔊 volumeValueSpan became null/undefined inside listener!");
            }
        });
        console.log("🔊 Volume slider listener attached (DOMContentLoaded).");
    } else {
        console.warn("Volume slider elements or soundManager not found for listener setup (DOMContentLoaded).");
    }
    // --- End Volume Slider Setup ---
});

// Function to load necessary game assets (async)
async function loadGameAssets() {
    console.log("🚀 Starting asset loading...");
    try {
        const assetsToLoad = [];

        // Generate asset list for combination icons
        // Uses STAT_COMBINATION_TO_ICON_ALIAS and getCombinationIconPath from game-constants.js
        if (typeof STAT_COMBINATION_TO_ICON_ALIAS !== 'undefined') {
            for (const key in STAT_COMBINATION_TO_ICON_ALIAS) {
                const alias = STAT_COMBINATION_TO_ICON_ALIAS[key];
                if (typeof getCombinationIconPath === 'function') {
                    const path = getCombinationIconPath(alias);
                    if (path) {
                        assetsToLoad.push({ alias: alias, src: path });
                    }
                }
            }
        }

        // *** IMPORTANT: Add basic icons here if you use them for edge stats ***
        // Example: If edge icons use hp.png, speed.png, attack.png from assets/icons/
        // assetsToLoad.push({ alias: 'hp', src: 'assets/icons/hp.png' }); // No longer needed for edge stats
        // assetsToLoad.push({ alias: 'speed', src: 'assets/icons/speed.png' }); // No longer needed for edge stats
        // assetsToLoad.push({ alias: 'attack', src: 'assets/icons/attack.png' }); // No longer needed for edge stats

        // *** ADD PAWN PIECE IMAGES ***
        assetsToLoad.push({ alias: 'p1_piece', src: 'assets/images/p1_piece.png' });
        assetsToLoad.push({ alias: 'p2_piece', src: 'assets/images/p2_piece.png' });
        // *** END ADD PAWN PIECE IMAGES ***

        // Add any other assets needed (e.g., sound manifests)

        if (assetsToLoad.length === 0) {
            console.warn("No assets generated for loading.");
        } else {
            console.log(`Attempting to load ${assetsToLoad.length} assets...`);
        }

        // Load assets one-by-one to ensure alias mapping is correct across PIXI versions
        for (const asset of assetsToLoad) {
            try {
                const tex = await PIXI.Assets.load({ alias: asset.alias, src: asset.src });
                if (tex) {
                    ICON_TEXTURES[asset.alias] = tex;
                } else {
                    console.warn(`Texture load returned null for ${asset.alias} (${asset.src})`);
                }
            } catch (e) {
                console.warn(`Failed to load texture ${asset.alias} (${asset.src})`, e);
            }
        }

        console.log(`✅ ${Object.keys(ICON_TEXTURES).length} Textures loaded successfully into ICON_TEXTURES.`);
        return true; // Indicate success

    } catch (error) {
        console.error("❌ FATAL: Error loading game assets:", error);
        if (error.message.includes('404')) {
            console.error("-> Potential Cause: One or more icon files not found. Check filenames/paths in game-constants.js and ensure files exist in public/assets/");
        }
        showToast("Error loading essential game graphics. Please refresh.", 5000);
        return false; // Indicate failure
    }
}


// Function to transition from lobby to active game
// --- START VAN AANGEPASTE initGame FUNCTIE in public/js/main.js ---

// Function to transition from lobby to active game
async function initGame() {
    console.log("🚀 Starting game initialization...");

    // Load assets first
    const assetsLoaded = await loadGameAssets();
    if (!assetsLoaded) {
        console.error("❌ Game initialization aborted due to asset loading failure.");
        // showToast is already called in loadGameAssets on failure
        return; // Stop initialization
    }
    console.log("✅ Assets loaded, proceeding with game initialization...");

    console.log('Initializing game with player number:', gameSession?.playerNumber || 'UNKNOWN'); // Use optional chaining

    // Ensure gameState exists (defined in game-constants.js)
    if (typeof gameState === 'undefined') {
        console.error("FATAL: gameState is not defined before initGame! Check game-constants.js loading order.");
        alert("Critical Error: Game state missing. Please refresh."); // User feedback
        return; // Stop initialization
    }
    // Ensure gameSession exists (defined in lobby.js)
    if (typeof gameSession === 'undefined') {
        console.error("FATAL: gameSession is not defined before initGame! Check lobby.js loading order.");
        alert("Critical Error: Session data missing. Please refresh."); // User feedback
        return; // Cannot proceed
    }

    // Set player number from session
    gameState.playerNumber = gameSession.playerNumber;

    // Update UI elements (player num, indicator, room code) - Kan direct
    const gameRoomCodeEl = document.getElementById('game-room-code');
    const playerNumEl = document.getElementById('player-num');
    const playerIndicatorEl = document.getElementById('player-indicator');

    if (gameRoomCodeEl && gameSession.roomCode) {
        gameRoomCodeEl.textContent = gameSession.roomCode;
    }
    if (playerNumEl && gameSession.playerNumber) {
        playerNumEl.textContent = gameSession.playerNumber;
    }
    if (playerIndicatorEl && gameState.playerNumber) {
        playerIndicatorEl.style.backgroundColor = gameState.playerNumber === PLAYER_1 ? '#ff0000' : '#0000ff';
    }

    // Apply initial game state from the server, captured by the patch - Kan direct
    console.log('🔍 DEBUG: Checking initialization path...');
    console.log('🔍 gameSession.initialGameState exists?', !!gameSession.initialGameState);
    console.log('🔍 Full gameState:', gameState);

    if (gameSession.initialGameState) {
        console.log('Applying initial game state:', gameSession.initialGameState);
        gameState.currentPhase = gameSession.initialGameState.currentPhase;
        gameState.cycleNumber = gameSession.initialGameState.cycleNumber;
        gameState.roundNumber = gameSession.initialGameState.roundNumber;
        if (gameSession.initialGameState.currentPlayer !== undefined && gameSession.initialGameState.currentPlayer !== null) {
            gameState.currentPlayer = gameSession.initialGameState.currentPlayer;
            console.log(`Applied initial currentPlayer from gameSession: ${gameState.currentPlayer}`);
        } else {
            console.error("Initial game state missing valid currentPlayer!", gameSession.initialGameState);
            gameState.currentPlayer = 1; // Fallback
            console.warn(`Falling back to default currentPlayer: ${gameState.currentPlayer}`);
        }
    } else {
        // Use default game state
        console.log('Using default game state');
        gameState.currentPhase = gameState.currentPhase || 'SETUP1_DEFINE';
        gameState.cycleNumber = gameState.cycleNumber || 1;
        gameState.roundNumber = gameState.roundNumber || 1;
        gameState.currentPlayer = gameState.currentPlayer || 1;
    }

    console.log('Initial game state applied:',
        `Phase: ${gameState.currentPhase}`, `PlayerTurn: ${gameState.currentPlayer}`, `ThisClient: ${gameState.playerNumber}`,
        `Cycle: ${gameState.cycleNumber}`, `Round: ${gameState.roundNumber}`
    );

    // Initialize PixiJS application - Moet direct voor setup
    const gameContainer = document.getElementById('game-container');
    console.log("Game Container Element:", gameContainer);

    if (!gameContainer) {
        console.error("FATAL: Game container element not found! Cannot initialize Pixi.");
        showToast("Error: Game display area not found. Please refresh.");
        return;
    }

    try {
        if (typeof PIXI === 'undefined') throw new Error("PIXI is not loaded!");
        if (typeof BOARD_WIDTH === 'undefined' || typeof BOARD_HEIGHT === 'undefined') throw new Error("Board dimensions constants missing!");
        if (typeof COLORS === 'undefined') throw new Error("COLORS constant missing!");

        // Zorg dat 'app' en 'highlightContainer' globaal of in scope zijn
        if (typeof app !== 'undefined' && app?.destroy) {
            console.log("Destroying previous PIXI application instance.");
            app.destroy(true, { children: true, texture: true, baseTexture: true }); // Grondig opruimen
        }

        // Get the actual container size to match the CSS layout
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) {
            throw new Error("Game container not found!");
        }

        // Get computed dimensions from CSS
        const containerRect = gameContainer.getBoundingClientRect();
        let canvasWidth = Math.floor(containerRect.width) || BOARD_WIDTH;
        let canvasHeight = Math.floor(containerRect.height) || BOARD_HEIGHT;

        // Ensure the canvas maintains square aspect ratio
        const minDimension = Math.min(canvasWidth, canvasHeight);
        canvasWidth = minDimension;
        canvasHeight = minDimension;

        console.log(`Creating canvas with dimensions: ${canvasWidth} x ${canvasHeight}`);

        // Target color from CSS: #e7c07d (approx)
        const desiredBgColorHex = 0xe7c07d;

        const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
        app = new PIXI.Application({ // 'app' opnieuw toewijzen
            width: canvasWidth, // Use dynamic width based on container
            height: canvasHeight, // Use dynamic height based on container
            backgroundAlpha: 0, // Keep transparent for CSS background to show through
            antialias: true,
            clearBeforeRender: true, // Ensure canvas is cleared each frame
            resolution: devicePixelRatio, // Map logical to physical pixels for crisp rendering
            autoDensity: true, // Adjust canvas size for resolution while keeping CSS size stable
            resizeTo: gameContainer // Auto-resize renderer with container
        });

        // Scale the entire stage to fit the canvas while maintaining grid proportions
        const scaleX = canvasWidth / BOARD_WIDTH;
        const scaleY = canvasHeight / BOARD_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        app.stage.scale.set(scale, scale);

        // Center the scaled content
        app.stage.x = (canvasWidth - BOARD_WIDTH * scale) / 2;
        app.stage.y = (canvasHeight - BOARD_HEIGHT * scale) / 2;
        // Explicitly set the clear color and alpha for the renderer
        app.renderer.background.color = desiredBgColorHex; // Set the base color for clearing
        app.renderer.background.alpha = 0; // Ensure the clear operation uses transparency

        console.log("Pixi Application created (alpha 0, clear color set, with responsive dimensions):", app);

        // Helpers for logging and scaling on resize
        function logCanvasMetrics(sourceLabel) {
            try {
                if (!window.SpLogger || !app) return;
                const rect = gameContainer.getBoundingClientRect();
                const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
                const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
                SpLogger.log("canvas.resize", {
                    source: sourceLabel,
                    dpr: window.devicePixelRatio || 1,
                    window: { w: vw, h: vh, scrollX: window.scrollX || 0, scrollY: window.scrollY || 0 },
                    screen: { w: app.screen?.width, h: app.screen?.height },
                    renderer: {
                        width: app.renderer?.width,
                        height: app.renderer?.height,
                        resolution: app.renderer?.resolution
                    },
                    containerRect: { w: Math.round(rect.width), h: Math.round(rect.height) },
                    stageScale: { x: app.stage?.scale?.x, y: app.stage?.scale?.y },
                    stagePos: { x: app.stage?.x, y: app.stage?.y }
                });
            } catch (_) { }
        }

        function applyStageScaleForCurrentRenderer() {
            if (!app) return;
            const rect = gameContainer.getBoundingClientRect();
            // Maintain square using container CSS pixels
            let viewW = Math.floor(rect.width) || BOARD_WIDTH;
            let viewH = Math.floor(rect.height) || BOARD_HEIGHT;
            const minDim = Math.min(viewW, viewH);
            viewW = minDim; viewH = minDim;
            // Ensure renderer matches desired CSS pixels (in case resizeTo didn't fire yet)
            if (app.screen.width !== viewW || app.screen.height !== viewH) {
                app.renderer.resize(viewW, viewH);
            }
            // Explicitly sync the canvas CSS size for consistency across browsers/zoom
            try {
                app.view.style.width = `${viewW}px`;
                app.view.style.height = `${viewH}px`;
                app.view.style.display = 'block';
            } catch (_) { }
            const scaleX = app.screen.width / BOARD_WIDTH;
            const scaleY = app.screen.height / BOARD_HEIGHT;
            const scale = Math.min(scaleX, scaleY);
            app.stage.scale.set(scale, scale);
            app.stage.x = (app.screen.width - BOARD_WIDTH * scale) / 2;
            app.stage.y = (app.screen.height - BOARD_HEIGHT * scale) / 2;
            // Set stage hitArea in STAGE-LOCAL coordinates, not screen pixels,
            // so Pixi hit testing works even when the stage is scaled/translated
            try {
                app.stage.hitArea = new PIXI.Rectangle(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
            } catch (_) { }
        }

        // Add resize handler to maintain proper scaling and log metrics
        function resizeCanvas(source = "window.resize") {
            if (!app || !gameContainer) return;
            applyStageScaleForCurrentRenderer();
            logCanvasMetrics(source);
        }

        // Add event listener for window resize and orientation changes
        window.addEventListener('resize', () => {
            resizeCanvas('window.resize');
            console.log('Canvas resized - coordinate conversion updated');
            try { if (window.SpLogger) SpLogger.log('canvas.resize.ui', { reason: 'window.resize' }); } catch (_) { }
        });
        window.addEventListener('orientationchange', () => {
            resizeCanvas('orientation.change');
            console.log('Canvas resized due to orientation change');
            try { if (window.SpLogger) SpLogger.log('canvas.resize.ui', { reason: 'orientation.change' }); } catch (_) { }
        });

        gameContainer.innerHTML = ''; // Leegmaken voor zekerheid
        const canvasElement = gameContainer.appendChild(app.view);
        if (!(canvasElement instanceof HTMLCanvasElement)) {
            throw new Error("Appended element is not a canvas!");
        }
        console.log("PixiJS canvas appended. Canvas:", canvasElement);
        // Ensure canvas is on top and receives pointer events across layouts/zoom
        try {
            canvasElement.style.position = 'relative';
            canvasElement.style.zIndex = '15';
            canvasElement.style.pointerEvents = 'auto';
            canvasElement.style.transform = 'translateZ(0)'; // stabilize rasterization at some DPRs
        } catch (_) { }
        // Debug pointer logging to diagnose any dead zones
        try {
            canvasElement.addEventListener('pointerdown', (e) => {
                const r = canvasElement.getBoundingClientRect();
                const gx = e.clientX - r.left;
                const gy = e.clientY - r.top;
                const scale = app.stage?.scale?.x || 1;
                const sx = (gx - (app.stage?.x || 0)) / scale;
                const sy = (gy - (app.stage?.y || 0)) / scale;
                const payload = { type: 'down', client: { x: e.clientX, y: e.clientY }, localCanvas: { x: gx, y: gy }, stage: { x: sx, y: sy }, rect: { w: Math.round(r.width), h: Math.round(r.height) }, dpr: window.devicePixelRatio || 1, stagePos: { x: app.stage?.x, y: app.stage?.y }, scale };
                if (window.SpLogger) SpLogger.log('pointer.debug', payload);
                try { console.log('[pointer.debug]', payload); } catch (_) { }
            }, { passive: true });
            canvasElement.addEventListener('pointerup', (e) => {
                const r = canvasElement.getBoundingClientRect();
                const gx = e.clientX - r.left;
                const gy = e.clientY - r.top;
                const scale = app.stage?.scale?.x || 1;
                const sx = (gx - (app.stage?.x || 0)) / scale;
                const sy = (gy - (app.stage?.y || 0)) / scale;
                const payload = { type: 'up', client: { x: e.clientX, y: e.clientY }, localCanvas: { x: gx, y: gy }, stage: { x: sx, y: sy } };
                if (window.SpLogger) SpLogger.log('pointer.debug', payload);
                try { console.log('[pointer.debug]', payload); } catch (_) { }
            }, { passive: true });
            canvasElement.addEventListener('click', (e) => {
                const payload = { targetId: e.target?.id || null, class: e.target?.className || null, path0: e.composedPath?.()[0]?.tagName || null };
                if (window.SpLogger) SpLogger.log('pointer.click', payload);
                try { console.log('[pointer.click]', payload); } catch (_) { }
            }, { passive: true });
        } catch (_) { }

        highlightContainer = new PIXI.Container(); // 'highlightContainer' opnieuw toewijzen
        app.stage.addChild(highlightContainer);
        app.stage.eventMode = 'static'; app.stage.hitArea = app.screen;
        app.stage.on('pointerdown', (event) => {
            try {
                const tgt = event.target;
                const info = { tgtType: typeof tgt, name: tgt?.name || null, isStage: tgt === app.stage, hasPawnRef: !!tgt?.pawnRef };
                console.log('[stage.pointerdown]', info);
            } catch (_) { }
            if (event.target === app.stage) {
                if (typeof onBackgroundClick === 'function') onBackgroundClick(event);
                else console.warn("onBackgroundClick not defined");
            }
        });

        // Initial resize log after canvas insertion
        resizeCanvas('init');
        try { if (window.SpLogger) SpLogger.log('canvas.resize.ui', { reason: 'init' }); } catch (_) { }

        // Physics-based drag removed

        // Ensure pointer mapping stays accurate when layout changes
        const ro = new ResizeObserver(() => resizeCanvas('observer'));
        try { ro.observe(gameContainer); } catch (_) { }

        // Global diagnostic: log topmost element and parent chain at pointer position to detect overlay blocking
        try {
            const logHitTest = (e) => {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const chain = [];
                let cur = el;
                while (cur && chain.length < 6) {
                    chain.push({ tag: cur.tagName, id: cur.id || null, class: cur.className || null, z: getComputedStyle(cur).zIndex });
                    cur = cur.parentElement;
                }
                const payload = { x: e.clientX, y: e.clientY, chain };
                if (window.SpLogger) SpLogger.log('pointer.hittest', payload);
                try { console.log('[pointer.hittest]', payload); } catch (_) { }
            };
            window.addEventListener('pointerdown', logHitTest, { passive: true });
        } catch (_) { }

        // Physics-based drag removed

    } catch (error) {
        console.error("Error initializing PixiJS:", error);
        showToast("Error loading game graphics: " + error.message);
        if (gameContainer) { const e = document.createElement('div'); e.textContent = "Graphics Init Error."; e.style.color = 'red'; gameContainer.appendChild(e); }
        return;
    }

    // Vroege UI/Setup die niet afhankelijk is van game-logic functies - Kan direct
    cacheUIElements();
    setupChat();

    // --- Start preloaden van geluiden --- Kan direct
    if (typeof soundManager !== 'undefined' && typeof soundManager.preloadSounds === 'function') {
        console.log("Starting sound preload...");
        soundManager.preloadSounds(() => {
            console.log("Sound preload sequence finished (callback received).");
        });
    } else {
        console.warn("SoundManager or preloadSounds function not found!");
    }

    // --- Setup Mute Button Listener --- Kan direct
    const muteButton = document.getElementById('mute-btn');
    if (muteButton && typeof soundManager !== 'undefined' && typeof soundManager.toggleMute === 'function') {
        // Verwijder oude listener indien aanwezig om duplicaten te voorkomen
        muteButton.replaceWith(muteButton.cloneNode(true)); // Eenvoudige manier om listeners te verwijderen
        const newMuteButton = document.getElementById('mute-btn'); // Haal de gekloonde knop op
        newMuteButton.addEventListener('click', () => soundManager.toggleMute());
        newMuteButton.textContent = soundManager.isMuted ? 'Unmute Sounds' : 'Mute Sounds';
        newMuteButton.style.backgroundColor = soundManager.isMuted ? '#aaa' : '#4a6ea9';
    } else {
        console.warn("Mute button or soundManager not found for listener setup.");
    }

    // Volume Slider setup moved to DOMContentLoaded

    // *** HIER DE VERTRAGING VOOR GAME-LOGIC AFHANKELIJKE INIT ***
    console.log("Adding short delay before final setup checks and drawing...");
    setTimeout(() => {
        console.log("Executing final setup after delay...");

        // Check for required functions NU PAS
        const requiredFuncs = ['initializeGameSocketEvents', 'drawBoard', 'initializePawns', 'handleCardDefinition', 'handlePlayerTurn', 'updateGameStatusUI', 'cancelActionSelection', 'showActionTargets', 'updateLinkingUI']; // updateLinkingUI toegevoegd
        let missingFunc = null;
        for (const funcName of requiredFuncs) {
            const funcRef = typeof window !== 'undefined' ? window[funcName] : (typeof self !== 'undefined' ? self[funcName] : undefined);
            if (typeof funcRef !== 'function') {
                missingFunc = funcName;
                break;
            }
        }
        if (missingFunc) {
            console.error(`FATAL (after delay): Required function "${missingFunc}" is not defined!`);
            showToast(`Critical game script error (${missingFunc}). Please refresh.`);
            return;
        }

        // Initialize Socket Events NU PAS (afhankelijk van handlers in game-logic)
        initializeGameSocketEvents();

        // Draw Board and Pawns NU PAS
        try {
            // Zorg dat de stage leeg is voordat we opnieuw tekenen (indien initGame vaker wordt aangeroepen)
            app.stage.removeChildren(); // Verwijder oude graphics/pions
            highlightContainer = new PIXI.Container(); // Maak highlight container opnieuw aan
            app.stage.addChild(highlightContainer); // Voeg toe aan lege stage

            drawBoard(); // Teken bord op lege stage
            initializePawns(); // Maak pionnen opnieuw aan en voeg toe aan stage
        } catch (error) {
            console.error("Error during delayed board/pawn drawing:", error); showToast("Error drawing game board."); return;
        }

        console.log('Game board/pawns initialized (after delay). Current phase:', gameState.currentPhase);

        // Start the first relevant phase logic NU PAS
        if (gameState.currentPhase?.endsWith('DEFINE')) {
            console.log('Triggering card definition handler (after delay)...');
            if (typeof handleCardDefinition === 'function') handleCardDefinition(); else console.error("handleCardDefinition missing!");
            // Auto-open the drawer in DEFINE on load
            try { window.MobileUI?.setDrawerOpen?.(true); } catch (_) { }
        } else if (gameState.currentPhase === 'ACTION') {
            console.log('Triggering action phase handler (after delay)...');
            if (typeof handlePlayerTurn === 'function') handlePlayerTurn(); else console.error("handlePlayerTurn missing!");
        } else if (gameState.currentPhase?.endsWith('LINKING')) {
            console.log('Triggering linking UI update handler (after delay)...');
            if (typeof updateLinkingUI === 'function') updateLinkingUI(); else console.error("updateLinkingUI missing!");
        }

        // Removed setup for action buttons (move-btn, attack-btn, cancel-action-btn) as they are not in HTML.

        // Final UI update
        if (typeof updateGameStatusUI === 'function') updateGameStatusUI(); else console.error("updateGameStatusUI missing!");

        // --- Play Game Start Sound ---
        if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
            console.log("🔊 PLAYING GAME START SOUND - FIRST ATTEMPT");
            soundManager.playSound("ui_start");

            // Try again after a brief delay to ensure it plays
            setTimeout(() => {
                console.log("🔊 PLAYING GAME START SOUND - SECOND ATTEMPT (DELAYED)");
                soundManager.playSound("ui_start");
            }, 500);
        } else {
            console.warn("soundManager.playSound function not found for start sound.");
        }
        // --- End Game Start Sound ---

        // --- Start Background Music ---
        if (typeof soundManager !== 'undefined' && typeof soundManager.playBackgroundMusic === 'function') {
            // Check if music tracks are available before attempting to play
            if (soundManager.backgroundMusicTracks && soundManager.backgroundMusicTracks.length > 0) {
                console.log("Attempting to start background music...");
                soundManager.playBackgroundMusic();
            } else {
                console.log("No background music tracks defined in soundManager.");
            }
        } else {
            console.warn("soundManager.playBackgroundMusic function not found.");
        }
        // --- End Background Music ---

        console.log('Delayed game initialization sequence complete.');

    }, 150); // Verhoogde vertraging iets voor meer zekerheid

} // End initGame

// --- EINDE VAN AANGEPASTE initGame FUNCTIE ---

// --- END OF FILE public/js/main.js ---
