import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

export default function EntryScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 p-4 bg-primary-contrast">
      {/* Content Section */}
      <View className="flex-1 items-center justify-center">
        {/* Chef Ghost Image */}
        <Image
          source={require("@/assets/images/onbarding_image_transparent.webp")}
          style={{
            width: wp("95%"),
            height: hp("55%"),
            resizeMode: "contain",
          }}
        />

        <Text
          style={{ fontSize: wp("14%") }}
          className="text-center mt-4 mb-1 font-poppins-semibold text-cream"
        >
          FlavourFlow
        </Text>

        <Text className="text-lg text-text text-center mb-8 font-poppins-regular">
          Find the best food recipes
        </Text>

        {/* Button */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="w-auto bg-background mt-3 rounded-2xl items-center justify-center flex-row"
          style={{
            paddingVertical: hp("1.8%"),
            paddingLeft: wp("8%"),
            paddingRight: wp("6%"),
          }}
        >
          <Text className="text-text font-poppins-semibold text-xl mr-6">
            Start Cooking
          </Text>
          <FontAwesome6
            name="arrow-right-long"
            color="#FF9C09"
            size={wp("6%")}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
