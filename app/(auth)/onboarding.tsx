import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import type { CuisineType, DietType } from '@/types';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'halal', label: 'Halal' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'diabetic', label: 'Diabetic' },
  { value: 'low-carb', label: 'Low Carb' },
  { value: 'keto', label: 'Keto' },
  { value: 'gluten-free', label: 'Gluten Free' },
];

const CUISINE_OPTIONS: { value: CuisineType; label: string }[] = [
  { value: 'pakistani', label: 'Pakistani' },
  { value: 'mughlai', label: 'Mughlai' },
  { value: 'punjabi', label: 'Punjabi' },
  { value: 'sindhi', label: 'Sindhi' },
  { value: 'balochi', label: 'Balochi' },
  { value: 'pashtun', label: 'Pashtun' },
  { value: 'kashmiri', label: 'Kashmiri' },
];

const COMMON_ALLERGIES = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish', 'Shellfish'
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { updatePreferences } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedDiet, setSelectedDiet] = useState<DietType | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<CuisineType[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleCuisine = (cuisine: CuisineType) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      setIsLoading(true);
      await updatePreferences({
        diet_type: selectedDiet || undefined,
        preferred_cuisines: selectedCuisines,
        allergies: selectedAllergies,
      });
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'Could not save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-16 pb-8">
        {/* Progress */}
        <View className="flex-row mb-8">
          {[1, 2, 3].map(i => (
            <View
              key={i}
              className={`flex-1 h-2 rounded mr-2 ${
                i <= step ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </View>

        {/* Step 1: Diet Type */}
        {step === 1 && (
          <View>
            <Text className="text-2xl font-bold text-text mb-2">
              Dietary Preferences
            </Text>
            <Text className="text-text-secondary mb-6">
              Choose your dietary preference (optional)
            </Text>

            <View className="flex-row flex-wrap">
              {DIET_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setSelectedDiet(option.value)}
                  className={`px-4 py-3 rounded-lg border-2 mb-3 mr-2 ${
                    selectedDiet === option.value
                      ? 'bg-primary border-primary'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selectedDiet === option.value
                        ? 'text-white'
                        : 'text-text'
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Cuisines */}
        {step === 2 && (
          <View>
            <Text className="text-2xl font-bold text-text mb-2">
              Favorite Cuisines
            </Text>
            <Text className="text-text-secondary mb-6">
              Select cuisines you enjoy (choose multiple)
            </Text>

            <View className="flex-row flex-wrap">
              {CUISINE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => toggleCuisine(option.value)}
                  className={`px-4 py-3 rounded-lg border-2 mb-3 mr-2 ${
                    selectedCuisines.includes(option.value)
                      ? 'bg-primary border-primary'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selectedCuisines.includes(option.value)
                        ? 'text-white'
                        : 'text-text'
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Allergies */}
        {step === 3 && (
          <View>
            <Text className="text-2xl font-bold text-text mb-2">
              Allergies & Restrictions
            </Text>
            <Text className="text-text-secondary mb-6">
              Select any food allergies (optional)
            </Text>

            <View className="flex-row flex-wrap">
              {COMMON_ALLERGIES.map(allergy => (
                <TouchableOpacity
                  key={allergy}
                  onPress={() => toggleAllergy(allergy)}
                  className={`px-4 py-3 rounded-lg border-2 mb-3 mr-2 ${
                    selectedAllergies.includes(allergy)
                      ? 'bg-primary border-primary'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selectedAllergies.includes(allergy)
                        ? 'text-white'
                        : 'text-text'
                    }`}
                  >
                    {allergy}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View className="mt-auto pt-8">
          <Button onPress={handleNext} isLoading={isLoading} className="w-full">
            {step === 3 ? 'Finish' : 'Continue'}
          </Button>

          {step > 1 && (
            <Button
              onPress={() => setStep(step - 1)}
              variant="ghost"
              className="w-full mt-3"
            >
              Back
            </Button>
          )}

          {step < 3 && (
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} className="mt-4">
              <Text className="text-center text-text-secondary">Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
