import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

export default function EntryScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 p-4 bg-primary-contrast">
      {/* Content Section */}
      <View className="flex-1 items-center justify-center">
        {/* Chef Ghost Image */}
        <Image
          source={require("@/assets/images/onbarding_image_transparent.png")}
          style={{
            width: 360,
            height: 480,
            resizeMode: "contain",
          }}
        />

        <Text className="text-center mt-2 mb-1 font-semibold text-6xl text-cream">
          FlavourFlow
        </Text>

        <Text className="text-lg text-text text-center mb-8">
          Find the best food recipes
        </Text>

        {/* Button */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="w-auto bg-background mt-3 rounded-lg py-4 pl-8 pr-6 items-center justify-center flex-row"
        >
          <Text className="text-text font-semibold text-xl mr-6">
            Start Cooking
          </Text>
          <FontAwesome6 name="arrow-right-long" color="#FF9C09" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
