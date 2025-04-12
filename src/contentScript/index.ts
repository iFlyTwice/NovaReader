import { SidePlayer } from './player';
import { SidePanel } from './panel';
import { addKeyboardShortcuts } from './utils';

// Initialize main controller
class ExtensionController {
  private player: SidePlayer;
  private panel: SidePanel;
  private isPanelOpen: boolean = false;

  constructor() {
    console.info('ContentScript is running');
    
    // Initialize components
    this.player = new SidePlayer();
    this.panel = new SidePanel();
    
    // Setup event listeners
    this.setupMessageListeners();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    
    // Create the player immediately
    setTimeout(() => {
      this.player.create();
    }, 500);
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
  }
  
  private togglePlayer(): void {
    this.player.toggle(this.isPanelOpen);
  }
}

// Initialize the controller
const controller = new ExtensionController();
