import { SidePlayer } from './player';
import { SidePanel } from './panel';
import { VoiceSelector } from './voiceSelector';
import { SelectionButton } from './selectionButton';
import { TopPlayer } from './topPlayer';
import { addKeyboardShortcuts } from './utils';
import initializeTopPlayerPrefs from './topPlayerPrefsLoader';

// Import global CSS files to help Vite track dependencies
import '../../css/fonts.css';

// Initialize main controller
class ExtensionController {
  private player: SidePlayer;
  private panel: SidePanel;
  private voiceSelector: VoiceSelector;
  private selectionButton: SelectionButton;
  private topPlayer: TopPlayer;
  private isPanelOpen: boolean = false;
  private isVoiceSelectorOpen: boolean = false;

  constructor() {
    console.info('ContentScript is running');
    
    // Initialize components in the right order
    this.player = new SidePlayer();
    this.panel = new SidePanel();
    this.voiceSelector = new VoiceSelector();
    this.selectionButton = new SelectionButton();
    this.topPlayer = new TopPlayer();
    
    // Setup event listeners
    this.setupMessageListeners();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    
    // Ensure API key is set in storage from config
    this.ensureApiKeyInStorage();
    
    // Set up selection playback listener in player
    this.player.setupSelectionPlaybackListener();
    
    // Listen for selection button state changes
    this.setupSelectionButtonStateListener();
    
    // Initialize top player preferences
    initializeTopPlayerPrefs();
    
    // Create the side player immediately
    setTimeout(() => {
      this.player.create();
      
      // For the top player, wait for the page to be more fully loaded before creating it
      // This prevents the jumping/repositioning issue
      const createTopPlayer = () => {
        // First check if top player should be visible based on user settings
        chrome.storage.local.get(['topPlayerEnabled'], (result) => {
          // If the setting is explicitly false, don't create the top player
          if (result.topPlayerEnabled === false) {
            console.log('📖 [TopPlayer] Not creating top player as it is disabled in settings');
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
      if (config.ELEVENLABS_API_KEY) {
        chrome.storage.local.get(['apiKey'], (result) => {
          if (!result.apiKey) {
            console.log('Setting API key in storage from config');
            chrome.storage.local.set({ 
              apiKey: config.ELEVENLABS_API_KEY,
              selectedVoiceId: config.DEFAULT_VOICE_ID
            });
          } else {
            console.log('API key already exists in storage');
          }
        });
      } else {
        console.error('No API key found in config!');
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
    
    // Listen for top player toggle event
    document.addEventListener('toggle-top-player', () => {
      this.toggleTopPlayer();
    });
  }
  
  private toggleVoiceSelector(): void {
    // If voice selector is already open, just remove it
    if (this.isVoiceSelectorOpen) {
      this.voiceSelector.remove();
      this.isVoiceSelectorOpen = false;
      return;
    }
    
    // Create voice selector
    this.voiceSelector.create(this.isPanelOpen);
    this.isVoiceSelectorOpen = true;
    
    console.log(`Voice selector created. Panel open: ${this.isPanelOpen}`);
  }

  private setupKeyboardShortcuts(): void {
    addKeyboardShortcuts(
      () => this.togglePanel(),
      () => this.togglePlayer()
    );
  }
  
  private togglePanel(): void {
    // Toggle panel
    this.panel.toggle();
    
    // Update panel state
    this.isPanelOpen = !this.isPanelOpen;
    
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
      console.log(`Voice selector position updated from togglePanel. Panel open: ${this.isPanelOpen}`);
    }
  }
  
  private togglePlayer(): void {
    this.player.toggle(this.isPanelOpen);
  }
  
  private toggleTopPlayer(): void {
    this.topPlayer.toggle();
  }
}

// Initialize the controller
const controller = new ExtensionController();