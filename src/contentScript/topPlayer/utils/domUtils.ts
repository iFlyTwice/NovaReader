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
 * Insert player for Coursera pages
 */
export function insertForCoursera(player: HTMLElement): void {
  console.log('[TopPlayer] Detected Coursera, using Coursera-specific insertion');
  
  try {
    // The most reliable position is right after the reading-title div
    // This is the exact position shown in your second screenshot
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
      return;
    }
    
    // If no reading title found yet, target one of the other key elements
    // These are backup options that shouldn't be needed due to our waiting approach
    
    // Try to find the course content container
    const courseContent = document.querySelector('.rc-CML');
    if (courseContent && courseContent.parentNode) {
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
    insertDefault(player);
  } catch (err) {
    console.error('[TopPlayer] Error inserting for Coursera:', err);
    // Fallback to default insertion if anything goes wrong
    insertDefault(player);
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
