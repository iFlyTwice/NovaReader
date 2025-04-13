// SVG Icons
import { ICONS } from './utils';
// Import CSS to help Vite track dependencies
import '../../css/panel.css';

export class SidePanel {
  private panelId: string = 'extension-side-panel';
  private isOpen: boolean = false;
  private panelElement: HTMLElement | null = null;

  constructor() {
    // No need to inject styles separately as they're included in manifest
  }
  
  // Define content for each navigation item
  private getDashboardContent(): string {
    return `
      <div class="panel-section">
        <div class="panel-section-title">Quick Stats</div>
        <div class="panel-section-content">
          Welcome to NovaReader! Select text on any webpage and use our tools to enhance your reading experience.
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Recent Activity</div>
        <div class="panel-section-content">
          Your reading activity will appear here.
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Favorites</div>
        <div class="panel-section-content">
          Your favorite passages will appear here.
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Tips</div>
        <div class="panel-section-content">
          Try highlighting any text on the page and click the play button that appears to have it read aloud.
        </div>
      </div>
    `;
  }
  
  private getHighlightToListenContent(): string {
    // First render without the checked attribute - we'll set it properly when storage loads
    return `
      <div class="panel-section">
        <div class="panel-section-title">Highlight to Listen</div>
        <div class="panel-section-content">
          <div class="switch-container">
            <span class="switch-label">Enable highlighting feature</span>
            <label class="switch">
              <input type="checkbox" id="highlight-toggle">
              <span class="slider"></span>
            </label>
          </div>
          <p>Select any text on the page to hear it read aloud.</p>
          <p>Use the player controls to adjust volume and playback speed.</p>
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Selection Button Style</div>
        <div class="panel-section-content">
          <div class="form-group">
            <label class="form-label">Selection Button Color</label>
            <div class="color-picker-container">
              <input type="color" id="selection-button-color" value="#27272a" class="form-control">
              <div class="color-preview" id="color-preview" style="background-color: #27272a;"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Voice Selection</div>
        <div class="panel-section-content">
          <p>Click the voice icon in the player to choose from different voice options.</p>
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Reset Settings</div>
        <div class="panel-section-content">
          <button id="reset-highlight-settings" class="btn-secondary">Reset Highlighting Settings</button>
          <p class="small-text">This will reset all highlighting settings for this tab.</p>
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Keyboard Shortcuts</div>
        <div class="panel-section-content">
          <p>Alt+P: Toggle player</p>
          <p>Alt+R: Toggle panel</p>
        </div>
      </div>
    `;
  }
  
  // Click to Listen content removed

  private getProfileContent(): string {
    return `
      <div class="panel-section">
        <div class="panel-section-title">User Profile</div>
        <div class="panel-section-content">
          <p>Sign in to save your preferences across devices.</p>
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Reading Statistics</div>
        <div class="panel-section-content">
          Track your reading habits and progress.
        </div>
      </div>
    `;
  }
  
  private getSettingsContent(): string {
    return `
      <div class="panel-section">
        <div class="panel-section-title">API Settings</div>
        <div class="panel-section-content">
          <div class="form-group">
            <label class="form-label">ElevenLabs API Key</label>
            <input type="password" id="api-key-input" placeholder="Enter ElevenLabs API Key" class="form-control" />
            <button id="save-api-key" class="btn-primary">Save Key</button>
            <div class="api-key-status"></div>
          </div>
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Voice Options</div>
        <div class="panel-section-content">
          <div class="form-group">
            <label class="form-label">Text-to-Speech Model</label>
            <div class="custom-select">
              <select id="model-selector" class="form-control">
                <option value="eleven_turbo_v2">Turbo (Fast)</option>
                <option value="eleven_monolingual_v1">Standard</option>
                <option value="eleven_multilingual_v2">Multilingual</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Playback Settings</div>
        <div class="panel-section-content">
          <div class="form-group">
            <label class="form-label">Playback Speed: <span id="speed-value">1.0x</span></label>
            <input type="range" min="0.5" max="2" step="0.1" value="1" id="speed-slider" class="form-control" />
          </div>
        </div>
      </div>
    `;
  }

