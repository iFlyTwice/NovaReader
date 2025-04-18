/**
 * Settings handlers for the side panel
 */

import { updateHighlightingState, updateSelectionButtonColor, updateTopPlayerVisibility } from '../utils/panelEvents';

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
      'topPlayerEnabled'
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
  }, 100);
}
