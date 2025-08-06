// Test menu for quickly setting up game scenarios
class TestMenu {
    constructor() {
        this.isVisible = false;
        this.menuElement = null;
        this.initialize();
    }

    initialize() {
        // Create test menu UI
        this.createMenuUI();
        
        // Add keyboard shortcut (F9) to toggle menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                this.toggle();
            }
        });
        
        console.log("Test menu initialized. Press F9 to toggle.");
    }

    createMenuUI() {
        // Create menu container
        this.menuElement = document.createElement('div');
        this.menuElement.id = 'test-menu';
        this.menuElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #4a6ea9;
            border-radius: 10px;
            padding: 20px;
            z-index: 10000;
            display: none;
            color: white;
            font-family: Arial, sans-serif;
            min-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        // Add title
        const title = document.createElement('h2');
        title.textContent = 'Test Menu';
        title.style.cssText = 'margin-top: 0; text-align: center; color: #e7c07d;';
        this.menuElement.appendChild(title);

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
        `;
        closeBtn.onclick = () => this.hide();
        this.menuElement.appendChild(closeBtn);

        // Add scenario buttons
        const scenarios = [
            {
                name: 'Face-off Test',
                description: 'Two pawns facing each other in the center',
                action: () => this.setupFaceOffTest()
            },
            {
                name: 'Physics Attack Test',
                description: 'Multiple pawns for physics attack testing',
                action: () => this.setupPhysicsTest()
            },
            {
                name: 'Movement Test',
                description: 'Pawns spread across the board',
                action: () => this.setupMovementTest()
            },
            {
                name: 'Wall Bounce Test',
                description: 'Pawns near walls for bounce testing',
                action: () => this.setupWallBounceTest()
            },
            {
                name: 'Clear Board',
                description: 'Remove all pawns from the board',
                action: () => this.clearBoard()
            }
        ];

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 20px;';

        scenarios.forEach(scenario => {
            const button = document.createElement('button');
            button.style.cssText = `
                background: #4a6ea9;
                border: none;
                color: white;
                padding: 15px;
                border-radius: 5px;
                cursor: pointer;
                text-align: left;
                transition: background 0.3s;
            `;
            button.onmouseover = () => button.style.background = '#5a7eb9';
            button.onmouseout = () => button.style.background = '#4a6ea9';
            
            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
            nameDiv.textContent = scenario.name;
            
            const descDiv = document.createElement('div');
            descDiv.style.cssText = 'font-size: 12px; opacity: 0.8;';
            descDiv.textContent = scenario.description;
            
            button.appendChild(nameDiv);
            button.appendChild(descDiv);
            button.onclick = () => {
                scenario.action();
                this.hide();
            };
            
            buttonContainer.appendChild(button);
        });

        this.menuElement.appendChild(buttonContainer);

        // Add info text
        const info = document.createElement('p');
        info.style.cssText = 'margin-top: 20px; font-size: 12px; text-align: center; opacity: 0.7;';
        info.textContent = 'Press F9 to toggle this menu';
        this.menuElement.appendChild(info);

        // Append to body
        document.body.appendChild(this.menuElement);
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.menuElement.style.display = 'block';
        this.isVisible = true;
    }

    hide() {
        this.menuElement.style.display = 'none';
        this.isVisible = false;
    }
    
    exitTestMode() {
        if (typeof gameState !== 'undefined' && gameState) {
            gameState.testMode = false;
        }
        console.log("Exited test mode");
    }

    // Helper to ensure game screen is visible
    ensureGameScreen() {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.add('active');
        }
        
        // Initialize game session if needed
        if (typeof gameSession === 'undefined' || !gameSession) {
            window.gameSession = {
                roomCode: 'TEST00',
                playerNumber: 1,
                players: {
                    1: { name: 'Test Player 1', ready: true },
                    2: { name: 'Test Player 2', ready: true }
                },
                initialGameState: {
                    currentPhase: 'ACTION',
                    cycleNumber: 1,
                    roundNumber: 1,
                    currentPlayer: 1
                }
            };
        }
        
        // Initialize game state if needed
        if (typeof gameState === 'undefined' || !gameState) {
            window.gameState = {
                currentPhase: 'ACTION',
                currentPlayer: 1,
                playerNumber: 1,
                cycleNumber: 1,
                roundNumber: 1,
                players: {
                    1: { pawns: [] },
                    2: { pawns: [] }
                },
                isAnimating: false,
                testMode: true  // Flag to indicate test mode
            };
        } else {
            // Set test mode flag on existing state
            gameState.testMode = true;
        }
        
        // Initialize game if needed
        if (typeof initGame === 'function') {
            // Check if game is already initialized
            if (!app || !app.stage || app.stage.children.length === 0) {
                console.log("Test menu: Initializing game...");
                initGame(1);
            } else {
                console.log("Test menu: Game already initialized");
            }
        }
        
        // Update UI to show action phase
        if (typeof updateActionUI === 'function') {
            setTimeout(() => {
                updateActionUI(null);
            }, 500);
        }
    }

    // Test scenario setups
    setupFaceOffTest() {
        console.log("Setting up face-off test...");
        
        this.ensureGameScreen();
        
        // Clear existing pawns
        this.clearBoard();
        
        // Force game into action phase
        if (typeof gameState !== 'undefined') {
            gameState.currentPhase = 'ACTION';
            gameState.currentPlayer = 1;
            gameState.playerNumber = 1;
            gameState.cycleNumber = 1;
            gameState.roundNumber = 1;
        }

        // Create test pawns
        setTimeout(() => {
            // Player 1 pawn at center-left
            this.createTestPawn(1, 'p1_test_1', 4, 5, {
                hp: 3,
                maxHp: 3,
                stamina: 5,
                maxStamina: 5,
                attack: 3
            });

            // Player 2 pawn at center-right
            this.createTestPawn(2, 'p2_test_1', 6, 5, {
                hp: 2,
                maxHp: 2,
                stamina: 3,
                maxStamina: 3,
                attack: 2
            });

            this.showToast("Face-off test ready! Select P1 pawn to attack.");
        }, 100);
    }

    setupPhysicsTest() {
        console.log("Setting up physics test...");
        
        this.ensureGameScreen();
        this.clearBoard();
        
        if (typeof gameState !== 'undefined') {
            gameState.currentPhase = 'ACTION';
            gameState.currentPlayer = 1;
            gameState.playerNumber = 1;
        }

        setTimeout(() => {
            // Attacking pawn
            this.createTestPawn(1, 'p1_physics_1', 3, 5, {
                hp: 5,
                maxHp: 5,
                stamina: 5,
                maxStamina: 5,
                attack: 5
            });

            // Target pawn
            this.createTestPawn(2, 'p2_physics_target', 5, 5, {
                hp: 1,
                maxHp: 1,
                stamina: 1,
                maxStamina: 1,
                attack: 1
            });

            // Obstacle pawns
            this.createTestPawn(2, 'p2_physics_2', 7, 5, {
                hp: 3,
                maxHp: 3,
                stamina: 1,
                maxStamina: 1,
                attack: 1
            });

            this.createTestPawn(2, 'p2_physics_3', 5, 3, {
                hp: 3,
                maxHp: 3,
                stamina: 1,
                maxStamina: 1,
                attack: 1
            });

            this.createTestPawn(2, 'p2_physics_4', 5, 7, {
                hp: 3,
                maxHp: 3,
                stamina: 1,
                maxStamina: 1,
                attack: 1
            });

            this.showToast("Physics test ready! 1) Click P1 pawn to select 2) Click and hold on ENEMY pawn 3) Drag in direction to launch");
            
            // Show instructions
            if (typeof PhysicsAttackInstructions !== 'undefined') {
                PhysicsAttackInstructions.show();
            }
            
            // Show physics test panel
            if (typeof physicsTestPanel !== 'undefined') {
                physicsTestPanel.show();
            }
        }, 100);
    }

    setupMovementTest() {
        console.log("Setting up movement test...");
        
        this.ensureGameScreen();
        this.clearBoard();
        
        if (typeof gameState !== 'undefined') {
            gameState.currentPhase = 'ACTION';
            gameState.currentPlayer = 1;
            gameState.playerNumber = 1;
        }

        setTimeout(() => {
            // Create pawns with different stamina values
            const positions = [
                {x: 2, y: 2, stamina: 1},
                {x: 8, y: 2, stamina: 3},
                {x: 2, y: 8, stamina: 5},
                {x: 8, y: 8, stamina: 2},
                {x: 5, y: 5, stamina: 4}
            ];

            positions.forEach((pos, i) => {
                this.createTestPawn(1, `p1_move_${i}`, pos.x, pos.y, {
                    hp: 3,
                    maxHp: 3,
                    stamina: pos.stamina,
                    maxStamina: pos.stamina,
                    attack: 2
                });
            });

            this.showToast("Movement test ready! Pawns have different stamina values.");
        }, 100);
    }

    setupWallBounceTest() {
        console.log("Setting up wall bounce test...");
        
        this.ensureGameScreen();
        this.clearBoard();
        
        if (typeof gameState !== 'undefined') {
            gameState.currentPhase = 'ACTION';
            gameState.currentPlayer = 1;
            gameState.playerNumber = 1;
        }

        setTimeout(() => {
            // Attacker near center
            this.createTestPawn(1, 'p1_bounce_1', 5, 5, {
                hp: 5,
                maxHp: 5,
                stamina: 5,
                maxStamina: 5,
                attack: 5
            });

            // Targets near walls
            this.createTestPawn(2, 'p2_bounce_top', 5, 1, {
                hp: 2,
                maxHp: 2,
                stamina: 1,
                maxStamina: 1,
                attack: 1
            });

            this.createTestPawn(2, 'p2_bounce_right', 9, 5, {
                hp: 2,
                maxHp: 2,
                stamina: 1,
                maxStamina: 1,
                attack: 1
            });

            this.createTestPawn(2, 'p2_bounce_bottom', 5, 9, {
                hp: 2,
                maxHp: 2,
                stamina: 1,
                maxStamina: 1,
                attack: 1
            });

            this.createTestPawn(2, 'p2_bounce_left', 1, 5, {
                hp: 2,
                maxHp: 2,
                stamina: 1,
                maxStamina: 1,
                attack: 1
            });

            this.showToast("Wall bounce test ready! Attack pawns near walls.");
        }, 100);
    }

    createTestPawn(player, id, gridX, gridY, stats) {
        // Create pawn instance
        const pawn = new Pawn(id, player, gridX, gridY);
        
        // Create and link a test card
        const card = {
            id: `test_card_${id}`,
            hp: stats.hp,
            maxHp: stats.maxHp,
            stamina: stats.stamina,
            maxStamina: stats.maxStamina,
            attack: stats.attack,
            player: player
        };
        
        // Set up the pawn with the card
        pawn.linkedCard = card;
        pawn.currentHP = stats.hp;
        pawn.remainingStamina = stats.stamina;
        pawn.isActive = true;
        pawn.hasActedThisCycle = false;
        
        // Create visual if not already created
        if (!pawn.graphics) {
            pawn.createVisual();
        }
        
        // Update display
        pawn.updateStatsDisplay(card, pawn.currentHP);
        pawn.updateBars();
        
        // Add to game state
        if (typeof gameState !== 'undefined' && gameState.players) {
            if (!gameState.players[player]) {
                gameState.players[player] = { pawns: [] };
            }
            gameState.players[player].pawns.push(pawn);
        }
        
        // Make sure pawn is active and visible
        if (pawn.pixiObject) {
            pawn.pixiObject.alpha = 1;
            pawn.pixiObject.visible = true;
        }
        
        console.log(`Created test pawn: ${id} at (${gridX}, ${gridY}) with stats:`, stats);
    }

    clearBoard() {
        console.log("Clearing board...");
        
        if (typeof gameState !== 'undefined' && gameState.players) {
            // Remove all pawns
            Object.values(gameState.players).forEach(player => {
                if (player.pawns) {
                    player.pawns.forEach(pawn => {
                        if (pawn.pixiObject && !pawn.pixiObject.destroyed) {
                            pawn.destroyVisual();
                        }
                    });
                    player.pawns = [];
                }
            });
        }
        
        // Clear any highlights
        if (typeof clearHighlights === 'function') {
            clearHighlights();
        }
        
        this.showToast("Board cleared!");
    }

    showToast(message) {
        if (typeof showToast === 'function') {
            showToast(message);
        } else {
            console.log(message);
        }
    }
}

// Create global instance
let testMenu = null;

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        testMenu = new TestMenu();
    });
} else {
    testMenu = new TestMenu();
}