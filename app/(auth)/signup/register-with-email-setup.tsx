import BackButton from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COUNTRIES = [
  { code: 'PK', name: 'Pakistan', dial_code: '+92' },
  { code: 'US', name: 'United States', dial_code: '+1' },
  { code: 'UK', name: 'United Kingdom', dial_code: '+44' },
  { code: 'IN', name: 'India', dial_code: '+91' },
  { code: 'CA', name: 'Canada', dial_code: '+1' },
];

export default function SignupDetailsScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const handleNext = () => {
    if (!fullName || !email || !phoneNumber) {
      alert('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      alert('Please enter a valid email');
      return;
    }

    // Pass data to password screen via navigation params
    router.push({
      pathname: '/(auth)/signup/regitser-with-email-password-setup',
      params: {
        fullName,
        email,
        country: selectedCountry.name,
        phoneNumber: `${selectedCountry.dial_code}${phoneNumber}`,
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

            {/* Country Picker */}
            <View className="mt-4">
              <Text className="text-text font-poppins-medium mb-2">Country</Text>
              <TouchableOpacity
                onPress={() => setShowCountryPicker(!showCountryPicker)}
                className="bg-interactive rounded-full py-4 px-4 border border-gray-200"
              >
                <Text className="text-text font-poppins-regular">
                  {selectedCountry.name}
                </Text>
              </TouchableOpacity>

              {showCountryPicker && (
                <View className="bg-white rounded-lg mt-2 border border-gray-200">
                  {COUNTRIES.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      onPress={() => {
                        setSelectedCountry(country);
                        setShowCountryPicker(false);
                      }}
                      className="py-3 px-4 border-b border-gray-100"
                    >
                      <Text className="text-text font-poppins-regular">
                        {country.name} ({country.dial_code})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Phone Number with Country Code */}
            <View className="mt-4">
              <Text className="text-text font-poppins-medium mb-2">
                Phone Number
              </Text>
              <View className="flex-row items-center bg-interactive rounded-full px-4">
                <Text className="text-text font-poppins-regular mr-2">
                  {selectedCountry.dial_code}
                </Text>
                <Input
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  containerClassName="flex-1 mt-0"
                  inputClassName="pl-0"
                />
              </View>
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
