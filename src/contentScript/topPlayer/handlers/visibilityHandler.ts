/**
 * Visibility handlers for the top player
 */
import { createLogger } from '../../../utils/logger';

// Create a logger instance for this module
const logger = createLogger('TopPlayer');

export function setupVisibilityListener(topPlayer: any): void {
  document.addEventListener('update-top-player-visibility', (event: any) => {
    const { visible } = event.detail;
    logger.info(`Visibility update received: ${visible ? 'show' : 'hide'}`);
    
    if (visible && !topPlayer.isVisible) {
      logger.info('Triggering show() from visibility event');
      topPlayer.show();
    } else if (!visible) {
      logger.info('Triggering remove() from visibility event');
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
    logger.info(`Initial visibility from storage: ${isVisible ? 'visible' : 'hidden'}`);
    
    if (isVisible) {
      // Force create the player regardless of current state
      logger.info('Creating player during initial visibility check');
      // Use create directly to ensure it's created
      topPlayer.create();
    } else if (topPlayer.playerElement) {
      // If player exists but should be hidden, ensure playback is stopped before removing
      if (topPlayer.isPlaying) {
        topPlayer.stopPlayback();
      }
      logger.info('Removing player during initial visibility check');
      topPlayer.remove();
    }
  });
  
  // Second check - after a short delay
  setTimeout(() => {
    chrome.storage.local.get(['topPlayerEnabled'], (result) => {
      // Default to true if setting doesn't exist
      const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
      logger.info(`Short delay visibility check: ${isVisible ? 'visible' : 'hidden'}`);
      
      if (isVisible && !topPlayer.playerElement) {
        logger.info('Creating player during short delay check');
        topPlayer.create();
      }
    });
  }, 500);
  
  // Third check - after DOM is more likely to be ready
  setTimeout(() => {
    chrome.storage.local.get(['topPlayerEnabled'], (result) => {
      // Default to true if setting doesn't exist
      const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
      logger.info(`Delayed visibility check: ${isVisible ? 'visible' : 'hidden'}`);
      
      if (isVisible && !topPlayer.playerElement) {
        logger.info('Creating player during delayed visibility check');
        topPlayer.create();
      } else if (!isVisible && topPlayer.playerElement) {
        // Ensure playback is stopped before removing
        if (topPlayer.isPlaying) {
          topPlayer.stopPlayback();
        }
        logger.info('Removing player during delayed visibility check');
        topPlayer.remove();
      }
    });
  }, 1500);
  
  // Final check - after page is fully loaded
  window.addEventListener('load', () => {
    chrome.storage.local.get(['topPlayerEnabled'], (result) => {
      // Default to true if setting doesn't exist
      const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
      logger.info(`Window load visibility check: ${isVisible ? 'visible' : 'hidden'}`);
      
      if (isVisible && !topPlayer.playerElement) {
        logger.info('Creating player during window load check');
        topPlayer.create();
      }
    });
  });
  
  // Mutation observer to detect DOM changes that might affect player insertion
  const observer = new MutationObserver(() => {
    chrome.storage.local.get(['topPlayerEnabled'], (result) => {
      const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
      
      if (isVisible && !topPlayer.playerElement && !topPlayer.insertionInProgress) {
        logger.info('DOM changed, attempting to create player');
        topPlayer.create();
      }
    });
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Stop the observer after 10 seconds to prevent performance issues
  setTimeout(() => {
    observer.disconnect();
    logger.info('Stopped DOM mutation observer');
  }, 10000);
}

export function toggleVisibility(topPlayer: any): void {
  chrome.storage.local.get(['topPlayerEnabled'], (result) => {
    // Default to true if setting doesn't exist
    const currentVisibility = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
    const newVisibility = !currentVisibility;
    
    // Save new setting
    chrome.storage.local.set({ topPlayerEnabled: newVisibility }, () => {
      logger.info(`Visibility toggled to: ${newVisibility ? 'visible' : 'hidden'}`);
      
      // Update visibility
      if (newVisibility) {
        logger.info('Showing player after toggle');
        topPlayer.show();
      } else {
        logger.info('Removing player after toggle');
        // First check and stop any active playback before removing
        if (topPlayer.isPlaying) {
          topPlayer.stopPlayback();
        }
        topPlayer.remove();
      }
    });
  });
}
