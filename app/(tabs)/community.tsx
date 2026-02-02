import React from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function CommunityScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 pt-16 pb-6">
        <Text className="text-2xl font-bold text-text mb-4">
          Community
        </Text>

        <View className="bg-white rounded-lg p-6 items-center justify-center border border-gray-200" style={{ height: 300 }}>
          <Text className="text-6xl mb-4">👥</Text>
          <Text className="text-text-secondary text-center">
            Community feed and posts coming soon
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
