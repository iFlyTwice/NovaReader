// Authentication related types
export interface User {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData extends LoginFormData {
  confirmPassword: string;
}

export interface ResetPasswordData {
  email: string;
}

// User preferences/settings types
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  selectedVoice: string;
  playbackSpeed: number;
  highlightEnabled: boolean;
  selectionButtonColor: string;
}
