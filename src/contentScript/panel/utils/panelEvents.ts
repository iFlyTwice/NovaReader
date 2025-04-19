/**
 * Panel-related events and utility functions
 */

// Update highlighting state (enable/disable)
export function updateHighlightingState(isEnabled: boolean): void {
  const event = new CustomEvent('update-highlighting-state', {
    detail: { enabled: isEnabled }
  });
  document.dispatchEvent(event);
}

// Update the selection button color
export function updateSelectionButtonColor(color: string): void {
  const event = new CustomEvent('update-selection-button-color', {
    detail: { color }
  });
  document.dispatchEvent(event);
}

// Update the top player visibility
export function updateTopPlayerVisibility(isVisible: boolean): void {
  const event = new CustomEvent('update-top-player-visibility', {
    detail: { visible: isVisible }
  });
  document.dispatchEvent(event);
}

// Update the panel's playback speed display
export function updatePanelPlaybackSpeed(speed: number): void {
  const event = new CustomEvent('update-panel-playback-speed', {
    detail: { speed }
  });
  document.dispatchEvent(event);
}
