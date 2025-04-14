/**
 * Update the current voice display with the selected voice info
 * @param voiceName The name of the selected voice
 * @param voiceDetails The details of the selected voice (gender, accent)
 */
export function updateCurrentVoiceDisplay(voiceName: string, voiceDetails: string): void {
  const currentVoiceDisplay = document.getElementById('current-voice-display');
  if (!currentVoiceDisplay) return;
  
  // Clear previous content
  currentVoiceDisplay.innerHTML = '';
  
  // Create elements for voice info
  const nameSpan = document.createElement('span');
  nameSpan.className = 'current-voice-name';
  nameSpan.textContent = voiceName;
  
  const detailsSpan = document.createElement('span');
  detailsSpan.className = 'current-voice-details';
  detailsSpan.textContent = voiceDetails;
  
  // Append to container
  currentVoiceDisplay.appendChild(nameSpan);
  currentVoiceDisplay.appendChild(detailsSpan);
  
  // Show the container
  currentVoiceDisplay.style.display = 'flex';
}

/**
 * Load and display the currently selected voice when the selector is opened
 */
export function loadCurrentVoice(): void {
  chrome.storage.local.get(['selectedVoiceId', 'selectedVoiceName', 'selectedVoiceDetails'], (result) => {
    if (result.selectedVoiceId && result.selectedVoiceName) {
      console.log(`Loading saved voice: ${result.selectedVoiceName} (${result.selectedVoiceId})`);
      
      // Update the display
      updateCurrentVoiceDisplay(result.selectedVoiceName, result.selectedVoiceDetails || '');
      
      // Also highlight the corresponding voice in the list if it exists
      const voiceOption = document.querySelector(`.voice-option[data-voice-id="${result.selectedVoiceId}"]`);
      if (voiceOption) {
        // Remove active class from all options
        document.querySelectorAll('.voice-option').forEach(el => {
          el.classList.remove('active');
        });
        
        // Add active class to the selected option
        voiceOption.classList.add('active');
      }
    }
  });
}