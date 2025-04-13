// Import CSS to help Vite track dependencies
import '../../css/top-player.css';

// Import Icons
import { ICONS } from './utils';
import { SettingsDropdown, SettingsDropdownProps } from './SettingsDropdown';

export class TopPlayer {
  private playerId: string = 'nova-top-player';
  private isPlaying: boolean = false;
  private isVisible: boolean = false;
  private playerElement: HTMLElement | null = null;
  private title: string = 'Listen to This Page';
  private duration: string = '12 min';
  private settingsDropdown: SettingsDropdown | null = null;
  
  constructor() {
    // No need to inject styles separately as they're included in manifest
  }
  
  private getPlayerHTML(): string {
    // Use the same settings icon as the side player
    return `
      <div class="top-player-content" data-nova-reader="top-player-content">
        <button class="top-player-play-button" id="top-player-play-button" data-nova-reader="play-button">
          <img src="${chrome.runtime.getURL("assets/play.svg")}" alt="Play" width="14" height="14" />
        </button>
        <div class="top-player-title" data-nova-reader="title">${this.title}</div>
        <div class="top-player-duration" data-nova-reader="duration">${this.duration}</div>
        <div class="top-player-controls" data-nova-reader="controls">
          <div class="top-player-playback-speed" data-nova-reader="playback-speed">
            <span class="top-player-playback-speed-text">1x</span>
          </div>
          <button class="top-player-settings-button" id="top-player-settings-button" data-nova-reader="settings-button">
            ${ICONS.settings}
          </button>
        </div>
      </div>
      <div class="top-player-progress-bar" data-nova-reader="progress-bar">
        <div class="top-player-progress" id="top-player-progress" data-nova-reader="progress"></div>
      </div>
    `;
  }
  
