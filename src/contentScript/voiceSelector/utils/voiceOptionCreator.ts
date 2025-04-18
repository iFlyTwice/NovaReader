// Import the Voice type and the playSample function
import { Voice } from '../../speechifyApi';
import { ICONS } from '../../utils';
import { playSample } from '../handlers/voiceSampleHandler';

/**
 * Creates a voice option element for the voice selector
 * @param voice The voice data
 * @param addClickEffect Function to add visual click effect
 * @returns The voice option HTML element
 */
export function createVoiceOption(voice: Voice, addClickEffect: (element: HTMLElement) => void): HTMLElement {
  const voiceOption = document.createElement('div');
  voiceOption.className = 'voice-option';
  voiceOption.setAttribute('data-voice-id', voice.id);
  
  const voiceName = document.createElement('div');
  voiceName.className = 'voice-name';
  voiceName.textContent = voice.name;
  
  const voiceDetails = document.createElement('div');
  voiceDetails.className = 'voice-details';
  voiceDetails.textContent = `${voice.gender} • ${voice.accent}`;
  
  const playButton = document.createElement('div');
  playButton.className = 'voice-play-button';
  playButton.innerHTML = ICONS.play;
  playButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent selecting the voice when clicking play
    console.log(`Play sample of ${voice.name} (${voice.id})`);
    playSample(voice.id, voice.name);
    // Add visual feedback
    addClickEffect(playButton);
  });
  
  voiceOption.appendChild(voiceName);
  voiceOption.appendChild(voiceDetails);
  voiceOption.appendChild(playButton);
  
  // Add click handler to select this voice
  voiceOption.addEventListener('click', () => {
    // Remove active class from all options
    document.querySelectorAll('.voice-option').forEach(el => {
      el.classList.remove('active');
    });
    
    // Add active class to this option
    voiceOption.classList.add('active');
    
    console.log(`Selected voice: ${voice.name} (${voice.id})`);
  });
  
  return voiceOption;
}
