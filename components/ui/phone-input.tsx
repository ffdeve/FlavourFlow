import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import React, { useState } from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

const COUNTRIES = [
  { code: 'PK', name: 'Pakistan', dial_code: '+92', flag: '🇵🇰' },
  { code: 'US', name: 'United States', dial_code: '+1', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', dial_code: '+44', flag: '🇬🇧' },
  { code: 'IN', name: 'India', dial_code: '+91', flag: '🇮🇳' },
  { code: 'CA', name: 'Canada', dial_code: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dial_code: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', dial_code: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial_code: '+33', flag: '🇫🇷' },
  { code: 'SA', name: 'Saudi Arabia', dial_code: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', dial_code: '+971', flag: '🇦🇪' },
];

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onCountryChange?: (country: (typeof COUNTRIES)[0]) => void;
  placeholder?: string;
  defaultCountry?: string;
}

export const PhoneInput = React.forwardRef<
  {
    getPhoneNumber: () => string;
    getCountryCode: () => string;
  },
  PhoneInputProps
>(
  (
    {
      value,
      onChangeText,
      onCountryChange,
      placeholder = 'Phone Number',
      defaultCountry = 'PK',
    },
    ref
  ) => {
    const [selectedCountry, setSelectedCountry] = useState(
      COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES[0]
    );
    const [showModal, setShowModal] = useState(false);
    const [searchText, setSearchText] = useState('');

    const filteredCountries = COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(searchText.toLowerCase()) ||
        country.dial_code.includes(searchText)
    );

    const handleCountrySelect = (country: (typeof COUNTRIES)[0]) => {
      setSelectedCountry(country);
      setShowModal(false);
      setSearchText('');
      onCountryChange?.(country);
    };

    // Expose methods to parent via ref
    React.useImperativeHandle(ref, () => ({
      getPhoneNumber: () => `${selectedCountry.dial_code}${value}`,
      getCountryCode: () => selectedCountry.code,
    }));

    return (
      <>
        <View className="flex-row items-center bg-interactive rounded-full px-4 py-1 border border-interactive-dark">
          {/* Country Selector */}
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            className="flex-row items-center pr-3"
          >
            <Text className="text-2xl mr-2">{selectedCountry.flag}</Text>
            <Text className="text-text font-poppins-medium text-base">
              {selectedCountry.dial_code}
            </Text>
            <FontAwesome6
              name="chevron-down"
              size={12}
              color="#3B3328"
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>

          {/* Divider */}
          <View className="w-px h-6 bg-text opacity-20 mx-2" />

          {/* Phone Input */}
          <TextInput
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            keyboardType="phone-pad"
            placeholderTextColor="#8B7D6F"
            className="flex-1 py-3 text-base text-text font-poppins-regular"
          />
        </View>

        {/* Country Selection Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <View className="flex-1 bg-black/50">
            <View className="flex-1 mt-20 bg-background rounded-t-3xl pt-6">
              {/* Header */}
              <View className="px-6 pb-4 border-b border-interactive">
                <Text className="text-2xl font-poppins-semibold text-text mb-4">
                  Select Country
                </Text>

                {/* Search Input */}
                <View className="bg-interactive rounded-full px-4 py-3 flex-row items-center">
                  <FontAwesome6 name="magnifying-glass" size={16} color="#3B3328" />
                  <TextInput
                    placeholder="Search country..."
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholderTextColor="#8B7D6F"
                    className="flex-1 ml-3 text-base text-text font-poppins-regular"
                  />
                </View>
              </View>

              {/* Country List */}
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleCountrySelect(item)}
                    className={`px-6 py-4 border-b border-interactive flex-row items-center justify-between ${
                      selectedCountry.code === item.code ? 'bg-interactive' : ''
                    }`}
                  >
                    <View className="flex-row items-center flex-1">
                      <Text className="text-3xl mr-4">{item.flag}</Text>
                      <View>
                        <Text className="text-text font-poppins-medium text-base">
                          {item.name}
                        </Text>
                        <Text className="text-text opacity-60 font-poppins-regular text-sm">
                          {item.dial_code}
                        </Text>
                      </View>
                    </View>
                    {selectedCountry.code === item.code && (
                      <FontAwesome6 name="check" size={20} color="#FBA82E" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
