/**
 * Visibility handlers for the top player
 */

export function setupVisibilityListener(topPlayer: any): void {
  document.addEventListener('update-top-player-visibility', (event: any) => {
    const { visible } = event.detail;
    console.log(`📖 [TopPlayer] Visibility update received: ${visible ? 'show' : 'hide'}`);
    
    if (visible && !topPlayer.isVisible) {
      topPlayer.show();
    } else if (!visible) {
      topPlayer.remove(); // Use remove instead of hide to fully remove it from DOM
    }
  });
}

export function checkInitialVisibility(topPlayer: any): void {
  chrome.storage.local.get(['topPlayerEnabled'], (result) => {
    // Default to true if setting doesn't exist
    const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
    console.log(`📖 [TopPlayer] Initial visibility from storage: ${isVisible ? 'visible' : 'hidden'}`);
    
    if (!isVisible && topPlayer.playerElement) {
      // If player exists but should be hidden, remove it
      topPlayer.remove();
    }
  });
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
        topPlayer.show();
      } else {
        topPlayer.remove();
      }
    });
  });
}
