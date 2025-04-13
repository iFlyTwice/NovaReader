import { createClient } from '@supabase/supabase-js';

// Environment variables from .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if env variables are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing from environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication helper functions
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
};

export const signInWithGoogle = async () => {
  try {
    console.log('[Auth] Starting Google sign-in');
    
    // Simple approach - let Supabase handle everything
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // No custom redirects - let Supabase handle it
      }
    });
    
    if (error) {
      throw error;
    }
    
    console.log('[Auth] Opening auth URL:', data.url);
    
    // Determine how to open the URL based on environment
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.windows && chrome.windows.create) {
      // Running as an actual extension - open in popup
      chrome.windows.create({
        url: data.url,
        type: 'popup',
        width: 600,
        height: 700
      });
    } else {
      // Running in development mode - redirect current window
      console.log('[Auth] Development mode detected, opening in current window');
      window.location.href = data.url;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[Auth] Google sign in error:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
};

export const resetPassword = async (email: string) => {
  // Get the extension ID dynamically
  const extensionId = chrome.runtime.id;
  
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `chrome-extension://${extensionId}/options.html`,
  });
  
  return { data, error };
};

// User preferences functions
export const getUserPreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('preferences, preferred_voice, reading_speed')
    .eq('id', userId)
    .single();
  
  return { preferences: data, error };
};

export const saveUserPreferences = async (userId: string, preferences: any) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      id: userId,
      preferences: preferences,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id'
    });
  
  return { data, error };
};

// Reading history functions
export const saveReadingHistory = async (userId: string, url: string, title: string, excerpt: string) => {
  const { data, error } = await supabase
    .from('reading_history')
    .insert({
      user_id: userId,
      url: url,
      title: title,
      excerpt: excerpt,
    });
  
  return { data, error };
};

export const getReadingHistory = async (userId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('reading_history')
    .select('*')
    .eq('user_id', userId)
    .order('read_at', { ascending: false })
    .limit(limit);
  
  return { history: data, error };
};

// Reading statistics functions
export const saveReadingStats = async (userId: string, website: string, passageCount: number, readingTime: number) => {
  // First check if an entry already exists for this user, website and date
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const { data: existingData } = await supabase
    .from('reading_stats')
    .select('id, passage_count, reading_time')
    .eq('user_id', userId)
    .eq('website', website)
    .eq('read_date', today)
    .single();
  
  if (existingData) {
    // Update existing entry
    const { data, error } = await supabase
      .from('reading_stats')
      .update({
        passage_count: existingData.passage_count + passageCount,
        reading_time: existingData.reading_time + readingTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingData.id);
    
    return { data, error };
  } else {
    // Create new entry
    const { data, error } = await supabase
      .from('reading_stats')
      .insert({
        user_id: userId,
        website: website,
        passage_count: passageCount,
        reading_time: readingTime,
        read_date: today,
      });
    
    return { data, error };
  }
};

export const getReadingStats = async (userId: string, days = 30) => {
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Format dates for query
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('reading_stats')
    .select('*')
    .eq('user_id', userId)
    .gte('read_date', startDateStr)
    .lte('read_date', endDateStr)
    .order('read_date', { ascending: false });
  
  return { stats: data, error };
};
