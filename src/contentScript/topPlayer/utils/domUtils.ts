/**
 * DOM utilities for the top player
 */

/**
 * Checks if the hostname is a news site
 */
export function isNewsSite(hostname: string): boolean {
  const newsDomains = [
    'cnn.com', 'nytimes.com', 'bbc.com', 'reuters.com', 
    'theguardian.com', 'washingtonpost.com', 'tododisc'
  ];
  
  return newsDomains.some(domain => hostname.includes(domain));
}

/**
 * Insert player for Coursera pages with robust retry and DOM observation
 */
export function insertForCoursera(player: HTMLElement): void {
  console.log('[TopPlayer] Detected Coursera, using enhanced Coursera-specific insertion');
  
  // Maximum number of retries
  const MAX_RETRIES = 5;
  // Current retry count
  let retryCount = 0;
  // Initial retry delay in ms (will increase with backoff)
  let retryDelay = 200;
  // Flag to track if player has been inserted
  let isInserted = false;
  // Store observer reference for cleanup
  let observer: MutationObserver | null = null;
  
  // Create a function that attempts to insert the player
  const attemptInsertion = () => {
    try {
      if (isInserted) return true;
      
      // The most reliable position is right after the reading-title div
      const readingTitle = document.querySelector('div.reading-title');
      if (readingTitle && readingTitle.parentNode) {
        // Insert after the reading title (before the content)
        if (readingTitle.nextSibling) {
          readingTitle.parentNode.insertBefore(player, readingTitle.nextSibling);
        } else {
          // If no next sibling, append after reading title
          readingTitle.parentNode.appendChild(player);
        }
        console.log('[TopPlayer] Inserted player after reading title');
        isInserted = true;
        return true;
      }
      
      // Try to find the course content container
      const courseContent = document.querySelector('.rc-CML');
      if (courseContent && courseContent.parentNode) {
        // Insert before the course content
        courseContent.parentNode.insertBefore(player, courseContent);
        console.log('[TopPlayer] Inserted player before course content');
        isInserted = true;
        return true;
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
        isInserted = true;
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('[TopPlayer] Error in Coursera insertion attempt:', err);
      return false;
    }
  };
  
  // Function to retry with exponential backoff
  const retryWithBackoff = () => {
    // Check if we've reached the maximum number of retries
    if (retryCount >= MAX_RETRIES) {
      console.warn('[TopPlayer] Max retries reached, using fallback insertion');
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (!isInserted) {
        insertDefault(player);
        isInserted = true;
      }
      return;
    }
    
    // Increment retry count
    retryCount++;
    
    // Try to insert the player
    if (attemptInsertion()) {
      // Player inserted successfully, no need for further retries
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      return;
    }
    
    // Schedule next retry with increased delay (exponential backoff)
    console.log(`[TopPlayer] Insertion attempt ${retryCount} failed, retrying in ${retryDelay}ms`);
    setTimeout(retryWithBackoff, retryDelay);
    
    // Increase delay for next retry (exponential backoff)
    retryDelay *= 1.5;
  };
  
  // Set up a MutationObserver to watch for DOM changes
  observer = new MutationObserver((mutations) => {
    // Don't attempt insertion if already successful
    if (isInserted) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      return;
    }
    
    // Some DOM changes occurred, try insertion again
    console.log('[TopPlayer] DOM changed, attempting insertion');
    
    // Try insertion
    if (attemptInsertion()) {
      // If successful, disconnect the observer
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  // Try immediate insertion first
  if (!attemptInsertion()) {
    // If immediate insertion fails, start retry sequence
    retryWithBackoff();
    
    // Set a timeout to use default insertion as final fallback
    setTimeout(() => {
      // If still not inserted after all retries and waiting for DOM changes
      if (!isInserted) {
        console.warn('[TopPlayer] Could not find suitable Coursera container after waiting, using fallback');
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        insertDefault(player);
      }
    }, 5000); // 5 second total timeout
  } else {
    // If immediate insertion succeeded, disconnect the observer
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }
}

/**
 * Insert player for news sites
 */
export function insertForNewsSite(player: HTMLElement): void {
  console.log('[TopPlayer] Detected news site, using news site-specific insertion');
  
  try {
    // For news sites, try to insert before the article title or headline
    const articleTitle = document.querySelector('h1.article-title') ||
                        document.querySelector('h1.headline') ||
                        document.querySelector('h1.title') ||
                        document.querySelector('article h1') ||
                        document.querySelector('.article-header h1');
    
    if (articleTitle && articleTitle.parentNode) {
      // Insert before the article title
      articleTitle.parentNode.insertBefore(player, articleTitle);
      console.log('[TopPlayer] Inserted player before article title');
    } else {
      // If the article title is not found, use the default insertion
      insertDefault(player);
    }
  } catch (err) {
    console.error('[TopPlayer] Error inserting for news site:', err);
    // Fallback to default insertion if anything goes wrong
    insertDefault(player);
  }
}

/**
 * Default insertion method for the player
 */
export function insertDefault(player: HTMLElement): void {
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
    
    if (targetH1 && targetH1.parentNode) {
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