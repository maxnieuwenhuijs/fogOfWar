// Menu System for Fog of War
class MenuSystem {
    constructor() {
        this.currentMenu = null;
        this.menuContainer = null;
        this.backgroundMusic = null;
        this.init();
    }

    init() {
        // Create menu container
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'menu-container';
        this.menuContainer.className = 'menu-container';
        document.body.appendChild(this.menuContainer);
    }

    showMainMenu() {
        this.currentMenu = 'main';
        this.menuContainer.innerHTML = `
            <div class="menu-screen main-menu">
                <div class="game-logo">
                    <h1 class="game-title">FOG OF WAR</h1>
                    <p class="game-subtitle">Strategic Battlefield Commander</p>
                </div>
                
                <div class="menu-buttons">
                    <button class="menu-button primary" disabled style="opacity: 0.5; cursor: not-allowed;" title="Single Player mode temporarily disabled">
                        <span class="button-icon">⚔️</span>
                        <span class="button-text">Single Player (Disabled)</span>
                    </button>
                    
                    <button class="menu-button primary" onclick="menuSystem.showMultiplayerMenu()">
                        <span class="button-icon">🌐</span>
                        <span class="button-text">Multiplayer</span>
                    </button>
                    
                    <button class="menu-button secondary" onclick="menuSystem.showTutorial()">
                        <span class="button-icon">📚</span>
                        <span class="button-text">Tutorial</span>
                    </button>
                    
                    <button class="menu-button secondary" onclick="menuSystem.showSettings()">
                        <span class="button-icon">⚙️</span>
                        <span class="button-text">Settings</span>
                    </button>
                </div>
                
                <div class="menu-footer">
                    <p class="version-text">Version 1.0.0</p>
                </div>
            </div>
        `;
        this.menuContainer.style.display = 'flex';
        
        // Hide the game stats bar when returning to main menu
        const statsBar = document.querySelector('.game-stats-bar');
        if (statsBar) {
            statsBar.style.display = 'none';
        }
    }

    showSingleplayerMenu() {
        this.currentMenu = 'singleplayer';
        this.menuContainer.innerHTML = `
            <div class="menu-screen singleplayer-menu">
                <h2 class="menu-title">Single Player Campaign</h2>
                
                <div class="difficulty-section">
                    <h3>Select Difficulty</h3>
                    <div class="difficulty-buttons">
                        <button class="difficulty-button" onclick="menuSystem.startSingleplayer('easy')">
                            <div class="difficulty-icon">🟢</div>
                            <div class="difficulty-name">Recruit</div>
                            <div class="difficulty-desc">For new commanders</div>
                        </button>
                        
                        <button class="difficulty-button" onclick="menuSystem.startSingleplayer('medium')">
                            <div class="difficulty-icon">🟡</div>
                            <div class="difficulty-name">Veteran</div>
                            <div class="difficulty-desc">Standard challenge</div>
                        </button>
                        
                        <button class="difficulty-button" onclick="menuSystem.startSingleplayer('hard')">
                            <div class="difficulty-icon">🔴</div>
                            <div class="difficulty-name">General</div>
                            <div class="difficulty-desc">Tactical mastery required</div>
                        </button>
                    </div>
                </div>
                
                <button class="menu-button back" onclick="menuSystem.showMainMenu()">
                    <span class="button-icon">⬅️</span>
                    <span class="button-text">Back</span>
                </button>
            </div>
        `;
    }

    showMultiplayerMenu() {
        this.currentMenu = 'multiplayer';
        // Initialize lobby if not already done
        if (!window.socket && typeof initializeLobby === 'function') {
            initializeLobby();
        }
        
        // Start game patches and systems for multiplayer
        if (typeof window.startGamePatch === 'function') {
            window.startGamePatch();
        }
        if (typeof window.startCycleFix === 'function') {
            window.startCycleFix();
        }
        if (typeof window.startPhysicsAttackSync === 'function') {
            window.startPhysicsAttackSync();
        }
        if (typeof window.startCardFlipFix === 'function') {
            window.startCardFlipFix();
        }
        
        // Hide menu and show existing lobby screen
        this.menuContainer.style.display = 'none';
        document.getElementById('lobby-screen').classList.add('active');
    }

