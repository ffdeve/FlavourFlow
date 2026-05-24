import BackButton from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Password } from '@/components/ui/password';
import { useAuth } from '@/hooks/use-auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupPasswordScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { fullName, email } = useLocalSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      const { needsEmailVerification } = await signUp(email as string, password, fullName as string);
      
      if (needsEmailVerification) {
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email, type: 'signup', fullName }
        });
      } else {
        router.replace('/(auth)/userpreference');
      }
    } catch (error: any) {
      // Handle duplicate email with smart suggestion
      if (error.message?.includes('already registered') || error.message?.includes('User already exists')) {
        Alert.alert(
          'Email Already Registered',
          'This email is already registered. Would you like to sign in instead?',
          [
            { text: 'Cancel', onPress: () => {} },
            { text: 'Sign In', onPress: () => router.replace('/(auth)/login-email') }
          ]
        );
      } else {
        alert(error.message || 'Could not create account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 p-2 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
          {/* Back Button */}
          <BackButton />

          {/* Header */}
        <View className="px-4 mt-2">
            <View>
            <Text
              className="text-5xl text-primary mt-2 mb-1 font-poppins-semibold"
              style={{ lineHeight: 55 }}>
              Register
            </Text>

            <Text className="text-text text-sm font-poppins-light mb-2">
              Enter Your Password
            </Text>
            </View>
          

          {/* Chef Illustration */}
          <View className="items-center justify-center mb-6">
             <Image
                source={require("@/assets/images/Register2nd.png")}
                style={{
                width: 300,
                height: 270,
                resizeMode: "contain",
                transform: [{ scaleX: -1 }],
                alignSelf: "center",
               }}
              />
          </View>

          {/* Form */}
          <View >
            <View className='mb-1 mx-2'>
              <Password
                variant="form"
                placeholder="Set Your Password"
                value={password}
                onChangeText={setPassword}
                fieldClassName="bg-interactive/80 rounded-lg px-6 py-5 flex-row items-center"
              />

              <Password
                variant="form"
                placeholder="Confirm Your Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                containerClassName="mt-2"
                fieldClassName="bg-interactive/80 rounded-lg px-6 py-5 flex-row items-center"
              />
            </View>
            {/* Terms & Conditions */}
            <View className="mt-4 mb-6 items-center">
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
            <Button
              onPress={handleContinue}
              disabled={isLoading}
              isLoading={isLoading}
              size="lg"
              className="w-full mt-4"
            >
              Continue
            </Button>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-center mt-7 mb-7">
            <Text className="text-text text-base">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-primary font-poppins-semibold text-base">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
