import { createLogger } from '../../../utils/logger';

// Create a logger instance for this module
const logger = createLogger('VoiceHandler');

/**
 * Update the current voice display with the selected voice info
 * @param voiceName The name of the selected voice
 * @param voiceDetails The details of the selected voice (gender, accent)
 * @param provider Optional TTS provider name
 */
export function updateCurrentVoiceDisplay(voiceName: string, voiceDetails: string, provider?: string): void {
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
  
  // Add provider info if available
  if (provider) {
    detailsSpan.textContent = `${voiceDetails} • Speechify`;
  } else {
    detailsSpan.textContent = voiceDetails;
  }
  
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
  chrome.storage.local.get([
    'selectedVoiceId', 
    'selectedVoiceName', 
    'selectedVoiceDetails',
    'ttsProvider'
  ], async (result) => {
    if (result.selectedVoiceId) {
      // If we have a voice ID, make sure we have the correct voice name for it
      // Import the getVoiceDetails function from speechifyApi
      const { getVoiceDetails } = await import('../../speechifyApi');
      
      // Get the correct details for this voice ID
      const correctDetails = getVoiceDetails(result.selectedVoiceId);
      const correctName = correctDetails.name;
      const correctDetailsText = `${correctDetails.gender} • ${correctDetails.accent}`;
      
      // If the stored name doesn't match the correct name or we don't have a stored name
      if (!result.selectedVoiceName || result.selectedVoiceName !== correctName) {
        logger.warn(`Voice name mismatch or missing: ID=${result.selectedVoiceId}, stored name=${result.selectedVoiceName || 'missing'}, correct name=${correctName}`);
        
        // Update the storage with the correct name and details
        chrome.storage.local.set({
          selectedVoiceName: correctName,
          selectedVoiceDetails: correctDetailsText
        });
        
        // Use the correct name and details for display
        logger.info(`Loading voice with corrected name: ${correctName} (${result.selectedVoiceId}) - Provider: ${result.ttsProvider || 'speechify'}`);
        
        // Update the display with the correct information
        updateCurrentVoiceDisplay(
          correctName,
          correctDetailsText,
          result.ttsProvider
        );
      } else {
        // The stored name matches the correct name, use it as is
        logger.info(`Loading saved voice: ${result.selectedVoiceName} (${result.selectedVoiceId}) - Provider: ${result.ttsProvider || 'speechify'}`);
        
        // Update the display
        updateCurrentVoiceDisplay(
          result.selectedVoiceName, 
          result.selectedVoiceDetails || correctDetailsText,
          result.ttsProvider
        );
      }
      
      // Also highlight the corresponding voice in the list if it exists
      const voiceOption = document.querySelector(`.voice-option[data-voice-id="${result.selectedVoiceId}"]`);
      if (voiceOption) {
        // Remove active class from all options
        document.querySelectorAll('.voice-option').forEach(el => {
          el.classList.remove('active');
        });
        
        // Add active class to the selected option
        voiceOption.classList.add('active');
      } else {
        logger.warn(`Voice option with ID ${result.selectedVoiceId} not found in the list. Creating it dynamically.`);
        
        // If the voice option doesn't exist, create and dispatch a voice-id-verified event
        // This will trigger the handleVoiceVerification method in VoiceSelector
        const event = new CustomEvent('voice-id-verified', { 
          detail: { 
            voiceId: result.selectedVoiceId, 
            voiceName: correctName, 
            voiceDetails: correctDetailsText,
            provider: result.ttsProvider || 'speechify'
          } 
        });
        document.dispatchEvent(event);
      }
    } else {
      logger.warn('No saved voice found in storage');
    }
  });
}

/**
 * Check if the voice in storage matches what's being displayed
 * This helps ensure the UI stays in sync with the actual voice being used
 */
export function refreshVoiceDisplay(): void {
  chrome.storage.local.get([
    'selectedVoiceId', 
    'selectedVoiceName', 
    'selectedVoiceDetails',
    'ttsProvider'
  ], (result) => {
    if (result.selectedVoiceId && result.selectedVoiceName) {
      // Get the current displayed voice name
      const currentVoiceDisplay = document.getElementById('current-voice-display');
      if (!currentVoiceDisplay) return;
      
      const displayedName = currentVoiceDisplay.querySelector('.current-voice-name')?.textContent;
      
      // If the displayed name doesn't match the saved name, update it
      if (displayedName !== result.selectedVoiceName) {
        logger.info(`Refreshing voice display: ${displayedName} -> ${result.selectedVoiceName}`);
        
        // Update the display
        updateCurrentVoiceDisplay(
          result.selectedVoiceName, 
          result.selectedVoiceDetails || '',
          result.ttsProvider
        );
        
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
    }
  });
}