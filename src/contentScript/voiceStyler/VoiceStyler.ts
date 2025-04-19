/**
 * VoiceStyler component for controlling speech style
 */

// Import ICONS from utils
import { ICONS } from '../utils';
import { createLogger } from '../../utils/logger';

// Create a logger instance for this module
const logger = createLogger('VoiceStyler');

// Import styling options from configuration
import { AVAILABLE_EMOTIONS, AVAILABLE_CADENCES } from './config';

// Import handlers for managing styles
import { 
  handleEmotionSelect, 
  handleCadenceSelect, 
  getCurrentStyle,
  saveStyleToStorage,
  dispatchStyleChangeEvent
} from './handlers';

export class VoiceStyler {
  private stylerId: string = 'extension-voice-styler';
  private stylerElement: HTMLElement | null = null;
  private isPanelOpen: boolean = false;
  
  // Current style settings
  private currentEmotion: string | null = null;
  private currentCadence: string | null = null;
  
  constructor() {
    // Set up the toggle listener
    this.setupToggleListener();
    
    // Load initial style from storage
    this.loadInitialStyle();
  }
  
  /**
   * Load the initial style from storage
   */
  private async loadInitialStyle(): Promise<void> {
    const style = await getCurrentStyle();
    this.currentEmotion = style.emotion;
    this.currentCadence = style.cadence;
  }
  
  /**
   * Set up the toggle listener for showing/hiding the styler
   */
  private setupToggleListener(): void {
    document.addEventListener('toggle-voice-styler', () => {
      if (this.isVisible()) {
        this.hide();
      } else {
        // Check if panel is open to position correctly
        this.isPanelOpen = !!document.getElementById('extension-side-panel');
        this.show();
      }
    });
    
    // Listen for panel toggle to update position if visible
    document.addEventListener('toggle-panel', () => {
      if (this.isVisible()) {
        // Update panel state
        this.isPanelOpen = !!document.getElementById('extension-side-panel');
        this.updatePosition(this.isPanelOpen);
      }
    });
  }
  
  /**
   * Check if the styler is visible
   */
  private isVisible(): boolean {
    return !!document.getElementById(this.stylerId);
  }
  
  /**
   * Update position based on panel state
   */
  public updatePosition(isPanelOpen: boolean): void {
    const styler = document.getElementById(this.stylerId);
    if (styler) {
      this.isPanelOpen = isPanelOpen;
      
      if (isPanelOpen) {
        styler.classList.add('panel-open');
      } else {
        styler.classList.remove('panel-open');
      }
      
      logger.info(`Updated position. Panel open: ${isPanelOpen}`);
    }
  }
  
  /**
   * Show the voice styler
   */
  public show(): void {
    // Check if already visible
    if (this.isVisible()) return;
    
    // Create the UI
    this.create(this.isPanelOpen);
  }
  
  /**
   * Hide the voice styler
   */
  public hide(): void {
    // Check if already hidden
    if (!this.isVisible()) return;
    
    // Remove from DOM
    const styler = document.getElementById(this.stylerId);
    if (styler) {
      styler.remove();
      this.stylerElement = null;
    }
  }
  
