import BackButton from '@/components/ui/back-button';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Add Supabase password reset
      Alert.alert('Success', 'Password reset link sent to your email');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4">
          {/* Back Button */}
          <BackButton />

          {/* Title */}
          <Text 
            className="text-5xl font-semibold text-primary mt-4 mb-1"
            style={{ fontFamily: 'Poppins_600SemiBold' }}
          >
            Forgot Password?
          </Text>

          {/* Subtitle */}
          <Text 
            className="text-sm text-text mb-6"
            style={{ fontFamily: 'Poppins_300Light' }}
          >
            Enter your email to reset your password
          </Text>

          {/* Email Input */}
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor="#8B7D6F"
            style={{
              backgroundColor: '#EDD8A9',
              opacity: 0.8,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 12,
              marginBottom: 24,
              fontFamily: 'Poppins_200ExtraLight',
              color: '#3B3328',
            }}
          />

          {/* Reset Button */}
          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={isLoading}
            className="w-full bg-primary rounded-lg py-4 items-center justify-center mb-6"
          >
            <Text className="text-white font-semibold text-base">
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>

          {/* Back to Login Link */}
          <View className="flex-row items-center justify-center">
            <Text className="text-text text-base">
              Remember your password?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold text-base">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
