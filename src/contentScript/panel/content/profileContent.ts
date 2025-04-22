/**
 * Profile content for the side panel
 */

export function getProfileContent(): string {
  return `
    <div class="panel-section" id="auth-section">
      <div class="panel-section-title">User Account</div>
      <div class="panel-section-content">
        <div id="auth-status-loading">
          <p>Loading authentication status...</p>
        </div>
        
        <div id="auth-logged-out" style="display: none;">
          <p class="compact-auth-message">Sign in to sync your preferences across devices.</p>
          
          <div class="auth-tabs">
            <button class="auth-tab-btn active" data-tab="login">Login</button>
            <button class="auth-tab-btn" data-tab="signup">Sign Up</button>
          </div>
          
          <div class="auth-tab-content" id="login-tab">
            <form id="login-form" class="compact-form">
              <div class="form-group compact">
                <label class="form-label" for="login-email">Email</label>
                <input type="email" id="login-email" class="form-control" required>
              </div>
              
              <div class="form-group compact">
                <label class="form-label" for="login-password">Password</label>
                <input type="password" id="login-password" class="form-control" required>
              </div>
              
              <div class="form-error" id="login-error"></div>
              
              <button type="submit" class="btn-primary compact-btn">Sign In</button>
              <div class="form-footer compact">
                <a href="#" id="forgot-password">Forgot Password?</a>
              </div>
            </form>
            
            <div class="social-login compact">
              <div class="social-divider compact"><span>OR</span></div>
              <button id="google-signin" class="btn-google compact-btn">
                <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                  <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
            
            <div id="reset-password-form" style="display: none;">
              <h4>Reset Password</h4>
              <div class="form-group compact">
                <label class="form-label" for="reset-email">Email</label>
                <input type="email" id="reset-email" class="form-control" required>
              </div>
              
              <div class="form-error" id="reset-error"></div>
              <div class="form-success" id="reset-success"></div>
              
              <button id="send-reset-email" class="btn-primary compact-btn">Send Reset Link</button>
              <button id="back-to-login" class="btn-secondary compact-btn">Back to Login</button>
            </div>
          </div>
          
          <div class="auth-tab-content" id="signup-tab" style="display: none;">
            <form id="signup-form" class="compact-form">
              <div class="form-group compact">
                <label class="form-label" for="signup-email">Email</label>
                <input type="email" id="signup-email" class="form-control" required>
              </div>
              
              <div class="form-group compact">
                <label class="form-label" for="signup-password">Password</label>
                <input type="password" id="signup-password" class="form-control" required minlength="6">
                <div class="small-text">Password must be at least 6 characters</div>
              </div>
              
              <div class="form-group compact">
                <label class="form-label" for="signup-confirm-password">Confirm Password</label>
                <input type="password" id="signup-confirm-password" class="form-control" required minlength="6">
              </div>
              
              <div class="form-error" id="signup-error"></div>
              <div class="form-success" id="signup-success"></div>
              
              <button type="submit" class="btn-primary compact-btn">Create Account</button>
            </form>
            
            <div class="social-login compact">
              <div class="social-divider compact"><span>OR</span></div>
              <button id="google-signup" class="btn-google compact-btn">
                <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                  <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
                Sign up with Google
              </button>
            </div>
          </div>
        </div>
        
        <div id="auth-logged-in" style="display: none;">
          <div class="user-info">
            <p>Logged in as: <span id="user-email"></span></p>
            <button id="logout-btn" class="btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">Reading Statistics</div>
      <div class="panel-section-content" id="reading-stats">
        <p>Sign in to track your reading habits and progress.</p>
      </div>
    </div>
  `;
}