  public create(): void {
    // Check if player already exists
    if (document.getElementById(this.playerId)) {
      return;
    }
    
    // Create player container
    const player = document.createElement('div');
    player.id = this.playerId;
    player.className = 'top-player-container';
    
    // Set player HTML
    player.innerHTML = this.getPlayerHTML();
    
    // Get the hostname to detect specific sites
    const hostname = window.location.hostname;
    
    // Special handling for Coursera
    if (hostname.includes('coursera.org')) {
      this.insertForCoursera(player);
    } else if (this.isNewsSite(hostname)) {
      // Special handling for news sites
      this.insertForNewsSite(player);
    } else {
      // Default approach: find a suitable H1 or content container
      this.insertDefault(player);
    }
    
    // Save reference to player
    this.playerElement = player;
    this.isVisible = true;
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  private isNewsSite(hostname: string): boolean {
    const newsDomains = [
      'cnn.com', 'nytimes.com', 'bbc.com', 'reuters.com', 
      'theguardian.com', 'washingtonpost.com', 'tododisc'
    ];
    
    return newsDomains.some(domain => hostname.includes(domain));
  }
  
  private insertForCoursera(player: HTMLElement): void {
    console.log('[TopPlayer] Detected Coursera, using Coursera-specific insertion');
    
    try {
      // The most reliable position is right after the reading-title div
      // This is the exact position shown in your second screenshot
      const readingTitle = document.querySelector('div.reading-title');
      if (readingTitle) {
        // Insert after the reading title (before the content)
        if (readingTitle.nextSibling) {
          readingTitle.parentNode.insertBefore(player, readingTitle.nextSibling);
        } else {
          // If no next sibling, append after reading title
          readingTitle.parentNode.appendChild(player);
        }
        console.log('[TopPlayer] Inserted player after reading title');
        return;
      }
      
      // If no reading title found yet, target one of the other key elements
      // These are backup options that shouldn't be needed due to our waiting approach
      
      // Try to find the course content container
      const courseContent = document.querySelector('.rc-CML');
      if (courseContent) {
        // Insert before the course content
        courseContent.parentNode.insertBefore(player, courseContent);
        console.log('[TopPlayer] Inserted player before course content');
        return;
      }
      
      // Look for the item-page-content or main content area
      const contentArea = document.querySelector('.item-page-content') || 
                         document.querySelector('.rc-DesktopLayout') ||
                         document.querySelector('div[role="main"]') ||
                         document.querySelector('main');
      
      if (contentArea) {
        // Insert at the top of the content area
        contentArea.insertBefore(player, contentArea.firstChild);
        console.log('[TopPlayer] Inserted player at top of content area');
        return;
      }
      
      // If all specific approaches fail, use the default insertion
      console.log('[TopPlayer] No suitable Coursera container found, using fallback');
      this.insertDefault(player);
    } catch (err) {
      console.error('[TopPlayer] Error inserting for Coursera:', err);
      // Fallback to default insertion if anything goes wrong
      this.insertDefault(player);
    }
  }
  
  private insertForNewsSite(player: HTMLElement): void {
    console.log('[TopPlayer] Detected news site, using news site-specific insertion');
    
    try {
      // For news sites, try to insert before the article title or headline
      const articleTitle = document.querySelector('h1.article-title') ||
                          document.querySelector('h1.headline') ||
                          document.querySelector('h1.title') ||
                          document.querySelector('article h1') ||
                          document.querySelector('.article-header h1');
      
      if (articleTitle) {
        // Insert before the article title
        articleTitle.parentNode.insertBefore(player, articleTitle);
        console.log('[TopPlayer] Inserted player before article title');
      } else {
        // If the article title is not found, use the default insertion
        this.insertDefault(player);
      }
    } catch (err) {
      console.error('[TopPlayer] Error inserting for news site:', err);
      // Fallback to default insertion if anything goes wrong
      this.insertDefault(player);
    }
  }
  
  private insertDefault(player: HTMLElement): void {
    try {
      // Find the first H1 element on the page
      // We need to find a visible H1 element that's in the main content area
      const allH1s = document.querySelectorAll('h1');
      let targetH1 = null;
      
      // Try to find a visible H1 that's likely part of the main content
      for (const h1 of allH1s) {
        // Check if H1 is visible (has dimensions and is not hidden)
        const style = window.getComputedStyle(h1);
        const isVisible = style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         style.opacity !== '0' &&
                         h1.getBoundingClientRect().height > 0;
        
        if (isVisible) {
          // Check if this H1 is likely in the main content area
          // (not in header, nav, sidebar, etc.)
          const isInHeader = h1.closest('header') !== null;
          const isInNav = h1.closest('nav') !== null;
          const isInFooter = h1.closest('footer') !== null;
          const isInAside = h1.closest('aside') !== null;
          
          if (!isInHeader && !isInNav && !isInFooter && !isInAside) {
            targetH1 = h1;
            break;
          } else if (!targetH1) {
            // If we only find H1s in header/nav/etc. areas, use the first visible one as a fallback
            targetH1 = h1;
          }
        }
      }
      
      if (targetH1) {
        // If we found a suitable H1, insert the player before it
        console.log('[TopPlayer] Found H1, inserting player before it');
        targetH1.parentNode.insertBefore(player, targetH1);
        return;
      }
      
      // Fallback: add player to page (at the top of the content)
      console.log('[TopPlayer] No suitable H1 found, using fallback insertion');
      
      // Try to find a suitable content container
      const contentContainers = [
        'main', 'article', '.content', '#content', '.main-content',
        '.article-content', '.post-content', '.entry-content'
      ];
      
      let contentArea = null;
      
      for (const selector of contentContainers) {
        contentArea = document.querySelector(selector);
        if (contentArea) break;
      }
      
      // If no content container is found, use the body
      if (!contentArea) {
        contentArea = document.body;
      }
      
      if (contentArea.firstChild) {
        contentArea.insertBefore(player, contentArea.firstChild);
      } else {
        contentArea.appendChild(player);
      }
    } catch (err) {
      console.error('[TopPlayer] Error in default insertion:', err);
      // Ultimate fallback - just add to body
      document.body.insertBefore(player, document.body.firstChild);
    }
  }
  
  private setupEventHandlers(): void {
    if (!this.playerElement) return;
    
    // Play/Pause button
    const playButton = this.playerElement.querySelector('#top-player-play-button');
    if (playButton) {
      playButton.addEventListener('click', () => {
        this.togglePlayPause();
      });
    }
    
    // Settings button
    const settingsButton = this.playerElement.querySelector('#top-player-settings-button');
    
    if (settingsButton) {
      settingsButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling up
        
        // If dropdown is already open, close it
        if (this.settingsDropdown?.isOpen()) {
          this.closeSettingsDropdown();
          return;
        }
        
        // Instead of using absolute positioning, we'll append the dropdown directly to the top player
        // This ensures it moves with the player when scrolling
        
        // Create the dropdown with reference to the settings button
        this.settingsDropdown = new SettingsDropdown({
          buttonElement: settingsButton,
          onSettingsClick: () => {
            console.log('Top Player: Settings clicked');
            // You would typically open settings here
          },
          onHidePlayerClick: () => {
            console.log('Top Player: Hide player clicked');
            this.hide();
          },
          onClose: () => {
            this.settingsDropdown = null;
          }
        });
        
        // Append the dropdown to the document body instead of inside the button
        // This prevents it from being cut off by overflow: hidden
        document.body.appendChild(this.settingsDropdown.render());
      });
    }
    
