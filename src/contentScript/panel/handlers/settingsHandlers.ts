/**
 * Settings handlers for the side panel
 */

import { updateHighlightingState, updateSelectionButtonColor, updateTopPlayerVisibility } from '../utils/panelEvents';

// Set up event handlers for settings page
export function setupSettingsHandlers(panel: HTMLElement): void {
  // Delay slightly to ensure the DOM is updated
  setTimeout(() => {
    // Provider selector
    const providerSelector = panel.querySelector('#provider-selector') as HTMLSelectElement;
    
    // API Key settings
    const elevenLabsApiKeyInput = panel.querySelector('#elevenlabs-api-key-input') as HTMLInputElement;
    const saveElevenLabsKeyButton = panel.querySelector('#save-elevenlabs-api-key') as HTMLButtonElement;
    const speechifyApiKeyInput = panel.querySelector('#speechify-api-key-input') as HTMLInputElement;
    const saveSpeechifyKeyButton = panel.querySelector('#save-speechify-api-key') as HTMLButtonElement;
    const statusElements = panel.querySelectorAll('.api-key-status') as NodeListOf<HTMLElement>;
    
    // Model selectors
    const elevenLabsModelSelector = panel.querySelector('#elevenlabs-model-selector') as HTMLSelectElement;
    const speechifyModelSelector = panel.querySelector('#speechify-model-selector') as HTMLSelectElement;
    
    // Playback settings
    const speedSlider = panel.querySelector('#speed-slider') as HTMLInputElement;
    const speedValue = panel.querySelector('#speed-value') as HTMLElement;
    
    // UI settings
    const topPlayerToggle = panel.querySelector('#top-player-toggle') as HTMLInputElement;
    
    // Highlight to Listen settings
    const highlightToggle = panel.querySelector('#highlight-toggle') as HTMLInputElement;
    const selectionColorPicker = panel.querySelector('#selection-button-color') as HTMLInputElement;
    const colorPreview = panel.querySelector('#color-preview') as HTMLElement;
    const resetButton = panel.querySelector('#reset-highlight-settings') as HTMLButtonElement;
    
    // Load saved settings if available
    chrome.storage.local.get([
      'apiKey',
      'speechifyApiKey',
      'selectedModel',
      'speechifyModel',
      'playbackSpeed',
      'highlightEnabled',
      'selectionButtonColor',
      'topPlayerEnabled',
      'ttsProvider'
    ], (result) => {
      // TTS Provider
      if (result.ttsProvider && providerSelector) {
        providerSelector.value = result.ttsProvider;
        
        // Show/hide provider-specific settings
        const elevenLabsSettings = panel.querySelectorAll('.elevenlabs-settings') as NodeListOf<HTMLElement>;
        const speechifySettings = panel.querySelectorAll('.speechify-settings') as NodeListOf<HTMLElement>;
        
        if (result.ttsProvider === 'elevenlabs') {
          elevenLabsSettings.forEach(el => el.style.display = 'block');
          speechifySettings.forEach(el => el.style.display = 'none');
        } else {
          elevenLabsSettings.forEach(el => el.style.display = 'none');
          speechifySettings.forEach(el => el.style.display = 'block');
        }
      }
      
      // ElevenLabs API Key
      if (result.apiKey && elevenLabsApiKeyInput) {
        elevenLabsApiKeyInput.value = result.apiKey;
        statusElements.forEach(statusElement => {
          if (statusElement.closest('.elevenlabs-settings')) {
            statusElement.textContent = 'API key is set';
            statusElement.classList.add('success');
          }
        });
      }
      
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
      
      // ElevenLabs Model selector
      if (result.selectedModel && elevenLabsModelSelector) {
        elevenLabsModelSelector.value = result.selectedModel;
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
    
    // Provider selector
    if (providerSelector) {
      providerSelector.addEventListener('change', () => {
        const provider = providerSelector.value;
        chrome.storage.local.set({ ttsProvider: provider }, () => {
          console.log(`TTS Provider changed to: ${provider}`);
          
          // Show/hide provider-specific settings
          const elevenLabsSettings = panel.querySelectorAll('.elevenlabs-settings') as NodeListOf<HTMLElement>;
          const speechifySettings = panel.querySelectorAll('.speechify-settings') as NodeListOf<HTMLElement>;
          
          if (provider === 'elevenlabs') {
            elevenLabsSettings.forEach(el => el.style.display = 'block');
            speechifySettings.forEach(el => el.style.display = 'none');
          } else {
            elevenLabsSettings.forEach(el => el.style.display = 'none');
            speechifySettings.forEach(el => el.style.display = 'block');
          }
        });
      });
    }
    
    // Save ElevenLabs API key
    if (saveElevenLabsKeyButton && elevenLabsApiKeyInput) {
      saveElevenLabsKeyButton.addEventListener('click', () => {
        const apiKey = elevenLabsApiKeyInput.value.trim();
        
        if (!apiKey) {
          statusElements.forEach(statusElement => {
            if (statusElement.closest('.elevenlabs-settings')) {
              statusElement.textContent = 'Please enter an API key';
              statusElement.classList.add('error');
              statusElement.classList.remove('success');
            }
          });
          return;
        }
        
        // Save API key to storage
        chrome.storage.local.set({ apiKey }, () => {
          statusElements.forEach(statusElement => {
            if (statusElement.closest('.elevenlabs-settings')) {
              statusElement.textContent = 'API key saved successfully';
              statusElement.classList.add('success');
              statusElement.classList.remove('error');
            }
          });
        });
      });
    }
    
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
    
    // ElevenLabs Model selector
    if (elevenLabsModelSelector) {
      elevenLabsModelSelector.addEventListener('change', () => {
        const selectedModel = elevenLabsModelSelector.value;
        chrome.storage.local.set({ selectedModel });
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
          selectionButtonColor: '#27272a',
          topPlayerEnabled: true
        };
        
        // Reset in storage
        chrome.storage.local.set(defaults, () => {
          console.log('Highlighting settings reset to defaults');
          
          // Update UI elements
          if (highlightToggle) highlightToggle.checked = defaults.highlightEnabled;
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
