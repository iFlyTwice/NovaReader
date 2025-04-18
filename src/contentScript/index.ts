import { SidePlayer } from './player/SidePlayer';
import { SidePanel } from './panel/SidePanel';
import { VoiceSelector } from './voiceSelector';
import { VoiceStyler } from './voiceStyler';
import { SelectionButton } from './selectionButton';
import { TopPlayer } from './topPlayer/TopPlayer';
import { addKeyboardShortcuts, ICONS } from './utils';
import { initializeTopPlayerPrefs } from './topPlayer/handlers/prefsHandler';
import { createLogger } from '../utils/logger';

// Create a logger instance for this module
const logger = createLogger('Extension');

// Import global CSS files to help Vite track dependencies
import '../../css/fonts.css';

// Initialize main controller
class ExtensionController {
  private player: SidePlayer;
  private panel: SidePanel;
  private voiceSelector: VoiceSelector;
  private voiceStyler: VoiceStyler;
  private selectionButton: SelectionButton;
  private topPlayer: TopPlayer;
  private isPanelOpen: boolean = false;
  private isVoiceSelectorOpen: boolean = false;
  private isVoiceStylerOpen: boolean = false;
  private documentClickListener: ((event: MouseEvent) => void) | null = null;
  private panelClickListener: ((event: MouseEvent) => void) | null = null;
  private stylerClickListener: ((event: MouseEvent) => void) | null = null;

  constructor() {
    logger.info('ContentScript is running');
    
    // Preload voices to avoid lag when opening the voice selector
    this.preloadVoices();
    
    // Initialize components in the right order
    this.player = new SidePlayer();
    this.panel = new SidePanel();
    this.voiceSelector = new VoiceSelector();
    this.voiceStyler = new VoiceStyler();
    this.selectionButton = new SelectionButton();
    this.topPlayer = new TopPlayer();
    
    // Setup event listeners
    this.setupMessageListeners();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    
    // Ensure API key is set in storage from config
    this.ensureApiKeyInStorage();
    
    // The selection playback listener is now set up only when needed, not in the constructor
    
    // Listen for selection button state changes
    this.setupSelectionButtonStateListener();
    
    // Initialize top player preferences
    initializeTopPlayerPrefs();
    
    // Listen for voice style changes and update player
    this.setupVoiceStyleChangeListener();
  }
  
  /**
   * Preload voices to avoid lag when opening the voice selector
   */
  private preloadVoices(): void {
    // Call the static preloadVoices method on VoiceSelector
    VoiceSelector.preloadVoices().catch(error => {
      logger.error(`Error preloading voices: ${error}`);
    });
    
    // Create the side player immediately
    setTimeout(() => {
      this.player.create();
      
      // Set up the selection playback listener after creating the player
      this.player.setupSelectionPlaybackListener();
      
      // For the top player, wait for the page to be more fully loaded before creating it
      // This prevents the jumping/repositioning issue
      const createTopPlayer = () => {
        // First check if top player should be visible based on user settings
        chrome.storage.local.get(['topPlayerEnabled'], (result) => {
          // If the setting is explicitly false, don't create the top player
          if (result.topPlayerEnabled === false) {
            logger.info('Not creating top player as it is disabled in settings');
            return;
          }
          
          // Check if we're on Coursera and wait for the reading-title to be available
          const hostname = window.location.hostname;
          if (hostname.includes('coursera.org')) {
            const readingTitle = document.querySelector('div.reading-title');
            if (readingTitle) {
              // Reading title found, create the player
              this.topPlayer.create();
              return;
            }
            
            // If not found yet, try again after a short delay
            setTimeout(createTopPlayer, 100);
          } else {
            // Not Coursera, create the player after a short delay to allow page to load
            setTimeout(() => {
              this.topPlayer.create();
            }, 200);
          }
        });
      };
      
      // Start the process after a small delay
      setTimeout(createTopPlayer, 100);
    }, 500);
  }
  