  private getPanelHTML(): string {
    // Get extension URL for accessing resources
    const extensionUrl = chrome.runtime.getURL('img/logo.png');
    
    return `
      <div class="panel-header">
        <div class="panel-logo">
          <div class="panel-logo-icon">
            <img src="${extensionUrl}" alt="NovaReader logo" class="logo-img"/>
          </div>
          <div class="panel-title" style="font-family: 'Heiback', sans-serif; letter-spacing: 1px;">NovaReader</div>
        </div>
        <div class="panel-close">${ICONS.close}</div>
      </div>
      
      <div class="nav-menu">
        <div class="nav-item active" data-section="dashboard">
          <span class="nav-item-icon">${ICONS.dashboard}</span>
          Dashboard
        </div>
        <div class="nav-item" data-section="highlight">
          <span class="nav-item-icon">${ICONS.headphones}</span>
          Highlight to Listen
        </div>
        <div class="nav-item" data-section="profile">
          <span class="nav-item-icon">${ICONS.user}</span>
          Profile
        </div>
        <div class="nav-item" data-section="settings">
          <span class="nav-item-icon">${ICONS.settingsGear}</span>
          Settings
        </div>
      </div>
      
      <div class="panel-content">
        ${this.getDashboardContent()}
      </div>
    `;
  }

  public create(): void {
    // Check if panel already exists
    if (document.getElementById(this.panelId)) {
      return;
    }

    // Create panel container
    const panel = document.createElement('div');
    panel.id = this.panelId;
    
    // Add font styles directly
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Heiback';
        src: url('${chrome.runtime.getURL('fonts/Heiback.otf')}') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);
    
    panel.innerHTML = this.getPanelHTML();
    
    // Add panel to page
    document.body.appendChild(panel);
    
