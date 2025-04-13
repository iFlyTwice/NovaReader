// Import CSS to help Vite track dependencies
import '../../css/top-player.css';

// Import Icons
import { ICONS } from './utils';
import { SettingsDropdown, SettingsDropdownProps } from './SettingsDropdown';
import { AudioStreamPlayer } from './audioPlayer';

export class TopPlayer {
  private playerId: string = 'nova-top-player';
  private isPlaying: boolean = false;
  private isVisible: boolean = false;
  private playerElement: HTMLElement | null = null;
  private title: string = 'Listen to This Page';
  private duration: string = '12 min';
  private settingsDropdown: SettingsDropdown | null = null;
  
  // Audio player for text-to-speech
  private audioPlayer: AudioStreamPlayer;
  
  // Current page text
  private pageText: string = '';
  
  // Default voice settings
  private defaultVoiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Example: Adam voice
  private defaultModelId: string = 'eleven_turbo_v2';
  
  constructor() {
    // Initialize the audio player
    this.audioPlayer = new AudioStreamPlayer();
    
    // Set up callbacks for audio player events
    this.audioPlayer.setCallbacks({
      onPlaybackStart: () => this.handlePlaybackStart(),
      onPlaybackEnd: () => this.handlePlaybackEnd(),
      onPlaybackError: (error) => this.handlePlaybackError(error),
      onTimeUpdate: (currentTime, duration) => this.updateTimeDisplay(currentTime, duration)
    });
    
    // Extract page text for the "Listen to This Page" feature
    this.extractPageText();
    
    // Set up listener for voice selection changes
    this.setupVoiceSelectionListener();
  }
  
  // Listen for voice selection changes
  private setupVoiceSelectionListener(): void {
    document.addEventListener('voice-selected', (event: any) => {
      const { voiceId } = event.detail;
      console.log('[TopPlayer] Voice selection changed to:', voiceId);
      this.defaultVoiceId = voiceId;
    });
  }
  
  // All paragraphs on the page
  private paragraphs: string[] = [];
  
  // Current paragraph index
  private currentParagraphIndex: number = 0;
  
