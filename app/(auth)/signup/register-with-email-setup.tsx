import BackButton from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { Country } from 'react-native-country-picker-modal';
import { PhoneInput, isValidNumber } from 'react-native-phone-entry';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupDetailsScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('PK');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const handlePhoneChange = (text: string) => {
    let formattedText = text;

    // If user enters 0 at the start (Pakistani format), convert to 92
    if (countryCode === 'PK') {
      if (text.startsWith('0') && !text.startsWith('92')) {
        // Remove leading 0 and add 92
        formattedText = '92' + text.slice(1);
      }
    }

    setPhoneNumber(formattedText);
  };

  const handleNext = () => {
    if (!fullName || !email || !phoneNumber) {
      alert('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      alert('Please enter a valid email');
      return;
    }

    // Validate phone number
    if (!isValidNumber(phoneNumber, countryCode)) {
      alert('Please enter a valid phone number');
      return;
    }

    // Pass data to password screen via navigation params
    router.push({
      pathname: '/(auth)/signup/regitser-with-email-password-setup',
      params: {
        fullName,
        email,
        country: selectedCountry?.name || countryCode,
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
              <PhoneInput
                defaultValues={{
                  countryCode: 'PK',
                  callingCode: '+92',
                  phoneNumber: '',
                }}
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                onChangeCountry={(country) => {
                  setCountryCode(country.cca2 as string);
                  setSelectedCountry(country);
                  // Reset phone number when country changes
                  setPhoneNumber('');
                }}
                autoFocus={false}
                disabled={false}
                countryPickerProps={{
                  withFilter: true,
                  withFlag: true,
                  withCountryNameButton: true,
                }}
                maskInputProps={{
                  mask: countryCode === 'PK' ? '(999) 999-9999' : undefined,
                }}
                theme={{
                  containerStyle: {
                    borderRadius: 24,
                    backgroundColor: '#EDD8A9',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginTop: 0,
                  },
                  textInputStyle: {
                    fontSize: 16,
                    color: '#3B3328',
                    fontFamily: 'Poppins_400Regular',
                  },
                  flagButtonStyle: {
                    paddingHorizontal: 8,
                  },
                  codeTextStyle: {
                    fontSize: 16,
                    color: '#3B3328',
                    fontFamily: 'Poppins_600SemiBold',
                    marginRight: 4,
                  },
                }}
                hideDropdownIcon={false}
                isCallingCodeEditable={false}
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
