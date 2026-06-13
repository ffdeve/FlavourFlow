import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { TouchableOpacity, ViewStyle } from "react-native";

interface CircleBackButtonProps {
  className?: string;
  style?: ViewStyle;
}

export default function CircleBackButton({ className = "", style }: CircleBackButtonProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.back()}
      className={`w-11 h-11 bg-black/30 rounded-full items-center justify-center ${className}`}
      style={style}
    >
      <Feather name="arrow-left" size={20} color="#FFFFFF" />
    </TouchableOpacity>
  );
}
