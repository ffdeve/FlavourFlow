import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="pt-2">
          {/* Back Button */}
          <TouchableOpacity onPress={() => router.back()} className="my-2 px-5">
            <FontAwesome6 name="arrow-left-long" size={24} color="#3B3328" />
          </TouchableOpacity>

          <View className="mb-4 items-center justify-center w-full h-full relative">
            <Image
              source={require('@/FF-ChefBoo/SignUpHome_2x.png')}
              style={{
                width: "80%",
                height: "70%",
                resizeMode: 'contain',
                alignSelf: 'center',
                marginTop: 32,
              }}
            />
                <Text
                className="absolute text-6xl font-poppins-semibold pt-2 text-primary top-2 text-center ">
                FlavourFlow
                </Text>
                <Text className="text-2xl text-primary font-poppins-semibold mt-6 mb-2">
              Create You Account
            </Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            className="w-auto bg-primary rounded-lg py-3 px-6 mx-8 items-center justify-center mb-3"
            onPress={() => router.push('/(auth)/signup-email')}
          >
            <View className="flex-row items-center">
              <MaterialIcons name="mail-outline" size={32} color="white" />
              <Text className="text-white font-poppins-semibold text-lg ml-4">
                Register with Email
              </Text>
            </View>
          </TouchableOpacity>

          {/* Social Buttons Row */}
          <View className="flex-wrap mx-8">
              {/* Social Buttons Row */}
              <View className="flex-row items-center justify-center gap-4 mb-6">
                <TouchableOpacity className="flex-1 bg-primary rounded-lg py-4 items-center justify-center">
                  <FontAwesome6 name="google" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 bg-primary rounded-lg py-4 items-center justify-center">
                  <FontAwesome6 name="facebook" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>

          {/* Sign In Link */}
          <View className="flex-row items-center justify-center">
            <Text className="text-text text-base">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/LogInHomeScreen')}>
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
