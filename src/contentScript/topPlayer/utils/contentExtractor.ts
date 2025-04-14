/**
 * Content extraction utilities for the top player
 */

// Extract the main text content from the page in paragraphs
export function extractPageText(topPlayer: any): void {
  console.log('[TopPlayer] Extracting page text...');
  
  try {
    // Find the main content container
    let mainContent: Element | null = document.querySelector('body');
    
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
    const topPlayerElement = document.getElementById(topPlayer.playerId);
    let startElement = null;
    
    if (topPlayerElement) {
      console.log('[TopPlayer] Found top player element, will extract text after it');
      
      // Find the next sibling element or parent's next sibling
      let current: HTMLElement | null = topPlayerElement;
      while (current && !startElement) {
        // Check next sibling
        if (current.nextElementSibling) {
          startElement = current.nextElementSibling;
          break;
        }
        
        // Move up to parent and try again
        if (current.parentElement) {
          current = current.parentElement;
        } else {
          break; // Break the loop if no parent element
        }
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
    if (startElement) {
      processNode(startElement);
    }
    
    // If we didn't find any paragraphs, try a more aggressive approach
    if (paragraphs.length === 0 && mainContent) {
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
      if (paragraphs.length === 0 && mainContent && (mainContent as HTMLElement).innerText) {
        const text = (mainContent as HTMLElement).innerText;
        const chunks = text.split(/\n\s*\n/);
        
        chunks.forEach((chunk: string) => {
          const trimmed = chunk.trim();
          if (trimmed && trimmed.length > 25) {
            paragraphs.push(trimmed);
          }
        });
      }
    }
    
    // Remove duplicates and save
    topPlayer.paragraphs = [...new Set(paragraphs)];
    
    // Set initial text to the first paragraph if available
    topPlayer.currentParagraphIndex = 0;
    if (topPlayer.paragraphs.length > 0) {
      topPlayer.pageText = topPlayer.paragraphs[0];
    }
    
    // Get total word count for all paragraphs
    const wordCount = topPlayer.paragraphs.reduce((count: number, paragraph: string) => {
      return count + paragraph.split(/\s+/).length;
    }, 0);
    
    // Estimate reading time (assuming average reading speed of 200 words per minute)
    const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));
    
    // Update the duration display
    topPlayer.duration = `${readingTimeMinutes} min`;
    
    // Update UI if player is already created
    if (topPlayer.playerElement) {
      const durationElement = topPlayer.playerElement.querySelector('.top-player-duration');
      if (durationElement) {
        durationElement.textContent = `${readingTimeMinutes} min`;
      }
    }
    
    console.log(`[TopPlayer] Extracted ${topPlayer.paragraphs.length} paragraphs with ${wordCount} words, estimated reading time: ${readingTimeMinutes} minutes`);
    
    // Debug output for first few paragraphs
    if (topPlayer.paragraphs.length > 0) {
      console.log('[TopPlayer] First paragraph:', topPlayer.paragraphs[0].substring(0, 100) + '...');
    } else {
      // Only log as debug, not error - we'll try again later
      console.debug('[TopPlayer] No paragraphs extracted in initial attempt');
    }
  } catch (error) {
    console.error('[TopPlayer] Error extracting page text:', error);
  }
}

// Fallback method for text extraction that's more aggressive
export function fallbackTextExtraction(topPlayer: any): void {
  console.debug('[TopPlayer] Starting fallback extraction');
  
  try {
    // Get all visible text on the page
    const allText = document.body.innerText;
    
    // Split by various separators
    const rawParagraphs = allText.split(/\n+|\.\s+|。|！|？|\?|!|;|；/g);
    
    // Filter and clean
    topPlayer.paragraphs = rawParagraphs
      .filter((p: string) => {
        const cleaned = p.trim();
        // Keep only substantial text chunks
        return cleaned.length > 30 && cleaned.split(/\s+/).length > 5;
      })
      .map((p: string) => p.trim());
    
    // Update page text and duration
    if (topPlayer.paragraphs.length > 0) {
      topPlayer.pageText = topPlayer.paragraphs[0];
      
      // Calculate word count and reading time
      const wordCount = topPlayer.paragraphs.reduce((count: number, p: string) => count + p.split(/\s+/).length, 0);
      const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));
      topPlayer.duration = `${readingTimeMinutes} min`;
      
      // Update UI if player is already created
      if (topPlayer.playerElement) {
        const durationElement = topPlayer.playerElement.querySelector('.top-player-duration');
        if (durationElement) {
          durationElement.textContent = `${readingTimeMinutes} min`;
        }
      }
      
      console.log(`📖 [TopPlayer] Found ${topPlayer.paragraphs.length} paragraphs with ${wordCount} words (${readingTimeMinutes} min)`);
    } else {
      console.debug('[TopPlayer] Still waiting for content to load');
    }
  } catch (error) {
    console.error('[TopPlayer] Error in fallback text extraction:', error);
  }
}

// Chunk text into manageable pieces for playback
export function chunkText(text: string, maxChunkLength: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  console.log(`[TopPlayer] Chunking text of length ${text.length} into pieces of max ${maxChunkLength} characters`);
  
  while (start < text.length) {
    // Find a good breaking point near the max chunk size
    let end = Math.min(start + maxChunkLength, text.length);
    
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
