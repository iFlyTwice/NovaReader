// SVG Icons
import { ICONS } from './utils';

// Import CSS to help Vite track dependencies
import '../../css/panel.css';
import '../../css/auth.css';

// Import Supabase client and auth functions
import { supabase, signIn, signUp, signOut, resetPassword, getUser, saveUserPreferences, getReadingStats, signInWithGoogle } from '../supabase/client';

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

  private getProfileContent(): string {
    return `
      <div class="panel-section" id="auth-section">
        <div class="panel-section-title">User Account</div>
        <div class="panel-section-content">
          <div id="auth-status-loading">
            <p>Loading authentication status...</p>
          </div>
          
          <div id="auth-logged-out" style="display: none;">
            <p>Sign in to sync your preferences across devices.</p>
            
            <div class="auth-tabs">
              <button class="auth-tab-btn active" data-tab="login">Login</button>
              <button class="auth-tab-btn" data-tab="signup">Sign Up</button>
            </div>
            
            <div class="auth-tab-content" id="login-tab">
              <form id="login-form">
                <div class="form-group">
                  <label class="form-label" for="login-email">Email</label>
                  <input type="email" id="login-email" class="form-control" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="login-password">Password</label>
                  <input type="password" id="login-password" class="form-control" required>
                </div>
                
                <div class="form-error" id="login-error"></div>
                
                <button type="submit" class="btn-primary">Sign In</button>
                <div class="form-footer">
                  <a href="#" id="forgot-password">Forgot Password?</a>
                </div>
              </form>
              
              <div class="social-login">
                <div class="social-divider"><span>OR</span></div>
                <button id="google-signin" class="btn-google">
                  <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>
              
              <div id="reset-password-form" style="display: none;">
                <h4>Reset Password</h4>
                <div class="form-group">
                  <label class="form-label" for="reset-email">Email</label>
                  <input type="email" id="reset-email" class="form-control" required>
                </div>
                
                <div class="form-error" id="reset-error"></div>
                <div class="form-success" id="reset-success"></div>
                
                <button id="send-reset-email" class="btn-primary">Send Reset Link</button>
                <button id="back-to-login" class="btn-secondary">Back to Login</button>
              </div>
            </div>
            
            <div class="auth-tab-content" id="signup-tab" style="display: none;">
              <form id="signup-form">
                <div class="form-group">
                  <label class="form-label" for="signup-email">Email</label>
                  <input type="email" id="signup-email" class="form-control" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="signup-password">Password</label>
                  <input type="password" id="signup-password" class="form-control" required minlength="6">
                  <div class="small-text">Password must be at least 6 characters</div>
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="signup-confirm-password">Confirm Password</label>
                  <input type="password" id="signup-confirm-password" class="form-control" required minlength="6">
                </div>
                
                <div class="form-error" id="signup-error"></div>
                <div class="form-success" id="signup-success"></div>
                
                <button type="submit" class="btn-primary">Create Account</button>
              </form>
              
              <div class="social-login">
                <div class="social-divider"><span>OR</span></div>
                <button id="google-signup" class="btn-google">
                  <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                  </svg>
                  Sign up with Google
                </button>
              </div>
            </div>
          </div>
          
          <div id="auth-logged-in" style="display: none;">
            <div class="user-info">
              <p>Logged in as: <span id="user-email"></span></p>
              <button id="logout-btn" class="btn-secondary">Sign Out</button>
            </div>
            
            <div class="sync-controls">
              <button id="sync-settings-btn" class="btn-primary">Sync Current Settings</button>
              <div id="sync-status"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="panel-section">
        <div class="panel-section-title">Reading Statistics</div>
        <div class="panel-section-content" id="reading-stats">
          <p>Sign in to track your reading habits and progress.</p>
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
        ${this.getDashboardContent()}
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
          this.checkAuthState(this.panelElement);
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
            this.checkAuthState(panel);
          }
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
        this.setupAuthHandlers(this.panelElement as HTMLElement);
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
  
  // Check authentication state and update UI accordingly
  private async checkAuthState(panel: HTMLElement): Promise<void> {
    console.log('[Auth] Checking auth state...');
    const loadingElement = panel.querySelector('#auth-status-loading');
    const loggedOutElement = panel.querySelector('#auth-logged-out');
    const loggedInElement = panel.querySelector('#auth-logged-in');
    const userEmailElement = panel.querySelector('#user-email');
    const readingStatsElement = panel.querySelector('#reading-stats');
    
    if (!loadingElement || !loggedOutElement || !loggedInElement) {
      console.error('[Auth] Auth elements not found in DOM');
      return;
    }
    
    try {
      // Get session directly from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (session && session.user) {
        const user = session.user;
        console.log('[Auth] User is logged in:', user.email);
        
        // Show logged in state
        loadingElement.setAttribute('style', 'display: none;');
        loggedOutElement.setAttribute('style', 'display: none;');
        loggedInElement.setAttribute('style', 'display: block;');
        
        // Set user email
        if (userEmailElement && user.email) {
          userEmailElement.textContent = user.email;
        }
        
        // Update reading stats if available
        if (readingStatsElement) {
          try {
            const { stats, error } = await getReadingStats(user.id);
            
            if (error) {
              throw error;
            }
            
            if (stats && stats.length > 0) {
              // Calculate total passages
              const totalPassages = stats.reduce((total, stat) => total + stat.passage_count, 0);
              
              // Get unique websites
              const uniqueWebsites = new Set(stats.map(stat => stat.website)).size;
              
              // Get most active day
              const dayMap = new Map();
              stats.forEach(stat => {
                const date = new Date(stat.read_date);
                const day = date.toLocaleDateString('en-US', { weekday: 'long' });
                dayMap.set(day, (dayMap.get(day) || 0) + stat.passage_count);
              });
              
              let mostActiveDay = '';
              let highestCount = 0;
              
              dayMap.forEach((count, day) => {
                if (count > highestCount) {
                  highestCount = count;
                  mostActiveDay = day;
                }
              });
              
              readingStatsElement.innerHTML = `
                <p>You've read ${totalPassages} passages across ${uniqueWebsites} websites.</p>
                ${mostActiveDay ? `<p>Your most active reading day is ${mostActiveDay}.</p>` : ''}
              `;
            } else {
              readingStatsElement.innerHTML = `
                <p>No reading activity recorded yet.</p>
                <p>Use the highlighting feature to start tracking your reading!</p>
              `;
            }
          } catch (statsError) {
            console.error('[Auth] Error fetching reading stats:', statsError);
            readingStatsElement.innerHTML = `<p>Unable to load reading statistics.</p>`;
          }
        }
      } else {
        console.log('[Auth] User is not logged in');
        // Show logged out state
        loadingElement.setAttribute('style', 'display: none;');
        loggedOutElement.setAttribute('style', 'display: block;');
        loggedInElement.setAttribute('style', 'display: none;');
        
        // Update reading stats
        if (readingStatsElement) {
          readingStatsElement.innerHTML = `<p>Sign in to track your reading habits and progress.</p>`;
        }
      }
    } catch (error) {
      console.error('[Auth] Error checking auth state:', error);
      // Show logged out state on error
      loadingElement.setAttribute('style', 'display: none;');
      loggedOutElement.setAttribute('style', 'display: block;');
      loggedInElement.setAttribute('style', 'display: none;');
    }
  }
  
  // Set up authentication event handlers
  private setupAuthHandlers(panel: HTMLElement): void {
    // Check auth state immediately
    this.checkAuthState(panel);
    
    // Set up tab switching
    const tabButtons = panel.querySelectorAll('.auth-tab-btn');
    const loginTab = panel.querySelector('#login-tab');
    const signupTab = panel.querySelector('#signup-tab');
    const resetForm = panel.querySelector('#reset-password-form');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        // Reset UI state
        if (resetForm) {
          resetForm.setAttribute('style', 'display: none;');
        }
        
        // Remove active class from all tab buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        const currentButton = e.currentTarget as HTMLElement;
        currentButton.classList.add('active');
        
        // Get the tab to show
        const tabToShow = currentButton.getAttribute('data-tab');
        
        // Show the selected tab
        if (tabToShow === 'login' && loginTab && signupTab) {
          loginTab.setAttribute('style', 'display: block;');
          signupTab.setAttribute('style', 'display: none;');
        } else if (tabToShow === 'signup' && loginTab && signupTab) {
          loginTab.setAttribute('style', 'display: none;');
          signupTab.setAttribute('style', 'display: block;');
        }
      });
    });

    // Google sign-in button
    const googleSignInButton = panel.querySelector('#google-signin');
    const googleSignUpButton = panel.querySelector('#google-signup');
    
    // Add event listeners for Google sign-in buttons
    if (googleSignInButton) {
      googleSignInButton.addEventListener('click', async () => {
        try {
          await signInWithGoogle();
        } catch (error) {
          console.error('[Auth] Google sign-in error:', error);
          const loginError = panel.querySelector('#login-error');
          if (loginError) {
            loginError.textContent = 'Failed to sign in with Google. Please try again.';
          }
        }
      });
    }
    
    if (googleSignUpButton) {
      googleSignUpButton.addEventListener('click', async () => {
        try {
          await signInWithGoogle();
        } catch (error) {
          console.error('[Auth] Google sign-up error:', error);
          const signupError = panel.querySelector('#signup-error');
          if (signupError) {
            signupError.textContent = 'Failed to sign up with Google. Please try again.';
          }
        }
      });
    }
    
    // Login form
    const loginForm = panel.querySelector('#login-form');
    const loginError = panel.querySelector('#login-error');
    
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = loginForm.querySelector('#login-email') as HTMLInputElement;
        const passwordInput = loginForm.querySelector('#login-password') as HTMLInputElement;
        
        if (!emailInput || !passwordInput) {
          console.error('[Auth] Login form inputs not found');
          return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
          if (loginError) {
            loginError.textContent = 'Please enter both email and password';
          }
          return;
        }
        
        try {
          // Clear previous errors
          if (loginError) {
            loginError.textContent = '';
          }
          
          // Sign in with Supabase
          console.log('[Auth] Attempting to sign in with:', email);
          const { data, error } = await signIn(email, password);
          
          if (error) {
            throw error;
          }
          
          // Successfully signed in
          console.log('[Auth] Sign in successful:', data);
          
          // Check auth state to update UI
          this.checkAuthState(panel);
          
          // Clear form
          emailInput.value = '';
          passwordInput.value = '';
        } catch (error: any) {
          console.error('[Auth] Sign in error:', error);
          
          if (loginError) {
            loginError.textContent = error.message || 'Failed to sign in. Please try again.';
          }
        }
      });
    }
    
    // Signup form
    const signupForm = panel.querySelector('#signup-form');
    const signupError = panel.querySelector('#signup-error');
    const signupSuccess = panel.querySelector('#signup-success');
    
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = signupForm.querySelector('#signup-email') as HTMLInputElement;
        const passwordInput = signupForm.querySelector('#signup-password') as HTMLInputElement;
        const confirmInput = signupForm.querySelector('#signup-confirm-password') as HTMLInputElement;
        
        if (!emailInput || !passwordInput || !confirmInput) {
          console.error('[Auth] Signup form inputs not found');
          return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmInput.value;
        
        // Clear previous messages
        if (signupError) {
          signupError.textContent = '';
        }
        if (signupSuccess) {
          signupSuccess.textContent = '';
        }
        
        // Validate inputs
        if (!email || !password || !confirmPassword) {
          if (signupError) {
            signupError.textContent = 'Please fill in all fields';
          }
          return;
        }
        
        if (password !== confirmPassword) {
          if (signupError) {
            signupError.textContent = 'Passwords do not match';
          }
          return;
        }
        
        if (password.length < 6) {
          if (signupError) {
            signupError.textContent = 'Password must be at least 6 characters';
          }
          return;
        }
        
        try {
          // Sign up with Supabase
          console.log('[Auth] Attempting to sign up with:', email);
          const { data, error } = await signUp(email, password);
          
          if (error) {
            throw error;
          }
          
          // Successfully signed up
          console.log('[Auth] Sign up successful:', data);
          
          if (signupSuccess) {
            signupSuccess.textContent = 'Account created! Please check your email to confirm your account.';
          }
          
          // Clear form
          emailInput.value = '';
          passwordInput.value = '';
          confirmInput.value = '';
        } catch (error: any) {
          console.error('[Auth] Sign up error:', error);
          
          if (signupError) {
            signupError.textContent = error.message || 'Failed to create account. Please try again.';
          }
        }
      });
    }
    
    // Logout button
    const logoutButton = panel.querySelector('#logout-btn');
    
    if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
        try {
          console.log('[Auth] Attempting to sign out');
          const { error } = await signOut();
          
          if (error) {
            throw error;
          }
          
          // Successfully signed out
          console.log('[Auth] Sign out successful');
          
          // Check auth state to update UI
          this.checkAuthState(panel);
        } catch (error) {
          console.error('[Auth] Sign out error:', error);
        }
      });
    }
    
    // Forgot password link
    const forgotPasswordLink = panel.querySelector('#forgot-password');
    
    if (forgotPasswordLink && loginTab && resetForm) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginTab.setAttribute('style', 'display: none;');
        resetForm.setAttribute('style', 'display: block;');
      });
    }
    
    // Back to login button
    const backToLoginButton = panel.querySelector('#back-to-login');
    
    if (backToLoginButton && loginTab && resetForm) {
      backToLoginButton.addEventListener('click', () => {
        resetForm.setAttribute('style', 'display: none;');
        loginTab.setAttribute('style', 'display: block;');
      });
    }
    
    // Send reset email button
    const sendResetButton = panel.querySelector('#send-reset-email');
    const resetError = panel.querySelector('#reset-error');
    const resetSuccess = panel.querySelector('#reset-success');
    
    if (sendResetButton) {
      sendResetButton.addEventListener('click', async () => {
        const resetEmailInput = panel.querySelector('#reset-email') as HTMLInputElement;
        
        if (!resetEmailInput) {
          console.error('[Auth] Reset email input not found');
          return;
        }
        
        const email = resetEmailInput.value.trim();
        
        // Clear previous messages
        if (resetError) {
          resetError.textContent = '';
        }
        if (resetSuccess) {
          resetSuccess.textContent = '';
        }
        
        if (!email) {
          if (resetError) {
            resetError.textContent = 'Please enter your email';
          }
          return;
        }
        
        try {
          console.log('[Auth] Sending password reset email to:', email);
          const { data, error } = await resetPassword(email);
          
          if (error) {
            throw error;
          }
          
          // Successfully sent reset email
          console.log('[Auth] Password reset email sent');
          
          if (resetSuccess) {
            resetSuccess.textContent = 'Password reset email sent. Please check your inbox.';
          }
          
          // Clear form
          resetEmailInput.value = '';
        } catch (error: any) {
          console.error('[Auth] Password reset error:', error);
          
          if (resetError) {
            resetError.textContent = error.message || 'Failed to send reset email. Please try again.';
          }
        }
      });
    }
    
    // Sync settings button
    const syncButton = panel.querySelector('#sync-settings-btn');
    const syncStatus = panel.querySelector('#sync-status');
    
    if (syncButton) {
      syncButton.addEventListener('click', async () => {
        if (!syncStatus) {
          return;
        }
        
        try {
          syncStatus.textContent = 'Syncing settings...';
          syncStatus.className = '';
          
          // Get current user
          const { user, error } = await getUser();
          
          if (error || !user) {
            throw new Error('Not logged in');
          }
          
          // Get current settings
          chrome.storage.local.get([
            'apiKey',
            'selectedModel',
            'playbackSpeed',
            'highlightEnabled',
            'selectionButtonColor'
          ], async (settings) => {
            try {
              // Save settings to Supabase
              const { error } = await saveUserPreferences(user.id, settings);
              
              if (error) {
                throw error;
              }
              
              console.log('[Auth] Settings synced successfully');
              syncStatus.textContent = 'Settings synced successfully!';
              syncStatus.className = 'form-success';
              
              // Clear status after a few seconds
              setTimeout(() => {
                if (syncStatus) {
                  syncStatus.textContent = '';
                }
              }, 3000);
            } catch (error: any) {
              console.error('[Auth] Error syncing settings:', error);
              syncStatus.textContent = error.message || 'Failed to sync settings. Please try again.';
              syncStatus.className = 'form-error';
            }
          });
        } catch (error: any) {
          console.error('[Auth] Error syncing settings:', error);
          syncStatus.textContent = error.message || 'Failed to sync settings. Please try again.';
          syncStatus.className = 'form-error';
        }
      });
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
