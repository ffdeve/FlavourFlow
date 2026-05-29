import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateRecipeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background justify-center items-center">
      <Text className="text-2xl font-poppins-semibold text-primary">Create Recipe</Text>
    </SafeAreaView>
  );
}
