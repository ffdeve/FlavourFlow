import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";

// Helper to get flag emoji from country code
export const getFlagEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// --- Diamond UI Component ---
export const DiamondChip = ({ 
  label, 
  emoji, 
  isSelected, 
  onPress, 
  isFlag = false,
  imageUrl
}: { 
  label: string; 
  emoji?: string | null; 
  isSelected: boolean; 
  onPress: () => void; 
  isFlag?: boolean;
  imageUrl?: string | null;
}) => {
  return (
    <View className="items-center justify-center m-1" style={{ width: 85, height: 85 }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={{ width: 75, height: 75 }}
      >
        {/* Styled background container (using pure inline styles to avoid NativeWind CSS Interop bugs) */}
        <View
          style={{
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24, // rounded-2xl
            backgroundColor: isSelected ? "#FBA82E" : "rgba(0, 0, 0, 0.05)",
            transform: [{ rotate: "45deg" }],
            // Shadow styling applied purely on active state
            ...(isSelected ? {
              shadowColor: "#FBA82E",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 6,
              elevation: 5,
            } : {})
          }}
        >
          {/* Un-rotated content container */}
          <View style={{ transform: [{ rotate: "-45deg" }], width: 50, height: 50 }} className="items-center justify-center mt-2">
            {imageUrl ? (
              <Image 
                source={{ uri: imageUrl }} 
                style={{ width: 32, height: 32 }} 
                contentFit="contain"
                transition={200}
              />
            ) : isFlag && emoji ? (
              <Text className="text-4xl">{emoji}</Text>
            ) : null}
            <Text
              style={{
                width: "100%",
                textAlign: "center",
                fontSize: 8,
                marginTop: 2,
                fontFamily: "Poppins_600SemiBold",
                color: isSelected ? "#FFFFFF" : "#3B3328",
              }}
              numberOfLines={2}
            >
              {label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};
