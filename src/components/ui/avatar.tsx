import React from "react";
import { Image as ExpoImage } from "expo-image";

interface AvatarProps {
  url?: string | null;
  name?: string | null; // Kept for backwards compatibility
  size?: number;
  className?: string;
}

export default function Avatar({ url, size = 40, className = "" }: AvatarProps) {
  if (url) {
    const source = typeof url === 'string' && url.startsWith('http') ? { uri: url } : url;
    return (
      <ExpoImage
        source={source}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className={`bg-[#F5E3D8]/30 ${className}`}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <ExpoImage
      source={require("@/assets/icons/default_profile.webp")}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={`bg-[#FDEBD0] ${className}`}
      contentFit="fill"
      transition={200}
    />
  );
}
