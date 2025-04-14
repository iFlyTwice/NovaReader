// SVG Icons
import { ICONS } from '../utils';
// Import ElevenLabs API
import { fetchElevenLabsVoices, Voice } from '../elevenLabsApi';
// Import voice IDs from config
import { VOICE_IDS } from '../../config';
// Import helper functions
import { createVoiceOption } from './utils/voiceOptionCreator';
import { filterVoices } from './utils/voiceFilters';
import { playSample } from './handlers/voiceSampleHandler';
import { loadCurrentVoice, updateCurrentVoiceDisplay } from './handlers/currentVoiceHandler';

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
    
    // Add console log for debugging
    console.log(`Creating voice selector with panel open: ${isPanelOpen}`);
    
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
          console.log(`Saving selected voice: ${voiceId}`);
          
          // Get voice info for display
          const voiceName = selectedVoice.querySelector('.voice-name')?.textContent || '';
          const voiceDetails = selectedVoice.querySelector('.voice-details')?.textContent || '';
          
          // Update the current voice display
          updateCurrentVoiceDisplay(voiceName, voiceDetails);
          
          // Save the selection to Chrome storage
          chrome.storage.local.set({ 
            selectedVoiceId: voiceId,
            selectedVoiceName: voiceName,
            selectedVoiceDetails: voiceDetails
          }, () => {
            console.log('Voice selection saved to storage');
            
            // Dispatch an event to notify other components of the voice change
            const event = new CustomEvent('voice-selected', { 
              detail: { voiceId, voiceName, voiceDetails } 
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
        console.log('No voice selected');
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
      
      console.log(`Voice selector updated position. Panel open: ${isPanelOpen}`);
    }
  }
}