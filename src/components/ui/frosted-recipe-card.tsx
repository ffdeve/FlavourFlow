import React from "react";
import { View, TouchableOpacity, DimensionValue } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const FALLBACK = require("@/assets/images/LogIn_front_photo.webp");

/** Cream metadata tag — shared across time / ingredients / rating. */
export const MetaPill = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-row items-center bg-[#FAF5EF] rounded-md px-2 py-1 mr-1.5 mb-1">
    {children}
  </View>
);

const band = (h: DimensionValue) => ({
  position: "absolute" as const,
  left: 0,
  right: 0,
  bottom: 0,
  height: h,
});

/**
 * Progressive blur over the bottom 50% of the card. Bands anchor to the base
 * and overlap so blur compounds downward — intensity ramps from ~5 at the
 * card midpoint to ~55 at the base (≈1 blur unit per % of depth).
 */
const BLUR_LAYERS = [
  { h: "100%", i: 5 },
  { h: "90%",  i: 10 },
  { h: "80%",  i: 15 },
  { h: "70%",  i: 20 },
  { h: "60%",  i: 25 },
  { h: "50%",  i: 30 },
  { h: "40%",  i: 35 },
  { h: "30%",  i: 40 },
  { h: "20%",  i: 45 },
  { h: "12%",  i: 50 },
  { h: "6%",   i: 55 },
] as const;

function BlurBands({ heightPct = 50 }: { heightPct?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${heightPct}%` }}
    >
      {BLUR_LAYERS.map((l, idx) => (
        <BlurView
          key={idx}
          tint="light"
          intensity={l.i}
          experimentalBlurMethod="dimezisBlurView"
          style={band(l.h)}
        />
      ))}
    </View>
  );
}

/** A dark frosted circle for top-right controls (keeps white icon assets visible). */
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
    <BlurView
      tint="dark"
      intensity={28}
      experimentalBlurMethod="dimezisBlurView"
      style={[
        {
          width: size,
          height: size,
          borderRadius: 999,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </BlurView>
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
}

/**
 * Card scaffold: full-bleed photo (visible top 75%) with progressive frosted-glass
 * blur from the midpoint, transitioning to a solid white footer (bottom 25%)
 * where the title and metadata sit. Top-left / top-right overlay slots provided.
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
}: FrostedImageCardProps) {
  const [uri, setUri] = React.useState(image);
  React.useEffect(() => setUri(image), [image]);

  // White footer occupies the bottom 28% of the card.
  // Blur covers the bottom 50% — the top half (50%→28%) is visible on the image,
  // the lower half underlies the white footer (invisible but smooths the edge).
  const footerPct = 28;

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      className={containerClassName}
      style={[
        {
          borderRadius: radius,
          shadowColor: "#3B3328",
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.16,
          shadowRadius: 24,
          elevation: 10,
        },
        containerStyle,
      ]}
    >
      <View
        className="relative w-full overflow-hidden"
        style={[{ borderRadius: radius }, height != null ? { height } : { aspectRatio }]}
      >
        {/* Full-bleed image — bottom 25% sits under the white footer */}
        <Image
          source={uri && uri !== "fallback" ? { uri } : FALLBACK}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
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
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: "28%" }}
        />

        {frosted ? (
          <>
            {/* Progressive blur: bottom 50% of card, intensity 5→55 */}
            <BlurBands heightPct={blurHeightPct} />

            {/* Fade bridge: smooths the blur→white transition just above the footer */}
            <LinearGradient
              colors={["rgba(255,255,255,0)", "#FFFFFF"]}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: `${footerPct}%`,
                height: "10%",
                zIndex: 5,
              }}
            />
          </>
        ) : (
          /* Non-frosted variant: soft dark scrim for white text readability */
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.20)", "rgba(0,0,0,0.58)"]}
            locations={[0, 0.5, 1]}
            pointerEvents="none"
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${blurHeightPct}%` }}
          />
        )}

        {/* Top overlays (spice badge, heart, etc.) — highest z-index */}
        {topLeft != null && (
          <View style={{ position: "absolute", top: 12, left: 12, zIndex: 20 }}>
            {topLeft}
          </View>
        )}
        {topRight != null && (
          <View style={{ position: "absolute", top: 12, right: 12, zIndex: 20, flexDirection: "row", alignItems: "center" }}>
            {topRight}
          </View>
        )}

        {/* White footer: bottom 25% of the card, content sits here */}
        <View
          className={contentClassName}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: `${footerPct}%`,
            backgroundColor: frosted ? "#FFFFFF" : "transparent",
            justifyContent: "flex-end",
            zIndex: 10,
          }}
        >
          {children}
        </View>
      </View>
    </TouchableOpacity>
  );
}
