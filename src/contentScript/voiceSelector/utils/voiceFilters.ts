/**
 * Filters voice options based on search input
 * @param searchTerm The search term to filter by
 */
export function filterVoices(searchTerm: string): void {
  const voiceOptions = document.querySelectorAll('.voice-option');
  
  if (searchTerm === '') {
    // Show all voices if search term is empty
    voiceOptions.forEach(option => {
      (option as HTMLElement).style.display = 'flex';
    });
    return;
  }
  
  // Filter voices based on name, gender, or accent
  voiceOptions.forEach(option => {
    const name = option.querySelector('.voice-name')?.textContent?.toLowerCase() || '';
    const details = option.querySelector('.voice-details')?.textContent?.toLowerCase() || '';
    
    if (name.includes(searchTerm) || details.includes(searchTerm)) {
      (option as HTMLElement).style.display = 'flex';
    } else {
      (option as HTMLElement).style.display = 'none';
    }
  });
}