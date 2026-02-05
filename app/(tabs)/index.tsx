import { useAuth } from '@/hooks/use-auth';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function HomeScreen() {
  const { profile } = useAuth();

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-white px-6 pt-16 pb-6 border-b border-gray-200">
        <Text className="text-2xl font-bold text-text">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}!
        </Text>
        <Text className="text-text-secondary mt-1">
          What would you like to cook today?
        </Text>
      </View>

      {/* Meal Recommendations Placeholder */}
      <View className="px-6 py-8">
        <Text className="text-xl font-semibold text-text mb-4">
          Today&apos;s Recommendations
        </Text>

        <View className="bg-white rounded-lg p-6 items-center justify-center border border-gray-200" style={{ height: 200 }}>
          <Text className="text-6xl mb-4">🍽️</Text>
          <Text className="text-text-secondary text-center">
            AI meal recommendations will appear here
          </Text>
        </View>

        {/* Smart Pantry CTA */}
        <View className="mt-6 bg-primary rounded-lg p-6">
          <Text className="text-xl font-semibold text-white mb-2">
            What&apos;s in Your Fridge?
          </Text>
          <Text className="text-white opacity-90">
            Tell us what ingredients you have and we&apos;ll suggest recipes
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
