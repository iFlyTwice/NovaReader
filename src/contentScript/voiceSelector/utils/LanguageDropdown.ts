// Import Icons
import { ICONS } from '../../utils';
import { ALL_LANGUAGES, Language } from './supportedLanguages';
import { filterVoices } from './voiceFilters';

export interface LanguageDropdownProps {
  buttonElement: HTMLElement;
  selectedLanguage: string;
  onLanguageSelect: (languageCode: string) => void;
  onClose: () => void;
}

export class LanguageDropdown {
  private dropdownElement: HTMLElement | null = null;
  private props: LanguageDropdownProps;
  private documentClickHandler: (e: MouseEvent) => void;
  private resizeObserver: ResizeObserver | null = null;
  private scrollHandler: () => void;
  
  constructor(props: LanguageDropdownProps) {
    this.props = props;
    this.documentClickHandler = this.handleDocumentClick.bind(this);
    this.scrollHandler = this.updatePosition.bind(this);
  }
  
  public render(): HTMLElement {
    // Create dropdown container
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'nova-language-dropdown';
    this.dropdownElement.setAttribute('data-nova-reader', 'language-dropdown');
    
    // Position the dropdown (using adjustable methods)
    this.updatePosition();
    
    // Create dropdown title
    const titleContainer = document.createElement('div');
    titleContainer.className = 'nova-language-dropdown-title';
    titleContainer.textContent = 'Select Language';
    
    // Create container for language list
    const listContainer = document.createElement('div');
    listContainer.className = 'nova-language-dropdown-list';
    
    // Add languages to the list
    ALL_LANGUAGES.forEach(language => {
      const item = this.createLanguageItem(language);
      listContainer.appendChild(item);
    });
    
    // Append elements to the dropdown
    this.dropdownElement.appendChild(titleContainer);
    this.dropdownElement.appendChild(listContainer);
    
    // Add dropdown to the document
    document.body.appendChild(this.dropdownElement);
    
    // Setup event listeners
    this.setupEventListeners();
    this.setupDocumentClickListener();
    
    return this.dropdownElement;
  }
  
  private createLanguageItem(language: Language): HTMLElement {
    const item = document.createElement('div');
    item.className = 'nova-language-dropdown-item';
    if (language.code === this.props.selectedLanguage) {
      item.classList.add('selected');
    }
    item.setAttribute('data-language-code', language.code);
    
    // Add language name
    const languageName = document.createElement('span');
    languageName.textContent = language.name;
    
    // Add beta indicator for beta languages
    if (!language.supported && language.code !== 'all') {
      const betaIndicator = document.createElement('span');
      betaIndicator.textContent = ' (Beta)';
      betaIndicator.style.fontSize = '12px';
      betaIndicator.style.color = '#aaa';
      betaIndicator.style.marginLeft = '4px';
      
      languageName.appendChild(betaIndicator);
    }
    
    item.appendChild(languageName);
    
    return item;
  }
  
  private updatePosition(): void {
    if (!this.dropdownElement || !this.props.buttonElement) return;
    
    const buttonRect = this.props.buttonElement.getBoundingClientRect();
    const voiceSelector = document.getElementById('extension-voice-selector');
    
    if (voiceSelector) {
      const selectorRect = voiceSelector.getBoundingClientRect();
      
      // Position the dropdown outside the voice selector
      const spaceAbove = buttonRect.top - selectorRect.top;
      const spaceBelow = selectorRect.bottom - buttonRect.bottom;
      
      // Calculate the absolute position relative to the viewport
      const viewportTop = buttonRect.bottom + window.scrollY + 5;
      
      // Calculate the left position to align with the button
      const left = buttonRect.left + window.scrollX;
      
      // Check if the dropdown would fit below the button
      if (spaceBelow >= 150) {
        // Position below the button
        this.dropdownElement.style.position = 'fixed';
        this.dropdownElement.style.top = `${buttonRect.bottom}px`;
        this.dropdownElement.style.left = `${buttonRect.left}px`;
        this.dropdownElement.style.maxHeight = `${Math.min(300, window.innerHeight - buttonRect.bottom - 20)}px`;
      } else if (spaceAbove >= 150) {
        // Position above the button
        const dropdownHeight = Math.min(300, spaceAbove - 10);
        this.dropdownElement.style.position = 'fixed';
        this.dropdownElement.style.top = `${buttonRect.top - dropdownHeight - 10}px`;
        this.dropdownElement.style.left = `${buttonRect.left}px`;
        this.dropdownElement.style.maxHeight = `${dropdownHeight}px`;
      } else {
        // Position at optimal position relative to button
        this.dropdownElement.style.position = 'fixed';
        this.dropdownElement.style.top = `${buttonRect.top}px`;
        this.dropdownElement.style.left = `${buttonRect.right + 10}px`;
        this.dropdownElement.style.maxHeight = `${Math.min(300, window.innerHeight - buttonRect.top - 20)}px`;
      }
      
      // Ensure the dropdown doesn't overflow the viewport
      const dropdownRect = this.dropdownElement.getBoundingClientRect();
      if (dropdownRect.right > window.innerWidth) {
        this.dropdownElement.style.left = `${window.innerWidth - dropdownRect.width - 10}px`;
      }
    }
  }
  
  private setupEventListeners(): void {
    if (!this.dropdownElement) return;
    
    // Stop propagation for all events on the dropdown element
    // This prevents the document click listener from detecting clicks on the dropdown
    this.dropdownElement.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    this.dropdownElement.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    // Add click event listeners for menu items
    const items = this.dropdownElement.querySelectorAll('.nova-language-dropdown-item');
    items.forEach(item => {
      // Stop propagation for all events on each item
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const languageCode = item.getAttribute('data-language-code');
        if (languageCode) {
          this.props.onLanguageSelect(languageCode);
          this.close();
        }
      });
      
      item.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
    });
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
  
  private setupDocumentClickListener(): void {
    // Add document click listener to detect outside clicks
    setTimeout(() => {
      document.addEventListener('click', this.documentClickHandler);
      // Add scroll event listener
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
      document.addEventListener('scroll', this.scrollHandler, { passive: true });
    }, 0);
    
    // Create a ResizeObserver to update the position when window layout changes
    this.resizeObserver = new ResizeObserver(() => {
      this.updatePosition();
    });
    
    // Observe the button element
    this.resizeObserver.observe(this.props.buttonElement);
  }
} 