    showSettings() {
        this.currentMenu = 'settings';
        
        // Get current settings
        const currentVolume = (typeof soundManager !== 'undefined' && soundManager.globalVolume !== undefined) 
            ? soundManager.globalVolume : 0.5;
        const currentMusicEnabled = localStorage.getItem('musicEnabled') !== 'false';
        const currentSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        
        this.menuContainer.innerHTML = `
            <div class="menu-screen settings-menu">
                <h2 class="menu-title">Settings</h2>
                
                <div class="settings-content">
                    <div class="settings-section">
                        <h3>Audio Settings</h3>
                        
                        <div class="setting-item">
                            <label>Master Volume</label>
                            <div class="volume-control-wrapper">
                                <input type="range" id="settings-volume" min="0" max="1" step="0.05" value="${currentVolume}">
                                <span id="settings-volume-value">${Math.round(currentVolume * 100)}%</span>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <label>Music</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settings-music" ${currentMusicEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="setting-item">
                            <label>Sound Effects</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settings-sound" ${currentSoundEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>Graphics Settings</h3>
                        
                        <div class="setting-item">
                            <label>Quality</label>
                            <select id="settings-quality" class="settings-select">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="settings-buttons">
                    <button class="menu-button primary" onclick="menuSystem.saveSettings()">
                        <span class="button-text">Save Settings</span>
                    </button>
                    
                    <button class="menu-button back" onclick="menuSystem.showMainMenu()">
                        <span class="button-icon">⬅️</span>
                        <span class="button-text">Back</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('settings-volume').addEventListener('input', (e) => {
            document.getElementById('settings-volume-value').textContent = Math.round(e.target.value * 100) + '%';
        });
    }

    showTutorial() {
        this.currentMenu = 'tutorial';
        this.menuContainer.innerHTML = `
            <div class="menu-screen tutorial-menu">
                <h2 class="menu-title">How to Play</h2>
                
                <div class="tutorial-content">
                    <div class="tutorial-section">
                        <h3>🎯 Objective</h3>
                        <p>Move your units to the enemy's haven (base) to win the game!</p>
                    </div>
                    
                    <div class="tutorial-section">
                        <h3>🃏 Unit Cards</h3>
                        <p>Each unit has 3 stats that total 7 points:</p>
                        <ul>
                            <li><strong>🛡️ HP:</strong> Health points (damage resistance)</li>
                            <li><strong>🐎 Stamina:</strong> Movement range per turn</li>
                            <li><strong>⚔️ Attack:</strong> Damage dealt in combat</li>
                        </ul>
                    </div>
                    
                    <div class="tutorial-section">
                        <h3>🎮 Gameplay</h3>
                        <ol>
                            <li><strong>Setup:</strong> Define your unit stats (3 rounds)</li>
                            <li><strong>Linking:</strong> Assign cards to your pawns</li>
                            <li><strong>Action:</strong> Move and attack with your units</li>
                        </ol>
                    </div>
                    
                    <div class="tutorial-section">
                        <h3>⚔️ Physics Attack</h3>
                        <p>Click and drag from an enemy unit to set attack direction. The longer the drag, the more powerful the knockback!</p>
                    </div>
                    
                    <div class="tutorial-section">
                        <h3>💡 Tips</h3>
                        <ul>
                            <li>High stamina units can reach the enemy base quickly</li>
                            <li>High HP units can survive multiple attacks</li>
                            <li>High attack units can eliminate enemies in one hit</li>
                            <li>Use physics attacks to knock enemies off the board!</li>
                        </ul>
                    </div>
                </div>
                
                <button class="menu-button back" onclick="menuSystem.showMainMenu()">
                    <span class="button-icon">⬅️</span>
                    <span class="button-text">Back</span>
                </button>
            </div>
        `;
    }

    saveSettings() {
        const volume = document.getElementById('settings-volume').value;
        const musicEnabled = document.getElementById('settings-music').checked;
        const soundEnabled = document.getElementById('settings-sound').checked;
        const quality = document.getElementById('settings-quality').value;
        
        // Save to localStorage
        localStorage.setItem('volume', volume);
        localStorage.setItem('musicEnabled', musicEnabled);
        localStorage.setItem('soundEnabled', soundEnabled);
        localStorage.setItem('graphicsQuality', quality);
        
        // Apply settings
        if (typeof soundManager !== 'undefined') {
            soundManager.setVolume(parseFloat(volume));
            soundManager.musicEnabled = musicEnabled;
            soundManager.soundEnabled = soundEnabled;
        }
        
        showToast('Settings saved!');
        this.showMainMenu();
    }

    startSingleplayer(difficulty) {
        // Store difficulty setting
        gameState.singleplayerMode = true;
        gameState.aiDifficulty = difficulty;
        
        // Hide menu
        this.menuContainer.style.display = 'none';
        
        // Initialize single player game
        this.initSingleplayerGame();
    }

    initSingleplayerGame() {
        // Ensure gameState exists
        if (typeof gameState === 'undefined') {
            console.error('gameState not defined, waiting...');
            setTimeout(() => this.initSingleplayerGame(), 100);
            return;
        }
        
        // FIRST THING: Mark as single player mode to stop other scripts from waiting
        gameState.singleplayerMode = true;
        window.gameState = gameState;
        console.log('🔧 Single player mode flag set early');
        
        // Create a mock socket for single player FIRST before anything else
        if (!window.socket) {
            window.socket = {
                emit: function(eventName, data) {
                    // This will be overridden by singleplayer-adapter
                    console.log('Mock socket emit (not yet overridden):', eventName, data);
                },
                on: function() {},
                off: function() {},
                connected: true
            };
            console.log('Created mock socket for single player mode');
        }
        
        // Create a mock game session for single player
        window.gameSession = {
            playerNumber: 1,
            roomCode: 'SINGLE',
            players: {
                1: { name: 'Player', ready: true },
                2: { name: 'AI Commander', ready: true }
            },
            initialGameState: {
                currentPhase: 'SETUP1_DEFINE',
                cycleNumber: 1,
                roundNumber: 1,
                currentPlayer: 1
            }
        };
        
        // Make sure they're available as globals without window prefix
        if (typeof socket === 'undefined') {
            globalThis.socket = window.socket;
        }
        if (typeof gameSession === 'undefined') {
            globalThis.gameSession = window.gameSession;
        }
        
        console.log('🔧 Mock gameSession created:', window.gameSession);
        console.log('🔧 Socket available:', !!window.socket);
        console.log('🔧 Global check - socket:', typeof socket, 'gameSession:', typeof gameSession);
        
        // Set game state flags
        gameState.singleplayerMode = true;
        gameState.testMode = false;
        
        // Hide all screens first
        document.getElementById('lobby-screen').classList.remove('active');
        document.getElementById('waiting-screen').classList.remove('active');
        document.getElementById('game-lobby-screen').classList.remove('active');
        
        // Show game screen
        document.getElementById('game-screen').classList.add('active');
        
        // Hide the stats bar and medal elements that show errors
        const statsBar = document.querySelector('.game-stats-bar');
        if (statsBar) statsBar.style.display = 'block';
        
        // Update the room code display to show it's single player
        const roomCodeElements = document.querySelectorAll('#game-room-code, #display-room-code, #lobby-room-code');
        roomCodeElements.forEach(el => {
            if (el) el.textContent = 'SINGLE';
        });
        
        // Initialize single player mode BEFORE the game
        if (typeof initSinglePlayerMode === 'function') {
            initSinglePlayerMode();
        }
        
        // Start game patches and systems
        if (typeof window.startGamePatch === 'function') {
            window.startGamePatch();
        }
        if (typeof window.startCycleFix === 'function') {
            window.startCycleFix();
        }
        if (typeof window.startPhysicsAttackSync === 'function') {
            window.startPhysicsAttackSync();
        }
        if (typeof window.startCardFlipFix === 'function') {
            window.startCardFlipFix();
        }
        
        // Initialize the game after single player mode is set up
        setTimeout(() => {
            initGame();
        }, 100);
    }

    hideMenu() {
        this.menuContainer.style.display = 'none';
    }
}

// Create global menu system instance
window.menuSystem = new MenuSystem();