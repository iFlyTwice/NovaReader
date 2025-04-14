/**
 * Player-related events and utility functions
 */

// Dispatch an event to update the selection button state
export function dispatchSelectionButtonStateEvent(state: 'play' | 'loading' | 'speaking'): void {
  const event = new CustomEvent('selection-button-state', {
    detail: { state }
  });
  document.dispatchEvent(event);
}

// Create a button element for the player
export function createButton(
  iconHTML: string, 
  title: string, 
  clickHandler: () => void
): HTMLElement {
  const button = document.createElement('div');
  button.className = 'player-button';
  button.innerHTML = iconHTML;
  button.title = title;
  button.addEventListener('click', clickHandler);
  return button;
}

// Add a click visual effect to a button
export function addClickEffect(element: HTMLElement): void {
  // Add a quick scale animation for feedback
  element.style.transform = 'scale(0.9)';
  setTimeout(() => {
    element.style.transform = '';
  }, 150);
}

// Get the user's selected voice from Chrome storage
export async function getSelectedVoice(defaultVoiceId: string): Promise<string> {
  try {
    // Get voice from Chrome storage
    return new Promise<string>((resolve) => {
      chrome.storage.local.get(['selectedVoiceId'], (result) => {
        if (result && result.selectedVoiceId) {
          console.log('[SidePlayer] Retrieved voice ID from storage:', result.selectedVoiceId);
          resolve(result.selectedVoiceId);
        } else {
          console.log('[SidePlayer] No voice ID in storage, using default:', defaultVoiceId);
          resolve(defaultVoiceId);
        }
      });
    });
  } catch (error) {
    console.error('[SidePlayer] Error getting selected voice:', error);
    return defaultVoiceId;
  }
}
