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
      // First check and stop any active playback before removing the player
      if (topPlayer.isPlaying) {
        topPlayer.stopPlayback();
      }
      topPlayer.remove(); // Use remove instead of hide to fully remove it from DOM
    }
  });
}

export function checkInitialVisibility(topPlayer: any): void {
  // First check - immediate
  chrome.storage.local.get(['topPlayerEnabled'], (result) => {
    // Default to true if setting doesn't exist
    const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
    console.log(`📖 [TopPlayer] Initial visibility from storage: ${isVisible ? 'visible' : 'hidden'}`);
    
    if (isVisible) {
      // Force create the player regardless of current state
      console.log('📖 [TopPlayer] Creating player during initial visibility check');
      // Use create directly to ensure it's created
      topPlayer.create();
    } else if (topPlayer.playerElement) {
      // If player exists but should be hidden, ensure playback is stopped before removing
      if (topPlayer.isPlaying) {
        topPlayer.stopPlayback();
      }
      console.log('📖 [TopPlayer] Removing player during initial visibility check');
      topPlayer.remove();
    }
  });
  
  // Second check - after a short delay
  setTimeout(() => {
    chrome.storage.local.get(['topPlayerEnabled'], (result) => {
      // Default to true if setting doesn't exist
      const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
      console.log(`📖 [TopPlayer] Short delay visibility check: ${isVisible ? 'visible' : 'hidden'}`);
      
      if (isVisible && !topPlayer.playerElement) {
        console.log('📖 [TopPlayer] Creating player during short delay check');
        topPlayer.create();
      }
    });
  }, 500);
  
  // Third check - after DOM is more likely to be ready
  setTimeout(() => {
    chrome.storage.local.get(['topPlayerEnabled'], (result) => {
      // Default to true if setting doesn't exist
      const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
      console.log(`📖 [TopPlayer] Delayed visibility check: ${isVisible ? 'visible' : 'hidden'}`);
      
      if (isVisible && !topPlayer.playerElement) {
        console.log('📖 [TopPlayer] Creating player during delayed visibility check');
        topPlayer.create();
      } else if (!isVisible && topPlayer.playerElement) {
        // Ensure playback is stopped before removing
        if (topPlayer.isPlaying) {
          topPlayer.stopPlayback();
        }
        console.log('📖 [TopPlayer] Removing player during delayed visibility check');
        topPlayer.remove();
      }
    });
  }, 1500);
  
  // Final check - after page is fully loaded
  window.addEventListener('load', () => {
    chrome.storage.local.get(['topPlayerEnabled'], (result) => {
      // Default to true if setting doesn't exist
      const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
      console.log(`📖 [TopPlayer] Window load visibility check: ${isVisible ? 'visible' : 'hidden'}`);
      
      if (isVisible && !topPlayer.playerElement) {
        console.log('📖 [TopPlayer] Creating player during window load check');
        topPlayer.create();
      }
    });
  });
  
  // Mutation observer to detect DOM changes that might affect player insertion
  const observer = new MutationObserver(() => {
    chrome.storage.local.get(['topPlayerEnabled'], (result) => {
      const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
      
      if (isVisible && !topPlayer.playerElement && !topPlayer.insertionInProgress) {
        console.log('📖 [TopPlayer] DOM changed, attempting to create player');
        topPlayer.create();
      }
    });
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Stop the observer after 10 seconds to prevent performance issues
  setTimeout(() => {
    observer.disconnect();
    console.log('📖 [TopPlayer] Stopped DOM mutation observer');
  }, 10000);
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
        // First check and stop any active playback before removing
        if (topPlayer.isPlaying) {
          topPlayer.stopPlayback();
        }
        topPlayer.remove();
      }
    });
  });
}
