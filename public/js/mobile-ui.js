// --- START OF FILE public/js/mobile-ui.js ---
(function () {
    function initMobileUI() {
        const drawer = document.getElementById('card-ui-area');
        const handle = null; // removed legacy handle
        const chatBtn = document.getElementById('btn-chat');
        const settingsBtn = document.getElementById('btn-settings');
        const chatPanel = document.getElementById('chat-panel');
        const infoPanel = document.getElementById('game-info-panel');
        const leftCol = document.getElementById('left-column');

        const setDrawerOpen = (open) => {
            if (!drawer) return;
            if (open) drawer.classList.add('open'); else drawer.classList.remove('open');
            try { if (window.SpLogger) SpLogger.log('ui.drawer.toggle', { open }); } catch (_) { }
        };
        const isDrawerOpen = () => !!drawer && drawer.classList.contains('open');
        const toggleDrawer = () => setDrawerOpen(!isDrawerOpen());
        
        // Add swipe gesture support for card drawer
        let touchStartY = 0;
        let touchStartTime = 0;
        let drawerStartOpen = false;
        
        const handleTouchStart = (e) => {
            if (!drawer) return;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            drawerStartOpen = isDrawerOpen();
        };
        
        const handleTouchEnd = (e) => {
            if (!drawer) return;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = touchEndY - touchStartY;
            const deltaTime = Date.now() - touchStartTime;
            
            // Quick swipe detection (less than 300ms and more than 50px movement)
            if (deltaTime < 300 && Math.abs(deltaY) > 50) {
                if (deltaY > 0 && drawerStartOpen) {
                    // Swipe down - close drawer
                    setDrawerOpen(false);
                    try { if (window.SpLogger) SpLogger.log('ui.drawer.swipe', { direction: 'down', action: 'close' }); } catch (_) { }
                } else if (deltaY < 0 && !drawerStartOpen) {
                    // Swipe up - open drawer
                    setDrawerOpen(true);
                    try { if (window.SpLogger) SpLogger.log('ui.drawer.swipe', { direction: 'up', action: 'open' }); } catch (_) { }
                }
            }
        };
        
        // Attach swipe handlers to drawer
        if (drawer) {
            drawer.addEventListener('touchstart', handleTouchStart, { passive: true });
            drawer.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
        
        // Also add swipe detection to the game board area for opening drawer
        const boardWrapper = document.getElementById('board-background-wrapper');
        if (boardWrapper) {
            boardWrapper.addEventListener('touchstart', (e) => {
                // Only track if drawer is closed and touch is in bottom third of screen
                if (!isDrawerOpen() && e.touches[0].clientY > window.innerHeight * 0.66) {
                    touchStartY = e.touches[0].clientY;
                    touchStartTime = Date.now();
                    drawerStartOpen = false;
                }
            }, { passive: true });
            
            boardWrapper.addEventListener('touchend', (e) => {
                if (!isDrawerOpen()) {
                    const touchEndY = e.changedTouches[0].clientY;
                    const deltaY = touchEndY - touchStartY;
                    const deltaTime = Date.now() - touchStartTime;
                    
                    // Swipe up from bottom to open drawer
                    if (deltaTime < 300 && deltaY < -50) {
                        setDrawerOpen(true);
                        try { if (window.SpLogger) SpLogger.log('ui.drawer.swipe', { direction: 'up', action: 'open', source: 'board' }); } catch (_) { }
                    }
                }
            }, { passive: true });
        }
        // Expose globally so other modules (and console) can control the drawer
        try {
            window.MobileUI = Object.assign(window.MobileUI || {}, { setDrawerOpen, toggleDrawer, isDrawerOpen });
            // Convenience globals
            window.showCards = () => setDrawerOpen(true);
            window.hideCards = () => setDrawerOpen(false);
        } catch (_) { }
        // Toggle by tapping the top area of card-definition-ui
        try {
            const cardDef = document.getElementById('card-definition-ui');
            if (cardDef) {
                // Create an invisible header strip to capture taps
                const headerStrip = document.createElement('div');
                headerStrip.id = 'card-drawer-header';
                headerStrip.style.cssText = 'position: sticky; top: 0; height: 36px; margin-top: -36px; z-index: 1;';
                cardDef.prepend(headerStrip);
                const onToggleTap = (e) => {
                    // Only react if the tap is on the header or the main <h3> row
                    const isHeader = e.target.id === 'card-drawer-header' || e.target.closest('#card-drawer-header');
                    const isTitle = e.target.closest('#card-definition-ui h3');
                    if (isHeader || isTitle) {
                        toggleDrawer();
                        try { window.SpLogger && SpLogger.log('ui.cards.toggle', { open: isDrawerOpen(), src: isHeader ? 'header' : 'title' }); } catch (_) { }
                        e.stopPropagation();
                    }
                };
                cardDef.addEventListener('click', onToggleTap);
            }
        } catch (_) { }
        // When drawer is closed, ignore pointer events within its body to allow board taps
        try {
            // Create a proxy tab to reopen the drawer when closed (since drawer ignores pointer events)
            let proxyTab;
            const ensureProxyTab = () => {
                if (proxyTab) return proxyTab;
                proxyTab = document.createElement('div');
                proxyTab.id = 'card-drawer-proxy';
                proxyTab.style.position = 'fixed';
                proxyTab.style.bottom = '0px';
                proxyTab.style.zIndex = '2001';
                proxyTab.style.padding = '0px';
                proxyTab.style.left = '0';
                proxyTab.style.right = '0';
                proxyTab.style.width = '100%';
                proxyTab.style.height = '60px';
                proxyTab.style.borderRadius = '0px';
                proxyTab.style.boxShadow = 'none';
                proxyTab.style.opacity = '1';
                proxyTab.style.cursor = 'pointer';
                proxyTab.style.userSelect = 'none';
                proxyTab.style.display = 'block';
                proxyTab.style.background = 'transparent';
                proxyTab.style.color = 'transparent';
                proxyTab.setAttribute('aria-label', 'Toggle cards');
                proxyTab.textContent = '';
                proxyTab.addEventListener('click', () => {
                    setDrawerOpen(true);
                    try { window.SpLogger && SpLogger.log('ui.cards.toggle', { open: true, src: 'proxy' }); } catch (_) { }
                });
                document.body.appendChild(proxyTab);
                return proxyTab;
            };

            const syncPointerState = () => {
                if (!drawer) return;
                // Only apply pointer-events changes on mobile
                const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
                if (!isMobile) {
                    drawer.style.pointerEvents = 'auto';
                    if (proxyTab) proxyTab.style.display = 'none';
                    return;
                }
                if (drawer.classList.contains('open')) {
                    drawer.style.pointerEvents = 'auto';
                    // hide proxy when open
                    if (proxyTab) proxyTab.style.display = 'none';
                } else {
                    drawer.style.pointerEvents = 'none';
                    // show proxy when closed
                    ensureProxyTab().style.display = 'block';
                }
            };
            syncPointerState();
            drawer?.addEventListener('transitionend', syncPointerState);
        } catch (_) { }
        // On mobile portrait, move panels out of hidden left column so they can appear
        try {
            const isPortraitMobile = window.matchMedia && window.matchMedia('(max-width: 1024px) and (orientation: portrait)').matches;
            if (isPortraitMobile) {
                if (chatPanel && leftCol && leftCol.contains(chatPanel)) {
                    document.body.appendChild(chatPanel);
                }
                if (infoPanel && leftCol && leftCol.contains(infoPanel)) {
                    document.body.appendChild(infoPanel);
                }
            }
        } catch (_) { }

        if (chatBtn && chatPanel) {
            chatBtn.addEventListener('click', () => {
                chatPanel.classList.toggle('open');
                try { if (window.SpLogger) SpLogger.log('ui.chat.toggle', { open: chatPanel.classList.contains('open') }); } catch (_) { }
            });
        }
        // Removed btn-cards (top-bar toggle); drawer is toggled via header/title and bottom proxy

        // Auto-close drawer after player clicks a card item (to link a pawn next)
        try {
            document.addEventListener('click', (e) => {
                const inCardArea = e.target.closest('#card-ui-area');
                const clickedCardItem = e.target.closest('.card-item');
                if (inCardArea && clickedCardItem) {
                    setTimeout(() => setDrawerOpen(false), 60);
                }
            });
        } catch (_) { }

        // Position floating buttons under the stats bar
        try {
            const statsBar = document.querySelector('.game-stats-bar');
            const btnChat = document.getElementById('btn-chat');
            const btnSettings = document.getElementById('btn-settings');
            const updateButtonsPos = () => {
                if (!statsBar || !btnChat || !btnSettings) return;
                const rect = statsBar.getBoundingClientRect();
                // Reduced offset from 36 to 8 pixels for better positioning
                const top = Math.max(35, rect.top + rect.height + 8);
                btnChat.style.top = `${top}px`;
                btnSettings.style.top = `${top}px`;
                btnChat.style.zIndex = '1000';
                btnSettings.style.zIndex = '1000';
                btnChat.style.pointerEvents = 'auto';
                btnSettings.style.pointerEvents = 'auto';
                // Guard against overlays capturing events
                btnChat.style.position = 'fixed';
                btnSettings.style.position = 'fixed';
            };
            updateButtonsPos();
            window.addEventListener('resize', updateButtonsPos, { passive: true });
            window.addEventListener('orientationchange', updateButtonsPos, { passive: true });
            // Ensure taps on floating buttons are logged and not blocked
            ;[btnChat, btnSettings].forEach(btn => btn && btn.addEventListener('pointerdown', (e) => {
                try { window.SpLogger && SpLogger.log('ui.button.pointerdown', { id: btn.id }); } catch (_) { }
                e.stopPropagation();
            }, { passive: true }));
        } catch (_) { }

        // Re-open drawer on our linking turns via a custom event
        try {
            window.addEventListener('sp-open-drawer-for-link', () => setDrawerOpen(true));
        } catch (_) { }
        if (settingsBtn && infoPanel) {
            settingsBtn.addEventListener('click', () => {
                // Toggle info/volume panel as a modal overlay on mobile
                if (infoPanel.style.display === 'none' || getComputedStyle(infoPanel).display === 'none') {
                    infoPanel.style.display = 'block';
                    infoPanel.style.position = 'fixed';
                    infoPanel.style.left = '10px';
                    infoPanel.style.right = '10px';
                    infoPanel.style.bottom = '10px';
                    infoPanel.style.zIndex = '21';
                    infoPanel.style.maxHeight = '70vh';
                } else {
                    infoPanel.style.display = 'none';
                }
                try { if (window.SpLogger) SpLogger.log('ui.settings.toggle', { open: (infoPanel.style.display !== 'none') }); } catch (_) { }
            });
            // Start hidden on mobile
            if (window.matchMedia && window.matchMedia('(max-width: 1024px)').matches) {
                infoPanel.style.display = 'none';
            }
        }

        // Optional: desktop/keyboard quick toggle (press "c")
        try {
            window.addEventListener('keydown', (e) => {
                // Avoid typing in inputs/textareas
                const t = e.target;
                if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
                if ((e.key === 'c' || e.key === 'C')) toggleDrawer();
            });
        } catch (_) { }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileUI);
    } else {
        initMobileUI();
    }
})();
// --- END OF FILE public/js/mobile-ui.js ---