  /**
   * Create the voice styler UI
   */
  public create(isPanelOpen: boolean = false): void {
    // Check if styler already exists
    if (document.getElementById(this.stylerId)) {
      return;
    }
    
    // Store panel state
    this.isPanelOpen = isPanelOpen;
    
    // Create styler container with fixed size
    const styler = document.createElement('div');
    styler.id = this.stylerId;
    styler.style.height = '500px'; // Force fixed height in JS
    
    // If panel is open, add panel-open class for additional positioning
    if (isPanelOpen) {
      styler.classList.add('panel-open');
    }
    
    // Log creation
    logger.info(`Creating voice styler with panel open: ${isPanelOpen}`);
    
    // Create a top header with just the title
    const topHeader = document.createElement('div');
    topHeader.className = 'voice-selector-top-header';
    
    const headerTitle = document.createElement('div');
    headerTitle.className = 'voice-selector-title';
    headerTitle.textContent = 'Voice Styling';
    
    topHeader.appendChild(headerTitle);
    
    // Main header
    const header = document.createElement('div');
    header.className = 'voice-selector-header';
    
    // Create scrollable content container
    const content = document.createElement('div');
    content.className = 'voice-styler-content';
    
    // Create emotions section (keep section more compact)
    const emotionsSection = document.createElement('div');
    emotionsSection.className = 'styler-section';
    
    const emotionsTitle = document.createElement('h3');
    emotionsTitle.textContent = 'Emotion';
    emotionsTitle.style.marginBottom = '8px'; // Reduce spacing
    emotionsSection.appendChild(emotionsTitle);
    
    // Create emotions list
    const emotionsList = document.createElement('div');
    emotionsList.className = 'voice-selector-list';
    
    // Add "None" option
    const noneEmotion = document.createElement('div');
    noneEmotion.className = 'voice-option' + (this.currentEmotion === null ? ' active' : '');
    
    const noneEmotionName = document.createElement('div');
    noneEmotionName.className = 'voice-name';
    noneEmotionName.textContent = 'None';
    noneEmotion.appendChild(noneEmotionName);
    
    noneEmotion.addEventListener('click', () => this.selectEmotion(null));
    emotionsList.appendChild(noneEmotion);
    
    // Add all emotions
    for (const emotion of AVAILABLE_EMOTIONS) {
      const emotionItem = document.createElement('div');
      emotionItem.className = 'voice-option' + (this.currentEmotion === emotion.id ? ' active' : '');
      
      const emotionName = document.createElement('div');
      emotionName.className = 'voice-name';
      emotionName.textContent = emotion.name;
      emotionItem.appendChild(emotionName);
      
      emotionItem.addEventListener('click', () => this.selectEmotion(emotion.id));
      emotionsList.appendChild(emotionItem);
    }
    
    emotionsSection.appendChild(emotionsList);
    
    // Create cadences section (keep section more compact)
    const cadencesSection = document.createElement('div');
    cadencesSection.className = 'styler-section';
    
    const cadencesTitle = document.createElement('h3');
    cadencesTitle.textContent = 'Speed';
    cadencesTitle.style.marginBottom = '8px'; // Reduce spacing
    cadencesSection.appendChild(cadencesTitle);
    
    // Create cadences list
    const cadencesList = document.createElement('div');
    cadencesList.className = 'voice-selector-list';
    
    // Add "Normal" option
    const normalCadence = document.createElement('div');
    normalCadence.className = 'voice-option' + (this.currentCadence === null ? ' active' : '');
    
    const normalCadenceName = document.createElement('div');
    normalCadenceName.className = 'voice-name';
    normalCadenceName.textContent = 'Normal';
    normalCadence.appendChild(normalCadenceName);
    
    normalCadence.addEventListener('click', () => this.selectCadence(null));
    cadencesList.appendChild(normalCadence);
    
    // Add all cadences
    for (const cadence of AVAILABLE_CADENCES) {
      const cadenceItem = document.createElement('div');
      cadenceItem.className = 'voice-option' + (this.currentCadence === cadence.id ? ' active' : '');
      
      const cadenceName = document.createElement('div');
      cadenceName.className = 'voice-name';
      cadenceName.textContent = cadence.name;
      cadenceItem.appendChild(cadenceName);
      
      cadenceItem.addEventListener('click', () => this.selectCadence(cadence.id));
      cadencesList.appendChild(cadenceItem);
    }
    
    cadencesSection.appendChild(cadencesList);
    
    // Build the UI structure
    styler.appendChild(topHeader);
    styler.appendChild(header);
    
    // Add sections to the scrollable content
    content.appendChild(emotionsSection);
    content.appendChild(cadencesSection);
    
    // Create save button
    const saveButton = document.createElement('div');
    saveButton.className = 'voice-selector-save-button';
    saveButton.textContent = 'Save Selection';
    saveButton.addEventListener('click', () => {
      // Save the current selection
      saveStyleToStorage(this.currentEmotion, this.currentCadence);
      
      // Dispatch event to notify of style change
      dispatchStyleChangeEvent(this.currentEmotion, this.currentCadence);
      
      // Hide the styler
      this.hide();
    });
    
    // Add content and save button to the main container
    styler.appendChild(content);
    styler.appendChild(saveButton);
    
    // Append to DOM
    document.body.appendChild(styler);
    
    // Store reference
    this.stylerElement = styler;
  }
  
  /**
   * Select an emotion
   */
  private selectEmotion(emotionId: string | null): void {
    // Update current emotion
    this.currentEmotion = emotionId;
    
    // Update UI
    const emotionsList = document.querySelectorAll('.styler-section:first-child .voice-option');
    emotionsList.forEach(item => {
      item.classList.remove('active');
      
      // Check if this is the "None" option or a specific emotion
      const nameElement = item.querySelector('.voice-name');
      if (nameElement) {
        const name = nameElement.textContent;
        if ((emotionId === null && name === 'None') || 
            (AVAILABLE_EMOTIONS.some(e => e.id === emotionId && e.name === name))) {
          item.classList.add('active');
        }
      }
    });
    
    // Handle emotion selection
    handleEmotionSelect(emotionId);
  }
  
  /**
   * Select a cadence
   */
  private selectCadence(cadenceId: string | null): void {
    // Update current cadence
    this.currentCadence = cadenceId;
    
    // Update UI
    const cadencesList = document.querySelectorAll('.styler-section:nth-child(2) .voice-option');
    cadencesList.forEach(item => {
      item.classList.remove('active');
      
      // Check if this is the "Normal" option or a specific cadence
      const nameElement = item.querySelector('.voice-name');
      if (nameElement) {
        const name = nameElement.textContent;
        if ((cadenceId === null && name === 'Normal') || 
            (AVAILABLE_CADENCES.some(c => c.id === cadenceId && c.name === name))) {
          item.classList.add('active');
        }
      }
    });
    
    // Handle cadence selection
    handleCadenceSelect(cadenceId);
  }
  
  /**
   * Set the current style programmatically
   */
  public setStyle(emotion: string | null, cadence: string | null): void {
    // Update current values
    this.currentEmotion = emotion;
    this.currentCadence = cadence;
    
    // Update UI if visible
    if (this.isVisible()) {
      this.selectEmotion(emotion);
      this.selectCadence(cadence);
    }
  }
  
  /**
   * Get the current style
   */
  public getStyle(): { emotion: string | null, cadence: string | null } {
    return {
      emotion: this.currentEmotion,
      cadence: this.currentCadence
    };
  }
}
