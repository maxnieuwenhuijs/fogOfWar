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
                    <button class="menu-button primary" onclick="menuSystem.showSingleplayerMenu()">
                        <span class="button-icon">⚔️</span>
                        <span class="button-text">Single Player</span>
                    </button>
                    
                    <button class="menu-button primary" onclick="menuSystem.showMultiplayerGate()">
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
                <button class="menu-button back" onclick="menuSystem.showMainMenu()">
                    <span class="button-icon">⬅️</span>
                    <span class="button-text">Back</span>
                </button>
                <h2 class="menu-title">Single Player</h2>
                <p style="text-align:center;margin-top:-10px;margin-bottom:16px;opacity:0.85">Select a difficulty to begin</p>
                <div class="difficulty-buttons">
                    <button class="menu-button primary" id="btn-easy">
                        <span class="button-icon">🙂</span>
                        <span>
                            Easy Bot
                            <div style="font-size:0.8em;opacity:0.9;margin-top:4px">Beginner-friendly, predictable</div>
                        </span>
                    </button>
                    <button class="menu-button primary" id="btn-medium">
                        <span class="button-icon">😼</span>
                        <span>
                            Medium Bot
                            <div style="font-size:0.8em;opacity:0.9;margin-top:4px">Balanced challenge</div>
                        </span>
                    </button>
                    <button class="menu-button primary" id="btn-hard">
                        <span class="button-icon">👹</span>
                        <span>
                            Hard Bot
                            <div style="font-size:0.8em;opacity:0.9;margin-top:4px">Aggressive, advanced tactics</div>
                        </span>
                    </button>
                </div>
            </div>
        `;

        const startWithDifficulty = async (level) => {
            localStorage.setItem('sp_difficulty', level);
            try { if (window.SpLogger) SpLogger.setDifficulty(level); } catch (_) { }
            try {
                if (typeof window.startGamePatch === 'function') window.startGamePatch();
                if (typeof window.startCycleFix === 'function') window.startCycleFix();
                if (typeof window.startPhysicsAttackSync === 'function') window.startPhysicsAttackSync();

                this.menuContainer.style.display = 'none';
                if (typeof window.initSimpleSingleplayer === 'function') {
                    await window.initSimpleSingleplayer();
                } else {
                    alert('Singleplayer module missing.');
                    this.showMainMenu();
                }
            } catch (e) {
                console.error('Failed to start singleplayer:', e);
                alert('Failed to start singleplayer. See console for details.');
                this.showMainMenu();
            }
        };

        this.menuContainer.querySelector('#btn-easy').onclick = () => startWithDifficulty('easy');
        this.menuContainer.querySelector('#btn-medium').onclick = () => startWithDifficulty('medium');
        this.menuContainer.querySelector('#btn-hard').onclick = () => startWithDifficulty('hard');
    }

    showMultiplayerGate() {
        this.currentMenu = 'multiplayer-gate';
        this.menuContainer.innerHTML = `
            <div class="menu-screen multiplayer-gate">
                <button class="menu-button back" onclick="menuSystem.showMainMenu()">
                    <span class="button-icon">⬅️</span>
                    <span class="button-text">Back</span>
                </button>
                <h2 class="menu-title">Multiplayer</h2>
                <div class="form-group" style="max-width:420px;margin:0 auto 12px auto;">
                    <label for="gate-username">Choose a unique username</label>
                    <input type="text" id="gate-username" placeholder="Commander name" />
                </div>
                <div class="settings-buttons" style="gap:10px;justify-content:center;">
                    <button class="menu-button primary" id="btn-continue-mp">Continue</button>
                </div>
            </div>`;

        const continueBtn = this.menuContainer.querySelector('#btn-continue-mp');
        continueBtn.onclick = async () => {
            const name = (this.menuContainer.querySelector('#gate-username').value || '').trim();
            if (!name) { showToast('Please enter a username'); return; }
            try {
                // Ensure socket init and global reference
                if ((!window.socket || !window.socket.connected) && typeof initializeLobby === 'function') initializeLobby();
                if (!window.socket) { showToast('Connecting... Please try again in a second.'); return; }
                // Ask server to reserve/validate name
                const ok = await new Promise((resolve) => {
                    const timeout = setTimeout(() => resolve(false), 4000);
                    const s = window.socket;
                    if (!s) { clearTimeout(timeout); console.warn('No socket available for reserveUsername'); resolve(false); return; }
                    s.emit('reserveUsername', { name });
                    const handler = (res) => {
                        clearTimeout(timeout);
                        s.off('usernameReserveResult', handler);
                        console.log('[usernameReserveResult]', res);
                        if (!res?.ok) console.warn('Username rejected', res);
                        resolve(!!res?.ok);
                    };
                    s.on('usernameReserveResult', handler);
                });
                if (!ok) { showToast('Name already in use. Choose another.'); return; }
                // Persist and proceed
                localStorage.setItem('mp_username', name);
                window.DEFAULT_MULTIPLAYER_NAME = name;
                // Defer to allow lobby to initialize cleanly
                setTimeout(() => this.showMultiplayerMenu(), 50);
            } catch (e) {
                console.warn('Username reservation failed', e);
                showToast('Could not validate name. Try again.');
            }
        };
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
        // Prefill and hide name inputs in lobby since set at gate
        const gateName = localStorage.getItem('mp_username') || '';
        const createNameEl = document.getElementById('create-name');
        const joinNameEl = document.getElementById('join-name');
        if (createNameEl) { createNameEl.value = gateName; createNameEl.closest('.form-group').style.display = 'none'; }
        if (joinNameEl) { joinNameEl.value = gateName; joinNameEl.closest('.form-group').style.display = 'none'; }
        const lobby = document.getElementById('lobby-screen');
        if (lobby) {
            // Ensure lobby screen is displayed and main stats bar hidden
            const screens = document.querySelectorAll('.screen');
            screens.forEach(s => s.classList.remove('active'));
            lobby.classList.add('active');
        }
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
                <button class="menu-button back" onclick="menuSystem.showMainMenu()">
                    <span class="button-icon">⬅️</span>
                    <span class="button-text">Back</span>
                </button>
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
                
                <div class="settings-buttons" style="justify-content:center;">
                    <button class="menu-button primary" onclick="menuSystem.saveSettings()">
                        <span class="button-text">Save Settings</span>
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
                <button class="menu-button back" onclick="menuSystem.showMainMenu()">
                    <span class="button-icon">⬅️</span>
                    <span class="button-text">Back</span>
                </button>
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



    hideMenu() {
        this.menuContainer.style.display = 'none';
    }

    hide() {
        this.hideMenu();
    }
}

// Create global menu system instance
window.menuSystem = new MenuSystem();