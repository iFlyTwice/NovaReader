/**
 * This module loads the top player visibility preference when the extension starts
 * and sets up listeners to keep the UI in sync with the user's preference.
 */

import { getUser, getUserPreferences } from '../supabase/client';

/**
 * Initialize the top player preferences
 * This should be called when the extension starts
 */
export const initializeTopPlayerPrefs = async (): Promise<void> => {
  try {
    // First check local storage
    chrome.storage.local.get(['topPlayerEnabled'], async (result) => {
      let topPlayerEnabled = result.topPlayerEnabled;
      
      // If not found in local storage, check if user is logged in
      if (topPlayerEnabled === undefined) {
        const { user, error } = await getUser();
        
        if (!error && user) {
          // User is logged in, get preferences from database
          const { preferences, error: prefsError } = await getUserPreferences(user.id);
          
          if (!prefsError && preferences && preferences.preferences) {
            // Get top player preference from database
            topPlayerEnabled = preferences.preferences.topPlayerEnabled !== undefined 
              ? preferences.preferences.topPlayerEnabled 
              : true;
            
            // Save to local storage
            chrome.storage.local.set({ topPlayerEnabled });
          } else {
            // Default to true if not found
            topPlayerEnabled = true;
            chrome.storage.local.set({ topPlayerEnabled: true });
          }
        } else {
          // Default to true if not logged in
          topPlayerEnabled = true;
          chrome.storage.local.set({ topPlayerEnabled: true });
        }
      }
      
      // Dispatch event to update top player visibility
      const event = new CustomEvent('update-top-player-visibility', {
        detail: { visible: topPlayerEnabled }
      });
      document.dispatchEvent(event);
      
      console.log(`[TopPlayerPrefs] Initialized top player visibility: ${topPlayerEnabled ? 'visible' : 'hidden'}`);
    });
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.topPlayerEnabled) {
        const newValue = changes.topPlayerEnabled.newValue;
        
        // Dispatch event to update top player visibility
        const event = new CustomEvent('update-top-player-visibility', {
          detail: { visible: newValue }
        });
        document.dispatchEvent(event);
        
        console.log(`[TopPlayerPrefs] Top player visibility changed: ${newValue ? 'visible' : 'hidden'}`);
      }
    });
  } catch (error) {
    console.error('[TopPlayerPrefs] Error initializing top player preferences:', error);
  }
};

// Export the initialization function
export default initializeTopPlayerPrefs;
