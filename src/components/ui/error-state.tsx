import { CookingLoader } from "@/components/ui/cooking-loader";
import { Image } from "expo-image";
import { Text, TouchableOpacity, View } from "react-native";

const IMAGES = {
  offline: require("@/assets/images/Network_Error.webp"),
  error: require("@/assets/images/Unknown_Error.webp"),
};

const COPY = {
  offline: {
    title: "No Internet Connection",
    message: "Check your connection and try again — your recipes are waiting.",
  },
  error: {
    title: "Something Went Wrong",
    message: "We couldn't load this right now. Please try again in a moment.",
  },
};

interface ErrorStateProps {
  variant?: "offline" | "error";
  onRetry?: () => void | Promise<void>;
  retrying?: boolean;
}

export function ErrorState({
  variant = "error",
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  if (retrying) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFFDF5]">
        <CookingLoader scale={0.8} />
      </View>
    );
  }

  const copy = COPY[variant];

  return (
    <View className="flex-1 items-center justify-center bg-[#FFFDF5] px-8">
      <Image
        source={IMAGES[variant]}
        style={{ width: 200, height: 200, marginBottom: 24 }}
        contentFit="contain"
      />
      <Text className="text-[22px] font-jakarta-bold text-[#3B3328] text-center mb-2">
        {copy.title}
      </Text>
      <Text className="text-[15px] font-inter-regular text-text-secondary text-center mb-7 leading-5">
        {copy.message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.85}
          className="bg-primary rounded-full px-8 py-3.5"
          style={{
            shadowColor: "#FBA82E",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <Text className="text-white font-jakarta-semibold text-[15px]">
            Try Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
