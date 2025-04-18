/**
 * Authentication handlers for the side panel
 */

// Import Supabase client and auth functions
import { 
  supabase, 
  signIn, 
  signUp, 
  signOut, 
  resetPassword,
  getUser,
  saveUserPreferences, 
  getReadingStats, 
  signInWithGoogle, 
  getUserPreferences
} from '../../../supabase/client';
import { includeTopPlayerInPreferences } from '../../../supabase/topPlayerSettings';
import { updateHighlightingState, updateSelectionButtonColor, updateTopPlayerVisibility } from '../utils/panelEvents';

// Check authentication state and update UI accordingly
export async function checkAuthState(panel: HTMLElement): Promise<void> {
  console.log('[Auth] Checking auth state...');
  const loadingElement = panel.querySelector('#auth-status-loading');
  const loggedOutElement = panel.querySelector('#auth-logged-out');
  const loggedInElement = panel.querySelector('#auth-logged-in');
  const userEmailElement = panel.querySelector('#user-email');
  const readingStatsElement = panel.querySelector('#reading-stats');
  
  if (!loadingElement || !loggedOutElement || !loggedInElement) {
    console.error('[Auth] Auth elements not found in DOM');
    return;
  }
  
  try {
    // Get session directly from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw sessionError;
    }
    
    if (session && session.user) {
      const user = session.user;
      console.log('[Auth] User is logged in:', user.email);
      
      // Show logged in state
      loadingElement.setAttribute('style', 'display: none;');
      loggedOutElement.setAttribute('style', 'display: none;');
      loggedInElement.setAttribute('style', 'display: block;');
      
      // Set user email
      if (userEmailElement && user.email) {
        userEmailElement.textContent = user.email;
      }
      
      // Load user preferences
      try {
        const { preferences, error } = await getUserPreferences(user.id);
        
        if (!error && preferences && preferences.preferences) {
          const userPrefs = preferences.preferences;
          
          // Update local storage with user preferences
          chrome.storage.local.set({
            apiKey: userPrefs.apiKey || '',
            speechifyApiKey: userPrefs.speechifyApiKey || '',
            selectedModel: userPrefs.selectedModel || 'eleven_turbo_v2',
            speechifyModel: userPrefs.speechifyModel || 'simba-english',
            playbackSpeed: userPrefs.playbackSpeed || 1.0,
            highlightEnabled: userPrefs.highlightEnabled !== undefined ? userPrefs.highlightEnabled : true,
            selectionButtonColor: userPrefs.selectionButtonColor || '#27272a',
            topPlayerEnabled: userPrefs.topPlayerEnabled !== undefined ? userPrefs.topPlayerEnabled : true,
            ttsProvider: userPrefs.ttsProvider || 'elevenlabs'
          }, () => {
            console.log('[Auth] User preferences loaded from database');
            
            // Dispatch events to update UI components
            updateHighlightingState(userPrefs.highlightEnabled !== undefined ? userPrefs.highlightEnabled : true);
            updateSelectionButtonColor(userPrefs.selectionButtonColor || '#27272a');
            updateTopPlayerVisibility(userPrefs.topPlayerEnabled !== undefined ? userPrefs.topPlayerEnabled : true);
          });
        }
      } catch (prefsError) {
        console.error('[Auth] Error loading user preferences:', prefsError);
      }
      
      // Update reading stats if available
      if (readingStatsElement) {
        try {
          const { stats, error } = await getReadingStats(user.id);
          
          if (error) {
            throw error;
          }
          
          if (stats && stats.length > 0) {
            // Calculate total passages
            const totalPassages = stats.reduce((total: number, stat: any) => total + stat.passage_count, 0);
            
            // Get unique websites
            const uniqueWebsites = new Set(stats.map((stat: any) => stat.website)).size;
            
            // Get most active day
            const dayMap = new Map();
            stats.forEach((stat: any) => {
              const date = new Date(stat.read_date);
              const day = date.toLocaleDateString('en-US', { weekday: 'long' });
              dayMap.set(day, (dayMap.get(day) || 0) + stat.passage_count);
            });
            
            let mostActiveDay = '';
            let highestCount = 0;
            
            dayMap.forEach((count, day) => {
              if (count > highestCount) {
                highestCount = count;
                mostActiveDay = day;
              }
            });
            
            readingStatsElement.innerHTML = `
              <p>You've read ${totalPassages} passages across ${uniqueWebsites} websites.</p>
              ${mostActiveDay ? `<p>Your most active reading day is ${mostActiveDay}.</p>` : ''}
            `;
          } else {
            readingStatsElement.innerHTML = `
              <p>No reading activity recorded yet.</p>
              <p>Use the highlighting feature to start tracking your reading!</p>
            `;
          }
        } catch (statsError) {
          console.error('[Auth] Error fetching reading stats:', statsError);
          readingStatsElement.innerHTML = `<p>Unable to load reading statistics.</p>`;
        }
      }
    } else {
      console.log('[Auth] User is not logged in');
      // Show logged out state
      loadingElement.setAttribute('style', 'display: none;');
      loggedOutElement.setAttribute('style', 'display: block;');
      loggedInElement.setAttribute('style', 'display: none;');
      
      // Update reading stats
      if (readingStatsElement) {
        readingStatsElement.innerHTML = `<p>Sign in to track your reading habits and progress.</p>`;
      }
    }
  } catch (error) {
    console.error('[Auth] Error checking auth state:', error);
    // Show logged out state on error
    loadingElement.setAttribute('style', 'display: none;');
    loggedOutElement.setAttribute('style', 'display: block;');
    loggedInElement.setAttribute('style', 'display: none;');
  }
}

