import { supabase } from '@/lib/supabase';
import type { Profile, UserPreferences } from '@/types';

export class ProfileService {
  // Get user profile
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No profile found
      throw error;
    }
    
    return data;
  }

  // Create or update profile
  async upsertProfile(profile: Partial<Profile> & { id: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get user preferences
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return data;
  }

  // Create or update preferences
  async upsertPreferences(preferences: Partial<UserPreferences> & { user_id: string }) {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(preferences)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Upload avatar image
  async uploadAvatar(userId: string, fileUri: string) {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const fileExt = fileUri.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, arrayBuffer, {
        contentType: blob.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}

export const profileService = new ProfileService();
