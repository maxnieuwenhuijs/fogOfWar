// Physics Test Panel with Live Sliders
class PhysicsTestPanel {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.settings = {
            // Power settings
            powerDivisor: 100,
            maxPower: 15,
            minPowerThreshold: 1,

            // Force settings
            baseForce: 7.5,
            forceMultiplier: 5,

            // Enemy pawn physics
            enemyDensity: 0.0071,
            enemyFrictionAir: 0.01,
            enemyRestitution: 0.75,
            enemyFriction: 0.2,

            // Attacker physics
            attackerDensity: 0.04,
            attackerSpeed: 14,
            attackerFrictionAir: 0,

            // Animation
            maxFrames: 160,
            fadeStartSpeed: 5,
            fadeRate: 0.1
        };

        this.createPanel();
    }

    createPanel() {
        // Remove existing panel if any
        const existing = document.getElementById('physics-test-panel');
        if (existing) existing.remove();

        this.panel = document.createElement('div');
        this.panel.id = 'physics-test-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #4a6ea9;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 10000;
            max-height: 90vh;
            overflow-y: auto;
            width: 350px;
            display: none;
        `;

        this.panel.innerHTML = `
            <h3 style="margin-top: 0; color: #e7c07d; text-align: center;">⚡ Physics Test Panel ⚡</h3>
            <p style="text-align: center; margin-bottom: 20px;">Adjust values and test in real-time!</p>
            
            <div id="physics-sliders"></div>
            
            <div style="margin-top: 20px; border-top: 1px solid #444; padding-top: 10px;">
                <button id="physics-reset-btn" style="
                    background: #e74c3c;
                    border: none;
                    color: white;
                    padding: 8px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    width: 100%;
                    margin-bottom: 10px;
                ">Reset to Defaults</button>
                
                <button id="physics-copy-btn" style="
                    background: #27ae60;
                    border: none;
                    color: white;
                    padding: 8px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    width: 100%;
                ">Copy Current Values</button>
            </div>
            
            <div style="margin-top: 10px; text-align: center;">
                <small>Press P to toggle this panel</small>
            </div>
        `;

        document.body.appendChild(this.panel);

        // Create sliders
        this.createSliders();

        // Setup event handlers
        document.getElementById('physics-reset-btn').onclick = () => this.resetToDefaults();
        document.getElementById('physics-copy-btn').onclick = () => this.copyValues();

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    createSliders() {
        const container = document.getElementById('physics-sliders');

        const sliderGroups = [
            {
                title: '🎯 Power Settings',
                sliders: [
                    { key: 'powerDivisor', label: 'Power Sensitivity', min: 20, max: 200, step: 10 },
                    { key: 'maxPower', label: 'Max Power', min: 1, max: 20, step: 0.5 },
                    { key: 'minPowerThreshold', label: 'Min Power Threshold', min: 0.5, max: 3, step: 0.1 }
                ]
            },
            {
                title: '💥 Force Settings',
                sliders: [
                    { key: 'baseForce', label: 'Base Force', min: 0.5, max: 10, step: 0.5 },
                    { key: 'forceMultiplier', label: 'Force Multiplier', min: 0.5, max: 10, step: 0.5 }
                ]
            },
            {
                title: '🎱 Enemy Physics',
                sliders: [
                    { key: 'enemyDensity', label: 'Mass (Density)', min: 0.0001, max: 0.01, step: 0.0001 },
                    { key: 'enemyFrictionAir', label: 'Air Resistance', min: 0, max: 0.1, step: 0.005 },
                    { key: 'enemyRestitution', label: 'Bounciness', min: 0, max: 1, step: 0.05 },
                    { key: 'enemyFriction', label: 'Surface Friction', min: 0, max: 0.2, step: 0.01 }
                ]
            },
            {
                title: '🏃 Attacker Physics',
                sliders: [
                    { key: 'attackerDensity', label: 'Mass (Density)', min: 0.01, max: 0.2, step: 0.01 },
                    { key: 'attackerSpeed', label: 'Approach Speed', min: 2, max: 20, step: 1 },
                    { key: 'attackerFrictionAir', label: 'Air Resistance', min: 0, max: 0.5, step: 0.05 }
                ]
            },
            {
                title: '🎬 Animation',
                sliders: [
                    { key: 'maxFrames', label: 'Duration (frames)', min: 60, max: 300, step: 10 },
                    { key: 'fadeStartSpeed', label: 'Fade Start Speed', min: 0.5, max: 5, step: 0.5 },
                    { key: 'fadeRate', label: 'Fade Rate', min: 0.01, max: 0.1, step: 0.01 }
                ]
            }
        ];

        container.innerHTML = sliderGroups.map(group => `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #4a6ea9; margin-bottom: 10px;">${group.title}</h4>
                ${group.sliders.map(slider => this.createSliderHTML(slider)).join('')}
            </div>
        `).join('');

        // Add event listeners
        sliderGroups.forEach(group => {
            group.sliders.forEach(slider => {
                const input = document.getElementById(`slider-${slider.key}`);
                const value = document.getElementById(`value-${slider.key}`);

                input.value = this.settings[slider.key];
                value.textContent = this.formatValue(this.settings[slider.key], slider.step);

                input.oninput = (e) => {
                    const val = parseFloat(e.target.value);
                    this.settings[slider.key] = val;
                    value.textContent = this.formatValue(val, slider.step);

                    // Apply changes to physics system
                    this.applySettings();
                };
            });
        });
    }

    createSliderHTML(config) {
        return `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <label>${config.label}:</label>
                    <span id="value-${config.key}" style="color: #e7c07d; font-weight: bold;">
                        ${this.formatValue(this.settings[config.key], config.step)}
                    </span>
                </div>
                <input type="range" 
                    id="slider-${config.key}"
                    min="${config.min}" 
                    max="${config.max}" 
                    step="${config.step}"
                    value="${this.settings[config.key]}"
                    style="width: 100%; cursor: pointer;">
            </div>
        `;
    }

    formatValue(value, step) {
        const decimals = step < 1 ? step.toString().split('.')[1]?.length || 1 : 0;
        return value.toFixed(decimals);
    }

    applySettings() {
        // Apply settings to physics attack system if it exists
        if (window.physicsAttackSystem) {
            // Store settings on the physics system for use
            window.physicsAttackSystem.testSettings = this.settings;
            console.log('Physics settings updated:', this.settings);
        } else {
            console.warn('Physics attack system not found - settings not applied');
        }
    }

    resetToDefaults() {
        this.settings = {
            powerDivisor: 100,
            maxPower: 15,
            minPowerThreshold: 1,
            baseForce: 7.5,
            forceMultiplier: 5,
            enemyDensity: 0.0071,
            enemyFrictionAir: 0.01,
            enemyRestitution: 0.75,
            enemyFriction: 0.2,
            attackerDensity: 0.04,
            attackerSpeed: 14,
            attackerFrictionAir: 0,
            maxFrames: 160,
            fadeStartSpeed: 5,
            fadeRate: 0.1
        };

        // Update all sliders
        Object.keys(this.settings).forEach(key => {
            const input = document.getElementById(`slider-${key}`);
            const value = document.getElementById(`value-${key}`);
            if (input && value) {
                input.value = this.settings[key];
                value.textContent = this.formatValue(this.settings[key], parseFloat(input.step));
            }
        });

        this.applySettings();
        showToast('Physics settings reset to defaults');
    }

    copyValues() {
        const code = `// Physics Settings\nconst physicsSettings = ${JSON.stringify(this.settings, null, 4)};`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                showToast('Settings copied to clipboard!');
            }).catch(() => {
                console.log(code);
                showToast('Settings logged to console');
            });
        } else {
            console.log(code);
            showToast('Settings logged to console');
        }
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.panel.style.display = this.isVisible ? 'block' : 'none';

        if (this.isVisible) {
            showToast('Physics Test Panel opened (Press P to close)');
        }
    }

    show() {
        this.isVisible = true;
        this.panel.style.display = 'block';
    }

    hide() {
        this.isVisible = false;
        this.panel.style.display = 'none';
    }
}

// Create global instance
// Disabled in singleplayer build
// window.physicsTestPanel = new PhysicsTestPanel();