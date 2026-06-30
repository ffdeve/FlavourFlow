import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (isConnected) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingTop: insets.top,
      }}
      className="bg-[#3B3328]"
    >
      <View className="flex-row items-center justify-center px-4 py-2">
        <Feather name="wifi-off" size={14} color="#FBA82E" />
        <Text className="ml-2 text-white font-inter-medium text-[13px]">
          You&apos;re offline — some features may not work
        </Text>
      </View>
    </View>
  );
}
