// FlavourFlow Design System Colors
// Based on Figma design specifications

export const Colors = {
  // Primary - Golden Yellow (#FBA82E)
  primary: {
    DEFAULT: "#FBA82E",
    light: "#FCC368",
    dark: "#E39620",
    contrast: "#FF9C09",
    50: "#FEF6E8",
    100: "#FDEDD1",
    200: "#FCDBA3",
    300: "#FAC975",
    400: "#FBB747",
    500: "#FBA82E",
    600: "#E39620",
    700: "#B57619",
    800: "#875812",
    900: "#593A0C",
  },

  // Background - Cream (#FCF0D6)
  background: {
    DEFAULT: "#FCF0D6",
    light: "#FEFBF2",
    dark: "#F5E4C0",
    paper: "#FFFFFF", // For cards/elevated surfaces
  },

  // Interactive Elements - Darker Cream (#EDD8A9)
  interactive: {
    DEFAULT: "#EDD8A9",
    light: "#F2E3C0",
    dark: "#E3CC92",
    hover: "#E3CC92",
    pressed: "#D9C284",
  },

  // Text - Dark Brown (#3B3328)
  text: {
    DEFAULT: "#3B3328",
    primary: "#3B3328",
    secondary: "#6B5D4F",
    tertiary: "#8B7D6F",
    disabled: "#B5A99A",
    beige: "#FCF0D6",
    inverse: "#FFFFFF",
  },

  // Semantic Colors
  success: {
    DEFAULT: "#4CAF50",
    light: "#81C784",
    dark: "#388E3C",
  },

  error: {
    DEFAULT: "#EF4444",
    light: "#F87171",
    dark: "#DC2626",
  },

  warning: {
    DEFAULT: "#F59E0B",
    light: "#FBBf24",
    dark: "#D97706",
  },

  info: {
    DEFAULT: "#3B82F6",
    light: "#60A5FA",
    dark: "#2563EB",
  },

  // Neutral Grays (for borders, dividers)
  gray: {
    50: "#FAF9F7",
    100: "#F5F3F0",
    200: "#E8E4DD",
    300: "#D4CFC5",
    400: "#B5A99A",
    500: "#8B7D6F",
    600: "#6B5D4F",
    700: "#544840",
    800: "#3B3328",
    900: "#2B231A",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
  "4xl": 96,
};

export const BorderRadius = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
};

export const FontWeights = {
  light: "300",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

// Shadow presets matching Figma
export const Shadows = {
  sm: {
    shadowColor: Colors.text.DEFAULT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.text.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.text.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: Colors.text.DEFAULT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