    // Add event listener to close button
    const closeButton = panel.querySelector('.panel-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        // Use the same toggle-panel event that the settings button uses
        // This ensures the player gets repositioned correctly
        const event = new CustomEvent('toggle-panel');
        document.dispatchEvent(event);
      });
    }
    
    // Add event listeners to nav items
    const navItems = panel.querySelectorAll('.nav-item');
    const panelContent = panel.querySelector('.panel-content');
    
    if (!panelContent) {
      console.error('Panel content element not found');
      return;
    }
    
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Remove active class from all nav items
        navItems.forEach(navItem => navItem.classList.remove('active'));
        
        // Add active class to clicked item
        const currentItem = e.currentTarget as HTMLElement;
        currentItem.classList.add('active');
        
        // Get the section identifier
        const section = currentItem.getAttribute('data-section');
        
        // Update panel content based on selected section
        if (section) {
          this.updatePanelContent(panelContent as HTMLElement, section);
        }
      });
    });
    
    // Set up API key handling if we're on the settings page
    this.setupSettingsHandlers(panel);
    
    this.panelElement = panel;
    
    // Check if we need to update the highlight toggle immediately 
    // (in case the user opened the highlight tab directly)
    setTimeout(() => {
      const highlightToggle = panel.querySelector('#highlight-toggle') as HTMLInputElement;
      if (highlightToggle) {
        chrome.storage.local.get(['highlightEnabled'], (result) => {
          if (result.highlightEnabled !== undefined) {
            highlightToggle.checked = result.highlightEnabled;
            console.log(`[Panel] Initial highlight toggle state set to ${result.highlightEnabled ? 'checked' : 'unchecked'}`);
          }
        });
      }
    }, 100);
    
    // Open panel with animation
    requestAnimationFrame(() => {
      panel.classList.add('open');
      this.isOpen = true;
    });
  }

  public toggle(): void {
    const panel = document.getElementById(this.panelId);
    
    if (!panel) {
      this.create();
      return;
    }
    
    if (panel.classList.contains('open')) {
      panel.classList.remove('open');
      
      // Wait for panel animation to complete before removing from DOM
      setTimeout(() => {
        panel.remove();
        this.isOpen = false;
      }, 300);
    } else {
      panel.classList.add('open');
      this.isOpen = true;
    }
  }

  public remove(): void {
    const panel = document.getElementById(this.panelId);
    if (panel) {
      panel.remove();
      this.isOpen = false;
    }
  }
  
  // Update panel content based on selected section
  private updatePanelContent(contentElement: HTMLElement, section: string): void {
    // Clear existing content
    contentElement.innerHTML = '';
    
    // Add new content based on selected section
    switch (section) {
      case 'dashboard':
        contentElement.innerHTML = this.getDashboardContent();
        break;
      case 'highlight':
        contentElement.innerHTML = this.getHighlightToListenContent();
        // Load highlight state from storage immediately
        chrome.storage.local.get(['highlightEnabled'], (result) => {
          const highlightToggle = contentElement.querySelector('#highlight-toggle') as HTMLInputElement;
          if (highlightToggle && result.highlightEnabled !== undefined) {
            highlightToggle.checked = result.highlightEnabled;
            console.log(`[Panel] Setting highlight toggle to ${result.highlightEnabled ? 'checked' : 'unchecked'} from storage`);
          }
        });
        break;
      case 'profile':
        contentElement.innerHTML = this.getProfileContent();
        break;
      case 'settings':
        contentElement.innerHTML = this.getSettingsContent();
        // Set up settings handlers after updating content
        if (this.panelElement) {
          this.setupSettingsHandlers(this.panelElement);
        }
        break;
      default:
        contentElement.innerHTML = this.getDashboardContent();
    }
  }
  
  // Set up event handlers for settings page
  private setupSettingsHandlers(panel: HTMLElement): void {
    // Delay slightly to ensure the DOM is updated
    setTimeout(() => {
      // API Key settings
      const apiKeyInput = panel.querySelector('#api-key-input') as HTMLInputElement;
      const saveKeyButton = panel.querySelector('#save-api-key') as HTMLButtonElement;
      const statusElement = panel.querySelector('.api-key-status') as HTMLElement;
      const modelSelector = panel.querySelector('#model-selector') as HTMLSelectElement;
      const speedSlider = panel.querySelector('#speed-slider') as HTMLInputElement;
      const speedValue = panel.querySelector('#speed-value') as HTMLElement;
      
      // Highlight to Listen settings
      const highlightToggle = panel.querySelector('#highlight-toggle') as HTMLInputElement;
      const selectionColorPicker = panel.querySelector('#selection-button-color') as HTMLInputElement;
      const colorPreview = panel.querySelector('#color-preview') as HTMLElement;
      const resetButton = panel.querySelector('#reset-highlight-settings') as HTMLButtonElement;
      
      // Load saved settings if available
      chrome.storage.local.get([
        'apiKey', 
        'selectedModel', 
        'playbackSpeed', 
        'highlightEnabled', 
        'selectionButtonColor'
      ], (result) => {
        // API Key
        if (result.apiKey && apiKeyInput) {
          apiKeyInput.value = result.apiKey;
          if (statusElement) {
            statusElement.textContent = 'API key is set';
            statusElement.classList.add('success');
          }
        }
        
        // Model selector
        if (result.selectedModel && modelSelector) {
          modelSelector.value = result.selectedModel;
        }
        
        // Playback speed
        if (result.playbackSpeed && speedSlider && speedValue) {
          speedSlider.value = result.playbackSpeed.toString();
          speedValue.textContent = `${result.playbackSpeed}x`;
        }
        
        // Highlight toggle
        if (highlightToggle && result.highlightEnabled !== undefined) {
          highlightToggle.checked = result.highlightEnabled;
          // Dispatch event to notify the SelectionButton
          this.updateHighlightingState(result.highlightEnabled);
        }
        
        // Selection button color
        if (selectionColorPicker && result.selectionButtonColor) {
          selectionColorPicker.value = result.selectionButtonColor;
          if (colorPreview) {
            colorPreview.style.backgroundColor = result.selectionButtonColor;
          }
          // Update the selection button color
          this.updateSelectionButtonColor(result.selectionButtonColor);
        }
      });
      
      // Save API key
      if (saveKeyButton && apiKeyInput && statusElement) {
        saveKeyButton.addEventListener('click', () => {
          const apiKey = apiKeyInput.value.trim();
          
          if (!apiKey) {
            statusElement.textContent = 'Please enter an API key';
            statusElement.classList.add('error');
            statusElement.classList.remove('success');
            return;
          }
          
          // Save API key to storage
          chrome.storage.local.set({ apiKey }, () => {
            statusElement.textContent = 'API key saved successfully';
            statusElement.classList.add('success');
            statusElement.classList.remove('error');
          });
        });
      }
      
      // Model selector
      if (modelSelector) {
        modelSelector.addEventListener('change', () => {
          const selectedModel = modelSelector.value;
          chrome.storage.local.set({ selectedModel });
        });
      }
      
      // Speed slider
      if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', () => {
          const speed = parseFloat(speedSlider.value);
          speedValue.textContent = `${speed.toFixed(1)}x`;
          chrome.storage.local.set({ playbackSpeed: speed });
        });
      }
      
      // Highlight toggle
      if (highlightToggle) {
        highlightToggle.addEventListener('change', () => {
          const isEnabled = highlightToggle.checked;
          console.log(`[Panel] Highlight toggle changed to: ${isEnabled ? 'enabled' : 'disabled'}`);
          
          // Immediately update the UI to match
          highlightToggle.checked = isEnabled;
          
          // Save to storage with callback to ensure it's saved
          chrome.storage.local.set({ highlightEnabled: isEnabled }, () => {
            console.log(`[Panel] Highlighting saved to storage: ${isEnabled ? 'enabled' : 'disabled'}`);
            
            // Dispatch the event to update the button state
            this.updateHighlightingState(isEnabled);
            
            // Double check after a small delay to ensure the state is properly applied
            setTimeout(() => {
              // Re-read from storage to verify
              chrome.storage.local.get(['highlightEnabled'], (result) => {
                console.log(`[Panel] Verifying highlight state in storage: ${result.highlightEnabled ? 'enabled' : 'disabled'}`);
                // If there's a mismatch, force update again
                if (result.highlightEnabled !== isEnabled) {
                  console.log(`[Panel] State mismatch detected, correcting!`);
                  chrome.storage.local.set({ highlightEnabled: isEnabled });
                  this.updateHighlightingState(isEnabled);
                }
              });
            }, 200);
          });
        });
      }
      
      // Color picker
      if (selectionColorPicker && colorPreview) {
        selectionColorPicker.addEventListener('input', () => {
          const color = selectionColorPicker.value;
          colorPreview.style.backgroundColor = color;
        });
        
        selectionColorPicker.addEventListener('change', () => {
          const color = selectionColorPicker.value;
          chrome.storage.local.set({ selectionButtonColor: color }, () => {
            console.log(`Selection button color updated to ${color}`);
            this.updateSelectionButtonColor(color);
          });
        });
      }
      
      // Click-to-listen related code removed
      
      // Reset button
      if (resetButton) {
        resetButton.addEventListener('click', () => {
          // Default values
          const defaults = {
            highlightEnabled: true,
            selectionButtonColor: '#27272a'
          };
          
          // Reset in storage
          chrome.storage.local.set(defaults, () => {
            console.log('Highlighting settings reset to defaults');
            
            // Update UI elements
            if (highlightToggle) highlightToggle.checked = defaults.highlightEnabled;
            if (selectionColorPicker) selectionColorPicker.value = defaults.selectionButtonColor;
            if (colorPreview) colorPreview.style.backgroundColor = defaults.selectionButtonColor;
            
            // Update actual components
            this.updateHighlightingState(defaults.highlightEnabled);
            this.updateSelectionButtonColor(defaults.selectionButtonColor);
          });
        });
      }
    }, 100);
  }
  
  // Update the highlighting state (enable/disable)
  private updateHighlightingState(isEnabled: boolean): void {
    const event = new CustomEvent('update-highlighting-state', {
      detail: { enabled: isEnabled }
    });
    document.dispatchEvent(event);
  }
  
  // Update the selection button color
  private updateSelectionButtonColor(color: string): void {
    const event = new CustomEvent('update-selection-button-color', {
      detail: { color }
    });
    document.dispatchEvent(event);
  }
  
  public isVisible(): boolean {
    return this.isOpen;
  }
}
