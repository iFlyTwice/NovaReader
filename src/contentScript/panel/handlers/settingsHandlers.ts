/**
 * Settings handlers for the side panel
 */

import { updateHighlightingState, updateSelectionButtonColor, updateTopPlayerVisibility } from '../utils/panelEvents';
import { getUser, saveUserPreferences } from '../../../supabase/client';
import { includeTopPlayerInPreferences } from '../../../supabase/topPlayerSettings';

// Sync settings to Supabase
export async function syncSettingsToSupabase(showStatus: boolean = true): Promise<boolean> {
  try {
    // Get current user
    const { user, error } = await getUser();
    
    if (error || !user) {
      console.error('[Settings] Sync failed: Not logged in');
      return false;
    }
    
    // Get the sync status element if we need to show status
    let syncStatus: HTMLElement | null = null;
    if (showStatus) {
      syncStatus = document.querySelector('#sync-status');
      if (syncStatus) {
        syncStatus.textContent = 'Syncing settings...';
        syncStatus.className = 'mt-2';
      }
    }
    
    // Get current settings
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'apiKey',
        'speechifyApiKey',
        'selectedModel',
        'speechifyModel',
        'playbackSpeed',
        'highlightEnabled',
        'selectionButtonColor',
        'topPlayerEnabled',
        'ttsProvider',
        'autoSyncEnabled'
      ], async (settings) => {
        try {
          // Make sure the top player setting is included in preferences
          const updatedSettings = includeTopPlayerInPreferences(
            settings, 
            settings.topPlayerEnabled !== undefined ? settings.topPlayerEnabled : true
          );
          
          // Save settings to Supabase
          const { error } = await saveUserPreferences(user.id, updatedSettings);
          
          if (error) {
            throw error;
          }
          
          console.log('[Settings] Settings synced successfully');
          
          if (showStatus && syncStatus) {
            syncStatus.textContent = 'Settings synced successfully!';
            syncStatus.className = 'mt-2 form-success';
            
            // Clear status after a few seconds
            setTimeout(() => {
              if (syncStatus) {
                syncStatus.textContent = '';
              }
            }, 3000);
          }
          
          resolve(true);
        } catch (error: any) {
          console.error('[Settings] Error syncing settings:', error);
          
          if (showStatus && syncStatus) {
            syncStatus.textContent = error.message || 'Failed to sync settings. Please try again.';
            syncStatus.className = 'mt-2 form-error';
          }
          
          resolve(false);
        }
      });
    });
  } catch (error: any) {
    console.error('[Settings] Error in syncSettingsToSupabase:', error);
    return false;
  }
}

// Check if auto sync is enabled
export function isAutoSyncEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    getUser().then(({ user, error }) => {
      if (!user || error) {
        resolve(false);
        return;
      }
      
      chrome.storage.local.get(['autoSyncEnabled'], (result) => {
        // Default to true if not set
        resolve(result.autoSyncEnabled !== undefined ? result.autoSyncEnabled : true);
      });
    });
  });
}

