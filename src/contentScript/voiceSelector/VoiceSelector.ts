// SVG Icons
import { ICONS } from '../utils';
// Import TTS API
import { fetchVoices, Voice } from '../speechifyApi';
// Import voice IDs and provider from config
import { SPEECHIFY_VOICE_IDS, TTS_PROVIDER } from '../../config';
// Import helper functions
import { createVoiceOption } from './utils/voiceOptionCreator';
import { filterVoices } from './utils/voiceFilters';
import { playSample } from './handlers/voiceSampleHandler';
import { loadCurrentVoice, updateCurrentVoiceDisplay } from './handlers/currentVoiceHandler';
import { createLogger } from '../../utils/logger';

// Create a logger instance for this module
const logger = createLogger('VoiceSelector');

// Static cache for voices to avoid refetching
let cachedVoices: Voice[] | null = null;

export class VoiceSelector {
  private selectorId: string = 'extension-voice-selector';
  private selectorElement: HTMLElement | null = null;
  private isPanelOpen: boolean = false;
  
  // Voice options from TTS API
  private voices: Voice[] = [];
  
  // Fallback voices with real voice IDs
  private fallbackVoices: Voice[] = [
    { id: SPEECHIFY_VOICE_IDS.David, name: 'David', gender: 'Male', accent: 'American' },
    { id: SPEECHIFY_VOICE_IDS.Emma, name: 'Emma', gender: 'Female', accent: 'British' },
    { id: SPEECHIFY_VOICE_IDS.James, name: 'James', gender: 'Male', accent: 'British' },
    { id: SPEECHIFY_VOICE_IDS.Sofia, name: 'Sofia', gender: 'Female', accent: 'American' }
  ];
  
  constructor() {
    // No need to inject styles separately as they're included in manifest
    
    // Use cached voices if available, otherwise load them
    if (cachedVoices) {
      logger.info(`Using cached voices: ${cachedVoices.length}`);
      this.voices = cachedVoices;
    } else {
      // Load voices from TTS API when the class is instantiated
      this.loadVoices();
    }
  }
  
  /**
   * Preload voices to avoid lag when opening the voice selector
   * This should be called when the extension loads
   */
  public static async preloadVoices(): Promise<void> {
    if (!cachedVoices) {
      logger.info('Preloading voices...');
      try {
        const voices = await fetchVoices();
        if (voices && voices.length > 0) {
          cachedVoices = voices;
          logger.info(`Successfully preloaded ${voices.length} voices from ${TTS_PROVIDER}`);
        } else {
          logger.warn(`No voices received during preload, will try again later`);
        }
      } catch (error) {
        logger.error(`Error preloading voices: ${error}`);
      }
    } else {
      logger.info(`Voices already preloaded: ${cachedVoices.length}`);
    }
  }
  
  // Load voices from TTS API
  private async loadVoices(): Promise<void> {
    try {
      const apiVoices = await fetchVoices();
      
      if (apiVoices && apiVoices.length > 0) {
        this.voices = apiVoices;
        logger.info(`Successfully loaded ${this.voices.length} voices from ${TTS_PROVIDER}`);
        
        // Update UI if the selector is already visible
        if (this.selectorElement) {
          this.updateVoiceOptions();
        }
      } else {
        logger.warn(`No voices received from ${TTS_PROVIDER} API, using fallback voices`);
        this.voices = [...this.fallbackVoices];
      }
    } catch (error) {
      logger.error(`Error loading voices from ${TTS_PROVIDER}: ${error}`);
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
      const voiceOption = createVoiceOption(voice, this.addClickEffect);
      voiceList.appendChild(voiceOption);
    });
  }
  
  private addClickEffect(element: HTMLElement): void {
    // Add a quick scale animation for feedback
    element.style.transform = 'scale(0.9)';
    setTimeout(() => {
      element.style.transform = '';
    }, 150);
  }
  
  private createButton(iconName: keyof typeof ICONS, title: string, clickHandler: () => void): HTMLElement {
    const button = document.createElement('div');
    button.className = 'selector-button';
    button.innerHTML = ICONS[iconName];
    button.title = title;
    button.addEventListener('click', clickHandler);
    return button;
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
    
    // Log for debugging
    logger.info(`Creating voice selector with panel open: ${isPanelOpen}`);
    
    // If no voices loaded yet (race condition), use fallback voices
    if (this.voices.length === 0) {
      this.voices = [...this.fallbackVoices];
    }
    
    // Create a top header with just the title
    const topHeader = document.createElement('div');
    topHeader.className = 'voice-selector-top-header';
    
    const headerTitle = document.createElement('div');
    headerTitle.className = 'voice-selector-title';
    headerTitle.textContent = 'Choose Voice';
    
    topHeader.appendChild(headerTitle);
    
    // Add a container for the current voice display (will be shown after selection)
    const currentVoiceContainer = document.createElement('div');
    currentVoiceContainer.id = 'current-voice-display';
    currentVoiceContainer.className = 'current-voice-display';
    currentVoiceContainer.style.display = 'none'; // Hidden by default
    
    // Main header for current voice
    const header = document.createElement('div');
    header.className = 'voice-selector-header';
    header.appendChild(currentVoiceContainer);
    
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
      filterVoices(target.value.toLowerCase());
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
        const voiceOption = createVoiceOption(voice, this.addClickEffect);
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
          logger.info(`Saving selected voice: ${voiceId}`);
          
          // Get voice info for display
          const voiceName = selectedVoice.querySelector('.voice-name')?.textContent || '';
          const voiceDetails = selectedVoice.querySelector('.voice-details')?.textContent || '';
          
          // Update the current voice display
          updateCurrentVoiceDisplay(voiceName, voiceDetails, TTS_PROVIDER);
          
          // Save the selection to Chrome storage
          chrome.storage.local.set({ 
            selectedVoiceId: voiceId,
            selectedVoiceName: voiceName,
            selectedVoiceDetails: voiceDetails,
            ttsProvider: TTS_PROVIDER
          }, () => {
            logger.info('Voice selection saved to storage');
            
            // Dispatch an event to notify other components of the voice change
            const event = new CustomEvent('voice-selected', { 
              detail: { voiceId, voiceName, voiceDetails, provider: TTS_PROVIDER } 
            });
            document.dispatchEvent(event);
            
            // Don't close the selector, just show the current selection at the top
            // this.remove();
            
            // Add visual feedback for save button
            saveButton.textContent = 'Selection Saved!';
            setTimeout(() => {
              saveButton.textContent = 'Save Selection';
            }, 1500);
          });
        }
      } else {
        logger.warn('No voice selected');
        // Visual feedback that no voice is selected
        saveButton.classList.add('error');
        setTimeout(() => {
          saveButton.classList.remove('error');
        }, 500);
      }
    });
    
    // Append all elements to selector
    selector.appendChild(topHeader);
    selector.appendChild(header);
    selector.appendChild(searchContainer);
    selector.appendChild(voiceList);
    selector.appendChild(saveButton);
    
    // Add selector to page
    document.body.appendChild(selector);
    this.selectorElement = selector;
    
    // Load the currently selected voice if available
    loadCurrentVoice();
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
  
  public updatePosition(isPanelOpen: boolean): void {
    const selector = document.getElementById(this.selectorId);
    if (selector) {
      this.isPanelOpen = isPanelOpen;
      
      if (isPanelOpen) {
        selector.classList.add('panel-open');
      } else {
        selector.classList.remove('panel-open');
      }
      
      logger.info(`Voice selector updated position. Panel open: ${isPanelOpen}`);
    }
  }
}
