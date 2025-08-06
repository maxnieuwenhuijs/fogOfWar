// Loading Screen for Fog of War
class LoadingScreen {
    constructor() {
        this.loadingContainer = null;
        this.progressBar = null;
        this.progressText = null;
        this.loadingMessage = null;
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.assetList = [];
        this.init();
    }

    init() {
        // Create loading container
        this.loadingContainer = document.createElement('div');
        this.loadingContainer.id = 'loading-screen';
        this.loadingContainer.className = 'loading-screen';
        this.loadingContainer.innerHTML = `
            <div class="loading-content">
                <div class="loading-logo">
                    <h1 class="loading-title">FOG OF WAR</h1>
                </div>
                
                <div class="loading-progress-container">
                    <div class="loading-progress-bar">
                        <div class="loading-progress-fill" id="loading-progress-fill"></div>
                    </div>
                    <div class="loading-progress-text" id="loading-progress-text">0%</div>
                </div>
                
                <div class="loading-message" id="loading-message">Initializing...</div>
                
                <div class="loading-tips">
                    <p class="loading-tip" id="loading-tip">Tip: High stamina units can quickly capture enemy havens!</p>
                </div>
            </div>
        `;
        document.body.appendChild(this.loadingContainer);
        
        this.progressBar = document.getElementById('loading-progress-fill');
        this.progressText = document.getElementById('loading-progress-text');
        this.loadingMessage = document.getElementById('loading-message');
        
        // Start rotating tips
        this.startTipRotation();
    }

    show() {
        this.loadingContainer.style.display = 'flex';
        this.updateProgress(0);
    }

    hide() {
        // Fade out animation
        this.loadingContainer.style.opacity = '0';
        setTimeout(() => {
            this.loadingContainer.style.display = 'none';
            this.loadingContainer.style.opacity = '1';
        }, 500);
    }

    updateProgress(percentage) {
        this.progressBar.style.width = percentage + '%';
        this.progressText.textContent = Math.round(percentage) + '%';
    }

    setMessage(message) {
        this.loadingMessage.textContent = message;
    }

    startTipRotation() {
        const tips = [
            "Tip: High stamina units can quickly capture enemy havens!",
            "Tip: High HP units make excellent defenders!",
            "Tip: Use physics attacks to knock enemies off the board!",
            "Tip: Combine different unit types for strategic advantage!",
            "Tip: Control the center of the board for tactical superiority!",
            "Tip: Save high attack units for eliminating key targets!",
            "Tip: Use terrain and positioning to your advantage!",
            "Tip: Sometimes retreat is the best strategy!"
        ];
        
        let currentTip = 0;
        const tipElement = document.getElementById('loading-tip');
        
        setInterval(() => {
            currentTip = (currentTip + 1) % tips.length;
            tipElement.style.opacity = '0';
            setTimeout(() => {
                tipElement.textContent = tips[currentTip];
                tipElement.style.opacity = '1';
            }, 300);
        }, 4000);
    }

    // Enhanced asset loading with progress tracking
    async loadAssets() {
        this.show();
        this.setMessage('Loading game assets...');
        
        // Define all assets to load
        this.assetList = [
            // Icons
            { type: 'texture', alias: 'p1_piece', src: 'assets/images/p1_piece.png' },
            { type: 'texture', alias: 'p2_piece', src: 'assets/images/p2_piece.png' },
            { type: 'texture', alias: 'p1_medal', src: 'assets/images/p1_medal.png' },
            { type: 'texture', alias: 'p2_medal', src: 'assets/images/p2_medal.png' },
            
            // Sound effects
            { type: 'sound', alias: 'ui_start', src: 'assets/sounds/ui_start/start.mp3' },
            { type: 'sound', alias: 'ui_click', src: 'assets/sounds/ui_click/drum1.mp3' },
            { type: 'sound', alias: 'pawn_move', src: 'assets/sounds/pawn_move/move.mp3' },
            { type: 'sound', alias: 'elimination', src: 'assets/sounds/elimination/elimination1.wav' },
            
            // Music tracks
            { type: 'music', alias: 'music1', src: 'assets/music/Strauss The Blue Danube.mp3' },
            { type: 'music', alias: 'music2', src: 'assets/music/Strauss Emperor Waltz.mp3' }
        ];
        
        // Add combination icons if they exist
        if (typeof STAT_COMBINATION_TO_ICON_ALIAS !== 'undefined') {
            for (const key in STAT_COMBINATION_TO_ICON_ALIAS) {
                const alias = STAT_COMBINATION_TO_ICON_ALIAS[key];
                if (typeof getCombinationIconPath === 'function') {
                    const path = getCombinationIconPath(alias);
                    if (path) {
                        this.assetList.push({ type: 'texture', alias: alias, src: path });
                    }
                }
            }
        }
        
        this.totalAssets = this.assetList.length;
        this.loadedAssets = 0;
        
        // Load assets with progress tracking
        for (const asset of this.assetList) {
            try {
                this.setMessage(`Loading ${asset.type}: ${asset.alias}...`);
                
                if (asset.type === 'texture') {
                    await this.loadTexture(asset);
                } else if (asset.type === 'sound' || asset.type === 'music') {
                    await this.loadAudio(asset);
                }
                
                this.loadedAssets++;
                this.updateProgress((this.loadedAssets / this.totalAssets) * 100);
                
            } catch (error) {
                console.warn(`Failed to load ${asset.type}: ${asset.alias}`, error);
                // Continue loading other assets even if one fails
                this.loadedAssets++;
                this.updateProgress((this.loadedAssets / this.totalAssets) * 100);
            }
        }
        
        this.setMessage('Loading complete!');
        await this.delay(500); // Show complete message briefly
        
        return true;
    }

    async loadTexture(asset) {
        if (typeof PIXI !== 'undefined') {
            const texture = await PIXI.Assets.load(asset);
            if (texture) {
                // Ensure ICON_TEXTURES exists
                if (typeof ICON_TEXTURES !== 'undefined') {
                    ICON_TEXTURES[asset.alias] = texture;
                } else {
                    window.ICON_TEXTURES = window.ICON_TEXTURES || {};
                    window.ICON_TEXTURES[asset.alias] = texture;
                }
            }
        }
    }

    async loadAudio(asset) {
        return new Promise((resolve) => {
            const audio = new Audio(asset.src);
            audio.addEventListener('canplaythrough', () => resolve(), { once: true });
            audio.addEventListener('error', () => resolve(), { once: true }); // Resolve even on error
            audio.load();
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create global loading screen instance
window.loadingScreen = new LoadingScreen();