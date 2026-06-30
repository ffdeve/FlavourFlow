import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { TouchableOpacity, View } from "react-native";

const FALLBACK = require("@/assets/images/LogIn_front_photo.webp");

/** Cream metadata tag — shared across time / ingredients / rating. */
export const MetaPill = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-row items-center bg-[#FAF5EF] rounded-md px-2 py-1 mr-1.5 mb-1">
    {children}
  </View>
);

/** A dark circle for top-right controls (keeps white icon assets visible). */
export function FrostedControl({
  children,
  size = 36,
  onPress,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  onPress?: () => void;
  style?: any;
}) {
  const inner = (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: 999,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.45)",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

/** A translucent glass pill chip for recipe metadata. */
export function GlassPill({
  children,
  className = "px-3 py-1.5",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`flex-row items-center rounded-full ${className}`}
      style={{
        backgroundColor: "rgba(255,255,255,0.55)",
        borderWidth: 1,
        borderColor: "rgba(58,51,40,0.10)",
      }}
    >
      {children}
    </View>
  );
}

export interface FrostedImageCardProps {
  image?: string | null;
  aspectRatio?: number;
  /** Fixed card height (overrides aspectRatio when set). */
  height?: number;
  radius?: number;
  /** Height of the blur zone as a % of the card (blur starts here, white footer is half of this). */
  blurHeightPct?: number;
  /** When false, skip blur + white footer and use a dark scrim for white text. */
  frosted?: boolean;
  onPress?: () => void;
  activeOpacity?: number;
  containerClassName?: string;
  containerStyle?: any;
  children?: React.ReactNode;
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  /** Padding classes applied to the white footer content area. */
  contentClassName?: string;
  /** Image fit style, defaults to 'cover' */
  contentFit?: "cover" | "contain";
}

/**
 * Card scaffold: full-bleed photo with a glass overlay at the bottom.
 * frosted=true (hero/premium): BlurView + LinearGradient glass stops.
 * frosted=false (normal/Android perf): LinearGradient + glass overlay only.
 */
export function FrostedImageCard({
  image,
  aspectRatio = 0.82,
  height,
  radius = 24,
  blurHeightPct = 50,
  frosted = true,
  onPress,
  activeOpacity = 0.92,
  containerClassName = "",
  containerStyle,
  children,
  topLeft,
  topRight,
  contentClassName = "px-4 pb-3 pt-1",
  contentFit = "cover",
}: FrostedImageCardProps) {
  const [uri, setUri] = React.useState(image);
  React.useEffect(() => setUri(image), [image]);

  const cardHeight = height ?? 250;
  const imageHeight = Math.round(cardHeight * 0.72);

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      className={containerClassName}
      style={[
        {
          borderRadius: radius,
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
        },
        containerStyle,
      ]}
    >
      {/* Image container on top */}
      <View
        style={{
          width: "100%",
          height: imageHeight,
          borderRadius: radius,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Image
          source={uri && uri !== "fallback" ? { uri } : FALLBACK}
          style={{ width: "100%", height: "100%" }}
          contentFit={contentFit}
          contentPosition="center"
          transition={300}
          onError={() => {
            if (uri !== "fallback") setUri("fallback");
          }}
        />

        {/* Top scrim so badges/controls stay legible on bright photos */}
        <LinearGradient
          colors={["rgba(0,0,0,0.30)", "rgba(0,0,0,0)"]}
          locations={[0, 1]}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "35%",
            zIndex: 1,
          }}
        />

        {/* Top overlays (spice badge, heart, etc.) */}
        {topLeft != null && (
          <View style={{ position: "absolute", top: 12, left: -8, zIndex: 20 }}>
            {topLeft}
          </View>
        )}
        {topRight != null && (
          <View
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 20,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {topRight}
          </View>
        )}
      </View>

      {/* Content footer at the bottom (non-absolute, with gap) */}
      <View
        className={contentClassName}
        style={{
          flex: 1,
          justifyContent: "center",
          paddingTop: 12, // gap between text and image
          backgroundColor: "#FFFFFF",
        }}
      >
        {children}
      </View>
    </TouchableOpacity>
  );
}
