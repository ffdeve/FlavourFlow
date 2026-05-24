/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary - Golden Yellow
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

        // Background - Cream
        background: {
          DEFAULT: "#FCF0D6",
          light: "#FEFBF2",
          dark: "#F5E4C0",
        },

        // Interactive - Darker Cream
        interactive: {
          DEFAULT: "#EDD8A9",
          light: "#F2E3C0",
          dark: "#E3CC92",
        },

        // Text - Dark Brown
        text: {
          DEFAULT: "#3B3328",
          light: "#6B5D4F",
          lighter: "#8B7D6F",
          dark: "#2B231A",
        },

        // Semantic Colors
        success: "#4CAF50",
        error: "#EF4444",
        warning: "#F59E0B",
        info: "#3B82F6",

        // Standalone colors
        cream: "#FCF0D6",
      },

      fontFamily: {
        // Poppins font family - use with font-poppins-light, font-poppins-semibold, etc.
        "poppins-thin": ["Poppins_100Thin"],
        "poppins-extralight": ["Poppins_200ExtraLight"],
        "poppins-light": ["Poppins_300Light"],
        "poppins-regular": ["Poppins_400Regular"],
        "poppins-medium": ["Poppins_500Medium"],
        "poppins-semibold": ["Poppins_600SemiBold"],
        "poppins-bold": ["Poppins_700Bold"],
        "poppins-extrabold": ["Poppins_800ExtraBold"],
        "poppins-black": ["Poppins_900Black"],
      },

      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["30px", { lineHeight: "36px" }],
        "4xl": ["36px", { lineHeight: "40px" }],
        "5xl": ["48px", { lineHeight: "1" }],
      },

      fontWeight: {
        thin: "100",
        extralight: "200",
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
        black: "900",
      },

      spacing: {
        18: "72px",
        88: "352px",
        100: "400px",
        128: "512px",
      },

      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },

      boxShadow: {
        sm: "0 1px 2px 0 rgba(59, 51, 40, 0.05)",
        DEFAULT:
          "0 1px 3px 0 rgba(59, 51, 40, 0.1), 0 1px 2px -1px rgba(59, 51, 40, 0.1)",
        md: "0 4px 6px -1px rgba(59, 51, 40, 0.1), 0 2px 4px -2px rgba(59, 51, 40, 0.1)",
        lg: "0 10px 15px -3px rgba(59, 51, 40, 0.1), 0 4px 6px -4px rgba(59, 51, 40, 0.1)",
        xl: "0 20px 25px -5px rgba(59, 51, 40, 0.1), 0 8px 10px -6px rgba(59, 51, 40, 0.1)",
      },
    },
  },
  plugins: [],
};
