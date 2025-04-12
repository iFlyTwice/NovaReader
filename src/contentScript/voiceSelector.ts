// SVG Icons
import { ICONS } from './utils';
// Import CSS to help Vite track dependencies
import '../../css/voiceSelector.css';
// Import ElevenLabs API
import { fetchElevenLabsVoices, Voice } from './elevenLabsApi';
// Import voice IDs from config
import { VOICE_IDS } from '../config';

export class VoiceSelector {
  private selectorId: string = 'extension-voice-selector';
  private selectorElement: HTMLElement | null = null;
  private isPanelOpen: boolean = false;
  
  // Voice options from ElevenLabs
  private voices: Voice[] = [];
  
  // Fallback voices with real ElevenLabs voice IDs
  private fallbackVoices: Voice[] = [
    { id: VOICE_IDS.David, name: 'David', gender: 'Male', accent: 'American' },
    { id: VOICE_IDS.Emma, name: 'Emma', gender: 'Female', accent: 'British' },
    { id: VOICE_IDS.James, name: 'James', gender: 'Male', accent: 'British' },
    { id: VOICE_IDS.Sofia, name: 'Sofia', gender: 'Female', accent: 'American' }
  ];
  
  constructor() {
    // No need to inject styles separately as they're included in manifest
    
    // Load voices from ElevenLabs API when the class is instantiated
    this.loadVoices();
  }
  
  // Load voices from ElevenLabs API
  private async loadVoices(): Promise<void> {
    try {
      const elevenLabsVoices = await fetchElevenLabsVoices();
      
      if (elevenLabsVoices && elevenLabsVoices.length > 0) {
        this.voices = elevenLabsVoices;
        console.log(`Successfully loaded ${this.voices.length} voices from ElevenLabs`);
        
        // Update UI if the selector is already visible
        if (this.selectorElement) {
          this.updateVoiceOptions();
        }
      } else {
        console.warn('No voices received from ElevenLabs API, using fallback voices');
        this.voices = [...this.fallbackVoices];
      }
    } catch (error) {
      console.error('Error loading voices from ElevenLabs:', error);
      this.voices = [...this.fallbackVoices];
    }
  }
  
  // Update voice options in the UI
  private updateVoiceOptions(): void {
    const voiceList = document.querySelector('.voice-selector-list');
    if (!voiceList) return;
    
    // Clear existing voice options
    voiceList.innerHTML = '';
    
    // Add voice options
    this.voices.forEach(voice => {
      const voiceOption = this.createVoiceOption(voice);
      voiceList.appendChild(voiceOption);
    });
  }
  
  // Create a voice option element
  // Play a sample of the voice
  private async playSample(voiceId: string, voiceName: string): Promise<void> {
    try {
      // Import the textToSpeech function only when needed to avoid circular dependencies
      const { textToSpeech } = await import('./elevenLabsApi');
      
      const sampleText = "Hello! This is a sample of my voice.";
      
      // Change button to loading state
      const playButton = document.querySelector(`[data-voice-id="${voiceId}"] .voice-play-button`);
      if (playButton) {
        playButton.innerHTML = ICONS.audioWave;
        playButton.classList.add('loading');
      }
      
      const audioData = await textToSpeech(sampleText, voiceId);
      
      if (audioData) {
        // Create blob from audio data
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        // Create and play audio
        const audio = new Audio(url);
        audio.onended = () => {
          // Clean up URL and reset button when audio ends
          URL.revokeObjectURL(url);
          if (playButton) {
            playButton.innerHTML = ICONS.play;
            playButton.classList.remove('loading');
          }
        };
        
        audio.play();
      } else {
        console.error('Failed to get audio sample');
        if (playButton) {
          playButton.innerHTML = ICONS.play;
          playButton.classList.remove('loading');
        }
      }
    } catch (error) {
      console.error('Error playing sample:', error);
      // Reset button if there's an error
      const playButton = document.querySelector(`[data-voice-id="${voiceId}"] .voice-play-button`);
      if (playButton) {
        playButton.innerHTML = ICONS.play;
        playButton.classList.remove('loading');
      }
    }
  }