    // Playback speed
    const playbackSpeed = this.playerElement.querySelector('.top-player-playback-speed');
    if (playbackSpeed) {
      playbackSpeed.addEventListener('click', () => {
        // Simple speed cycle: 1x -> 1.5x -> 2x -> 0.5x -> 0.75x -> 1x
        const speedText = playbackSpeed.querySelector('.top-player-playback-speed-text');
        if (speedText) {
          const currentSpeed = speedText.textContent || '1x';
          let newSpeed = '1x';
          
          switch (currentSpeed) {
            case '1x': newSpeed = '1.5x'; break;
            case '1.5x': newSpeed = '2x'; break;
            case '2x': newSpeed = '0.5x'; break;
            case '0.5x': newSpeed = '0.75x'; break;
            case '0.75x': newSpeed = '1x'; break;
            default: newSpeed = '1x';
          }
          
          speedText.textContent = newSpeed;
          console.log('Top Player: Playback speed changed to', newSpeed);
          
          // Here you would typically change the actual playback speed
        }
      });
    }
  }
  
  private closeSettingsDropdown(): void {
    if (this.settingsDropdown) {
      this.settingsDropdown.close();
      this.settingsDropdown = null;
    }
  }
  
  // We now handle scrolling within the SettingsDropdown component
  
  // Track current state
  private state: 'play' | 'loading' | 'speaking' = 'play';
  
  private setState(newState: 'play' | 'loading' | 'speaking'): void {
    this.state = newState;
    
    if (!this.playerElement) return;
    
    const playButton = this.playerElement.querySelector('#top-player-play-button');
    if (!playButton) return;
    
    switch (newState) {
      case 'play':
        playButton.innerHTML = `<img src="${chrome.runtime.getURL("assets/play.svg")}" alt="Play" width="14" height="14" />`;
        this.isPlaying = false;
        break;
      case 'loading':
        playButton.innerHTML = `<img src="${chrome.runtime.getURL("assets/spinner.svg")}" alt="Loading" width="14" height="14" />`;
        // Set timeout to revert to play state if loading takes too long
        setTimeout(() => {
          if (this.state === 'loading') {
            this.setState('play');
          }
        }, 8000);
        break;
      case 'speaking':
        playButton.innerHTML = `<img src="${chrome.runtime.getURL("assets/pause.svg")}" alt="Pause" width="14" height="14" />`;
        this.isPlaying = true;
        break;
    }
  }

  private togglePlayPause(): void {
    if (this.state === 'speaking') {
      this.setState('play');
      this.pauseProgressAnimation();
    } else if (this.state === 'play') {
      // First go to loading state
      this.setState('loading');
      
      // Simulate loading delay
      setTimeout(() => {
        // Only proceed if still in loading state
        if (this.state === 'loading') {
          this.setState('speaking');
          this.startProgressAnimation();
        }
      }, 1000);
    }
    // Do nothing if already in loading state
  }
  
  private startProgressAnimation(): void {
    // This would typically be handled by the actual audio player
    // For this demo, we'll just simulate progress
    const progressBar = this.playerElement?.querySelector('#top-player-progress') as HTMLElement;
    if (progressBar) {
      // Reset to 0
      progressBar.style.width = '0%';
      
      // Animate to 100% over 12 minutes (720000ms)
      // For demo purposes, let's speed this up significantly
      let progress = 0;
      const interval = setInterval(() => {
        if (this.state !== 'speaking') {
          clearInterval(interval);
          return;
        }
        
        progress += 0.5;
        if (progress >= 100) {
          clearInterval(interval);
          this.setState('play'); // Auto-pause when complete
        } else {
          progressBar.style.width = `${progress}%`;
        }
      }, 500); // Update every 500ms
    }
  }
  
  private pauseProgressAnimation(): void {
    // In a real implementation, this would pause the actual animation
    // For this demo, the animation is paused when the interval is cleared in startProgressAnimation
  }
  
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  public hide(): void {
    if (!this.playerElement) return;
    
    this.playerElement.style.display = 'none';
    this.isVisible = false;
  }
  
  public show(): void {
    if (!this.playerElement) {
      this.create();
    } else {
      this.playerElement.style.display = 'block';
      this.isVisible = true;
    }
  }
  
  public isPlayerVisible(): boolean {
    return this.isVisible;
  }
  
  public setTitle(title: string): void {
    this.title = title;
    
    if (!this.playerElement) return;
    
    const titleElement = this.playerElement.querySelector('.top-player-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }
  
  public setDuration(duration: string): void {
    this.duration = duration;
    
    if (!this.playerElement) return;
    
    const durationElement = this.playerElement.querySelector('.top-player-duration');
    if (durationElement) {
      durationElement.textContent = duration;
    }
  }
  
  // Removed reposition method as we're now using a smarter creation approach
  
  public remove(): void {
    if (!this.playerElement) return;
    
    // Close settings dropdown if open
    this.closeSettingsDropdown();
    
    // Remove from DOM
    this.playerElement.remove();
    this.playerElement = null;
    this.isVisible = false;
  }
}
