import BackButton from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import PhoneEntry from 'react-native-phone-entry';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupDetailsScreen() {
  const router = useRouter();
  const phoneInput = useRef<PhoneEntry>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const handleNext = () => {
    if (!fullName || !email) {
      alert('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      alert('Please enter a valid email');
      return;
    }

    // Get formatted phone number from PhoneEntry component
    const phoneNumber = phoneInput.current?.getPhoneNumber();
    const countryCode = phoneInput.current?.getCountryCode();

    if (!phoneNumber) {
      alert('Please enter a valid phone number');
      return;
    }

    // Pass data to password screen via navigation params
    router.push({
      pathname: '/(auth)/signup/regitser-with-email-password-setup',
      params: {
        fullName,
        email,
        country: countryCode,
        phoneNumber,
      },
    });
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
              Enter Your Details
            </Text>
          </View>

          {/* Form */}
          <View>
            <Input
              label="Full Name"
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
            />

            <Input
              label="Email"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              containerClassName="mt-4"
            />

            {/* Phone Number Input */}
            <View className="mt-4">
              <Text className="text-text font-poppins-medium mb-2">Phone Number</Text>
              <PhoneEntry
                ref={phoneInput}
                defaultCountry="PK"
                style={{
                  borderRadius: 24,
                  backgroundColor: '#EDD8A9',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
                textProps={{
                  placeholderTextColor: '#3B3328',
                  className: 'font-poppins-regular text-base text-text',
                }}
                flagStyle={{
                  height: 24,
                  width: 32,
                  resizeMode: 'contain',
                }}
              />
            </View>

            {/* Next Button */}
            <TouchableOpacity
              onPress={handleNext}
              className="w-full bg-primary rounded-full py-4 mt-8 items-center justify-center"
            >
              <Text className="text-white font-poppins-semibold text-lg">
                Next
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-center mt-8 mb-8">
            <Text className="text-text text-base">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login/LogInHomeScreen')}>
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