// Set up event handlers for settings page
export function setupSettingsHandlers(panel: HTMLElement): void {
  // Delay slightly to ensure the DOM is updated
  setTimeout(() => {
    // API Key settings
    const speechifyApiKeyInput = panel.querySelector('#speechify-api-key-input') as HTMLInputElement;
    const saveSpeechifyKeyButton = panel.querySelector('#save-speechify-api-key') as HTMLButtonElement;
    const statusElements = panel.querySelectorAll('.api-key-status') as NodeListOf<HTMLElement>;
    
    // Model selectors
    const speechifyModelSelector = panel.querySelector('#speechify-model-selector') as HTMLSelectElement;
    
    // Playback settings
    const speedSlider = panel.querySelector('#speed-slider') as HTMLInputElement;
    const speedValue = panel.querySelector('#speed-value') as HTMLElement;
    const playerHighlightToggle = panel.querySelector('#player-highlight-toggle') as HTMLInputElement;
    
    // UI settings
    const topPlayerToggle = panel.querySelector('#top-player-toggle') as HTMLInputElement;
    
    // Highlight to Listen settings
    const highlightToggle = panel.querySelector('#highlight-toggle') as HTMLInputElement;
    const selectionColorPicker = panel.querySelector('#selection-button-color') as HTMLInputElement;
    const colorPreview = panel.querySelector('#color-preview') as HTMLElement;
    const resetButton = panel.querySelector('#reset-highlight-settings') as HTMLButtonElement;
    
    // Sync settings
    const syncButton = panel.querySelector('#sync-settings-btn') as HTMLButtonElement;
    const syncStatus = panel.querySelector('#sync-status') as HTMLElement;
    const syncSection = panel.querySelector('#settings-sync-section') as HTMLElement;
    const autoSyncToggle = panel.querySelector('#auto-sync-toggle') as HTMLInputElement;
    
    // Check if user is logged in to show/hide sync section
    getUser().then(({ user, error }) => {
      if (syncSection) {
        if (user && !error) {
          syncSection.style.display = 'block';
          
          // Load auto sync setting
          chrome.storage.local.get(['autoSyncEnabled'], (result) => {
            if (autoSyncToggle) {
              // Default to true if not set
              const autoSyncEnabled = result.autoSyncEnabled !== undefined ? result.autoSyncEnabled : true;
              autoSyncToggle.checked = autoSyncEnabled;
              console.log(`[Panel] Auto sync loaded from storage: ${autoSyncEnabled ? 'enabled' : 'disabled'}`);
            }
          });
        } else {
          syncSection.style.display = 'none';
        }
      }
    });
    
    // Listen for playback speed updates from the player
    document.addEventListener('update-panel-playback-speed', (event: any) => {
      const { speed } = event.detail;
      if (speedSlider && speedValue) {
        // Update the slider and display
        speedSlider.value = speed.toString();
        speedValue.textContent = `${speed}x`;
        console.log(`[Panel] Updated playback speed in panel: ${speed}x`);
      }
    });
    
    // Load saved settings if available
    chrome.storage.local.get([
      'speechifyApiKey',
      'speechifyModel',
      'playbackSpeed',
      'highlightEnabled',
      'playerHighlightingEnabled',
      'selectionButtonColor',
      'topPlayerEnabled',
      'autoSyncEnabled'
    ], (result) => {
      // Speechify API Key
      if (result.speechifyApiKey && speechifyApiKeyInput) {
        speechifyApiKeyInput.value = result.speechifyApiKey;
        statusElements.forEach(statusElement => {
          if (statusElement.closest('.speechify-settings')) {
            statusElement.textContent = 'API key is set';
            statusElement.classList.add('success');
          }
        });
      }
      
      // Speechify Model selector
      if (result.speechifyModel && speechifyModelSelector) {
        speechifyModelSelector.value = result.speechifyModel;
      }
      
      // Playback speed
      if (result.playbackSpeed && speedSlider && speedValue) {
        speedSlider.value = result.playbackSpeed.toString();
        speedValue.textContent = `${result.playbackSpeed}x`;
      }
      
      // Player highlight toggle
      if (playerHighlightToggle) {
        // Default to enabled if not set
        const playerHighlightingEnabled = result.playerHighlightingEnabled !== undefined ? result.playerHighlightingEnabled : true;
        playerHighlightToggle.checked = playerHighlightingEnabled;
        console.log(`[Panel] Loaded player highlighting state: ${playerHighlightingEnabled ? 'enabled' : 'disabled'}`);
      }
      
      // Highlight toggle
      if (highlightToggle && result.highlightEnabled !== undefined) {
        highlightToggle.checked = result.highlightEnabled;
        // Dispatch event to notify the SelectionButton
        updateHighlightingState(result.highlightEnabled);
      }
      
      // Selection button color
      if (selectionColorPicker && result.selectionButtonColor) {
        selectionColorPicker.value = result.selectionButtonColor;
        if (colorPreview) {
          colorPreview.style.backgroundColor = result.selectionButtonColor;
        }
        // Update the selection button color
        updateSelectionButtonColor(result.selectionButtonColor);
      }
      
      // Top player toggle
      if (topPlayerToggle) {
        // Default to enabled if not set
        const topPlayerEnabled = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
        topPlayerToggle.checked = topPlayerEnabled;
        
        // Dispatch initial event to update the top player visibility
        updateTopPlayerVisibility(topPlayerEnabled);
      }
      
      // Auto sync toggle
      if (autoSyncToggle) {
        // Default to true if not set
        const autoSyncEnabled = result.autoSyncEnabled !== undefined ? result.autoSyncEnabled : true;
        autoSyncToggle.checked = autoSyncEnabled;
      }
    });
    
    // Save Speechify API key
    if (saveSpeechifyKeyButton && speechifyApiKeyInput) {
      saveSpeechifyKeyButton.addEventListener('click', () => {
        const speechifyApiKey = speechifyApiKeyInput.value.trim();
        
        if (!speechifyApiKey) {
          statusElements.forEach(statusElement => {
            if (statusElement.closest('.speechify-settings')) {
              statusElement.textContent = 'Please enter an API key';
              statusElement.classList.add('error');
              statusElement.classList.remove('success');
            }
          });
          return;
        }
        
        // Save API key to storage
        chrome.storage.local.set({ speechifyApiKey }, () => {
          statusElements.forEach(statusElement => {
            if (statusElement.closest('.speechify-settings')) {
              statusElement.textContent = 'API key saved successfully';
              statusElement.classList.add('success');
              statusElement.classList.remove('error');
            }
          });
        });
      });
    }
    
    // Speechify Model selector
    if (speechifyModelSelector) {
      speechifyModelSelector.addEventListener('change', () => {
        const speechifyModel = speechifyModelSelector.value;
        chrome.storage.local.set({ speechifyModel });
      });
    }
    
    // Speed slider
    if (speedSlider && speedValue) {
      speedSlider.addEventListener('input', () => {
        const speed = parseFloat(speedSlider.value);
        speedValue.textContent = `${speed.toFixed(1)}x`;
        chrome.storage.local.set({ playbackSpeed: speed });
      });
    }
    
    // Player highlight toggle
    if (playerHighlightToggle) {
      playerHighlightToggle.addEventListener('change', () => {
        const isEnabled = playerHighlightToggle.checked;
        console.log(`[Panel] Player highlighting toggle changed to: ${isEnabled ? 'enabled' : 'disabled'}`);
        
        // Immediately update the UI to match
        playerHighlightToggle.checked = isEnabled;
        
        // Save to storage with callback to ensure it's saved
        chrome.storage.local.set({ playerHighlightingEnabled: isEnabled }, () => {
          console.log(`[Panel] Player highlighting saved to storage: ${isEnabled ? 'enabled' : 'disabled'}`);
        });
      });
    }
    
    // Highlight toggle
    if (highlightToggle) {
      highlightToggle.addEventListener('change', () => {
        const isEnabled = highlightToggle.checked;
        console.log(`[Panel] Highlight toggle changed to: ${isEnabled ? 'enabled' : 'disabled'}`);
        
        // Immediately update the UI to match
        highlightToggle.checked = isEnabled;
        
        // Save to storage with callback to ensure it's saved
        chrome.storage.local.set({ highlightEnabled: isEnabled }, () => {
          console.log(`[Panel] Highlighting saved to storage: ${isEnabled ? 'enabled' : 'disabled'}`);
          
          // Dispatch the event to update the button state
          updateHighlightingState(isEnabled);
          
          // Double check after a small delay to ensure the state is properly applied
          setTimeout(() => {
            // Re-read from storage to verify
            chrome.storage.local.get(['highlightEnabled'], (result) => {
              console.log(`[Panel] Verifying highlight state in storage: ${result.highlightEnabled ? 'enabled' : 'disabled'}`);
              // If there's a mismatch, force update again
              if (result.highlightEnabled !== isEnabled) {
                console.log(`[Panel] State mismatch detected, correcting!`);
                chrome.storage.local.set({ highlightEnabled: isEnabled });
                updateHighlightingState(isEnabled);
              }
            });
          }, 200);
        });
      });
    }
    
    // Top player toggle
    if (topPlayerToggle) {
      topPlayerToggle.addEventListener('change', () => {
        const isEnabled = topPlayerToggle.checked;
        console.log(`[Panel] Top player toggle changed to: ${isEnabled ? 'enabled' : 'disabled'}`);
        
        // Immediately update the UI to match
        topPlayerToggle.checked = isEnabled;
        
        // Save to storage with callback to ensure it's saved
        chrome.storage.local.set({ topPlayerEnabled: isEnabled }, () => {
          console.log(`[Panel] Top player visibility saved to storage: ${isEnabled ? 'enabled' : 'disabled'}`);
          
          // Dispatch the event to update the top player visibility
          updateTopPlayerVisibility(isEnabled);
          
          // Double check after a small delay to ensure the state is properly applied
          setTimeout(() => {
            // Re-read from storage to verify
            chrome.storage.local.get(['topPlayerEnabled'], (result) => {
              console.log(`[Panel] Verifying top player state in storage: ${result.topPlayerEnabled ? 'enabled' : 'disabled'}`);
              // If there's a mismatch, force update again
              if (result.topPlayerEnabled !== isEnabled) {
                console.log(`[Panel] State mismatch detected, correcting!`);
                chrome.storage.local.set({ topPlayerEnabled: isEnabled });
                updateTopPlayerVisibility(isEnabled);
              }
            });
          }, 200);
        });
      });
    }
    
    // Auto sync toggle
    if (autoSyncToggle) {
      autoSyncToggle.addEventListener('change', () => {
        const isEnabled = autoSyncToggle.checked;
        console.log(`[Panel] Auto sync toggle changed to: ${isEnabled ? 'enabled' : 'disabled'}`);
        
        // Immediately update the UI to match
        autoSyncToggle.checked = isEnabled;
        
        // Save to storage with callback to ensure it's saved
        chrome.storage.local.set({ autoSyncEnabled: isEnabled }, () => {
          console.log(`[Panel] Auto sync setting saved to storage: ${isEnabled ? 'enabled' : 'disabled'}`);
        });
      });
    }
    
    // Color picker
    if (selectionColorPicker && colorPreview) {
      selectionColorPicker.addEventListener('input', () => {
        const color = selectionColorPicker.value;
        colorPreview.style.backgroundColor = color;
      });
      
      selectionColorPicker.addEventListener('change', () => {
        const color = selectionColorPicker.value;
        chrome.storage.local.set({ selectionButtonColor: color }, () => {
          console.log(`Selection button color updated to ${color}`);
          updateSelectionButtonColor(color);
        });
      });
    }
    
    // Reset button
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        // Default values
        const defaults = {
          highlightEnabled: true,
          playerHighlightingEnabled: true, // Add the player highlighting setting
          selectionButtonColor: '#27272a',
          topPlayerEnabled: true
        };
        
        // Reset in storage
        chrome.storage.local.set(defaults, () => {
          console.log('Highlighting settings reset to defaults');
          
          // Update UI elements
          if (highlightToggle) highlightToggle.checked = defaults.highlightEnabled;
          if (playerHighlightToggle) playerHighlightToggle.checked = defaults.playerHighlightingEnabled;
          if (selectionColorPicker) selectionColorPicker.value = defaults.selectionButtonColor;
          if (colorPreview) colorPreview.style.backgroundColor = defaults.selectionButtonColor;
          if (topPlayerToggle) topPlayerToggle.checked = defaults.topPlayerEnabled;
          
          // Update actual components
          updateHighlightingState(defaults.highlightEnabled);
          updateSelectionButtonColor(defaults.selectionButtonColor);
          updateTopPlayerVisibility(defaults.topPlayerEnabled);
        });
      });
    }
    
    // Sync settings button
    if (syncButton && syncStatus) {
      syncButton.addEventListener('click', async () => {
        await syncSettingsToSupabase(true);
      });
    }
  }, 100);
}
