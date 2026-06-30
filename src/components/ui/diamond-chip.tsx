import { Image } from "expo-image";
import React from "react";
import { Text, View, TouchableOpacity } from "react-native";

// Helper kept for backwards compat (unused for rendering — we use PNG flags now)
export const getFlagEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Returns a PNG flag URL from flagcdn.com (free, no key, works everywhere)
export const getFlagImageUri = (countryCode: string): string =>
  `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`;

// --- Diamond UI Component ---
export const DiamondChip = ({
  label,
  emoji,
  isSelected,
  onPress,
  isFlag = false,
  imageUrl,
  countryCode,
}: {
  label: string;
  emoji?: string | null;
  isSelected: boolean;
  onPress: () => void;
  isFlag?: boolean;
  imageUrl?: string | null;
  countryCode?: string | null;
}) => {
  return (
    <View
      className="items-center justify-center m-1"
      style={{ width: 105, height: 105 }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={{ width: 95, height: 95 }}
      >
        {/* Styled background container (using pure inline styles to avoid NativeWind CSS Interop bugs) */}
        <View
          style={{
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 28, // rounded-3xl equivalent

            backgroundColor: isSelected ? "#FBA82E" : "rgba(0, 0, 0, 0.05)",
            transform: [{ rotate: "45deg" }],
            // Shadow styling applied purely on active state
            ...(isSelected
              ? {
                  shadowColor: "#FBA82E",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  elevation: 5,
                }
              : {}),
          }}
        >
          {/* Un-rotated content container */}
          <View
            style={{ transform: [{ rotate: "-45deg" }], width: 70, height: 70 }}
            className="items-center justify-center mt-1"
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: 52, height: 52 }}
                contentFit="contain"
                transition={200}
              />
            ) : isFlag && countryCode ? (
              <Image
                source={{ uri: getFlagImageUri(countryCode) }}
                style={{ width: 52, height: 34, borderRadius: 4 }}
                contentFit="cover"
                transition={200}
              />
            ) : null}
            <Text
              style={{
                width: "100%",
                textAlign: "center",
                fontSize: 10,
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
