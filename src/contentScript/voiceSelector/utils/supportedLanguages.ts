/**
 * Supported languages data for Speechify TTS API
 */

// Interface for language data
export interface Language {
  code: string;        // Language code (e.g., 'en', 'fr-FR')
  name: string;        // Display name (e.g., 'English', 'French')
  supported: boolean;  // Whether the language is fully supported
}

// Fully supported languages
export const FULLY_SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', supported: true },
  { code: 'fr-FR', name: 'French', supported: true },
  { code: 'de-DE', name: 'German', supported: true },
  { code: 'es-ES', name: 'Spanish', supported: true },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', supported: true },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', supported: true },
];

// Beta languages
export const BETA_LANGUAGES: Language[] = [
  { code: 'ar-AE', name: 'Arabic', supported: false },
  { code: 'da-DK', name: 'Danish', supported: false },
  { code: 'nl-NL', name: 'Dutch', supported: false },
  { code: 'et-EE', name: 'Estonian', supported: false },
  { code: 'fi-FI', name: 'Finnish', supported: false },
  { code: 'el-GR', name: 'Greek', supported: false },
  { code: 'he-IL', name: 'Hebrew', supported: false },
  { code: 'hi-IN', name: 'Hindi', supported: false },
  { code: 'it-IT', name: 'Italian', supported: false },
  { code: 'ja-JP', name: 'Japanese', supported: false },
  { code: 'nb-NO', name: 'Norwegian', supported: false },
  { code: 'pl-PL', name: 'Polish', supported: false },
  { code: 'ru-RU', name: 'Russian', supported: false },
  { code: 'sv-SE', name: 'Swedish', supported: false },
  { code: 'tr-TR', name: 'Turkish', supported: false },
  { code: 'uk-UA', name: 'Ukrainian', supported: false },
  { code: 'vi-VN', name: 'Vietnamese', supported: false },
];

// Combined list of all languages for dropdown
export const ALL_LANGUAGES: Language[] = [
  { code: 'all', name: 'All Languages', supported: true }, // Default option
  ...FULLY_SUPPORTED_LANGUAGES,
  ...BETA_LANGUAGES,
];

// Helper function to get language name from code
export function getLanguageNameFromCode(code: string): string {
  const language = ALL_LANGUAGES.find(lang => lang.code === code);
  return language ? language.name : 'Unknown Language';
}

// Helper function to get language code from accent/locale
export function getLanguageCodeFromLocale(locale: string): string {
  // Handle special cases or normalize locale format
  const normalizedLocale = locale.toLowerCase();
  
  // Check for exact matches first
  for (const lang of ALL_LANGUAGES) {
    if (normalizedLocale === lang.code.toLowerCase()) {
      return lang.code;
    }
  }
  
  // Check for partial matches (e.g., if locale has additional information)
  for (const lang of ALL_LANGUAGES) {
    // Skip the "all" option
    if (lang.code === 'all') continue;
    
    if (normalizedLocale.startsWith(lang.code.toLowerCase()) || 
        normalizedLocale.includes(lang.code.toLowerCase())) {
      return lang.code;
    }
    
    // Special case for English (which might just be 'en' or various variants)
    if (lang.code === 'en' && 
        (normalizedLocale === 'en' || 
         normalizedLocale.startsWith('en-') || 
         normalizedLocale.includes('english'))) {
      return 'en';
    }
  }
  
  // If no match found, return 'all' as default
  return 'all';
} 