// Set up authentication event handlers
export function setupAuthHandlers(panel: HTMLElement, checkAuthStateCallback: (panel: HTMLElement) => Promise<void>): void {
  // Check auth state immediately
  checkAuthStateCallback(panel);
  
  // Set up tab switching
  const tabButtons = panel.querySelectorAll('.auth-tab-btn');
  const loginTab = panel.querySelector('#login-tab');
  const signupTab = panel.querySelector('#signup-tab');
  const resetForm = panel.querySelector('#reset-password-form');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      // Reset UI state
      if (resetForm) {
        resetForm.setAttribute('style', 'display: none;');
      }
      
      // Remove active class from all tab buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      const currentButton = e.currentTarget as HTMLElement;
      currentButton.classList.add('active');
      
      // Get the tab to show
      const tabToShow = currentButton.getAttribute('data-tab');
      
      // Show the selected tab
      if (tabToShow === 'login' && loginTab && signupTab) {
        loginTab.setAttribute('style', 'display: block;');
        signupTab.setAttribute('style', 'display: none;');
      } else if (tabToShow === 'signup' && loginTab && signupTab) {
        loginTab.setAttribute('style', 'display: none;');
        signupTab.setAttribute('style', 'display: block;');
      }
    });
  });

  // Google sign-in button
  const googleSignInButton = panel.querySelector('#google-signin');
  const googleSignUpButton = panel.querySelector('#google-signup');
  
  // Add event listeners for Google sign-in buttons
  if (googleSignInButton) {
    googleSignInButton.addEventListener('click', async () => {
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error('[Auth] Google sign-in error:', error);
        const loginError = panel.querySelector('#login-error');
        if (loginError) {
          loginError.textContent = 'Failed to sign in with Google. Please try again.';
        }
      }
    });
  }
  
  if (googleSignUpButton) {
    googleSignUpButton.addEventListener('click', async () => {
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error('[Auth] Google sign-up error:', error);
        const signupError = panel.querySelector('#signup-error');
        if (signupError) {
          signupError.textContent = 'Failed to sign up with Google. Please try again.';
        }
      }
    });
  }
  
  // Login form
  const loginForm = panel.querySelector('#login-form');
  const loginError = panel.querySelector('#login-error');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = loginForm.querySelector('#login-email') as HTMLInputElement;
      const passwordInput = loginForm.querySelector('#login-password') as HTMLInputElement;
      
      if (!emailInput || !passwordInput) {
        console.error('[Auth] Login form inputs not found');
        return;
      }
      
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      if (!email || !password) {
        if (loginError) {
          loginError.textContent = 'Please enter both email and password';
        }
        return;
      }
      
      try {
        // Clear previous errors
        if (loginError) {
          loginError.textContent = '';
        }
        
        // Sign in with Supabase
        console.log('[Auth] Attempting to sign in with:', email);
        const { data, error } = await signIn(email, password);
        
        if (error) {
          throw error;
        }
        
        // Successfully signed in
        console.log('[Auth] Sign in successful:', data);
        
        // Check auth state to update UI
        checkAuthStateCallback(panel);
        
        // Clear form
        emailInput.value = '';
        passwordInput.value = '';
      } catch (error: any) {
        console.error('[Auth] Sign in error:', error);
        
        if (loginError) {
          loginError.textContent = error.message || 'Failed to sign in. Please try again.';
        }
      }
    });
  }
  
  // Signup form
  const signupForm = panel.querySelector('#signup-form');
  const signupError = panel.querySelector('#signup-error');
  const signupSuccess = panel.querySelector('#signup-success');
  
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = signupForm.querySelector('#signup-email') as HTMLInputElement;
      const passwordInput = signupForm.querySelector('#signup-password') as HTMLInputElement;
      const confirmInput = signupForm.querySelector('#signup-confirm-password') as HTMLInputElement;
      
      if (!emailInput || !passwordInput || !confirmInput) {
        console.error('[Auth] Signup form inputs not found');
        return;
      }
      
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmInput.value;
      
      // Clear previous messages
      if (signupError) {
        signupError.textContent = '';
      }
      if (signupSuccess) {
        signupSuccess.textContent = '';
      }
      
      // Validate inputs
      if (!email || !password || !confirmPassword) {
        if (signupError) {
          signupError.textContent = 'Please fill in all fields';
        }
        return;
      }
      
      if (password !== confirmPassword) {
        if (signupError) {
          signupError.textContent = 'Passwords do not match';
        }
        return;
      }
      
      if (password.length < 6) {
        if (signupError) {
          signupError.textContent = 'Password must be at least 6 characters';
        }
        return;
      }
      
      try {
        // Sign up with Supabase
        console.log('[Auth] Attempting to sign up with:', email);
        const { data, error } = await signUp(email, password);
        
        if (error) {
          throw error;
        }
        
        // Successfully signed up
        console.log('[Auth] Sign up successful:', data);
        
        if (signupSuccess) {
          signupSuccess.textContent = 'Account created! Please check your email to confirm your account.';
        }
        
        // Clear form
        emailInput.value = '';
        passwordInput.value = '';
        confirmInput.value = '';
      } catch (error: any) {
        console.error('[Auth] Sign up error:', error);
        
        if (signupError) {
          signupError.textContent = error.message || 'Failed to create account. Please try again.';
        }
      }
    });
  }
  
  // Logout button
  const logoutButton = panel.querySelector('#logout-btn');
  
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        console.log('[Auth] Attempting to sign out');
        const { error } = await signOut();
        
        if (error) {
          throw error;
        }
        
        // Successfully signed out
        console.log('[Auth] Sign out successful');
        
        // Check auth state to update UI
        checkAuthStateCallback(panel);
      } catch (error) {
        console.error('[Auth] Sign out error:', error);
      }
    });
  }
  
  // Forgot password link
  const forgotPasswordLink = panel.querySelector('#forgot-password');
  
  if (forgotPasswordLink && loginTab && resetForm) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginTab.setAttribute('style', 'display: none;');
      resetForm.setAttribute('style', 'display: block;');
    });
  }
  
  // Back to login button
  const backToLoginButton = panel.querySelector('#back-to-login');
  
  if (backToLoginButton && loginTab && resetForm) {
    backToLoginButton.addEventListener('click', () => {
      resetForm.setAttribute('style', 'display: none;');
      loginTab.setAttribute('style', 'display: block;');
    });
  }
  
  // Send reset email button
  const sendResetButton = panel.querySelector('#send-reset-email');
  const resetError = panel.querySelector('#reset-error');
  const resetSuccess = panel.querySelector('#reset-success');
  
  if (sendResetButton) {
    sendResetButton.addEventListener('click', async () => {
      const resetEmailInput = panel.querySelector('#reset-email') as HTMLInputElement;
      
      if (!resetEmailInput) {
        console.error('[Auth] Reset email input not found');
        return;
      }
      
      const email = resetEmailInput.value.trim();
      
      // Clear previous messages
      if (resetError) {
        resetError.textContent = '';
      }
      if (resetSuccess) {
        resetSuccess.textContent = '';
      }
      
      if (!email) {
        if (resetError) {
          resetError.textContent = 'Please enter your email';
        }
        return;
      }
      
      try {
        console.log('[Auth] Sending password reset email to:', email);
        const { data, error } = await resetPassword(email);
        
        if (error) {
          throw error;
        }
        
        // Successfully sent reset email
        console.log('[Auth] Password reset email sent');
        
        if (resetSuccess) {
          resetSuccess.textContent = 'Password reset email sent. Please check your inbox.';
        }
        
        // Clear form
        resetEmailInput.value = '';
      } catch (error: any) {
        console.error('[Auth] Password reset error:', error);
        
        if (resetError) {
          resetError.textContent = error.message || 'Failed to send reset email. Please try again.';
        }
      }
    });
  }
  
  // Sync settings button
  const syncButton = panel.querySelector('#sync-settings-btn');
  const syncStatus = panel.querySelector('#sync-status');
  
  if (syncButton) {
    syncButton.addEventListener('click', async () => {
      if (!syncStatus) {
        return;
      }
      
      try {
        syncStatus.textContent = 'Syncing settings...';
        syncStatus.className = '';
        
        // Get current user
        const { user, error } = await getUser();
        
        if (error || !user) {
          throw new Error('Not logged in');
        }
        
        // Get current settings
        chrome.storage.local.get([
          'apiKey',
          'speechifyApiKey',
          'selectedModel',
          'speechifyModel',
          'playbackSpeed',
          'highlightEnabled',
          'selectionButtonColor',
          'topPlayerEnabled',
          'ttsProvider'
        ], async (settings) => {
          try {
            // Make sure the top player setting is included in preferences
            const updatedSettings = includeTopPlayerInPreferences(
              settings, 
              settings.topPlayerEnabled !== undefined ? settings.topPlayerEnabled : true
            );
            
            // Save settings to Supabase
            const { error } = await saveUserPreferences(user.id, updatedSettings);
            
            if (error) {
              throw error;
            }
            
            console.log('[Auth] Settings synced successfully');
            syncStatus.textContent = 'Settings synced successfully!';
            syncStatus.className = 'form-success';
            
            // Clear status after a few seconds
            setTimeout(() => {
              if (syncStatus) {
                syncStatus.textContent = '';
              }
            }, 3000);
          } catch (error: any) {
            console.error('[Auth] Error syncing settings:', error);
            syncStatus.textContent = error.message || 'Failed to sync settings. Please try again.';
            syncStatus.className = 'form-error';
          }
        });
      } catch (error: any) {
        console.error('[Auth] Error syncing settings:', error);
        syncStatus.textContent = error.message || 'Failed to sync settings. Please try again.';
        syncStatus.className = 'form-error';
      }
    });
  }
}
