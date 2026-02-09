import BackButton from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupPasswordScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { fullName, email } = useLocalSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleContinue = async () => {
    if (!password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      await signUp(email as string, password, fullName as string);
      router.replace('/(auth)/onboarding');
    } catch (error: any) {
      alert(error.message || 'Could not create account');
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

          {/* Header */}
          <View className="mb-8 mt-4">
            <Text className="text-6xl font-poppins-semibold text-primary">
              Register
            </Text>
            <Text className="text-text text-base font-poppins-regular mt-2">
              Enter Your Password
            </Text>
          </View>

          {/* Chef Illustration */}
          <View className="items-center justify-center py-8">
            <Image
              source={require('@/FF-ChefBoo/ghost-8356786_1920.png')}
              style={{
                width: 200,
                height: 200,
                resizeMode: 'contain',
              }}
            />
          </View>

          {/* Form */}
          <View>
            <Input
              label="Set Your Password"
              placeholder="Set Your Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password-new"
              rightIcon={
                <FontAwesome6
                  name={showPassword ? 'eye-slash' : 'eye'}
                  size={20}
                  color="#3B3328"
                />
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <Input
              label="Confirm Your Password"
              placeholder="Confirm Your Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoComplete="password-new"
              containerClassName="mt-4"
              rightIcon={
                <FontAwesome6
                  name={showConfirm ? 'eye-slash' : 'eye'}
                  size={20}
                  color="#3B3328"
                />
              }
              onRightIconPress={() => setShowConfirm(!showConfirm)}
            />

            {/* Terms & Conditions */}
            <View className="mt-6 mb-8 items-center">
              <Text className="text-text text-sm font-poppins-regular">
                By registering you agree to our
              </Text>
              <TouchableOpacity>
                <Text className="text-primary font-poppins-semibold text-sm">
                  Terms & Conditions
                </Text>
              </TouchableOpacity>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              onPress={handleContinue}
              disabled={isLoading}
              className={`w-full rounded-full py-4 items-center justify-center ${
                isLoading ? 'bg-gray-400' : 'bg-primary'
              }`}
            >
              <Text className="text-white font-poppins-semibold text-lg">
                {isLoading ? 'Creating Account...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-center mt-8 mb-8">
            <Text className="text-text text-base">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/LogInHomeScreen')}>
              <Text className="text-primary font-poppins-semibold text-base">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
