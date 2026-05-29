import BackButton from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Ensure the auth session component closes properly after redirect
WebBrowser.maybeCompleteAuthSession();

export default function LogInHomeScreen() {
  const router = useRouter();
  const { signInWithOAuth, setSessionFromUrl } = useAuth();

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      const data = await signInWithOAuth(provider);
      
      // Open the system browser to handle Google/Facebook Login safely inside the app
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url, 
          'flavourflow://'  // Redirect to app root
        );
        
        if (result.type === "success" && result.url) {
          await setSessionFromUrl(result.url);
        } else if (result.type === "cancel") {
          console.log("User cancelled the login flow.");
        }
      }
    } catch (error: any) {
      Alert.alert("Login Error", error.message || `Failed to sign in with ${provider}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="py-2">
          {/* Back Button */}
          <BackButton className=" pl-6 pt-4" />

          {/* Image Container with Title Overlay */}
          <View className="mb-5 items-center justify-center w-full h-full relative">
            <Image
              source={require("@/assets/images/LogIn_front_photo.png")}
              style={{
                resizeMode: "cover",
                width: "100%",
                height: "100%",
                alignSelf: "center",
              }}
            />
            {/* Title Overlay */}
            <Text className="absolute text-6xl font-poppins-semibold pt-2 text-primary top-2 text-center ">
              FlavourFlow
            </Text>
          </View>

          <View className="pt-8 mx-10">
            {/* Email Button */}
            <Button
              className="w-full mb-3"
              size="lg"
              onPress={() => router.push("/(auth)/login-email")}
              leftIcon={<MaterialIcons name="mail-outline" size={28} color="white" />}
            >
              Continue with Email
            </Button>

            <View className="flex-wrap">
              {/* Social Buttons Row */}
              <View className="flex-row items-center justify-center gap-4 mb-6">
                <TouchableOpacity 
                  onPress={() => handleSocialLogin('google')}
                  className="flex-1 bg-primary rounded-lg py-4 items-center justify-center"
                >
                  <FontAwesome6 name="google" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleSocialLogin('facebook')}
                  className="flex-1 bg-primary rounded-lg py-4 items-center justify-center"
                >
                  <FontAwesome6 name="facebook" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Sign Up Link */}
          <View className="flex-row items-center justify-center">
            <Text className="text-text text-base">
              {"Don't have an account?"}{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup")}
            >
              <Text className="text-primary font-poppins-semibold text-base">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
