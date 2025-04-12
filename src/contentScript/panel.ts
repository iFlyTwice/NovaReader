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
        <div class="nav-item active">
          <span class="nav-item-icon">${ICONS.dashboard}</span>
          Dashboard
        </div>
        <div class="nav-item">
          <span class="nav-item-icon">${ICONS.headphones}</span>
          Highlight to Listen
        </div>
        <div class="nav-item">
          <span class="nav-item-icon">${ICONS.user}</span>
          Profile
        </div>
        <div class="nav-item">
          <span class="nav-item-icon">${ICONS.settingsGear}</span>
          Settings
        </div>
      </div>
      
      <div class="panel-content">
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
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Remove active class from all nav items
        navItems.forEach(navItem => navItem.classList.remove('active'));
        // Add active class to clicked item
        (e.currentTarget as HTMLElement).classList.add('active');
        
        // Handle navigation
        const navText = (e.currentTarget as HTMLElement).textContent?.trim();
        console.log(`Navigation: ${navText}`);
      });
    });
    
    this.panelElement = panel;
    
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
  
  public isVisible(): boolean {
    return this.isOpen;
  }
}
