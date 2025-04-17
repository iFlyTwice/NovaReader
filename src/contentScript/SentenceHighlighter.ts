/**
 * Sentence Highlighter for NovaReader
 * Highlights sentences in the DOM as they're being read by the text-to-speech engine
 */

// Interface for sentence information with timing
export interface SentenceInfo {
  text: string;          // The sentence text
  startTime: number;     // Estimated start time in seconds
  endTime: number;       // Estimated end time in seconds
  elements?: HTMLElement[]; // DOM elements containing this sentence (if found)
}

export class SentenceHighlighter {
  private originalText: string;
  private sentences: SentenceInfo[] = [];
  private currentSentenceIndex: number = -1;
  private previousSentenceIndex: number = -1;
  private highlightClass: string = 'nova-reader-highlighted-sentence';
  private averageReadingSpeed: number = 15; // Characters per second (adjustable)
  private highlightedElements: HTMLElement[] = [];
  
  // Store the original styles of elements before highlighting
  private originalStyles: Map<HTMLElement, string> = new Map();
  
  // Highlight style - modern zinc gray version
  private highlightStyle: string = 'background-color: rgba(161, 161, 170, 0.15); border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 2px 0;';
  
  constructor(text: string) {
    this.originalText = text;
    this.parseSentences(text);
    
    // Ensure we have the CSS class defined
    this.injectHighlightStyles();
  }
  
  /**
   * Inject CSS styles for highlighting if they don't exist yet
   */
  private injectHighlightStyles(): void {
    // Check if styles already exist
    if (document.getElementById('nova-reader-highlight-styles')) {
      return;
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'nova-reader-highlight-styles';
    style.textContent = `
      .${this.highlightClass} {
        background-color: rgba(161, 161, 170, 0.15);
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        padding: 2px 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }
      
      /* Subtle animation effect */
      .${this.highlightClass}::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, rgba(161, 161, 170, 0.7), rgba(161, 161, 170, 0.3));
        border-radius: 2px;
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .${this.highlightClass} {
          background-color: rgba(161, 161, 170, 0.12);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        
        .${this.highlightClass}::after {
          background: linear-gradient(90deg, rgba(161, 161, 170, 0.6), rgba(161, 161, 170, 0.2));
        }
      }
    `;
    
    // Add to document
    document.head.appendChild(style);
  }
  
  /**
   * Parse text into sentences with estimated timing
   */
  private parseSentences(text: string): void {
    if (!text || text.trim().length === 0) {
      console.warn('[SentenceHighlighter] Empty text provided');
      return;
    }
    
    // Regular expression to split text into sentences
    // This handles periods, question marks, exclamation points
    // while trying to avoid splitting on abbreviations and decimal numbers
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    
    // Match all sentences
    const sentenceMatches = text.match(sentenceRegex);
    
    // If no matches found, treat the entire text as one sentence
    if (!sentenceMatches) {
      this.sentences = [{
        text: text,
        startTime: 0,
        endTime: this.estimateDuration(text)
      }];
      return;
    }
    
    // Process each sentence
    let currentTime = 0;
    this.sentences = sentenceMatches.map(sentence => {
      const trimmedSentence = sentence.trim();
      const duration = this.estimateDuration(trimmedSentence);
      
      const sentenceInfo: SentenceInfo = {
        text: trimmedSentence,
        startTime: currentTime,
        endTime: currentTime + duration
      };
      
      // Update current time for next sentence
      currentTime += duration;
      
      return sentenceInfo;
    });
    
    console.log(`[SentenceHighlighter] Parsed ${this.sentences.length} sentences with total duration ${currentTime.toFixed(2)}s`);
  }
  
  /**
   * Estimate the duration of a text segment based on character count
   * This is a simple estimation that can be refined with more sophisticated algorithms
   */
  private estimateDuration(text: string): number {
    if (!text) return 0;
    
    // Base duration on character count
    const charCount = text.length;
    
    // Add extra time for punctuation (pauses)
    const punctuationCount = (text.match(/[,.;:!?]/g) || []).length;
    
    // Calculate base duration from character count
    const baseDuration = charCount / this.averageReadingSpeed;
    
    // Add time for punctuation pauses (about 0.2s per punctuation mark)
    const punctuationTime = punctuationCount * 0.2;
    
    return baseDuration + punctuationTime;
  }
  
  /**
   * Scan the document to find DOM elements containing the sentences
   * This is a critical function that maps our sentences to actual DOM elements
   */
  public scanDocument(): void {
    console.log('[SentenceHighlighter] Scanning document for text elements');
    
    // First, find all text-containing elements
    const textElements = this.findTextElements(document.body);
    
    // For each sentence, try to find matching elements
    this.sentences.forEach((sentence, index) => {
      const matchingElements = this.findElementsContainingSentence(sentence.text, textElements);
      
      if (matchingElements.length > 0) {
        this.sentences[index].elements = matchingElements;
        console.log(`[SentenceHighlighter] Found ${matchingElements.length} elements for sentence ${index + 1}`);
      } else {
        console.warn(`[SentenceHighlighter] No elements found for sentence: "${sentence.text.substring(0, 30)}..."`);
      }
    });
  }
  
  /**
   * Find all elements that contain visible text
   */
  private findTextElements(rootElement: HTMLElement): HTMLElement[] {
    const textElements: HTMLElement[] = [];
    const walker = document.createTreeWalker(
      rootElement,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script, style, and hidden elements
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const tagName = element.tagName.toLowerCase();
            
            if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Check if element is visible
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
          
          // For text nodes, only accept non-empty ones
          if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim().length > 0) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    // Collect all text-containing elements
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        
        // Check if this element directly contains text
        if (this.hasDirectTextContent(element)) {
          textElements.push(element);
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
        // For text nodes, add their parent element
        textElements.push(node.parentElement);
      }
    }
    
    // Remove duplicates
    return [...new Set(textElements)];
  }
  
