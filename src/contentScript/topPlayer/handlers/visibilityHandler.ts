/**
 * Visibility handlers for the top player
 */

export function setupVisibilityListener(topPlayer: any): void {
  document.addEventListener('update-top-player-visibility', (event: any) => {
    const { visible } = event.detail;
    console.log(`📖 [TopPlayer] Visibility update received: ${visible ? 'show' : 'hide'}`);
    
    if (visible && !topPlayer.isVisible) {
      console.log('📖 [TopPlayer] Triggering show() from visibility event');
      topPlayer.show();
    } else if (!visible) {
      console.log('📖 [TopPlayer] Triggering remove() from visibility event');
      topPlayer.remove(); // Use remove instead of hide to fully remove it from DOM
    }
  });
}

export function checkInitialVisibility(topPlayer: any): void {
  chrome.storage.local.get(['topPlayerEnabled'], (result) => {
    // Default to true if setting doesn't exist
    const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
    console.log(`📖 [TopPlayer] Initial visibility from storage: ${isVisible ? 'visible' : 'hidden'}`);
    
    if (isVisible) {
      // If it should be visible, check if it needs to be created
      // But delay slightly to allow for page to load
      setTimeout(() => {
        if (!topPlayer.playerElement && !topPlayer.insertionInProgress) {
          console.log('📖 [TopPlayer] Creating player during initial visibility check');
          topPlayer.show();
        }
      }, 500);
    } else if (topPlayer.playerElement) {
      // If player exists but should be hidden, remove it
      console.log('📖 [TopPlayer] Removing player during initial visibility check');
      topPlayer.remove();
    }
  });
  
  // Additional check shortly after page load when DOM is more likely to be ready
  setTimeout(() => {
    chrome.storage.local.get(['topPlayerEnabled'], (result) => {
      // Default to true if setting doesn't exist
      const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
      console.log(`📖 [TopPlayer] Delayed visibility check: ${isVisible ? 'visible' : 'hidden'}`);
      
      if (isVisible && !topPlayer.playerElement && !topPlayer.insertionInProgress) {
        console.log('📖 [TopPlayer] Creating player during delayed visibility check');
        topPlayer.show();
      } else if (!isVisible && topPlayer.playerElement) {
        console.log('📖 [TopPlayer] Removing player during delayed visibility check');
        topPlayer.remove();
      }
    });
  }, 1500);
}

export function toggleVisibility(topPlayer: any): void {
  chrome.storage.local.get(['topPlayerEnabled'], (result) => {
    // Default to true if setting doesn't exist
    const currentVisibility = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
    const newVisibility = !currentVisibility;
    
    // Save new setting
    chrome.storage.local.set({ topPlayerEnabled: newVisibility }, () => {
      console.log(`📖 [TopPlayer] Visibility toggled to: ${newVisibility ? 'visible' : 'hidden'}`);
      
      // Update visibility
      if (newVisibility) {
        console.log('📖 [TopPlayer] Showing player after toggle');
        topPlayer.show();
      } else {
        console.log('📖 [TopPlayer] Removing player after toggle');
        topPlayer.remove();
      }
    });
  });
}