  private createVoiceOption(voice: Voice): HTMLElement {
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
      this.playSample(voice.id, voice.name);
      // Add visual feedback
      this.addClickEffect(playButton);
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
  
  public create(isPanelOpen: boolean = false): void {
    // Check if selector already exists
    if (document.getElementById(this.selectorId)) {
      return;
    }
    
    // Store panel state
    this.isPanelOpen = isPanelOpen;
    
    // Create selector container
    const selector = document.createElement('div');
    selector.id = this.selectorId;
    
    // Always position relative to player via CSS
    // If panel is open, add panel-open class for additional positioning
    if (isPanelOpen) {
      selector.classList.add('panel-open');
    }
    
    // Add console log for debugging
    console.log(`Creating voice selector with panel open: ${isPanelOpen}`);
    
    // If no voices loaded yet (race condition), use fallback voices
    if (this.voices.length === 0) {
      this.voices = [...this.fallbackVoices];
    }
    
    // Add header
    const header = document.createElement('div');
    header.className = 'voice-selector-header';
    
    const headerTitle = document.createElement('div');
    headerTitle.className = 'voice-selector-title';
    headerTitle.textContent = 'Choose Voice';
    
    const closeButton = this.createButton('close', 'Close', () => {
      this.remove();
      // Add visual feedback
      this.addClickEffect(closeButton);
    });
    closeButton.className = 'voice-selector-close-button';
    
    header.appendChild(headerTitle);
    header.appendChild(closeButton);
    
    // Add search bar
    const searchContainer = document.createElement('div');
    searchContainer.className = 'voice-search-container';
    
    const searchIcon = document.createElement('div');
    searchIcon.className = 'voice-search-icon';
    searchIcon.innerHTML = ICONS.search;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'voice-search-input';
    searchInput.placeholder = 'Search voices...';
    searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.filterVoices(target.value.toLowerCase());
    });
    
    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(searchInput);
    
    // Add voice list
    const voiceList = document.createElement('div');
    voiceList.className = 'voice-selector-list';
    
    // Add loading indicator if voices aren't loaded yet
    if (this.voices.length === 0) {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'voice-loading';
      loadingIndicator.textContent = 'Loading voices...';
      voiceList.appendChild(loadingIndicator);
    } else {
      // Add voice options
      this.voices.forEach(voice => {
        const voiceOption = this.createVoiceOption(voice);
        voiceList.appendChild(voiceOption);
      });
    }
    
    // Add save button
    const saveButton = document.createElement('div');
    saveButton.className = 'voice-selector-save-button';
    saveButton.textContent = 'Save Selection';
    saveButton.addEventListener('click', () => {
      const selectedVoice = document.querySelector('.voice-option.active');
      if (selectedVoice) {
        const voiceId = selectedVoice.getAttribute('data-voice-id');
        if (voiceId) {
          console.log(`Saving selected voice: ${voiceId}`);
          
          // Save the selection to Chrome storage
          chrome.storage.local.set({ selectedVoiceId: voiceId }, () => {
            console.log('Voice selection saved to storage');
            
            // Dispatch an event to notify other components of the voice change
            const event = new CustomEvent('voice-selected', { 
              detail: { voiceId } 
            });
            document.dispatchEvent(event);
            
            // Close the selector
            this.remove();
          });
        }
      } else {
        console.log('No voice selected');
        // Visual feedback that no voice is selected
        saveButton.classList.add('error');
        setTimeout(() => {
          saveButton.classList.remove('error');
        }, 500);
      }
    });
    
    // Append all elements to selector
    selector.appendChild(header);
    selector.appendChild(searchContainer);
    selector.appendChild(voiceList);
    selector.appendChild(saveButton);
    
    // Add selector to page
    document.body.appendChild(selector);
    this.selectorElement = selector;
  }
  
  private createButton(iconName: keyof typeof ICONS, title: string, clickHandler: () => void): HTMLElement {
    const button = document.createElement('div');
    button.className = 'selector-button';
    button.innerHTML = ICONS[iconName];
    button.title = title;
    button.addEventListener('click', clickHandler);
    return button;
  }
  
  private addClickEffect(element: HTMLElement): void {
    // Add a quick scale animation for feedback
    element.style.transform = 'scale(0.9)';
    setTimeout(() => {
      element.style.transform = '';
    }, 150);
  }
  
  public toggle(isPanelOpen: boolean = false): void {
    const selector = document.getElementById(this.selectorId);
    if (selector) {
      this.remove();
    } else {
      this.create(isPanelOpen);
    }
  }
  
  public remove(): void {
    const selector = document.getElementById(this.selectorId);
    if (selector) {
      selector.remove();
      this.selectorElement = null;
    }
  }
  
  // Filter voices based on search input
  private filterVoices(searchTerm: string): void {
    const voiceOptions = document.querySelectorAll('.voice-option');
    
    if (searchTerm === '') {
      // Show all voices if search term is empty
      voiceOptions.forEach(option => {
        option.style.display = 'flex';
      });
      return;
    }
    
    // Filter voices based on name, gender, or accent
    voiceOptions.forEach(option => {
      const name = option.querySelector('.voice-name')?.textContent?.toLowerCase() || '';
      const details = option.querySelector('.voice-details')?.textContent?.toLowerCase() || '';
      
      if (name.includes(searchTerm) || details.includes(searchTerm)) {
        option.style.display = 'flex';
      } else {
        option.style.display = 'none';
      }
    });
  }
  
  public updatePosition(isPanelOpen: boolean): void {
    const selector = document.getElementById(this.selectorId);
    if (selector) {
      this.isPanelOpen = isPanelOpen;
      
      if (isPanelOpen) {
        selector.classList.add('panel-open');
      } else {
        selector.classList.remove('panel-open');
      }
      
      console.log(`Voice selector updated position. Panel open: ${isPanelOpen}`);
    }
  }
}