  // Extract the main text content from the page in paragraphs
  private extractPageText(): void {
    console.log('[TopPlayer] Extracting page text...');
    
    try {
      // Find the main content container
      let mainContent = document.querySelector('body');
      
      // Coursera-specific selector - with better targeting 
      if (window.location.hostname.includes('coursera.org')) {
        const possibleContentContainers = [
          document.querySelector('.rc-CML'),
          document.querySelector('.item-page-content'),
          document.querySelector('.rc-DesktopLayout')
        ];
        
        for (const container of possibleContentContainers) {
          if (container) {
            mainContent = container;
            console.log('[TopPlayer] Found Coursera-specific content container');
            break;
          }
        }
      } else {
        // Try common content selectors for other sites
        const contentSelectors = [
          'article', 'main', '.article-content', '.post-content', '.entry-content',
          '.content', '#content', '.main-content'
        ];
        
        for (const selector of contentSelectors) {
          const container = document.querySelector(selector);
          if (container) {
            mainContent = container;
            console.log(`[TopPlayer] Found content container: ${selector}`);
            break;
          }
        }
      }
      
      // Get text directly from the DOM structure
      // Specifically, start looking for text AFTER the top player to avoid picking up text before it
      // Find our own element first
      const topPlayerElement = document.getElementById(this.playerId);
      let startElement = null;
      
      if (topPlayerElement) {
        console.log('[TopPlayer] Found top player element, will extract text after it');
        
        // Find the next sibling element or parent's next sibling
        let current = topPlayerElement;
        while (current && !startElement) {
          // Check next sibling
          if (current.nextElementSibling) {
            startElement = current.nextElementSibling;
            break;
          }
          
          // Move up to parent and try again
          current = current.parentElement;
        }
      }
      
      // If we couldn't find a good starting element, just use the main content
      if (!startElement) {
        startElement = mainContent;
        console.log('[TopPlayer] Using main content as starting element');
      }
      
      // Collect all text nodes under the start element
      const paragraphs: string[] = [];
      const processNode = (node: Node) => {
        // Skip the player element if we encounter it
        if (node === topPlayerElement) {
          return;
        }
        
        // Process text nodes
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text && text.length > 25) { // Longer threshold to avoid small fragments
            paragraphs.push(text);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Skip certain elements
          const tagName = (node as Element).tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'svg', 'nav', 'header', 'footer'].includes(tagName)) {
            return;
          }
          
          // For paragraph-like elements, get their full text content
          if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'div'].includes(tagName)) {
            const text = node.textContent?.trim();
            if (text && text.length > 25) {
              paragraphs.push(text);
              return; // Skip processing children individually
            }
          }
          
          // Process children for other elements
          node.childNodes.forEach(child => processNode(child));
        }
      };
      
      // Process the start element
      processNode(startElement);
      
      // If we didn't find any paragraphs, try a more aggressive approach
      if (paragraphs.length === 0) {
        console.log('[TopPlayer] No paragraphs found, using fallback text extraction');
        
        // Get all paragraph-like elements
        const paragraphElements = mainContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div:not(:has(*))');
        
        paragraphElements.forEach(el => {
          // Skip empty elements and very short text
          const text = el.textContent?.trim();
          if (text && text.length > 25) {
            paragraphs.push(text);
          }
        });
        
        // If still no paragraphs, split by line breaks
        if (paragraphs.length === 0) {
          const text = mainContent.innerText;
          const chunks = text.split(/\n\s*\n/);
          
          chunks.forEach(chunk => {
            const trimmed = chunk.trim();
            if (trimmed && trimmed.length > 25) {
              paragraphs.push(trimmed);
            }
          });
        }
      }
      
      // Remove duplicates and save
      this.paragraphs = [...new Set(paragraphs)];
      
      // Set initial text to the first paragraph if available
      this.currentParagraphIndex = 0;
      if (this.paragraphs.length > 0) {
        this.pageText = this.paragraphs[0];
      }
      
      // Get total word count for all paragraphs
      const wordCount = this.paragraphs.reduce((count, paragraph) => {
        return count + paragraph.split(/\s+/).length;
      }, 0);
      
      // Estimate reading time (assuming average reading speed of 200 words per minute)
      const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));
      
      // Update the duration display
      this.duration = `${readingTimeMinutes} min`;
      
      // Update UI if player is already created
      if (this.playerElement) {
        const durationElement = this.playerElement.querySelector('.top-player-duration');
        if (durationElement) {
          durationElement.textContent = `${readingTimeMinutes} min`;
        }
      }
      
      console.log(`[TopPlayer] Extracted ${this.paragraphs.length} paragraphs with ${wordCount} words, estimated reading time: ${readingTimeMinutes} minutes`);
      
      // Debug output for first few paragraphs
      if (this.paragraphs.length > 0) {
        console.log('[TopPlayer] First paragraph:', this.paragraphs[0].substring(0, 100) + '...');
      } else {
        // Only log as debug, not error - we'll try again later
        console.debug('[TopPlayer] No paragraphs extracted in initial attempt');
      }
    } catch (error) {
      console.error('[TopPlayer] Error extracting page text:', error);
    }
  }
  
  private getPlayerHTML(): string {
    // Calculate initial reading time if we have paragraphs
    if (this.paragraphs.length === 0) {
      // Initial estimate until text is extracted
      this.duration = "1 min";
      
      // Start text extraction here to get a more accurate time as soon as possible
      setTimeout(() => this.extractPageText(), 100);
    }
    
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
    
    // Listen for toggle-panel event (from the dropdown settings option)
    document.addEventListener('toggle-panel', () => {
      console.log('[TopPlayer] Received toggle-panel event');
      // Dispatch an event that the parent content script can listen for
      const event = new CustomEvent('open-panel');
      document.dispatchEvent(event);
    });
    
    // Extract page text after a short delay to ensure the DOM is settled
    setTimeout(() => {
      this.extractPageText();
      
      // If no paragraphs were found, try again with a different approach
      if (this.paragraphs.length === 0) {
        console.debug('[TopPlayer] Using fallback extraction method');
        // Use a simpler but more aggressive extraction method
        this.fallbackTextExtraction();
      }
    }, 1000);
  }
  
  // Fallback method for text extraction that's more aggressive
  private fallbackTextExtraction(): void {
    console.debug('[TopPlayer] Starting fallback extraction');
    
    try {
      // Get all visible text on the page
      const allText = document.body.innerText;
      
      // Split by various separators
      const rawParagraphs = allText.split(/\n+|\.\s+|。|！|？|\?|!|;|；/g);
      
      // Filter and clean
      this.paragraphs = rawParagraphs
        .filter(p => {
          const cleaned = p.trim();
          // Keep only substantial text chunks
          return cleaned.length > 30 && cleaned.split(/\s+/).length > 5;
        })
        .map(p => p.trim());
      
      // Update page text and duration
      if (this.paragraphs.length > 0) {
        this.pageText = this.paragraphs[0];
        
        // Calculate word count and reading time
        const wordCount = this.paragraphs.reduce((count, p) => count + p.split(/\s+/).length, 0);
        const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));
        this.duration = `${readingTimeMinutes} min`;
        
        // Update UI if player is already created
        if (this.playerElement) {
          const durationElement = this.playerElement.querySelector('.top-player-duration');
          if (durationElement) {
            durationElement.textContent = `${readingTimeMinutes} min`;
          }
        }
        
        console.log(`📖 [TopPlayer] Found ${this.paragraphs.length} paragraphs with ${wordCount} words (${readingTimeMinutes} min)`);
      } else {
        console.debug('[TopPlayer] Still waiting for content to load');
      }
    } catch (error) {
      console.error('[TopPlayer] Error in fallback text extraction:', error);
    }
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
  
  // Audio player event handlers
  private handlePlaybackStart(): void {
    console.log('[TopPlayer] Playback started');
    this.isPlaying = true;
    this.setState('speaking');
  }
  
  private handlePlaybackEnd(): void {
    console.log('[TopPlayer] Playback ended');
    this.isPlaying = false;
    this.setState('play');
    this.pauseProgressAnimation();
  }
  
  private handlePlaybackError(error: string): void {
    console.error('[TopPlayer] Playback error:', error);
    this.isPlaying = false;
    this.setState('play');
    this.pauseProgressAnimation();
    
    // Check for common error types and display appropriate messages
    if (error.includes('quota') || error.includes('credits')) {
      // Show a quota error notification
      this.showErrorNotification('ElevenLabs API quota exceeded. Please upgrade your ElevenLabs account or try a shorter text.');
    } else if (error.includes('Unauthorized')) {
      // Show an authentication error notification
      this.showErrorNotification('API key error. Please check your ElevenLabs API key in the extension settings.');
    } else if (error.includes('timeout')) {
      // Show a timeout error notification
      this.showErrorNotification('Playback timed out. Trying with a shorter text segment...');
    } else {
      // Generic error
      this.showErrorNotification('Playback error. Please try again with a shorter text or refresh the page.');
    }
  }
  
  /**
   * Show an error notification to the user
   */
  private showErrorNotification(message: string): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'top-player-notification';
    notification.textContent = message;
    
    // Style the notification
    notification.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
    notification.style.color = 'white';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '10000';
    notification.style.maxWidth = '300px';
    notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    notification.style.fontSize = '14px';
    
    // Add close button
    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '10px';
    closeButton.style.fontSize = '18px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => notification.remove();
    
    notification.appendChild(closeButton);
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove();
      }
    }, 8000);
  }
  
  private updateTimeDisplay(currentTime: number, duration: number): void {
    if (!duration || isNaN(duration)) return;
    
    // Calculate playback progress percentage
    const progressPercentage = (currentTime / duration) * 100;
    
    // Update progress bar
    if (this.playerElement) {
      const progressBar = this.playerElement.querySelector('#top-player-progress') as HTMLElement;
      if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
      }
    }
  }
  
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
      // Stop playback
      this.stopPlayback();
    } else if (this.state === 'play') {
      // Start playback
      this.startPlayback();
    }
    // Do nothing if already in loading state
  }
  
  // Maximum text length for a single playback chunk (to prevent buffer overflow)
  private MAX_CHUNK_LENGTH = 2000;
  
  // Start playback of the current paragraph and set up to continue to the next
  private async startPlayback(): void {
    console.log(`[TopPlayer] startPlayback called, paragraphs length: ${this.paragraphs.length}`);
    
    // Check if we have paragraphs
    if (this.paragraphs.length === 0) {
      console.warn('[TopPlayer] No paragraphs available for playback');
      // Try re-extracting text content
      this.extractPageText();
      
      // Check again after re-extraction
      if (this.paragraphs.length === 0) {
        console.error('[TopPlayer] Still no paragraphs after re-extraction, cannot proceed');
        return;
      } else {
        console.log(`[TopPlayer] Successfully extracted ${this.paragraphs.length} paragraphs after retry`);
      }
    }
    
    // Set loading state
    this.setState('loading');
    
    try {
      // Get the selected voice from storage (or use default if not found)
      const voiceId = await this.getSelectedVoice();
      const modelId = this.defaultModelId;
      
      // Get current paragraph text
      const currentText = this.paragraphs[this.currentParagraphIndex];
      
      // Check if the paragraph is too long and needs to be chunked
      if (currentText.length > this.MAX_CHUNK_LENGTH) {
        // Split the text into chunks
        const chunks = this.chunkText(currentText);
        console.log(`[TopPlayer] Text too long (${currentText.length} chars), split into ${chunks.length} chunks`);
        
        // Store chunks for the current paragraph
        this.currentParagraphChunks = chunks;
        this.currentChunkIndex = 0;
        
        // Play the first chunk
        this.playChunk();
      } else {
        // Normal playback for reasonable length paragraphs
        console.log(`[TopPlayer] Starting playback of paragraph ${this.currentParagraphIndex + 1}/${this.paragraphs.length}:`, { 
          textPreview: currentText.substring(0, 50) + '...',
          textLength: currentText.length, 
          voiceId,
          modelId 
        });
        
        // Set up callback for playback end to move to next paragraph
        this.audioPlayer.setCallbacks({
          onPlaybackStart: () => this.handlePlaybackStart(),
          onPlaybackEnd: () => this.handleParagraphEnd(),
          onPlaybackError: (error) => this.handlePlaybackError(error),
          onTimeUpdate: (currentTime, duration) => this.updateTimeDisplay(currentTime, duration)
        });
        
        // Start playback with the audioPlayer
        await this.audioPlayer.playText(currentText, voiceId, modelId);
      }
    } catch (error) {
      console.error('[TopPlayer] Error starting playback:', error);
      this.handlePlaybackError(`Failed to start playback: ${error}`);
    }
  }
  
  // Storage for chunked paragraph playback
  private currentParagraphChunks: string[] = [];
  private currentChunkIndex: number = 0;
  
  /**
   * Split text into manageable chunks for playback
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    console.log(`[TopPlayer] Chunking text of length ${text.length} into pieces of max ${this.MAX_CHUNK_LENGTH} characters`);
    
    while (start < text.length) {
      // Find a good breaking point near the max chunk size
      let end = Math.min(start + this.MAX_CHUNK_LENGTH, text.length);
      
      // If we're not at the end, try to break at a sentence
      if (end < text.length) {
        // Look for sentence endings (., !, ?)
        const sentenceBreak = text.lastIndexOf('.', end);
        const exclamationBreak = text.lastIndexOf('!', end);
        const questionBreak = text.lastIndexOf('?', end);
        
        // Find the closest sentence break
        let breakPoint = Math.max(sentenceBreak, exclamationBreak, questionBreak);
        
        // If we found a valid break point, use it
        if (breakPoint > start && breakPoint <= end) {
          end = breakPoint + 1; // Include the sentence-ending character
        } else {
          // No sentence break, try to break at a space
          const spaceBreak = text.lastIndexOf(' ', end);
          if (spaceBreak > start) {
            end = spaceBreak + 1;
          }
          // If no space found, just use the max length
        }
      }
      
      // Extract the chunk and add it to the list
      const chunk = text.substring(start, end);
      chunks.push(chunk);
      
      console.log(`[TopPlayer] Created chunk ${chunks.length}: ${start}-${end} (length: ${chunk.length})`);
      
      // Move to the next chunk
      start = end;
    }
    
    return chunks;
  }
  
  /**
   * Play a chunk of the current paragraph
   */
  private playChunk(): void {
    if (this.currentChunkIndex >= this.currentParagraphChunks.length) {
      // We've played all chunks, move to the next paragraph
      console.log('[TopPlayer] All chunks played, moving to next paragraph');
      this.handleParagraphEnd();
      return;
    }
    
    const chunk = this.currentParagraphChunks[this.currentChunkIndex];
    console.log(`[TopPlayer] Playing chunk ${this.currentChunkIndex + 1}/${this.currentParagraphChunks.length}, length: ${chunk.length}`);
    
    // Track the position in the original text for this chunk
    const overallPosition = this.currentParagraphChunks
      .slice(0, this.currentChunkIndex)
      .reduce((sum, chunkText) => sum + chunkText.length, 0);
    
    console.log(`[TopPlayer] Starting from character position ${overallPosition} in the complete text`);
    
    // Set up callback to play the next chunk when this one finishes
    this.audioPlayer.setCallbacks({
      onPlaybackStart: () => this.handlePlaybackStart(),
      onPlaybackEnd: () => this.handleChunkEnd(),
      onPlaybackError: (error) => this.handlePlaybackError(error),
      onTimeUpdate: (currentTime, duration) => this.updateTimeDisplay(currentTime, duration)
    });
    
    // Play this chunk
    this.audioPlayer.playText(chunk, this.defaultVoiceId, this.defaultModelId)
      .catch(error => {
        console.error('[TopPlayer] Error playing chunk:', error);
        this.handlePlaybackError(`Chunk playback error: ${error}`);
      });
  }
  
  /**
   * Handle the end of a chunk playback
   */
  private handleChunkEnd(): void {
    console.log('[TopPlayer] Chunk playback ended');
    
    // Get the current chunk for logging
    const currentChunk = this.currentParagraphChunks[this.currentChunkIndex];
    
    // Move to the next chunk
    this.currentChunkIndex++;
    
    // Calculate the next chunk's position
    const nextChunkPosition = this.currentParagraphChunks
      .slice(0, this.currentChunkIndex)
      .reduce((sum, chunkText) => sum + chunkText.length, 0);
    
    console.log(`[TopPlayer] Moving to next chunk at position ${nextChunkPosition}, completed chunk length: ${currentChunk.length}`);
    
    // Play the next chunk immediately to ensure continuous playback
    // Using a minimal delay to prevent potential buffer issues
    setTimeout(() => {
      this.playChunk();
    }, 50);
  }
  
  // Handle end of paragraph playback
  private handleParagraphEnd(): void {
    console.log('[TopPlayer] Paragraph playback ended');
    
    // Move to next paragraph
    this.currentParagraphIndex++;
    
    // If we've reached the end of all paragraphs, reset to beginning
    if (this.currentParagraphIndex >= this.paragraphs.length) {
      this.currentParagraphIndex = 0;
      this.isPlaying = false;
      this.setState('play');
      this.pauseProgressAnimation();
      console.log('[TopPlayer] Reached end of all paragraphs, stopping playback');
      return;
    }
    
    // Continue with next paragraph
    console.log(`[TopPlayer] Moving to paragraph ${this.currentParagraphIndex + 1}/${this.paragraphs.length}`);
    this.startPlayback();
  }
  
  // Stop playback
  private stopPlayback(): void {
    // Stop the audio player
    this.audioPlayer.stopPlayback();
    
    // Reset paragraph index to beginning
    this.currentParagraphIndex = 0;
    
    // Update state
    this.isPlaying = false;
    this.setState('play');
  }
  
  // Get the user's selected voice from Chrome storage
  private async getSelectedVoice(): Promise<string> {
    try {
      // First check if we already have a voice ID from a voice-selected event
      // This ensures we always use the most recently selected voice
      if (this.defaultVoiceId !== '21m00Tcm4TlvDq8ikWAM') {
        // Log that we're using the voice ID from recent selection
        console.log('[TopPlayer] Using voice ID from most recent selection:', this.defaultVoiceId);
        return this.defaultVoiceId;
      }
      
      // Get voice from Chrome storage as a backup
      return new Promise<string>((resolve) => {
        chrome.storage.local.get(['selectedVoiceId'], (result) => {
          if (result && result.selectedVoiceId) {
            console.log('[TopPlayer] Retrieved voice ID from storage:', result.selectedVoiceId);
            // Update our cached voice ID for future use
            this.defaultVoiceId = result.selectedVoiceId;
            resolve(result.selectedVoiceId);
          } else {
            console.log('[TopPlayer] No voice ID in storage, using default:', this.defaultVoiceId);
            resolve(this.defaultVoiceId);
          }
        });
      });
    } catch (error) {
      console.error('[TopPlayer] Error getting selected voice:', error);
      return this.defaultVoiceId;
    }
  }
  
  private startProgressAnimation(): void {
    // Initialize progress bar
    const progressBar = this.playerElement?.querySelector('#top-player-progress') as HTMLElement;
    if (progressBar) {
      // Reset to 0
      progressBar.style.width = '0%';
      
      // The progress will be updated by updateTimeDisplay during playback
    }
  }
  
  private pauseProgressAnimation(): void {
    // Nothing to do here - progress updates stop when audio stops
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
    
    // Stop any active playback
    this.stopPlayback();
    
    // Close settings dropdown if open
    this.closeSettingsDropdown();
    
    // Remove from DOM
    this.playerElement.remove();
    this.playerElement = null;
    this.isVisible = false;
  }
}
