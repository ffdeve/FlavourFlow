import BackButton from '@/components/ui/back-button';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginEmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Add Supabase authentication
      // await signIn(email, password);
      // router.replace('/(tabs)');
      Alert.alert('Success', 'Login functionality coming soon');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Back Button - Outside main content padding */}
          <View className="mt-2 pt-2 px-6">
          <BackButton />
        </View>

        <View className="px-6 pt-2">
          {/* Title */}
          <Text 
            className="text-5xl text-primary mt-2 mb-1 font-poppins-semibold"
            style={{ lineHeight: 55 }}
          >
            Sign In
          </Text>

          {/* Subtitle */}
          <Text 
            className="text-sm text-text mb-2 font-poppins-light"
          >
            Enter Your Email and Password
          </Text>

          {/* Image */}
          <View className="items-center justify-center mb-7">
            <Image
              source={require('@/FF-ChefBoo/knife_carrot_2x.png')}
              style={{
                width: 300,
                height: 310,
                paddingTop:8,
                paddingBottom:8,
                resizeMode: 'contain',
                transform: [{ scaleX: -1 }],
                alignSelf: 'center',
              }}
            />
          </View>

          {/* Email/Number Input */}
          <View className="mb-4 mx-2 bg-interactive/80 rounded-xl px-6 py-4 flex-row items-center ">
            <TextInput
              placeholder="Email / Number"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholderTextColor="#3B3328"
              className="flex-1 text-base text-black font-poppins-light opacity-100"
            />
          </View>

          {/* Password Input with Eye Icon */}
          <View className='mb-4 mx-2'>
            <View className="mb-4 bg-interactive/80 rounded-xl px-6 py-4 flex-row items-center ">
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                placeholderTextColor="#3B3328"
                className="flex-1 text-base text-black font-poppins-light opacity-100"
              />
              <TouchableOpacity className="" onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome6
                  name={showPassword ? 'eye' : 'eye-slash'}
                  size={18}
                  color="#3B3328"
                  style={{ marginLeft: 16 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <View className="mb-6 w-full flex-row flex-wrap items-center justify-center">
            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} className="px-2">
              <Text className="text-sm text-text font-poppins-medium text-center">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Continue Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              className="w-full mx-2 bg-primary rounded-xl py-4 items-center justify-center mb-6"
              style={{ alignSelf: 'center' }}
            >
            <Text className="text-white text-base font-poppins-semibold">
              {isLoading ? 'Signing In...' : 'Continue'}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View className="flex-row items-center justify-center mx-2 mb-6 ">
            <Text className="text-text text-base font-poppins-regular">
              {"Don't have an account?"}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup/SignupHomeScreen')}>
              <Text className="text-primary text-base font-poppins-semibold">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