  /**
   * Check if an element directly contains text (not just in child elements)
   */
  private hasDirectTextContent(element: HTMLElement): boolean {
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim().length > 0) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Find elements containing a specific sentence
   */
  private findElementsContainingSentence(sentence: string, elements: HTMLElement[]): HTMLElement[] {
    const matchingElements: HTMLElement[] = [];
    
    // Clean up the sentence for comparison
    const cleanSentence = sentence.trim().replace(/\s+/g, ' ');
    
    // Check each element
    elements.forEach(element => {
      const elementText = element.textContent || '';
      
      // If the element contains the exact sentence
      if (elementText.includes(cleanSentence)) {
        matchingElements.push(element);
      }
    });
    
    return matchingElements;
  }
  
  /**
   * Update highlighting based on current playback time
   */
  public updateHighlight(currentTime: number): void {
    // Find the current sentence based on time
    const newSentenceIndex = this.findSentenceIndexByTime(currentTime);
    
    // If no change in sentence, do nothing
    if (newSentenceIndex === this.currentSentenceIndex) {
      return;
    }
    
    // Store previous index for cleanup
    this.previousSentenceIndex = this.currentSentenceIndex;
    this.currentSentenceIndex = newSentenceIndex;
    
    // Clear previous highlight
    this.clearPreviousHighlight();
    
    // Apply new highlight if we have a valid sentence
    if (newSentenceIndex >= 0 && newSentenceIndex < this.sentences.length) {
      this.highlightCurrentSentence();
    }
  }
  
  /**
   * Find the sentence that should be active at the given time
   */
  private findSentenceIndexByTime(time: number): number {
    for (let i = 0; i < this.sentences.length; i++) {
      const sentence = this.sentences[i];
      if (time >= sentence.startTime && time < sentence.endTime) {
        return i;
      }
    }
    
    // If we're past the last sentence's end time, return the last sentence
    if (time >= this.sentences[this.sentences.length - 1]?.endTime) {
      return this.sentences.length - 1;
    }
    
    // If we're before the first sentence's start time, return the first sentence
    if (time < this.sentences[0]?.startTime) {
      return 0;
    }
    
    return -1; // No matching sentence
  }
  
  /**
   * Clear highlight from the previous sentence
   */
  private clearPreviousHighlight(): void {
    // Remove highlight class from all previously highlighted elements
    this.highlightedElements.forEach(element => {
      element.classList.remove(this.highlightClass);
      
      // Restore original inline style if we have it stored
      if (this.originalStyles.has(element)) {
        element.style.cssText = this.originalStyles.get(element) || '';
        this.originalStyles.delete(element);
      }
    });
    
    this.highlightedElements = [];
  }
  
  /**
   * Apply highlight to the current sentence
   */
  private highlightCurrentSentence(): void {
    const currentSentence = this.sentences[this.currentSentenceIndex];
    if (!currentSentence || !currentSentence.elements || currentSentence.elements.length === 0) {
      return;
    }
    
    // Apply highlight to all elements containing this sentence
    currentSentence.elements.forEach(element => {
      // Store original style before modifying
      if (!this.originalStyles.has(element)) {
        this.originalStyles.set(element, element.style.cssText);
      }
      
      // Apply highlight
      element.classList.add(this.highlightClass);
      
      // Also scroll the element into view if needed
      this.scrollElementIntoViewIfNeeded(element);
      
      // Add to our tracking array
      this.highlightedElements.push(element);
    });
  }
  
  /**
   * Scroll an element into view if it's not currently visible
   */
  private scrollElementIntoViewIfNeeded(element: HTMLElement): void {
    // Check if element is in viewport
    const rect = element.getBoundingClientRect();
    const isInViewport = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
    
    // If not in viewport, scroll it into view
    if (!isInViewport) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }
  
  /**
   * Clear all highlights
   */
  public clearAllHighlights(): void {
    this.currentSentenceIndex = -1;
    this.clearPreviousHighlight();
  }
  
  /**
   * Set the reading speed (characters per second)
   */
  public setReadingSpeed(charactersPerSecond: number): void {
    if (charactersPerSecond > 0) {
      this.averageReadingSpeed = charactersPerSecond;
      // Recalculate sentence timings
      this.parseSentences(this.originalText);
    }
  }
  
  /**
   * Get the total estimated duration of the text
   */
  public getTotalDuration(): number {
    if (this.sentences.length === 0) return 0;
    return this.sentences[this.sentences.length - 1].endTime;
  }
  
  /**
   * Get all parsed sentences
   */
  public getSentences(): SentenceInfo[] {
    return this.sentences;
  }
}
