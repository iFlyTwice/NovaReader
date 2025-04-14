// Import Icons
import { ICONS } from '../../utils';

export interface SettingsDropdownProps {
  buttonElement: HTMLElement;
  onSettingsClick: () => void;
  onHidePlayerClick: () => void;
  onClose: () => void;
}

export class SettingsDropdown {
  private dropdownElement: HTMLElement | null = null;
  private props: SettingsDropdownProps;
  private documentClickHandler: (e: MouseEvent) => void;
  private resizeObserver: ResizeObserver | null = null;
  private scrollHandler: () => void;
  
  constructor(props: SettingsDropdownProps) {
    this.props = props;
    this.documentClickHandler = this.handleDocumentClick.bind(this);
    this.scrollHandler = this.updatePosition.bind(this);
  }
  
  public render(): HTMLElement {
    // Create dropdown container
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'nova-settings-dropdown';
    this.dropdownElement.setAttribute('data-nova-reader', 'settings-dropdown');
    
    // Add styles directly to the element for maximum compatibility
    Object.assign(this.dropdownElement.style, {
      position: 'fixed',
      backgroundColor: '#282828',
      borderRadius: '8px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      width: '180px',
      padding: '8px 0',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
      zIndex: '999999'
    });
    
    // Position the dropdown
    this.updatePosition();
    
    // Create dropdown content
    this.dropdownElement.innerHTML = `
      <div class="nova-settings-dropdown-item" data-action="settings" style="
        padding: 12px 16px;
        display: flex;
        align-items: center;
        cursor: pointer;
        color: #f0f0f0;
        font-size: 14px;
        transition: background-color 0.2s ease;
      ">
        <div class="nova-settings-dropdown-icon" style="
          margin-right: 12px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ccc;
        ">
          ${ICONS.settings}
        </div>
        <span class="nova-settings-dropdown-text" style="font-weight: 400;">Settings</span>
      </div>
      <div class="nova-settings-dropdown-item" data-action="hide" style="
        padding: 12px 16px;
        display: flex;
        align-items: center;
        cursor: pointer;
        color: #f0f0f0;
        font-size: 14px;
        transition: background-color 0.2s ease;
      ">
        <div class="nova-settings-dropdown-icon" style="
          margin-right: 12px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ccc;
        ">
          ${ICONS.close}
        </div>
        <span class="nova-settings-dropdown-text" style="font-weight: 400;">Hide player</span>
      </div>
    `;
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Create a ResizeObserver to update the position when window layout changes
    this.resizeObserver = new ResizeObserver(() => {
      this.updatePosition();
    });
    
    // Observe the button element
    this.resizeObserver.observe(this.props.buttonElement);
    
    // Add document click listener to detect outside clicks
    setTimeout(() => {
      document.addEventListener('click', this.documentClickHandler);
      // Add scroll event listener
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
      document.addEventListener('scroll', this.scrollHandler, { passive: true });
      // Listen for scrolling on any element
      const scrollElements = document.querySelectorAll('*');
      scrollElements.forEach(element => {
        if (element instanceof HTMLElement) {
          element.addEventListener('scroll', this.scrollHandler, { passive: true });
        }
      });
    }, 0);
    
    return this.dropdownElement;
  }
  
  private updatePosition(): void {
    if (!this.dropdownElement || !this.props.buttonElement) return;
    
    const buttonRect = this.props.buttonElement.getBoundingClientRect();
    
    this.dropdownElement.style.top = `${buttonRect.bottom + 5}px`;
    this.dropdownElement.style.right = `${window.innerWidth - buttonRect.right}px`;
  }
  
  private setupEventListeners(): void {
    if (!this.dropdownElement) return;
    
    // Add hover effect for menu items
    const items = this.dropdownElement.querySelectorAll('.nova-settings-dropdown-item');
    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        (item as HTMLElement).style.backgroundColor = '#3a3a3a';
      });
      
      item.addEventListener('mouseleave', () => {
        (item as HTMLElement).style.backgroundColor = 'transparent';
      });
    });
    
    // Settings option click - open the panel
    const settingsItem = this.dropdownElement.querySelector('[data-action="settings"]');
    if (settingsItem) {
      settingsItem.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Use the same toggle-panel event that the panel.ts uses
        const togglePanelEvent = new CustomEvent('toggle-panel');
        document.dispatchEvent(togglePanelEvent);
        
        this.close();
      });
    }
    
    // Hide player option click
    const hideItem = this.dropdownElement.querySelector('[data-action="hide"]');
    if (hideItem) {
      hideItem.addEventListener('click', (e) => {
        e.stopPropagation();
        this.props.onHidePlayerClick();
        this.close();
      });
    }
  }
  
  private handleDocumentClick(e: MouseEvent): void {
    if (!this.dropdownElement || !this.props.buttonElement) return;
    
    // If click is outside the dropdown and outside the button, close it
    if (
      !this.dropdownElement.contains(e.target as Node) && 
      !this.props.buttonElement.contains(e.target as Node)
    ) {
      this.close();
    }
  }
  
  public close(): void {
    if (this.dropdownElement) {
      // Remove from DOM
      this.dropdownElement.remove();
      this.dropdownElement = null;
      
      // Disconnect ResizeObserver
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      
      // Remove event listeners
      document.removeEventListener('click', this.documentClickHandler);
      window.removeEventListener('scroll', this.scrollHandler);
      document.removeEventListener('scroll', this.scrollHandler);
      
      // Invoke onClose callback
      this.props.onClose();
    }
  }
  
  public isOpen(): boolean {
    return this.dropdownElement !== null;
  }
}