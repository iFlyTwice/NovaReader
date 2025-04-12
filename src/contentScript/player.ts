// SVG Icons
import { ICONS } from './utils';
// Import CSS to help Vite track dependencies
import '../../css/player.css';

export class SidePlayer {
  private playerId: string = 'extension-side-player';
  private isPlaying: boolean = false;
  private playerElement: HTMLElement | null = null;

  constructor() {
    // No need to inject styles separately as they're included in manifest
  }

  public create(nextToPanel: boolean = false): void {
    // Check if player already exists
    if (document.getElementById(this.playerId)) {
      return;
    }

    // Create player container
    const player = document.createElement('div');
    player.id = this.playerId;
    
    // Set position based on whether panel is open
    if (nextToPanel) {
      player.classList.add('next-to-panel');
    }
    
    // Add time display
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'time-display';
    timeDisplay.textContent = '4:26';
    
    // Play button
    const playButton = this.createButton('play', 'Play/Pause', () => {
      this.isPlaying = !this.isPlaying;
      playButton.classList.toggle('active', this.isPlaying);
      console.log('Play/Pause clicked');
    });
    
    // Thumbs down button (dislike)
    const thumbsDownButton = this.createButton('thumbsDown', 'Dislike', () => {
      console.log('Dislike clicked');
      // Add visual feedback
      this.addClickEffect(thumbsDownButton);
    });
    
    // Screenshot button
    const screenshotButton = this.createButton('screenshot', 'Screenshot', () => {
      console.log('Screenshot clicked');
      // Add visual feedback
      this.addClickEffect(screenshotButton);
    });
    
    // Select Voice button (replaces Waveform button)
    const selectVoiceButton = this.createButton('waveform', 'Select Voice', () => {
      console.log('Select Voice clicked');
      // Dispatch event to toggle voice selector
      const event = new CustomEvent('toggle-voice-selector');
      document.dispatchEvent(event);
      // Add visual feedback
      this.addClickEffect(selectVoiceButton);
    });
    
    // Settings button (with red dot)
    const settingsButton = this.createButton('settings', 'Settings', () => {
      // This will be handled by the panel module
      const event = new CustomEvent('toggle-panel');
      document.dispatchEvent(event);
      // Add visual feedback
      this.addClickEffect(settingsButton);
    });
    settingsButton.classList.add('settings-button');
    
    // Divider
    const divider1 = document.createElement('div');
    divider1.className = 'player-divider';
    
    // Close button
    const closeButton = this.createButton('close', 'Close', () => {
      this.remove();
      // Add visual feedback
      this.addClickEffect(closeButton);
    });
    
    // Append all elements to player in the order shown in the screenshot
    player.appendChild(timeDisplay);
    player.appendChild(playButton);
    player.appendChild(thumbsDownButton);
    player.appendChild(screenshotButton);
    player.appendChild(selectVoiceButton);
    player.appendChild(settingsButton);
    player.appendChild(divider1);
    player.appendChild(closeButton);
    
    // Add player to page
    document.body.appendChild(player);
    this.playerElement = player;
  }

  private createButton(iconName: keyof typeof ICONS, title: string, clickHandler: () => void): HTMLElement {
    const button = document.createElement('div');
    button.className = 'player-button';
    button.innerHTML = ICONS[iconName];
    button.title = title;
    button.addEventListener('click', clickHandler);
    return button;
  }
  
  private addClickEffect(element: HTMLElement): void {
    // Add a quick scale animation for feedback
    element.style.transform = 'scale(0.9)';
    setTimeout(() => {
      element.style.transform = '';
    }, 150);
  }

  public toggle(isPanelOpen: boolean = false): void {
    if (document.getElementById(this.playerId)) {
      this.remove();
    } else {
      this.create(isPanelOpen);
    }
  }

  public remove(): void {
    const player = document.getElementById(this.playerId);
    if (player) {
      player.remove();
      this.playerElement = null;
    }
  }
  
  public setPositionNextToPanel(nextToPanel: boolean): void {
    const player = document.getElementById(this.playerId);
    if (player) {
      if (nextToPanel) {
        player.classList.add('next-to-panel');
      } else {
        player.classList.remove('next-to-panel');
      }
    }
  }
}