  // Ensure API key from config is saved to storage
  private ensureApiKeyInStorage(): void {
    import('../config').then(config => {
      if (config.SPEECHIFY_API_KEY) {
        chrome.storage.local.get(['speechifyApiKey'], (result) => {
          if (!result.speechifyApiKey) {
            logger.info('Setting API key in storage from config');
            chrome.storage.local.set({ 
              speechifyApiKey: config.SPEECHIFY_API_KEY,
              selectedVoiceId: config.DEFAULT_SPEECHIFY_VOICE_ID
            });
          } else {
            logger.info('API key already exists in storage');
          }
        });
      } else {
        logger.error('No API key found in config!');
      }
    });
  }
  
  private setupSelectionButtonStateListener(): void {
    document.addEventListener('selection-button-state', (event: any) => {
      const state = event.detail.state;
      // Update the selection button state based on player state
      (this.selectionButton as any).setState(state);
    });
  }
  
  private setupVoiceStyleChangeListener(): void {
    document.addEventListener('voice-style-change', (event: any) => {
      const { emotion, cadence } = event.detail;
      
      // Update the player with the new style
      if (this.player && typeof (this.player as any).setSSMLStyle === 'function') {
        logger.info(`Updating player with new style: ${JSON.stringify({ emotion, cadence })}`);
        (this.player as any).setSSMLStyle({ emotion, cadence });
      }
    });
  }

  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'togglePanel') {
        this.togglePanel();
      }
      if (request.action === 'toggleSidePlayer') {
        this.togglePlayer();
      }
      if (request.action === 'toggleTopPlayer') {
        this.toggleTopPlayer();
      }
    });
  }
  
  private setupEventListeners(): void {
    // Listen for panel toggle event
    document.addEventListener('toggle-panel', () => {
      this.togglePanel();
    });
    
    // Listen for voice selector toggle event
    document.addEventListener('toggle-voice-selector', () => {
      this.toggleVoiceSelector();
    });
    
    // Listen for voice styler toggle event
    document.addEventListener('toggle-voice-styler', () => {
      this.toggleVoiceStyler();
    });
    
    // Listen for top player toggle event
    document.addEventListener('toggle-top-player', () => {
      this.toggleTopPlayer();
    });
  }
  
  private async toggleVoiceSelector(): Promise<void> {
    // If voice selector is already open, just remove it
    if (this.isVoiceSelectorOpen) {
      this.voiceSelector.remove();
      this.isVoiceSelectorOpen = false;
      
      // Remove document click listener if it exists
      if (this.documentClickListener) {
        document.removeEventListener('mousedown', this.documentClickListener);
        this.documentClickListener = null;
      }
      
      return;
    }
    
    // Close voice styler if open
    if (this.isVoiceStylerOpen) {
      this.voiceStyler.hide();
      this.isVoiceStylerOpen = false;
    }
    
    // Create voice selector (now async)
    await this.voiceSelector.create(this.isPanelOpen);
    this.isVoiceSelectorOpen = true;
    
    logger.info(`Voice selector created. Panel open: ${this.isPanelOpen}`);
    
    // Clean up any existing listener first
    if (this.documentClickListener) {
      document.removeEventListener('mousedown', this.documentClickListener);
      this.documentClickListener = null;
    }
    
    // Set up a listener to ensure the button goes back to microphone icon if 
    // the voice selector is closed by clicking outside or through other means
    this.documentClickListener = (event: MouseEvent) => {
      // Skip if voice selector is already closed
      if (!this.isVoiceSelectorOpen) return;
      
      // Get the voice selector element
      const voiceSelector = document.getElementById('extension-voice-selector');
      
      // If we have a selector and the click is outside of it
      if (voiceSelector && !voiceSelector.contains(event.target as Node)) {
        // Don't process if the click is on voice button itself (to avoid conflicts)
        const selectVoiceButton = document.querySelector('[data-state="open"]');
        if (selectVoiceButton && selectVoiceButton.contains(event.target as Node)) {
          return;
        }
        
        // Close the voice selector
        this.voiceSelector.remove();
        this.isVoiceSelectorOpen = false;
        
        // Get the select voice button and change its icon back to microphone
        if (selectVoiceButton) {
          // Add animation class
          selectVoiceButton.classList.add('voice-button-transition');
          
          // Change icon after short delay to coordinate with animation
          setTimeout(() => {
            selectVoiceButton.innerHTML = ICONS.microphone;
            selectVoiceButton.setAttribute('data-state', 'closed');
          }, 150);
          
          // Remove animation class after animation completes
          setTimeout(() => {
            selectVoiceButton.classList.remove('voice-button-transition');
          }, 300);
        }
        
        // Remove the document click listener
        document.removeEventListener('mousedown', this.documentClickListener!);
        this.documentClickListener = null;
      }
    };
    
    // Add the click listener to close on outside clicks
    document.addEventListener('mousedown', this.documentClickListener);
  }
  
  private toggleVoiceStyler(): void {
    // If voice styler is already open, just hide it
    if (this.isVoiceStylerOpen) {
      this.voiceStyler.hide();
      this.isVoiceStylerOpen = false;
      
      // Remove document click listener if it exists
      if (this.stylerClickListener) {
        document.removeEventListener('mousedown', this.stylerClickListener);
        this.stylerClickListener = null;
      }
      
      return;
    }
    
    // Close voice selector if open
    if (this.isVoiceSelectorOpen) {
      this.voiceSelector.remove();
      this.isVoiceSelectorOpen = false;
      
      if (this.documentClickListener) {
        document.removeEventListener('mousedown', this.documentClickListener);
        this.documentClickListener = null;
      }
    }
    
    // Show voice styler
    this.voiceStyler.show();
    this.isVoiceStylerOpen = true;
    
    logger.info(`Voice styler shown. Panel open: ${this.isPanelOpen}`);
    
    // Clean up any existing listener first
    if (this.stylerClickListener) {
      document.removeEventListener('mousedown', this.stylerClickListener);
      this.stylerClickListener = null;
    }
    
    // Set up a listener to close the styler when clicking outside
    this.stylerClickListener = (event: MouseEvent) => {
      // Skip if voice styler is already closed
      if (!this.isVoiceStylerOpen) return;
      
      // Get the voice styler element
      const voiceStyler = document.getElementById('extension-voice-styler');
      
      // If we have a styler and the click is outside of it
      if (voiceStyler && !voiceStyler.contains(event.target as Node)) {
        // Don't process if the click is on style button itself (to avoid conflicts)
        const styleButton = document.querySelector('.voice-style-toggle');
        if (styleButton && styleButton.contains(event.target as Node)) {
          return;
        }
        
        // Close the voice styler
        this.voiceStyler.hide();
        this.isVoiceStylerOpen = false;
        
        // Remove the document click listener
        document.removeEventListener('mousedown', this.stylerClickListener!);
        this.stylerClickListener = null;
      }
    };
    
    // Add the click listener to close on outside clicks
    document.addEventListener('mousedown', this.stylerClickListener);
  }

  private setupKeyboardShortcuts(): void {
    addKeyboardShortcuts(
      () => this.togglePanel(),
      () => this.togglePlayer()
    );
  }
  
  private togglePanel(): void {
    // Check current panel state before toggling
    const wasPanelOpen = this.isPanelOpen;
    
    // Toggle panel
    this.panel.toggle();
    
    // Update panel state
    this.isPanelOpen = !wasPanelOpen;
    
    // Get settings button with open state attribute
    const settingsButton = document.querySelector('[data-state="open"]');
    
    // If panel is closing and we have a settings button, update its icon
    if (wasPanelOpen && settingsButton) {
      // Add animation class
      settingsButton.classList.add('settings-button-transition');
      
      // Change icon after short delay to coordinate with animation
      setTimeout(() => {
        settingsButton.innerHTML = ICONS.settings;
        settingsButton.setAttribute('data-state', 'closed');
      }, 150);
      
      // Remove animation class after animation completes
      setTimeout(() => {
        settingsButton.classList.remove('settings-button-transition');
      }, 300);
      
      // Clean up panel click listener if it exists
      if (this.panelClickListener) {
        document.removeEventListener('mousedown', this.panelClickListener);
        this.panelClickListener = null;
      }
    } else if (!wasPanelOpen) {
      // Panel is opening, set up click outside listener
      this.setupPanelOutsideClickListener();
    }
    
    // Toggle the player's position by adding/removing the class
    const player = document.getElementById('extension-side-player');
    if (player) {
      if (this.isPanelOpen) {
        player.classList.add('next-to-panel');
      } else {
        // Wait for the panel animation to finish before moving the player back
        setTimeout(() => {
          player.classList.remove('next-to-panel');
        }, 50);
      }
    }
    
    // If voice selector is open, update its position
    const voiceSelector = document.getElementById('extension-voice-selector');
    if (voiceSelector) {
      if (this.isPanelOpen) {
        voiceSelector.classList.add('panel-open');
      } else {
        // Wait for the panel animation to finish before moving the voice selector back
        setTimeout(() => {
          voiceSelector.classList.remove('panel-open');
        }, 50);
      }
      logger.info(`Voice selector position updated from togglePanel. Panel open: ${this.isPanelOpen}`);
    }
    
    // If voice styler is open, update its position
    const voiceStyler = document.getElementById('extension-voice-styler');
    if (voiceStyler) {
      if (this.isPanelOpen) {
        voiceStyler.classList.add('panel-open');
      } else {
        // Wait for the panel animation to finish before moving the voice styler back
        setTimeout(() => {
          voiceStyler.classList.remove('panel-open');
        }, 50);
      }
      logger.info(`Voice styler position updated from togglePanel. Panel open: ${this.isPanelOpen}`);
    }
  }
  
  private setupPanelOutsideClickListener(): void {
    // Clean up any existing listener first
    if (this.panelClickListener) {
      document.removeEventListener('mousedown', this.panelClickListener);
      this.panelClickListener = null;
    }
    
    // Set up a listener to handle clicks outside the panel
    this.panelClickListener = (event: MouseEvent) => {
      // Skip if panel is already closed
      if (!this.isPanelOpen) return;
      
      // Get the panel element
      const panel = document.getElementById('extension-side-panel');
      
      // If we have a panel and the click is outside of it
      if (panel && !panel.contains(event.target as Node)) {
        // Don't process if the click is on settings button itself (to avoid conflicts)
        const settingsButton = document.querySelector('[data-state="open"]');
        if (settingsButton && settingsButton.contains(event.target as Node)) {
          return;
        }
        
        // Close the panel
        this.panel.toggle();
        this.isPanelOpen = false;
        
        // Update player position
        const player = document.getElementById('extension-side-player');
        if (player) {
          setTimeout(() => {
            player.classList.remove('next-to-panel');
          }, 50);
        }
        
        // Update voice selector position if open
        const voiceSelector = document.getElementById('extension-voice-selector');
        if (voiceSelector) {
          setTimeout(() => {
            voiceSelector.classList.remove('panel-open');
          }, 50);
        }
        
        // Update voice styler position if open
        const voiceStyler = document.getElementById('extension-voice-styler');
        if (voiceStyler) {
          setTimeout(() => {
            voiceStyler.classList.remove('panel-open');
          }, 50);
        }
        
        // Get the settings button and change its icon back
        if (settingsButton) {
          // Add animation class
          settingsButton.classList.add('settings-button-transition');
          
          // Change icon after short delay to coordinate with animation
          setTimeout(() => {
            settingsButton.innerHTML = ICONS.settings;
            settingsButton.setAttribute('data-state', 'closed');
          }, 150);
          
          // Remove animation class after animation completes
          setTimeout(() => {
            settingsButton.classList.remove('settings-button-transition');
          }, 300);
        }
        
        // Remove the document click listener
        document.removeEventListener('mousedown', this.panelClickListener!);
        this.panelClickListener = null;
      }
    };
    
    // Delay adding the listener until after the current click event has propagated
    setTimeout(() => {
      document.addEventListener('mousedown', this.panelClickListener!);
    }, 100);
  }
  
  private togglePlayer(): void {
    this.player.toggle(this.isPanelOpen);
    
    // Set up the selection playback listener when the player is created
    if (document.getElementById('extension-side-player')) {
      this.player.setupSelectionPlaybackListener();
    }
  }
  
  private toggleTopPlayer(): void {
    this.topPlayer.toggle();
  }
}

// Initialize the controller
const controller = new ExtensionController();
