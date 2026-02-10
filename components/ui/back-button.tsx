import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";

interface BackButtonProps {
  className?: string;
  fallbackHref?: string;
}

export default function BackButton({
  className = "w-fit h-fit mt-2 pt-2 px-4",
  fallbackHref,
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (fallbackHref) {
      router.push(fallbackHref);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{ alignSelf: "flex-start" }}
      className={className}
      activeOpacity={0.7}
    >
      <FontAwesome6 name="arrow-left-long" size={24} color="#3B3328" />
    </TouchableOpacity>
  );
}
