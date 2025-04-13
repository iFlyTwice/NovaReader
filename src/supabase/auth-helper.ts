// Helper functions for authentication in both production and development environments

// Check if we're running in dev mode or as an actual extension
export const isDevMode = (): boolean => {
  return typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id;
};

// Get auth data from storage (different for dev vs production)
export const getAuthData = async (): Promise<{user: any | null, error: Error | null}> => {
  if (isDevMode()) {
    // In dev mode, check localStorage
    try {
      const tokenData = localStorage.getItem('supabase.auth.token');
      if (tokenData) {
        const parsedData = JSON.parse(tokenData);
        // Here we'd typically make a call to validate the token or get user data
        // For simplicity, we'll just return a mock user object
        return {
          user: {
            id: 'dev-user-id',
            email: 'dev@example.com',
            // Add other user properties as needed
          },
          error: null
        };
      }
      return { user: null, error: null };
    } catch (error) {
      console.error('Error getting auth data from localStorage:', error);
      return { user: null, error: error as Error };
    }
  } else {
    // In production mode, use chrome.storage
    return new Promise((resolve) => {
      chrome.storage.local.get(['auth'], (result) => {
        if (result.auth && result.auth.data) {
          // Here we would typically validate the token
          resolve({
            user: result.auth.data.user || null,
            error: null
          });
        } else {
          resolve({ user: null, error: null });
        }
      });
    });
  }
};

// Store auth data (different for dev vs production)
export const storeAuthData = async (data: any): Promise<{success: boolean, error: Error | null}> => {
  if (isDevMode()) {
    // In dev mode, use localStorage
    try {
      localStorage.setItem('supabase.auth.data', JSON.stringify(data));
      return { success: true, error: null };
    } catch (error) {
      console.error('Error storing auth data in localStorage:', error);
      return { success: false, error: error as Error };
    }
  } else {
    // In production mode, use chrome.storage
    return new Promise((resolve) => {
      chrome.storage.local.set({
        auth: {
          data,
          timestamp: Date.now()
        }
      }, () => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: new Error(chrome.runtime.lastError.message) });
        } else {
          resolve({ success: true, error: null });
        }
      });
    });
  }
};

// Clear auth data (for sign out)
export const clearAuthData = async (): Promise<{success: boolean, error: Error | null}> => {
  if (isDevMode()) {
    // In dev mode, use localStorage
    try {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.data');
      return { success: true, error: null };
    } catch (error) {
      console.error('Error clearing auth data from localStorage:', error);
      return { success: false, error: error as Error };
    }
  } else {
    // In production mode, use chrome.storage
    return new Promise((resolve) => {
      chrome.storage.local.remove(['auth'], () => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: new Error(chrome.runtime.lastError.message) });
        } else {
          resolve({ success: true, error: null });
        }
      });
    });
  }
};
