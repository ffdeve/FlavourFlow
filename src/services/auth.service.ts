import { supabase } from "@/services/supabase";
import type { Session, User } from "@supabase/supabase-js";

export class AuthService {
  // Sign up with email and password
  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw this.mapEmailError(error);
    return data;
  }

  // Sign in with email and password
  async signIn(email: string, password: string) {
    // Validate email format
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Parse Supabase error messages for better UX
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Email not found or incorrect password');
      }
      if (error.message?.includes('Email not confirmed')) {
        throw new Error('Please verify your email first');
      }
      if (error.message?.includes('Too many')) {
        throw new Error('Too many login attempts. Please try again later');
      }
      throw error;
    }
    return data;
  }

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Get current session
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  // Reset password
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  // Update password
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  }

  // Sign in with OAuth (Google, Facebook)
  async signInWithOAuth(provider: 'google' | 'facebook' | 'apple', redirectTo?: string) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || 'flavourflow://', // Redirect to app root or dynamic url
        skipBrowserRedirect: true,
        queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
      },
    });

    if (error) throw error;
    return data;
  }

  // Set session from URL parameters (e.g. from OAuth redirect)
  async setSessionFromUrl(url: string) {
    const params: { [key: string]: string } = {};
    
    // Parse hash fragment (typical for Supabase OAuth redirect)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hashString = url.substring(hashIndex + 1);
      const pairs = hashString.split('&');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      }
    }
    
    // Parse query parameters as fallback
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const queryStr = url.substring(queryIndex + 1, hashIndex !== -1 && hashIndex > queryIndex ? hashIndex : undefined);
      const pairs = queryStr.split('&');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      }
    }

    const { access_token, refresh_token } = params;
    
    if (access_token && refresh_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) throw error;
      return data;
    }
    return null;
  }

  // Verify OTP
  async verifyOtp(email: string, token: string, type: 'signup' | 'recovery') {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });

    if (error) throw error;
    return data;
  }

  // Resend OTP
  async resendOtp(email: string, type: 'signup' | 'recovery') {
    if (type === 'recovery') {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw this.mapEmailError(error);
    } else {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw this.mapEmailError(error);
    }
  }

  /** Turn raw GoTrue email/SMTP errors into messages users can act on. */
  private mapEmailError(error: any): Error {
    const code = error?.code || error?.error_code;
    const msg: string = error?.message || '';
    if (code === 'over_email_send_rate_limit' || /you can only request this after/i.test(msg)) {
      const secs = msg.match(/after (\d+) seconds/i)?.[1];
      return new Error(
        secs
          ? `Please wait ${secs}s before requesting another email.`
          : 'Too many requests. Please wait a moment before trying again.',
      );
    }
    if (/error sending/i.test(msg)) {
      // SMTP transport failed on the server (timeout / TLS / auth).
      return new Error("We couldn't send the email right now. Please try again in a minute.");
    }
    return error instanceof Error ? error : new Error(msg || 'Something went wrong.');
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }
}

export const authService = new AuthService();
