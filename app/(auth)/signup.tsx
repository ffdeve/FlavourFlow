import BackButton from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

export default function SignupHomeScreen() {
  const router = useRouter();
  const { signInWithOAuth, setSessionFromUrl } = useAuth();

  const handleSocialSignup = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      const data = await signInWithOAuth(provider);
      
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url, 
          'flavourflow://'  // Redirect to app root
        );
        
        if (result.type === "success" && result.url) {
          await setSessionFromUrl(result.url);
        } else if (result.type === "cancel") {
          console.log("User cancelled the signup flow.");
        }
      }
    } catch (error: any) {
      Alert.alert("Signup Error", error.message || `Failed to sign up with ${provider}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 p-2 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View >
          {/* Back Button */}
         <BackButton/>

          <View className="mb-4 items-center justify-center w-full h-full relative">
            <Image
              source={require("@/assets/images/SignUpHome_2x.png")}
              style={{
                width: "100%",
                height: "70%",
                resizeMode: "contain",
                alignSelf: "center",
                marginTop: 20,
                paddingBottom: 12,
              
              }}
            />
            <Text className="absolute text-6xl font-poppins-semibold pt-2 text-primary top-2 text-center ">
              FlavourFlow
            </Text>
            <Text className="text-2xl text-primary font-poppins-semibold mt-6 mb-2">
              Create You Account
            </Text>
          </View>

          {/* Register Button */}
          <View >
          <Button
            className="w-auto mx-8 mb-3"
            size="lg"
            onPress={() => router.push("/(auth)/register-email")}
            leftIcon={<MaterialIcons name="mail-outline" size={28} color="white" />}
          >
            Register with Email
          </Button>

          {/* Social Buttons Row */}
          <View className="flex-wrap mx-8">
            {/* Social Buttons Row */}
            <View className="flex-row items-center justify-center gap-4 mb-6">
              <TouchableOpacity 
                onPress={() => handleSocialSignup('google')}
                className="flex-1 bg-primary rounded-lg py-4 items-center justify-center"
              >
                <FontAwesome6 name="google" size={28} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleSocialSignup('facebook')}
                className="flex-1 bg-primary rounded-lg py-4 items-center justify-center"
              >
                <FontAwesome6 name="facebook" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          </View>

          {/* Sign In Link */}
          <View className="flex-row items-center justify-center">
            <Text className="text-text text-base">
              Already have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
            >
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
