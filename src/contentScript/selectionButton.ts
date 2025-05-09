// Selection Button Implementation
import { ICONS } from './utils';
import { createLogger } from '../utils/logger';

// Create a logger instance for this module
const logger = createLogger('SelectionButton');

// Import CSS to help Vite track dependencies
import '../../css/selectionButton.css';

export class SelectionButton {
  private buttonId: string = 'extension-selection-button';
  private buttonElement: HTMLImageElement | null = null;
  private currentState: 'play' | 'loading' | 'speaking' = 'play';
  private selectedText: string = '';
  private isEnabled: boolean = true; // Default to enabled
  private buttonColor: string = '#27272a'; // Default zinc color
  private _resetTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Verify that assets are available
    this.verifyAssets();
    
    // Load settings from storage first, to avoid showing button if disabled
    this.loadSettingsAndInitialize();
  }
  
  // Modified method to load settings first, then initialize other components
  private loadSettingsAndInitialize(): void {
    chrome.storage.local.get(['highlightEnabled', 'selectionButtonColor'], (result) => {
      // Set the enable state
      if (result.highlightEnabled !== undefined) {
        this.isEnabled = result.highlightEnabled;
        logger.info(`Initial highlighting state: ${this.isEnabled ? 'enabled' : 'disabled'}`);
      }
      
      // Set the button color
      if (result.selectionButtonColor) {
        this.buttonColor = result.selectionButtonColor;
        logger.info(`Initial button color: ${this.buttonColor}`);
      }
      
      // Only now create the button (with correct initial state)
      this.createButton();
      
      // Set up the selection change listener
      this.setupSelectionListener();
      
      // Setup event listeners for settings changes
      this.setupSettingsListeners();
    });
  }
  
  // The loadSettings method has been replaced by loadSettingsAndInitialize
  
  // Set up listeners for settings changes
  private setupSettingsListeners(): void {
    // Listen for highlight state changes
    document.addEventListener('update-highlighting-state', (event: any) => {
      const { enabled } = event.detail;
      this.isEnabled = enabled;
      logger.info(`Highlighting ${enabled ? 'enabled' : 'disabled'}`);
      
      // Always hide button if disabled, regardless of current state
      if (!enabled && this.buttonElement) {
        // Apply multiple hiding methods
        this.hideButton();
        // Force style to none for extra certainty
        this.buttonElement.style.display = "none";
        this.buttonElement.style.visibility = "hidden";
        
        // Set a timeout to enforce hiding again (catches race conditions)
        setTimeout(() => {
          if (this.buttonElement && !this.isEnabled) {
            logger.info('Double-checking button is hidden');
            this.buttonElement.style.display = "none";
            this.buttonElement.style.visibility = "hidden";
          }
        }, 100);
      } else if (enabled) {
        // When re-enabled, check current selection to see if button should be shown
        this.handleSelectionChange();
      }
    });
    
    // Listen for color changes
    document.addEventListener('update-selection-button-color', (event: any) => {
      const { color } = event.detail;
      this.buttonColor = color;
      logger.info(`Color updated to ${color}`);
      
      // Update button color if it exists
      if (this.buttonElement) {
        this.buttonElement.style.backgroundColor = color;
      }
    });
  }
  
  // Verify that required assets are available
  private verifyAssets(): void {
    const requiredAssets = [
      "assets/play.svg",
      "assets/spinner.svg",
      "assets/pause.svg"
    ];
    
    requiredAssets.forEach(asset => {
      try {
        const url = chrome.runtime.getURL(asset);
        logger.info(`Asset URL for ${asset}: ${url}`);
        
        // Test that these assets can actually be fetched
        fetch(url)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to load asset: ${response.status} ${response.statusText}`);
            }
            logger.info(`Successfully verified asset: ${asset}`);
          })
          .catch(error => {
            logger.error(`Asset fetch failed for ${asset}: ${error}`);
          });
      } catch (error) {
        logger.error(`Asset verification failed for ${asset}: ${error}`);
      }
    });
  }

  private createButton(): void {
    // Check if button already exists
    if (document.getElementById(this.buttonId)) {
      return;
    }

    // Create button element
    const button = document.createElement('img') as HTMLImageElement;
    button.id = this.buttonId;
    button.alt = "Text to speech button";
    button.setAttribute("role", "button");
    button.src = chrome.runtime.getURL("assets/play.svg"); // Make sure path is correct
    
    // Explicitly set display and visibility based on enabled state
    button.style.display = "none"; // Always start hidden
    button.style.visibility = "hidden"; // Add extra visibility property
    logger.info(`Creating button with highlighting ${this.isEnabled ? 'enabled' : 'disabled'}`);
    
    // Set the button color from settings
    button.style.backgroundColor = this.buttonColor;
    
    // Add click event
    button.addEventListener('click', () => {
      this.handleButtonClick();
    });

    // Add to document
    document.body.appendChild(button);
    this.buttonElement = button;
  }

  private setupSelectionListener(): void {
    document.addEventListener('selectionchange', () => {
      this.handleSelectionChange();
    });
  }

  private handleSelectionChange(): void {
    // CRITICAL CHECK: If highlighting is disabled, don't show the button under any circumstances
    if (!this.isEnabled) {
      this.hideButton();
      // Double ensure the button is hidden
      if (this.buttonElement) {
        this.buttonElement.style.display = "none";
        this.buttonElement.style.visibility = "hidden";
      }
      return;
    }
    
    const selection = window.getSelection();

    if (!selection || !selection.anchorNode || !selection.focusNode) {
      this.hideButton();
      return;
    }

    // Detect if input element was selected
    const isInputElement = 
      selection.anchorNode.nodeName === 'INPUT' || 
      selection.focusNode.nodeName === 'INPUT' ||
      selection.anchorNode.nodeName === 'TEXTAREA' || 
      selection.focusNode.nodeName === 'TEXTAREA' ||
      selection.anchorNode.parentElement?.tagName === 'FORM' ||
      selection.focusNode.parentElement?.tagName === 'FORM';

    if (isInputElement) {
      this.hideButton();
      return;
    }

    // If text is selected (not collapsed)
    if (!selection.isCollapsed) {
      // Get selected text
      this.selectedText = selection.toString().trim();
      
      if (this.selectedText) {
        // Position the button at the end of the selection
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        const lastRect = rects[rects.length - 1];
        
        if (lastRect && this.buttonElement) {
          // Ensure the button has the correct color
          this.buttonElement.style.backgroundColor = this.buttonColor;
          
          // Double-check that highlighting is still enabled
          if (!this.isEnabled) {
            this.hideButton();
            return;
          }
          
          // FINAL CHECK: Only show the button if highlighting is enabled
          if (!this.isEnabled) {
            // Don't show the button if highlighting is disabled
            this.hideButton();
            return;
          }
          
          // Position the button
          this.buttonElement.style.left = window.scrollX + lastRect.right + "px";
          this.buttonElement.style.top = window.scrollY + lastRect.bottom + "px";
          this.buttonElement.style.display = "block";
          this.buttonElement.style.visibility = "visible"; // Ensure visibility is also set
        }
      } else {
        this.hideButton();
      }
    } else {
      this.hideButton();
    }
  }

  // Modified to be public so it can be used by ParagraphListener
  public hideButton(): void {
    if (this.buttonElement) {
      this.buttonElement.style.display = "none";
      this.buttonElement.style.visibility = "hidden"; // Add extra visibility property for redundancy
    }
    this.selectedText = '';
  }
  
  // New method to explicitly show button at a position (for ParagraphListener)
  public showButtonAt(left: number, top: number): void {
    if (!this.buttonElement) return;
    
    // Position the button
    this.buttonElement.style.left = left + "px";
    this.buttonElement.style.top = top + "px";
    
    // Show the button
    this.buttonElement.style.display = "block";
    this.buttonElement.style.visibility = "visible";
  }

  private handleButtonClick(): void {
    if (!this.selectedText) return;
    
    // Clear any existing Speechify audio URL to avoid using stale data
    if (typeof window !== 'undefined') {
      if ((window as any).__speechifyAudioUrl) {
        logger.info('Clearing existing Speechify audio URL');
        try {
          // If it's a blob URL, revoke it to prevent memory leaks
          if ((window as any).__speechifyAudioUrl.startsWith('blob:')) {
            URL.revokeObjectURL((window as any).__speechifyAudioUrl);
          }
        } catch (error) {
          logger.warn(`Error revoking URL: ${error}`);
        }
        (window as any).__speechifyAudioUrl = null;
      }
    }
    
    // Update button state
    if (this.currentState === 'speaking') {
      // If already speaking, pause playback
      logger.info('Pausing playback');
      this.setState('play');
      // Dispatch event to pause playback, keeping the text so we can resume later
      this.dispatchPlaybackEvent('pause', this.selectedText);
    } else {
      // If not speaking, start/resume playback
      logger.info('Starting/resuming playback');
      this.setState('loading');
      
      // Ensure the player is visible before dispatching the play event
      const playerVisibilityEvent = new CustomEvent('ensure-player-visible', {
        detail: { text: this.selectedText }
      });
      document.dispatchEvent(playerVisibilityEvent);
      
      // Dispatch event to start playback with selected text
      this.dispatchPlaybackEvent('play', this.selectedText);
    }
  }

  // Method to update the button state from external sources
  public setState(state: 'play' | 'loading' | 'speaking'): void {
    logger.info(`State: ${state}`);
    
    this.currentState = state;
    
    if (!this.buttonElement) {
      logger.warn('⚠️ Element not found');
      return;
    }
    
    // Update button appearance based on state
    try {
      // Clear any existing timeouts
      if (this._resetTimeout) {
        clearTimeout(this._resetTimeout);
        this._resetTimeout = null;
      }
      
      switch (state) {
        case 'play':
          this.buttonElement.src = chrome.runtime.getURL("assets/play.svg");
          break;
        case 'loading':
          this.buttonElement.src = chrome.runtime.getURL("assets/spinner.svg");
          // Set a timeout to reset to play state if stuck loading for too long
          this._resetTimeout = setTimeout(() => {
            if (this.currentState === 'loading') {
              logger.warn('Stuck in loading state for 8 seconds, auto-resetting');
              this.setState('play');
              
              // Show a tooltip warning
              this.showTooltip('Error loading audio. Please try again.');
            }
          }, 8000); // 8 seconds timeout - faster feedback
          break;
        case 'speaking':
          this.buttonElement.src = chrome.runtime.getURL("assets/pause.svg");
          break;
      }
    } catch (error) {
      logger.error(`Error setting button state: ${error}`);
      // Attempt to reset to a safe state
      try {
        this.buttonElement.src = chrome.runtime.getURL("assets/play.svg");
      } catch (fallbackError) {
        logger.error(`Failed to set fallback icon: ${fallbackError}`);
      }
    }
  }
  
  // Show tooltip with message
  private showTooltip(message: string): void {
    // Create tooltip if doesn't exist
    let tooltip = document.getElementById('selection-button-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'selection-button-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
      tooltip.style.color = 'white';
      tooltip.style.padding = '5px 10px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '12px';
      tooltip.style.zIndex = '10000';
      tooltip.style.pointerEvents = 'none';
      document.body.appendChild(tooltip);
    }
    
    // Position near selection button
    if (this.buttonElement) {
      const buttonRect = this.buttonElement.getBoundingClientRect();
      tooltip.style.top = `${window.scrollY + buttonRect.bottom + 5}px`;
      tooltip.style.left = `${window.scrollX + buttonRect.left}px`;
    }
    
    // Set message and show
    tooltip.textContent = message;
    tooltip.style.display = 'block';
    
    // Hide after delay
    setTimeout(() => {
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    }, 3000);
  }

  // Updated to support pause for preserving playback position
  private dispatchPlaybackEvent(action: 'play' | 'stop' | 'pause', text?: string): void {
    logger.info(`Event: ${action}`);
    const event = new CustomEvent('selection-playback', {
      detail: {
        action,
        text
      }
    });
    document.dispatchEvent(event);
  }
}
