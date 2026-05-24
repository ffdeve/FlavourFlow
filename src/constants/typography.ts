import { TextStyle } from "react-native";

// Font weight mapping for Poppins
export const fontWeights = {
  light: "Poppins_300Light",
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
} as const;

// Typography preset styles
export const typography = {
  // Display
  displayLarge: {
    fontFamily: fontWeights.bold,
    fontSize: 48,
    lineHeight: 56,
    color: "#3B3328",
  } as TextStyle,

  displayMedium: {
    fontFamily: fontWeights.bold,
    fontSize: 36,
    lineHeight: 44,
    color: "#3B3328",
  } as TextStyle,

  displaySmall: {
    fontFamily: fontWeights.bold,
    fontSize: 30,
    lineHeight: 36,
    color: "#3B3328",
  } as TextStyle,

  // Headings
  h1: {
    fontFamily: fontWeights.bold,
    fontSize: 24,
    lineHeight: 32,
    color: "#3B3328",
  } as TextStyle,

  h2: {
    fontFamily: fontWeights.semibold,
    fontSize: 20,
    lineHeight: 28,
    color: "#3B3328",
  } as TextStyle,

  h3: {
    fontFamily: fontWeights.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: "#3B3328",
  } as TextStyle,

  h4: {
    fontFamily: fontWeights.medium,
    fontSize: 16,
    lineHeight: 24,
    color: "#3B3328",
  } as TextStyle,

  // Body
  bodyLarge: {
    fontFamily: fontWeights.regular,
    fontSize: 16,
    lineHeight: 24,
    color: "#3B3328",
  } as TextStyle,

  bodyMedium: {
    fontFamily: fontWeights.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "#3B3328",
  } as TextStyle,

  bodySmall: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    lineHeight: 16,
    color: "#6B5D4F",
  } as TextStyle,

  // Labels
  labelLarge: {
    fontFamily: fontWeights.medium,
    fontSize: 14,
    lineHeight: 20,
    color: "#3B3328",
  } as TextStyle,

  labelMedium: {
    fontFamily: fontWeights.medium,
    fontSize: 12,
    lineHeight: 16,
    color: "#3B3328",
  } as TextStyle,

  labelSmall: {
    fontFamily: fontWeights.medium,
    fontSize: 11,
    lineHeight: 14,
    color: "#6B5D4F",
  } as TextStyle,

  // Button
  button: {
    fontFamily: fontWeights.semibold,
    fontSize: 16,
    lineHeight: 24,
    color: "#FFFFFF",
  } as TextStyle,

  buttonSmall: {
    fontFamily: fontWeights.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: "#FFFFFF",
  } as TextStyle,

  // Caption
  caption: {
    fontFamily: fontWeights.regular,
    fontSize: 12,
    lineHeight: 16,
    color: "#8B7D6F",
  } as TextStyle,

  // Overline
  overline: {
    fontFamily: fontWeights.medium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#8B7D6F",
  } as TextStyle,
};

export type TypographyVariant = keyof typeof typography;
