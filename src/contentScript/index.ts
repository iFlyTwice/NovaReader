import { SidePlayer } from './player';
import { SidePanel } from './panel';
import { VoiceSelector } from './voiceSelector';
import { SelectionButton } from './selectionButton';
import { addKeyboardShortcuts } from './utils';

// Import global CSS files to help Vite track dependencies
import '../../css/fonts.css';

// Initialize main controller
class ExtensionController {
  private player: SidePlayer;
  private panel: SidePanel;
  private voiceSelector: VoiceSelector;
  private selectionButton: SelectionButton;
  private isPanelOpen: boolean = false;
  private isVoiceSelectorOpen: boolean = false;

  constructor() {
    console.info('ContentScript is running');
    
    // Initialize components in the right order
    this.player = new SidePlayer();
    this.panel = new SidePanel();
    this.voiceSelector = new VoiceSelector();
    this.selectionButton = new SelectionButton();
    
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
    
    // Create the player immediately
    setTimeout(() => {
      this.player.create();
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
}

// Initialize the controller
const controller = new ExtensionController();