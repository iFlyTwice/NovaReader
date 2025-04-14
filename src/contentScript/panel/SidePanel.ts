/**
 * SidePanel class for the NovaReader extension
 */

// SVG Icons
import { ICONS } from '../utils';

// Import CSS to help Vite track dependencies
import '../../../css/panel.css';
import '../../../css/auth.css';

// Import panel content generators
import { getDashboardContent } from './content/dashboardContent';
import { getHighlightToListenContent } from './content/highlightContent';
import { getProfileContent } from './content/profileContent';
import { getSettingsContent } from './content/settingsContent';

// Import handlers
import { checkAuthState, setupAuthHandlers } from './handlers/authHandlers';
import { setupSettingsHandlers } from './handlers/settingsHandlers';

export class SidePanel {
  private panelId: string = 'extension-side-panel';
  private isOpen: boolean = false;
  private panelElement: HTMLElement | null = null;

  constructor() {
    // No need to inject styles separately as they're included in manifest
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
          <div class="panel-title">NovaReader</div>
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
        ${getDashboardContent()}
      </div>
    `;
  }

  public create(): void {
    // Check if panel already exists
    if (document.getElementById(this.panelId)) {
      return;
    }

    // Create panel container with a higher CSS specificity approach
    const panel = document.createElement('div');
    panel.id = this.panelId;
    panel.setAttribute('data-extension-panel', 'true');
    
    // Create an isolating container for panel contents
    const panelWrapper = document.createElement('div');
    panelWrapper.className = 'nova-reader-panel-wrapper';
    
    // Add font styles directly to ensure they load
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Heiback';
        src: url('${chrome.runtime.getURL('fonts/Heiback.otf')}') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
      
      /* Extra styles to ensure consistent rendering */
      #${this.panelId} * {
        box-sizing: border-box !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
      }
      
      #${this.panelId} .panel-title {
        font-family: 'Heiback', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      }
      
      #${this.panelId} input, 
      #${this.panelId} button, 
      #${this.panelId} select, 
      #${this.panelId} textarea {
        appearance: none !important;
        -webkit-appearance: none !important;
        border-radius: 6px !important;
        margin: 0 !important;
        font-size: 14px !important;
      }
    `;
    document.head.appendChild(style);
    
    // Set panel HTML
    panel.innerHTML = this.getPanelHTML();
    
    // Add extra attributes to all form elements for style isolation
    const formElements = panel.querySelectorAll('input, select, button, textarea');
    formElements.forEach(el => {
      el.setAttribute('data-novardr-element', 'true');
    });
    
    // Apply force-override styles directly to the element
    panel.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      right: -350px !important;
      width: 350px !important;
      height: 100vh !important;
      background-color: #1c1c1c !important;
      color: #fff !important;
      z-index: 999999 !important;
      transition: right 0.3s ease-in-out !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
      border-left: 1px solid #333 !important;
      padding-right: 6px !important;
      border-top-left-radius: 16px !important;
      border-bottom-left-radius: 16px !important;
      box-shadow: -4px 0 15px rgba(0, 0, 0, 0.4),
                0 0 0 2px rgba(255, 255, 255, 0.05),
                -8px 0 25px rgba(0, 0, 0, 0.6),
                -2px 0 5px rgba(0, 0, 0, 0.5) !important;
      overflow-y: auto !important;
    `;
    
    // Add panel to page
    document.body.appendChild(panel);
    
    // Listen for auth state changes from background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'AUTH_STATE_CHANGED') {
        console.log('[Panel] Auth state changed:', message.authState);
        // Update UI based on auth state
        if (this.panelElement) {
          checkAuthState(this.panelElement);
        }
      }
    });
    
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
          
          // Special case for profile section, check auth state
          if (section === 'profile') {
            checkAuthState(panel);
          }
        }
      });
    });
    
    // Set up API key handling if we're on the settings page
    setupSettingsHandlers(panel);
    
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
      panel.style.right = '0';
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
      panel.style.right = '-350px';
      
      // Wait for panel animation to complete before removing from DOM
      setTimeout(() => {
        panel.remove();
        this.isOpen = false;
      }, 300);
    } else {
      panel.classList.add('open');
      panel.style.right = '0';
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
        contentElement.innerHTML = getDashboardContent();
        break;
      case 'highlight':
        contentElement.innerHTML = getHighlightToListenContent();
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
        contentElement.innerHTML = getProfileContent();
        setupAuthHandlers(this.panelElement as HTMLElement, checkAuthState);
        break;
      case 'settings':
        contentElement.innerHTML = getSettingsContent();
        // Set up settings handlers after updating content
        if (this.panelElement) {
          setupSettingsHandlers(this.panelElement);
        }
        break;
      default:
        contentElement.innerHTML = getDashboardContent();
    }
  }
  
  public isVisible(): boolean {
    return this.isOpen;
  }
}
