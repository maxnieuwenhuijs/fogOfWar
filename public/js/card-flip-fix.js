// This script fixes the issue with cards flipping when any card is clicked
(function() {
  let observer = null;
  
  // Function to apply the fix to a specific card
  function fixCard(card) {
    // Remove any click handlers on linked cards
    card.onclick = null;
    card.style.cursor = "not-allowed";

    // When card is freshly linked, it has 'linked' class but not 'already-flipped'
    // We let the animation play once, then add 'already-flipped' class
    if (
      card.classList.contains("linked") &&
      !card.classList.contains("already-flipped")
    ) {
      if (card.dataset.cardId) {
        console.log("Card will be animated once:", card.dataset.cardId);
      }

      // Wait for animation to finish before adding already-flipped class
      setTimeout(() => {
        card.classList.add("already-flipped");
        if (card.dataset.cardId) {
          console.log("Card marked as already flipped:", card.dataset.cardId);
        }
      }, 600); // Match the CSS animation duration
    }
  }

  // Function to apply the fix to all linked cards
  function applyCardFlipFix() {
    // Find all linked cards that haven't been marked already-flipped
    const linkedCards = document.querySelectorAll(
      ".card-item.linked:not(.already-flipped)"
    );
    linkedCards.forEach(fixCard);

    // Also ensure all already-flipped cards have no click handlers
    const alreadyFlippedCards = document.querySelectorAll(
      ".card-item.already-flipped"
    );
    alreadyFlippedCards.forEach((card) => {
      card.onclick = null;
      card.style.cursor = "not-allowed";
    });
  }

  // Function to start the card flip fix when game starts
  window.startCardFlipFix = function() {
    console.log("Starting card flip fix for game");
    
    // Apply the fix initially
    applyCardFlipFix();

    // Stop any existing observer
    if (observer) {
      observer.disconnect();
    }

    // Set up a MutationObserver to watch for changes to the DOM
    observer = new MutationObserver(function (mutations) {
      let needsFix = false;

      mutations.forEach(function (mutation) {
        // If class attributes changed on a card element
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class" &&
          mutation.target.classList.contains("card-item") &&
          mutation.target.classList.contains("linked")
        ) {
          // Only apply fix if the card is newly linked (doesn't have already-flipped class)
          if (!mutation.target.classList.contains("already-flipped")) {
            fixCard(mutation.target);
          }
        }
        // If new nodes were added
        else if (mutation.type === "childList") {
          needsFix = true;
        }
      });

      // If new nodes were added, check for any new linked cards
      if (needsFix) {
        applyCardFlipFix();
      }
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  };
  
  // Function to stop the card flip fix when leaving game
  window.stopCardFlipFix = function() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };
})();