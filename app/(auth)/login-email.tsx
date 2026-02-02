import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginEmailScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-2">
          {/* Back Button */}
          <TouchableOpacity onPress={() => router.back()} className="my-2 flex-wrap">
            <FontAwesome6 name="arrow-left-long" size={24} color="#3B3328" />
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-8 mt-4">
            <Text 
              className="text-5xl font-semibold text-primary mb-2"
              style={{ fontFamily: 'Poppins_600SemiBold' }}
            >
              Welcome Back
            </Text>
            <Text className="text-text-secondary text-base">
              Sign in to continue cooking
            </Text>
          </View>

          {/* Form */}
          <View>
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              containerClassName="mt-4"
            />

            <TouchableOpacity className="self-end mt-2">
              <Text className="text-primary font-medium">
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <Button
              onPress={handleLogin}
              isLoading={isLoading}
              className="w-full mt-6"
            >
              Sign In
            </Button>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-text-secondary">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text className="text-primary font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
