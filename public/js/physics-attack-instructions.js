// Physics Attack Instructions Helper
class PhysicsAttackInstructions {
    static show() {
        // Remove any existing instructions
        this.hide();
        
        const container = document.createElement('div');
        container.id = 'physics-attack-instructions';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #FF0000;
            z-index: 10001;
            max-width: 500px;
            text-align: center;
            font-family: Arial, sans-serif;
        `;
        
        container.innerHTML = `
            <h2 style="color: #FF0000; margin-top: 0;">Physics Attack System</h2>
            <p><strong>How to use:</strong></p>
            <ol style="text-align: left;">
                <li>Select your pawn (click once)</li>
                <li>Move next to an enemy if needed</li>
                <li>When you have attack targets (red highlights), click and HOLD on the ENEMY pawn</li>
                <li>Drag in the direction you want the enemy to fly</li>
                <li>Release to launch the attack!</li>
            </ol>
            <p style="margin-top: 20px;">The drag is limited to 180° away from the enemy.</p>
            <p>Longer drag = more power!</p>
            <button onclick="PhysicsAttackInstructions.hide()" style="
                background: #4a6ea9;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
            ">Got it!</button>
        `;
        
        document.body.appendChild(container);
    }
    
    static hide() {
        const existing = document.getElementById('physics-attack-instructions');
        if (existing) {
            existing.remove();
        }
    }
}

// Add to window for global access
window.PhysicsAttackInstructions = PhysicsAttackInstructions;