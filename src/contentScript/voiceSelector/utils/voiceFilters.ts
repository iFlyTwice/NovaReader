import { getLanguageCodeFromLocale } from './supportedLanguages';

/**
 * Filters voice options based on search input and selected language
 * @param searchTerm The search term to filter by
 * @param languageCode Optional language code to filter by
 */
export function filterVoices(searchTerm: string, languageCode?: string): void {
  const voiceOptions = document.querySelectorAll('.voice-option');
  
  // Show all voices if both filters are empty
  if (searchTerm === '' && (!languageCode || languageCode === 'all')) {
    voiceOptions.forEach(option => {
      (option as HTMLElement).style.display = 'flex';
    });
    return;
  }
  
  // Filter voices based on name, gender, accent, and language
  voiceOptions.forEach(option => {
    const name = option.querySelector('.voice-name')?.textContent?.toLowerCase() || '';
    const details = option.querySelector('.voice-details')?.textContent?.toLowerCase() || '';
    const accent = option.getAttribute('data-accent')?.toLowerCase() || '';
    
    // Determine if it passes the search filter
    const passesSearchFilter = searchTerm === '' || 
                               name.includes(searchTerm) || 
                               details.includes(searchTerm);
    
    // Determine if it passes the language filter
    let passesLanguageFilter = true;
    if (languageCode && languageCode !== 'all') {
      const voiceLanguageCode = getLanguageCodeFromLocale(accent);
      passesLanguageFilter = voiceLanguageCode === languageCode || 
                             (languageCode === 'en' && accent.includes('english'));
    }
    
    // Show or hide based on both filters
    if (passesSearchFilter && passesLanguageFilter) {
      (option as HTMLElement).style.display = 'flex';
    } else {
      (option as HTMLElement).style.display = 'none';
    }
  });
}