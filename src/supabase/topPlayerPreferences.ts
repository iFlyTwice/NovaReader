// Functions for managing top player visibility preferences

import { supabase } from './client';

/**
 * Get the top player visibility setting for a user
 * @param userId The user's ID
 * @returns An object with the isVisible status or an error
 */
export const getTopPlayerVisibility = async (userId: string) => {
  try {
    // Call the database function
    const { data, error } = await supabase.rpc('get_user_preferences', {
      user_id: userId
    });
    
    if (error) {
      throw error;
    }
    
    // If preferences exist, extract the top player setting
    // Default to true if not set
    const isVisible = data && data.topPlayerEnabled !== undefined 
      ? data.topPlayerEnabled 
      : true;
    
    return { isVisible, error: null };
  } catch (error) {
    console.error('[Supabase] Error getting top player visibility:', error);
    return { isVisible: true, error };
  }
};

/**
 * Update the top player visibility setting for a user
 * @param userId The user's ID
 * @param isVisible Whether the top player should be visible
 * @returns An object with the updated preferences or an error
 */
export const updateTopPlayerVisibility = async (userId: string, isVisible: boolean) => {
  try {
    // Call the database function
    const { data, error } = await supabase.rpc('update_top_player_visibility', {
      user_id: userId,
      is_visible: isVisible
    });
    
    if (error) {
      throw error;
    }
    
    return { preferences: data, error: null };
  } catch (error) {
    console.error('[Supabase] Error updating top player visibility:', error);
    return { preferences: null, error };
  }
};
